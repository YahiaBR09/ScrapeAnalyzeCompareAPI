const express = require('express');
const { compare } = require('./controllers/compareController');
const { getCachedData, saveCacheData, isCacheExpired } = require('./services/cache');
const { startCronJob, syncData } = require('./jobs/syncData');
const { exportMatchesToExcel } = require('./services/excelExport');

const app = express();

// بدء Cron Job عند تشغيل السيرفر
startCronJob(60); // المزامنة كل 60 دقيقة

/**
 * GET /market
 * الحصول على جميع المطابقات مع دعم:
 * - Pagination: ?page=1&limit=20
 * - Filtering: ?source=takealot, ?minSavings=50, ?minScore=0.85
 */
app.get('/market', (req, res) => {
    try {
        const cachedData = getCachedData();
        
        if (!cachedData || !cachedData.results) {
            return res.status(503).json({
                success: false,
                error: 'البيانات لم تتم معالجتها بعد، حاول لاحقاً',
                hint: 'سيتم إعداد البيانات خلال دقائق...'
            });
        }

        let { results, stats } = cachedData;

        // 🔍 التصفية (Filtering)
        console.log(`\n📋 طلب /market مع filters:`);

        if (req.query.source) {
            results = results.filter(r => 
                (req.query.source === 'takealot' || req.query.source === 'petheaven')
            );
            console.log(`   ✓ source: ${req.query.source}`);
        }

        if (req.query.minSavings) {
            const min = parseFloat(req.query.minSavings);
            results = results.filter(r => r.best_deal.savings >= min);
            console.log(`   ✓ minSavings: ${min} R`);
        }

        if (req.query.maxSavings) {
            const max = parseFloat(req.query.maxSavings);
            results = results.filter(r => r.best_deal.savings <= max);
            console.log(`   ✓ maxSavings: ${max} R`);
        }

        if (req.query.minScore) {
            const min = parseFloat(req.query.minScore);
            results = results.filter(r => r.match_score >= min);
            console.log(`   ✓ minScore: ${min}`);
        }

        if (req.query.brand) {
            const brand = req.query.brand.toLowerCase();
            results = results.filter(r => 
                r.takealot.name.toLowerCase().includes(brand) ||
                r.petheaven.name.toLowerCase().includes(brand)
            );
            console.log(`   ✓ brand: ${brand}`);
        }

        // 📄 الترقيم (Pagination)
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const start = (page - 1) * limit;
        const end = start + limit;

        const paginatedResults = results.slice(start, end);
        const totalPages = Math.ceil(results.length / limit);

        console.log(`   ✓ pagination: page ${page}/${totalPages}, limit ${limit}`);

        res.json({
            success: true,
            timestamp: cachedData.lastUpdated,
            syncInfo: {
                lastUpdated: cachedData.lastUpdated,
                nextSync: cachedData.nextSync,
                syncDuration: `${(cachedData.syncDuration / 1000).toFixed(2)}s`
            },
            pagination: {
                page,
                limit,
                total: results.length,
                pages: totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            stats: {
                ...stats,
                filtered_count: results.length,
                original_count: stats.matches_found
            },
            data: paginatedResults
        });

    } catch (error) {
        console.error('❌ خطأ:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /market/deals
 * الحصول على أفضل العروض (بتوفير كبير)
 * مثال: /market/deals?minSavings=50&page=1&limit=10
 */
app.get('/market/deals', (req, res) => {
    try {
        const cachedData = getCachedData();
        
        if (!cachedData) {
            return res.status(503).json({
                success: false,
                error: 'البيانات لم تتم معالجتها بعد'
            });
        }

        const minSavings = parseFloat(req.query.minSavings) || 50;
        const deals = cachedData.results.filter(r => r.best_deal.savings >= minSavings);

        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const start = (page - 1) * limit;
        const totalPages = Math.ceil(deals.length / limit);

        const sortBy = req.query.sortBy || 'savings'; // savings أو score
        if (sortBy === 'savings') {
            deals.sort((a, b) => b.best_deal.savings - a.best_deal.savings);
        } else if (sortBy === 'score') {
            deals.sort((a, b) => b.match_score - a.match_score);
        }

        console.log(`\n🎁 طلب /market/deals - minSavings: ${minSavings}R, sortBy: ${sortBy}`);

        res.json({
            success: true,
            deals: {
                minSavings,
                totalDeals: deals.length,
                totalSavings: deals.reduce((sum, d) => sum + d.best_deal.savings, 0).toFixed(2)
            },
            pagination: {
                page,
                limit,
                total: deals.length,
                pages: totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1
            },
            data: deals.slice(start, start + limit)
        });

    } catch (error) {
        console.error('❌ خطأ:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /market/stats
 * إحصائيات عامة
 */
app.get('/market/stats', (req, res) => {
    try {
        const cachedData = getCachedData();
        
        if (!cachedData) {
            return res.status(503).json({
                success: false,
                error: 'البيانات لم تتم معالجتها بعد'
            });
        }

        console.log(`\n📊 طلب /market/stats`);

        res.json({
            success: true,
            lastUpdated: cachedData.lastUpdated,
            nextSync: cachedData.nextSync,
            stats: cachedData.stats,
            performance: {
                syncDuration: `${(cachedData.syncDuration / 1000).toFixed(2)}s`,
                averageScore: cachedData.stats.average_score,
                bestScore: cachedData.stats.best_match_score
            }
        });

    } catch (error) {
        console.error('❌ خطأ:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /market/sync
 * تشغيل المزامنة يدوياً (للعميل)
 */
app.get('/market/sync', async (req, res) => {
    try {
        console.log(`\n🔄 طلب يدوي للمزامنة من العميل`);
        
        if (isCacheExpired(0)) {
            // قم بتشغيل المزامنة الآن
            const limit = parseInt(req.query.limit) || 100;
            await syncData(limit);
            
            const cachedData = getCachedData();
            res.json({
                success: true,
                message: 'تم تحديث البيانات بنجاح',
                stats: cachedData.stats
            });
        } else {
            res.json({
                success: false,
                message: 'البيانات حديثة، المزامنة السابقة كانت قريبة جداً',
                lastUpdated: getCachedData().lastUpdated
            });
        }
    } catch (error) {
        console.error('❌ خطأ:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

app.get('/market/export', async (req, res) => {

    try {

        const cachedData = getCachedData();

        if (!cachedData) {
            return res.status(503).json({
                success: false,
                error: 'No data available'
            });
        }

        const workbook = await exportMatchesToExcel(
            cachedData.results,
            cachedData.stats
        );

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );

        res.setHeader(
            'Content-Disposition',
            `attachment; filename=market_${Date.now()}.xlsx`
        );

        await workbook.xlsx.write(res);

        res.end();

    } catch (error) {

        res.status(500).json({
            success: false,
            error: error.message
        });

    }

});

/**
 * GET /health
 * فحص صحة السيرفر
 */
app.get('/health', (req, res) => {
    const cachedData = getCachedData();
    const cacheAge = cachedData ? 
        Math.round((Date.now() - new Date(cachedData.lastUpdated)) / 1000 / 60) : null;

    res.json({
        status: cachedData ? 'healthy' : 'initializing',
        cacheExists: !!cachedData,
        cacheAge: cacheAge ? `${cacheAge} دقيقة` : 'لم تتم المزامنة بعد',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`${'='.repeat(50)}`);
    console.log(`\n📡 Available Endpoints:`);
    console.log(`   GET  /market              - جميع المطابقات مع pagination + filters`);
    console.log(`   GET  /market?page=2&limit=10  - الصفحة 2 بـ 10 نتائج`);
    console.log(`   GET  /market?minSavings=50    - فقط العروض بتوفير 50+ راند`);
    console.log(`   GET  /market/deals            - أفضل العروض (توفير كبير)`);
    console.log(`   GET  /market/stats            - الإحصائيات العامة`);
    console.log(`   GET  /market/sync             - تحديث يدوي للبيانات`);
    console.log(`   GET  /health                  - فحص صحة السيرفر`);
    console.log(`${'='.repeat(50)}\n`);
});
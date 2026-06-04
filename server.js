const express = require('express');
const { compare } = require('./controllers/compareController');
const { getCachedData, saveCacheData, isCacheExpired } = require('./services/cache');
const { startCronJob, syncData } = require('./jobs/syncData');
const { exportMatchesToExcel } = require('./services/excelExport');

const app = express();

// Start Cron Job when server starts
startCronJob(60); // Sync every 60 minutes

/**
 * GET /market
 * Get all matches with support for:
 * - Pagination: ?page=1&limit=20
 * - Filtering: ?source=takealot, ?minSavings=50, ?minScore=0.85
 */
app.get('/market', (req, res) => {
    try {
        const cachedData = getCachedData();
        
        if (!cachedData || !cachedData.results) {
            return res.status(503).json({
                success: false,
                error: 'Data not processed yet, please try again later',
                hint: 'Data will be ready in a few minutes...'
            });
        }

        let { results, stats } = cachedData;

        // 🔍 Filtering
        console.log(`\n📋 Request /market with filters:`);

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

        // 📄 Pagination
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
 * Get best deals (with significant savings)
 * Example: /market/deals?minSavings=50&page=1&limit=10
 */
app.get('/market/deals', (req, res) => {
    try {
        const cachedData = getCachedData();
        
        if (!cachedData) {
            return res.status(503).json({
                success: false,
                error: 'Data not processed yet'
            });
        }

        const minSavings = parseFloat(req.query.minSavings) || 50;
        const deals = cachedData.results.filter(r => r.best_deal.savings >= minSavings);

        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const start = (page - 1) * limit;
        const totalPages = Math.ceil(deals.length / limit);

        const sortBy = req.query.sortBy || 'savings'; // savings or score
        if (sortBy === 'savings') {
            deals.sort((a, b) => b.best_deal.savings - a.best_deal.savings);
        } else if (sortBy === 'score') {
            deals.sort((a, b) => b.match_score - a.match_score);
        }

        console.log(`\n🎁 Request /market/deals - minSavings: ${minSavings}R, sortBy: ${sortBy}`);

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
 * General statistics
 */
app.get('/market/stats', (req, res) => {
    try {
        const cachedData = getCachedData();
        
        if (!cachedData) {
            return res.status(503).json({
                success: false,
                error: 'Data not processed yet'
            });
        }

        console.log(`\n📊 Request /market/stats`);

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
 * Run manual synchronization (from client)
 */
app.get('/market/sync', async (req, res) => {
    try {
        console.log(`\n🔄 Manual synchronization request from client`);
        
        if (isCacheExpired(0)) {
            // Run sync now
            const limit = parseInt(req.query.limit) || 100;
            await syncData(limit);
            
            const cachedData = getCachedData();
            res.json({
                success: true,
                message: 'Data updated successfully',
                stats: cachedData.stats
            });
        } else {
            res.json({
                success: false,
                message: 'Data is fresh, previous sync was too recent',
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
 * Check server health
 */
app.get('/health', (req, res) => {
    const cachedData = getCachedData();
    const cacheAge = cachedData ? 
        Math.round((Date.now() - new Date(cachedData.lastUpdated)) / 1000 / 60) : null;

    res.json({
        status: cachedData ? 'healthy' : 'initializing',
        cacheExists: !!cachedData,
        cacheAge: cacheAge ? `${cacheAge} minutes` : 'Sync not yet performed',
        timestamp: new Date().toISOString()
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n${'='.repeat(50)}`);
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`${'='.repeat(50)}`);
    console.log(`\n📡 Available Endpoints:`);
    console.log(`   GET  /market              - All matches with pagination + filters`);
    console.log(`   GET  /market?page=2&limit=10  - Page 2 with 10 results`);
    console.log(`   GET  /market?minSavings=50    - Only deals with 50+ rand savings`);
    console.log(`   GET  /market/deals            - Best deals (significant savings)`);
    console.log(`   GET  /market/stats            - General statistics`);
    console.log(`   GET  /market/export           - export to excel file`);
    console.log(`   GET  /market/sync             - Manual data update`);
    console.log(`   GET  /health                  - Server health check`);
    console.log(`${'='.repeat(50)}\n`);
});

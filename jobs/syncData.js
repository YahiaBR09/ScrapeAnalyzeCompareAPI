const { compare } = require('../controllers/compareController');
const { saveCacheData } = require('../services/cache');

let syncInProgress = false;

async function syncData(limit = 100) {
    if (syncInProgress) {
        console.log('⏭️  المزامنة جاري تنفيذها بالفعل، تخطي...');
        return;
    }

    syncInProgress = true;
    const startTime = Date.now();
    console.log(`\n${'='.repeat(50)}`);
    console.log(`⏰ بدء المزامنة في ${new Date().toLocaleString('ar-SA')}`);
    console.log(`${'='.repeat(50)}`);

    try {
        const result = await compare(limit);
        
        const cacheData = {
            ...result,
            lastUpdated: new Date().toISOString(),
            syncDuration: Date.now() - startTime,
            nextSync: new Date(Date.now() + 60 * 60 * 1000).toISOString() // بعد ساعة
        };

        saveCacheData(cacheData);

        console.log(`\n✅ اكتملت المزامنة بنجاح`);
        console.log(`   المطابقات: ${result.stats.matches_found}`);
        console.log(`   الوقت المستغرق: ${(cacheData.syncDuration / 1000).toFixed(2)} ثانية`);
        console.log(`   المزامنة التالية: ${new Date(cacheData.nextSync).toLocaleString('ar-SA')}`);
        console.log(`${'='.repeat(50)}\n`);

    } catch (err) {
        console.error(`\n❌ خطأ في المزامنة: ${err.message}`);
        console.error(`${'='.repeat(50)}\n`);
    } finally {
        syncInProgress = false;
    }
}

function startCronJob(intervalMinutes = 60) {
    console.log(`\n⏰ بدء Cron Job - المزامنة كل ${intervalMinutes} دقيقة`);
    
    // تشغيل أول مرة فوراً
    syncData(100);
    
    // ثم كل X دقيقة
    const interval = setInterval(() => {
        syncData(100);
    }, intervalMinutes * 60 * 1000);

    return interval;
}

module.exports = { syncData, startCronJob };

const { compare } = require('../controllers/compareController');
const { saveCacheData } = require('../services/cache');

let syncInProgress = false;

async function syncData(limit = 1000) {
    if (syncInProgress) {
        console.log('⏭️  Sync is already in progress, skipping...');
        return;
    }

    syncInProgress = true;
    const startTime = Date.now();
    console.log(`\n${'='.repeat(50)}`);
    console.log(`⏰ Beginning sync at ${new Date().toLocaleString('ar-SA')}`);
    console.log(`${'='.repeat(50)}`);

    try {
        const result = await compare(limit);
        
        const cacheData = {
            ...result,
            lastUpdated: new Date().toISOString(),
            syncDuration: Date.now() - startTime,
            nextSync: new Date(Date.now() + 60 * 60 * 1000).toISOString() // after an hour
        };

        saveCacheData(cacheData);

        console.log(`\n✅ Sync completed successfully`);
        console.log(`   Matches found: ${result.stats.matches_found}`);
        console.log(`   Time taken: ${(cacheData.syncDuration / 1000).toFixed(2)} seconds`);
        console.log(`   Next sync: ${new Date(cacheData.nextSync).toLocaleString('ar-SA')}`);
        console.log(`${'='.repeat(50)}\n`);

    } catch (err) {
        console.error(`\n❌ Error in sync: ${err.message}`);
        console.error(`${'='.repeat(50)}\n`);
    } finally {
        syncInProgress = false;
    }
}

function startCronJob(intervalMinutes = 60) {
    console.log(`\n⏰ Beginning Cron Job - Sync every ${intervalMinutes} minutes`);

    // Run once immediately

    syncData(100);
    
    // every intervalMinutes minutes
    const interval = setInterval(() => {
        syncData(100);
    }, intervalMinutes * 60 * 1000);

    return interval;
}

module.exports = { syncData, startCronJob };

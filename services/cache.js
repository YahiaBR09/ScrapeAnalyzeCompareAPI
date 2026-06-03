const fs = require('fs');
const path = require('path');

const CACHE_FILE = path.join(__dirname, '../data/cache.json');
const CACHE_DIR = path.dirname(CACHE_FILE);

function ensureCacheDir() {
    if (!fs.existsSync(CACHE_DIR)) {
        fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
}

function getCachedData() {
    try {
        ensureCacheDir();
        if (fs.existsSync(CACHE_FILE)) {
            const data = fs.readFileSync(CACHE_FILE, 'utf8');
            const parsed = JSON.parse(data);
            console.log(`✓ تم قراءة الـ cache: ${parsed.stats.matches_found} مطابقة محفوظة`);
            return parsed;
        }
    } catch (err) {
        console.error('❌ خطأ في قراءة الـ cache:', err.message);
    }
    return null;
}

function saveCacheData(data) {
    try {
        ensureCacheDir();
        fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2), 'utf8');
        console.log(`✅ تم حفظ الـ cache: ${data.stats.matches_found} مطابقة في ${CACHE_FILE}`);
    } catch (err) {
        console.error('❌ خطأ في حفظ الـ cache:', err.message);
    }
}

function isCacheExpired(maxAgeMinutes = 60) {
    try {
        const data = getCachedData();
        if (!data || !data.lastUpdated) return true;
        
        const lastUpdate = new Date(data.lastUpdated);
        const now = new Date();
        const ageMinutes = (now - lastUpdate) / (1000 * 60);
        
        return ageMinutes > maxAgeMinutes;
    } catch (err) {
        return true;
    }
}

module.exports = { getCachedData, saveCacheData, isCacheExpired };

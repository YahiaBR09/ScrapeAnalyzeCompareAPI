const { normalize } = require('./normalize');
const { extractKeywords, getProductType, extractWeightValue } = require('./extractKeywords');

function similarity(a, b) {
    if (!a || !b) return 0;
    const wordsA = a.split(' ').filter(w => w.length > 0);
    const wordsB = b.split(' ').filter(w => w.length > 0);
    if (wordsA.length === 0 || wordsB.length === 0) return 0;
    
    const A = new Set(wordsA);
    const B = new Set(wordsB);
    let intersection = 0;
    for (let word of A) { if (B.has(word)) intersection++; }
    const union = new Set([...A, ...B]).size;
    return union === 0 ? 0 : intersection / union;
}

function levenshteinDistance(a, b) {
    const track = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
    for (let i = 0; i <= a.length; i++) track[0][i] = i;
    for (let j = 0; j <= b.length; j++) track[j][0] = j;
    
    for (let j = 1; j <= b.length; j++) {
        for (let i = 1; i <= a.length; i++) {
            const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
            track[j][i] = Math.min(track[j][i - 1] + 1, track[j - 1][i] + 1, track[j - 1][i - 1] + indicator);
        }
    }
    return track[b.length][a.length];
}

function stringSimilarity(a, b) {
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1;
    return 1 - (levenshteinDistance(a, b) / maxLen);
}

function extractBrand(name = "") {
    const knownBrands = [
        "royal canin",
        "pedigree",
        "montego",
        "purina",
        "iams",
        "hills",
        "hill's",
        "eukanuba",
        "acana",
        "orijen",
        "rogz",
        "superwoof",
        "jock",
        "bobtail",
        "olympic",
        "kong",
        "marltons",
        "dog's life",
        "dogs life",
        "ultra dog",
        "nutribyte"
    ];

    const lower = name.toLowerCase();

    // ابحث عن أطول ماركة أولاً
    const sortedBrands = [...knownBrands]
        .sort((a, b) => b.length - a.length);

    for (const brand of sortedBrands) {
        if (lower.includes(brand)) {
            return brand
                .replace("dog's life", "dogs life")
                .replace("hill's", "hills");
        }
    }

    return null;
}

function finalScore(a, b) {
    if (!a || !b || !a.name || !b.name) return 0;
    
    const normalizedA = normalize(a.name);
    const normalizedB = normalize(b.name);
    
    const nameScore = (similarity(normalizedA, normalizedB) * 0.6) + (stringSimilarity(normalizedA, normalizedB) * 0.4);
    
    const brandA = extractBrand(a.name);
    const brandB = extractBrand(b.name);
    const weightA = extractWeightValue(a.name);
    const weightB = extractWeightValue(b.name);
    
    // مطابقة الماركة التجارية (Brand check)
    if (brandA && brandB && brandA !== brandB) {

        const isFood =
            normalizedA.includes('food') ||
            normalizedB.includes('food');

        // للأطعمة فقط: منع المطابقة
        if (isFood) {
            return 0;
        }
    }
    
    // مطابقة الوزن الصارم (Weight check)
    const isFood =
        normalizedA.includes('food') ||
        normalizedB.includes('food');

    if (isFood && weightA && weightB) {

        const diff = Math.abs(weightA - weightB);

        if (diff > 0.1) return 0;
    } else if ((weightA && !weightB) || (!weightA && weightB)) {
        // إذا كان المنتج طعاماً، يمنع منعاً باتاً مطابقة عبوة معلومة الوزن بأخرى مجهولة الوزن
        const isFood = a.name.toLowerCase().includes('food') || b.name.toLowerCase().includes('food');
        if (isFood) return 0;
    }
    
    let score = nameScore;

    if (brandA && brandB) {
        if (brandA === brandB) {
            score += 0.15;
        }
    }

    return Math.min(score, 1);
}

function findBestMatch(product, candidates) {
    let best = null;
    let bestScore = 0;

    const productKeywords = extractKeywords(product.name);
    const productType = getProductType(product.name);
    const productWeight = extractWeightValue(product.name);

    if (productKeywords.length === 0) return null;

    for (let item of candidates) {
        const itemWeight = extractWeightValue(item.name);
        // 1. فحص تصنيفات الأطعمة (رطب vs جاف)
        if (productType !== getProductType(item.name)) continue;

        // 2. فحص الأوزان المتباينة جذرياً قبل الحساب المعقد
        const isFood =
            product.name.toLowerCase().includes('food') ||
            item.name.toLowerCase().includes('food');

        if (
            isFood &&
            productWeight &&
            itemWeight &&
            Math.abs(productWeight - itemWeight) > 0.1
        ) {
            continue;
        }

        // 3. حساب درجة التوافق المشترك
        const itemKeywords = extractKeywords(item.name);
        const common = productKeywords.filter(k => itemKeywords.includes(k));
        
        // يجب أن يشتركا في كلمتين دالتين على الأقل (مثل اسم اللعبة أو نوع اللحم)
        if (common.length < 1) continue;

        let score = finalScore(product, item);

        score += Math.min(
            common.length * 0.05,
            0.20
        );

        score = Math.min(score, 1);

        if (score > bestScore) {
            bestScore = score;
            best = item;
        }
    }
    if (bestScore >= 0.75) {
        console.log(
            `[MATCH] ${product.name} -> ${best.name} (${bestScore.toFixed(3)})`
        );
    }

    // رفع حد القبول لـ 0.75 لضمان استبعاد أي مطابقات عشوائية للألعاب المتقاربة في الأسماء
    return bestScore >= 0.75 ? { best, score: bestScore } : null;
}

module.exports = { findBestMatch };
const { extractKeywords, getProductType } = require('./extractKeywords');

// Function to extract a strict brand name from the product title for more accurate matching (solves the Jock vs Montego issue by ensuring that if a known brand is mentioned, it must match exactly)
function extractStrictBrand(name = "") {
    const brands = [
        "royal canin", "montego", "purina", "rogz", "marltons", 
        "nutribyte", "feelgood pets", "devoted by nature", "jock",
        "olympic", "ultra dog", "supervet", "dog's life", "dogs life", "sheba"
    ];
    const lower = name.toLowerCase();
    for (const b of brands) {
        if (lower.includes(b)) return b;
    }
    return "generic"; // If no known brand is found, return "generic" to allow for more flexible matching with other generic products, but still prevent mismatches between known brands.
}

// Function to check for mismatches in life stage and size (Adult vs Puppy vs Kitten)
function checkLifeStageAndSizeMismatch(nameA, nameB) {
    const nA = nameA.toLowerCase();
    const nB = nameB.toLowerCase();

    // 1. فحص الفئة العمرية
    if ((nA.includes('puppy') && !nB.includes('puppy')) || (!nA.includes('puppy') && nB.includes('puppy'))) return true;
    if ((nA.includes('kitten') && !nB.includes('kitten')) || (!nA.includes('kitten') && nB.includes('kitten'))) return true;
    if ((nA.includes('senior') && !nB.includes('senior')) || (!nA.includes('senior') && nB.includes('senior'))) return true;
    if ((nA.includes('adult') && nB.includes('puppy')) || (nA.includes('puppy') && nB.includes('adult'))) return true;

    // 2. check for size mismatches (Small vs Large vs Giant)
    if ((nA.includes('small') && nB.includes('large')) || (nA.includes('large') && nB.includes('small'))) return true;
    if ((nA.includes('giant') && !nB.includes('giant')) || (!nA.includes('giant') && nB.includes('giant'))) return true;

    return false; // no conflicts found
}

function findBestMatch(product, candidates) {
    const pBrand = extractStrictBrand(product.name);
    const pType = getProductType(product.name);
    const pKeywords = extractKeywords(product.name);

    let best = null;
    let bestScore = 0;

    for (let item of candidates) {
        // 🚨 strict condition 1: if brands are extracted and not matching, exclude immediately (solves the Jock vs Montego issue)
        const iBrand = extractStrictBrand(item.name);
        if (pBrand !== "generic" && iBrand !== "generic" && pBrand !== iBrand) continue;

        // 🚨 strict condition 2: prevent overlap between cat food and dog food
        const pDog = product.name.toLowerCase().includes('dog');
        const pCat = product.name.toLowerCase().includes('cat');
        const iDog = item.name.toLowerCase().includes('dog');
        const iCat = item.name.toLowerCase().includes('cat');
        if ((pDog && iCat) || (pCat && iDog)) continue;

        // 🚨 strict condition 3: check product type (dry, wet, treat)
        if (pType !== getProductType(item.name)) continue;

        // 🚨 strict condition 4: prevent mixing life stages (Adult vs Puppy)
        if (checkLifeStageAndSizeMismatch(product.name, item.name)) continue;

        // Calculate actual keyword similarity (stable Jaccard Similarity)
        const itemKeywords = extractKeywords(item.name);
        const common = pKeywords.filter(k => itemKeywords.includes(k));
        
        if (common.length === 0) continue;

        const intersect = common.length;
        const union = new Set([...pKeywords, ...itemKeywords]).size;
        let score = intersect / union;

        // 🚨 enhance products that mention flavor details accurately (e.g., Chicken or Salmon)
        const flavors = ['chicken', 'lamb', 'beef', 'tuna', 'salmon', 'trout', 'venison'];
        for (let flavor of flavors) {
            if (product.name.toLowerCase().includes(flavor) && item.name.toLowerCase().includes(flavor)) {
                score += 0.15; // increase confidence if flavors match
            }
        }

        score = Math.min(score, 1);

        // Decision: Only consider this item as the best match if it has the highest score so far AND meets a minimum threshold of 0.65 to ensure relevance (this prevents weak matches from being selected, which is critical for solving the Jock vs Montego issue where some products might have similar keywords but are actually different products)
        if (score > bestScore && score >= 0.65) {
            bestScore = score;
            best = item;
        }
    }

    if (best) {
        return { best, score: bestScore };
    }
    return null;
}

module.exports = { findBestMatch };
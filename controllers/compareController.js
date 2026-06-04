const { scrapeTakealot } = require('../scrapers/takealot');
const { scrapePetHeaven } = require('../scrapers/petheaven');
const { findBestMatch } = require('../services/match');
const { parsePrice, getBestDeal } = require('../services/price');
const { chromium } = require('playwright');

// Smart and complete function to clean and standardize weights and units programmatically for accurate matching
function getNumericWeight(name) {
    if (!name) return null;
    const match = name.toLowerCase().match(/(\d+(?:\.\d+)?)\s*(kg|g|ml|l)\b/);
    
    if (match) {
        let value = parseFloat(match[1]);
        let unit = match[2];
        
        if (unit === 'kg') {
            value = Math.round(value * 1000);
            unit = 'g'; 
        }
        if (unit === 'l') {
            value = Math.round(value * 1000);
            unit = 'ml'; 
        }
        return { value, unit };
    }
    return null;
}

async function compare(limit = 1000) {
    console.log(`\n========================================`);
    console.log(`🚀 Starting extended smart sorting and updating...`);
    console.log(`========================================\n`);

    const takealotRaw = await scrapeTakealot(limit);
    const petheavenProducts = await scrapePetHeaven(limit);

    const results = [];
    const productsToVisit = [];

    console.log(`🔍 Step 1: Initial flexible text-based sorting...`);

    for (let product of takealotRaw) {
        const match = findBestMatch(product, petheavenProducts);
        if (match) {
            productsToVisit.push({
                takealotProduct: product,
                initialMatch: match.best,
                matchScore: match.score
            });
        }
    }

    console.log(`🎯 Shortlisted (${productsToVisit.length}) products to visit their pages and update size prices.`);
    if (productsToVisit.length === 0) return { stats: { matches_found: 0 }, results: [] };

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

    for (let item of productsToVisit) {
        const product = item.takealotProduct;
        
        try {
            await page.goto(product.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(1000);

            // Fetch size options from buttons (if available)
            let sizes = await page.$$eval(
                '[data-ref="variant-text"]',
                els => els.map(el => el.textContent.trim())
            );

            const variantsWithPrices = [];

            if (sizes.length > 0) {
                for (let size of sizes) {
                    const priceBeforeClick = await page.evaluate(() => {
                        const el = document.querySelector('.buybox-module_sticky-price_22O67 .currency') || 
                                   document.querySelector('[data-ref="price"] .currency') ||
                                   document.querySelector('.buybox-offer-module_active_3I1Yj .currency');
                        return el ? el.innerText.trim() : '';
                    });

                    // click the size button to update the price
                    await page.evaluate((sizeText) => {
                        const buttons = [...document.querySelectorAll('[data-ref="variant-button"]')];
                        const target = buttons.find(b => b.innerText.trim().includes(sizeText.trim()));
                        if (target) {
                            target.removeAttribute('disabled');
                            target.classList.remove('disabled');
                            const clickEvent = new MouseEvent('click', { bubbles: true });
                            target.dispatchEvent(clickEvent);
                        }
                    }, size);

                    try {
                        await page.waitForFunction((oldPrice) => {
                            const el = document.querySelector('.buybox-module_sticky-price_22O67 .currency') || 
                                       document.querySelector('[data-ref="price"] .currency');
                            return el && el.innerText.trim() !== oldPrice;
                        }, priceBeforeClick, { timeout: 1500 });
                    } catch (e) {}

                    const currentPriceText = await page.evaluate(() => {
                        const el = document.querySelector('.buybox-module_sticky-price_22O67 .currency') || 
                                   document.querySelector('[data-ref="price"] .currency');
                        return el ? el.innerText.trim() : null;
                    });

                    variantsWithPrices.push({
                        size: size,
                        price: parsePrice(currentPriceText || product.price)
                    });
                }
            } else {
                variantsWithPrices.push({
                    size: null, 
                    price: parsePrice(product.price)
                });
            }

            // 🔥 Step 3: Fair matching for each extracted size
            for (let tVariant of variantsWithPrices) {
                const tWeight = getNumericWeight(tVariant.size || product.name);
                
                // Smart search in all PetHeaven products that belong to the same brand
                let matchedPetHeavenItem = petheavenProducts.find(p => {
                    const pWeight = getNumericWeight(p.name);
                    
                    // If both have weights and units, they must match exactly to be considered a valid match (solves the Jock vs Montego issue)
                    if (tWeight && pWeight && tWeight.value === pWeight.value && tWeight.unit === pWeight.unit) {
                        // Check if the first keyword of the PetHeaven product is included in the Takealot product name to ensure relevance (prevents mismatches like "Royal Canin Medium Adult" matching with "Royal Canin Medium Puppy")
                        const keyword = item.initialMatch.name.split(' ')[0].toLowerCase();
                        return p.name.toLowerCase().includes(keyword);
                    }
                    return false;
                });

                // Practical fallback: If no exact weight match is found, allow the initial best match from the first step (which is based on overall text similarity) to be considered as a last resort, but only if the Takealot variant doesn't have a clear weight (to prevent mismatches like Jock vs Montego)
                if (!matchedPetHeavenItem && !tWeight) {
                    matchedPetHeavenItem = item.initialMatch;
                }

                if (!matchedPetHeavenItem) continue; // Skip if no relevant match is found in PetHeaven for this specific size variant

                const petheavenPrice = parsePrice(matchedPetHeavenItem.price);
                const takealotPrice = tVariant.price;

                // Critical check: If the price difference is extremely high (e.g., more than 2.5 times), it's likely a mismatch, so we skip it (solves the Jock vs Montego issue where one size variant is matched with a completely different product with a very different price)
                const priceRatio = Math.max(takealotPrice, petheavenPrice) / Math.min(takealotPrice, petheavenPrice);
                if (priceRatio > 2.5) continue; 

                const bestDeal = getBestDeal(takealotPrice, petheavenPrice, "Takealot", "PetHeaven");
                const displayName = tVariant.size ? `${product.name} (${tVariant.size})` : product.name;

                results.push({
                    product: displayName,
                    takealot: {
                        name: displayName,
                        price: takealotPrice,
                        url: product.url,
                        source: "Takealot",
                        size: tVariant.size
                    },
                    petheaven: {
                        name: matchedPetHeavenItem.name,
                        price: petheavenPrice,
                        url: matchedPetHeavenItem.url,
                        source: "PetHeaven",
                        size: matchedPetHeavenItem.size || null
                    },
                    match_score: item.matchScore,
                    best_deal: bestDeal,
                    price_difference: Math.abs(takealotPrice - petheavenPrice).toFixed(2)
                });
            }

        } catch (err) {
            console.log(`❌ Error with product: ${product.name}`, err.message);
        }
    }

    await page.close();
    await browser.close();

    // Critical final step: Remove duplicates based on the unique combination of Takealot URL and size (to prevent multiple matches of different PetHeaven products with the same Takealot product variant) and sort by match score to prioritize the most relevant matches at the top
    const uniqueResults = results.filter((v, i, a) => a.findIndex(t => (t.takealot.url === v.takealot.url && t.takealot.size === v.takealot.size)) === i);
    uniqueResults.sort((a, b) => b.match_score - a.match_score);

    console.log(`\n========================================`);
    console.log(`✅ Found ${uniqueResults.length} unique matches`);
    console.log(`========================================\n`);

    return {
        stats: {
            total_takealot: takealotRaw.length,
            total_petheaven: petheavenProducts.length,
            matches_found: uniqueResults.length
        },
        results: uniqueResults
    };
}

module.exports = { compare };
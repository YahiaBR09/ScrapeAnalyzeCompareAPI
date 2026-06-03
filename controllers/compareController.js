const { scrapeTakealot } = require('../scrapers/takealot');
const { scrapePetHeaven } = require('../scrapers/petheaven');

const { findBestMatch } = require('../services/match');
const { parsePrice, getBestDeal } = require('../services/price');

async function compare(limit = 1000) {

    console.log(`\n========================================`);
    console.log(`جاري الكشط من المتاجر - الحد الأقصى: ${limit} منتج من كل متجر...`);
    console.log(`========================================\n`);
    
    const takealot = await scrapeTakealot(limit);
    const petheaven = await scrapePetHeaven(limit);

    console.log(`\n📊 النتائج:`);
    console.log(`   Takealot:   ${takealot.length} منتج`);
    console.log(`   PetHeaven:  ${petheaven.length} منتج`);
    console.log(`\n🔄 جاري المقارنة والمطابقة...\n`);

    const results = [];
    const matches = [];

    for (let product of takealot) {

        const match = findBestMatch(product, petheaven);

        if (match && match.score > 0.80) {

            const takealotPrice = parsePrice(product.price);
            const petheavenPrice = parsePrice(match.best.price);

            const best = getBestDeal(
                takealotPrice,
                petheavenPrice,
                "Takealot",
                "PetHeaven"
            );

            results.push({
                product: product.name,
                takealot: {
                    name: product.name,
                    price: takealotPrice,
                    original_price: product.price,
                    url: product.url,
                    source: "Takealot"
                },
                petheaven: {
                    name: match.best.name,
                    price: petheavenPrice,
                    original_price: match.best.price,
                    url: match.best.url,
                    source: "PetHeaven"
                },
                match_score: parseFloat(match.score.toFixed(4)),
                best_deal: best,
                price_difference: Math.abs(takealotPrice - petheavenPrice).toFixed(2)
            });

            matches.push(match.score);
        }
    }

    results.sort((a, b) => b.match_score - a.match_score);

    const stats = {
        total_takealot: takealot.length,
        total_petheaven: petheaven.length,
        matches_found: results.length,
        average_score: matches.length > 0 ? (matches.reduce((a, b) => a + b, 0) / matches.length).toFixed(4) : 0,
        best_match_score: matches.length > 0 ? Math.max(...matches).toFixed(4) : 0,
        worst_match_score: matches.length > 0 ? Math.min(...matches).toFixed(4) : 0
    };

    console.log(`\n========================================`);
    console.log(`✅ النتائج النهائية:`);
    console.log(`   المطابقات المجدة:  ${results.length}`);
    console.log(`   متوسط الدرجة:    ${stats.average_score}`);
    console.log(`   أفضل درجة:      ${stats.best_match_score}`);
    console.log(`========================================\n`);

    return {
        stats,
        results
    };
}

module.exports = { compare };
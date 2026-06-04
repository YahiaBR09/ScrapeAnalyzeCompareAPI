const { chromium } = require('playwright');

async function scrapeTakealotCustomCategories() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // Words to search for each category to ensure we get relevant products and reach the 100 product limit per category
    const categories = [

        // Dogs
        { name: 'Dog Food', query: 'dog food' },
        { name: 'Dog Health', query: 'dog health supplement flea tick' },
        { name: 'Dog Toys', query: 'dog toys' },
        { name: 'Dog Accessories', query: 'dog collar harness leash' },
        { name: 'Dog Beds', query: 'dog bed crate carrier bowl feeder' },

        // Cats
        { name: 'Cat Food', query: 'cat food' },
        { name: 'Cat Health', query: 'cat health supplement flea tick' },
        { name: 'Cat Toys', query: 'cat toys' },
        { name: 'Cat Accessories', query: 'cat collar harness' },
        { name: 'Cat Beds', query: 'cat bed cat tree scratching post' }

    ];

    const limitPerCategory = 150; // the strict limit for each category
    let allProducts = [];

    try {
        for (const cat of categories) {
            console.log(`\n📂 ─────────────────────────────────────────────`);
            console.log(`🚀 Beginning scrape for category [ ${cat.name} ] -> searching for: "${cat.query}"...`);
            console.log(`📂 ─────────────────────────────────────────────`);

            // 🔥 2. Put route handling code here
            await page.route('**/*', (route) => {
                const type = route.request().resourceType();
                if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
                    route.abort();
                } else {
                    route.continue();
                }
            });
            // open homepage and search for the category query
            await page.goto('https://www.takealot.com', { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('input.search-field', { timeout: 150000 });
            await page.fill('input.search-field', cat.query);
            await page.keyboard.press('Enter');

            // wait for the default products to load
            await page.waitForSelector('article.product-card', { timeout: 150000 }).catch(() => {
                console.log('⚠️ No results found for this search, moving to the next category.');
            });

            let catProducts = [];
            let clickCount = 0;
            const maxClicks = 15;

            while (catProducts.length < limitPerCategory && clickCount < maxClicks) {
                // extract products from the current page
                const pageProducts = await page.$$eval('article.product-card', (cards, catName) => {
                    return cards.map(card => {
                        const name = card.querySelector('h4, h2, [data-testid*="product-name"]')?.innerText?.trim();
                        const priceEl = card.querySelector('.price .currency, [data-testid*="price"] .currency') 
                                        || card.querySelector('.price, [data-testid*="price"]');
                        const price = priceEl?.innerText?.trim();
                        const link = card.querySelector('a')?.href;

                        return { 
                            name: name ? name.trim() : null, 
                            price: price ? price.trim() : null, 
                            url: link,
                            source: "Takealot",
                            category: catName
                        };
                    }).filter(p => p.name && p.price && p.name.length > 3);
                }, cat.name);

                // safe merge new products while ensuring we don't exceed the limit and avoid duplicates
                for (const product of pageProducts) {
                    if (!catProducts.find(p => p.url === product.url)) {
                        catProducts.push(product);
                    }
                    if (catProducts.length >= limitPerCategory) break;
                }

                console.log(`✓ Collected ${catProducts.length}/${limitPerCategory} products for category [${cat.name}]`);

                if (catProducts.length >= limitPerCategory) break;

                // scroll down to click the Load More button to explore more products in the category
                try {
                    const loadMoreExists = await page.evaluate(() => {
                        const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Load More'));
                        return !!btn;
                    });

                    if (loadMoreExists) {
                        await page.evaluate(() => {
                            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Load More'));
                            if (btn) {
                                btn.scrollIntoView({ behavior: 'smooth' });
                                btn.click();
                            }
                        });
                        clickCount++;
                        await page.waitForTimeout(3000); // increase wait time to allow new products to load
                    } else {
                        console.log('✓ No more results available in the store for this search.');
                        break;
                    }
                } catch (error) {
                    break;
                }
            }

            // merge current category products with the overall results array
            allProducts = allProducts.concat(catProducts);
        }

        await browser.close();
        console.log(`\n🎉 Scrape completed successfully! Total products collected for Top Rated: ${allProducts.length}`);
        return allProducts;

    } catch (error) {
        console.error('❌  error in Takealot scrape:', error);
        await browser.close();
        return allProducts;
    }
}

module.exports = { scrapeTakealot: scrapeTakealotCustomCategories };
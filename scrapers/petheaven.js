const { chromium } = require('playwright');

async function scrapePetHeavenAllCategories() {
    const browser = await chromium.launch({
        headless: false,
        args: ['--disable-blink-features=AutomationControlled']
    });

    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 800 }
    });

    const page = await context.newPage();
    // 🔥 2. put route handling here (before navigating to the URL)
    await page.route('**/*', (route) => {
        const type = route.request().resourceType();
        if (['image', 'media', 'font'].includes(type)) {
            route.abort();
        } else {
            route.continue();
        }
    });

    // mapping of our custom categories to their corresponding search queries on the website to ensure we get relevant products and reach the 100 product limit per category
    const categories = [

        // Dogs
        { name: 'Dog Food', url: 'https://www.petheaven.co.za/dogs/dog-food.html' },
        { name: 'Dog Health', url: 'https://www.petheaven.co.za/dogs/dog-health-wellness.html' },
        { name: 'Dog Toys', url: 'https://www.petheaven.co.za/dogs/dog-toys.html' },
        { name: 'Dog Accessories', url: 'https://www.petheaven.co.za/dogs/dog-collars-harnesses-leads.html' },
        { name: 'Dog Beds', url: 'https://www.petheaven.co.za/dogs/dog-beds.html' },

        // Cats
        { name: 'Cat Food', url: 'https://www.petheaven.co.za/cats/cat-food.html' },
        { name: 'Cat Health', url: 'https://www.petheaven.co.za/cats/cat-health-wellness.html' },
        { name: 'Cat Toys', url: 'https://www.petheaven.co.za/cats/cat-toys.html' },
        { name: 'Cat Accessories', url: 'https://www.petheaven.co.za/cats/cat-collars-harnesses-leads.html' },
        { name: 'Cat Beds', url: 'https://www.petheaven.co.za/cats/cat-beds.html' }

    ];
    
    let allProducts = [];

    async function scrollSlowlyToBottom() {
        console.log('📜 scrolling to bottom...');
        try {
            await page.waitForLoadState('domcontentloaded', { timeout: 15000 });
            let scrolled = 0;
            const distance = 300;
            let lastHeight = await page.evaluate(() => document.body.scrollHeight).catch(() => 0);

            while (true) {
                try {
                    await page.evaluate((d) => window.scrollBy(0, d), distance);
                    scrolled += distance;
                    await page.waitForTimeout(150);

                    const newHeight = await page.evaluate(() => document.body.scrollHeight).catch(() => 0);
                    if (scrolled >= newHeight || newHeight === 0) break;
                    if (newHeight > lastHeight) lastHeight = newHeight;
                } catch (innerErr) {
                    if (innerErr.message.includes('Execution context was destroyed') || innerErr.message.includes('Target closed')) {
                        break;
                    }
                    throw innerErr;
                }
            }
            await page.waitForTimeout(2000);
        } catch (err) {
            console.log('⚠️ error during scrolling:', err.message);
        }
    }

    async function dismissOverlays() {
        try {
            await page.evaluate(() => {
                const overlays = document.querySelectorAll('.modal, .overlay, [class*="popup"], [class*="newsletter"]');
                overlays.forEach(el => { el.style.display = 'none'; });
            }).catch(() => {});
        } catch (err) {}
    }

    async function extractProducts(categoryName) {
        const productSelector = 'li.snize-product, .products-grid .item, .products-list .item, li.item';

        return await page.$$eval(productSelector, (items, catName) => {
            const products = [];

            items.forEach(item => {
                const nameEl = item.querySelector('.product-name a') || item.querySelector('h2 a');
                const linkEl = item.querySelector('.product-name a') || item.querySelector('a[href]');

                const baseName = nameEl?.textContent?.trim();
                const url = linkEl?.href;

                if (!baseName || !url) return;

                // 1. setup for products with multiple size variants (like dog food bags)
                const scripts = [...item.querySelectorAll('script')].map(s => s.textContent || '');
                let foundVariants = false;

                for (const scriptText of scripts) {
                    if (!scriptText.includes('new SubscriptionSwatch')) continue;

                    try {
                        // extract the JSON object that contains the variant options and prices using regex
                        const jsonMatch = scriptText.match(/"configOptions"\s*:\s*(\{[\s\S]*?\})\s*,\s*"regularPriceLabel"/);
                        if (!jsonMatch) continue;

                        const configOptions = JSON.parse(jsonMatch[1]);
                        
                        // pass through the JSON options to extract variant-specific details like size and price for each variant of this product
                        // use the first attribute key to get the options array since we assume there's only one type of variant (like size) for these products
                        const attributes = configOptions.config?.attributes || {};
                        const firstAttrKey = Object.keys(attributes)[0];
                        const jsonOptions = attributes[firstAttrKey]?.options || [];

                        // in case there are swatches (like size options) we need to match them with the JSON options to get the correct price for each variant
                        const swatches = item.querySelectorAll('.swatch-option');

                        if (jsonOptions.length > 0 && swatches.length > 0) {
                            
                            // rotate through each swatch (variant) and find the matching option in the JSON to extract the correct price for that variant
                            swatches.forEach(swatch => {
                                const optionId = swatch.getAttribute('data-option-id');
                                const sizeLabel = swatch.getAttribute('data-option-label');

                                // search for the matching option in the JSON using the extracted option ID
                                const matchedJsonOption = jsonOptions.find(opt => String(opt.id) === String(optionId));

                                if (matchedJsonOption) {
                                    products.push({
                                        name: sizeLabel ? `${baseName} ${sizeLabel}` : baseName,
                                        price: `R${matchedJsonOption.once_off_price}`, // get the one-time price for this variant
                                        subscription_price: `R${matchedJsonOption.subscription_price}`, // added field for subscription price if available
                                        url,
                                        source: 'PetHeaven',
                                        category: catName,
                                        size: sizeLabel
                                    });
                                }
                            });
                            foundVariants = true;
                        }
                    } catch (e) {
                        // if any error occurs during the variant extraction process, we log it and fallback to basic extraction for this product
                        console.log('⚠️ error while analyzing product options, skipping this product.');
                        continue;
                    }
                }

                // 2. products without variants or if variant extraction failed, fallback to basic extraction
                if (!foundVariants) {
                    const priceEl = item.querySelector('.price-box .regular-price .price') || item.querySelector('.price');
                    products.push({
                        name: baseName,
                        price: priceEl?.textContent?.replace(/\s+/g, ' ').trim() || 'N/A',
                        url,
                        source: 'PetHeaven',
                        category: catName
                    });
                }
            });

            return products;
        }, categoryName);
    }

    async function goToNextPage(nextButtonSelector) {
        try {
            await dismissOverlays();
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(1000);

            const btn = await page.$(nextButtonSelector);
            if (!btn) return false;

            console.log(' Republic 🖱️ clicking next page...');
            await page.evaluate((sel) => {
                const el = document.querySelector(sel);
                if (el) el.click();
            }, nextButtonSelector);

            try {
                await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 10000 });
            } catch {
                await page.waitForTimeout(4000);
            }
            return true;
        } catch (err) {
            return false;
        }
    }

    // rotate through each category to extract products
    for (const cat of categories) {
        console.log(`\n📂 ─────────────────────────────────────────────`);
        console.log(`🚀 beginning scrape for category [ ${cat.name} ] from PetHeaven...`);
        console.log(`📂 ─────────────────────────────────────────────`);

        try {
            await page.goto(cat.url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
            await page.waitForSelector('li.snize-product, .products-grid, li.item', { timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(2000);
            await dismissOverlays();

            // attempt to sort by rating if the option exists to prioritize top-rated products
            try {
                await page.waitForSelector('.sort-by select', { timeout: 5000 });
                const ratingValue = await page.evaluate(() => {
                    const options = Array.from(document.querySelectorAll('.sort-by select option'));
                    const ratingOpt = options.find(opt => opt.textContent.toLowerCase().includes('rating'));
                    return ratingOpt ? ratingOpt.value : null;
                });
                if (ratingValue) {
                    await page.selectOption('.sort-by select', ratingValue);
                    await page.waitForTimeout(5000);
                }
            } catch (e) { console.log('ℹ️ no sorting option available.'); }

            // increase products per page to reduce pagination if the option exists
            try {
                await page.waitForSelector('.limiter select', { timeout: 5000 });
                const selectValue = await page.evaluate(() => {
                    const options = Array.from(document.querySelectorAll('.limiter select option'));
                    const targetOption = options.find(opt => opt.textContent.includes('112'));
                    return targetOption ? targetOption.value : null;
                });
                if (selectValue) {
                    await page.selectOption('.limiter select', selectValue);
                    await page.waitForTimeout(5000);
                }
            } catch (e) {}

            let pageNum = 1;
            const nextButtonSelector = '.pages li.next a, a.next.ic-right, a.next, .pagination .next a';
            let catProductsCount = 0;

            while (true) {
                console.log(`\n🔍 scraping page number: ${pageNum} for category [${cat.name}]...`);
                await scrollSlowlyToBottom();

                const pageProducts = await extractProducts(cat.name).catch(() => []);
                console.log(`   ✓ found ${pageProducts.length} products on this page.`);

                if (pageProducts.length === 0) {
                    console.log('   ⚠️ no products found on this page, stopping pagination for this category.');
                    break;
                }

                let added = 0;
                for (const p of pageProducts) {
                    if (!allProducts.find(x => x.url === p.url)) {
                        allProducts.push(p);
                        added++;
                        catProductsCount++;
                    }
                }
                console.log(`   ➕ added ${added} product new | Total for this category so far: ${catProductsCount}`);

                const nextButton = await page.$(nextButtonSelector);
                if (nextButton) {
                    pageNum++;
                    const success = await goToNextPage(nextButtonSelector);
                    if (!success) break;
                } else {
                    console.log(`✓ completed collecting all pages for category [${cat.name}].`);
                    break;
                }
            }
        } catch (catErr) {
            console.error(`❌ error while processing category ${cat.name}:`, catErr.message);
        }
    }

    await browser.close();
    console.log(`\n🎉 completed scraping PetHeaven! Total products extracted for all categories: ${allProducts.length}`);
    return allProducts;
}

module.exports = { scrapePetHeaven: scrapePetHeavenAllCategories };
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

    // خريطة التصنيفات والروابط الخاصة بها على موقع PetHeaven
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
        console.log('📜 جاري النزول ببطء لأسفل الصفحة...');
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
            console.log('⚠️ تنبيه أثناء التمرير، تم التجاوز للاستقرار.');
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
        const productSelector = 'li.snize-product, .products-grid .item, .products-list .item, li.item.product-item';
        return await page.$$eval(productSelector, (items, catName) => {
            return items.map(item => {
                const nameEl  = item.querySelector('.snize-title') || item.querySelector('.product-name a') || item.querySelector('.product-item-name a') || item.querySelector('h2 a, h3 a');
                const priceEl = item.querySelector('.snize-price') || item.querySelector('.price') || item.querySelector('[id^="product-price-"]');
                const linkEl  = item.querySelector('a.snize-view-link') || item.querySelector('a.product-image') || item.querySelector('a[href]');
                return {
                    name:   nameEl?.innerText?.trim() || null,
                    price:  priceEl?.textContent?.replace(/\s+/g, ' ').trim() || null,
                    url:    linkEl?.href || null,
                    source: 'PetHeaven',
                    category: catName
                };
            }).filter(p => p.name && p.price && p.name.length > 3);
        }, categoryName);
    }

    async function goToNextPage(nextButtonSelector) {
        try {
            await dismissOverlays();
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await page.waitForTimeout(1000);

            const btn = await page.$(nextButtonSelector);
            if (!btn) return false;

            console.log(' Republic 🖱️ الانتقال برمجياً إلى الصفحة التالية...');
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

    // الدوران على كافة التصنيفات المطلوبة
    for (const cat of categories) {
        console.log(`\n📂 ─────────────────────────────────────────────`);
        console.log(`🚀 بدء كشط تصنيف [ ${cat.name} ] من موقع PetHeaven...`);
        console.log(`📂 ─────────────────────────────────────────────`);

        try {
            await page.goto(cat.url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
            await page.waitForSelector('li.snize-product, .products-grid, li.item', { timeout: 20000 }).catch(() => {});
            await page.waitForTimeout(2000);
            await dismissOverlays();

            // الفرز الافتراضي حسب التقييم
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
            } catch (e) { console.log('ℹ️ لم يتوفر خيار الفرز الفوري.'); }

            // تعظيم حجم العرض لـ 112 لتسريع الجلب الشامل
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
                console.log(`\n🔍 كشط الصفحة رقم: ${pageNum} لتصنيف [${cat.name}]...`);
                await scrollSlowlyToBottom();

                const pageProducts = await extractProducts(cat.name).catch(() => []);
                console.log(`   ✓ تم العثور على ${pageProducts.length} منتج في الصفحة.`);

                if (pageProducts.length === 0) {
                    console.log('   ⚠️ لا توجد منتجات إضافية، الانتقال للتصنيف التالي.');
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
                console.log(`   ➕ أُضيف ${added} منتج جديد | إجمالي هذا التصنيف حتى الآن: ${catProductsCount}`);

                const nextButton = await page.$(nextButtonSelector);
                if (nextButton) {
                    pageNum++;
                    const success = await goToNextPage(nextButtonSelector);
                    if (!success) break;
                } else {
                    console.log(`✓ اكتمل جمع كافة صفحات تصنيف [${cat.name}].`);
                    break;
                }
            }
        } catch (catErr) {
            console.error(`❌ خطأ أثناء معالجة تصنيف ${cat.name}:`, catErr.message);
        }
    }

    await browser.close();
    console.log(`\n🎉 انتهى الكشط الشامل لـ PetHeaven! إجمالي المنتجات المستخرجة لكل الأقسام: ${allProducts.length}`);
    return allProducts;
}

module.exports = { scrapePetHeaven: scrapePetHeavenAllCategories };
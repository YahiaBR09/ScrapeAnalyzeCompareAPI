const { chromium } = require('playwright');

async function scrapeTakealotCustomCategories() {
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();

    // الكلمات الدلالية للبحث في الموقع بما يوافق التصنيفات الخمسة المطلوبة
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

    const limitPerCategory = 150; // الحد الصارم لكل صنف
    let allProducts = [];

    try {
        for (const cat of categories) {
            console.log(`\n📂 ─────────────────────────────────────────────`);
            console.log(`🚀 بدء كشط تصنيف [ ${cat.name} ] -> البحث عن: "${cat.query}"...`);
            console.log(`📂 ─────────────────────────────────────────────`);

            // فتح الموقع والتوجه لمحرك البحث لكل صنف بشكل مستقل
            await page.goto('https://www.takealot.com', { waitUntil: 'domcontentloaded' });
            await page.waitForSelector('input.search-field', { timeout: 60000 });
            await page.fill('input.search-field', cat.query);
            await page.keyboard.press('Enter');

            // انتظر تحميل المنتجات الافتراضية أولاً
            await page.waitForSelector('article.product-card', { timeout: 60000 }).catch(() => {
                console.log('⚠️ لم تظهر نتائج لهذا البحث، الانتقال للتصنيف التالي.');
            });

            let catProducts = [];
            let clickCount = 0;
            const maxClicks = 15;

            while (catProducts.length < limitPerCategory && clickCount < maxClicks) {
                // استخراج المنتجات الحالية من الصفحة
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

                // حفظ العناصر الفرعية للتصنيف الحالي لمنع التكرار وضمان سقف الـ 100
                for (const product of pageProducts) {
                    if (!catProducts.find(p => p.url === product.url)) {
                        catProducts.push(product);
                    }
                    if (catProducts.length >= limitPerCategory) break;
                }

                console.log(`✓ تم تجمع ${catProducts.length}/${limitPerCategory} منتج لتصنيف [${cat.name}]`);

                if (catProducts.length >= limitPerCategory) break;

                // النزول لضغط زر Load More لاستكشاف المزيد من ذات الصنف
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
                        await page.waitForTimeout(3000); // زيادة وقت الانتظار بعد الفرز لضمان تحميل المنتجات المصنفة
                    } else {
                        console.log('✓ لا يوجد المزيد من النتائج المتاحة في المتجر لهذا البحث.');
                        break;
                    }
                } catch (error) {
                    break;
                }
            }

            // دمج منتجات الصنف الحالي مع مصفوفة النتائج الكلية
            allProducts = allProducts.concat(catProducts);
        }

        await browser.close();
        console.log(`\n🎉 اكتمل كشط Takealot بنجاح! الإجمالي المصنف لـ Top Rated: ${allProducts.length}`);
        return allProducts;

    } catch (error) {
        console.error('❌ خطأ رئيسي في كشط Takealot:', error);
        await browser.close();
        return allProducts;
    }
}

module.exports = { scrapeTakealot: scrapeTakealotCustomCategories };
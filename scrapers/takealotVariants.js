const { chromium } = require('playwright');

async function getTakealotVariants(page) {

    const variants = await page.$$eval(
        '[data-ref="variant-text"]',
        els => els.map(el => el.textContent.trim())
    );

    return variants;
}

module.exports = { getTakealotVariants };
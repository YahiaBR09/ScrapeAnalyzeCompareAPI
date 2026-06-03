function parsePrice(text = "") {
    if (!text) return null;
    
    // تنظيف النصوص والمسافات وإبقاء الأرقام، النقاط، والفواصل
    let cleaned = text.trim().replace(/[^\d.,]/g, '');
    
    // إذا كانت الفاصلة لآلاف (مثال: 1,295.00) نقوم بحذف الفاصلة المعتمدة للآلاف
    if (cleaned.includes(',') && cleaned.includes('.')) {
        if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
            cleaned = cleaned.replace(/,/g, ''); // حذف فاصلة الآلاف
        }
    } else if (cleaned.includes(',')) {
        // إذا كان يحتوي على فاصلة فقط بدون نقطة (مثل نظام جنوب أفريقيا R1295,00)
        const parts = cleaned.split(',');
        if (parts[1].length === 2) {
            cleaned = parts[0] + '.' + parts[1]; // تحويلها لعشرية
        } else {
            cleaned = cleaned.replace(/,/g, ''); // إذا لم تكن عشرية فهي آلاف
        }
    }
    
    const price = parseFloat(cleaned);
    return isNaN(price) ? null : parseFloat(price.toFixed(2));
}

function getBestDeal(priceA, priceB, sourceA = "Unknown", sourceB = "Unknown") {
    if (!priceA || !priceB) return null;
    
    // تقريب القيم لأقرب منزلتين قبل المقارنة الرياضية
    const pA = parseFloat(parseFloat(priceA).toFixed(2));
    const pB = parseFloat(parseFloat(priceB).toFixed(2));

    if (pA < pB) {
        return {
            source: sourceA,
            price: pA,
            savings: parseFloat((pB - pA).toFixed(2))
        };
    } else if (pB < pA) {
        return {
            source: sourceB,
            price: pB,
            savings: parseFloat((pA - pB).toFixed(2))
        };
    }
    
    return {
        source: "Equal",
        price: pA,
        savings: 0
    };
}

module.exports = { parsePrice, getBestDeal };
# تحديث Pagination - استراتيجية جديدة

## المشكلة الأصلية ❌
كان الكود يحاول عمل infinite scroll بـ `window.scrollBy()`، لكن:
- **Takealot** يستخدم زر "Load More" لتحميل المنتجات الجديدة
- **PetHeaven** يستخدم pagination links للانتقال بين الصفحات

## الحل الجديد ✅

### 1. Takealot.js - زر "Load More"

**الآلية:**
```javascript
// البحث عن الزر
const loadMoreExists = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.includes('Load More')
    );
    return !!btn;
});

// الضغط على الزر
if (loadMoreExists) {
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => 
            b.textContent.includes('Load More')
        );
        if (btn) {
            btn.scrollIntoView({ behavior: 'smooth' });
            btn.click();
        }
    });
}
```

**الخصائص:**
- ✅ يبحث عن الزر في كل تكرار
- ✅ يقوم بـ scroll للزر قبل الضغط
- ✅ ينتظر 2 ثانية قبل الكشط مرة أخرى
- ✅ يستمر حتى 30 محاولة أو يصل الحد الأقصى للمنتجات

### 2. PetHeaven.js - Pagination Links

**الآلية:**
```javascript
// البحث عن رابط الصفحة التالية
const nextPageLink = await page.evaluate(() => {
    const nextBtn = document.querySelector('a.snize-pagination-next:not(.disabled)');
    return nextBtn?.href || null;
});

// الانتقال للصفحة التالية
if (nextPageLink) {
    currentPage++;
    await page.goto(nextPageLink, { waitUntil: 'domcontentloaded' });
}
```

**الخصائص:**
- ✅ يستخدم selector الصحيح: `a.snize-pagination-next`
- ✅ يتجاهل الأزرار المعطلة (disabled)
- ✅ يتنقل بين الصفحات تلقائياً
- ✅ ينتظر حتى يتم تحميل الصفحة كاملة

## مثال على الاستخدام

```bash
# تشغيل الخادم
npm start

# أو يدويًا
node server.js
```

### في الطرفية الأخرى:

```bash
# الحصول على 100 منتج مقارن
curl http://localhost:3000/market

# الحصول على 50 منتج فقط
curl http://localhost:3000/market?limit=50

# الإحصائيات فقط
curl http://localhost:3000/market/stats
```

## ملفات معدلة 📝

| الملف | التغيير |
|------|--------|
| `scrapers/takealot.js` | تحديث للبحث عن زر Load More والضغط عليه |
| `scrapers/petheaven.js` | تحديث للانتقال بين صفحات Pagination |

## السجلات المطبوعة في Terminal 📊

### Takealot:
```
✓ تم جلب 10 منتج من Takealot
➜ Click Load More (1)
✓ تم جلب 20 منتج من Takealot
➜ Click Load More (2)
...
✓ لا يوجد زر Load More - انتهت المنتجات
```

### PetHeaven:
```
📄 صفحة 1: جاري الكشط...
✓ وجدنا 20 منتج في الصفحة 1
➜ الانتقال للصفحة 2...
📄 صفحة 2: جاري الكشط...
✓ وجدنا 20 منتج في الصفحة 2
...
✓ انتهت جميع الصفحات
```

## ملاحظات مهمة ⚠️

1. **التوقيت**: كل منصة قد تحتاج وقت مختلف للتحميل
   - Takealot: 2000ms بين الضغطات
   - PetHeaven: 1000ms بين الصفحات

2. **معالجة الأخطاء**: إذا فشل التحميل:
   - يتجاهل الخطأ ويستمر
   - يطبع رسالة واضحة

3. **الحد الأقصى**:
   - Takealot: حد أقصى 30 ضغطة على الزر
   - PetHeaven: يستمر حتى نهاية الصفحات

## الخطوات التالية 🚀

- [ ] تحسين التوقيت حسب سرعة التحميل
- [ ] إضافة retry logic للأخطاء
- [ ] تخزين البيانات مؤقتًا (caching)
- [ ] إضافة واجهة رسومية

# 🚀 API Documentation - Enterprise Features

## ⚙️ نظام Caching و Cron Job

### المعمارية الجديدة:

```
┌─────────────────────────┐
│   Cron Job (كل ساعة)    │
└──────────────┬──────────┘
               ↓
   ┌───────────────────────┐
   │  المقارنة الكاملة     │
   │  (كشط البيانات)      │
   └──────────────┬────────┘
                  ↓
    ┌─────────────────────────┐
    │  حفظ في Cache (.json)  │
    └──────────────┬──────────┘
                   ↓
      ┌─────────────────────────┐
      │  API تقرأ من Cache      │
      │  (فوري - لا انتظار)    │
      └─────────────────────────┘
```

### الفوائد:
✅ **الأداء** - API تستجيب فوراً من الـ cache  
✅ **التوسعية** - يمكن خدمة آلاف الطلبات دون تحميل الموقع  
✅ **الاستقرار** - المزامنة تعمل منفصلة عن API  

---

## 📡 الـ Endpoints الجديدة

### 1️⃣ GET `/market` - جميع المطابقات

**الاستخدام الأساسي:**
```bash
curl http://localhost:3000/market
```

**Response:**
```json
{
  "success": true,
  "timestamp": "2026-06-01T10:30:45.123Z",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "pages": 8,
    "hasNextPage": true,
    "hasPrevPage": false
  },
  "data": [...]
}
```

---

### 📄 Pagination (الترقيم)

**مثال: الصفحة الثانية بـ 10 نتائج**
```bash
curl "http://localhost:3000/market?page=2&limit=10"
```

**Parameters:**
| Parameter | Default | Max | مثال |
|-----------|---------|-----|------|
| `page` | 1 | - | ?page=3 |
| `limit` | 20 | 100 | ?limit=50 |

**مثال: شركات مختلفة**
```bash
# الصفحة الثالثة بـ 30 نتيجة
http://localhost:3000/market?page=3&limit=30
```

---

### 🔍 Filters (التصفية)

#### أ) **Filter by Savings (التوفير)**
```bash
# فقط العروض بتوفير أكثر من 100 راند
curl "http://localhost:3000/market?minSavings=100"

# العروض من 50 إلى 100 راند
curl "http://localhost:3000/market?minSavings=50&maxSavings=100"
```

#### ب) **Filter by Score (الدرجة)**
```bash
# فقط المطابقات الموثوقة جداً (0.90+)
curl "http://localhost:3000/market?minScore=0.90"
```

#### ج) **Filter by Brand (الماركة)**
```bash
# فقط منتجات Royal Canin
curl "http://localhost:3000/market?brand=royal+canin"

# فقط Montego
curl "http://localhost:3000/market?brand=montego"
```

#### د) **دمج عدة Filters**
```bash
# صفحة 2، بـ 20 نتيجة، توفير أكثر من 50، ودرجة أكثر من 0.85
curl "http://localhost:3000/market?page=2&limit=20&minSavings=50&minScore=0.85"
```

---

### 2️⃣ GET `/market/deals` - أفضل العروض

**الحصول على المنتجات ذات التوفير الكبير:**

```bash
# العروض بتوفير أكثر من 100 راند
curl "http://localhost:3000/market/deals?minSavings=100"

# أفضل 10 عروض مرتبة حسب التوفير
curl "http://localhost:3000/market/deals?minSavings=50&limit=10&sortBy=savings"

# أفضل 10 عروض مرتبة حسب دقة المطابقة
curl "http://localhost:3000/market/deals?minSavings=50&limit=10&sortBy=score"
```

**Parameters:**
| Parameter | Default | مثال |
|-----------|---------|------|
| `minSavings` | 50 | ?minSavings=100 |
| `sortBy` | savings | ?sortBy=score |
| `limit` | 20 | ?limit=10 |
| `page` | 1 | ?page=2 |

**Response Example:**
```json
{
  "success": true,
  "deals": {
    "minSavings": 100,
    "totalDeals": 45,
    "totalSavings": 4250.50
  },
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 45,
    "pages": 5
  },
  "data": [
    {
      "product": "Royal Canin Adult 15kg",
      "match_score": 0.92,
      "best_deal": {
        "source": "PetHeaven",
        "price": 599.99,
        "savings": 150.00
      }
    }
  ]
}
```

---

### 3️⃣ GET `/market/stats` - الإحصائيات

```bash
curl http://localhost:3000/market/stats
```

**Response:**
```json
{
  "success": true,
  "lastUpdated": "2026-06-01T10:00:00.000Z",
  "nextSync": "2026-06-01T11:00:00.000Z",
  "stats": {
    "total_takealot": 100,
    "total_petheaven": 1174,
    "matches_found": 47,
    "average_score": 0.8732,
    "best_match_score": 0.9842,
    "worst_match_score": 0.8011
  },
  "performance": {
    "syncDuration": "45.23s",
    "averageScore": 0.8732,
    "bestScore": 0.9842
  }
}
```

---

### 4️⃣ GET `/market/sync` - تحديث يدوي

**تشغيل المزامنة الآن (لا تنتظر الساعة):**
```bash
curl "http://localhost:3000/market/sync"

# مع عدد منتجات مخصص
curl "http://localhost:3000/market/sync?limit=200"
```

---

### 5️⃣ GET `/health` - فحص الصحة

**التحقق من حالة السيرفر والـ cache:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "healthy",
  "cacheExists": true,
  "cacheAge": "15 دقيقة",
  "timestamp": "2026-06-01T10:15:30.000Z"
}
```

---

## 💡 أمثلة عملية

### مثال 1: Dashboard العروض الأفضل
```bash
# أفضل 5 عروض بتوفير أكثر من 150 راند
curl "http://localhost:3000/market/deals?minSavings=150&limit=5&sortBy=savings"
```

### مثال 2: فحص الجودة
```bash
# منتجات موثوقة جداً (0.95+) فقط
curl "http://localhost:3000/market?minScore=0.95&limit=20"
```

### مثال 3: منتجات ماركة معينة
```bash
# صفحة 1 لمنتجات Royal Canin بتوفير أكثر من 30 راند
curl "http://localhost:3000/market?brand=royal+canin&minSavings=30&limit=15"
```

### مثال 4: التصفح المتقدم
```bash
# الصفحة 2، بـ 25 نتيجة، توفير من 40 إلى 200 راند، دقة 0.85+
curl "http://localhost:3000/market?page=2&limit=25&minSavings=40&maxSavings=200&minScore=0.85"
```

---

## 🔄 Cron Job - نظام المزامنة

### كيفية العمل:

1. **بدء السيرفر** ← يشغل Cron Job تلقائياً
2. **أول مزامنة** ← فوراً عند بدء السيرفر
3. **المزامنات التالية** ← كل 60 دقيقة
4. **البيانات محفوظة** ← في `data/cache.json`

### سجل المزامنة (Console Output):

```
==================================================
⏰ بدء المزامنة في 2026-06-01 10:00:00 AM
==================================================

جاري الكشط من المتاجر - الحد الأقصى: 100 منتج من كل متجر...

📊 النتائج:
   Takealot:   100 منتج
   PetHeaven:  1174 منتج

🔄 جاري المقارنة والمطابقة...

========================================
✅ النتائج النهائية:
   المطابقات المجدة:  47
   متوسط الدرجة:    0.8732
   أفضل درجة:      0.9842
========================================

✅ تم حفظ الـ cache: 47 مطابقة

✅ اكتملت المزامنة بنجاح
   المطابقات: 47
   الوقت المستغرق: 45.23 ثانية
   المزامنة التالية: 2026-06-01 11:00:00 AM
```

---

## 📂 هيكل الملفات الجديد

```
ScrapeAnalyzeCompareAPI/
├── server.js                    ← محدّث مع endpoints جديدة
├── jobs/
│   └── syncData.js             ← Cron Job للمزامنة الآلية
├── services/
│   ├── cache.js                ← نظام الـ caching
│   ├── match.js
│   └── ...
└── data/
    └── cache.json              ← البيانات المحفوظة (auto-generated)
```

---

## 🎯 الفوائد المتقدمة

### للعميل:
✅ **سرعة عالية** - API تستجيب فوراً  
✅ **موثوقية** - بيانات معاد فحصها كل ساعة  
✅ **مرونة** - filtering و pagination متقدم  
✅ **شفافية** - معلومات المزامنة والأداء  

### للتطبيق:
✅ **قابلية التوسع** - يمكن خدمة آلاف الطلبات  
✅ **استقرار** - لا حمل على الخوادم الخارجية في وقت الطلب  
✅ **قابلية الصيانة** - سهل تتبع المزامنات  

---

## 🚀 الخطوة التالية

**إضافة Excel Export:**
```bash
GET /market/export?format=xlsx
GET /market/deals/export?format=xlsx
```

سيحفظ النتائج تلقائياً في ملف Excel احترافي مع:
- جداول منسقة
- ألوان مميزة
- رسوم بيانية
- قوائم منسدلة للفلاتر

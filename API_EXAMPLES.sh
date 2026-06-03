#!/bin/bash

# 🚀 API Testing Examples - ScrapeAnalyzeCompareAPI
# 
# استخدم هذه الأوامر لاختبار جميع endpoints
# افتح PowerShell وانسخ الأوامر واحد تلو الآخر

echo "════════════════════════════════════════════════════════════"
echo "🐕 ScrapeAnalyzeCompareAPI - API Testing Examples"
echo "════════════════════════════════════════════════════════════"
echo ""

# ==================== HEALTH CHECK ====================
echo "1️⃣  Health Check - فحص صحة السيرفر"
echo "─────────────────────────────────────────────────"
echo "curl http://localhost:3000/health"
echo ""

# ==================== BASIC ENDPOINTS ====================
echo "2️⃣  GET /market - جميع المطابقات (الصفحة الأولى)"
echo "─────────────────────────────────────────────────"
echo "curl http://localhost:3000/market"
echo ""

echo "3️⃣  GET /market/stats - الإحصائيات العامة"
echo "─────────────────────────────────────────────────"
echo "curl http://localhost:3000/market/stats"
echo ""

# ==================== PAGINATION ====================
echo "4️⃣  Pagination Examples - أمثلة الترقيم"
echo "─────────────────────────────────────────────────"
echo ""
echo "الصفحة الأولى (default):"
echo "curl http://localhost:3000/market"
echo ""
echo "الصفحة الثانية بـ 10 نتائج:"
echo "curl \"http://localhost:3000/market?page=2&limit=10\""
echo ""
echo "الصفحة الثالثة بـ 30 نتيجة:"
echo "curl \"http://localhost:3000/market?page=3&limit=30\""
echo ""

# ==================== FILTERING ====================
echo "5️⃣  Filtering Examples - أمثلة التصفية"
echo "─────────────────────────────────────────────────"
echo ""
echo "العروض بتوفير 50+ راند:"
echo "curl \"http://localhost:3000/market?minSavings=50\""
echo ""
echo "العروض بتوفير 50-200 راند:"
echo "curl \"http://localhost:3000/market?minSavings=50&maxSavings=200\""
echo ""
echo "المطابقات بدقة 90%+:"
echo "curl \"http://localhost:3000/market?minScore=0.90\""
echo ""
echo "المطابقات بدقة 85%+:"
echo "curl \"http://localhost:3000/market?minScore=0.85&limit=20\""
echo ""

# ==================== BRAND FILTERING ====================
echo "6️⃣  Brand Filtering - تصفية حسب الماركة"
echo "─────────────────────────────────────────────────"
echo ""
echo "كل منتجات Royal Canin:"
echo "curl \"http://localhost:3000/market?brand=royal+canin\""
echo ""
echo "كل منتجات Montego:"
echo "curl \"http://localhost:3000/market?brand=montego\""
echo ""
echo "كل منتجات Pedigree:"
echo "curl \"http://localhost:3000/market?brand=pedigree\""
echo ""

# ==================== BEST DEALS ====================
echo "7️⃣  Best Deals - أفضل العروض"
echo "─────────────────────────────────────────────────"
echo ""
echo "العروض بتوفير 50+ راند:"
echo "curl \"http://localhost:3000/market/deals?minSavings=50\""
echo ""
echo "العروض بتوفير 100+ راند:"
echo "curl \"http://localhost:3000/market/deals?minSavings=100\""
echo ""
echo "أفضل 5 عروض (مرتبة حسب التوفير):"
echo "curl \"http://localhost:3000/market/deals?minSavings=50&limit=5&sortBy=savings\""
echo ""
echo "أفضل 10 عروض (مرتبة حسب الدقة):"
echo "curl \"http://localhost:3000/market/deals?minSavings=50&limit=10&sortBy=score\""
echo ""

# ==================== ADVANCED FILTERING ====================
echo "8️⃣  Advanced Filtering - تصفية متقدمة"
echo "─────────────────────────────────────────────────"
echo ""
echo "الصفحة 2، 20 نتيجة، توفير 50+، دقة 85%+:"
echo "curl \"http://localhost:3000/market?page=2&limit=20&minSavings=50&minScore=0.85\""
echo ""
echo "الصفحة 1، 15 نتيجة، Royal Canin، توفير 30+:"
echo "curl \"http://localhost:3000/market?page=1&limit=15&brand=royal+canin&minSavings=30\""
echo ""
echo "الصفحة 1، 25 نتيجة، Montego، توفير 20-100:"
echo "curl \"http://localhost:3000/market?page=1&limit=25&brand=montego&minSavings=20&maxSavings=100\""
echo ""

# ==================== MANUAL SYNC ====================
echo "9️⃣  Manual Sync - تحديث يدوي"
echo "─────────────────────────────────────────────────"
echo ""
echo "تحديث البيانات الآن:"
echo "curl http://localhost:3000/market/sync"
echo ""
echo "تحديث البيانات بـ 200 منتج:"
echo "curl \"http://localhost:3000/market/sync?limit=200\""
echo ""

# ==================== NOTES ====================
echo "════════════════════════════════════════════════════════════"
echo "📝 ملاحظات مهمة:"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "✓ استبدل http://localhost:3000 برابط السيرفر الفعلي"
echo "✓ جميع الأرقام بالراند (R)"
echo "✓ جميع الأوزان بالكيلوجرام (kg)"
echo "✓ الدرجات من 0 إلى 1 (0.85 = 85%)"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "💾 PowerShell Equivalents:"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "في PowerShell (Windows)، استخدم:"
echo ""
echo "Invoke-WebRequest http://localhost:3000/health"
echo ""
echo "أو اختصر:"
echo ""
echo "iwr http://localhost:3000/market"
echo ""

echo "════════════════════════════════════════════════════════════"
echo "✨ جميع الأمثلة جاهزة للاستخدام!"
echo "════════════════════════════════════════════════════════════"

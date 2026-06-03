const { extractKeywords, getProductType, extractWeightValue } = require('./services/extractKeywords');
const { normalize } = require('./services/normalize');
const { finalScore } = require('./services/match');

console.log('\n' + '='.repeat(80));
console.log('🧪 اختبار معايير المطابقة الجديدة v3.0');
console.log('='.repeat(80) + '\n');

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// اختبار 1: استخراج الكلمات المفتاحية
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('📋 اختبار 1: استخراج الكلمات المفتاحية\n');

const testNames = [
    "Montego Monty & Me Essential Adult Dog Food 20kg",
    "Montego Karoo All Breed Chicken and Lamb Adult Dog Food",
    "Royal Canin Maxi Adult 15kg Dry Dog Food",
    "Pedigree Wet Dog Food Chicken Rice",
    "Hills Science Diet Prescription Sauce"
];

testNames.forEach((name, idx) => {
    const keywords = extractKeywords(name);
    console.log(`${idx + 1}. "${name}"`);
    console.log(`   ➜ Keywords: ${keywords.length > 0 ? keywords.join(', ') : '(بدون كلمات مفتاحية)'}`);
    console.log();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// اختبار 2: تحديد نوع المنتج
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('\n' + '━'.repeat(80));
console.log('🏷️  اختبار 2: تحديد نوع المنتج\n');

const typeTests = [
    "Royal Canin Dry Dog Food",
    "Pedigree Wet Dog Food",
    "Hills Science Sauce",
    "Montego Canned Adult Dog",
    "Purina Kibble Complete"
];

typeTests.forEach((name, idx) => {
    const type = getProductType(name);
    const typeEmoji = type === 'dry' ? '🟩' : type === 'wet' ? '🟦' : '🟨';
    console.log(`${idx + 1}. "${name}"`);
    console.log(`   ➜ Type: ${typeEmoji} ${type}`);
    console.log();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// اختبار 3: استخراج الأوزان
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('━'.repeat(80));
console.log('⚖️  اختبار 3: استخراج الأوزان\n');

const weightTests = [
    "Royal Canin Maxi 15kg",
    "Pedigree Adult 500g",
    "Hills Science 33 lb",
    "Montego Dog 16 oz",
    "Purina Complete (no weight)"
];

weightTests.forEach((name, idx) => {
    const weight = extractWeightValue(name);
    console.log(`${idx + 1}. "${name}"`);
    console.log(`   ➜ Weight: ${weight !== null ? weight.toFixed(2) + ' kg' : '(غير معروف)'}`);
    console.log();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// اختبار 4: مقارنة منتجين
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('━'.repeat(80));
console.log('🔍 اختبار 4: مقارنة منتجين\n');

const comparisons = [
    {
        name: "✅ مطابقة صحيحة",
        a: "Royal Canin Maxi Adult 15kg",
        b: "Royal Canin Maxi Adult 15kg",
        shouldMatch: true
    },
    {
        name: "❌ نوع مختلف",
        a: "Royal Canin Maxi Dry 15kg",
        b: "Royal Canin Maxi Wet 15kg",
        shouldMatch: false
    },
    {
        name: "❌ وزن مختلف",
        a: "Royal Canin Maxi 15kg",
        b: "Royal Canin Maxi 500g",
        shouldMatch: false
    },
    {
        name: "❌ خط إنتاج مختلف",
        a: "Montego Monty & Me 20kg",
        b: "Montego Karoo 20kg",
        shouldMatch: false
    }
];

comparisons.forEach((test, idx) => {
    console.log(`${idx + 1}. ${test.name}`);
    console.log(`   Takealot: "${test.a}"`);
    console.log(`   PetHeaven: "${test.b}"`);
    
    const keywordsA = extractKeywords(test.a);
    const keywordsB = extractKeywords(test.b);
    const typeA = getProductType(test.a);
    const typeB = getProductType(test.b);
    const weightA = extractWeightValue(test.a);
    const weightB = extractWeightValue(test.b);
    
    const commonKeywords = keywordsA.filter(k => keywordsB.includes(k));
    const typeMatch = typeA === typeB;
    const weightMatch = !weightA || !weightB || Math.abs(weightA - weightB) <= 2;
    
    console.log(`   Keywords: ${keywordsA.join(', ')} vs ${keywordsB.join(', ')}`);
    console.log(`   Common: [${commonKeywords.join(', ') || 'بدون'}]`);
    console.log(`   Type Match: ${typeMatch ? '✅' : '❌'}`);
    console.log(`   Weight Match: ${weightMatch ? '✅' : '❌'}`);
    
    const canMatch = commonKeywords.length > 0 && typeMatch && weightMatch;
    console.log(`   النتيجة: ${canMatch ? '✅ قد تطابق' : '❌ لا تطابق'}`);
    console.log();
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ملخص النتائج
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

console.log('━'.repeat(80));
console.log('\n✅ النتائج المتوقعة:\n');
console.log('✓ الكلمات المفتاحية: تُستخرج بدقة');
console.log('✓ نوع المنتج: يتم التمييز بين Dry و Wet و Sauce');
console.log('✓ الأوزان: تُحول للكغ تلقائياً');
console.log('✓ المقارنة: معايير صارمة جداً');
console.log('✓ النتيجة: مطابقات دقيقة وموثوقة فقط');

console.log('\n' + '='.repeat(80) + '\n');

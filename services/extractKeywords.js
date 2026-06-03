function extractKeywords(name = "") {

    const stopWords = [
        "and",
        "or",
        "the",
        "a",
        "an",
        "for",
        "with",
        "in",
        "of",
        "by",
        "to",
        "from"
    ];

    return name
        .toLowerCase()
        .replace(/[\(\)\[\]\{\}\/]/g, ' ')
        .replace(/[^a-z0-9\s\-]/g, '')
        .split(/\s+/)
        .filter(
            word =>
                word.length > 2 &&
                !stopWords.includes(word)
        );

}

function getProductType(name = "") {

    const lower = name.toLowerCase();

    if (
        lower.includes('sauce') ||
        lower.includes('gravy')
    ) {
        return 'sauce';
    }

    if (
        lower.includes('wet') ||
        lower.includes('canned') ||
        lower.includes('tin') ||
        lower.includes('chunks')
    ) {
        return 'wet';
    }

    return 'dry';

}

function extractWeightValue(name = "") {

    if (!name) return null;

    const lower = name.toLowerCase();

    const kgMatch =
        lower.match(
            /(\d+(?:\.\d+)?)\s*(?:kg|k)\b/
        );

    if (kgMatch) {
        return parseFloat(
            parseFloat(kgMatch[1]).toFixed(2)
        );
    }

    const gMatch =
        lower.match(
            /(\d+(?:\.\d+)?)\s*g(?!\s*day)\b/
        );

    if (gMatch) {
        return parseFloat(
            (
                parseFloat(gMatch[1]) / 1000
            ).toFixed(2)
        );
    }

    return null;

}

module.exports = {
    extractKeywords,
    getProductType,
    extractWeightValue
};
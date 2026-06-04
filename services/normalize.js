function normalize(name = "") {
    if (!name) return "";

    return name
        .toLowerCase()
        // 1. Standardize weight and volume units by removing spaces (e.g., "2 kg" becomes "2kg", "500 ml" becomes "500ml") to ensure consistent keyword extraction and matching regardless of formatting differences
        .replace(/(\d+(?:\.\d+)?)\s*kg\b/g, '$1kg')
        .replace(/(\d+)\s*g\b/g, '$1g')
        .replace(/(\d+)\s*ml\b/g, '$1ml')
        .replace(/(\d+(?:\.\d+)?)\s*l\b/g, '$1l')

        // 2. Remove common separators and replace them with spaces to unify the text (this helps in keyword extraction and matching by preventing issues caused by different formatting styles, such as "Royal Canin - Medium Adult" vs "Royal Canin Medium Adult")
        .replace(/[\(\)\[\]\{\}\/\\_\,\+\-\:\•]/g, ' ')
        
        // 3. Remove any special characters and keep only letters and numbers
        .replace(/[^a-z0-9\s]/g, '')

        // 4. Merge extra spaces resulting from cleaning
        .replace(/\s+/g, ' ')
        .trim();
}

module.exports = { normalize };
function parsePrice(text = "") {
    if (!text) return null;
    
    // clean the text by removing currency symbols and non-numeric characters except for dots and commas
    let cleaned = text.trim().replace(/[^\d.,]/g, '');
    
    // handle different formats: if it contains both comma and dot, determine which is the decimal separator
    if (cleaned.includes(',') && cleaned.includes('.')) {
        if (cleaned.indexOf(',') < cleaned.indexOf('.')) {
            cleaned = cleaned.replace(/,/g, ''); // remove commas if they are thousand separators
        }
    } else if (cleaned.includes(',')) {
        // if it contains a comma but no dot (e.g., South African R1295,00)
        const parts = cleaned.split(',');
        if (parts[1].length === 2) {
            cleaned = parts[0] + '.' + parts[1]; // convert to decimal
        } else {
            cleaned = cleaned.replace(/,/g, ''); // if not decimal, it's thousands
        }
    }
    
    const price = parseFloat(cleaned);
    return isNaN(price) ? null : parseFloat(price.toFixed(2));
}

function getBestDeal(priceA, priceB, sourceA = "Unknown", sourceB = "Unknown") {
    if (!priceA || !priceB) return null;
    
    // round the values to the nearest two decimal places before mathematical comparison
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
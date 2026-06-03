function analyze(products) {

    const result = {};

    for (const p of products) {

        const key = p.name.split(" ")[0];

        if (!result[key]) {
            result[key] = 0;
        }

        result[key]++;
    }

    return result;
}

module.exports = { analyze };
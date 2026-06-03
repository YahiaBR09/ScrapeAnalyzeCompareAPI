function normalize(name = "") {

    return name
        .toLowerCase()
        .replace(/[\(\)\[\]\{\}\/]/g, ' ')
        .replace(/[^a-z0-9\s\-]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

}

module.exports = { normalize };
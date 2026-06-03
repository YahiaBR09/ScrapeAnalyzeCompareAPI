function compare(takealot, petheaven) {

    const matches = [];

    for (const a of takealot) {
        for (const b of petheaven) {

            if (a.name === b.name || a.name.includes(b.name.split(" ")[0])) {

                matches.push({
                    product: a.name,
                    takealot: a,
                    petheaven: b,
                    best: "unknown (no price yet)"
                });
            }
        }
    }

    return matches;
}

module.exports = { compare };
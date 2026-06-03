const ExcelJS = require('exceljs');

async function exportMatchesToExcel(results, stats = {}) {

    const workbook = new ExcelJS.Workbook();

    results.sort(
        (a, b) => b.best_deal.savings - a.best_deal.savings
    );

    // =========================
    // Dashboard
    // =========================

    const dashboard = workbook.addWorksheet('Dashboard');

    dashboard.columns = [
        { width: 30 },
        { width: 20 }
    ];

    const totalSavings = results.reduce(
        (sum, r) => sum + (r.best_deal?.savings || 0),
        0
    );

    dashboard.addRow(['Metric', 'Value']);
    dashboard.addRow(['Total Matches', stats.matches_found || results.length]);
    dashboard.addRow(['Average Score', stats.average_score || 0]);
    dashboard.addRow(['Best Match Score', stats.best_match_score || 0]);
    dashboard.addRow(['Total Savings', totalSavings]);

    dashboard.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFF' }
    };

    dashboard.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '2F5597' }
    };

    // =========================
    // Main Sheet
    // =========================

    const worksheet = workbook.addWorksheet('Market Matches');

    worksheet.columns = [
        { header: 'Takealot Product', key: 'takealot', width: 50 },
        { header: 'PetHeaven Product', key: 'petheaven', width: 50 },
        { header: 'Takealot Price', key: 'takealotPrice', width: 15 },
        { header: 'PetHeaven Price', key: 'petheavenPrice', width: 15 },
        { header: 'Savings', key: 'savings', width: 15 },
        { header: 'Match Score', key: 'score', width: 15 }
    ];

    worksheet.getRow(1).font = {
        bold: true,
        color: { argb: 'FFFFFF' }
    };

    worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: '4472C4' }
    };

    results.forEach(item => {

        worksheet.addRow({
            takealot: item.takealot.name,
            petheaven: item.petheaven.name,
            takealotPrice: item.takealot.price,
            petheavenPrice: item.petheaven.price,
            savings: item.best_deal.savings,
            score: Number(item.match_score.toFixed(4))
        });

    });

    worksheet.autoFilter = {
        from: 'A1',
        to: 'F1'
    };

    worksheet.views = [
        {
            state: 'frozen',
            ySplit: 1
        }
    ];

    worksheet.eachRow((row, rowNumber) => {

        if (rowNumber === 1) return;

        const savingsCell = row.getCell(5);
        const scoreCell = row.getCell(6);

        const savings = Number(savingsCell.value);
        const score = Number(scoreCell.value);

        // Savings colors

        if (savings >= 50) {

            savingsCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'C6EFCE' }
            };

        } else if (savings >= 20) {

            savingsCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEB9C' }
            };

        } else {

            savingsCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC7CE' }
            };

        }

        // Score colors

        if (score >= 0.95) {

            scoreCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'C6EFCE' }
            };

        } else if (score >= 0.90) {

            scoreCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFEB9C' }
            };

        } else {

            scoreCell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFC7CE' }
            };

        }

    });

    // =========================
    // Top Deals
    // =========================

    const dealsSheet = workbook.addWorksheet('Top Deals');

    dealsSheet.columns = worksheet.columns;

    const topDeals = results.filter(
        r => r.best_deal.savings >= 50
    );

    topDeals.forEach(item => {

        dealsSheet.addRow({
            takealot: item.takealot.name,
            petheaven: item.petheaven.name,
            takealotPrice: item.takealot.price,
            petheavenPrice: item.petheaven.price,
            savings: item.best_deal.savings,
            score: Number(item.match_score.toFixed(4))
        });

    });

    return workbook;
}

module.exports = {
    exportMatchesToExcel
};
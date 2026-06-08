const { once } = require('events');

async function streamCSV(kind, res, fallbackStore) {
    let headers = null;
    let wroteRows = false;
    let batch = '';
    let batchSize = 0;
    await fallbackStore.forEachExportRow(kind, async row => {
        const safeRow = row || { status: 'empty' };
        if (!headers) {
            headers = Object.keys(safeRow);
            batch += headers.join(',') + '\n';
        }
        wroteRows = true;
        batch += headers.map(header => escapeCSVCell(safeRow[header])).join(',') + '\n';
        batchSize += 1;
        if (batchSize >= 50) {
            await writeBatch(res, batch);
            batch = '';
            batchSize = 0;
        }
    });
    if (!wroteRows) {
        batch += 'status\nempty\n';
    }
    if (batch) {
        await writeBatch(res, batch);
    }
    res.end();
}

async function writeBatch(res, chunk) {
    if (!res.write(chunk)) {
        await once(res, 'drain');
    }
}

function escapeCSVCell(value) {
    const text = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
}

module.exports = {
    streamCSV
};

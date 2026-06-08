const fs = require('fs');
const path = require('path');
const dataSecurity = require('./dataSecurity');

const fsp = fs.promises;

async function loadEvents(filePath, onEvent) {
    try {
        const raw = await fsp.readFile(filePath, 'utf8');
        const lines = raw.split('\n').filter(Boolean);
        for (const line of lines) {
            try {
                await onEvent(JSON.parse(dataSecurity.decryptText(line)));
            } catch (error) {
                console.error('Encrypted event skipped:', error.message);
            }
        }
        return true;
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('Encrypted event log read error:', error);
        return false;
    }
}

async function appendEvent(filePath, event) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.appendFile(filePath, dataSecurity.encryptText(JSON.stringify(event)) + '\n', { mode: 0o600 });
    await fsp.chmod(filePath, 0o600).catch(() => {});
}

async function readSnapshot(filePath) {
    try {
        return JSON.parse(dataSecurity.decryptText(await fsp.readFile(filePath, 'utf8')));
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('Encrypted snapshot read error:', error.message);
        return null;
    }
}

async function writeSnapshot(filePath, state) {
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    await fsp.writeFile(filePath, dataSecurity.encryptText(JSON.stringify(state)), { mode: 0o600 });
    await fsp.chmod(filePath, 0o600).catch(() => {});
}

async function compactLogWithSnapshot(logPath, snapshotPath, state, maxBytes) {
    try {
        const stat = await fsp.stat(logPath);
        if (stat.size <= maxBytes) return;
        await writeSnapshot(snapshotPath, state);
        const emptyLogPath = logPath + '.empty';
        await fsp.writeFile(emptyLogPath, '', { mode: 0o600 });
        await fsp.rename(emptyLogPath, logPath);
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('Encrypted event log compact error:', error);
    }
}

async function appendBoundedEvent(filePath, event, options) {
    const state = options.state;
    state.count += 1;
    if (state.count % options.trimEvery === 0) {
        await trimLog(filePath, options.maxBytes, options.maxLines);
        state.count = 0;
    }
    await appendEvent(filePath, event);
}

async function trimLog(filePath, maxBytes, maxLines) {
    try {
        const stat = await fsp.stat(filePath);
        if (stat.size <= maxBytes) return;
        await fsp.rename(filePath, filePath + '.1').catch(() => {});
        await fsp.writeFile(filePath, '', { mode: 0o600 });
    } catch (error) {
        if (error.code !== 'ENOENT') console.error('Encrypted event log trim error:', error);
    }
}

module.exports = {
    loadEvents,
    appendEvent,
    appendBoundedEvent,
    readSnapshot,
    compactLogWithSnapshot
};

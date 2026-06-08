const fs = require('fs');
const path = require('path');

const SKIP = new Set(['node_modules', '.git', 'coverage', 'test-results']);

function listJavaScriptFiles(dir) {
    const result = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (SKIP.has(entry.name)) continue;
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            result.push(...listJavaScriptFiles(fullPath));
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            result.push(fullPath);
        }
    }
    return result;
}

module.exports = {
    listJavaScriptFiles
};

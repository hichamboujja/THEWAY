#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');
const { listJavaScriptFiles } = require('./script-utils');

let failed = false;
for (const file of listJavaScriptFiles(path.resolve(__dirname, '..'))) {
    const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit' });
    if (result.status !== 0) failed = true;
}

if (failed) process.exit(1);
console.log('JavaScript syntax check passed.');

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const required = [
    'API/app.js',
    'API/server.js',
    'database/migrations/002_production_core.sql',
    'view/public/index.html',
    'view/authentification/login.html',
    'view/pannel/dashboard.html'
];

const missing = required.filter(file => !fs.existsSync(path.join(root, file)));
if (missing.length) {
    console.error('Missing required production files:', missing.join(', '));
    process.exit(1);
}

console.log('Static production file check passed.');

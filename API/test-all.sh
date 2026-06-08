#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

echo "Running THEWAY production checks"
node scripts/migrate.js
node scripts/seed.js
node scripts/lint.js
node scripts/check-static.js
./node_modules/.bin/jest --runInBand

echo "All THEWAY checks passed"

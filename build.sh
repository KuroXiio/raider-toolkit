#!/usr/bin/env bash
# Rebuilds the whole site from the latest community data set.
# Usage: ./build.sh            (downloads the data set into ./data-src the first time)
set -euo pipefail
cd "$(dirname "$0")"
REPO=$(python3 -c "import json;print(json.load(open('site.json'))['dataRepo'])")
if [ -d data-src/.git ]; then git -C data-src pull --ff-only; else git clone --depth 1 "$REPO" data-src; fi
export OUT=build; rm -rf build; mkdir -p build
python3 scripts/metaforge.py
python3 scripts/build_data.py data-src
python3 scripts/images.py data-src
python3 scripts/assemble.py data-src
python3 scripts/bot_data.py
node --check build/check.js
echo "Done: open build/site/index.html"

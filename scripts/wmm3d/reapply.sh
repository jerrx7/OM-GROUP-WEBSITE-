#!/bin/bash
# rebuilds the figures on the WMM page from the original-widgets backup + the current exports. usage: bash scripts/wmm3d/reapply.sh <backup index.html>
cd "$(dirname "$0")/../.."
B="${1:?path to the backup of applications/wet-mix-macadam/index.html from before the swap}"
P=applications/wet-mix-macadam/index.html
cp "$B" "$P" && node scripts/wmm3d/apply-page.js \
 && sed -i '67a <link rel="stylesheet" href="/assets/application-wmx.css" />' "$P" \
 && sed -i 's#^<script src="/assets/application-wipe.js" defer></script>#&\n<script src="/assets/application-wmx.js" defer></script>#' "$P" \
 && grep -c 'application-wmx' "$P"

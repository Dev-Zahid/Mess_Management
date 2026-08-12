#!/usr/bin/env node
// Regenerates public/app-shell.html from the source-of-truth files.
// Run this any time source/index.html or source/stylesheet.html change.
//
// Usage: node scripts/build-app-shell.js

const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '..', 'source');
const OUT_PATH = path.join(__dirname, '..', 'public', 'app-shell.html');

const indexHtml = fs.readFileSync(path.join(SRC_DIR, 'index.html'), 'utf8');
const stylesheet = fs.readFileSync(path.join(SRC_DIR, 'stylesheet.html'), 'utf8');

let merged = indexHtml.replace('<?!= include("Stylesheet"); ?>', stylesheet);

// Inject: gs-shim.js (google.script.run -> fetch('/api/rpc') bridge) and
// billing-banner.js (trial/subscription + announcement banner) right
// before the app's own main inline <script> block.
const injectTag = '<script src="/gs-shim.js"></script>\n<script src="/billing-banner.js"></script>\n<script>';
merged = merged.replace('<script>', injectTag, 1);

fs.writeFileSync(OUT_PATH, merged, 'utf8');
console.log(`Built ${OUT_PATH} (${merged.length} chars)`);

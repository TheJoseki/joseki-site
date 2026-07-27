// Renders og-card.html to public/og.png at exactly 1200x630, and the mark to
// public/apple-touch-icon.png at 180x180.
//
// Both are HTML/SVG rendered rather than drawn by hand, so neither can drift
// from the site: they share the tokens, the type stack and the same mark file.
// Re-run after any change to those.
//
//   npm run og

import { chromium } from 'playwright';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(HERE, '..', 'public');

const browser = await chromium.launch();

// deviceScaleFactor 2 renders at 2400x1260 internally, then the clip brings it
// back to 1200x630 — crisp on high-DPI previews without shipping a file twice
// the size social scrapers need.
const card = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await card.goto(pathToFileURL(join(HERE, 'og-card.html')).href, { waitUntil: 'networkidle' });
await card.screenshot({ path: join(PUBLIC, 'og.png'), clip: { x: 0, y: 0, width: 1200, height: 630 } });

// iOS ignores SVG favicons for the home screen, so the mark also ships as a
// PNG at the size Apple asks for. Rendered from the same SVG, so it cannot
// disagree with the tab icon.
const icon = await browser.newPage({ viewport: { width: 180, height: 180 } });
await icon.goto(pathToFileURL(join(PUBLIC, 'favicon.svg')).href);
await icon.screenshot({ path: join(PUBLIC, 'apple-touch-icon.png') });

await browser.close();
console.log('wrote public/og.png (1200x630) and public/apple-touch-icon.png (180x180)');

// Verification for the Joseki site: build output, layout, contrast, keyboard.
//
//   npm run verify        against the compiled output
//   npm run verify:live   against thejoseki.com
//
// Two halves. The first reads what the build produced, because Astro can
// silently add things a static page should not have. The second drives a real
// browser, because the numbers that matter — contrast against whatever
// ancestor actually paints, whether anything overflows — are computed ones. A
// ratio written in a comment is a claim; the rendered ratio is the fact.

import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { dirname, join, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const OUT = join(ROOT, 'dist');
const SHOTS = join(HERE, 'shots');
mkdirSync(SHOTS, { recursive: true });

const LIVE = process.argv[2] === 'live';

// The output is served over HTTP, not opened as a file. Astro emits absolute
// asset paths — correct for a web server, and over file:// they resolve to the
// drive root, so the stylesheet 404s and every measurement is taken against an
// unstyled page. The first run of this harness reported a confident 21.00:1 on
// text that was simply black on white, which is exactly the kind of green that
// is worse than a failure.
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

let server;
let origin = 'https://thejoseki.com';

if (!LIVE) {
  server = createServer((req, res) => {
    const path = decodeURIComponent(req.url.split('?')[0]);
    const file = join(OUT, path === '/' ? 'index.html' : path);
    try {
      const body = readFileSync(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end('not found');
    }
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  origin = `http://127.0.0.1:${server.address().port}`;
}

const TARGET = `${origin}/`;

let failed = 0;
const t = (ok, msg) => { if (!ok) failed++; console.log((ok ? 'PASS' : 'FAIL').padEnd(5), msg); };

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// ── What the build produced ───────────────────────────────────────────────
if (!LIVE) {
  console.log('--- build output ' + '-'.repeat(42));
  const files = walk(OUT).map((p) => relative(OUT, p).split('\\').join('/'));
  const html = readFileSync(join(OUT, 'index.html'), 'utf8');

  // Astro ships a client runtime the moment something becomes an island. This
  // page is inert HTML and must stay that way; a stray .js means a component
  // acquired a client: directive, which is worth knowing before it deploys.
  const js = files.filter((f) => f.endsWith('.js'));
  t(js.length === 0, `no client JavaScript emitted${js.length ? `: ${js.join(', ')}` : ''}`);

  // `style-src 'self'` refuses inline styles, so inlineStylesheets:'never'
  // must be holding. If a build starts inlining, the page renders unstyled in
  // production and perfectly on disk — the worst kind of difference.
  t(!/<style[\s>]/.test(html), 'no inline <style> — CSP style-src stays satisfiable');
  const sheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]);
  t(sheets.length > 0, `stylesheet linked as a file (${sheets.length})`);

  t(files.includes('_headers'), '_headers copied into the output');
  t(files.includes('favicon.svg'), 'favicon copied into the output');

  // The accent is defined once, on purpose: sharing Clawform's orange is a
  // reversible decision only while there is a single place to reverse it.
  // SVG assets are exempt — a file loaded via <img> cannot read a CSS
  // custom property, so the mark has to carry the literal.
  const sources = walk(join(ROOT, 'src'))
    .concat(walk(join(ROOT, 'public')))
    .filter((p) => /\.(css|astro|ts|js)$/.test(p));
  const strays = sources.filter((p) => {
    const text = readFileSync(p, 'utf8');
    const isTokenFile = p.endsWith(join('styles', 'tokens.css'));
    return /#FF9900/i.test(text) && !isTokenFile;
  }).map((p) => relative(ROOT, p));
  t(strays.length === 0, `the accent literal appears only in tokens.css${strays.length ? ` — also in ${strays.join(', ')}` : ''}`);
}

// ── Rendered behaviour ────────────────────────────────────────────────────
const VIEWPORTS = [
  { w: 375, h: 812, name: 'phone' },
  { w: 768, h: 1024, name: 'tablet' },
  { w: 1280, h: 900, name: 'laptop' },
  { w: 1440, h: 900, name: 'desktop' },
];

// Cloudflare injects a Web Analytics beacon into the served HTML. Expected on
// the deployed site, absent locally; allowlisted by host so that anything else
// third-party still fails.
const EXPECTED_THIRD_PARTY = /cloudflareinsights\.com/;

const browser = await chromium.launch();

for (const { w, h, name } of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const badResponses = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !EXPECTED_THIRD_PARTY.test(m.text())) consoleErrors.push(m.text());
  });
  page.on('requestfailed', (r) => {
    if (!EXPECTED_THIRD_PARTY.test(r.url())) badResponses.push(`${r.url()} — ${r.failure()?.errorText}`);
  });
  page.on('response', (r) => {
    if (r.status() >= 400 && !EXPECTED_THIRD_PARTY.test(r.url())) badResponses.push(`${r.url()} — HTTP ${r.status()}`);
  });

  await page.goto(TARGET, { waitUntil: 'networkidle' });
  console.log(`\n--- ${name} ${w}x${h} ${'-'.repeat(38)}`);

  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth);
  t(overflow <= 0, `no horizontal page scroll (${overflow}px over)`);

  const wide = await page.evaluate((vw) => [...document.querySelectorAll('body *')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.right > vw + 1
        && !el.closest('pre') && getComputedStyle(el).position !== 'absolute';
    })
    .slice(0, 5)
    .map((el) => `${el.tagName.toLowerCase()}.${el.className || '-'}`), w);
  t(wide.length === 0, `nothing exceeds the viewport${wide.length ? `: ${wide.join(', ')}` : ''}`);

  t(consoleErrors.length === 0, `console clean${consoleErrors.length ? `: ${consoleErrors[0]}` : ''}`);
  t(badResponses.length === 0, `every request succeeded${badResponses.length ? `: ${badResponses[0]}` : ''}`);

  await page.screenshot({ path: join(SHOTS, `${name}-${w}.png`), fullPage: true });
  await ctx.close();
}

// ── Contrast, measured on computed styles ─────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(TARGET, { waitUntil: 'networkidle' });
  console.log(`\n--- contrast ${'-'.repeat(46)}`);

  const results = await page.evaluate(() => {
    const nums = (s) => (s.match(/[\d.]+/g) ?? []).map(Number);
    const parse = (s) => nums(s).slice(0, 3);
    // Alpha is read as a number, never sniffed from the string. Matching a
    // trailing ", 0)" looks equivalent and is not: the accent is
    // rgb(255, 153, 0) — blue channel zero — so the walk would skip every
    // accent surface and compare dark text against the dark page behind it.
    // That bug shipped once and reported a perfect 1.00:1.
    const isTransparent = (s) => { const n = nums(s); return n.length > 3 && n[3] === 0; };
    const bgOf = (el) => {
      for (let n = el; n; n = n.parentElement) {
        const c = getComputedStyle(n).backgroundColor;
        if (parse(c).length === 3 && !isTransparent(c)) return parse(c);
      }
      return [0, 0, 0];
    };
    const lum = (rgb) => {
      const [r, g, b] = rgb.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

    const seen = new Set();
    const out = [];
    for (const el of document.querySelectorAll('h1, h2, h3, p, a, li, span')) {
      const text = el.textContent.trim();
      // Leaf text nodes only, so a wrapper is not measured with its child's
      // colour.
      if (!text || [...el.children].some((c) => c.textContent.trim())) continue;
      const cs = getComputedStyle(el);
      const key = `${cs.color}|${bgOf(el).join()}|${cs.fontSize}|${cs.fontWeight}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const size = parseFloat(cs.fontSize);
      const bold = parseInt(cs.fontWeight, 10) >= 700;
      const need = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
      out.push({
        label: `${el.tagName.toLowerCase()}.${(el.className || '-').split(' ')[0]}`,
        sample: text.slice(0, 22),
        r: ratio(parse(cs.color), bgOf(el)),
        need,
        size: Math.round(size),
      });
    }
    return out;
  });

  for (const s of results) {
    t(s.r >= s.need, `${s.label.padEnd(18)} ${s.r.toFixed(2)}:1 (needs ${s.need}, ${s.size}px) "${s.sample}"`);
  }

  // White on the accent is 2.14:1. An accent fill carries a dark label,
  // always — checked on what rendered, so an override anywhere still trips it.
  const lightOnAccent = await page.evaluate(() => {
    const parse = (s) => (s.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
    const isAccent = (c) => { const [r, g, b] = parse(c); return r > 230 && g > 130 && g < 175 && b < 40; };
    return [...document.querySelectorAll('body *')]
      .filter((el) => isAccent(getComputedStyle(el).backgroundColor) && el.textContent.trim())
      .filter((el) => { const [r, g, b] = parse(getComputedStyle(el).color); return r > 160 && g > 160 && b > 160; })
      .map((el) => `${el.tagName.toLowerCase()}.${el.className || '-'}`);
  });
  t(lightOnAccent.length === 0, `no light text on an accent fill${lightOnAccent.length ? `: ${lightOnAccent[0]}` : ''}`);
  await ctx.close();
}

// ── Keyboard and motion ───────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(TARGET, { waitUntil: 'networkidle' });
  console.log(`\n--- keyboard ${'-'.repeat(46)}`);

  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => {
    const cs = getComputedStyle(document.activeElement);
    return { text: document.activeElement.textContent.trim().slice(0, 24), width: cs.outlineWidth, style: cs.outlineStyle };
  });
  t(first.text.toLowerCase().includes('skip'), `first Tab reaches the skip link (got "${first.text}")`);

  const ring = await page.evaluate(() => {
    const stops = [...document.querySelectorAll('a[href], button, [tabindex]:not([tabindex="-1"])')];
    const bad = [];
    for (const el of stops) {
      el.focus();
      const cs = getComputedStyle(el);
      if (!(parseFloat(cs.outlineWidth) >= 2 && cs.outlineStyle !== 'none')) {
        bad.push(`${el.tagName.toLowerCase()}.${el.className || '-'}`);
      }
    }
    return { total: stops.length, bad };
  });
  t(ring.total > 0 && ring.bad.length === 0,
    `${ring.total} tab stops all show a focus ring${ring.bad.length ? `: ${ring.bad.slice(0, 3).join(', ')}` : ''}`);
  await ctx.close();
}

{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  await page.goto(TARGET, { waitUntil: 'networkidle' });
  const scroll = await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior);
  t(scroll === 'auto', `reduced motion disables smooth scrolling (got "${scroll}")`);
  await ctx.close();
}

await browser.close();
server?.close();
console.log(failed === 0 ? '\nAll checks passed.' : `\n${failed} check(s) failed.`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
/**
 * Lokale Lighthouse-run (mobiel) op dist/, zonder de Windows-tmp-bug van `lhci autorun`.
 *   npm run build && node scripts/lighthouse-local.mjs
 * In CI (Linux) gebruiken we gewoon `lhci autorun` met lighthouserc.cjs.
 */
import http from 'node:http';
import { readFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import lighthouse from 'lighthouse';
import * as chromeLauncher from 'chrome-launcher';

const DIST = fileURLToPath(new URL('../dist/', import.meta.url));
const PAGES = ['/', '/nfc-kaartenset', '/nfc-totem', '/live-reviewteller', '/reviewteller/airbnb', '/pre-ordervoorwaarden', '/aanvragen', '/voor/horeca', '/voor/hospitality', '/actievoorwaarden'];
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json', '.txt': 'text/plain', '.xml': 'application/xml', '.avif': 'image/avif', '.webp': 'image/webp' };

const server = http.createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname).replace(/^\/+/, '');
  const candidates = p === '' ? ['index.html'] : [p, `${p}.html`, join(p, 'index.html')];
  const file = candidates.map((c) => join(DIST, c)).find((f) => existsSync(f) && statSync(f).isFile());
  if (!file) {
    res.writeHead(404, { 'Content-Type': 'text/html' });
    return res.end(readFileSync(join(DIST, '404.html')));
  }
  res.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'max-age=600' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

const userDataDir = join(tmpdir(), 'rp-lighthouse-profile');
mkdirSync(userDataDir, { recursive: true });
const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new'], userDataDir });
const cats = ['performance', 'accessibility', 'best-practices', 'seo'];
let failed = false;
const rows = [];
for (const page of PAGES) {
  const result = await lighthouse(`http://localhost:${port}${page}`, { port: chrome.port, output: 'json', logLevel: 'error', onlyCategories: cats });
  const lhr = result.lhr;
  const scores = cats.map((c) => Math.round((lhr.categories[c].score ?? 0) * 100));
  const lcp = lhr.audits['largest-contentful-paint'].numericValue;
  const cls = lhr.audits['cumulative-layout-shift'].numericValue;
  if (scores.some((s) => s < 95) || lcp > 2000 || cls > 0.05) failed = true;
  rows.push({ page, perf: scores[0], a11y: scores[1], bp: scores[2], seo: scores[3], lcp: `${(lcp / 1000).toFixed(2)}s`, cls: cls.toFixed(3) });
  for (const c of cats) {
    for (const ref of lhr.categories[c].auditRefs) {
      const a = lhr.audits[ref.id];
      if (ref.weight > 0 && a.score !== null && a.score < 0.9) console.log(`  [${page}] ${c}: ${a.id} (${a.score}) ${a.displayValue ?? ''}`);
    }
  }
}
console.table(rows);
try {
  chrome.kill();
} catch {
  /* Windows kan het profiel niet altijd opruimen; niet erg */
}
server.close();
process.exitCode = failed ? 1 : 0;

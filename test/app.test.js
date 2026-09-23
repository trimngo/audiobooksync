const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('application shell includes required mobile and accessible metadata', () => {
  const html = fs.readFileSync('index.html', 'utf8');
  assert.match(html, /viewport-fit=cover/);
  assert.match(html, /rel="manifest"/);
  assert.match(html, /aria-label="Audio position"/);
  assert.match(html, /id="pdfInput"/);
  assert.match(html, /id="audioInput"/);
});

test('web manifest launches in standalone mode', () => {
  const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#112b29');
});

test('service worker caches the application shell', () => {
  const worker = fs.readFileSync('service-worker.js', 'utf8');
  for (const asset of ['index.html', 'styles.css', 'app.js', 'manifest.webmanifest']) assert.match(worker, new RegExp(asset));
});

test('package scripts do not download browser tooling at runtime', () => {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(packageJson.scripts['visual-check'], 'node scripts/visual-check.js');
  assert.doesNotMatch(packageJson.scripts['visual-check'], /npx|playwright|puppeteer/);
});

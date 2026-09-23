const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const port = 4173;
const origin = `http://127.0.0.1:${port}`;
const server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], {
  stdio: 'ignore'
});

const stop = () => {
  if (!server.killed) server.kill('SIGTERM');
};

process.on('exit', stop);
process.on('SIGINT', () => { stop(); process.exit(130); });

async function fetchWithRetry(path) {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      const response = await fetch(`${origin}/${path}`);
      if (response.ok) return response;
      lastError = new Error(`${path} returned HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw lastError;
}

async function run() {
  const [page, stylesheet, manifest] = await Promise.all([
    fetchWithRetry('index.html'),
    fetchWithRetry('styles.css'),
    fetchWithRetry('manifest.webmanifest')
  ]);
  const html = await page.text();
  const css = await stylesheet.text();
  const webManifest = await manifest.json();

  assert.match(html, /class="workspace"/);
  assert.match(html, /viewport-fit=cover/);
  assert.match(css, /@media \(max-width:800px\)/);
  assert.match(css, /@media \(max-width:480px\)/);
  assert.equal(webManifest.display, 'standalone');
  console.log(`Visual smoke check passed at ${origin}`);
  console.log('Verified the app shell, iPhone/iPad breakpoints, and standalone manifest.');
}

run()
  .then(() => { stop(); })
  .catch((error) => {
    stop();
    console.error(error);
    process.exitCode = 1;
  });

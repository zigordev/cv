import { spawn } from 'node:child_process';
import { mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Renders the print document to a static PDF per locale, at build time.
 *
 * "Download PDF" used to call `window.print()`, which opens a dialog rather
 * than downloading anything — the visitor still had to pick "Save as PDF"
 * themselves. Generating the file during the build instead means the button is
 * a plain download link, and the PDF is byte-identical for every visitor.
 *
 * Chromium is a *build* dependency only. It renders the same `@media print`
 * document the browser would, so the output keeps real selectable text: the
 * point of the whole ATS-friendly layout. Rasterising the page to an image —
 * which is what the popular client-side html-to-PDF libraries do — would
 * destroy that, so it is deliberately not the approach here.
 *
 * Missing Chromium is a warning, not an error, so a laptop or a CI job without
 * one can still run `npm run build`. Set CV_PDF_REQUIRED=1 (the Docker build
 * does) to make its absence fail the build instead, so a production image can
 * never ship without the file the button points at.
 */

const APP_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(APP_DIR, 'public');
const LOCALES = ['en', 'es'];
const PORT = Number(process.env.CV_PDF_PORT || 3099);
const ORIGIN = `http://127.0.0.1:${PORT}`;
const REQUIRED = process.env.CV_PDF_REQUIRED === '1';

function fail(message) {
  if (REQUIRED) {
    console.error(`PDF generation failed: ${message}`);
    process.exit(1);
  }
  console.warn(`Skipping PDF generation: ${message}`);
  process.exit(0);
}

async function resolveChromium() {
  // Alpine installs its own Chromium; Playwright's bundled download is skipped
  // there, so the path is passed in explicitly.
  const explicit = process.env.CHROMIUM_PATH;
  if (explicit) {
    try {
      await access(explicit);
      return explicit;
    } catch {
      fail(`CHROMIUM_PATH is set but not executable: ${explicit}`);
    }
  }
  return undefined; // let Playwright find its own
}

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${ORIGIN}/api/health`);
      if (response.ok) return true;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

let chromium;
try {
  ({ chromium } = await import('playwright-core'));
} catch {
  fail('playwright-core is not installed');
}

const executablePath = await resolveChromium();

await mkdir(OUT_DIR, { recursive: true });

const server = spawn('npx', ['next', 'start', '-H', '127.0.0.1', '-p', String(PORT)], {
  cwd: APP_DIR,
  stdio: 'ignore',
  env: { ...process.env, NODE_ENV: 'production' },
});

let browser;
const shutdown = () => {
  if (browser) void browser.close().catch(() => undefined);
  server.kill('SIGTERM');
};
process.on('exit', shutdown);

try {
  if (!(await waitForServer())) {
    shutdown();
    fail('the Next server did not become healthy');
  }

  try {
    browser = await chromium.launch({ executablePath, args: ['--no-sandbox'] });
  } catch (error) {
    shutdown();
    fail(`could not launch Chromium (${error.message})`);
  }

  for (const locale of LOCALES) {
    // The locale is resolved server-side from a cookie, so it has to be set on
    // the browser context before the first request — seeding it in the page
    // would be too late, the server has already chosen a language by then.
    const context = await browser.newContext();
    await context.addCookies([{ name: 'cv-language', value: locale, url: ORIGIN }]);
    const page = await context.newPage();

    await page.goto(ORIGIN, { waitUntil: 'networkidle' });
    await page.emulateMedia({ media: 'print' });

    const out = path.join(OUT_DIR, `cv-${locale}.pdf`);
    await page.pdf({
      path: out,
      format: 'A4',
      // Honour the @page margin in globals.css rather than imposing another.
      preferCSSPageSize: true,
      printBackground: false,
    });
    await page.close();
    await context.close();
    console.log(`Wrote ${path.relative(APP_DIR, out)}`);
  }
} finally {
  shutdown();
}

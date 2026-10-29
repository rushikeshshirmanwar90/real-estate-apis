import type { Browser } from "puppeteer-core";

// HTML to PDF with headless Chrome.
//
// Phones used to print reports themselves with expo-print, and on Android its
// off-screen WebView could stall for good, leaving the app's spinner running.
// Printing here gives every phone the same PDF in a few seconds.
//
// Chrome comes from CHROME_PATH (the Docker image sets it to Debian's
// chromium) or, on a developer machine, the usual Chrome install path.

const LOCAL_CHROME: Record<string, string> = {
  darwin: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  win32: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
};

// The page is served from this made-up address so it can be answered from
// memory; every other request the page makes is refused.
const PAGE_URL = "https://xsite-report.invalid/";

// Chrome stays open between reports and closes after this long unused, so an
// idle server doesn't hold its memory.
const IDLE_CLOSE_MS = 5 * 60 * 1000;

async function launchBrowser(): Promise<Browser> {
  const executablePath = process.env.CHROME_PATH || LOCAL_CHROME[process.platform];
  if (!executablePath) {
    throw new Error("Chrome not found: set CHROME_PATH to a Chrome or Chromium binary");
  }
  // Loaded on first use, so the route module stays a plain (non-async) module.
  const { default: puppeteer } = await import("puppeteer-core");
  return puppeteer.launch({
    executablePath,
    headless: true,
    // In Docker, Chrome runs as a non-root user without the namespaces its
    // sandbox needs, and /dev/shm is only 64 MB. The page it loads is our own
    // escaped HTML with JavaScript off and every network request refused.
    args:
      process.platform === "linux"
        ? ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
        : [],
  });
}

let browser: Promise<Browser> | null = null;
let idleTimer: ReturnType<typeof setTimeout> | null = null;

async function getBrowser(): Promise<Browser> {
  if (browser) {
    const current = await browser.catch(() => null);
    if (current?.connected) return current;
  }
  browser = launchBrowser();
  browser.catch(() => {
    browser = null;
  });
  return browser;
}

/** Closes the shared browser so the next report starts a fresh one. */
async function dropBrowser() {
  const current = browser;
  browser = null;
  const instance = await current?.catch(() => null);
  await instance?.close().catch(() => {});
}

function scheduleIdleClose() {
  if (idleTimer) clearTimeout(idleTimer);
  idleTimer = setTimeout(() => void dropBrowser(), IDLE_CLOSE_MS);
  idleTimer.unref?.();
}

/** Optional running footer, printed in the page's bottom margin on every page. */
export interface RenderOptions {
  /** HTML for Chrome's footerTemplate; may use <span class="pageNumber"> and "totalPages". */
  footer?: string;
}

async function printOnce(html: string, { footer }: RenderOptions): Promise<Uint8Array> {
  const page = await (await getBrowser()).newPage();
  try {
    await page.setJavaScriptEnabled(false);
    await page.setRequestInterception(true);
    page.on("request", (request) => {
      if (request.url() === PAGE_URL) {
        void request.respond({ status: 200, contentType: "text/html; charset=utf-8", body: html });
      } else {
        void request.abort();
      }
    });
    await page.goto(PAGE_URL, { waitUntil: "load", timeout: 60000 });
    return await page.pdf({
      preferCSSPageSize: true,
      printBackground: true,
      tagged: false,
      outline: false,
      displayHeaderFooter: Boolean(footer),
      headerTemplate: "<span></span>",
      footerTemplate: footer ?? "<span></span>",
      timeout: 60000,
    });
  } finally {
    await page.close().catch(() => {});
  }
}

// Reports print one at a time, so a burst of requests can't open dozens of
// Chrome tabs on a small server.
let queue: Promise<unknown> = Promise.resolve();

/** Prints the page to a PDF (size and margins come from its @page rule). */
export function renderPdf(html: string, options: RenderOptions = {}): Promise<Uint8Array> {
  const run = queue.then(async () => {
    try {
      return await printOnce(html, options);
    } catch (error) {
      // A crashed or closed Chrome takes the page with it: start a fresh one
      // and try once more. Anything else is a real failure.
      const current = await browser?.catch(() => null);
      if (current?.connected) throw error;
      console.warn("[cost-report-pdf] Chrome stopped, starting it again:", error);
      await dropBrowser();
      return printOnce(html, options);
    } finally {
      scheduleIdleClose();
    }
  });
  queue = run.catch(() => {});
  return run;
}

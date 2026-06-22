import { chromium } from "playwright-core";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const exportWidth = 1080;

const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "/home/lmx/.cache/ms-playwright/chromium-1217/chrome-linux64/chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "/c/Program Files/Google/Chrome/Application/chrome.exe"
].filter(Boolean);

const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));

function directoryFileUrl(directoryPath) {
  const href = pathToFileURL(directoryPath).href;
  return href.endsWith("/") ? href : `${href}/`;
}

function stripBaseTags(html) {
  return html.replace(/<base\b[^>]*>/gi, "");
}

function splitUrlSuffix(value) {
  const match = String(value).match(/^([^?#]*)([?#][\s\S]*)?$/);
  return {
    pathname: match?.[1] || "",
    suffix: match?.[2] || ""
  };
}

function repoRootRelativeFileUrl(value, rootDir = repoRoot) {
  const { pathname, suffix } = splitUrlSuffix(value);
  const cleanPath = pathname.replace(/^\/+/, "");
  return `${pathToFileURL(path.join(rootDir, cleanPath)).href}${suffix}`;
}

function projectRelativeFileUrl(value, rootDir = repoRoot) {
  const { pathname, suffix } = splitUrlSuffix(value);
  const normalized = pathname.replace(/\\/g, "/").replace(/^(?:\.\/|\.\.\/)+/, "");
  const isProjectAsset =
    normalized === "styles.css" ||
    normalized.startsWith("assets/") ||
    normalized.startsWith("private-assets/");
  if (!isProjectAsset) return "";
  return `${pathToFileURL(path.join(rootDir, normalized)).href}${suffix}`;
}

function rewriteRootRelativeUrls(html, rootDir = repoRoot) {
  return html
    .replace(/\b(href|src)=(["'])\/(?!\/)([^"']*)\2/gi, (_match, attr, quote, value) => {
      return `${attr}=${quote}${repoRootRelativeFileUrl(`/${value}`, rootDir)}${quote}`;
    })
    .replace(/\b(href|src)=(["'])((?:\.{1,2}\/)*(?:assets|private-assets)\/[^"']*)\2/gi, (_match, attr, quote, value) => {
      return `${attr}=${quote}${projectRelativeFileUrl(value, rootDir)}${quote}`;
    })
    .replace(/\b(href|src)=(["'])((?:\.{1,2}\/)*styles\.css(?:[?#][^"']*)?)\2/gi, (_match, attr, quote, value) => {
      return `${attr}=${quote}${projectRelativeFileUrl(value, rootDir)}${quote}`;
    })
    .replace(/url\((["']?)\/(?!\/)([^)"']+)\1\)/gi, (_match, quote, value) => {
      return `url(${quote}${repoRootRelativeFileUrl(`/${value}`, rootDir)}${quote})`;
    })
    .replace(/url\((["']?)((?:\.{1,2}\/)*(?:assets|private-assets)\/[^)"']+)\1\)/gi, (_match, quote, value) => {
      return `url(${quote}${projectRelativeFileUrl(value, rootDir)}${quote})`;
    });
}

function injectBaseTag(html, baseHref) {
  const headMatch = html.match(/<head\b[^>]*>/i);
  if (!headMatch) return `<head><base href="${baseHref}"></head>${html}`;
  const insertAt = headMatch.index + headMatch[0].length;
  return `${html.slice(0, insertAt)}<base href="${baseHref}">${html.slice(insertAt)}`;
}

export function prepareExportHtml(html, options = {}) {
  const rootDir = options.rootDir || repoRoot;
  const sourceDir = options.sourceDir || rootDir;
  const withoutBase = stripBaseTags(html);
  const withFileUrls = rewriteRootRelativeUrls(withoutBase, rootDir);
  return injectBaseTag(withFileUrls, directoryFileUrl(sourceDir));
}

function parseArgs(args) {
  let inputHtml = path.join(repoRoot, "index.html");
  let outputArg = "export/vibe-resume-demo.pdf";
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--input") {
      inputHtml = path.resolve(repoRoot, args[i + 1]);
      i += 1;
    } else {
      outputArg = args[i];
    }
  }
  return {
    inputHtml,
    outputPdf: path.resolve(repoRoot, outputArg)
  };
}

async function createPreparedInput(inputHtml) {
  const sourceHtml = await readFile(inputHtml, "utf8");
  const preparedHtml = prepareExportHtml(sourceHtml, {
    rootDir: repoRoot,
    sourceDir: path.dirname(inputHtml)
  });
  const preparedPath = path.join(repoRoot, "export", `prepared-export-${Date.now()}-${Math.random().toString(36).slice(2)}.html`);
  await writeFile(preparedPath, preparedHtml, "utf8");
  return preparedPath;
}

async function exportPdf() {
  const { inputHtml, outputPdf } = parseArgs(process.argv.slice(2));

  if (!executablePath) {
    throw new Error(
      "No Chromium executable found. Set CHROME_PATH to a Chrome/Chromium binary and rerun npm run export:pdf."
    );
  }

  await mkdir(path.dirname(outputPdf), { recursive: true });
  await mkdir(path.join(repoRoot, "export"), { recursive: true });
  const preparedInputHtml = await createPreparedInput(inputHtml);

  const browser = await chromium.launch({
    executablePath,
    headless: true
  });

  try {
    const page = await browser.newPage({
      deviceScaleFactor: 1,
      viewport: {
        width: exportWidth,
        height: 2200
      }
    });

    await page.emulateMedia({ media: "screen" });
    await page.goto(pathToFileURL(preparedInputHtml).href, { waitUntil: "load" });
    await page.evaluate(() => document.fonts?.ready);

    await page.addStyleTag({
      content: `
        html, body {
          background: #fff !important;
          margin: 0 !important;
          padding: 0 !important;
        }

        .toolbar {
          display: none !important;
        }

        .page {
          border: 0 !important;
          box-shadow: none !important;
          margin: 0 !important;
          min-height: 0 !important;
          overflow: visible !important;
          width: ${exportWidth}px !important;
        }
      `
    });

    const pageSize = await page.evaluate(() => {
      const pageEl = document.querySelector(".page");
      if (!pageEl) {
        throw new Error("Could not find .page element.");
      }
      const rect = pageEl.getBoundingClientRect();
      const lastChild = pageEl.lastElementChild;
      const lastRect = lastChild?.getBoundingClientRect();
      const contentBottom = lastRect ? lastRect.bottom - rect.top : pageEl.scrollHeight;
      const paddingBottom = Number.parseFloat(getComputedStyle(pageEl).paddingBottom) || 0;
      return {
        width: Math.ceil(rect.width),
        height: Math.ceil(Math.max(pageEl.scrollHeight, contentBottom + paddingBottom))
      };
    });

    const pdfHeight = pageSize.height + 35;

    await page.addStyleTag({
      content: `
        @page {
          margin: 0;
          size: ${pageSize.width}px ${pdfHeight}px;
        }
      `
    });

    await page.setViewportSize({
      width: pageSize.width,
      height: pdfHeight
    });

    await page.pdf({
      path: outputPdf,
      width: `${pageSize.width}px`,
      height: `${pdfHeight}px`,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      },
      preferCSSPageSize: true,
      printBackground: true,
      scale: 1
    });

    console.log(`PDF exported: ${path.relative(repoRoot, outputPdf)}`);
    console.log(`Rendered content size: ${pageSize.width}px x ${pageSize.height}px`);
    console.log(`PDF page size: ${pageSize.width}px x ${pdfHeight}px`);
    console.log(`Chromium: ${executablePath}`);
  } finally {
    await browser.close();
    await rm(preparedInputHtml, { force: true });
  }
}

const mainModuleUrl = pathToFileURL(path.resolve(process.argv[1] || "")).href;
if (import.meta.url === mainModuleUrl) {
  await exportPdf();
}

import { chromium } from "playwright-core";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const exportInput = path.join(repoRoot, "export", "verify-export-paths.html");

const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
].filter(Boolean);

const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error("Chrome executable not found for verify-export-paths.mjs");
}

const browser = await chromium.launch({
  executablePath,
  headless: true
});

function injectBase(html) {
  const baseHref = pathToFileURL(repoRoot).href + "/";
  const headMatch = html.match(/<head\b[^>]*>/i);
  if (!headMatch) return `<head><base href="${baseHref}"></head>${html}`;
  const insertAt = headMatch.index + headMatch[0].length;
  return `${html.slice(0, insertAt)}<base href="${baseHref}">${html.slice(insertAt)}`;
}

try {
  const sourceHtml = readFileSync(path.join(repoRoot, "index.html"), "utf8").replace(/<base\b[^>]*>/i, "");
  writeFileSync(exportInput, injectBase(sourceHtml), "utf8");

  const page = await browser.newPage();
  const errors = [];
  const failed = [];

  page.on("pageerror", (error) => errors.push(error.message));
  page.on("requestfailed", (request) => {
    failed.push({
      url: request.url(),
      failure: request.failure()?.errorText || "unknown"
    });
  });

  await page.goto(pathToFileURL(exportInput).href, { waitUntil: "load" });
  await page.waitForTimeout(400);

  const result = await page.evaluate(() => {
    const pageEl = document.querySelector(".page");
    const bg = pageEl ? getComputedStyle(pageEl).paddingTop : "";
    const photo = document.querySelector(".profile-photo");
    const photoWidth = photo ? getComputedStyle(photo).width : "";
    return {
      hasPage: !!pageEl,
      pagePaddingTop: bg,
      photoWidth,
      logoSrcs: [...document.querySelectorAll(".project-logo")].map((img) => img.getAttribute("src") || "")
    };
  });

  const missing = [];
  if (!result.hasPage) missing.push("missing .page root");
  if (result.pagePaddingTop !== "38px") {
    missing.push(`styles.css not applied as expected, got paddingTop=${result.pagePaddingTop}`);
  }
  if (result.photoWidth !== "117px") {
    missing.push(`profile photo size mismatch, got width=${result.photoWidth}`);
  }
  if (failed.length) {
    missing.push(`request failures: ${failed.map((item) => `${item.url} (${item.failure})`).join("; ")}`);
  }
  if (errors.length) {
    missing.push(`page errors: ${errors.join("; ")}`);
  }

  console.log(JSON.stringify({ result, failed, errors }, null, 2));
  if (missing.length) {
    throw new Error(missing.join("\n"));
  }
} finally {
  await browser.close();
}

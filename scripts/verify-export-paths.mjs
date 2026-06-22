import { chromium } from "playwright-core";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { prepareExportHtml } from "./export-pdf.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const exportInput = path.join(repoRoot, "export", "verify-export-paths.html");
const privateFixture = path.join(repoRoot, "private-assets", "verify-export-logo.svg");

const chromeCandidates = [
  process.env.CHROME_PATH,
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
].filter(Boolean);

const executablePath = chromeCandidates.find((candidate) => existsSync(candidate));

if (!executablePath) {
  throw new Error("Chrome executable not found for verify-export-paths.mjs");
}

function editorLikeExportHtml({ privateAssetPath = "/private-assets/partymate-star.png" } = {}) {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <base href="${pathToFileURL(repoRoot).href}/">
  <title>Export path verification</title>
  <link rel="stylesheet" href="/styles.css">
</head>
<body>
  <main class="page">
    <header class="resume-header">
      <div class="photo-frame">
        <img class="profile-photo" src="/assets/avatar-placeholder.svg" alt="证件照">
      </div>
      <div class="profile-main">
        <p class="eyebrow">Export Test</p>
        <div class="name-row"><h1>路径验证</h1><p class="identity-line">PDF Export</p></div>
        <div class="contact-line"><a href="mailto:test@example.com">test@example.com</a></div>
      </div>
    </header>
    <section class="section projects-section">
      <h2>项目经历</h2>
      <article class="experience">
        <div class="entry-head">
          <strong class="project-title">
            <img class="project-logo" src="/assets/logos/bilibili-color.svg" alt="logo">路径项目
            <img class="project-logo private-logo" src="${privateAssetPath}" alt="private logo">
          </strong>
          <strong>验证</strong>
          <span>2026</span>
        </div>
        <p class="summary">如果样式加载成功，头像和 logo 都应该被 CSS 限制尺寸。</p>
      </article>
    </section>
  </main>
</body>
</html>`;
}

const browser = await chromium.launch({
  executablePath,
  headless: true
});

try {
  mkdirSync(path.dirname(privateFixture), { recursive: true });
  writeFileSync(privateFixture, '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#2563eb"/></svg>', "utf8");

  const preparedResumeHtml = prepareExportHtml(editorLikeExportHtml({
    privateAssetPath: "./private-assets/verify-export-logo.svg"
  }), {
    rootDir: repoRoot,
    sourceDir: path.join(repoRoot, "resumes")
  });
  writeFileSync(exportInput, preparedResumeHtml, "utf8");

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
    const photo = document.querySelector(".profile-photo");
    const logo = document.querySelector(".project-logo");
    const privateLogo = document.querySelector(".private-logo");
    return {
      hasPage: Boolean(pageEl),
      pagePaddingTop: pageEl ? getComputedStyle(pageEl).paddingTop : "",
      pageWidth: pageEl ? getComputedStyle(pageEl).width : "",
      photoWidth: photo ? getComputedStyle(photo).width : "",
      logoWidth: logo ? getComputedStyle(logo).width : "",
      privateLogoLoaded: privateLogo ? privateLogo.complete && privateLogo.naturalWidth > 0 : false
    };
  });

  const missing = [];
  if (!result.hasPage) missing.push("missing .page root");
  if (result.pagePaddingTop !== "38px") {
    missing.push(`styles.css not applied, got page paddingTop=${result.pagePaddingTop}`);
  }
  if (result.photoWidth !== "117px") {
    missing.push(`profile photo size mismatch, got width=${result.photoWidth}`);
  }
  if (result.logoWidth !== "22px") {
    missing.push(`project logo size mismatch, got width=${result.logoWidth}`);
  }
  if (!result.privateLogoLoaded) {
    missing.push("private project logo did not load");
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
  rmSync(exportInput, { force: true });
  rmSync(privateFixture, { force: true });
}

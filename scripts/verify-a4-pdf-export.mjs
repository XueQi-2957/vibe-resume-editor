import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const inputHtml = path.join(repoRoot, "export", "verify-a4-input.html");
const outputPdf = path.join(repoRoot, "export", "verify-a4-output.pdf");
const gapInputHtml = path.join(repoRoot, "export", "verify-a4-gap-input.html");
const gapOutputPdf = path.join(repoRoot, "export", "verify-a4-gap-output.pdf");
const longOutputPdf = path.join(repoRoot, "export", "verify-long-output.pdf");

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    execFile(command, args, options, (error, stdout, stderr) => {
      if (error) {
        error.stdout = stdout;
        error.stderr = stderr;
        reject(error);
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function longResumeHtml() {
  const projectItems = Array.from({ length: 18 }, (_, index) => `
    <article class="experience">
      <div class="entry-head">
        <strong class="project-title">A4 分页验证项目 ${index + 1}</strong>
        <strong>AI Agent 开发</strong>
        <span>2026.${String((index % 12) + 1).padStart(2, "0")}</span>
      </div>
      <h3><a class="project-link" href="https://github.com/example/a4-${index + 1}">github.com/example/a4-${index + 1}</a></h3>
      <p class="summary">用于验证 PDF 默认导出为标准 A4 多页，而不是单张超长页面。</p>
      <ul>
        <li><strong>分页验证：</strong>这是一段较长的项目描述，用于制造足够高度，触发第二页和第三页。</li>
        <li><strong>版式验证：</strong>导出时应保留简历样式、背景、边距和内容流式分页。</li>
      </ul>
    </article>
  `).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A4 PDF Export Verification</title>
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <main class="page">
    <header class="resume-header">
      <div class="photo-frame"><img class="profile-photo" src="../assets/avatar-placeholder.svg" alt="证件照"></div>
      <div class="profile-main">
        <p class="eyebrow">A4 PDF Export</p>
        <div class="name-row"><h1>分页验证</h1><p class="identity-line">PDF 导出测试</p></div>
        <p class="tech-line">A4 · Multi-page · Print Ready</p>
        <div class="contact-line"><a href="mailto:test@example.com">test@example.com</a></div>
      </div>
    </header>
    <section class="section">
      <h2>教育背景</h2>
      <div class="education-grid"><div>测试大学</div><div>计算机科学</div><div>2024 - 2027</div></div>
      <p class="info-line"><strong>荣誉奖项：</strong>分页测试奖项、A4 打印验证</p>
    </section>
    <section class="section projects-section">
      <h2>项目经历</h2>
      ${projectItems}
    </section>
  </main>
</body>
</html>`;
}

function firstPageGapResumeHtml() {
  const highlights = Array.from({ length: 10 }, (_, index) => `
    <li><strong>分页空白验证 ${index + 1}：</strong>这段内容模拟真实项目经历中的较长 bullet，用于确认项目经历可以自然跨页，不会因为整块避让而把第一页底部留成大面积空白。</li>
  `).join("");
  const fillerLines = Array.from({ length: 5 }, (_, index) => `
      <p class="info-line"><strong>补充信息 ${index + 1}：</strong>这行内容用于把第一个项目标题推到第一页中下部，从而复现整段项目经历被挪到下一页时产生的大块空白。</p>
  `).join("");

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A4 Gap Verification</title>
  <link rel="stylesheet" href="../styles.css">
</head>
<body>
  <main class="page">
    <header class="resume-header">
      <div class="photo-frame"><img class="profile-photo" src="../assets/avatar-placeholder.svg" alt="证件照"></div>
      <div class="profile-main">
        <p class="eyebrow">AI Agent / RAG 应用开发实习生</p>
        <div class="name-row"><h1>分页空白验证</h1><p class="identity-line">2027届计算机硕士 · AI应用开发方向</p></div>
        <p class="tech-line">Python · LangChain · RAG · Chrome PDF</p>
        <div class="contact-line"><a href="mailto:test@example.com">test@example.com</a></div>
      </div>
    </header>
    <section class="section">
      <h2>教育背景</h2>
      <div class="education-grid">
        <div>贵州师范大学（硕士）</div><div>计算机科学与技术</div><div>2024.09 - 2027.06</div>
        <div>华北理工大学（本科）</div><div>计算机科学与技术</div><div>2019.09 - 2023.06</div>
      </div>
      <p class="info-line"><strong>荣誉奖项：</strong>校级一等奖学金2次、优秀学生干部、2022年北京冬奥会优秀志愿者、冀青之星奖章</p>
      <p class="info-line"><strong>竞赛获奖：</strong>CET-6、蓝桥杯省二、中国大学生计算机设计大赛省三、数学建模认证杯省二、大学生创新创业竞赛国家级项目</p>
      ${fillerLines}
    </section>
    <section class="section projects-section">
      <h2>项目经历</h2>
      <article class="experience">
        <div class="entry-head">
          <strong class="project-title">PartyMate 党务助手 Agent 系统</strong>
          <strong>AI Agent / RAG 应用开发</strong>
          <span>2026.05 - 至今</span>
        </div>
        <h3><a class="project-link" href="https://github.com/example/partymate">github.com/example/partymate</a></h3>
        <p class="summary">面向党务工作者的 AI 助手，基于 ReAct 模式与 RAG 技术，实现党务问答、材料审查、党员发展流程管理和待办生成。</p>
        <ul>${highlights}</ul>
      </article>
      <article class="experience">
        <div class="entry-head">
          <strong class="project-title">MiniCode</strong>
          <strong>AI Coding Agent 开发</strong>
          <span>2026.04 - 2026.05</span>
        </div>
        <p class="summary">实现基于 Query Loop + Tool Use 的任务执行闭环。</p>
      </article>
    </section>
  </main>
</body>
</html>`;
}

async function inspectPdfWithPdfInfo(pdfPath) {
  try {
    const { stdout } = await run("pdfinfo", [pdfPath], { cwd: repoRoot });
    const pages = Number(stdout.match(/^Pages:\s+(\d+)/m)?.[1] || 0);
    const sizeMatch = stdout.match(/^Page size:\s+([\d.]+)\s+x\s+([\d.]+)\s+pts/m);
    return {
      source: "pdfinfo",
      pages,
      width: sizeMatch ? Number(sizeMatch[1]) : 0,
      height: sizeMatch ? Number(sizeMatch[2]) : 0
    };
  } catch (error) {
    return null;
  }
}

async function inspectPdfFallback(pdfPath) {
  const bytes = await readFile(pdfPath);
  const text = bytes.toString("latin1");
  const pageMatches = text.match(/\/Type\s*\/Page\b/g) || [];
  const mediaBoxMatch = text.match(/\/MediaBox\s*\[\s*0\s+0\s+([\d.]+)\s+([\d.]+)\s*\]/);
  return {
    source: "fallback",
    pages: pageMatches.length,
    width: mediaBoxMatch ? Number(mediaBoxMatch[1]) : 0,
    height: mediaBoxMatch ? Number(mediaBoxMatch[2]) : 0
  };
}

async function firstPageLastTextBottom(pdfPath) {
  const { stdout } = await run("pdftotext", ["-bbox", "-f", "1", "-l", "1", pdfPath, "-"], { cwd: repoRoot, maxBuffer: 1024 * 1024 * 20 });
  const values = [...stdout.matchAll(/<word\b[^>]*\byMax="([\d.]+)"/g)].map((match) => Number(match[1]));
  return values.length ? Math.max(...values) : 0;
}

async function pageLastTextBottom(pdfPath, pageNumber) {
  const boxes = await pageTextBBoxes(pdfPath, pageNumber);
  const values = boxes.map((box) => box.yMax);
  return values.length ? Math.max(...values) : 0;
}

async function pageTextBBoxes(pdfPath, pageNumber) {
  const { stdout } = await run("pdftotext", ["-bbox", "-f", String(pageNumber), "-l", String(pageNumber), pdfPath, "-"], { cwd: repoRoot, maxBuffer: 1024 * 1024 * 20 });
  return [...stdout.matchAll(/<word\b[^>]*\bxMin="([\d.]+)"[^>]*\byMin="([\d.]+)"[^>]*\bxMax="([\d.]+)"[^>]*\byMax="([\d.]+)"[^>]*>([\s\S]*?)<\/word>/g)]
    .map((match) => ({
      xMin: Number(match[1]),
      yMin: Number(match[2]),
      xMax: Number(match[3]),
      yMax: Number(match[4]),
      text: match[5]
    }));
}

async function pageFirstTextTop(pdfPath, pageNumber, options = {}) {
  const boxes = await pageTextBBoxes(pdfPath, pageNumber);
  const minY = options.minY || 0;
  const values = boxes.filter((box) => box.yMin >= minY).map((box) => box.yMin);
  return values.length ? Math.min(...values) : 0;
}

async function pageTextContent(pdfPath, pageNumber) {
  const { stdout } = await run("pdftotext", ["-layout", "-f", String(pageNumber), "-l", String(pageNumber), pdfPath, "-"], { cwd: repoRoot, maxBuffer: 1024 * 1024 * 20 });
  return stdout.replace(/\s+/g, " ").trim();
}

async function firstWordXMin(pdfPath, word) {
  const { stdout } = await run("pdftotext", ["-bbox", "-f", "1", "-l", "1", pdfPath, "-"], { cwd: repoRoot, maxBuffer: 1024 * 1024 * 20 });
  const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = stdout.match(new RegExp(`<word\\b[^>]*\\bxMin="([\\d.]+)"[^>]*>${escapedWord}</word>`));
  return match ? Number(match[1]) : 0;
}

await mkdir(path.dirname(inputHtml), { recursive: true });
await writeFile(inputHtml, longResumeHtml(), "utf8");
await rm(outputPdf, { force: true });
await writeFile(gapInputHtml, firstPageGapResumeHtml(), "utf8");
await rm(gapOutputPdf, { force: true });
await rm(longOutputPdf, { force: true });

try {
  await run("node", ["scripts/export-pdf.mjs", "--mode", "a4", "--input", inputHtml, outputPdf], { cwd: repoRoot });
  assert(existsSync(outputPdf), "exported PDF was not created");

  const info = await inspectPdfWithPdfInfo(outputPdf) || await inspectPdfFallback(outputPdf);
  const a4Width = 595.28;
  const a4Height = 841.89;
  const tolerance = 3;

  assert(info.pages >= 2, `expected A4 multi-page PDF, got ${info.pages} page(s) via ${info.source}`);
  assert(Math.abs(info.width - a4Width) <= tolerance, `expected A4 width around ${a4Width}pt, got ${info.width}pt`);
  assert(Math.abs(info.height - a4Height) <= tolerance, `expected A4 height around ${a4Height}pt, got ${info.height}pt`);

  await run("node", ["scripts/export-pdf.mjs", "--input", gapInputHtml, gapOutputPdf], { cwd: repoRoot });
  const gapInfo = await inspectPdfWithPdfInfo(gapOutputPdf) || await inspectPdfFallback(gapOutputPdf);
  const firstPageBottom = await firstPageLastTextBottom(gapOutputPdf);
  const secondPageTop = await pageFirstTextTop(gapOutputPdf, 2, { minY: 45 });
  const secondPageText = await pageTextContent(gapOutputPdf, 2);
  const educationDateX = await firstWordXMin(gapOutputPdf, "2024.09");
  assert(gapInfo.pages >= 2, `expected gap fixture to produce multiple A4 pages, got ${gapInfo.pages}`);
  assert(firstPageBottom > 650, `first page has a large blank gap; last text bottom is ${firstPageBottom.toFixed(2)}pt`);
  assert(secondPageText.includes("分页空白验证 · AI Agent / RAG 应用开发实习生"), "second page is missing the repeated A4 continuation header");
  assert(secondPageText.replace(/\s+/g, "").includes("第2页"), "second page is missing page-number header text");
  assert(secondPageTop > 60, `second page body starts too close to the top: ${secondPageTop.toFixed(2)}pt`);
  assert(educationDateX > 300, `education date column is not right aligned in A4 export, xMin=${educationDateX.toFixed(2)}pt`);

  await run("node", ["scripts/export-pdf.mjs", "--mode", "long", "--input", inputHtml, longOutputPdf], { cwd: repoRoot });
  const longInfo = await inspectPdfWithPdfInfo(longOutputPdf) || await inspectPdfFallback(longOutputPdf);
  const longLastTextBottom = await pageLastTextBottom(longOutputPdf, 1);
  const longBottomWhitespace = longInfo.height - longLastTextBottom;
  assert(longInfo.pages === 1, `expected long resume mode to export one PDF page, got ${longInfo.pages}`);
  assert(longInfo.height > a4Height * 2, `expected long resume page height to exceed two A4 pages, got ${longInfo.height}pt`);
  assert(longBottomWhitespace < 55, `long resume bottom whitespace is too large: ${longBottomWhitespace.toFixed(2)}pt`);

  console.log(JSON.stringify({ ok: true, info, gapInfo, longInfo, firstPageBottom, secondPageTop, educationDateX, longBottomWhitespace }, null, 2));
} finally {
  await rm(inputHtml, { force: true });
  await rm(outputPdf, { force: true });
  await rm(gapInputHtml, { force: true });
  await rm(gapOutputPdf, { force: true });
  await rm(longOutputPdf, { force: true });
}

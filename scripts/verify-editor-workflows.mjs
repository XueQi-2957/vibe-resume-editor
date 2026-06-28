import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import net from 'node:net';
import { chromium } from 'playwright-core';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const resumesDir = path.join(repoRoot, 'resumes');
const templatePath = path.join(repoRoot, 'index.template.html');
const port = Number(process.env.VIBE_RESUME_TEST_PORT) || await getFreePort();
const baseUrl = `http://127.0.0.1:${port}`;
const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function waitForServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch (error) {
      // Retry until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`server did not become ready: ${url}`);
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const portNumber = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(portNumber));
    });
  });
}

function createResumeHtml(name, skill, options = {}) {
  const contactHtml = options.omitContact
    ? ''
    : `<div class="contact-line">
        <a href="tel:${options.phone || '13800000000'}"><svg class="icon"><use href="#icon-phone"></use></svg>${options.phone || '13800000000'}</a>
        <a href="mailto:${options.email || 'test@example.com'}"><svg class="icon"><use href="#icon-mail"></use></svg>${options.email || 'test@example.com'}</a>
        <a href="https://${options.github || `github.com/example/${name}`}"><svg class="icon"><use href="#icon-github"></use></svg>${options.github || `github.com/example/${name}`}</a>
      </div>`;
  const photoHtml = options.omitPhoto
    ? ''
    : `<div class="photo-frame"><img class="profile-photo" src="../assets/avatar-placeholder.svg" alt="证件照"></div>`;
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}</title>
<link rel="stylesheet" href="../styles.css">
</head>
<body>
<main class="page">
  <header class="resume-header">
    ${photoHtml}
    <div class="profile-main">
      <p class="eyebrow">测试模块</p>
      <div class="name-row">
        <h1>${name}</h1>
        <p class="identity-line">切换验证</p>
      </div>
      ${contactHtml}
    </div>
  </header>
  <section class="section">
    <h2><svg class="section-icon"><use href="#icon-school"></use></svg>教育背景</h2>
    <div class="education-grid"><div>测试大学</div><div>测试专业</div><div>2022 - 2026</div></div>
  </section>
  <section class="section skills-section">
    <h2><svg class="section-icon"><use href="#icon-tool"></use></svg>专业技能</h2>
    <ul class="skills-list"><li>${skill}</li></ul>
  </section>
</main>
</body>
</html>`;
}

function createFlexibleResumeHtml(name) {
  return `<!doctype html>
<html lang="zh-CN">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${name}</title>
<link rel="stylesheet" href="../styles.css">
</head>
<body>
<main class="page">
  <header class="resume-header">
    <div class="photo-frame"><img class="profile-photo" src="../assets/avatar-placeholder.svg" alt="证件照"></div>
    <div class="profile-main">
      <p class="eyebrow">AI Agent / RAG 应用开发实习生</p>
      <div class="name-row">
        <h1>${name}</h1>
        <p class="identity-line">2027届计算机硕士 · AI应用开发方向</p>
      </div>
      <p class="tech-line">Python · LangChain / LlamaIndex · ReAct · Tool Calling · RAG</p>
      <div class="contact-line">
        <a href="tel:15132387849"><svg class="icon"><use href="#icon-phone"></use></svg>15132387849</a>
        <a href="mailto:flex@example.com"><svg class="icon"><use href="#icon-mail"></use></svg>flex@example.com</a>
        <a href="https://github.com/example/flexible"><svg class="icon"><use href="#icon-github"></use></svg>github.com/example/flexible</a>
      </div>
    </div>
  </header>
  <section class="section">
    <h2><svg class="section-icon"><use href="#icon-school"></use></svg>教育背景</h2>
    <div class="education-grid"><div>灵活大学</div><div>计算机科学与技术</div><div>2024 - 2027</div></div>
    <p class="info-line"><strong>荣誉奖项：</strong><strong>校级一等奖学金</strong>、数学建模二等奖</p>
  </section>
  <section class="section projects-section">
    <h2><svg class="section-icon"><use href="#icon-code"></use></svg>项目经历</h2>
    <article class="experience">
      <div class="entry-head">
        <strong class="project-title">Flexible Agent</strong>
        <strong>AI Agent 开发</strong>
        <span>2026.06</span>
      </div>
      <h3><a class="project-link" href="https://github.com/example/flexible-agent">github.com/example/flexible-agent</a></h3>
      <p class="summary">基于<strong>Tool Calling</strong>构建任务闭环。</p>
      <ul><li><strong>重点：</strong>保存后仍应保留加粗内容。</li></ul>
    </article>
  </section>
  <section class="section skills-section">
    <h2><svg class="section-icon"><use href="#icon-tool"></use></svg>专业技能</h2>
    <ul class="skills-list"><li><strong>AI Agent：</strong>ReAct、RAG、LangChain</li></ul>
  </section>
  <section class="section">
    <h2><svg class="section-icon"><use href="#icon-file-text"></use></svg>论文发表</h2>
    <div class="publications"><p>Flexible Paper (2026)</p></div>
  </section>
  <section class="section honors-section">
    <h2><svg class="section-icon"><use href="#icon-file-text"></use></svg>证书</h2>
    <div class="publications"><p class="custom-item"><strong>自定义证书：</strong>LangChain 应用开发</p></div>
  </section>
  <section class="section">
    <h2><svg class="section-icon"><use href="#icon-school"></use></svg>校园经历</h2>
    <article class="experience">
      <div class="entry-head">
        <strong class="project-title">班长</strong>
        <strong>灵活大学</strong>
        <span>2024 - 2025</span>
      </div>
      <ul><li>组织班级事务。</li></ul>
    </article>
  </section>
</main>
</body>
</html>`;
}

const server = spawn(pythonCmd, ['-u', 'serve.py', String(port)], {
  cwd: repoRoot,
  stdio: ['ignore', 'pipe', 'pipe']
});

let serverStdout = '';
let serverStderr = '';
server.stdout.on('data', (chunk) => {
  serverStdout += chunk.toString();
});
server.stderr.on('data', (chunk) => {
  serverStderr += chunk.toString();
});

const tempFiles = [];
let browser;

try {
  await waitForServer(`${baseUrl}/editor.html`);
  const editorResponse = await fetch(`${baseUrl}/editor.html`);
  const cacheControl = editorResponse.headers.get('cache-control') || '';
  assert(
    cacheControl.includes('no-store') || cacheControl.includes('no-cache'),
    `editor.html should disable browser cache, got: ${cacheControl || '(empty)'}`
  );

  const templateHtml = await fs.readFile(templatePath, 'utf8');
  const expectedTemplateName = (templateHtml.match(/<h1>([\s\S]*?)<\/h1>/i)?.[1] || '').replace(/<[^>]+>/g, '').trim();

  const switchFileOne = `codex-switch-one-${Date.now()}.html`;
  const switchFileTwo = `codex-switch-two-${Date.now()}.html`;
  const flexibleFile = `codex-flexible-${Date.now()}.html`;
  const leakPhone = '19900001111';
  const leakEmail = 'leak-check@example.com';
  const leakGithub = 'github.com/example/leak-check';
  await fs.writeFile(path.join(resumesDir, switchFileOne), createResumeHtml('切换简历一', '技能 A', {
    phone: leakPhone,
    email: leakEmail,
    github: leakGithub
  }), 'utf8');
  await fs.writeFile(path.join(resumesDir, switchFileTwo), createResumeHtml('切换简历二', '技能 B', {
    omitContact: true,
    omitPhoto: true
  }), 'utf8');
  await fs.writeFile(path.join(resumesDir, flexibleFile), createFlexibleResumeHtml('灵活简历'), 'utf8');
  tempFiles.push(switchFileOne, switchFileTwo, flexibleFile);

  browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true
  });

  const page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') pageErrors.push(message.text());
  });

  await page.addInitScript(() => {
    localStorage.clear();
  });
  await page.addInitScript((preferredFile) => {
    localStorage.setItem('vibe-resume-last-file', preferredFile);
  }, switchFileOne);
  await page.goto(`${baseUrl}/editor.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);

  const initialState = await page.evaluate(() => ({
    sidebarChildren: document.querySelector('#sidebar-root')?.children.length || 0,
    previewName: document.querySelector('#preview-frame')?.contentDocument?.querySelector('.resume-header h1')?.textContent?.trim() || '',
    options: [...document.querySelectorAll('#file-select option')].map((option) => option.value).filter(Boolean)
  }));

  assert(initialState.sidebarChildren > 0, 'editor sidebar did not render');
  assert(Boolean(initialState.previewName), 'preview did not render');
  assert(pageErrors.length === 0, pageErrors.join('\n'));
  assert(initialState.options.includes(switchFileOne), `missing test resume in select: ${switchFileOne}`);
  assert(initialState.options.includes(switchFileTwo), `missing test resume in select: ${switchFileTwo}`);

  await page.selectOption('#file-select', switchFileOne);
  await page.waitForTimeout(500);
  const previewOne = await page.evaluate(() => document.querySelector('#preview-frame')?.contentDocument?.querySelector('.resume-header h1')?.textContent?.trim() || '');
  assert(previewOne === '切换简历一', `resume switch failed for first file: ${previewOne}`);

  await page.selectOption('#file-select', switchFileTwo);
  await page.waitForTimeout(500);
  const switchTwoState = await page.evaluate(() => ({
    previewName: document.querySelector('#preview-frame')?.contentDocument?.querySelector('.resume-header h1')?.textContent?.trim() || '',
    header: { ...data.header },
    previewText: document.querySelector('#preview-frame')?.contentDocument?.body?.innerText || ''
  }));
  const previewTwo = switchTwoState.previewName;
  assert(previewTwo === '切换简历二', `resume switch failed for second file: ${previewTwo}`);
  assert(switchTwoState.header.phone !== leakPhone, 'second resume inherited phone from first resume');
  assert(switchTwoState.header.email !== leakEmail, 'second resume inherited email from first resume');
  assert(switchTwoState.header.github !== leakGithub, 'second resume inherited github from first resume');
  assert(!switchTwoState.previewText.includes(leakPhone), 'second resume preview leaked first phone');
  assert(!switchTwoState.previewText.includes(leakEmail), 'second resume preview leaked first email');
  assert(!switchTwoState.previewText.includes(leakGithub), 'second resume preview leaked first github');

  const newResumeName = `codex-new-template-${Date.now()}`;
  const newResumeFile = await page.evaluate(async (name) => {
    const result = await createNewResume(name);
    if (!result?.ok) throw new Error(result?.error || 'createNewResume failed');
    await populateFileList(result.file);
    return result.file;
  }, newResumeName);
  tempFiles.push(newResumeFile);

  await page.waitForTimeout(800);
  const newResumePreviewName = await page.evaluate(() => document.querySelector('#preview-frame')?.contentDocument?.querySelector('.resume-header h1')?.textContent?.trim() || '');
  assert(newResumePreviewName === expectedTemplateName, `new resume did not use default template: ${newResumePreviewName}`);

  const customResult = await page.evaluate(async () => {
    if (typeof addCustomSection !== 'function') {
      return { ok: false, reason: 'addCustomSection is not implemented' };
    }
    addCustomSection();
    data.customSections[0].title = '证书';
    data.customSections[0].items[0] = 'AWS Certified Solutions Architect';
    renderSidebar();
    renderPreviewNow();
    await saveToServer();
    await doLoadFile(currentFile);
    const previewText = document.querySelector('#preview-frame')?.contentDocument?.body?.innerText || '';
    return { ok: true, previewText };
  });

  assert(customResult.ok, customResult.reason || 'custom section flow failed');
  assert(customResult.previewText.includes('证书'), 'custom section title missing after save');
  assert(customResult.previewText.includes('AWS Certified Solutions Architect'), 'custom section content missing after save');

  const renameDeleteResult = await page.evaluate(async () => {
    if (typeof renameCurrentResume !== 'function') {
      return { ok: false, reason: 'renameCurrentResume is not implemented' };
    }
    if (typeof deleteCurrentResume !== 'function') {
      return { ok: false, reason: 'deleteCurrentResume is not implemented' };
    }
    const originalFile = currentFile;
    const renameBase = `codex-renamed-${Date.now()}`;
    const renameResult = await renameCurrentResume(renameBase);
    if (!renameResult?.ok) {
      return { ok: false, step: 'rename', originalFile, reason: renameResult?.error || 'rename failed' };
    }
    const renamedFile = renameResult.file;
    const filesAfterRename = await fetchFileList();
    const currentFileAfterRename = currentFile;
    window.confirm = () => true;
    const deleteResult = await deleteCurrentResume();
    const filesAfterDelete = await fetchFileList();
    return {
      ok: true,
      originalFile,
      renamedFile,
      currentFileAfterRename,
      deleteOk: Boolean(deleteResult?.ok),
      filesAfterRename,
      filesAfterDelete,
      currentFileAfterDelete: currentFile
    };
  });

  if (renameDeleteResult.renamedFile) tempFiles.push(renameDeleteResult.renamedFile);
  assert(renameDeleteResult.ok, renameDeleteResult.reason || 'rename/delete flow failed');
  assert(renameDeleteResult.renamedFile.endsWith('.html'), `renamed file did not get html extension: ${renameDeleteResult.renamedFile}`);
  assert(renameDeleteResult.currentFileAfterRename === renameDeleteResult.renamedFile, 'current file did not update after rename');
  assert(!renameDeleteResult.filesAfterRename.includes(renameDeleteResult.originalFile), 'old file still listed after rename');
  assert(renameDeleteResult.filesAfterRename.includes(renameDeleteResult.renamedFile), 'renamed file missing from list');
  assert(renameDeleteResult.deleteOk, 'deleteCurrentResume did not report success');
  assert(!renameDeleteResult.filesAfterDelete.includes(renameDeleteResult.renamedFile), 'deleted file still listed');
  assert(renameDeleteResult.currentFileAfterDelete !== renameDeleteResult.renamedFile, 'current file still points at deleted resume');

  const exportModeResult = await page.evaluate(async () => {
    const seenModes = [];
    const originalFetch = window.fetch;
    const originalPrompt = window.prompt;
    const fakePdf = new Blob(['%PDF-1.4\n%%EOF'], { type: 'application/pdf' });
    window.fetch = async (resource, options = {}) => {
      const url = typeof resource === 'string' ? resource : resource.url;
      if (url === '/export-pdf') {
        const body = JSON.parse(options.body || '{}');
        seenModes.push(body.mode || '');
        return new Response(fakePdf, {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' }
        });
      }
      return originalFetch(resource, options);
    };
    try {
      const filenames = ['codex-a4.pdf', 'codex-long.pdf'];
      window.prompt = (_message, defaultValue) => filenames.shift() || defaultValue || 'codex-export.pdf';
      const exportButton = document.querySelector('[onclick^="exportToPDF"]');

      const firstExport = exportToPDF({ currentTarget: exportButton });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const firstModal = document.querySelector('#export-mode-modal.show');
      if (!firstModal) {
        await firstExport.catch(() => {});
        return { seenModes, hasModeModal: false };
      }
      firstModal.querySelector('[data-export-mode="a4"]')?.click();
      await firstExport;

      const secondExport = exportToPDF({ currentTarget: exportButton });
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const secondModal = document.querySelector('#export-mode-modal.show');
      secondModal?.querySelector('[data-export-mode="long"]')?.click();
      await secondExport;
    } finally {
      window.fetch = originalFetch;
      window.prompt = originalPrompt;
    }
    return { seenModes, hasModeModal: true };
  });

  assert(exportModeResult.hasModeModal, 'export mode should be selected from an explicit modal instead of a prompt');
  assert(exportModeResult.seenModes.join(',') === 'a4,long', `export modes were not passed correctly: ${exportModeResult.seenModes.join(',')}`);

  await page.selectOption('#file-select', flexibleFile);
  await page.waitForTimeout(500);
  const flexibleResult = await page.evaluate(async () => {
    if (typeof setTemplateStyle !== 'function') {
      return { ok: false, reason: 'setTemplateStyle is not implemented' };
    }
    if (typeof setDensityStyle !== 'function') {
      return { ok: false, reason: 'setDensityStyle is not implemented' };
    }
    setTemplateStyle('compact-hr');
    setDensityStyle('ultra');
    if (!document.querySelector('#body-education.open')) {
      toggleSection('education');
    }
    const infoEditor = document.querySelector('#body-education [data-path="infoLines.0.value"]');
    if (!infoEditor) {
      return { ok: false, reason: 'education info-line editor is missing inside education section' };
    }
    infoEditor.innerHTML = '<strong>国家励志奖学金</strong>、蓝桥杯省赛二等奖';
    infoEditor.dispatchEvent(new InputEvent('input', { bubbles: true }));
    await saveToServer();
    await doLoadFile(currentFile);
    if (!document.querySelector('#body-education.open')) {
      toggleSection('education');
    }
    const reloadedInfoEditor = document.querySelector('#body-education [data-path="infoLines.0.value"]');
    const reloadedInfoEditorHtml = reloadedInfoEditor?.innerHTML || '';
    await saveToServer();
    const savedHtml = await fetch('/load-resume?file=' + encodeURIComponent(currentFile))
      .then((response) => response.json())
      .then((result) => result.html || '');
    const doc = new DOMParser().parseFromString(savedHtml, 'text/html');
    const pageEl = doc.querySelector('main.page');
    const sectionTitles = [...doc.querySelectorAll('main.page > section > h2')]
      .map((heading) => heading.textContent.replace(/\s+/g, '').trim());
    const previewPageClass = document.querySelector('#preview-frame')?.contentDocument?.querySelector('main.page')?.className || '';
    return {
      ok: true,
      techLine: doc.querySelector('.tech-line')?.textContent?.trim() || '',
      template: pageEl?.dataset.template || '',
      density: pageEl?.dataset.density || '',
      pageClass: pageEl?.className || '',
      editorTemplate: document.querySelector('#template-select')?.value || '',
      editorDensity: document.querySelector('#density-select')?.value || '',
      previewPageClass,
      sectionTitles,
      customText: doc.body?.innerText || '',
      projectSummary: doc.querySelector('.projects-section .summary')?.innerHTML || '',
      reloadedInfoEditorHtml,
      infoLineHtml: doc.querySelector('.info-line')?.innerHTML || ''
    };
  });

  assert(flexibleResult.ok, flexibleResult.reason || 'flexible resume flow failed');
  assert(
    flexibleResult.techLine === 'Python · LangChain / LlamaIndex · ReAct · Tool Calling · RAG',
    `tech-line was not preserved after editor save: ${flexibleResult.techLine}`
  );
  assert(flexibleResult.template === 'compact-hr', `template was not saved: ${flexibleResult.template}`);
  assert(flexibleResult.density === 'ultra', `density was not saved: ${flexibleResult.density}`);
  assert(flexibleResult.pageClass.includes('template-compact-hr'), `saved HTML missing template class: ${flexibleResult.pageClass}`);
  assert(flexibleResult.pageClass.includes('density-ultra'), `saved HTML missing density class: ${flexibleResult.pageClass}`);
  assert(flexibleResult.editorTemplate === 'compact-hr', `editor template select did not restore: ${flexibleResult.editorTemplate}`);
  assert(flexibleResult.editorDensity === 'ultra', `editor density select did not restore: ${flexibleResult.editorDensity}`);
  assert(flexibleResult.previewPageClass.includes('template-compact-hr'), `preview missing template class: ${flexibleResult.previewPageClass}`);
  assert(flexibleResult.previewPageClass.includes('density-ultra'), `preview missing density class: ${flexibleResult.previewPageClass}`);
  assert(
    flexibleResult.sectionTitles.join('>') === '教育背景>项目经历>专业技能>论文发表>证书>校园经历',
    `section order was not preserved after editor save: ${flexibleResult.sectionTitles.join('>')}`
  );
  assert(flexibleResult.customText.includes('自定义证书'), 'unknown/custom section content missing after save');
  assert(flexibleResult.projectSummary.includes('<strong>Tool Calling</strong>'), 'rich project summary formatting missing after save');
  assert(
    flexibleResult.reloadedInfoEditorHtml.includes('<strong>国家励志奖学金</strong>'),
    `education info-line rich formatting was not editable after reload: ${flexibleResult.reloadedInfoEditorHtml}`
  );
  assert(
    flexibleResult.infoLineHtml.includes('<strong>国家励志奖学金</strong>'),
    `education info-line edits were not saved: ${flexibleResult.infoLineHtml}`
  );

  console.log(JSON.stringify({
    initialState,
    previewOne,
    previewTwo,
    newResumeFile,
    newResumePreviewName,
    flexibleResult
  }, null, 2));
} finally {
  if (browser) {
    await browser.close();
  }

  for (const filename of tempFiles) {
    try {
      await fs.unlink(path.join(resumesDir, filename));
    } catch (error) {
      // Ignore cleanup failures for missing temp files.
    }
  }

  if (!server.killed) {
    server.kill();
  }

  if (serverStderr.trim()) {
    process.stderr.write(serverStderr);
  }
}

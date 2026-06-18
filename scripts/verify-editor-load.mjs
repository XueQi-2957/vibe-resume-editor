import { chromium } from 'playwright-core';

const deprecatedProjectName = ['Mini', 'Code'].join('');
const deprecatedAvatarFile = ['avatar', '.png'].join('');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('http://localhost:4173/editor.html', { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => {
    localStorage.setItem('vibe-resume-editor-data', JSON.stringify({
      education: [],
      projects: [{ name: '旧草稿项目', role: 'x', period: 'x', link: '', summary: '', highlights: [] }]
    }));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => ({
    toast: document.querySelector('#toast')?.textContent || '',
    titles: [...document.querySelectorAll('.item-title')].map((el) => el.textContent.trim()),
    projectInputs: [...document.querySelectorAll('input[placeholder="项目名称"]')].map((el) => el.value),
    internshipInputs: [...document.querySelectorAll('input[placeholder="公司名称"]')].map((el) => el.value),
    educationInputs: [...document.querySelectorAll('input[placeholder="学校"]')].map((el) => el.value),
    draftStorage: localStorage.getItem('vibe-resume-editor-data'),
    preview: (() => {
      const doc = document.querySelector('#preview-frame')?.contentDocument;
      if (!doc) return null;
      return {
        name: doc.querySelector('.resume-header h1')?.textContent.trim() || '',
        photo: doc.querySelector('.profile-photo')?.getAttribute('src') || '',
        education: [...doc.querySelectorAll('.education-grid > div')].map((el) => el.textContent.trim()),
        internships: [...doc.querySelectorAll('.internships-section .project-title, .internships-section .company-title')].map((el) => el.textContent.trim()),
        projects: [...doc.querySelectorAll('.project-title')].map((el) => el.textContent.trim()),
        skillsColumnCount: getComputedStyle(doc.querySelector('.skills-list')).columnCount,
        skillsTextAlign: getComputedStyle(doc.querySelector('.skills-list li')).textAlign,
        text: doc.body?.innerText || ''
      };
    })()
  }));

  const missing = [];
  if (result.educationInputs.length !== 2) missing.push(`expected 2 education entries, got ${result.educationInputs.length}`);
  if (!result.educationInputs.includes('星河大学（本科）')) missing.push('missing template university entry');
  if (!result.internshipInputs.includes('哔哩哔哩技术有限公司（仅为示例演示）')) missing.push('missing Bilibili demo internship in editor');
  if (!result.internshipInputs.includes('华为技术有限公司（仅为示例演示）')) missing.push('missing Huawei demo internship in editor');
  if (!result.projectInputs.includes('Agent 工作台示例')) missing.push('missing generic demo project in editor');
  if (result.projectInputs.some((value) => value.includes(deprecatedProjectName))) missing.push('deprecated project should not be present in editor');
  if (result.preview?.name !== 'Alex Chen') missing.push(`preview loaded wrong template name: ${result.preview?.name}`);
  if (!result.preview?.photo?.includes('avatar-placeholder.svg')) missing.push(`preview did not use placeholder avatar: ${result.preview?.photo}`);
  if (!result.preview?.projects.includes('Agent 工作台示例')) missing.push('missing generic project in preview');
  if (result.preview?.text?.includes(deprecatedProjectName)) missing.push('deprecated project should not be present in preview');
  if (!result.preview?.text?.includes('github.com/example/agent-workbench')) missing.push('preview did not load generic project link');
  if (!result.preview?.text?.includes('alex.chen@example.com')) missing.push('preview did not load demo email from index.html');
  if (!result.preview?.text?.includes('工具调用编排')) missing.push('preview did not load demo bold internship content');
  if (!result.preview?.text?.includes('Template Project')) missing.push('preview did not load generic project badge');
  if (!result.preview?.text?.includes('mock provider')) missing.push('preview did not load template skills from index.html');
  if (result.preview?.skillsColumnCount !== '1') missing.push(`skills list is not single-column: ${result.preview?.skillsColumnCount}`);
  if (result.preview?.skillsTextAlign !== 'left' && result.preview?.skillsTextAlign !== 'start') missing.push(`skills list is not left-aligned: ${result.preview?.skillsTextAlign}`);
  if (result.projectInputs.includes('旧草稿项目')) missing.push('editor loaded stale localStorage draft');
  if (result.draftStorage !== null) missing.push('localStorage draft was not cleared after index load');
  if (errors.length) missing.push(`page errors: ${errors.join('; ')}`);
  const forbiddenPreviewTerms = [deprecatedProjectName, deprecatedAvatarFile];
  const leaked = forbiddenPreviewTerms.filter((needle) => result.preview?.text?.includes(needle) || JSON.stringify(result).includes(needle));
  if (leaked.length) missing.push(`forbidden template content leaked: ${leaked.join(', ')}`);

  console.log(JSON.stringify({ ...result, errors }, null, 2));
  if (missing.length) {
    throw new Error(missing.join('\n'));
  }
} finally {
  await browser.close();
}

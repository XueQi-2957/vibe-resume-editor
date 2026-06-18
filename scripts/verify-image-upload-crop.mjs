import { chromium } from 'playwright-core';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const testImage = path.join(repoRoot, 'assets', 'preview.png');

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true
});

try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('http://localhost:4173/editor.html', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#preview-frame');
  await page.waitForTimeout(700);

  const missing = [];

  const avatarInput = page.locator('input[data-image-upload="header.photo"]');
  if (await avatarInput.count() !== 1) missing.push('missing avatar image upload input');

  const projectLogoInput = page.locator('input[data-image-upload="projects.0.logo"]');
  if (await projectLogoInput.count() !== 1) missing.push('missing project logo upload input');

  if (!missing.length) {
    await avatarInput.setInputFiles(testImage);
    await page.waitForSelector('#image-crop-modal.show');
    const avatarModalState = await page.evaluate(() => ({
      title: document.querySelector('#image-crop-modal .crop-title')?.textContent || '',
      aspect: document.querySelector('#image-crop-modal input[name="crop-aspect"]:checked')?.value || ''
    }));
    if (!avatarModalState.title.includes('头像')) missing.push(`avatar crop modal title mismatch: ${avatarModalState.title}`);
    if (avatarModalState.aspect !== '3:4') missing.push(`avatar crop aspect mismatch: ${avatarModalState.aspect}`);
    await page.click('#confirm-crop-button');
    await page.waitForFunction(() => globalThis.eval('data.header.photo')?.startsWith('data:image/'));

    await projectLogoInput.setInputFiles(testImage);
    await page.waitForSelector('#image-crop-modal.show');
    const logoModalState = await page.evaluate(() => ({
      title: document.querySelector('#image-crop-modal .crop-title')?.textContent || '',
      aspect: document.querySelector('#image-crop-modal input[name="crop-aspect"]:checked')?.value || ''
    }));
    if (!logoModalState.title.includes('项目 logo')) missing.push(`project logo crop modal title mismatch: ${logoModalState.title}`);
    if (logoModalState.aspect !== '1:1') missing.push(`project logo crop aspect mismatch: ${logoModalState.aspect}`);
    await page.click('#confirm-crop-button');
    await page.waitForFunction(() => globalThis.eval('data.projects[0].logo')?.startsWith('data:image/'));
  }

  const result = await page.evaluate(() => {
    const doc = document.querySelector('#preview-frame')?.contentDocument;
    return {
      headerPhoto: globalThis.eval('data.header.photo') || '',
      projectLogo: globalThis.eval('data.projects[0].logo') || '',
      previewPhoto: doc?.querySelector('.profile-photo')?.getAttribute('src') || '',
      previewLogo: doc?.querySelector('.projects-section .project-logo')?.getAttribute('src') || '',
      modalVisible: document.querySelector('#image-crop-modal')?.classList.contains('show') || false
    };
  });

  if (!result.headerPhoto.startsWith('data:image/')) missing.push('avatar upload did not update data.header.photo');
  if (!result.projectLogo.startsWith('data:image/')) missing.push('project logo upload did not update data.projects[0].logo');
  if (!result.previewPhoto.startsWith('data:image/')) missing.push('preview avatar did not use uploaded image');
  if (!result.previewLogo.startsWith('data:image/')) missing.push('preview project logo did not use uploaded image');
  if (result.modalVisible) missing.push('crop modal stayed visible after confirming crop');
  if (errors.length) missing.push(`page errors: ${errors.join('; ')}`);

  console.log(JSON.stringify({ result, errors }, null, 2));
  if (missing.length) {
    throw new Error(missing.join('\n'));
  }
} finally {
  await browser.close();
}

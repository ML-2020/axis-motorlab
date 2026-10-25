import { chromium } from 'playwright-core';
import fs from 'node:fs';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = 'screenshots/integration';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));

await page.goto('https://axis-motorlab.pages.dev/', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForSelector('body:not(.is-loading)', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1000);
console.log('HOME_TITLE', await page.title());
console.log('HOME_BLENDER_LINK', await page.locator('.top-link[href="/blender/"]').count());
console.log('HOME_GITHUB_LINK', await page.locator('a[href="https://github.com/ML-2020/axis-motorlab"]').count());
await page.locator('#blender-film').scrollIntoViewIfNeeded();
await page.waitForFunction(() => {
  const img = document.querySelector('#blender-film img');
  return img && img.complete && img.naturalWidth > 0;
}, { timeout: 15000 });
await page.locator('#blender-film img').evaluate((img) => img.decode().catch(() => {}));
await page.waitForTimeout(300);
await page.locator('#blender-film').screenshot({ path: `${out}/production-home-feature.png` });

await page.goto('https://axis-motorlab.pages.dev/blender/', { waitUntil: 'networkidle', timeout: 45000 });
await page.waitForTimeout(800);
console.log('BLENDER_TITLE', await page.title());
const videoState = await page.locator('#demo-video').evaluate((v) => ({
  readyState: v.readyState,
  duration: v.duration,
  error: v.error ? v.error.code : null,
}));
console.log('VIDEO_STATE', JSON.stringify(videoState));
console.log('BLENDER_GITHUB_LINK', await page.locator('a[href="https://github.com/ML-2020/axis-motorlab"]').count());
const zipHref = await page.locator('a[href="AXIS_YE3_Blender_Scene.zip"]').first().getAttribute('href');
const zipResponse = await context.request.head('https://axis-motorlab.pages.dev/blender/AXIS_YE3_Blender_Scene.zip');
console.log('ZIP_STATUS', zipResponse.status(), zipResponse.headers()['content-type']);
await page.screenshot({ path: `${out}/production-blender-page.png` });
console.log('CONSOLE_ERRORS', JSON.stringify(errors));

await context.close();
await browser.close();
console.log('PRODUCTION_QA_DONE');

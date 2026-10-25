import { chromium } from 'playwright-core';
import fs from 'node:fs';

const chrome = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const out = 'screenshots/integration';
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ executablePath: chrome, headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
await page.goto('http://127.0.0.1:5182/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForSelector('body:not(.is-loading)', { timeout: 30000 }).catch(() => {});
await page.waitForTimeout(1200);
await page.screenshot({ path: `${out}/home-hero.png` });
const feature = page.locator('#blender-film');
await feature.scrollIntoViewIfNeeded();
await page.waitForTimeout(800);
await feature.screenshot({ path: `${out}/home-blender-card.png` });
const link = page.locator('.top-link[href="/blender/"]');
console.log('BLENDER_LINK_COUNT', await link.count());
await page.goto('http://127.0.0.1:5182/blender/', { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/blender-page-top.png` });
await page.screenshot({ path: `${out}/blender-page-full.png`, fullPage: true });
const videoState = await page.locator('#demo-video').evaluate((v) => ({
  readyState: v.readyState,
  networkState: v.networkState,
  duration: v.duration,
  paused: v.paused,
  error: v.error ? v.error.code : null,
}));
console.log('VIDEO_STATE', JSON.stringify(videoState));
console.log('CONSOLE_ERRORS', JSON.stringify(errors));
await browser.close();
console.log('SCREENSHOTS_DONE');

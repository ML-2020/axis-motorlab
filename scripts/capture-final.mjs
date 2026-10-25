import { chromium } from 'playwright-core';
import fs from 'node:fs';

const OUT = 'screenshots/final';
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false,
  args: ['--window-size=1940,1120', '--disable-infobars'],
});
const errors = [];

async function openPage(viewport, mobile = false) {
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: mobile ? 2 : 1,
    isMobile: mobile,
    hasTouch: mobile,
  });
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://127.0.0.1:5181/', { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.MOTORLAB?.state?.loaded === true, { timeout: 60000 });
  await page.waitForTimeout(2200);
  return page;
}

const shot = async (page, name) => {
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log('shot', name);
};

// Desktop 1600
let page = await openPage({ width: 1600, height: 960 });
await shot(page, '01-hero');
await page.evaluate(() => window.MOTORLAB.goToChapter('anatomy'));
await page.waitForTimeout(1800);
await shot(page, '02-anatomy');
await page.evaluate(() => window.MOTORLAB.goToChapter('explode'));
await page.waitForTimeout(1400);
await page.evaluate(() => window.MOTORLAB.setExplodeScroll(1));
await page.waitForTimeout(1500);
await shot(page, '03-exploded');
await page.evaluate(() => window.MOTORLAB.goToChapter('parts'));
await page.waitForTimeout(2600);
await shot(page, '04-parts');
await page.evaluate(() => window.MOTORLAB.goToChapter('operation'));
await page.waitForTimeout(3600);
await shot(page, '05-operation');
await page.evaluate(() => window.MOTORLAB.goToChapter('specs'));
await page.waitForTimeout(1600);
await shot(page, '06-specs');
for (const [name, selector, offset] of [
  ['07-chart', '.curves-sheet', -90],
  ['08-dimensions', '.dimensions-sheet', -90],
  ['09-references', '.evidence-sheet', -90],
]) {
  await page.evaluate(({ selector, offset }) => {
    const el = document.querySelector(selector);
    window.scrollTo(0, el.getBoundingClientRect().top + scrollY + offset);
  }, { selector, offset });
  await page.waitForTimeout(1200);
  await shot(page, name);
}
await page.close();

// 1920 x 1080
page = await openPage({ width: 1920, height: 1080 });
await shot(page, '10-hero-1920');
await page.evaluate(() => window.MOTORLAB.goToChapter('explode'));
await page.waitForTimeout(1400);
await page.evaluate(() => window.MOTORLAB.setExplodeScroll(1));
await page.waitForTimeout(1500);
await shot(page, '11-exploded-1920');
await page.close();

// Mobile 390 x 844
page = await openPage({ width: 390, height: 844 }, true);
await shot(page, '12-mobile-hero');
await page.evaluate(() => window.MOTORLAB.goToChapter('anatomy'));
await page.waitForTimeout(1700);
await shot(page, '13-mobile-anatomy');
await page.evaluate(() => window.MOTORLAB.goToChapter('explode'));
await page.waitForTimeout(1300);
await page.evaluate(() => window.MOTORLAB.setExplodeScroll(1));
await page.waitForTimeout(1400);
await shot(page, '14-mobile-exploded');
await page.evaluate(() => window.MOTORLAB.goToChapter('parts'));
await page.waitForTimeout(2400);
await shot(page, '15-mobile-parts');
await page.evaluate(() => window.MOTORLAB.goToChapter('operation'));
await page.waitForTimeout(3400);
await shot(page, '16-mobile-operation');
await page.evaluate(() => window.MOTORLAB.goToChapter('specs'));
await page.waitForTimeout(1600);
await page.evaluate(() => {
  const el = document.querySelector('.curves-sheet');
  window.scrollTo(0, el.getBoundingClientRect().top + scrollY - 72);
});
await page.waitForTimeout(1000);
await shot(page, '17-mobile-chart');
await page.close();

console.log(JSON.stringify({ errors }, null, 2));
await browser.close();

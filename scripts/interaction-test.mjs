import { chromium } from 'playwright-core';

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: false,
  args: ['--window-size=1620,1040', '--disable-infobars'],
});
const page = await browser.newPage({ viewport: { width: 1600, height: 960 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const results = [];
const check = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${name}${detail ? ` — ${detail}` : ''}`);
};

await page.goto('http://127.0.0.1:5180/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.MOTORLAB?.state?.loaded === true, { timeout: 60000 });
await page.waitForTimeout(2200);
check('loader hidden', await page.evaluate(() => getComputedStyle(document.querySelector('#loading-screen')).visibility === 'hidden'));
check('22 parts loaded', (await page.evaluate(() => window.MOTORLAB.stage.motor.parts.size)) === 22);

// Start the cinematic exploded sequence from the hero CTA
await page.click('#start-explode');
await page.waitForTimeout(2300);
const mid = await page.evaluate(() => ({
  chapter: window.MOTORLAB.state.chapter,
  explode: window.MOTORLAB.state.explode,
  playing: window.MOTORLAB.state.autoPlaying,
  scrollY,
}));
console.log('after CTA', mid);
check('CTA enters exploded chapter', mid.chapter === 'explode');
await page.waitForTimeout(4300);
const end = await page.evaluate(() => ({
  chapter: window.MOTORLAB.state.chapter,
  explode: window.MOTORLAB.state.explode,
  target: window.MOTORLAB.state.explodeTarget,
  playing: window.MOTORLAB.state.autoPlaying,
}));
console.log('after autoplay', end);
check('autoplay reaches 100%', end.explode > 0.97 && !end.playing, JSON.stringify(end));
check('callouts visible', await page.evaluate(() => document.querySelectorAll('.callout:not([style*="display: none"])').length > 4));

// Toggle labels
await page.click('#toggle-labels');
check('labels toggle off', await page.evaluate(() => !document.querySelector('#callout-layer').classList.contains('labels-on')));
await page.click('#toggle-labels');

// Move slider to ~50%
await page.evaluate(() => {
  const slider = document.querySelector('#explode-range');
  slider.value = 500;
  slider.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(1200);
const half = await page.evaluate(() => ({ explode: window.MOTORLAB.state.explode, target: window.MOTORLAB.state.explodeTarget, value: document.querySelector('#explode-range').value }));
console.log('slider', half);
check('slider scrubs exploded state', Math.abs(half.target - 0.5) < 0.03, JSON.stringify(half));

// Reset and open an annotated part
await page.evaluate(() => {
  const slider = document.querySelector('#explode-range');
  slider.value = 1000;
  slider.dispatchEvent(new Event('input', { bubbles: true }));
});
await page.waitForTimeout(900);
const calloutId = await page.evaluate(() => {
  const c = [...document.querySelectorAll('.callout')].find((el) => getComputedStyle(el).display !== 'none');
  return c?.dataset.partId ?? null;
});
await page.evaluate((id) => document.querySelector(`.callout[data-part-id="${id}"]`)?.click(), calloutId);
await page.waitForTimeout(1800);
const partsState = await page.evaluate(() => ({
  chapter: window.MOTORLAB.state.chapter,
  selected: window.MOTORLAB.explorer?.selectedId,
  detailName: document.querySelector('.part-detail-name')?.textContent,
  activeVisible: (() => {
    const row = document.querySelector('.part-row.active');
    const list = document.querySelector('#parts-list');
    if (!row || !list) return false;
    const a = row.getBoundingClientRect();
    const b = list.getBoundingClientRect();
    return a.top >= b.top - 4 && a.bottom <= b.bottom + 4;
  })(),
}));
console.log('parts', partsState, 'callout', calloutId);
check('callout opens part dossier', partsState.chapter === 'parts' && !!partsState.detailName);
check('active part row visible', partsState.activeVisible);

// Click another row
await page.evaluate(() => document.querySelectorAll('.part-row')[17]?.click());
await page.waitForTimeout(600);
const rowClick = await page.evaluate(() => ({
  selected: window.MOTORLAB.explorer?.selectedId,
  name: document.querySelector('.part-detail-name')?.textContent,
  highlight: window.MOTORLAB.stage.motor.selected,
}));
console.log('row click', rowClick);
check('part row updates dossier + highlight', rowClick.highlight === rowClick.selected && !!rowClick.name);

// Focus camera
await page.evaluate(() => document.querySelector('[data-action="focus"]')?.click());
await page.waitForTimeout(1500);
check('focus action starts camera move', await page.evaluate(() => {
  const s = window.MOTORLAB.stage;
  return Math.abs(s.camera.position.x - s.controls.target.x) + Math.abs(s.camera.position.z - s.controls.target.z) > 0.3;
}));

// Operation
await page.evaluate(() => window.MOTORLAB.goToChapter('operation'));
await page.waitForTimeout(3600);
const op = await page.evaluate(() => ({
  chapter: window.MOTORLAB.state.chapter,
  runMix: window.MOTORLAB.stage.runMix,
  cutawayMix: window.MOTORLAB.stage.cutawayMix,
  rpm: document.querySelector('#telemetry-rpm')?.textContent,
  xrayActive: document.querySelector('#toggle-xray')?.classList.contains('active'),
}));
console.log('operation', op);
check('operation runs at rated speed', op.runMix > 0.9 && op.rpm === '1440');
check('x-ray cutaway active', op.cutawayMix > 0.8 && op.xrayActive);

await page.click('#toggle-xray');
await page.waitForTimeout(900);
const cutOff = await page.evaluate(() => window.MOTORLAB.stage.cutawayMix);
check('x-ray toggles off', cutOff < 0.2, String(cutOff));
await page.click('#toggle-run');
await page.waitForTimeout(1200);
const stopped = await page.evaluate(() => ({ runMix: window.MOTORLAB.stage.runMix, status: document.querySelector('#telemetry-status')?.textContent }));
console.log('stopped', stopped);
check('run toggle stops rotor', stopped.runMix < 0.3);
await page.click('#toggle-run');
await page.click('#toggle-xray');

// Specs chart axis sanity
await page.evaluate(() => window.MOTORLAB.goToChapter('specs'));
await page.waitForTimeout(2400);
const chart = await page.evaluate(() => {
  const svg = document.querySelector('#performance-chart svg');
  const texts = [...svg.querySelectorAll('.axis-text')].map((t) => ({ text: t.textContent, x: t.getAttribute('x') }));
  return { hasChart: !!svg, texts: texts.slice(0, 12), litCount: document.querySelectorAll('.literature-item').length };
});
console.log('chart', chart);
check('performance chart rendered', chart.hasChart && chart.litCount === 12);

const widths = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth }));
check('no horizontal overflow', widths.scrollWidth <= widths.innerWidth + 1, JSON.stringify(widths));
check('no page/console errors', errors.length === 0, errors.join(' | ').slice(0, 300));

// Loading screen capture
await page.evaluate(() => {
  window.scrollTo(0, 0);
  document.body.classList.remove('loaded');
  document.body.classList.add('is-loading');
});
await page.waitForTimeout(250);
await page.screenshot({ path: 'screenshots/loader.png' });
console.log(JSON.stringify(results, null, 2));
await browser.close();
if (results.some((r) => !r.ok)) process.exitCode = 1;

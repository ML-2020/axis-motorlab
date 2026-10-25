import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './style.css';
import * as DATA from './data/motor-data.js';
import { Stage } from './scene/stage.js';
import { PartExplorer } from './ui/parts.js';
import { CalloutManager, HotspotManager } from './ui/labels.js';
import { buildPerformanceChartSVG, buildDimensionDrawingSVG, Sparkline } from './ui/charts.js';
import { clamp, easeInOutCubic } from './model/utils.js';

const { MOTOR, COMPONENTS, PERFORMANCE, DIMENSIONS, LITERATURE } = DATA;
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const motionReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = {
  chapter: 'hero',
  selectedId: null,
  pendingSelection: null,
  labels: true,
  run: true,
  xray: true,
  explode: 0,
  explodeTarget: 0,
  autoPlaying: false,
  loaded: false,
  autoScrollRaf: null,
  lastStage: null,
  stageChange: 0,
};

let stage = null;
let explorer = null;
let callouts = null;
let hotspots = null;
let sparkline = null;
let sectionMetrics = [];
let docHeight = 0;
let lastTime = performance.now();
let toastTimer = null;
let chartObserver = null;
let hoverData = null;
let autoScrollState = null;
let autoPlayState = null;
let resizeTimer = null;
let lastHudStep = -1;
let sparkleLast = 0;

const elements = {};

document.addEventListener('DOMContentLoaded', () => {});
boot();

async function boot() {
  cacheElements();
  setLoader(5, '解析工程数据…');
  hydrateStaticContent();
  await wait(110);
  setLoader(18, '建立 132S 机座几何…');
  await nextFrame();
  measureSections();

  try {
    stage = new Stage(elements.canvas, DATA);
  } catch (error) {
    console.error(error);
    setLoader(100, 'WebGL 初始化失败 · 请检查浏览器硬件加速');
    elements.loaderStatus.textContent = 'WebGL 初始化失败，无法生成三维模型';
    return;
  }
  setLoader(58, '装配 22 个工程部件…');
  await nextFrame();
  setupPartExplorer();
  setupAnnotations();
  setLoader(82, '布置材质、灯光与标注…');
  await nextFrame();
  setupToggles();
  setupScrollControls();
  setupCursor();
  setupChartsReveal();
  measureSections();
  window.addEventListener('resize', handleResize, { passive: true });
  window.addEventListener('scroll', handleScroll, { passive: true });

  stage.onHover = handleHover;
  stage.onSelect = handleSceneSelect;
  stage.update(0.016, 0);
  setLoader(100, '模型就绪 · 启动交互');
  await wait(motionReduced ? 200 : 620);
  finishLoading();
  startLoop();
}

function cacheElements() {
  elements.loader = $('#loading-screen');
  elements.loaderProgress = $('#loader-progress');
  elements.loaderPercent = $('#loader-percent');
  elements.loaderStatus = $('#loader-status');
  elements.canvas = $('#scene');
  elements.heroStats = $('#hero-stats');
  elements.partsList = $('#parts-list');
  elements.partsFilters = $('#parts-filters');
  elements.partDetail = $('#part-detail-inner');
  elements.visibleCount = $('#parts-visible-count');
  elements.calloutLayer = $('#callout-layer');
  elements.calloutSvg = $('#callout-svg');
  elements.calloutItems = $('#callout-items');
  elements.hotspotLayer = $('#hotspot-layer');
  elements.explodeRange = $('#explode-range');
  elements.scrubValue = $('#scrub-value');
  elements.explodeCount = $('#explode-count');
  elements.stageKicker = $('#stage-kicker');
  elements.stageTitle = $('#stage-title');
  elements.stageCopy = $('#stage-copy');
  elements.autoPlay = $('#auto-play');
  elements.labelsButton = $('#toggle-labels');
  elements.railProgress = $('#rail-progress');
  elements.globalProgress = $('#global-progress');
  elements.hoverTip = $('#hover-tip');
  elements.hoverIndex = $('#hover-index');
  elements.hoverName = $('#hover-name');
  elements.partToast = $('#part-toast');
  elements.partToastIndex = $('#part-toast-index');
  elements.partToastName = $('#part-toast-name');
  elements.partToastCat = $('#part-toast-cat');
  elements.partToastAction = $('#part-toast-action');
  elements.cursor = $('#cursor');
  elements.runToggle = $('#toggle-run');
  elements.xrayToggle = $('#toggle-xray');
  elements.telemetryStatus = $('#telemetry-status');
  elements.telemetryRpm = $('#telemetry-rpm');
  elements.telemetryTorque = $('#telemetry-torque');
  elements.telemetryEff = $('#telemetry-eff');
  elements.telemetryCurrent = $('#telemetry-current');
  elements.telemetryTemp = $('#telemetry-temp');
  elements.sparkCanvas = $('#telemetry-spark');
  elements.selectionMarker = $('#selection-marker');
  elements.selectionName = $('#selection-name');
}

function setLoader(percent, status) {
  const value = Math.round(clamp(percent, 0, 100));
  if (elements.loaderProgress) elements.loaderProgress.style.width = `${value}%`;
  if (elements.loaderPercent) elements.loaderPercent.textContent = String(value).padStart(2, '0');
  if (status && elements.loaderStatus) elements.loaderStatus.textContent = status;
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function finishLoading() {
  if (state.loaded) return;
  state.loaded = true;
  document.body.classList.remove('is-loading');
  document.body.classList.add('loaded');
  setLoader(100, '系统就绪 / READY');
  measureSections();
}

function hydrateStaticContent() {
  elements.heroStats.innerHTML = MOTOR.heroStats
    .map(
      (stat) => `<div class="hero-stat"><b>${stat.value}<em>${stat.unit}</em></b><span>${stat.label}</span></div>`,
    )
    .join('');

  const ratingRows = [
    ['额定功率', `${MOTOR.rating.powerKw}`, 'kW'],
    ['额定电压', `${MOTOR.rating.voltageV}`, 'V'],
    ['额定电流', `${MOTOR.rating.currentA}`, 'A'],
    ['频率 / 极数', `${MOTOR.rating.frequencyHz} / ${MOTOR.rating.poles}`, 'Hz / P'],
    ['额定转速', `${MOTOR.rating.speedRpm}`, 'r/min'],
    ['额定转矩', `${MOTOR.rating.torqueNm}`, 'N·m'],
    ['效率', `${MOTOR.rating.efficiencyPct}`, '%'],
    ['功率因数', `${MOTOR.rating.powerFactor}`, 'cosφ'],
    ['防护等级', `${MOTOR.rating.protection}`, 'IP'],
    ['冷却方式', `${MOTOR.rating.cooling}`, 'IC'],
    ['安装方式', `${MOTOR.rating.mounting}`, 'IM'],
    ['绝缘 / 温升', `${MOTOR.rating.insulation} / ${MOTOR.rating.tempRise}`, '级'],
    ['工作制', `${MOTOR.rating.duty}`, '连续'],
    ['能效等级', `${MOTOR.rating.efficiencyClass}`, 'IE'],
    ['质量', `${MOTOR.rating.weightKg}`, 'kg'],
    ['噪声', `${MOTOR.rating.noiseDb}`, 'dB(A)'],
  ];
  $('#rating-table').innerHTML = ratingRows
    .map(
      ([label, value, unit]) =>
        `<div class="rating-cell"><span>${label}</span><b>${value}<small>${unit}</small></b></div>`,
    )
    .join('');
  $('#spec-model').textContent = MOTOR.model;
  $('#np-model').textContent = MOTOR.model;

  $('#performance-chart').innerHTML = buildPerformanceChartSVG(PERFORMANCE);
  $('#dimension-drawing').innerHTML = buildDimensionDrawingSVG(DIMENSIONS);
  $('#notes-intro').textContent = MOTOR.intro;
  $('#design-notes').innerHTML = MOTOR.designNotes
    .map(
      (note, index) => `<article class="design-note">
        <span>N.${String(index + 1).padStart(2, '0')}</span>
        <p>${note}</p>
      </article>`,
    )
    .join('');

  $('#literature-list').innerHTML = LITERATURE.map((source) => {
    const link = source.url
      ? `<a href="${source.url}" target="_blank" rel="noreferrer">查看原文 / SOURCE ↗</a>`
      : '';
    return `<article class="literature-item">
      <div class="literature-top"><span class="literature-type">${source.type}</span><span>${source.year}</span><span>${source.org ?? ''}</span></div>
      <h4>${source.title}</h4>
      <p>${source.supports ?? ''}</p>
      ${link}
    </article>`;
  }).join('');

  $$('#system-index [data-system]').forEach((node) => {
    const count = COMPONENTS.filter((component) => component.category === node.dataset.system).length;
    const label = node.querySelector('b');
    if (label) label.textContent = String(count).padStart(2, '0');
  });
}

function setupPartExplorer() {
  explorer = new PartExplorer({
    components: COMPONENTS,
    motor: stage.motor,
    stage,
    listEl: elements.partsList,
    filtersEl: elements.partsFilters,
    detailEl: elements.partDetail,
    visibleCountEl: elements.visibleCount,
    onSelect: (component) => {
      state.selectedId = component.id;
    },
  });
  explorer.select('stator-winding', { scroll: false });

  $$('#system-index [data-system]').forEach((node) => {
    node.addEventListener('click', () => {
      goToParts(null, node.dataset.system);
    });
  });
  $('#part-toast').addEventListener('click', () => {
    if (state.selectedId) goToParts(state.selectedId);
  });
}

function setupAnnotations() {
  callouts = new CalloutManager({
    motor: stage.motor,
    stage,
    content: DATA,
    layer: elements.calloutLayer,
    svg: elements.calloutSvg,
    itemsEl: elements.calloutItems,
    onSelect: (id) => goToParts(id),
  });
  callouts.setLabelsEnabled(state.labels);

  hotspots = new HotspotManager({
    motor: stage.motor,
    stage,
    layer: elements.hotspotLayer,
    content: DATA,
    onSelect: (id) => goToParts(id),
  });
}

function setupToggles() {
  elements.labelsButton.addEventListener('click', () => {
    state.labels = !state.labels;
    elements.labelsButton.setAttribute('aria-pressed', String(state.labels));
    elements.labelsButton.textContent = state.labels ? '标注 ON' : '标注 OFF';
    callouts.setLabelsEnabled(state.labels);
  });

  elements.runToggle.addEventListener('click', () => {
    state.run = !state.run;
    elements.runToggle.classList.toggle('active', state.run);
    elements.runToggle.setAttribute('aria-pressed', String(state.run));
    stage.setRunning(state.run);
    updateTelemetryStatus();
  });

  elements.xrayToggle.addEventListener('click', () => {
    state.xray = !state.xray;
    elements.xrayToggle.classList.toggle('active', state.xray);
    elements.xrayToggle.setAttribute('aria-pressed', String(state.xray));
    stage.setCutaway(state.xray);
  });

  updateTelemetryStatus();
}

function updateTelemetryStatus() {
  if (!elements.telemetryStatus) return;
  elements.telemetryStatus.innerHTML = `<i></i>${state.run ? 'RUNNING' : 'STOPPED'}`;
  elements.telemetryStatus.classList.toggle('stopped', !state.run);
}

function setupScrollControls() {
  elements.explodeRange.addEventListener('input', () => {
    cancelAutoPlay();
    const p = Number(elements.explodeRange.value) / 1000;
    setExplodeScroll(p, false);
  });
  elements.explodeRange.addEventListener('change', () => {
    cancelAutoPlay();
  });
  elements.autoPlay.addEventListener('click', () => {
    if (state.autoPlaying) {
      cancelAutoPlay();
      return;
    }
    playExplosion();
  });
  $('#reset-explode').addEventListener('click', () => {
    cancelAutoPlay();
    setExplodeScroll(0, true);
  });

  $$('#explode-steps div').forEach((node) => {
    node.addEventListener('click', () => {
      cancelAutoPlay();
      const step = Number(node.dataset.step);
      setExplodeScroll([0.02, 0.34, 0.66, 0.99][step] ?? 0, true);
    });
  });

  $$('[data-scroll]').forEach((link) => {
    link.addEventListener('click', (event) => {
      event.preventDefault();
      const href = link.getAttribute('href');
      if (!href?.startsWith('#')) return;
      const id = href.slice(1);
      const autoplay = link.dataset.autoplay === 'explode';
      goToChapter(id, { autoplay });
    });
  });

  window.addEventListener('wheel', () => {
    if (state.autoPlaying) cancelAutoPlay();
  }, { passive: true });
  window.addEventListener('touchstart', () => {
    if (state.autoPlaying) cancelAutoPlay();
  }, { passive: true });
  window.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key) && state.autoPlaying) {
      cancelAutoPlay();
    }
  });
}

function setupChartsReveal() {
  chartObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          chartObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.16 },
  );
  $$('.chart-wrap, .specs-intro, .spec-sheet').forEach((el) => chartObserver.observe(el));
  sparkline = new Sparkline(elements.sparkCanvas);
}

function setupCursor() {
  if (window.matchMedia('(pointer: coarse)').matches) return;
  let raf = null;
  let cx = 0;
  let cy = 0;
  document.addEventListener('pointermove', (event) => {
    cx = event.clientX;
    cy = event.clientY;
    if (raf) return;
    raf = requestAnimationFrame(() => {
      raf = null;
      elements.cursor.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
      elements.cursor.classList.add('visible');
    });
    const interactive = event.target.closest?.('a, button, input, .part-row, .hotspot, .callout');
    elements.cursor.classList.toggle('grow', !!interactive);
  });
  document.addEventListener('pointerleave', () => elements.cursor.classList.remove('visible'));
}

function handleHover(hit, x, y) {
  hoverData = hit;
  if (!hit) {
    elements.hoverTip.classList.remove('visible');
    elements.cursor?.classList.remove('grow');
    return;
  }
  const component = COMPONENTS.find((item) => item.id === hit.id);
  if (!component) return;
  elements.hoverIndex.textContent = component.index;
  elements.hoverName.textContent = component.name;
  const left = clamp(x, 12, window.innerWidth - 230);
  const top = clamp(y, 12, window.innerHeight - 60);
  elements.hoverTip.style.left = `${left}px`;
  elements.hoverTip.style.top = `${top}px`;
  elements.hoverTip.classList.add('visible');
  elements.cursor?.classList.add('grow');
}

function handleSceneSelect(hit) {
  if (!hit?.id) return;
  const component = COMPONENTS.find((item) => item.id === hit.id);
  if (!component) return;
  if (state.chapter === 'parts') {
    explorer.select(component.id);
    return;
  }
  if (state.chapter === 'specs') return;
  state.selectedId = component.id;
  stage.motor.highlight(component.id);
  showToast(component);
}

function showToast(component) {
  if (!component) return;
  elements.partToastIndex.textContent = component.index;
  elements.partToastName.textContent = component.name;
  elements.partToastCat.textContent = `${component.category} / ${component.nameEn}`;
  elements.partToast.classList.add('visible');
  elements.partToast.setAttribute('aria-hidden', 'false');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.partToast.classList.remove('visible');
    elements.partToast.setAttribute('aria-hidden', 'true');
  }, 4200);
}

function goToParts(id = null, category = null) {
  const target = sectionMetrics.find((section) => section.chapter === 'parts');
  if (!target) return;
  if (id) {
    explorer.category = '全部';
    for (const button of elements.partsFilters.children) {
      button.classList.toggle('active', button.dataset.category === '全部');
    }
    explorer.applyFilter(false);
    explorer.select(id, { scroll: false });
  }
  if (category) explorer.setCategory(category);
  if (state.chapter === 'parts') {
    if (id) explorer.select(id);
    if (id) setTimeout(() => stage.focusPart(id), 80);
    return;
  }
  smoothScrollTo(target.top, motionReduced ? 0 : 1050, () => {
    if (id) {
      explorer.select(id);
      setTimeout(() => stage.focusPart(id), 280);
    }
  });
}

function goToChapter(id, { autoplay = false } = {}) {
  const target = sectionMetrics.find((section) => section.el.id === id);
  if (!target) return;
  cancelAutoPlay();
  smoothScrollTo(target.top, motionReduced ? 0 : 980, () => {
    if (autoplay) setTimeout(() => playExplosion(), 180);
  });
}

function smoothScrollTo(targetY, duration = 900, onDone = null) {
  cancelAutoScroll();
  const startY = window.scrollY;
  const endY = clamp(targetY, 0, docHeight - window.innerHeight);
  const delta = endY - startY;
  if (Math.abs(delta) < 2 || duration <= 0 || motionReduced) {
    window.scrollTo(0, endY);
    onDone?.();
    return;
  }
  const started = performance.now();
  autoScrollState = { raf: null, onDone };
  const tick = (now) => {
    const t = clamp((now - started) / duration);
    window.scrollTo(0, startY + delta * easeInOutCubic(t));
    if (t < 1) {
      autoScrollState.raf = requestAnimationFrame(tick);
    } else {
      const cb = autoScrollState.onDone;
      autoScrollState = null;
      cb?.();
    }
  };
  autoScrollState.raf = requestAnimationFrame(tick);
}

function cancelAutoScroll() {
  if (autoScrollState?.raf) cancelAnimationFrame(autoScrollState.raf);
  autoScrollState = null;
}

function playExplosion() {
  if (!state.loaded) return;
  if (state.chapter !== 'explode') {
    const target = sectionMetrics.find((section) => section.chapter === 'explode');
    if (!target) return;
    smoothScrollTo(target.top, motionReduced ? 0 : 850, () => {
      setTimeout(() => startExplosionPlayback(), 120);
    });
    return;
  }
  startExplosionPlayback();
}

function startExplosionPlayback() {
  cancelAutoPlay();
  const section = sectionMetrics.find((item) => item.chapter === 'explode');
  if (!section) return;
  const current = getExplodeProgress();
  const forward = current < 0.985;
  const to = forward ? 1 : 0;
  const distance = Math.abs(to - current);
  const duration = Math.max(1200, distance * 3600);
  const startY = window.scrollY;
  const targetY = section.top + to * Math.max(1, section.height - window.innerHeight);
  const startTime = performance.now();
  state.autoPlaying = true;
  elements.autoPlay.classList.add('is-playing');
  elements.autoPlay.setAttribute('aria-label', '暂停分解演示');
  autoPlayState = { raf: null };

  const cancel = () => {
    if (!state.autoPlaying) return;
    cancelAutoPlay();
  };
  const onUser = () => cancel();
  window.addEventListener('wheel', onUser, { passive: true, once: true });
  window.addEventListener('touchstart', onUser, { passive: true, once: true });
  window.addEventListener('keydown', onUser, { once: true });

  const tick = (now) => {
    const t = clamp((now - startTime) / duration);
    window.scrollTo(0, startY + (targetY - startY) * easeInOutCubic(t));
    if (t < 1) {
      autoPlayState = { raf: requestAnimationFrame(tick), onUser };
    } else {
      autoPlayState = null;
      state.autoPlaying = false;
      elements.autoPlay.classList.remove('is-playing');
      elements.autoPlay.setAttribute('aria-label', '自动分解');
      window.removeEventListener('wheel', onUser);
      window.removeEventListener('touchstart', onUser);
      window.removeEventListener('keydown', onUser);
    }
  };
  autoPlayState = { raf: requestAnimationFrame(tick), onUser };
}

function cancelAutoPlay() {
  if (autoPlayState?.raf) cancelAnimationFrame(autoPlayState.raf);
  if (autoPlayState?.onUser) {
    window.removeEventListener('wheel', autoPlayState.onUser);
    window.removeEventListener('touchstart', autoPlayState.onUser);
    window.removeEventListener('keydown', autoPlayState.onUser);
  }
  autoPlayState = null;
  state.autoPlaying = false;
  elements.autoPlay?.classList.remove('is-playing');
  elements.autoPlay?.setAttribute('aria-label', '自动分解');
}

function setExplodeScroll(progress, smooth = false) {
  const section = sectionMetrics.find((item) => item.chapter === 'explode');
  if (!section) return;
  const range = Math.max(1, section.height - window.innerHeight);
  const y = section.top + clamp(progress) * range;
  if (smooth) smoothScrollTo(y, motionReduced ? 0 : 500);
  else window.scrollTo(0, y);
}

function getExplodeProgress() {
  const section = sectionMetrics.find((item) => item.chapter === 'explode');
  if (!section) return 0;
  const range = Math.max(1, section.height - window.innerHeight);
  return clamp((window.scrollY - section.top) / range);
}

function measureSections() {
  const sectionEls = $$('#content > section');
  sectionMetrics = sectionEls.map((el) => {
    const rect = el.getBoundingClientRect();
    return {
      el,
      chapter: el.dataset.chapter,
      top: rect.top + window.scrollY,
      height: rect.height,
    };
  });
  docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
}

function handleResize() {
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    measureSections();
    sparkline?.resize();
  }, 160);
}

function handleScroll() {
  if (state.loaded) updateScrollChrome();
}

function detectChapter() {
  const probe = window.scrollY + window.innerHeight * 0.5;
  let chapter = sectionMetrics[0]?.chapter ?? 'hero';
  for (const section of sectionMetrics) {
    if (probe >= section.top) chapter = section.chapter;
  }
  return chapter;
}

function onChapterChange(chapter) {
  const previous = state.chapter;
  if (previous === 'parts' && chapter !== 'parts') {
    explorer?.deactivate();
  }
  state.chapter = chapter;
  document.body.dataset.chapter = chapter;
  updateChrome(chapter);

  const stageMode = chapter === 'specs' ? 'data' : chapter;
  stage?.setMode(stageMode);

  if (chapter === 'parts') {
    stage?.setRunning(false);
    stage?.setCutaway(false);
    explorer?.activate();
    if (state.pendingSelection) {
      explorer?.select(state.pendingSelection);
      state.pendingSelection = null;
    }
    stage?.motor.highlight(explorer?.selectedId ?? null);
  } else if (chapter === 'operation') {
    stage?.motor.highlight(null);
    stage?.setRunning(state.run);
    stage?.setCutaway(state.xray);
    updateTelemetryStatus();
  } else {
    stage?.setRunning(false);
    stage?.setCutaway(false);
    if (chapter !== 'parts') stage?.motor.highlight(null);
  }

  if (chapter !== 'anatomy') {
    elements.hotspotLayer.classList.remove('is-visible');
  }
  if (chapter === 'specs') {
    measureSections();
  }
  hoverData = null;
  elements.hoverTip.classList.remove('visible');
}

function updateChrome(chapter) {
  const railKey = chapter;
  $$('#topbar [data-nav]').forEach((link) => {
    link.classList.toggle('active', link.dataset.nav === chapter);
  });
  $$('.chapter-rail li').forEach((item) => {
    item.classList.toggle('active', item.dataset.rail === railKey);
  });
}

function updateScrollChrome() {
  const max = Math.max(1, docHeight - window.innerHeight);
  const progress = clamp(window.scrollY / max);
  if (elements.globalProgress) elements.globalProgress.style.width = `${(progress * 100).toFixed(2)}%`;
  if (elements.railProgress) elements.railProgress.style.height = `${(progress * 100).toFixed(2)}%`;
}

function updateExplodeTarget(chapter) {
  let target = 0;
  if (chapter === 'parts') target = 1;
  else if (chapter === 'explode') target = getExplodeProgress();
  state.explodeTarget = target;
}

function updateExplodeHud() {
  if (state.chapter !== 'explode') return;
  const p = state.explodeTarget;
  const pct = Math.round(p * 100);
  if (document.activeElement !== elements.explodeRange) {
    elements.explodeRange.value = String(Math.round(p * 1000));
  }
  elements.explodeRange.style.setProperty('--fill', `${pct}%`);
  elements.scrubValue.textContent = `${String(pct).padStart(2, '0')}%`;
  const count = [...stage.motor.parts.values()].filter(
    (part) => p > part.delay + part.duration * 0.08,
  ).length;
  elements.explodeCount.textContent = String(count).padStart(2, '0');
  const step = p < 0.24 ? 0 : p < 0.52 ? 1 : p < 0.8 ? 2 : 3;
  if (step !== lastHudStep) {
    lastHudStep = step;
    const data = [
      {
        kicker: 'STAGE 01 / 04',
        title: '释放外部总成',
        copy: '风扇罩、冷却风扇与接线盒盖首先沿轴向脱离，露出机座散热筋与支承结构。',
      },
      {
        kicker: 'STAGE 02 / 04',
        title: '退出支承链',
        copy: '前后端盖、轴承盖与深沟球轴承沿轴线逐一退出，波形弹簧与轴伸油封同时显现。',
      },
      {
        kicker: 'STAGE 03 / 04',
        title: '暴露电磁核心',
        copy: '定子铁心、36 槽绕组、转子铁心与铸铝鼠笼在空间中展开，空气隙两侧的结构完整可见。',
      },
      {
        kicker: 'STAGE 04 / 04',
        title: '22 个部件，一览无余',
        copy: '机座抬升，转轴下沉，所有部件停留在各自的拆解位置。拖动模型或点击标注继续阅读。',
      },
    ][step];
    elements.stageKicker.textContent = data.kicker;
    elements.stageTitle.textContent = data.title;
    elements.stageCopy.textContent = data.copy;
    $$('#explode-steps div').forEach((node) => node.classList.toggle('active', Number(node.dataset.step) === step));
  }
}

function updateTelemetry(dt, realTime) {
  if (state.chapter !== 'operation' || !sparkline) return;
  const mix = stage?.runMix ?? 0;
  const rpm = MOTOR.rating.speedRpm * mix;
  elements.telemetryRpm.textContent = String(Math.round(rpm));
  elements.telemetryTorque.textContent = (MOTOR.rating.torqueNm * mix).toFixed(1);
  elements.telemetryEff.textContent = (MOTOR.rating.efficiencyPct * Math.min(1, mix * 1.08)).toFixed(1);
  elements.telemetryCurrent.textContent = (MOTOR.rating.currentA * mix).toFixed(1);
  elements.telemetryTemp.textContent = String(Math.round(62 * mix));
  sparkline.draw(mix, realTime);
}

function startLoop() {
  lastTime = performance.now();
  const loop = (now) => {
    const dt = clamp((now - lastTime) / 1000, 0, 0.05);
    lastTime = now;
    const realTime = now / 1000;

    if (state.loaded) {
      const chapter = detectChapter();
      if (chapter !== state.chapter) onChapterChange(chapter);
      updateExplodeTarget(chapter);
      const damped = stage.motor.currentExplode < 0 ? state.explodeTarget : state.explode;
      const next = damp(damped, state.explodeTarget, 12, dt);
      state.explode = Math.abs(next - state.explodeTarget) < 0.0005 ? state.explodeTarget : next;
      stage.motor.setExplode(state.explode);

      stage.update(dt, realTime);
      updateSelectionMarker();
      callouts?.update(state.explode);
      hotspots?.update();
      updateExplodeHud();
      updateTelemetry(dt, realTime);
      updateScrollChrome();
    }

    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function updateSelectionMarker() {
  if (!elements.selectionMarker) return;
  const show =
    state.chapter === 'parts' &&
    !!state.selectedId &&
    window.matchMedia('(pointer: fine)').matches;
  if (!show) {
    elements.selectionMarker.classList.remove('visible');
    return;
  }
  const component = COMPONENTS.find((item) => item.id === state.selectedId);
  const center = stage.motor.getWorldCenter(state.selectedId);
  const screen = stage.project(center);
  const detailRect = document.querySelector('.part-detail')?.getBoundingClientRect();
  const listRect = document.querySelector('.parts-index')?.getBoundingClientRect();
  const underDetail = detailRect && screen.x > detailRect.left - 6 && screen.y > detailRect.top - 25;
  const underList = listRect && screen.x < listRect.right + 18 && screen.y > listRect.top - 25 && screen.y < listRect.bottom + 20;
  if (
    !component ||
    !screen.visible ||
    screen.x < 0 ||
    screen.x > window.innerWidth ||
    screen.y < 92 ||
    screen.y > window.innerHeight - 70 ||
    underDetail ||
    underList
  ) {
    elements.selectionMarker.classList.remove('visible');
    return;
  }
  const flip = detailRect
    ? screen.x + 230 > detailRect.left
    : screen.x > window.innerWidth - 500;
  elements.selectionName.textContent = `${component.name} / ${component.index}`;
  elements.selectionMarker.classList.toggle('flip', flip);
  elements.selectionMarker.style.left = `${flip ? screen.x + 19 : screen.x}px`;
  elements.selectionMarker.style.top = `${screen.y}px`;
  elements.selectionMarker.classList.add('visible');
}

function damp(current, target, lambda, dt) {
  return target + (current - target) * Math.exp(-lambda * dt);
}

// Expose a small debug surface for QA tooling and experiments.
window.MOTORLAB = {
  get stage() { return stage; },
  get explorer() { return explorer; },
  get callouts() { return callouts; },
  get hotspots() { return hotspots; },
  state,
  data: DATA,
  goToChapter,
  goToParts,
  playExplosion,
  setExplodeScroll,
  getExplodeProgress,
  finishLoading,
};

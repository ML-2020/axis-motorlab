import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './photo.css';
import './scenes3d.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const revealTargets = $$('.section-head, .application-card, .method-head, .method-grid > div, .references');
revealTargets.forEach((el) => el.classList.add('is-visible'));

// ---------------------------------------------------------------------------
// Pump station operating-point model
// Q is treated as valve-controlled around the design point; H rises slightly
// as the discharge valve throttles. Hydraulic power is rho*g*Q*H.
// ---------------------------------------------------------------------------
const pump = {
  running: true,
  valve: 1,
  cutaway: false,
};

const ui = {
  start: $('#pump-start'),
  stop: $('#pump-stop'),
  cutaway: $('#pump-cutaway'),
  valve: $('#valve-slider'),
  valveOut: $('#valve-readout'),
  status: $('#pump-status'),
  flow: $('[data-live="pump-flow"]'),
  current: $('[data-live="pump-current"]'),
  load: $('#pump-load'),
  note: $('#console-note'),
};

function computePump() {
  const q = pump.running ? 90 * pump.valve : 0;
  const head = pump.running ? 12 * (1 + 0.25 * (1 - pump.valve)) : 0;
  const hydraulic = (1000 * 9.81 * q * head) / 3.6e6;
  const shaft = q > 0.1 ? hydraulic / 0.72 : pump.running ? 0.55 : 0;
  const load = Math.min(110, (shaft / 5.5) * 100);
  const current = pump.running ? 4.2 + 6.9 * Math.min(1.1, load / 100) : 0.3;
  return { q, head, hydraulic, shaft, load, current };
}

function refreshPumpUI() {
  const p = computePump();
  ui.valve.value = String(Math.round(pump.valve * 100));
  ui.valveOut.textContent = `${Math.round(pump.valve * 100)}%`;
  ui.status.textContent = pump.running ? 'RUNNING' : 'STOPPED';
  ui.status.style.color = pump.running ? 'var(--sage)' : 'var(--dim)';
  ui.start.classList.toggle('active', pump.running);
  ui.stop.classList.toggle('active', !pump.running);
  ui.cutaway.classList.toggle('active', pump.cutaway);
  ui.flow.textContent = String(Math.round(p.q));
  ui.current.textContent = p.current.toFixed(1);
  ui.load.textContent = String(Math.round(p.load));
  if (!pump.running) {
    ui.note.textContent = '停机 · 先关闭出口阀，再断开电机电源。';
  } else if (pump.valve < 0.04) {
    ui.note.textContent = '出口阀关闭 · 泵内再循环，不应长时间运行。';
  } else {
    ui.note.textContent = `Q ${Math.round(p.q)} m³/h · H ${p.head.toFixed(1)} m · 水力 ${p.hydraulic.toFixed(2)} kW · 轴功率约 ${p.shaft.toFixed(2)} kW · 负载 ${Math.round(p.load)}%`;
  }
  window.__axisPump?.setPumpState({
    running: pump.running,
    valve: pump.valve,
    cutaway: pump.cutaway,
  });
}

ui.start.addEventListener('click', () => { pump.running = true; refreshPumpUI(); });
ui.stop.addEventListener('click', () => { pump.running = false; refreshPumpUI(); });
ui.cutaway.addEventListener('click', () => { pump.cutaway = !pump.cutaway; refreshPumpUI(); });
ui.valve.addEventListener('input', () => { pump.valve = Number(ui.valve.value) / 100; refreshPumpUI(); });

// Set the initial state after the scene module has created the pump canvas.
requestAnimationFrame(() => {
  refreshPumpUI();
  window.__axisPump?.setPumpState({ running: true, valve: 1, cutaway: false });
});

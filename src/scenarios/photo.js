import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './photo.css';
import './scenes3d.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

// Keep editorial blocks visible immediately; the image and flow animations carry the motion.
const revealTargets = $$('.section-head, .application-card, .method-head, .method-grid > div, .references');
revealTargets.forEach((el) => el.classList.add('is-visible'));

const values = {
  'pump-flow': { base: 42, variance: 1.4, digits: 0 },
  'pump-current': { base: 11.2, variance: 0.15, digits: 1 },
  'conveyor-belt': { base: 1.2, variance: 0.02, digits: 1 },
  'conveyor-rate': { base: 1400, variance: 18, digits: 0 },
  'conveyor-current': { base: 11.0, variance: 0.15, digits: 1 },
  'cooling-airflow': { base: 20000, variance: 180, digits: 0 },
  'cooling-temp': { base: 32, variance: 1.2, digits: 0 },
  'cooling-current': { base: 11.0, variance: 0.15, digits: 1 },
  'water-rpm': { base: 148, variance: 1.8, digits: 0 },
  'water-current': { base: 11.5, variance: 0.12, digits: 1 },
};

function format(n, digits) {
  return digits === 0
    ? Math.round(n).toLocaleString('en-US')
    : n.toFixed(digits);
}

function tick() {
  Object.entries(values).forEach(([key, spec]) => {
    const el = document.querySelector(`[data-live="${key}"]`);
    if (!el) return;
    const next = spec.base + (Math.random() - 0.5) * 2 * spec.variance;
    el.textContent = format(next, spec.digits);
  });
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const times = {
    'pump-time': '06:40',
    'conveyor-time': '14:20',
    'cooling-time': '13:50',
    'water-time': '09:15',
  };
  Object.entries(times).forEach(([key, value]) => {
    const el = document.querySelector(`[data-live="${key}"]`);
    if (el) el.textContent = value;
  });
  const dateEl = $('.hero-credit');
  if (dateEl) dateEl.dataset.clock = `${hh}:${mm}`;
}

tick();
setInterval(tick, 2400);

// Slight pointer parallax on the photographic cards; transform is isolated so the
// CSS Ken Burns animation on the image remains uninterrupted.
if (window.matchMedia('(pointer: fine)').matches && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  $$('.application-card').forEach((card) => {
    const visual = card.querySelector('.visual');
    if (!visual) return;
    visual.addEventListener('pointermove', (event) => {
      const rect = visual.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width - 0.5) * 1.1;
      const y = ((event.clientY - rect.top) / rect.height - 0.5) * 0.7;
      visual.style.setProperty('--px', `${x}px`);
      visual.style.setProperty('--py', `${y}px`);
    });
    visual.addEventListener('pointerleave', () => {
      visual.style.setProperty('--px', '0px');
      visual.style.setProperty('--py', '0px');
    });
  });
}

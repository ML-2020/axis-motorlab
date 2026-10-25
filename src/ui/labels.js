import * as THREE from 'three';
import { clamp, smoothstep } from '../model/utils.js';

const CALLOUTS = [
  { id: 'fan-cover', side: 'left' },
  { id: 'rotor-cage', side: 'left' },
  { id: 'rotor-core', side: 'left' },
  { id: 'shaft', side: 'left' },
  { id: 'rear-bearing', side: 'left' },
  { id: 'terminal-box', side: 'right' },
  { id: 'stator-frame', side: 'right' },
  { id: 'stator-winding', side: 'right' },
  { id: 'front-endshield', side: 'right' },
  { id: 'stator-core', side: 'right' },
  { id: 'nameplate', side: 'right' },
];

const HOTSPOTS = [
  {
    partId: 'terminal-box',
    title: '接线盒总成',
    meta: 'IP55 · 6 × M8 端子',
    anchor: [0, 0.048, 0.02],
  },
  {
    partId: 'cooling-fan',
    title: 'IC411 冷却风路',
    meta: '后置离心风扇 / φ230',
    anchor: [0, 0.092, 0],
  },
  {
    partId: 'stator-frame',
    title: '机座与散热筋',
    meta: 'HT200 · IM B3 底脚',
    anchor: [0.075, 0.085, 0.045],
  },
  {
    partId: 'front-bearing',
    title: '6308 深沟球轴承',
    meta: '40 × 90 × 23 mm',
    anchor: [0, 0.03, 0],
  },
  {
    partId: 'nameplate',
    title: 'IE3 效率铭牌',
    meta: '5.5 kW · 89.6 %',
    anchor: [0, 0, 0],
  },
  {
    partId: 'shaft',
    title: '38 × 80 mm 轴伸',
    meta: '10 × 8 平键 · 45 钢',
    anchor: [0, 0, 0.286],
  },
];

export class CalloutManager {
  constructor({ motor, stage, content, layer, svg, itemsEl, onSelect }) {
    this.motor = motor;
    this.stage = stage;
    this.content = content;
    this.layer = layer;
    this.svg = svg;
    this.itemsEl = itemsEl;
    this.onSelect = onSelect;
    this.byId = new Map(content.COMPONENTS.map((c) => [c.id, c]));
    this.entries = [];
    this.labelsEnabled = true;
    this.activeId = null;
    this._visible = false;
    this.renderedIds = new Set();
    this.build();
  }

  build() {
    const ns = 'http://www.w3.org/2000/svg';
    for (const config of CALLOUTS) {
      const data = this.byId.get(config.id);
      const part = this.motor.getPart(config.id);
      if (!data || !part) continue;
      const path = document.createElementNS(ns, 'path');
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('r', '2.4');
      this.svg.appendChild(path);
      this.svg.appendChild(dot);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = `callout side-${config.side}`;
      button.dataset.partId = config.id;
      button.innerHTML = `<span class="callout-index">${data.index}</span>
        <span class="callout-text"><b>${data.name}</b><em>${data.nameEn}</em></span>`;
      button.addEventListener('mouseenter', () => {
        button.classList.add('is-active');
        this.motor.highlight(config.id);
      });
      button.addEventListener('mouseleave', () => {
        button.classList.remove('is-active');
        if (this.activeId !== config.id) this.motor.highlight(this.activeId || null);
      });
      button.addEventListener('click', () => {
        this.setActive(config.id);
        this.onSelect?.(config.id);
      });
      this.itemsEl.appendChild(button);
      this.entries.push({
        ...config,
        data,
        part,
        button,
        path,
        dot,
        visible: false,
        priority: this.entries.length,
      });
    }
  }

  setLabelsEnabled(on) {
    this.labelsEnabled = !!on;
    this.layer.classList.toggle('labels-on', this.labelsEnabled);
    if (!on) this.hideAll();
  }

  setActive(id) {
    this.activeId = id;
    for (const entry of this.entries) {
      entry.button.classList.toggle('is-active', entry.id === id);
    }
    this.motor.highlight(id);
  }

  hideAll() {
    for (const entry of this.entries) {
      entry.button.style.display = 'none';
      entry.path.style.display = 'none';
      entry.dot.style.display = 'none';
    }
    this._visible = false;
  }

  update(progress) {
    const chapter = document.body.dataset.chapter;
    if (chapter !== 'explode' || !this.labelsEnabled) {
      if (this._visible) this.hideAll();
      return;
    }
    this._visible = true;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width < 820) {
      this.hideAll();
      return;
    }
    const hud = document.querySelector('.explode-hud');
    const hudRect = hud ? hud.getBoundingClientRect() : null;
    const leftTop = hudRect ? Math.min(height - 80, hudRect.bottom + 26) : 340;
    const rightTop = Math.max(238, height * 0.24);
    const bottom = height - 84;
    const spacing = width < 1200 ? 44 : 48;

    const candidates = [];
    for (const entry of this.entries) {
      const localT = clamp((progress - entry.part.delay) / entry.part.duration);
      if (localT < 0.72) {
        entry.button.style.display = 'none';
        entry.path.style.display = 'none';
        entry.dot.style.display = 'none';
        continue;
      }
      const center = this.motor.getWorldCenter(entry.id);
      const screen = this.stage.project(center);
      if (!screen.visible || screen.x < 0 || screen.x > width || screen.y < 0 || screen.y > height) {
        entry.button.style.display = 'none';
        entry.path.style.display = 'none';
        entry.dot.style.display = 'none';
        continue;
      }
      let side = entry.side;
      if (screen.x < width * 0.33) side = 'left';
      else if (screen.x > width * 0.67) side = 'right';
      candidates.push({ entry, screen, side, opacity: smoothstep(0.72, 0.96, localT) });
    }

    for (const side of ['left', 'right']) {
      const top = side === 'left' ? leftTop : rightTop;
      const maxCount = Math.max(0, Math.floor((bottom - top) / spacing) + 1);
      const sideCandidates = candidates.filter((c) => c.side === side);
      const selected = sideCandidates
        .sort((a, b) => a.entry.priority - b.entry.priority)
        .slice(0, maxCount)
        .sort((a, b) => a.screen.y - b.screen.y);
      const n = selected.length;
      if (!n) continue;
      const ys = selected.map((c) => clamp(c.screen.y, top, bottom));
      // forward pass
      for (let i = 1; i < n; i++) ys[i] = Math.max(ys[i], ys[i - 1] + spacing);
      let overflow = ys[n - 1] - bottom;
      if (overflow > 0) {
        for (let i = 0; i < n; i++) ys[i] -= overflow;
      }
      // backward clamp
      if (ys[0] < top) {
        const shift = top - ys[0];
        for (let i = 0; i < n; i++) ys[i] += shift;
      }
      for (let i = 0; i < n; i++) {
        const c = selected[i];
        const y = ys[i];
        const { entry } = c;
        this.renderedIds.add(entry.id);
        entry.button.style.display = '';
        entry.path.style.display = '';
        entry.dot.style.display = '';
        entry.button.style.top = `${y}px`;
        entry.button.style.opacity = c.opacity.toFixed(3);
        if (side === 'left') {
          entry.button.style.left = '30px';
          entry.button.style.right = 'auto';
          entry.button.classList.add('side-left');
          entry.button.classList.remove('side-right');
          const labelRight = 30 + 190;
          const endX = labelRight + 9;
          entry.path.setAttribute(
            'd',
            `M ${c.screen.x.toFixed(1)} ${c.screen.y.toFixed(1)} L ${(c.screen.x - 18).toFixed(1)} ${c.screen.y.toFixed(1)} L ${(endX + 8).toFixed(1)} ${y} L ${endX} ${y}`,
          );
          entry.dot.setAttribute('cx', c.screen.x.toFixed(1));
          entry.dot.setAttribute('cy', c.screen.y.toFixed(1));
          entry.dot.style.display = '';
        } else {
          entry.button.style.left = `${width - 58}px`;
          entry.button.style.right = 'auto';
          entry.button.classList.add('side-right');
          entry.button.classList.remove('side-left');
          const labelLeft = width - 58 - 190;
          const endX = labelLeft - 9;
          entry.path.setAttribute(
            'd',
            `M ${c.screen.x.toFixed(1)} ${c.screen.y.toFixed(1)} L ${(c.screen.x + 18).toFixed(1)} ${c.screen.y.toFixed(1)} L ${(endX - 8).toFixed(1)} ${y} L ${endX} ${y}`,
          );
          entry.dot.setAttribute('cx', c.screen.x.toFixed(1));
          entry.dot.setAttribute('cy', c.screen.y.toFixed(1));
          entry.dot.style.display = '';
        }
        entry.path.style.opacity = c.opacity.toFixed(3);
        entry.dot.style.opacity = c.opacity.toFixed(3);
      }
    }

    for (const entry of this.entries) {
      if (!this.renderedIds.has(entry.id)) {
        entry.button.style.display = 'none';
        entry.path.style.display = 'none';
        entry.dot.style.display = 'none';
      }
    }
    this.renderedIds.clear();
  }
}

export class HotspotManager {
  constructor({ motor, stage, layer, content, onSelect }) {
    this.motor = motor;
    this.stage = stage;
    this.layer = layer;
    this.content = content;
    this.onSelect = onSelect;
    this.byId = new Map(content.COMPONENTS.map((c) => [c.id, c]));
    this.svg = document.querySelector('#hotspot-svg');
    this.entries = [];
    this.build();
  }

  build() {
    const ns = 'http://www.w3.org/2000/svg';
    for (const h of HOTSPOTS) {
      const data = this.byId.get(h.partId);
      const part = this.motor.getPart(h.partId);
      if (!data || !part) continue;
      const path = document.createElementNS(ns, 'path');
      this.svg?.appendChild(path);

      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'hotspot';
      button.dataset.partId = h.partId;
      button.setAttribute('aria-label', `${h.title}，${h.meta}`);
      button.innerHTML = `<span class="hotspot-dot"></span><span class="hotspot-card"><b>${h.title}</b><em>${h.meta}</em></span>`;
      button.addEventListener('mouseenter', () => {
        this.motor.highlight(h.partId);
        button.classList.add('is-active');
      });
      button.addEventListener('mouseleave', () => {
        this.motor.highlight(null);
        button.classList.remove('is-active');
      });
      button.addEventListener('click', () => this.onSelect?.(h.partId));
      this.layer.appendChild(button);
      this.entries.push({ ...h, data, part, button, path, cardX: 0, cardY: 0, visible: false });
    }
  }

  update() {
    const chapter = document.body.dataset.chapter;
    if (chapter !== 'anatomy') return;
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (width < 820) {
      for (const entry of this.entries) {
        const world = entry.part.group.localToWorld(new THREE.Vector3(...entry.anchor));
        const screen = this.stage.project(world);
        entry.button.style.display = screen.visible ? '' : 'none';
        entry.button.style.left = `${screen.x}px`;
        entry.button.style.top = `${screen.y}px`;
        entry.button.querySelector('.hotspot-card').style.left = '14px';
        entry.button.querySelector('.hotspot-card').style.top = '0px';
        entry.path.style.display = 'none';
      }
      return;
    }

    const candidates = [];
    for (const entry of this.entries) {
      const world = entry.part.group.localToWorld(new THREE.Vector3(...entry.anchor));
      const screen = this.stage.project(world);
      const visible =
        screen.visible && screen.x > 40 && screen.x < width - 40 && screen.y > 120 && screen.y < height - 60;
      entry.visible = visible;
      entry.screen = screen;
      if (visible) candidates.push(entry);
      else {
        entry.button.style.display = 'none';
        entry.path.style.display = 'none';
      }
    }
    if (!candidates.length) return;

    const cardX = clamp(width * 0.71, 860, width - 360);
    const top = 250;
    const bottom = height - 190;
    const spacing = 62;
    const sorted = [...candidates].sort((a, b) => a.screen.y - b.screen.y);
    let ys = sorted.map((entry) => clamp(entry.screen.y, top, bottom));
    for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i], ys[i - 1] + spacing);
    let overflow = ys[ys.length - 1] - bottom;
    if (overflow > 0) ys = ys.map((y) => y - overflow);
    if (ys[0] < top) {
      const shift = top - ys[0];
      ys = ys.map((y) => y + shift);
    }

    sorted.forEach((entry, index) => {
      const y = ys[index];
      entry.cardX = cardX;
      entry.cardY = y;
      entry.button.style.display = '';
      entry.button.style.left = `${entry.screen.x}px`;
      entry.button.style.top = `${entry.screen.y}px`;
      const card = entry.button.querySelector('.hotspot-card');
      card.style.left = `${cardX - entry.screen.x}px`;
      card.style.top = `${y - entry.screen.y}px`;
      const endX = cardX - 14;
      const midX = Math.max(entry.screen.x + 26, endX - 70);
      entry.path.style.display = '';
      entry.path.setAttribute(
        'd',
        `M ${entry.screen.x.toFixed(1)} ${entry.screen.y.toFixed(1)} L ${midX.toFixed(1)} ${entry.screen.y.toFixed(1)} L ${(endX - 18).toFixed(1)} ${y.toFixed(1)} L ${endX.toFixed(1)} ${y.toFixed(1)}`,
      );
    });
  }
}

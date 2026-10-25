function smoothPath(points) {
  if (!points.length) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  let d = `M ${points[0][0].toFixed(2)} ${points[0][1].toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  }
  return d;
}

export function buildPerformanceChartSVG(perf) {
  const W = 880;
  const H = 404;
  const L = 58;
  const R = 66;
  const T = 30;
  const B = 48;
  const plotW = W - L - R;
  const plotH = H - T - B;
  const maxSpeed = 1500;
  const x = (speed) => L + (speed / maxSpeed) * plotW;
  const yPu = (v) => T + plotH - (v / 7) * plotH;
  const yPct = (v) => T + plotH - (v / 100) * plotH;

  const torque = perf.torquePct.map(([s, v]) => [x(s), yPu(v)]);
  const current = perf.currentPct.map(([s, v]) => [x(s), yPu(v)]);
  const eff = perf.efficiencyPct.map(([s, v]) => [x(s), yPct(v)]);
  const pf = perf.powerFactor.map(([s, v]) => [x(s), yPct(v * 100)]);

  const grid = [];
  for (let i = 0; i <= 4; i++) {
    const y = T + (plotH / 4) * i;
    const pct = 100 - i * 25;
    grid.push(`<line class="grid-line" x1="${L}" y1="${y}" x2="${L + plotW}" y2="${y}"/>`);
    grid.push(`<text class="axis-text" x="${L + plotW + 12}" y="${y + 3}" text-anchor="start">${pct}</text>`);
  }
  for (const value of [0, 2, 4, 6]) {
    const y = yPu(value);
    grid.push(`<text class="axis-text" x="${L - 12}" y="${y + 3}" text-anchor="end">${value}</text>`);
  }
  for (const speed of [0, 300, 600, 900, 1200, 1500]) {
    const xx = x(speed);
    grid.push(`<line class="grid-line" x1="${xx}" y1="${T}" x2="${xx}" y2="${T + plotH}"/>`);
    grid.push(`<text class="axis-text" x="${xx}" y="${T + plotH + 21}" text-anchor="middle">${speed}</text>`);
  }

  const ratedX = x(1440);
  const labels = `
    <text class="curve-label" fill="#e4a04d" x="${x(880)}" y="${yPu(2.3) - 12}">T / Tₙ · 最大 2.3</text>
    <text class="curve-label" fill="#7cc9d2" x="${x(20)}" y="${yPu(6.8) - 13}">I / Iₙ · 起动 6.8</text>
    <text class="curve-label" fill="#d9d9d2" x="${x(1180)}" y="${yPct(93)}">η · 89.6 %</text>
    <text class="curve-label" fill="#bd7745" x="${x(900)}" y="${yPct(86)}">cosφ · 0.83</text>
  `;

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="转矩、电流、效率与功率因数随转速变化曲线">
    <defs>
      <linearGradient id="chartFade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#7cc9d2" stop-opacity="0.08"/>
        <stop offset="100%" stop-color="#7cc9d2" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <g>${grid.join('')}</g>
    <line class="axis-line" x1="${L}" y1="${T + plotH}" x2="${L + plotW}" y2="${T + plotH}"/>
    <line class="axis-line" x1="${L}" y1="${T}" x2="${L}" y2="${T + plotH}"/>
    <text class="axis-title" x="${L - 40}" y="${T - 10}">p.u.</text>
    <text class="axis-title" x="${L + plotW + 36}" y="${T - 10}" text-anchor="middle">%</text>
    <text class="axis-title" x="${L + plotW / 2}" y="${H - 7}" text-anchor="middle">SPEED / r·min⁻¹</text>
    <line class="rated-line" x1="${ratedX}" y1="${T}" x2="${ratedX}" y2="${T + plotH}"/>
    <text class="axis-text" x="${ratedX - 8}" y="${T + 12}" text-anchor="end" fill="#8a999a">RATED</text>
    <text class="axis-text" x="${ratedX - 8}" y="${T + 24}" text-anchor="end" fill="#5f6f72">1440 r/min</text>
    <path class="curve-torque path-draw" d="${smoothPath(torque)}"/>
    <path class="curve-current path-draw" d="${smoothPath(current)}"/>
    <path class="curve-eff path-draw" d="${smoothPath(eff)}"/>
    <path class="curve-pf path-draw" d="${smoothPath(pf)}"/>
    <circle class="rated-dot" cx="${ratedX}" cy="${yPu(1)}" r="4.2"/>
    <circle class="rated-dot" cx="${ratedX}" cy="${yPu(1)}" r="8" fill="none" stroke="rgba(228,160,77,.25)" stroke-width="1"/>
    ${labels}
  </svg>`;
}

function dimText(x, y, text, anchor = 'middle', cls = 'dim-text') {
  return `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${text}</text>`;
}

function horizontalDim(x1, x2, y, label, extension = 14) {
  const mid = (x1 + x2) / 2;
  return `
    <line class="dwg-thin" x1="${x1}" y1="${y - extension}" x2="${x1}" y2="${y + 12}"/>
    <line class="dwg-thin" x1="${x2}" y1="${y - extension}" x2="${x2}" y2="${y + 12}"/>
    <line class="dwg-line dwg-cyan" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" marker-start="url(#arrowCyanStart)" marker-end="url(#arrowCyan)"/>
    ${dimText(mid, y - 8, label)}
  `;
}

function verticalDim(y1, y2, x, label, extension = 14) {
  const mid = (y1 + y2) / 2;
  return `
    <line class="dwg-thin" x1="${x - extension}" y1="${y1}" x2="${x + 12}" y2="${y1}"/>
    <line class="dwg-thin" x1="${x - extension}" y1="${y2}" x2="${x + 12}" y2="${y2}"/>
    <line class="dwg-line dwg-cyan" x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" marker-start="url(#arrowCyanStart)" marker-end="url(#arrowCyan)"/>
    ${dimText(x - 9, mid, label, 'middle')}
  `;
}

export function buildDimensionDrawingSVG() {
  return `<svg viewBox="0 0 1100 470" role="img" aria-label="132S 机座安装尺寸工程图，单位毫米">
    <defs>
      <marker id="arrowCyan" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0,0 L8,4 L0,8" fill="none" stroke="#7cc9d2" stroke-width="1"/>
      </marker>
      <marker id="arrowCyanStart" viewBox="0 0 8 8" refX="1" refY="4" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M8,0 L0,4 L8,8" fill="none" stroke="#7cc9d2" stroke-width="1"/>
      </marker>
      <marker id="arrowAmber" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M0,0 L8,4 L0,8" fill="none" stroke="#e4a04d" stroke-width="1"/>
      </marker>
      <marker id="arrowAmberStart" viewBox="0 0 8 8" refX="1" refY="4" markerWidth="7" markerHeight="7" orient="auto">
        <path d="M8,0 L0,4 L8,8" fill="none" stroke="#e4a04d" stroke-width="1"/>
      </marker>
    </defs>

    <!-- sheet frame -->
    <line class="dwg-thin" x1="30" y1="34" x2="1070" y2="34"/>
    <line class="dwg-thin" x1="30" y1="440" x2="1070" y2="440"/>
    ${dimText(30, 24, 'IEC 60072-1 / GB/T 28575  ·  IM B3  ·  FRAME 132S', 'start', 'dim-small')}
    ${dimText(1070, 24, 'ALL DIMENSIONS IN mm', 'end', 'dim-small')}

    <!-- ========== PLAN VIEW ========== -->
    <g>
      ${dimText(74, 62, 'PLAN VIEW / 俯视', 'start', 'dim-label')}
      <!-- centre lines -->
      <line class="dwg-thin" x1="84" y1="145" x2="500" y2="145"/>
      <line class="dwg-thin" x1="264" y1="58" x2="264" y2="232"/>
      <!-- main body -->
      <rect class="dwg-fill" x="146" y="72" width="254" height="146" rx="32"/>
      <rect class="dwg-line" x="146" y="72" width="254" height="146" rx="32"/>
      <!-- fan cover -->
      <path class="dwg-line" d="M146 84 L128 84 Q108 84 108 106 L108 184 Q108 206 128 206 L146 206"/>
      <line class="dwg-line" x1="424" y1="126" x2="424" y2="164"/>
      <!-- terminal box -->
      <rect class="dwg-line" x="222" y="44" width="84" height="28" rx="4"/>
      <!-- shaft -->
      <line class="dwg-line" x1="424" y1="145" x2="486" y2="145"/>
      <line class="dwg-line" x1="486" y1="138" x2="486" y2="152"/>
      <!-- feet and holes -->
      <rect class="dwg-line" x="158" y="212" width="54" height="18" rx="3"/>
      <rect class="dwg-line" x="334" y="212" width="54" height="18" rx="3"/>
      <rect class="dwg-line" x="158" y="60" width="54" height="16" rx="3"/>
      <rect class="dwg-line" x="334" y="60" width="54" height="16" rx="3"/>
      <circle class="dwg-line dwg-amber" cx="185" cy="221" r="5.5"/>
      <circle class="dwg-line dwg-amber" cx="361" cy="221" r="5.5"/>
      <circle class="dwg-line dwg-amber" cx="185" cy="68" r="5.5"/>
      <circle class="dwg-line dwg-amber" cx="361" cy="68" r="5.5"/>
      <!-- dimension A (across) -->
      ${verticalDim(68, 221, 78, 'A = 216', 19)}
      <!-- dimension B (axial) -->
      ${horizontalDim(185, 361, 264, 'B = 140', 10)}
      <!-- dimension K -->
      <line class="dwg-line dwg-amber" x1="365" y1="222" x2="420" y2="250" marker-start="url(#arrowAmberStart)"/>
      ${dimText(424, 254, 'K = 12  ·  4 × Ø12', 'start', 'dim-small')}
      <!-- centre -->
      ${dimText(185, 247, 'FOOT HOLE', 'middle', 'dim-small')}
    </g>

    <line class="dwg-thin" x1="545" y1="46" x2="545" y2="426"/>

    <!-- ========== SIDE VIEW ========== -->
    <g>
      ${dimText(600, 62, 'SIDE VIEW / 侧视', 'start', 'dim-label')}
      <!-- base line -->
      <line class="dwg-line" x1="620" y1="400" x2="1054" y2="400"/>
      <!-- feet -->
      <path class="dwg-line" d="M720 400 L720 378 L764 378 L764 366 L838 366 L838 378 L880 378 L880 400"/>
      <rect class="dwg-line" x="704" y="400" width="54" height="13" rx="2"/>
      <rect class="dwg-line" x="844" y="400" width="54" height="13" rx="2"/>
      <!-- body (side silhouette) -->
      <path class="dwg-fill" d="M700 352 L700 246 Q700 208 744 198 L880 198 Q926 208 926 246 L926 352 Z"/>
      <path class="dwg-line" d="M700 352 L700 246 Q700 208 744 198 L880 198 Q926 208 926 246 L926 352"/>
      <line class="dwg-line" x1="700" y1="352" x2="926" y2="352"/>
      <!-- cooling fins -->
      <g class="dwg-thin">
        <line x1="714" y1="200" x2="714" y2="352"/><line x1="734" y1="196" x2="734" y2="352"/>
        <line x1="754" y1="192" x2="754" y2="352"/><line x1="774" y1="190" x2="774" y2="352"/>
        <line x1="794" y1="188" x2="794" y2="352"/><line x1="814" y1="188" x2="814" y2="352"/>
        <line x1="834" y1="190" x2="834" y2="352"/><line x1="854" y1="192" x2="854" y2="352"/>
        <line x1="874" y1="196" x2="874" y2="352"/><line x1="894" y1="200" x2="894" y2="352"/>
      </g>
      <!-- fan cover -->
      <path class="dwg-line" d="M700 246 L666 246 Q646 246 646 268 L646 336 Q646 352 668 352 L700 352"/>
      <circle class="dwg-thin" cx="674" cy="300" r="24"/>
      <!-- terminal box -->
      <path class="dwg-line" d="M768 198 L768 164 L846 164 L846 198"/>
      <line class="dwg-line" x1="776" y1="164" x2="838" y2="164"/>
      <!-- shaft axis and shaft -->
      <line class="dwg-thin" x1="620" y1="292" x2="1050" y2="292"/>
      <path class="dwg-line" d="M926 284 L980 284 L980 286 L1028 286 L1028 298 L980 298 L980 300 L926 300"/>
      <!-- shoulder line -->
      <line class="dwg-thin" x1="926" y1="232" x2="926" y2="356"/>
      <!-- dimensions -->
      ${verticalDim(292, 400, 606, 'H = 132', 17)}
      ${horizontalDim(920, 1028, 244, 'E = 80', 10)}
      ${verticalDim(286, 298, 1048, 'D = 38', 20)}
      <line class="dwg-line dwg-cyan" x1="640" y1="416" x2="1028" y2="416" marker-start="url(#arrowCyanStart)" marker-end="url(#arrowCyan)"/>
      ${dimText(834, 436, 'OVERALL LENGTH  ≈ 464', 'middle')}
      ${horizontalDim(852, 952, 368, 'C = 89', 16)}
      ${dimText(650, 330, 'IC411', 'start', 'dim-small')}
      ${dimText(650, 344, 'FAN COVER', 'start', 'dim-small')}
      ${dimText(820, 150, 'TERMINAL BOX', 'middle', 'dim-small')}
      ${dimText(1002, 274, 'SHAFT 38×80', 'middle', 'dim-small')}
    </g>

    <!-- notes -->
    ${dimText(30, 462, 'H = 轴中心高  ·  A/B = 底脚孔距  ·  C = 轴肩至最近底脚孔  ·  K = 底脚孔直径', 'start', 'dim-small')}
    ${dimText(1070, 462, 'NOT TO SCALE', 'end', 'dim-small')}
  </svg>`;
}

export class Sparkline {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.lastDraw = 0;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = Math.max(1, rect.width);
    this.h = Math.max(1, rect.height || 58);
    this.canvas.width = Math.round(this.w * dpr);
    this.canvas.height = Math.round(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  draw(runMix, time) {
    if (!this.ctx) return;
    if (time - this.lastDraw < 0.05) return;
    this.lastDraw = time;
    const { ctx, w, h } = this;
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(151,179,181,0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      const y = (h / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    const amp = runMix;
    const baseY = h * 0.68;
    const sample = (p, phase) =>
      amp * (0.58 + 0.24 * Math.sin(p * 13 + phase + time * 1.1) + 0.18 * Math.sin(p * 33 - time * 0.6));
    const buildPoints = (phase, ampScale) => {
      const pts = [];
      for (let x = 0; x <= w; x += 2) {
        const p = x / w;
        const y = baseY - h * 0.38 * ampScale * sample(p, phase) * Math.min(1, p * 4);
        pts.push([x, y]);
      }
      return pts;
    };
    const drawCurve = (pts, color, width) => {
      ctx.beginPath();
      pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.shadowColor = color;
      ctx.shadowBlur = 7;
      ctx.stroke();
      ctx.shadowBlur = 0;
    };
    const torque = buildPoints(0.7, 1);
    const current = buildPoints(2.2, 0.65);
    // soft fill below the torque trace
    const gradient = ctx.createLinearGradient(0, baseY - h * 0.4, 0, h);
    gradient.addColorStop(0, 'rgba(228,160,77,0.16)');
    gradient.addColorStop(1, 'rgba(228,160,77,0)');
    ctx.beginPath();
    torque.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
    drawCurve(current, 'rgba(124,201,210,0.8)', 1);
    drawCurve(torque, 'rgba(228,160,77,0.95)', 1.3);
    if (amp > 0.02) {
      const p = 0.72;
      const x = w * p;
      const y = baseY - h * 0.38 * sample(p, 0.7) * Math.min(1, p * 4);
      ctx.beginPath();
      ctx.arc(x, y, 2.6, 0, Math.PI * 2);
      ctx.fillStyle = '#ffc06d';
      ctx.shadowColor = '#e4a04d';
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }
}

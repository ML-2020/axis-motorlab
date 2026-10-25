import * as THREE from 'three';

const $$ = (s) => [...document.querySelectorAll(s)];

const metal = (color, metalness = 0.65, roughness = 0.4) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
const paint = (color, roughness = 0.48) => new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness });
const M = {
  black: metal(0x1b1c1d, 0.55, 0.42),
  blackFins: metal(0x292b2c, 0.5, 0.5),
  darkSteel: metal(0x353b3b, 0.6, 0.38),
  steel: metal(0x8b9694, 0.72, 0.3),
  blue: paint(0x1f5a86, 0.42),
  blueLight: paint(0x2e78a8, 0.4),
  green: paint(0x2e7a4e, 0.42),
  greenDark: paint(0x245f3f, 0.5),
  yellow: paint(0xc79a3c, 0.44),
  concrete: new THREE.MeshStandardMaterial({ color: 0x92968c, roughness: 0.92 }),
  water: new THREE.MeshPhysicalMaterial({ color: 0x1f5962, metalness: 0.25, roughness: 0.12, transparent: true, opacity: 0.8, side: THREE.DoubleSide }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x171918, roughness: 0.86 }),
  cardboard: new THREE.MeshStandardMaterial({ color: 0x9a7b50, roughness: 0.9 }),
  terminal: new THREE.MeshStandardMaterial({ color: 0x31332f, metalness: 0.35, roughness: 0.5 }),
  nameplate: new THREE.MeshStandardMaterial({ color: 0xd8c69b, metalness: 0.2, roughness: 0.5 }),
  grille: new THREE.MeshStandardMaterial({ color: 0x3e4645, metalness: 0.55, roughness: 0.35 }),
};

function add(parent, geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true) {
  const m = new THREE.Mesh(geo, material);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  m.castShadow = cast;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const box = (p, w, h, d, m, x, y, z, rx = 0, ry = 0, rz = 0, cast = true) => add(p, new THREE.BoxGeometry(w, h, d), m, x, y, z, rx, ry, rz, cast);
const cyl = (p, r1, r2, h, m, x, y, z, rx = 0, ry = 0, rz = 0, cast = true, seg = 20) => add(p, new THREE.CylinderGeometry(r1, r2, h, seg), m, x, y, z, rx, ry, rz, cast);

// ---------------------------------------------------------------------------
// Reference-driven machinery: black finned motor
// ---------------------------------------------------------------------------
function makeMotor(scale = 1) {
  const g = new THREE.Group();
  const bodyR = 0.17;
  const bodyL = 0.42;
  // Stator barrel and fourteen cooling fins, as on the reference pump set.
  const barrel = cyl(g, bodyR, bodyR, bodyL, M.black, 0.2, 0, 0, 0, 0, Math.PI / 2, true, 28);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const fin = box(g, bodyL * 0.92, 0.012, 0.042, M.blackFins, 0.2, Math.cos(a) * (bodyR + 0.008), Math.sin(a) * (bodyR + 0.008), a, 0, 0);
    fin.scale.z = 0.9;
  }
  // End shields, bearing bosses and a cooling fan cowl.
  cyl(g, 0.185, 0.185, 0.055, M.darkSteel, -0.02, 0, 0, 0, 0, Math.PI / 2, true, 28);
  cyl(g, 0.185, 0.185, 0.055, M.darkSteel, 0.42, 0, 0, 0, 0, Math.PI / 2, true, 28);
  cyl(g, 0.095, 0.095, 0.045, M.steel, -0.055, 0, 0, 0, 0, Math.PI / 2, true, 20);
  cyl(g, 0.07, 0.07, 0.08, M.black, -0.095, 0, 0, 0, 0, Math.PI / 2, true, 18);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    box(g, 0.075, 0.02, 0.04, M.darkSteel, -0.095, Math.cos(a) * 0.05, Math.sin(a) * 0.05, 0, 0, 0);
  }
  // Shaft, terminal box, nameplate and cast feet.
  cyl(g, 0.022, 0.022, 0.23, M.steel, 0.56, 0, 0, 0, 0, Math.PI / 2, true, 16);
  box(g, 0.22, 0.08, 0.16, M.terminal, 0.22, 0.19, 0);
  box(g, 0.22, 0.012, 0.16, M.terminal, 0.22, 0.235, 0);
  box(g, 0.12, 0.045, 0.085, M.nameplate, 0.23, 0.13, 0.172, 0, 0, 0, false);
  for (const x of [0.07, 0.33]) {
    for (const z of [-0.13, 0.13]) {
      box(g, 0.12, 0.1, 0.055, M.darkSteel, x, -0.15, z);
    }
  }
  box(g, 0.8, 0.035, 0.32, M.darkSteel, 0.2, -0.21, 0);
  g.scale.setScalar(scale);
  return g;
}

function makePumpSet() {
  const g = new THREE.Group();
  // Pump skid and black base as in the reference close-up.
  box(g, 1.45, 0.08, 0.55, M.darkSteel, 0, 0.04, 0);
  box(g, 1.25, 0.035, 0.4, M.black, 0, 0.09, 0);
  // Green volute casing, suction and discharge branches.
  const pump = new THREE.Group();
  pump.position.set(-0.46, 0.29, 0);
  const volute = cyl(pump, 0.235, 0.235, 0.2, M.green, 0, 0, 0, 0, 0, Math.PI / 2, true, 32);
  add(pump, new THREE.TorusGeometry(0.235, 0.045, 10, 28), M.greenDark, 0.02, 0, 0, 0, Math.PI / 2, 0);
  cyl(pump, 0.09, 0.09, 0.35, M.green, -0.25, 0, 0, 0, 0, Math.PI / 2, true, 18);
  add(pump, new THREE.TorusGeometry(0.105, 0.026, 8, 20), M.greenDark, -0.43, 0, 0, 0, Math.PI / 2, 0);
  cyl(pump, 0.08, 0.08, 0.26, M.green, 0, 0.24, 0, 0, 0, 0, true, 18);
  add(pump, new THREE.TorusGeometry(0.095, 0.022, 8, 20), M.greenDark, 0, 0.38, 0, Math.PI / 2, 0, 0);
  cyl(pump, 0.06, 0.06, 0.2, M.greenDark, 0.22, 0.17, 0, 0, 0, Math.PI / 2, true, 16);
  add(pump, new THREE.CylinderGeometry(0.055, 0.055, 0.04, 16), M.steel, 0.14, 0.42, 0);
  add(pump, new THREE.CircleGeometry(0.045, 20), M.nameplate, 0.14, 0.445, 0, -Math.PI / 2, 0, 0, false);
  g.add(pump);
  // Motor, coupling and guard.
  const motor = makeMotor(0.92);
  motor.position.set(0.42, 0.24, 0);
  g.add(motor);
  box(g, 0.25, 0.14, 0.22, M.yellow, 0.01, 0.3, 0);
  box(g, 0.25, 0.02, 0.24, M.darkSteel, 0.01, 0.38, 0);
  cyl(g, 0.035, 0.035, 0.35, M.steel, 0.06, 0.29, 0, 0, 0, Math.PI / 2, true, 14);
  // Gauge and small drain pipe.
  cyl(g, 0.028, 0.028, 0.2, M.steel, -0.3, 0.47, 0.02, 0, 0, 0, true, 12);
  add(g, new THREE.CircleGeometry(0.07, 20), M.nameplate, -0.3, 0.56, 0.02, 0, 0, 0, false);
  add(g, new THREE.TorusGeometry(0.072, 0.008, 6, 20), M.darkSteel, -0.3, 0.56, 0.02, 0, 0, 0, false);
  const needle = box(g, 0.04, 0.006, 0.006, new THREE.MeshBasicMaterial({ color: 0x9f3f33 }), -0.28, 0.56, 0.035, 0, 0, 0.5, false);
  const flow = new THREE.Group();
  for (let i = 0; i < 6; i++) {
    add(flow, new THREE.SphereGeometry(0.018, 6, 5), new THREE.MeshBasicMaterial({ color: 0x8ed6dd, transparent: true, opacity: 0.8 }), -0.3, 0.4 + i * 0.07, 0.02, 0, 0, 0, false);
  }
  g.add(flow);
  g.userData = { needle, flow, pump: pump };
  g.scale.setScalar(1.08);
  return g;
}

// ---------------------------------------------------------------------------
// Blue roller conveyor
// ---------------------------------------------------------------------------
function makeConveyor() {
  const g = new THREE.Group();
  const length = 2.35;
  for (const z of [-0.31, 0.31]) {
    box(g, length, 0.075, 0.055, M.blue, 0, 0.52, z);
    box(g, length, 0.055, 0.045, M.blueLight, 0, 0.36, z);
  }
  for (const x of [-0.9, 0.9]) {
    for (const z of [-0.31, 0.31]) {
      box(g, 0.06, 0.5, 0.06, M.blue, x, 0.25, z);
      box(g, 0.32, 0.04, 0.06, M.blue, x, 0.04, z);
    }
  }
  const rollers = [];
  for (let i = 0; i < 17; i++) {
    const x = -1.08 + i * 0.135;
    const r = cyl(g, 0.036, 0.036, 0.56, M.steel, x, 0.58, 0, Math.PI / 2, 0, Math.PI / 2, true, 14);
    rollers.push(r);
  }
  box(g, 2.25, 0.014, 0.52, M.darkSteel, 0, 0.555, 0);
  // Drive side: gearbox, motor and coupling guard.
  box(g, 0.32, 0.26, 0.3, M.blue, -1.13, 0.34, 0.46);
  const motor = makeMotor(0.6);
  motor.position.set(-1.05, 0.22, 0.7);
  motor.rotation.y = Math.PI / 2;
  g.add(motor);
  box(g, 0.34, 0.1, 0.16, M.yellow, -1.03, 0.28, 0.55);
  // Cardboard boxes moving on the belt.
  const packages = [];
  for (let i = 0; i < 3; i++) {
    const p = new THREE.Group();
    box(p, 0.2, 0.18, 0.2, M.cardboard, 0, 0.09, 0);
    box(p, 0.14, 0.015, 0.14, M.rubber, 0, 0.19, 0);
    p.position.set(-0.75 + i * 0.72, 0.68, 0);
    g.add(p);
    packages.push(p);
  }
  g.userData = { packages, rollers };
  g.scale.setScalar(0.95);
  return g;
}

// ---------------------------------------------------------------------------
// Square cooling tower with axial fan
// ---------------------------------------------------------------------------
function makeCoolingTower() {
  const g = new THREE.Group();
  box(g, 1.85, 0.06, 1.25, M.darkSteel, 0, 0.03, 0);
  box(g, 1.8, 1.05, 1.2, M.steel, 0, 0.58, 0);
  box(g, 1.86, 0.06, 1.26, M.darkSteel, 0, 1.13, 0);
  for (let i = 0; i < 7; i++) {
    box(g, 0.02, 0.95, 0.02, M.darkSteel, -0.82 + i * 0.27, 0.6, 0.61, 0, 0, 0, false);
  }
  // Louvered side panels.
  for (const x of [-0.9, 0.9]) {
    for (let i = 0; i < 6; i++) box(g, 0.03, 0.7, 0.04, M.darkSteel, x, 0.55, -0.5 + i * 0.2, 0, 0, 0.2, false);
  }
  // Circular fan shroud and grille.
  const fan = new THREE.Group();
  fan.position.set(0, 0.67, 0.63);
  add(fan, new THREE.TorusGeometry(0.47, 0.055, 10, 40), M.darkSteel, 0, 0, 0, 0, 0, 0);
  add(fan, new THREE.TorusGeometry(0.38, 0.012, 6, 36), M.grille, 0, 0, 0.045, 0, 0, 0, false);
  add(fan, new THREE.TorusGeometry(0.27, 0.009, 6, 32), M.grille, 0, 0, 0.052, 0, 0, 0, false);
  add(fan, new THREE.TorusGeometry(0.16, 0.008, 6, 28), M.grille, 0, 0, 0.058, 0, 0, 0, false);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    box(fan, 0.78, 0.008, 0.008, M.grille, 0, 0, 0.06, 0, 0, a, false);
  }
  const blades = new THREE.Group();
  blades.position.z = 0.07;
  add(blades, new THREE.CylinderGeometry(0.09, 0.09, 0.09, 20), M.darkSteel, 0, 0, 0, Math.PI / 2, 0, 0);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const b = box(blades, 0.42, 0.13, 0.025, M.steel, Math.cos(a) * 0.24, Math.sin(a) * 0.24, 0, 0, 0, a + 0.22, false);
    b.geometry.translate(0.1, 0, 0);
  }
  fan.add(blades);
  add(fan, new THREE.CylinderGeometry(0.075, 0.075, 0.1, 20), M.darkSteel, 0, 0, 0.09, Math.PI / 2, 0, 0);
  g.add(fan);
  // Access door and service motor.
  box(g, 0.34, 0.5, 0.02, M.darkSteel, -0.55, 0.6, 0.615);
  box(g, 0.05, 0.16, 0.025, M.nameplate, -0.55, 0.6, 0.63);
  box(g, 0.35, 0.28, 0.24, M.blue, 0.55, 0.25, 0.7);
  g.userData = { fan: blades };
  g.scale.setScalar(0.95);
  return g;
}

// ---------------------------------------------------------------------------
// Circular treatment basin with rotating bridge
// ---------------------------------------------------------------------------
function makeWaterBasin() {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(1.18, 1.25, 0.32, 48, 1, true), M.concrete, 0, 0.16, 0, 0, 0, 0, true);
  add(g, new THREE.TorusGeometry(1.2, 0.045, 8, 48), M.concrete, 0, 0.33, 0, Math.PI / 2, 0, 0);
  add(g, new THREE.CircleGeometry(1.13, 48), M.water, 0, 0.29, 0, -Math.PI / 2, 0, 0, false);
  // Center drive and rotating bridge.
  cyl(g, 0.1, 0.12, 0.64, M.steel, 0, 0.62, 0, 0, 0, 0, true, 16);
  const bridge = new THREE.Group();
  bridge.position.y = 0.58;
  box(bridge, 2.2, 0.1, 0.18, M.steel, 0, 0, 0);
  box(bridge, 2.2, 0.05, 0.05, M.darkSteel, 0, 0.12, 0.08);
  for (const x of [-0.85, 0.85]) {
    box(bridge, 0.05, 0.6, 0.05, M.steel, x, 0.26, 0);
    box(bridge, 0.05, 0.6, 0.05, M.steel, x, 0.26, 0.18);
    box(bridge, 0.6, 0.04, 0.2, M.steel, x, 0.55, 0.09);
  }
  for (const x of [-0.72, 0, 0.72]) {
    box(bridge, 0.05, 0.45, 0.05, M.darkSteel, x, -0.22, 0);
    box(bridge, 0.22, 0.025, 0.4, M.steel, x, -0.42, 0);
  }
  g.add(bridge);
  // Handrail around the rim.
  add(g, new THREE.TorusGeometry(1.16, 0.022, 6, 48), M.steel, 0, 0.7, 0, Math.PI / 2, 0, 0, false);
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * Math.PI * 2;
    box(g, 0.035, 0.4, 0.035, M.steel, Math.cos(a) * 1.16, 0.5, Math.sin(a) * 1.16, 0, 0, 0, false);
  }
  // Center gearbox and drive.
  box(g, 0.36, 0.22, 0.28, M.blue, 0, 0.72, 0);
  box(g, 0.42, 0.06, 0.34, M.darkSteel, 0, 0.84, 0);
  g.userData = { bridge, water: g.children.find((o) => o.material === M.water) };
  return g;
}

// ---------------------------------------------------------------------------
// One transparent WebGL layer composited over a reference photograph
// ---------------------------------------------------------------------------
class ReferenceScene {
  constructor(canvas, type) {
    this.canvas = canvas;
    this.type = type;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.02, 20);
    this.scene.add(new THREE.HemisphereLight(0xcdd8cb, 0x28251c, 0.85));
    this.scene.add(new THREE.AmbientLight(0xb7b9a7, 0.42));
    const key = new THREE.DirectionalLight(0xffe2b9, 3.2);
    key.position.set(2.5, 4, 3);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -3;
    key.shadow.camera.right = 3;
    key.shadow.camera.top = 3;
    key.shadow.camera.bottom = -3;
    key.shadow.bias = -0.0007;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xa8ccd0, 1.1);
    rim.position.set(-3, 2, -2);
    this.scene.add(rim);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.ShadowMaterial({ opacity: 0.32 }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.receiveShadow = true;
    this.scene.add(shadow);
    this.time = 0;
    this.spin = 0;
    this.build();
    this.resize();
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement);
  }

  build() {
    if (this.type === 'pump') {
      this.model = makePumpSet();
      this.model.position.set(0, 0, 0);
      this.scene.add(this.model);
      this.camera.position.set(1.55, 1.05, 2.15);
      this.camera.lookAt(0, 0.36, 0);
      this.camera.fov = 35;
    } else if (this.type === 'conveyor') {
      this.model = makeConveyor();
      this.model.position.set(0, 0, 0);
      this.scene.add(this.model);
      this.camera.position.set(2.5, 1.55, 2.65);
      this.camera.lookAt(0, 0.5, 0);
      this.camera.fov = 36;
    } else if (this.type === 'cooling') {
      this.model = makeCoolingTower();
      this.model.position.set(0, 0, 0);
      this.scene.add(this.model);
      this.camera.position.set(1.8, 1.25, 2.55);
      this.camera.lookAt(0, 0.65, 0);
      this.camera.fov = 36;
    } else {
      this.model = makeWaterBasin();
      this.model.position.set(0, 0, 0);
      this.scene.add(this.model);
      this.camera.position.set(2.3, 1.65, 2.9);
      this.camera.lookAt(0, 0.45, 0);
      this.camera.fov = 38;
    }
    this.camera.updateProjectionMatrix();
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth || 1;
    const h = parent.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  update(dt, now) {
    this.time = now;
    this.spin = (this.spin + dt * 4.2) % (Math.PI * 2);
    if (this.type === 'pump') {
      this.model.rotation.z = Math.sin(this.time * 0.0018) * 0.002;
      const { needle, flow } = this.model.userData;
      needle.rotation.z = 0.5 + Math.sin(this.time * 0.0015) * 0.13;
      flow.children.forEach((b, i) => {
        b.position.y = 0.4 + ((this.time * 0.00012 + i / 6) % 1) * 0.38;
        b.material.opacity = 0.3 + Math.sin(this.time * 0.003 + i) * 0.25;
      });
    }
    if (this.type === 'conveyor') {
      const { packages, rollers } = this.model.userData;
      rollers.forEach((r) => { r.rotation.y += dt * 5; });
      packages.forEach((p) => {
        p.position.x += dt * 0.32;
        if (p.position.x > 1.05) p.position.x = -1.1;
      });
    }
    if (this.type === 'cooling') {
      this.model.userData.fan.rotation.z -= dt * 2.6;
    }
    if (this.type === 'water') {
      this.model.userData.bridge.rotation.y += dt * 0.055;
      if (this.model.userData.water) this.model.userData.water.rotation.z += dt * 0.12;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

const scenes = $$('.scene3d').map((canvas) => new ReferenceScene(canvas, canvas.dataset.scene));
let last = performance.now();
let acc = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  acc += dt;
  if (acc < 1 / 30) return;
  const step = Math.min(acc, 0.06);
  acc = 0;
  scenes.forEach((scene) => scene.update(step, now));
  scenes.forEach((scene) => scene.render());
}
requestAnimationFrame(loop);

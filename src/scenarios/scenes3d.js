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
  wall: new THREE.MeshStandardMaterial({ color: 0x6a7069, metalness: 0.18, roughness: 0.78 }),
  wallDark: new THREE.MeshStandardMaterial({ color: 0x424a45, metalness: 0.22, roughness: 0.8 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x5c615b, roughness: 0.88 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x9fb7b8, metalness: 0.05, roughness: 0.08, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
  sign: new THREE.MeshBasicMaterial({ color: 0xc79a3c }),
  light: new THREE.MeshBasicMaterial({ color: 0xffe4b8, toneMapped: false }),
};

// Subtle procedural textures keep the modular environment from reading as flat primitives.
function canvasTexture(w, h, paint, repeatX = 1, repeatY = 1) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  paint(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  return t;
}
const concreteMap = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#72766d';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 1300; i++) {
    const v = 90 + Math.random() * 80;
    ctx.fillStyle = `rgba(${v},${v + 3},${v - 4},${0.1 + Math.random() * 0.16})`;
    const s = 0.5 + Math.random() * 2.4;
    ctx.fillRect(Math.random() * w, Math.random() * h, s, s);
  }
  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = `rgba(45,48,43,${0.06 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.lineTo(Math.random() * w, Math.random() * h);
    ctx.stroke();
  }
}, 4, 4);
const corrugatedMap = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#5c625c';
  ctx.fillRect(0, 0, w, h);
  for (let x = 0; x < w; x += 12) {
    ctx.fillStyle = x % 24 === 0 ? 'rgba(255,250,230,.1)' : 'rgba(0,0,0,.14)';
    ctx.fillRect(x, 0, 5, h);
    ctx.fillStyle = 'rgba(0,0,0,.08)';
    ctx.fillRect(x + 5, 0, 1, h);
  }
}, 3, 1);
const floorMap = canvasTexture(256, 256, (ctx, w, h) => {
  ctx.fillStyle = '#535a53';
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 600; i++) {
    const v = 55 + Math.random() * 60;
    ctx.fillStyle = `rgba(${v},${v + 4},${v - 3},.18)`;
    ctx.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
}, 5, 5);
M.floor = new THREE.MeshStandardMaterial({ map: floorMap, color: 0xa8ada2, roughness: 0.85 });
M.wall = new THREE.MeshStandardMaterial({ map: corrugatedMap, color: 0x9aa09a, roughness: 0.72, metalness: 0.2 });
M.wallDark = new THREE.MeshStandardMaterial({ map: corrugatedMap, color: 0x606862, roughness: 0.78, metalness: 0.2 });
M.concrete = new THREE.MeshStandardMaterial({ map: concreteMap, color: 0xb0b2a7, roughness: 0.9 });

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
// Modular reference-driven environments
// ---------------------------------------------------------------------------
function addLamp(parent, x, y, z, cool = false) {
  box(parent, 0.62, 0.035, 0.12, M.darkSteel, x, y + 0.11, z, 0, 0, 0, false);
  box(parent, 0.56, 0.012, 0.08, M.light, x, y + 0.075, z, 0, 0, 0, false);
  const l = new THREE.PointLight(cool ? 0xcfe6e3 : 0xffd6a1, 11, 6, 2);
  l.position.set(x, y - 0.02, z);
  parent.add(l);
}

function pipeRun(parent, x1, y1, z1, x2, y2, z2, radius = 0.045, material = M.steel) {
  const a = new THREE.Vector3(x1, y1, z1);
  const b = new THREE.Vector3(x2, y2, z2);
  const d = b.clone().sub(a);
  const m = cyl(parent, radius, radius, d.length(), material, (x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2, 0, 0, 0, true, 12);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  return m;
}

function makePumpRoom(scene) {
  const g = new THREE.Group();
  add(g, new THREE.PlaneGeometry(10, 9), M.floor, 0, 0.002, 0, -Math.PI / 2, 0, 0, false);
  box(g, 9.4, 3.5, 0.18, M.wall, 0, 1.75, -3.1);
  for (const x of [-4.1, 4.1]) box(g, 0.18, 3.5, 7.2, M.wallDark, x, 1.75, 0.2);
  box(g, 9.4, 0.18, 7.2, M.wallDark, 0, 3.48, 0.2);
  for (const x of [-3.1, 0, 3.1]) box(g, 0.16, 3.3, 0.16, M.darkSteel, x, 1.65, -2.95);
  box(g, 9, 0.18, 0.2, M.darkSteel, 0, 2.95, -2.95);
  pipeRun(g, -3.9, 1.45, -2.86, 3.9, 1.45, -2.86, 0.07);
  pipeRun(g, -3.9, 1.05, -2.78, 3.9, 1.05, -2.78, 0.045);
  for (let x = -3.2; x <= 3.3; x += 1.1) {
    add(g, new THREE.TorusGeometry(0.09, 0.018, 6, 16), M.darkSteel, x, 1.45, -2.78, 0, Math.PI / 2, 0, false);
    add(g, new THREE.TorusGeometry(0.065, 0.014, 6, 16), M.darkSteel, x, 1.05, -2.7, 0, Math.PI / 2, 0, false);
  }
  box(g, 8.6, 0.08, 0.42, M.darkSteel, 0, 2.35, -2.82);
  for (let x = -4; x <= 4; x += 0.3) box(g, 0.035, 0.07, 0.36, M.steel, x, 2.4, -2.82, 0, 0, 0, false);
  box(g, 1.1, 1.5, 0.42, M.wallDark, 3.4, 0.75, -2.72);
  box(g, 0.06, 0.62, 0.26, M.sign, 3.4, 0.72, -2.49);
  box(g, 0.06, 0.3, 0.3, M.darkSteel, 3.4, 1.12, -2.49);
  addLamp(g, -1.7, 3.0, -1.3);
  addLamp(g, 1.5, 3.0, -1.3);
  addLamp(g, 0, 3.0, 1.1, true);
  for (const x of [-1.8, 1.8]) {
    box(g, 0.015, 0.003, 3.0, M.yellow, x, 0.008, 0.8, 0, 0, 0, false);
  }
  for (let i = 0; i < 4; i++) box(g, 0.01, 0.003, 0.55, M.yellow, -2.7 + i * 1.8, 0.009, 0.8, 0, 0, 0, false);
  box(g, 0.8, 0.012, 0.5, M.darkSteel, -2.8, 0.012, 0.1, 0, 0, 0, false);
  for (let i = 0; i < 6; i++) box(g, 0.72, 0.005, 0.02, M.steel, -2.8, 0.02, -0.05 + i * 0.06, 0, 0, 0, false);
  box(g, 0.24, 0.04, 0.15, M.sign, 2.7, 1.55, -2.95);
  box(g, 0.04, 0.04, 0.4, M.darkSteel, 2.7, 1.75, -2.8);
  scene.add(g);
}

function makeConveyorHall(scene) {
  const g = new THREE.Group();
  add(g, new THREE.PlaneGeometry(11, 9), M.floor, 0, 0.002, 0, -Math.PI / 2, 0, 0, false);
  box(g, 10, 3.5, 0.18, M.wall, 0, 1.75, -3.4);
  for (const x of [-4.8, 4.8]) box(g, 0.18, 3.5, 8, M.wallDark, x, 1.75, 0);
  // Window bands on the back wall.
  for (const x of [-2.6, 0, 2.6]) {
    const pane = add(g, new THREE.PlaneGeometry(1.7, 1.15), M.glass, x, 2.1, -3.3, 0, 0, 0, false);
    pane.userData.window = true;
    box(g, 1.8, 0.05, 0.06, M.darkSteel, x, 2.7, -3.3);
    box(g, 1.8, 0.05, 0.06, M.darkSteel, x, 1.5, -3.3);
  }
  // A single rear truss leaves the top of the frame open and readable.
  for (const z of [-2.9]) {
    box(g, 9.6, 0.13, 0.22, M.steel, 0, 3.15, z);
    for (const x of [-4.2, 4.2]) box(g, 0.18, 3.0, 0.18, M.steel, x, 1.5, z);
    for (let x = -3.8; x < 3.9; x += 0.95) {
      box(g, 0.05, 0.75, 0.05, M.steel, x, 3.35, z, 0, 0, 0.62, false);
      box(g, 0.05, 0.75, 0.05, M.steel, x + 0.45, 3.35, z, 0, 0, -0.62, false);
    }
  }
  for (const x of [-2.6, 0, 2.6]) addLamp(g, x, 3.05, 0.2);
  // Racking on the left and pallets at the back.
  for (const z of [-2.1, -0.9]) {
    for (const x of [-3.5, -2.3]) box(g, 0.06, 1.45, 0.06, M.steel, x, 0.72, z, 0, 0, 0, false);
    for (const y of [0.45, 0.95, 1.42]) box(g, 1.15, 0.05, 0.08, M.steel, -2.9, y, z, 0, 0, 0, false);
    box(g, 0.7, 0.35, 0.48, M.cardboard, -2.9, 0.7, z, 0, 0, 0);
    box(g, 0.62, 0.3, 0.42, M.cardboard, -3.8, 0.7, z, 0, 0, 0);
  }
  box(g, 1.2, 0.95, 0.55, M.darkSteel, 3.5, 0.475, -2.5);
  box(g, 0.8, 0.06, 0.4, M.sign, 3.5, 0.97, -2.5);
  for (const [x, z] of [[-1.7, 1.9], [2.4, 1.9]]) box(g, 0.34, 0.55, 0.4, M.wood, x, 0.275, z, 0, 0, 0);
  for (const x of [-2.2, 2.2]) box(g, 0.012, 0.003, 4.2, M.yellow, x, 0.008, 0.2, 0, 0, 0, false);
  scene.add(g);
}

function makeRoof(scene) {
  const g = new THREE.Group();
  add(g, new THREE.PlaneGeometry(12, 10), M.concrete, 0, 0.002, 0, -Math.PI / 2, 0, 0, false);
  box(g, 10.5, 0.65, 0.2, M.concrete, 0, 0.325, -4.2);
  box(g, 10.5, 0.65, 0.2, M.concrete, 0, 0.325, 4.2);
  for (const x of [-5.15, 5.15]) box(g, 0.2, 0.65, 8.4, M.concrete, x, 0.325, 0);
  for (const x of [-4.5, -1.5, 1.5, 4.5]) {
    box(g, 0.035, 0.8, 0.035, M.steel, x, 0.4, 3.9, 0, 0, 0, false);
    box(g, 0.035, 0.8, 0.035, M.steel, x, 0.4, -3.9, 0, 0, 0, false);
  }
  for (const z of [-3.9, 3.9]) box(g, 9.2, 0.04, 0.04, M.steel, 0, 0.8, z, 0, 0, 0, false);
  box(g, 1.8, 1.0, 1.1, M.wallDark, -3.6, 0.5, -2.4);
  box(g, 2.0, 0.08, 1.3, M.steel, -3.6, 1.02, -2.4);
  box(g, 1.25, 0.75, 0.9, M.wallDark, 3.8, 0.375, -1.8);
  box(g, 1.4, 0.06, 1.0, M.steel, 3.8, 0.76, -1.8);
  for (const x of [-4.5, 4.5]) {
    cyl(g, 0.12, 0.12, 0.8, M.steel, x, 0.4, -3.4, 0, 0, 0, true, 14);
    add(g, new THREE.TorusGeometry(0.13, 0.018, 6, 16), M.darkSteel, x, 0.8, -3.4, Math.PI / 2, 0, 0, false);
  }
  for (const [x, z, h] of [[-4.8, -5.6, 3.2], [-2.8, -6.2, 4.2], [0.5, -6.6, 2.8], [3.0, -6.0, 3.8], [5.4, -5.5, 2.6]]) {
    box(g, 1.15, h, 1.0, M.wallDark, x, h / 2, z, 0, 0, 0, false);
  }
  scene.add(g);
}

function makeTreatmentDeck(scene) {
  const g = new THREE.Group();
  add(g, new THREE.PlaneGeometry(12, 10), M.concrete, 0, 0.002, 0, -Math.PI / 2, 0, 0, false);
  box(g, 3.8, 1.2, 1.2, M.wallDark, -3.8, 0.6, -3.8);
  box(g, 4.0, 0.12, 1.35, M.steel, -3.8, 1.23, -3.8);
  box(g, 2.6, 1.5, 1.4, M.wall, 3.3, 0.75, -3.9);
  box(g, 2.8, 0.12, 1.55, M.steel, 3.3, 1.53, -3.9);
  for (const [x, z] of [[-2.1, 2.7], [2.1, 2.7], [-2.1, -2.2], [2.1, -2.2]]) {
    box(g, 0.06, 0.85, 0.06, M.steel, x, 0.43, z, 0, 0, 0, false);
  }
  for (const z of [2.7, -2.2]) box(g, 4.3, 0.045, 0.045, M.steel, 0, 0.85, z, 0, 0, 0, false);
  for (const x of [-2.1, 2.1]) box(g, 0.045, 0.045, 4.9, M.steel, x, 0.85, 0.25, 0, 0, 0, false);
  pipeRun(g, -3.5, 0.65, -3.1, -1.1, 0.48, -1.2, 0.08);
  pipeRun(g, 3.0, 0.7, -3.1, 1.4, 0.5, -1.3, 0.06);
  for (const [x, z] of [[-1.8, 1.8], [1.9, 1.2], [-1.6, -1.4], [1.3, 2.0]]) {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      box(g, 0.018, 0.7 + Math.random() * 0.5, 0.018, M.green, x + Math.cos(a) * 0.18, 0.35, z + Math.sin(a) * 0.18, 0, 0, 0.08, false);
    }
  }
  scene.add(g);
}
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
    this.renderer.toneMappingExposure = 1.28;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 4 / 3, 0.02, 20);
    this.scene.add(new THREE.HemisphereLight(0xcdd8cb, 0x28251c, 0.95));
    this.scene.add(new THREE.AmbientLight(0xb7b9a7, 0.52));
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
      makePumpRoom(this.scene);
      this.model = makePumpSet();
      this.model.position.set(0, 0, 0);
      this.scene.add(this.model);
      this.camera.position.set(2.15, 1.48, 3.1);
      this.camera.lookAt(0, 0.42, 0);
      this.camera.fov = 37;
    } else if (this.type === 'conveyor') {
      makeConveyorHall(this.scene);
      this.model = makeConveyor();
      this.model.position.set(0, 0, 0);
      this.scene.add(this.model);
      this.camera.position.set(2.65, 1.72, 3.25);
      this.camera.lookAt(0, 0.52, 0);
      this.camera.fov = 38;
    } else if (this.type === 'cooling') {
      makeRoof(this.scene);
      this.model = makeCoolingTower();
      this.model.position.set(0, 0, 0);
      this.scene.add(this.model);
      this.camera.position.set(2.35, 1.55, 3.2);
      this.camera.lookAt(0, 0.62, 0);
      this.camera.fov = 38;
    } else {
      makeTreatmentDeck(this.scene);
      this.model = makeWaterBasin();
      this.model.position.set(0, 0, 0);
      this.scene.add(this.model);
      this.camera.position.set(2.7, 1.85, 3.45);
      this.camera.lookAt(0, 0.45, 0);
      this.camera.fov = 39;
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

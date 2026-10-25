import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './deck.css';
import * as THREE from 'three';
import * as DATA from '../data/motor-data.js';
import { Motor } from '../model/motor.js';
import { createApplications } from '../model/applications.js';
import { clamp } from '../model/utils.js';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TAU = Math.PI * 2;
const state = { weather: 'clear', season: 'summer', minutes: 10 * 60 + 30, auto: false };

const WEATHER = {
  clear: { overcast: 0, rain: 0, snow: 0, wind: 0.08, label: 'CLEAR' },
  overcast: { overcast: 0.9, rain: 0, snow: 0, wind: 0.26, label: 'OVERCAST' },
  rain: { overcast: 0.82, rain: 1, snow: 0, wind: 0.34, label: 'RAIN' },
  snow: { overcast: 0.72, rain: 0, snow: 1, wind: 0.54, label: 'SNOW' },
  wind: { overcast: 0.22, rain: 0, snow: 0, wind: 1, label: 'WIND' },
};
const SEASON = {
  spring: { ground: 0x556a48, wheat: 0x789755, head: 0xa8bd75, leaf: 0x668b57, flower: true, snow: false },
  summer: { ground: 0x43593f, wheat: 0x8b9450, head: 0xc0a867, leaf: 0x456d4c, flower: false, snow: false },
  autumn: { ground: 0x6a5c3a, wheat: 0xa98640, head: 0xd0ac63, leaf: 0x9b653a, flower: false, snow: false },
  winter: { ground: 0x8d9992, wheat: 0x80775b, head: 0x968b68, leaf: 0x59635c, flower: false, snow: true },
};

const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const mixColor = (a, b, t) => new THREE.Color(a).lerp(new THREE.Color(b), t);

// ---------------------------------------------------------------------------
// Small geometry / material helpers
// ---------------------------------------------------------------------------
function mat(color, metalness = 0.15, roughness = 0.72) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness });
}
const materials = {
  concrete: mat(0x5d635d, 0.05, 0.93),
  darkConcrete: mat(0x353d39, 0.08, 0.9),
  steel: mat(0x495b5c, 0.72, 0.36),
  darkSteel: mat(0x1c292c, 0.62, 0.4),
  green: mat(0x2f4a45, 0.25, 0.6),
  safety: mat(0xc89a4e, 0.15, 0.6),
  wood: mat(0x65523b, 0.02, 0.88),
  water: new THREE.MeshPhysicalMaterial({ color: 0x17464d, metalness: 0.25, roughness: 0.12, transparent: true, opacity: 0.78, side: THREE.DoubleSide }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xa8c4c5, metalness: 0.04, roughness: 0.1, transparent: true, opacity: 0.16, side: THREE.DoubleSide }),
  snow: mat(0xe9efeb, 0.0, 0.9),
  leaf: mat(0x466e4c, 0.02, 0.9),
};

function add(parent, geo, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, cast = true) {
  const mesh = new THREE.Mesh(geo, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  mesh.castShadow = cast;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function addBox(p, w, h, d, m, x, y, z, ry = 0, cast = true) { return add(p, new THREE.BoxGeometry(w, h, d), m, x, y, z, 0, ry, 0, cast); }
const addCyl = (p, r1, r2, h, m, x, y, z, rx = 0, ry = 0, rz = 0, cast = true, seg = 16) => add(p, new THREE.CylinderGeometry(r1, r2, h, seg), m, x, y, z, rx, ry, rz, cast);

function contactShadow(parent, x, y, z, sx, sz, opacity = 0.24) {
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(1, 32),
    new THREE.MeshBasicMaterial({ color: 0x020403, transparent: true, opacity, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.scale.set(sx, sz, 1);
  parent.add(mesh);
  return mesh;
}

function makeRain(count, spreadX, spreadZ, height, color = 0xb9d9dd) {
  const positions = new Float32Array(count * 6);
  const drops = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spreadX * 2;
    const y = Math.random() * height;
    const z = (Math.random() - 0.5) * spreadZ * 2;
    const len = 0.05 + Math.random() * 0.12;
    positions.set([x, y, z, x - 0.01, y - len, z], i * 6);
    drops.push({ x, y, z, len, speed: 5 + Math.random() * 6 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0, depthWrite: false });
  const group = new THREE.LineSegments(geo, material);
  group.frustumCulled = false;
  return {
    group,
    update(dt, visible, wind = 0) {
      material.opacity = visible ? 0.42 : 0;
      if (!visible) return;
      const attr = group.geometry.getAttribute('position');
      for (let i = 0; i < drops.length; i++) {
        const p = drops[i];
        p.y -= p.speed * dt;
        p.x += wind * p.speed * 0.12 * dt;
        if (p.y < 0) {
          p.y = height;
          p.x = (Math.random() - 0.5) * spreadX * 2;
          p.z = (Math.random() - 0.5) * spreadZ * 2;
        }
        const j = i * 6;
        attr.array[j] = p.x;
        attr.array[j + 1] = p.y;
        attr.array[j + 2] = p.z;
        attr.array[j + 3] = p.x - 0.01;
        attr.array[j + 4] = p.y - p.len;
        attr.array[j + 5] = p.z;
      }
      attr.needsUpdate = true;
    },
  };
}

function makeSnow(count, spreadX, spreadZ, height) {
  const positions = new Float32Array(count * 3);
  const flakes = [];
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * spreadX * 2;
    const y = Math.random() * height;
    const z = (Math.random() - 0.5) * spreadZ * 2;
    positions.set([x, y, z], i * 3);
    flakes.push({ x, y, z, speed: 0.35 + Math.random() * 0.8, drift: (Math.random() - 0.5) * 0.25 });
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xf4f7f2, size: 0.035, transparent: true, opacity: 0, depthWrite: false, sizeAttenuation: true });
  const group = new THREE.Points(geo, material);
  group.frustumCulled = false;
  return {
    group,
    update(dt, visible, wind = 0) {
      material.opacity = visible ? 0.85 : 0;
      if (!visible) return;
      const attr = group.geometry.getAttribute('position');
      for (let i = 0; i < flakes.length; i++) {
        const p = flakes[i];
        p.y -= p.speed * dt;
        p.x += (p.drift + wind * 0.45) * dt;
        if (p.y < 0) {
          p.y = height;
          p.x = (Math.random() - 0.5) * spreadX * 2;
          p.z = (Math.random() - 0.5) * spreadZ * 2;
        }
        attr.array[i * 3] = p.x;
        attr.array[i * 3 + 1] = p.y;
        attr.array[i * 3 + 2] = p.z;
      }
      attr.needsUpdate = true;
    },
  };
}

function skyTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 256;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return { canvas, tex };
}

function setSkyGradient(sky, top, bottom) {
  const ctx = sky.canvas.getContext('2d');
  const grd = ctx.createLinearGradient(0, 0, 0, sky.canvas.height);
  grd.addColorStop(0, `#${top.getHexString()}`);
  grd.addColorStop(1, `#${bottom.getHexString()}`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, sky.canvas.width, sky.canvas.height);
  sky.tex.needsUpdate = true;
}

function makeWheatField(count, width, depth) {
  const stalkMat = new THREE.MeshStandardMaterial({ color: 0x80934f, roughness: 0.92 });
  const headMat = new THREE.MeshStandardMaterial({ color: 0xbba75f, roughness: 0.82 });
  const stalks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.006, 0.012, 0.3, 3), stalkMat, count);
  const heads = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.014, 0.03, 0.12, 5), headMat, count);
  const dummy = new THREE.Object3D();
  let placed = 0;
  for (let n = 0; n < count * 4 && placed < count; n++) {
    const x = (Math.random() - 0.5) * width * 2;
    const z = (Math.random() - 0.5) * depth * 2;
    if (x > -1.8 && x < 2.6 && z > -1.4 && z < 1.7) continue;
    const s = 0.7 + Math.random() * 0.55;
    dummy.position.set(x, 0.15 * s, z);
    dummy.rotation.set(0, Math.random() * TAU, 0);
    dummy.scale.set(0.8, s, 0.8);
    dummy.updateMatrix();
    stalks.setMatrixAt(placed, dummy.matrix);
    dummy.position.y = 0.3 * s + 0.05;
    dummy.scale.set(0.8, 0.8, 0.8);
    dummy.updateMatrix();
    heads.setMatrixAt(placed, dummy.matrix);
    placed++;
  }
  stalks.castShadow = false;
  heads.castShadow = false;
  const group = new THREE.Group();
  group.add(stalks, heads);
  return { group, stalkMat, headMat };
}

function makeTree(leafMat, snowMat) {
  const g = new THREE.Group();
  add(g, new THREE.CylinderGeometry(0.05, 0.085, 0.8, 7), materials.wood, 0, 0.4, 0, 0, 0, 0, false);
  const crown = add(g, new THREE.IcosahedronGeometry(0.48, 1), leafMat, 0, 0.98, 0, 0, 0, 0, false);
  crown.scale.set(1, 1.12, 0.85);
  add(g, new THREE.IcosahedronGeometry(0.3, 0), leafMat, 0.23, 1.25, 0.08, 0, 0, 0, false);
  add(g, new THREE.IcosahedronGeometry(0.27, 0), leafMat, -0.24, 1.17, -0.1, 0, 0, 0, false);
  const snow = add(g, new THREE.DodecahedronGeometry(0.42, 0), snowMat, 0, 1.5, 0, 0, 0, 0, false);
  snow.scale.set(1, 0.26, 0.8);
  snow.visible = false;
  g.userData.snow = snow;
  return g;
}

function addCloud(scene, x, y, z, scale, material) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTexture(), color: 0xdfe7e2, transparent: true, opacity: 0.22, depthWrite: false }));
  s.position.set(x, y, z);
  s.scale.set(scale, scale * 0.45, 1);
  scene.add(s);
  return s;
}

let _cloudTex;
function cloudTexture() {
  if (_cloudTex) return _cloudTex;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 14; i++) {
    const x = 40 + Math.random() * 176;
    const y = 48 + Math.random() * 36;
    const r = 16 + Math.random() * 34;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(245,250,246,.55)');
    g.addColorStop(1, 'rgba(245,250,246,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  _cloudTex = new THREE.CanvasTexture(c);
  _cloudTex.colorSpace = THREE.SRGBColorSpace;
  return _cloudTex;
}

// ---------------------------------------------------------------------------
// A single live application scene
// ---------------------------------------------------------------------------
class ApplicationScene {
  constructor(type, canvas) {
    this.type = type;
    this.canvas = canvas;
    this.clock = 0;
    this.spin = 0;
    this.mixerImpeller = null;
    this.waterSurface = null;
    this.wheat = null;
    this.trees = [];
    this.flowers = null;
    this.snowPatches = null;
    this.rain = null;
    this.snow = null;
    this.clouds = [];
    this.birds = null;
    this.flowBeads = null;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = type === 'conveyor' ? 1.42 : 1.24;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x9aa7a0, 0.022);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.03, 40);
    this.sky = skyTexture();
    this.sun = new THREE.DirectionalLight(0xffe1b7, 2.6);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -3;
    this.sun.shadow.camera.right = 3;
    this.sun.shadow.camera.top = 3;
    this.sun.shadow.camera.bottom = -2;
    this.sun.shadow.bias = -0.0007;
    this.scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xb7cdc7, 0x1b211c, 0.8);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xa3b3a8, 0.35);
    this.scene.add(this.ambient);
    this.indoorLights = [];
    this.motor = new Motor(this.renderer, DATA);
    this.motor.root.rotation.y = Math.PI / 2;
    this.build();
    this.resize();
    this.applyEnvironment(true);
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas.parentElement);
  }

  addMotor(x, z, scale = 1) {
    this.scene.add(this.motor.root);
    this.motor.root.position.set(x, 0.132 * scale, z);
    this.motor.root.scale.setScalar(scale);
  }

  build() {
    if (this.type === 'pump') this.buildPump();
    if (this.type === 'conveyor') this.buildConveyor();
    if (this.type === 'fan') this.buildFan();
    if (this.type === 'mixer') this.buildMixer();
    this.updateCamera();
  }

  updateCamera() {
    const preset = {
      pump: [[2.02, 1.22, 2.9], [0.22, 0.3, 0.2], 42],
      conveyor: [[2.02, 1.28, 2.8], [0.12, 0.32, 0.08], 42],
      fan: [[2.18, 1.32, 3.25], [0.16, 0.38, 0.02], 42],
      mixer: [[2.18, 1.38, 3.2], [0.2, 0.38, 0.14], 42],
    }[this.type];
    this.camera.position.set(...preset[0]);
    this.camera.lookAt(...preset[1]);
    this.camera.fov = preset[2];
    this.camera.updateProjectionMatrix();
  }

  buildPump() {
    const s = this.scene;
    add(s, new THREE.PlaneGeometry(28, 28), new THREE.MeshStandardMaterial({ color: 0x526345, roughness: 1 }), 0, -0.02, 0, -Math.PI / 2, 0, 0, false);
    add(s, new THREE.BoxGeometry(2.7, 0.075, 1.7), materials.concrete, 0.15, 0.02, 0.15);
    contactShadow(s, 0.3, 0.062, 0.15, 1.15, 0.72, 0.2);
    this.motor.root.position.set(-0.25, 0.15, 0.17);
    this.motor.root.scale.setScalar(1.3);
    s.add(this.motor.root);
    const apps = createApplications();
    this.pumpApp = apps;
    const pump = apps.pump;
    pump.scale.setScalar(1.48);
    pump.position.set(1.0, 0, 0.15);
    s.add(pump);
    addBox(s, 2.2, 0.014, 0.34, materials.darkSteel, 0.32, 0.03, 0.15);
    addCyl(s, 0.028, 0.028, 0.45, materials.darkSteel, 0.3, 0.16, 0.15, 0, 0, Math.PI / 2);
    addBox(s, 0.3, 0.1, 0.18, materials.darkSteel, 0.34, 0.17, 0.15);
    addCyl(s, 0.035, 0.045, 0.18, materials.steel, 0.98, 0.16, 0.15, 0, 0, Math.PI / 2);
    // A pressure gauge and discharge riser make the pump set legible.
    addCyl(s, 0.04, 0.04, 0.48, materials.steel, 1.18, 0.33, 0.15);
    add(s, new THREE.CircleGeometry(0.07, 20), new THREE.MeshBasicMaterial({ color: 0xe9e2cc }), 1.18, 0.57, 0.18, 0, 0, 0, false);
    add(s, new THREE.TorusGeometry(0.075, 0.008, 6, 20), materials.darkSteel, 1.18, 0.57, 0.18, 0, 0, 0, false);
    const needle = add(s, new THREE.BoxGeometry(0.04, 0.006, 0.006), new THREE.MeshBasicMaterial({ color: 0xb54b3c }), 1.2, 0.57, 0.19, 0, 0, 0.55, false);
    needle.userData.needle = true;
    this.wheat = makeWheatField(700, 7.2, 5.2);
    s.add(this.wheat.group);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x466d4e, roughness: 0.9 });
    for (const [x, z, sc] of [[-4.4, -1.7, 1.1], [-4.9, 1.7, 0.9], [4.4, -1.2, 0.85], [4.7, 1.8, 1.0], [-3.7, -4.0, 0.75]]) {
      const t = makeTree(leafMat, materials.snow);
      t.position.set(x, 0, z);
      t.scale.setScalar(sc);
      s.add(t);
      this.trees.push(t);
    }
    // Barn and silos.
    addBox(s, 2.3, 1.3, 1.5, materials.wood, -3.3, 0.65, -6.2);
    add(s, new THREE.BoxGeometry(2.6, 0.16, 1.8), materials.darkSteel, -3.3, 1.38, -6.2, 0, 0, 0.4, false);
    addBox(s, 0.45, 0.52, 0.04, materials.darkSteel, -3.3, 0.55, -5.43, 0, false);
    for (const [x, h] of [[3.3, 2.4], [4.0, 2.8]]) {
      addCyl(s, 0.27, 0.31, h, materials.concrete, x, h / 2, -6.4, 0, 0, 0, false);
      add(s, new THREE.ConeGeometry(0.31, 0.22, 12), materials.darkSteel, x, h + 0.11, -6.4, 0, 0, 0, false);
    }
    // Fence and a few reeds/flowers.
    for (let i = 0; i < 6; i++) addBox(s, 0.05, 0.8, 0.05, materials.wood, -3.5 + i * 1.35, 0.4, -3.3, 0, false);
    addBox(s, 7.2, 0.035, 0.035, materials.wood, 0, 0.35, -3.3, 0, false);
    addBox(s, 7.2, 0.035, 0.035, materials.wood, 0, 0.7, -3.3, 0, false);
    this.flowers = new THREE.Group();
    for (let i = 0; i < 22; i++) {
      const f = add(this.flowers, new THREE.SphereGeometry(0.028, 5, 4), new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xdfb966 : 0xb9a77b }), (Math.random() - 0.5) * 10, 0.08, (Math.random() - 0.5) * 7, 0, 0, 0, false);
      f.scale.y = 0.65;
    }
    s.add(this.flowers);
    this.snowPatches = new THREE.Group();
    for (let i = 0; i < 16; i++) {
      const x = (Math.random() - 0.5) * 10;
      const z = (Math.random() - 0.5) * 7;
      const p = add(this.snowPatches, new THREE.DodecahedronGeometry(0.15 + Math.random() * 0.16, 0), materials.snow, x, 0.04, z, 0, 0, 0, false);
      p.scale.set(1.3, 0.12, 0.9);
    }
    s.add(this.snowPatches);
    // A small flock above the wheat.
    this.birds = new THREE.Group();
    const birdMat = new THREE.MeshBasicMaterial({ color: 0x26302b });
    for (let i = 0; i < 6; i++) {
      const b = new THREE.Group();
      add(b, new THREE.BoxGeometry(0.12, 0.008, 0.022), birdMat, -0.06, 0, 0, 0, 0, 0.25, false);
      add(b, new THREE.BoxGeometry(0.12, 0.008, 0.022), birdMat, 0.06, 0, 0, 0, 0, -0.25, false);
      b.userData = { phase: i * 1.1, r: 2 + i * 0.35, y: 2.7 + (i % 3) * 0.35 };
      this.birds.add(b);
    }
    s.add(this.birds);
    this.rain = makeRain(380, 8, 6, 7);
    this.snow = makeSnow(420, 8, 6, 7);
    s.add(this.rain.group, this.snow.group);
    for (let i = 0; i < 4; i++) this.clouds.push(addCloud(s, -4 + i * 3, 3.8 + (i % 2) * 0.6, -5.5, 2.8, null));
    // Water-flow beads in the discharge pipe.
    this.flowBeads = new THREE.Group();
    const beadMat = new THREE.MeshBasicMaterial({ color: 0x8fd8df, transparent: true, opacity: 0.75 });
    for (let i = 0; i < 6; i++) add(this.flowBeads, new THREE.SphereGeometry(0.018, 6, 5), beadMat, 0, 0, 0, 0, 0, 0, false);
    this.flowBeads.position.set(0.98, 0.55, 0.15);
    s.add(this.flowBeads);
  }

  buildConveyor() {
    const s = this.scene;
    this.scene.background = new THREE.Color(0x151b19);
    this.scene.fog = new THREE.Fog(0x0c1110, 5, 16);
    add(s, new THREE.PlaneGeometry(12, 10), new THREE.MeshStandardMaterial({ color: 0x4b544c, roughness: 0.9 }), 0, 0, 0.5, -Math.PI / 2, 0, 0, false);
    contactShadow(s, 0.05, 0.008, 0.25, 1.7, 0.7, 0.24);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x6a7067, roughness: 0.95 });
    addBox(s, 8.8, 3.0, 0.18, wallMat, 0, 1.5, -3.2);
    for (const x of [-4.35, 4.35]) addBox(s, 0.18, 3.0, 6.5, wallMat, x, 1.5, -0.2);
    addBox(s, 8.8, 0.18, 6.5, new THREE.MeshStandardMaterial({ color: 0x3a423c, roughness: 0.95 }), 0, 3.05, -0.2);
    const windowLight = new THREE.DirectionalLight(0xdcebe6, 2.6);
    windowLight.position.set(0, 2.4, -5);
    windowLight.target.position.set(0, 0.35, 1.2);
    s.add(windowLight, windowLight.target);
    this.indoorLights.push(windowLight);
    // Window openings with sky panes.
    for (const x of [-2.2, 0, 2.2]) {
      add(s, new THREE.PlaneGeometry(1.5, 1.35), materials.glass, x, 1.7, -3.08, 0, 0, 0, false);
      addBox(s, 1.58, 0.045, 0.06, materials.darkSteel, x, 2.4, -3.12);
      addBox(s, 1.58, 0.045, 0.06, materials.darkSteel, x, 1.0, -3.12);
      const pane = add(s, new THREE.PlaneGeometry(1.45, 1.25), new THREE.MeshBasicMaterial({ color: 0xa9b8b0, transparent: true, opacity: 0.35 }), x, 1.7, -3.06, 0, 0, 0, false);
      pane.userData.window = true;
    }
    for (const z of [-2.0, -0.2, 1.6]) {
      addBox(s, 8.4, 0.12, 0.16, materials.steel, 0, 2.75, z);
      for (const x of [-3.6, 3.6]) addBox(s, 0.14, 2.7, 0.14, materials.steel, x, 1.35, z);
    }
    for (const x of [-2.2, 0, 2.2]) {
      addBox(s, 0.7, 0.025, 0.12, new THREE.MeshBasicMaterial({ color: 0xf6e5c5 }), x, 2.42, 0.25);
      const l = new THREE.PointLight(0xffd6a4, 14, 6, 2);
      l.position.set(x, 2.2, 0.25);
      s.add(l);
      this.indoorLights.push(l);
    }
    this.motor.root.position.set(-0.65, 0.15, 0.25);
    this.motor.root.scale.setScalar(1.32);
    s.add(this.motor.root);
    const apps = createApplications();
    this.pumpApp = apps;
    const conveyor = apps.conveyor;
    conveyor.scale.setScalar(1.55);
    conveyor.position.set(0.6, 0, 0.25);
    s.add(conveyor);
    addBox(s, 2.2, 0.012, 0.4, materials.darkSteel, -0.05, 0.02, 0.25);
    addCyl(s, 0.028, 0.028, 0.6, materials.darkSteel, -0.2, 0.16, 0.25, 0, 0, Math.PI / 2);
    addBox(s, 0.3, 0.11, 0.2, materials.darkSteel, -0.2, 0.16, 0.25);
    // Crates, cabinet, wall signage.
    addBox(s, 0.85, 1.35, 0.45, materials.darkSteel, 3.3, 0.675, -1.9);
    addBox(s, 0.06, 0.95, 0.3, materials.safety, 3.3, 0.72, -1.65);
    for (let i = 0; i < 3; i++) addBox(s, 0.5, 0.34, 0.38, materials.wood, -3.1 + (i % 2) * 0.55, 0.17 + Math.floor(i / 2) * 0.36, -2.1, 0, false);
    for (const [x, z] of [[-1.8, -2.1], [1.7, -2.1]]) add(s, new THREE.ConeGeometry(0.06, 0.2, 12), materials.safety, x, 0.1, z, 0, 0, 0, false);
    addBox(s, 0.9, 0.02, 0.08, materials.safety, 0, 0.005, -1.6);
    // Racking and a workbench add the scale cues of a real assembly hall.
    for (const z of [-2.4, -0.8]) {
      for (const x of [-2.0, -0.9]) addBox(s, 0.05, 1.35, 0.05, materials.steel, x, 0.675, z, 0, false);
      addBox(s, 1.2, 0.05, 0.06, materials.steel, -1.45, 0.55, z, 0, false);
      addBox(s, 1.2, 0.05, 0.06, materials.steel, -1.45, 1.05, z, 0, false);
      addBox(s, 0.75, 0.28, 0.4, materials.wood, -1.45, 0.7, z, 0, false);
    }
    addBox(s, 1.7, 0.08, 0.7, materials.wood, -2.0, 0.82, 1.55);
    for (const x of [-2.7, -1.3]) addBox(s, 0.06, 0.8, 0.5, materials.darkSteel, x, 0.41, 1.55);
    this.flowers = null;
    this.snowPatches = new THREE.Group();
    s.add(this.snowPatches);
    this.rain = makeRain(220, 5, 2, 4.2);
    this.snow = makeSnow(180, 5, 2, 4.2);
    this.rain.group.position.z = -4.5;
    this.snow.group.position.z = -4.5;
    s.add(this.rain.group, this.snow.group);
    this.clouds = [];
  }

  buildFan() {
    const s = this.scene;
    add(s, new THREE.PlaneGeometry(18, 18), new THREE.MeshStandardMaterial({ color: 0x545d53, roughness: 0.96 }), 0, -0.18, 0, -Math.PI / 2, 0, 0, false);
    addBox(s, 8, 0.2, 6, materials.concrete, 0, -0.1, -0.3);
    contactShadow(s, 0.15, 0.012, 0.08, 1.3, 0.65, 0.22);
    addBox(s, 8.3, 0.62, 0.16, materials.concrete, 0, 0.3, -3.3);
    addBox(s, 8.3, 0.62, 0.16, materials.concrete, 0, 0.3, 2.7);
    for (const x of [-4.1, 4.1]) addBox(s, 0.16, 0.62, 6, materials.concrete, x, 0.3, -0.3);
    // HVAC plant sits behind the fan so the machine remains the subject.
    addBox(s, 1.55, 0.78, 1.05, materials.green, -2.55, 0.42, -3.7);
    addBox(s, 1.62, 0.06, 1.12, materials.darkSteel, -2.55, 0.84, -3.7);
    addBox(s, 0.52, 0.42, 0.03, materials.darkSteel, -2.55, 0.42, -3.16);
    addBox(s, 1.25, 0.62, 0.92, materials.green, 2.65, 0.34, -3.45);
    addBox(s, 1.32, 0.05, 0.98, materials.darkSteel, 2.65, 0.68, -3.45);
    addCyl(s, 0.22, 0.22, 0.66, materials.steel, 0.2, 0.35, -2.6);
    addBox(s, 1.4, 0.22, 0.22, materials.steel, 1.9, 0.5, -1.2);
    addBox(s, 0.4, 0.5, 0.4, materials.darkSteel, 2.7, 0.25, 0.9);
    // Railing.
    for (const x of [-3.7, -1.2, 1.3, 3.8]) for (const z of [-2.8, 2.3]) addBox(s, 0.035, 0.7, 0.035, materials.steel, x, 0.35, z, 0, false);
    for (const z of [-2.8, 2.3]) addBox(s, 7.6, 0.04, 0.04, materials.steel, 0, 0.7, z, 0, false);
    addBox(s, 3.0, 0.04, 0.04, materials.steel, 0, 0.7, 2.3, 0, false);
    this.motor.root.position.set(-0.35, 0.15, 0.1);
    this.motor.root.scale.setScalar(1.28);
    s.add(this.motor.root);
    const apps = createApplications();
    this.pumpApp = apps;
    const fan = apps.fan;
    fan.scale.setScalar(1.8);
    fan.position.set(0.68, 0, 0.1);
    s.add(fan);
    addBox(s, 1.7, 0.02, 0.44, materials.steel, 0.15, 0.02, 0.1);
    addBox(s, 0.32, 0.1, 0.2, materials.darkSteel, 0.22, 0.16, 0.1);
    // Distant city silhouette with window bands, kept behind the roof plant.
    const cityMat = new THREE.MeshStandardMaterial({ color: 0x586564, roughness: 0.92 });
    const cityWindow = new THREE.MeshBasicMaterial({ color: 0xb7c7bb, transparent: true, opacity: 0.34 });
    for (const [x, z, w, h] of [[-5.5, -10, 1.4, 2.6], [-3.8, -11, 1.1, 3.5], [-1.6, -12, 1.6, 2.1], [1.8, -12, 1.2, 4.0], [4.2, -10, 1.5, 2.9], [7.0, -13, 2.0, 3.5]]) {
      addBox(s, w, h, 1.2, cityMat, x, h / 2, z, 0, false);
      for (let row = 0; row < Math.floor(h * 2.2); row++) {
        addBox(s, w * 0.72, 0.035, 0.01, cityWindow, x, 0.28 + row * 0.34, z + 0.61, 0, false);
      }
    }
    this.snowPatches = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const p = add(this.snowPatches, new THREE.DodecahedronGeometry(0.35 + Math.random() * 0.4, 0), materials.snow, (Math.random() - 0.5) * 6, 0.06, (Math.random() - 0.5) * 4, 0, 0, 0, false);
      p.scale.set(1.5, 0.08, 1);
    }
    s.add(this.snowPatches);
    this.rain = makeRain(320, 8, 6, 7);
    this.snow = makeSnow(350, 8, 6, 7);
    s.add(this.rain.group, this.snow.group);
    this.clouds = [];
    for (let i = 0; i < 3; i++) this.clouds.push(addCloud(s, -3 + i * 3, 4.2, -8, 3.4, null));
  }

  buildMixer() {
    const s = this.scene;
    add(s, new THREE.PlaneGeometry(24, 24), new THREE.MeshStandardMaterial({ color: 0x566451, roughness: 1 }), 0, -0.02, 0, -Math.PI / 2, 0, 0, false);
    add(s, new THREE.PlaneGeometry(12, 8), new THREE.MeshStandardMaterial({ color: 0x59645c, roughness: 0.93 }), 0, 0.005, 0.2, -Math.PI / 2, 0, 0, false);
    addBox(s, 4.7, 0.08, 2.3, materials.concrete, 0, 0.03, 0.2);
    contactShadow(s, 0.1, 0.075, 0.2, 1.5, 0.85, 0.18);
    // A treatment plant backdrop: control building, second basin, pipe bridge.
    addBox(s, 2.8, 1.35, 1.30, new THREE.MeshStandardMaterial({ color: 0x46534f, roughness: 0.9 }), -3.5, 0.675, -5.0);
    addBox(s, 2.9, 0.16, 1.45, materials.darkSteel, -3.5, 1.38, -5.0);
    addCyl(s, 0.5, 0.55, 0.45, new THREE.MeshStandardMaterial({ color: 0x2f5054, metalness: 0.4, roughness: 0.45 }), 3.5, 0.24, -4.4, 0, 0, 0, false);
    addCyl(s, 0.52, 0.52, 0.03, materials.darkSteel, 3.5, 0.47, -4.4, 0, 0, 0, false);
    addCyl(s, 0.055, 0.055, 2.2, materials.steel, 3.0, 0.9, -3.0, 0, 0, Math.PI / 2, false);
    for (const x of [3.0, 1.9, 0.8]) addCyl(s, 0.035, 0.035, 0.8, materials.steel, x, 0.4, -3.0, 0, 0, 0, false);
    this.motor.root.position.set(-0.78, 0.15, 0.2);
    this.motor.root.scale.setScalar(1.28);
    s.add(this.motor.root);
    // Mixer tank.
    const tankMat = new THREE.MeshStandardMaterial({ color: 0x36545a, metalness: 0.5, roughness: 0.45, side: THREE.DoubleSide });
    add(s, new THREE.CylinderGeometry(0.72, 0.76, 0.52, 36, 1, true), tankMat, 0.58, 0.26, 0.2, 0, 0, 0, false);
    add(s, new THREE.CylinderGeometry(0.72, 0.72, 0.03, 36), materials.darkSteel, 0.58, 0.52, 0.2, 0, 0, 0, false);
    add(s, new THREE.TorusGeometry(0.74, 0.025, 6, 36), materials.steel, 0.58, 0.52, 0.2, Math.PI / 2, 0, 0, false);
    this.waterSurface = add(s, new THREE.CircleGeometry(0.7, 36), new THREE.MeshPhysicalMaterial({ color: 0x1a5a62, metalness: 0.25, roughness: 0.1, transparent: true, opacity: 0.75, side: THREE.DoubleSide }), 0.58, 0.45, 0.2, -Math.PI / 2, 0, 0, false);
    this.mixerImpeller = new THREE.Group();
    this.mixerImpeller.position.set(0.58, 0.3, 0.2);
    s.add(this.mixerImpeller);
    addCyl(this.mixerImpeller, 0.025, 0.025, 0.5, materials.steel, 0.55, 0, 0, 0, 0, Math.PI / 2, false);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU;
      add(this.mixerImpeller, new THREE.BoxGeometry(0.02, 0.34, 0.04), materials.steel, 0, Math.cos(a) * 0.13, Math.sin(a) * 0.13, a, 0, 0, false);
    }
    addCyl(s, 0.03, 0.03, 0.2, materials.darkSteel, -0.25, 0.16, 0.2, 0, 0, Math.PI / 2);
    addBox(s, 0.35, 0.1, 0.2, materials.darkSteel, -0.22, 0.16, 0.2);
    addBox(s, 1.75, 0.012, 0.42, materials.darkSteel, -0.2, 0.02, 0.2);
    // Pipes, ladder, rail.
    addCyl(s, 0.055, 0.055, 1.0, materials.steel, 1.42, 0.42, 0.2, 0, 0, 0, false);
    addCyl(s, 0.055, 0.055, 1.6, materials.steel, 1.42, 0.85, -0.5, 0, 0, Math.PI / 2, false);
    for (const z of [-0.3, 0.7]) for (const x of [-1.7, 1.8]) addBox(s, 0.04, 0.8, 0.04, materials.safety, x, 0.4, z, 0, false);
    // Reeds and a few flowers around the basin.
    const reedMat = new THREE.MeshStandardMaterial({ color: 0x64784c, roughness: 0.9 });
    for (let i = 0; i < 40; i++) {
      const x = (Math.random() - 0.5) * 8;
      const z = 2 + Math.random() * 2.5;
      add(s, new THREE.CylinderGeometry(0.008, 0.012, 0.55 + Math.random() * 0.5, 3), reedMat, x, 0.28, z, 0, Math.random() * TAU, 0.03, false);
    }
    this.snowPatches = new THREE.Group();
    s.add(this.snowPatches);
    this.rain = makeRain(300, 8, 6, 7);
    this.snow = makeSnow(300, 8, 6, 7);
    s.add(this.rain.group, this.snow.group);
    this.clouds = [];
    for (let i = 0; i < 3; i++) this.clouds.push(addCloud(s, -3 + i * 3, 4.0, -7, 3.2, null));
  }

  resize() {
    const parent = this.canvas.parentElement;
    const w = parent.clientWidth || 1;
    const h = parent.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  applyEnvironment(initial = false) {
    const spec = WEATHER[state.weather] || WEATHER.clear;
    const season = SEASON[state.season] || SEASON.summer;
    const hour = state.minutes / 60;
    const sun = Math.sin(((hour - 6) / 12) * Math.PI);
    const day = clamp(sun * 3.2 + 0.1);
    const night = 1 - day;
    const overcast = spec.overcast;
    const warm = Math.exp(-Math.pow(sun / 0.22, 2)) * clamp(sun + 0.1);

    const top = mixColor(0x527d91, 0x07121c, night).lerp(new THREE.Color(0x7b8580), overcast * 0.7);
    const bottom = mixColor(0xc7d0c2, 0x13222c, night).lerp(new THREE.Color(0x9ca197), overcast * 0.65);
    const horizon = mixColor(0xc98b55, 0x18242a, night).lerp(new THREE.Color(0x8e958c), overcast * 0.6);
    bottom.lerp(horizon, warm * 0.38);
    if (this.type !== 'conveyor') setSkyGradient(this.sky, top, bottom);
    this.canvas.parentElement.style.background = this.type === 'conveyor'
      ? 'linear-gradient(180deg, #252d28, #111713)'
      : `linear-gradient(180deg, #${top.getHexString()}, #${bottom.getHexString()})`;
    this.scene.fog.color.copy(bottom);
    this.scene.fog.density = this.type === 'conveyor' ? 0.01 : 0.016 + overcast * 0.012;

    const sunDir = new THREE.Vector3(Math.cos(((hour - 6) / 12) * Math.PI) * 0.8, Math.max(0.05, sun), -0.35).normalize();
    this.sun.position.set(sunDir.x * 6, sunDir.y * 7, sunDir.z * 5);
    this.sun.target.position.set(0, 0.2, 0);
    this.sun.color.setHex(warm > 0.3 ? 0xffb673 : 0xffe7c7);
    this.sun.intensity = this.type === 'conveyor' ? 0.7 + day * 1.2 : 0.9 + day * 2.4;
    this.sun.intensity *= 1 - overcast * 0.55;
    this.hemi.intensity = this.type === 'conveyor' ? 0.75 + day * 0.3 : 0.55 + day * 0.7;
    this.ambient.intensity = this.type === 'conveyor' ? 0.5 : 0.25 + day * 0.3;
    this.indoorLights.forEach((l) => { l.intensity = (8 + night * 20) * (0.8 + overcast * 0.2); });

    if (this.type === 'pump') {
      this.wheat.stalkMat.color.setHex(season.wheat);
      this.wheat.headMat.color.setHex(season.head);
      this.wheat.group.visible = state.season !== 'winter';
      this.flowers.visible = state.season === 'spring';
      this.snowPatches.visible = season.snow || state.weather === 'snow';
      this.trees.forEach((t) => { t.userData.snow.visible = state.season === 'winter'; });
    }
    if (this.type === 'fan') {
      this.snowPatches.visible = season.snow || state.weather === 'snow';
    }
    if (this.type === 'mixer') {
      this.snowPatches.visible = season.snow || state.weather === 'snow';
    }
    if (this.type === 'conveyor') {
      this.scene.children.forEach((o) => {
        if (o.userData && o.userData.window) {
          o.material.color.copy(bottom).lerp(new THREE.Color(0xd6e4df), 0.35);
        }
      });
    }
    this.rain?.update(0.016, spec.rain > 0.5, spec.wind);
    this.snow?.update(0.016, spec.snow > 0.5, spec.wind);
    this._spec = spec;
  }

  update(dt, time) {
    this.clock = time;
    this.applyEnvironment();
    const spec = this._spec || WEATHER.clear;
    this.spin = (this.spin + dt * (this.type === 'mixer' ? 2.8 : 4.5)) % TAU;
    this.motor.setSpin(this.spin);
    if (this.pumpApp) this.pumpApp.update(dt, time);
    if (this.mixerImpeller) {
      this.mixerImpeller.rotation.x += dt * 2.6;
      this.waterSurface.rotation.z += dt * 0.3;
      this.waterSurface.scale.setScalar(1 + Math.sin(time * 0.002) * 0.006);
    }
    if (this.wheat) {
      this.wheat.group.rotation.z = Math.sin(time * 0.0008) * 0.008 * (0.5 + spec.wind * 3);
    }
    this.trees.forEach((t, i) => { t.rotation.z = Math.sin(time * 0.0007 + i) * 0.014 * (0.4 + spec.wind * 2.2); });
    if (this.birds) {
      this.birds.children.forEach((b, i) => {
        const p = b.userData;
        const a = time * 0.00018 + p.phase;
        b.position.set(Math.cos(a) * p.r, p.y + Math.sin(a * 1.8 + i) * 0.15, -0.7 + Math.sin(a) * p.r * 0.45);
        b.rotation.y = -a + Math.PI / 2;
      });
    }
    if (this.flowBeads) {
      this.flowBeads.children.forEach((b, i) => {
        const a = (time * 0.00035 + i / 6) % 1;
        b.position.set(0, a * 0.34, 0);
      });
    }
    if (this.rain) this.rain.update(dt, spec.rain > 0.5, spec.wind);
    if (this.snow) this.snow.update(dt, spec.snow > 0.5, spec.wind);
    this.clouds.forEach((c, i) => {
      c.position.x += dt * (0.02 + spec.wind * 0.16);
      if (c.position.x > 8) c.position.x = -8;
      if (c.material) c.material.opacity = 0.08 + (1 - spec.overcast) * 0.18;
    });
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}

// ---------------------------------------------------------------------------
// UI wiring
// ---------------------------------------------------------------------------
function updateClock() {
  const m = ((Math.floor(state.minutes) % 1440) + 1440) % 1440;
  const h = String(Math.floor(m / 60)).padStart(2, '0');
  const mm = String(m % 60).padStart(2, '0');
  $('#clock').textContent = `${h}:${mm}`;
  $('#time-slider').value = String(m);
  document.querySelectorAll('.panel-weather').forEach((el) => {
    const map = { clear: 'CLEAR', overcast: 'OVERCAST', rain: 'RAIN', snow: 'SNOW', wind: 'WIND' };
    el.textContent = `${map[state.weather]} / ${state.season.toUpperCase()} / ${h}:${mm}`;
  });
}

$$('.weather-buttons button').forEach((b) => b.addEventListener('click', () => {
  state.weather = b.dataset.weather;
  document.body.dataset.weather = state.weather;
  $$('.weather-buttons button').forEach((x) => x.classList.toggle('active', x === b));
  updateClock();
}));
$$('.season-buttons button').forEach((b) => b.addEventListener('click', () => {
  state.season = b.dataset.season;
  document.body.dataset.season = state.season;
  $$('.season-buttons button').forEach((x) => x.classList.toggle('active', x === b));
  updateClock();
}));
$('#time-slider').addEventListener('input', (e) => {
  state.minutes = Number(e.target.value);
  state.auto = false;
  $('#auto-time').classList.remove('active');
  updateClock();
});
$('#auto-time').addEventListener('click', () => {
  state.auto = !state.auto;
  $('#auto-time').classList.toggle('active', state.auto);
});

const scenes = $$('[data-canvas]').map((canvas) => new ApplicationScene(canvas.dataset.canvas, canvas));
document.body.dataset.weather = state.weather;
document.body.dataset.season = state.season;
updateClock();

let last = performance.now();
let acc = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  if (state.auto) {
    state.minutes = (state.minutes + dt * 8) % 1440;
    updateClock();
  }
  acc += dt;
  if (acc < 1 / 30) return;
  const step = Math.min(acc, 0.06);
  acc = 0;
  scenes.forEach((s) => s.update(step, now));
  scenes.forEach((s) => s.render());
}
requestAnimationFrame(loop);

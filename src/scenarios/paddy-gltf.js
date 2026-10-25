import '@fontsource-variable/archivo';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './photo.css';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const canvas = $('.scene3d');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(38, 1, 0.03, 80);
const hemi = new THREE.HemisphereLight(0xc8d6c7, 0x27281d, 0.9);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0xb5b9a6, 0.32);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffe2b7, 3.0);
sun.position.set(4.5, 7, 4.0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -8;
sun.shadow.camera.right = 8;
sun.shadow.camera.top = 8;
sun.shadow.camera.bottom = -8;
sun.shadow.bias = -0.0005;
scene.add(sun, sun.target);

camera.position.set(3.6, 2.35, 4.35);
camera.lookAt(0, 0.55, 0);
camera.fov = 36;
camera.updateProjectionMatrix();

let model = null;
let impeller = null;
let valveWheel = null;
let gaugeNeedle = null;
let casing = [];
let casingMats = [];
let pumpState = { running: true, valve: 1, cutaway: false };

const loader = new GLTFLoader();
loader.load('/models/paddy_pump_station.glb', (gltf) => {
  model = gltf.scene;
  scene.add(model);
  model.traverse((obj) => {
    if (!obj.isMesh) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    if (obj.name === 'PumpCasing' || obj.name === 'PumpSuction' || obj.name === 'PumpDischarge') {
      casing.push(obj);
    }
  });
  impeller = model.getObjectByName('Impeller');
  valveWheel = model.getObjectByName('ValveWheel');
  gaugeNeedle = model.getObjectByName('GaugeNeedle');
  casingMats = casing.map((o) => o.material);
  window.__paddyModel = model;
  applyPumpState();
  document.body.classList.add('asset-ready');
}, undefined, (error) => {
  console.error('Paddy model failed to load', error);
  document.body.classList.add('asset-error');
});

function applyPumpState() {
  if (!model) return;
  casing.forEach((obj, i) => {
    const base = casingMats[i];
    if (!base) return;
    if (pumpState.cutaway) {
      obj.material = base.clone();
      obj.material.transparent = true;
      obj.material.opacity = 0.18;
      obj.material.depthWrite = false;
    } else {
      obj.material = base;
    }
  });
}
function applyPumpMaterialState() {
  if (!model) return;
  casing.forEach((obj, i) => {
    const base = casingMats[i];
    if (!base) return;
    if (pumpState.cutaway) {
      obj.material = base.clone();
      obj.material.transparent = true;
      obj.material.opacity = 0.18;
      obj.material.depthWrite = false;
    } else {
      obj.material = base;
    }
  });
}

function updatePumpState(next) {
  pumpState = { ...pumpState, ...next };
  applyPumpMaterialState();
}

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
  const q = pumpState.running ? 90 * pumpState.valve : 0;
  const head = pumpState.running ? 12 * (1 + 0.25 * (1 - pumpState.valve)) : 0;
  const hydraulic = (1000 * 9.81 * q * head) / 3.6e6;
  const shaft = q > 0.1 ? hydraulic / 0.72 : pumpState.running ? 0.55 : 0;
  const load = Math.min(110, (shaft / 5.5) * 100);
  const current = pumpState.running ? 4.2 + 6.9 * Math.min(1.1, load / 100) : 0.3;
  return { q, head, hydraulic, shaft, load, current };
}

function refreshPumpUI() {
  const p = computePump();
  ui.valve.value = String(Math.round(pumpState.valve * 100));
  ui.valveOut.textContent = `${Math.round(pumpState.valve * 100)}%`;
  ui.status.textContent = pumpState.running ? 'RUNNING' : 'STOPPED';
  ui.status.style.color = pumpState.running ? 'var(--sage)' : 'var(--dim)';
  ui.start.classList.toggle('active', pumpState.running);
  ui.stop.classList.toggle('active', !pumpState.running);
  ui.cutaway.classList.toggle('active', pumpState.cutaway);
  ui.flow.textContent = String(Math.round(p.q));
  ui.current.textContent = p.current.toFixed(1);
  ui.load.textContent = String(Math.round(p.load));
  if (!pumpState.running) {
    ui.note.textContent = '停机 · 先关闭出口阀，再断开电机电源。';
  } else if (pumpState.valve < 0.04) {
    ui.note.textContent = '出口阀关闭 · 泵内再循环，不应长时间运行。';
  } else {
    ui.note.textContent = `Q ${Math.round(p.q)} m³/h · H ${p.head.toFixed(1)} m · 水力 ${p.hydraulic.toFixed(2)} kW · 轴功率约 ${p.shaft.toFixed(2)} kW · 负载 ${Math.round(p.load)}%`;
  }
  updatePumpState({ running: pumpState.running, valve: pumpState.valve, cutaway: pumpState.cutaway });
}

ui.start.addEventListener('click', () => { pumpState.running = true; refreshPumpUI(); });
ui.stop.addEventListener('click', () => { pumpState.running = false; refreshPumpUI(); });
ui.cutaway.addEventListener('click', () => { pumpState.cutaway = !pumpState.cutaway; refreshPumpUI(); });
ui.valve.addEventListener('input', () => { pumpState.valve = Number(ui.valve.value) / 100; refreshPumpUI(); });
refreshPumpUI();

function resize() {
  const w = canvas.parentElement.clientWidth || 1;
  const h = canvas.parentElement.clientHeight || 1;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas.parentElement);
resize();

let last = performance.now();
let acc = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
  last = now;
  acc += dt;
  if (acc < 1 / 30) return;
  const step = Math.min(acc, 0.06);
  acc = 0;
  if (model) {
    if (impeller) impeller.rotation.x += pumpState.running ? step * (2.5 + pumpState.valve * 5.5) : 0;
    if (valveWheel) valveWheel.rotation.z = (1 - pumpState.valve) * 2.4;
    if (gaugeNeedle) gaugeNeedle.rotation.z = 0.1 + Math.min(1, (pumpState.running ? 12 * (1 + .25 * (1 - pumpState.valve)) : 0) / 15) * 1.1;
  }
  renderer.render(scene, camera);
}
requestAnimationFrame(animate);
window.__axisPump = { setPumpState: updatePumpState };

import * as THREE from 'three';
import { PI2, roundedBox, shadowed } from './utils.js';

const mat = (color, metalness = 0.7, roughness = 0.34, emissive = 0x000000) =>
  new THREE.MeshStandardMaterial({ color, metalness, roughness, emissive, emissiveIntensity: 0.35 });

const STEEL = mat(0x87969a, 0.86, 0.3);
const DARK = mat(0x0b1417, 0.5, 0.5);
const PAINT = mat(0x1f4a53, 0.42, 0.42);
const SAFETY = mat(0xc28d3f, 0.25, 0.5);
const COPPER = mat(0xb36c40, 0.8, 0.32);
const RUBBER = mat(0x090d0e, 0.05, 0.82);
const CYAN = new THREE.MeshBasicMaterial({
  color: 0x6dc4ce,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const AMBER_GLOW = new THREE.MeshBasicMaterial({
  color: 0xe0a04a,
  transparent: true,
  opacity: 0.32,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

function add(parent, geometry, material, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(shadowed(mesh));
  return mesh;
}

function pad(parent, radius = 0.2, color = CYAN) {
  const ring = new THREE.Mesh(new THREE.RingGeometry(radius * 0.82, radius, 48), color);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.004;
  parent.add(ring);
  const tick = new THREE.Mesh(new THREE.RingGeometry(radius * 1.06, radius * 1.09, 48), color);
  tick.rotation.x = -Math.PI / 2;
  tick.position.y = 0.003;
  parent.add(tick);
}

function buildPump() {
  const g = new THREE.Group();
  g.name = 'application-pump';
  add(g, roundedBox(0.34, 0.032, 0.2, 0.005, 2), SAFETY, 0, 0.018, 0);
  add(g, new THREE.BoxGeometry(0.3, 0.018, 0.15), DARK, 0, 0.043, 0);

  // Volute casing, shaft and impeller.
  add(g, new THREE.TorusGeometry(0.062, 0.03, 14, 48), PAINT, 0, 0.145, 0, 0, Math.PI / 2, 0);
  add(g, new THREE.CylinderGeometry(0.085, 0.085, 0.038, 40), PAINT, 0, 0.145, 0, 0, 0, Math.PI / 2);
  add(g, new THREE.CylinderGeometry(0.021, 0.021, 0.14, 24), STEEL, 0.095, 0.145, 0, 0, 0, Math.PI / 2);
  add(g, new THREE.CylinderGeometry(0.026, 0.026, 0.025, 24), STEEL, 0.172, 0.145, 0, 0, 0, Math.PI / 2);
  const impeller = new THREE.Group();
  impeller.position.set(-0.05, 0.145, 0);
  g.add(impeller);
  add(impeller, new THREE.CylinderGeometry(0.02, 0.02, 0.022, 20), COPPER, 0, 0, 0, 0, 0, Math.PI / 2);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * PI2;
    add(impeller, new THREE.BoxGeometry(0.008, 0.055, 0.015), COPPER, 0, Math.cos(a) * 0.03, Math.sin(a) * 0.03, a, 0, 0);
  }

  // Inlet / outlet pipework.
  add(g, new THREE.CylinderGeometry(0.028, 0.028, 0.1, 24), DARK, -0.135, 0.145, 0, 0, 0, Math.PI / 2);
  add(g, new THREE.TorusGeometry(0.03, 0.005, 6, 24), STEEL, -0.188, 0.145, 0, 0, Math.PI / 2, 0);
  add(g, new THREE.CylinderGeometry(0.023, 0.023, 0.09, 24), DARK, 0.02, 0.225, 0);
  add(g, new THREE.TorusGeometry(0.026, 0.004, 6, 24), STEEL, 0.02, 0.272, 0, Math.PI / 2, 0, 0);
  add(g, new THREE.TorusGeometry(0.04, 0.003, 6, 32), CYAN, 0.02, 0.282, 0, Math.PI / 2, 0, 0);
  const pulse = add(g, new THREE.RingGeometry(0.05, 0.053, 42), CYAN, 0.02, 0.286, 0, Math.PI / 2, 0, 0);
  pulse.material = CYAN.clone();
  pulse.material.transparent = true;
  pulse.material.opacity = 0.3;
  pulse.userData.kind = 'pulse';

  for (const x of [-0.11, 0.11]) {
    for (const z of [-0.035, 0.035]) {
      add(g, new THREE.CylinderGeometry(0.008, 0.008, 0.012, 12), STEEL, x, 0.041, z);
    }
  }
  pad(g, 0.235, CYAN);
  g.userData = { impeller, pulse };
  return g;
}

function buildConveyor() {
  const g = new THREE.Group();
  g.name = 'application-conveyor';
  const length = 0.62;
  const width = 0.17;
  add(g, new THREE.BoxGeometry(length, 0.024, width), RUBBER, 0, 0.093, 0);
  for (const z of [-0.09, 0.09]) {
    add(g, roundedBox(length, 0.032, 0.022, 0.004, 2), STEEL, 0, 0.075, z);
    add(g, roundedBox(length, 0.018, 0.018, 0.003, 2), SAFETY, 0, 0.038, z);
    for (const x of [-0.23, 0.23]) add(g, new THREE.BoxGeometry(0.035, 0.08, 0.035), DARK, x, 0.04, z * 0.72);
  }
  for (let i = 0; i < 7; i++) {
    const x = -0.25 + (i / 6) * 0.5;
    add(g, new THREE.CylinderGeometry(0.015, 0.015, 0.165, 20), STEEL, x, 0.083, 0, Math.PI / 2, 0, 0);
  }
  const cleats = [];
  for (let i = 0; i < 12; i++) {
    const cleat = add(g, new THREE.BoxGeometry(0.008, 0.004, 0.145), SAFETY, -0.3, 0.103, 0);
    cleats.push(cleat);
  }
  const packages = [];
  for (let i = 0; i < 3; i++) {
    const box = add(g, roundedBox(0.065, 0.055, 0.075, 0.003, 2), i === 1 ? PAINT : SAFETY, 0, 0.135, 0);
    packages.push(box);
  }
  // Drive guard / control pillar at one end.
  add(g, roundedBox(0.13, 0.12, 0.13, 0.005, 2), DARK, 0.31, 0.08, 0.02);
  add(g, new THREE.CylinderGeometry(0.014, 0.014, 0.06, 12), PAINT, 0.34, 0.15, 0.02);
  add(g, new THREE.SphereGeometry(0.009, 12, 8), CYAN, 0.34, 0.185, 0.02);
  pad(g, 0.3, AMBER_GLOW);
  g.userData = { cleats, packages };
  return g;
}

function buildFan() {
  const g = new THREE.Group();
  g.name = 'application-fan';
  add(g, roundedBox(0.28, 0.03, 0.2, 0.005, 2), DARK, 0, 0.018, 0);
  add(g, new THREE.CylinderGeometry(0.075, 0.09, 0.05, 32), PAINT, 0, 0.055, 0);
  // Duct / housing along X.
  add(g, new THREE.CylinderGeometry(0.115, 0.115, 0.18, 40, 1, true), STEEL, 0.06, 0.17, 0, 0, 0, Math.PI / 2);
  add(g, new THREE.TorusGeometry(0.112, 0.006, 8, 48), STEEL, -0.03, 0.17, 0, 0, Math.PI / 2, 0);
  add(g, new THREE.TorusGeometry(0.112, 0.006, 8, 48), STEEL, 0.15, 0.17, 0, 0, Math.PI / 2, 0);
  // Grille.
  for (let i = 0; i < 4; i++) {
    add(g, new THREE.TorusGeometry(0.108 - i * 0.024, 0.002, 5, 40), DARK, 0.151, 0.17, 0, 0, Math.PI / 2, 0);
  }
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    add(g, new THREE.BoxGeometry(0.004, 0.21, 0.004), DARK, 0.151, 0.17, 0, a, 0, 0);
  }
  const rotor = new THREE.Group();
  rotor.position.set(0.04, 0.17, 0);
  g.add(rotor);
  add(rotor, new THREE.CylinderGeometry(0.027, 0.027, 0.035, 24), DARK, 0, 0, 0, 0, 0, Math.PI / 2);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * PI2;
    add(rotor, new THREE.BoxGeometry(0.006, 0.086, 0.032), STEEL, 0, Math.cos(a) * 0.052, Math.sin(a) * 0.052, a, 0.35, 0);
  }
  add(g, new THREE.CylinderGeometry(0.03, 0.04, 0.08, 20), PAINT, -0.11, 0.075, 0);
  pad(g, 0.245, CYAN);
  g.userData = { rotor };
  return g;
}

export function createApplications() {
  const root = new THREE.Group();
  root.name = 'application-scenes';
  const pump = buildPump();
  pump.position.set(-0.88, 0, 0.18);
  pump.rotation.y = 0.4;
  pump.scale.setScalar(1.1);
  const conveyor = buildConveyor();
  conveyor.position.set(0.12, 0, -0.82);
  conveyor.rotation.y = -0.08;
  const fan = buildFan();
  fan.position.set(0.88, 0, -0.08);
  fan.rotation.y = -0.48;
  root.add(pump, conveyor, fan);
  root.visible = false;

  return {
    root,
    pump,
    conveyor,
    fan,
    update(dt, elapsed) {
      pump.userData.impeller.rotation.x += dt * 8.5;
      const pulse = 0.2 + (Math.sin(elapsed * 3.4) + 1) * 0.09;
      for (const child of pump.children) {
        if (child.userData.kind === 'pulse') {
          child.material.opacity = pulse;
          child.scale.setScalar(1 + Math.sin(elapsed * 3.4) * 0.05);
        }
      }
      conveyor.userData.cleats.forEach((cleat, i) => {
        cleat.position.x = -0.3 + ((elapsed * 0.11 + i / 12) % 1) * 0.6;
      });
      conveyor.userData.packages.forEach((box, i) => {
        const t = (elapsed * 0.065 + i / 3) % 1;
        box.position.x = -0.25 + t * 0.5;
        box.position.y = 0.13 + Math.sin(t * Math.PI) * 0.006;
        box.rotation.y = Math.sin(t * PI2) * 0.05;
      });
      fan.userData.rotor.rotation.x += dt * 7.2;
    },
  };
}

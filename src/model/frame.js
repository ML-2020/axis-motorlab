import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  PI2,
  addBolts,
  boltGeometry,
  box,
  circleDisc,
  decalPlane,
  latheZ,
  makeLogoPlateTexture,
  makeNameplateTexture,
  plateExtrudeZ,
  rad,
  ringExtrudeZ,
  roundedBox,
  shadowed,
  torusZ,
} from './utils.js';

const makeGroup = (name) => {
  const g = new THREE.Group();
  g.name = name;
  return g;
};

function finGeometry() {
  const geo = new THREE.BoxGeometry(0.0056, 0.028, 0.312, 1, 1, 1);
  // soften the outer edges with a tiny chamfer strip is overkill; the cast look comes from the material.
  return geo;
}

export function buildStatorFrame(kit) {
  const g = makeGroup('stator-frame');
  const paint = kit.get('paint');
  const darkPaint = kit.get('paintDark');
  const steel = kit.get('steelDark');
  const zinc = kit.get('zinc');

  // Main pressure-tight cast shell. A closed lathe profile gives a real wall thickness.
  const shell = latheZ(
    [
      [0.1025, -0.17],
      [0.124, -0.17],
      [0.128, -0.162],
      [0.128, 0.162],
      [0.124, 0.17],
      [0.1025, 0.17],
      [0.1025, -0.17],
    ],
    paint,
    96,
  );
  shadowed(shell);
  g.add(shell);

  // rolled end rims
  const rimA = torusZ(0.1288, 0.0032, paint, 10, 96);
  rimA.position.z = 0.164;
  const rimB = rimA.clone();
  rimB.position.z = -0.164;
  g.add(shadowed(rimA), shadowed(rimB));

  // Longitudinal cooling fins. Leave clear space on top for the terminal box and below for feet.
  const finGeos = [];
  const finBase = finGeometry();
  const finCount = 32;
  for (let i = 0; i < finCount; i++) {
    const a = (i / finCount) * PI2;
    const normalized = Math.atan2(Math.sin(a), Math.cos(a));
    const topGap = Math.abs(normalized) < 0.34;
    const bottomGap = Math.abs(Math.abs(normalized) - Math.PI) < 0.33;
    const plateGap = Math.abs(normalized - Math.PI / 2) < 0.22;
    const plateGap2 = Math.abs(normalized + Math.PI / 2) < 0.22;
    if (topGap || bottomGap || plateGap || plateGap2) continue;
    const mesh = new THREE.Mesh(finBase.clone(), paint);
    mesh.position.set(Math.sin(a) * 0.136, Math.cos(a) * 0.136, 0);
    mesh.rotation.z = -a;
    mesh.updateMatrix();
    finGeos.push(mesh.geometry.applyMatrix4(mesh.matrix));
  }
  finBase.dispose();
  const fins = new THREE.Mesh(mergeGeometries(finGeos, false), paint);
  finGeos.forEach((x) => x.dispose());
  shadowed(fins);
  g.add(fins);

  // Cast feet: two continuous rails with four drilled mounting pads and stiffening webs.
  const footMat = paint;
  for (const sx of [-1, 1]) {
    const rail = new THREE.Mesh(roundedBox(0.1, 0.025, 0.32, 0.006, 2), footMat);
    rail.position.set(sx * 0.104, -0.118, 0);
    g.add(shadowed(rail));

    const web = new THREE.Mesh(roundedBox(0.046, 0.038, 0.22, 0.008, 2), footMat);
    web.position.set(sx * 0.105, -0.093, 0);
    g.add(shadowed(web));

    for (const sz of [-1, 1]) {
      const pad = new THREE.Mesh(roundedBox(0.088, 0.011, 0.082, 0.005, 2), darkPaint);
      pad.position.set(sx * 0.105, -0.0995, sz * 0.071);
      g.add(shadowed(pad));
      const hole = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0095, 0.017, 20), kit.get('rubber'));
      hole.position.set(sx * 0.105, -0.102, sz * 0.071);
      g.add(hole);
      const chamfer = new THREE.Mesh(new THREE.TorusGeometry(0.0095, 0.0011, 6, 24), darkPaint);
      chamfer.rotation.x = Math.PI / 2;
      chamfer.position.set(sx * 0.105, -0.0944, sz * 0.071);
      g.add(chamfer);
    }

    // mounting foot bolt pads sit slightly proud
    const footBoltPads = new THREE.Mesh(roundedBox(0.11, 0.006, 0.32, 0.003, 1), darkPaint);
    footBoltPads.position.set(sx * 0.104, -0.1055, 0);
    g.add(footBoltPads);
  }

  // Heavy cast terminal-box landing pad
  const topPad = new THREE.Mesh(roundedBox(0.085, 0.012, 0.128, 0.006, 2), darkPaint);
  topPad.position.set(0, 0.126, 0.035);
  g.add(shadowed(topPad));

  // Lifting eye pad at NDE side of the top
  const eyePad = new THREE.Mesh(new THREE.CylinderGeometry(0.023, 0.027, 0.014, 32), darkPaint);
  eyePad.position.set(0, 0.128, -0.088);
  g.add(shadowed(eyePad));

  // Terminal box mounting inserts
  addBolts(
    g,
    [
      [-0.03, 0.133, 0.096],
      [0.03, 0.133, 0.096],
      [-0.03, 0.133, -0.026],
      [0.03, 0.133, -0.026],
    ].map((position) => ({ position, scale: 0.72 })),
    zinc,
    { radius: 0.0047, headHeight: 0.0038, washerRadius: 0.0062, shank: 0.012 },
  );

  // Drain plug, breather and grounding boss
  const drain = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, 0.011, 6), kit.get('brass'));
  drain.rotation.z = Math.PI / 2;
  drain.position.set(-0.128, -0.072, 0.11);
  g.add(drain);

  const groundBoss = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.012, 6), steel);
  groundBoss.rotation.z = Math.PI / 2;
  groundBoss.position.set(-0.132, -0.082, -0.105);
  g.add(groundBoss);
  addBolts(
    g,
    [{ position: [-0.142, -0.082, -0.105], rotationZ: 0, rotationX: 0, scale: 0.7 }],
    zinc,
    { radius: 0.0042, headHeight: 0.003, washerRadius: 0.0055, shank: 0.01 },
  );

  // Stator core locating keys visible between fins
  for (const [angle, z] of [
    [rad(22), 0.12],
    [rad(158), 0.12],
    [rad(202), -0.12],
    [rad(338), -0.12],
  ]) {
    const key = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.016, 0.07), steel);
    key.position.set(Math.sin(angle) * 0.114, Math.cos(angle) * 0.114, z);
    key.rotation.z = -angle;
    g.add(key);
  }

  // Flat machined pads for the nameplate and the cast brand plate. These sit
  // between fin banks exactly as they do on a production 132S frame.
  const nameplatePad = new THREE.Mesh(roundedBox(0.007, 0.084, 0.128, 0.0025, 2), darkPaint);
  nameplatePad.position.set(-0.1295, 0.002, 0.035);
  g.add(nameplatePad);

  const logoPad = new THREE.Mesh(roundedBox(0.006, 0.04, 0.09, 0.002, 2), darkPaint);
  logoPad.position.set(0.1305, 0.032, 0.0);
  g.add(logoPad);

  // Cast part number and axis mark, subtly embossed on the side
  const logo = decalPlane(0.074, 0.023, makeLogoPlateTexture(), { roughness: 0.4, metalness: 0.4 });
  logo.rotation.y = Math.PI / 2;
  logo.position.set(0.1342, 0.032, 0.0);
  g.add(logo);

  return g;
}

function ventHoles(count = 6, radius = 0.0875, holeRadius = 0.0182, phase = Math.PI / 6) {
  const holes = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * PI2;
    holes.push({ x: Math.cos(a) * radius, y: Math.sin(a) * radius, r: holeRadius });
  }
  return holes;
}

export function buildEndshield(kit, { front = false } = {}) {
  const g = makeGroup(front ? 'front-endshield' : 'rear-endshield');
  const paint = kit.get('paintDark');
  const steel = kit.get('steel');
  const zinc = kit.get('zinc');
  const outward = front ? 1 : -1;
  const boltRadius = 0.124;
  const centerHole = 0.0468;

  // Bearing bore plus ventilation apertures and four through-bolts.
  const holes = [{ x: 0, y: 0, r: centerHole }, ...ventHoles()];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * PI2;
    holes.push({ x: Math.cos(a) * boltRadius, y: Math.sin(a) * boltRadius, r: 0.0052 });
  }

  const plate = plateExtrudeZ({ outer: 0.138, depth: 0.028, holes, bevel: 0.0022, segments: 96 }, paint);
  shadowed(plate);
  g.add(plate);

  // Bearing boss on the outside face
  const boss = ringExtrudeZ({ outer: 0.059, inner: 0.0468, depth: 0.016, bevel: 0.0015, segments: 64 }, paint);
  boss.position.z = outward * 0.020;
  g.add(shadowed(boss));

  const sealSeat = torusZ(0.0575, 0.0024, steel, 8, 64);
  sealSeat.position.z = outward * 0.0285;
  g.add(sealSeat);

  // Reinforcement ribs radiating from the bearing boss
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * PI2 + Math.PI / 4;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.065, 0.012), paint);
    rib.position.set(Math.cos(a) * 0.085, Math.sin(a) * 0.085, outward * 0.014);
    rib.rotation.z = a - Math.PI / 2;
    g.add(rib);
  }

  // Ventilation grille lips around each aperture
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + (i / 6) * PI2;
    const lip = new THREE.Mesh(new THREE.TorusGeometry(0.0188, 0.0018, 6, 28), paint);
    lip.position.set(Math.cos(a) * 0.0875, Math.sin(a) * 0.0875, outward * 0.0145);
    g.add(lip);
  }

  // Frame attachment bolts
  const bolts = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * PI2;
    bolts.push({
      position: [Math.cos(a) * boltRadius, Math.sin(a) * boltRadius, outward * 0.0145],
      rotationY: front ? 0 : Math.PI,
    });
  }
  addBolts(g, bolts, zinc, { radius: 0.006, headHeight: 0.005, washerRadius: 0.0085, shank: 0.05 });

  // Machined fit ring that centers the shield in the frame
  const spigot = ringExtrudeZ({ outer: 0.101, inner: 0.092, depth: 0.014, bevel: 0.001, segments: 80 }, steel);
  spigot.position.z = -outward * 0.016;
  g.add(spigot);

  return g;
}

export function buildBearingCover(kit, { front = false } = {}) {
  const g = makeGroup(front ? 'front-bearing-cover' : 'rear-bearing-cover');
  const paint = kit.get('paintDark');
  const steel = kit.get('steel');
  const rubber = kit.get('rubber');
  const zinc = kit.get('zinc');
  const outward = front ? 1 : -1;
  const centerHole = front ? 0.0245 : 0;

  const holes = [];
  if (centerHole) holes.push({ x: 0, y: 0, r: centerHole });
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * PI2;
    holes.push({ x: Math.cos(a) * 0.0405, y: Math.sin(a) * 0.0405, r: 0.0036 });
  }
  const cover = plateExtrudeZ({ outer: 0.057, depth: 0.011, holes, bevel: 0.0016, segments: 64 }, paint);
  shadowed(cover);
  g.add(cover);

  const lip = ringExtrudeZ({ outer: 0.046, inner: 0.039, depth: 0.008, bevel: 0.001, segments: 64 }, paint);
  lip.position.z = outward * 0.008;
  g.add(lip);

  if (!front) {
    // Rear cover is closed with a central grease nipple and cap
    const nippleHex = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.008, 6), kit.get('brass'));
    nippleHex.rotation.x = Math.PI / 2;
    nippleHex.position.z = outward * 0.008;
    g.add(nippleHex);
    const nipple = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.014, 12), kit.get('brass'));
    nipple.rotation.x = Math.PI / 2;
    nipple.position.z = outward * 0.016;
    g.add(nipple);
  } else {
    const seal = new THREE.Mesh(new THREE.TorusGeometry(0.0252, 0.002, 8, 40), rubber);
    seal.position.z = outward * 0.007;
    g.add(seal);
  }

  const bolts = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * PI2;
    bolts.push({
      position: [Math.cos(a) * 0.0405, Math.sin(a) * 0.0405, outward * 0.0055],
      rotationY: front ? 0 : Math.PI,
    });
  }
  addBolts(g, bolts, zinc, { radius: 0.0037, headHeight: 0.0034, washerRadius: 0.0055, shank: 0.014 });
  const fitRing = new THREE.Mesh(new THREE.TorusGeometry(0.0462, 0.0013, 6, 48), steel);
  fitRing.position.z = outward * 0.006;
  g.add(fitRing);
  return g;
}

export function buildFanCover(kit) {
  const g = makeGroup('fan-cover');
  const paint = kit.get('paintDark');
  const steel = kit.get('steel');
  const zinc = kit.get('zinc');

  // Pressed-steel shroud, closed profile so the inner surface is visible when exploded.
  const shroud = latheZ(
    [
      [0.124, 0.045],
      [0.124, -0.02],
      [0.121, -0.032],
      [0.107, -0.046],
      [0.074, -0.055],
      [0.046, -0.058],
      [0.043, -0.051],
      [0.069, -0.047],
      [0.102, -0.039],
      [0.116, -0.027],
      [0.118, -0.014],
      [0.118, 0.045],
      [0.124, 0.045],
    ],
    paint,
    96,
  );
  shadowed(shroud);
  g.add(shroud);

  const rim = torusZ(0.1215, 0.0034, steel, 8, 96);
  rim.position.z = 0.045;
  g.add(rim);
  const rearRim = torusZ(0.057, 0.0024, steel, 8, 64);
  rearRim.position.z = -0.055;
  g.add(rearRim);

  // Rear finger guard: concentric rings and radial spokes
  const grilleZ = -0.058;
  for (const [radius, tube] of [
    [0.058, 0.0019],
    [0.077, 0.0019],
    [0.096, 0.0019],
    [0.113, 0.002],
  ]) {
    const ring = torusZ(radius, tube, steel, 6, 72);
    ring.position.z = grilleZ;
    g.add(ring);
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * PI2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.0028, 0.058, 0.0028), steel);
    spoke.position.set(Math.cos(a) * 0.084, Math.sin(a) * 0.084, grilleZ);
    spoke.rotation.z = a - Math.PI / 2;
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.02, 0.016, 24), paint);
  hub.rotation.x = Math.PI / 2;
  hub.position.z = grilleZ + 0.008;
  g.add(hub);

  // Mounting tabs and bolts at the front flange
  const bolts = [];
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + (i / 4) * PI2;
    const tab = new THREE.Mesh(roundedBox(0.022, 0.018, 0.007, 0.003, 2), paint);
    tab.position.set(Math.cos(a) * 0.118, Math.sin(a) * 0.118, 0.049);
    tab.rotation.z = a - Math.PI / 2;
    g.add(shadowed(tab));
    bolts.push({
      position: [Math.cos(a) * 0.118, Math.sin(a) * 0.118, 0.0525],
      rotationY: 0,
    });
  }
  addBolts(g, bolts, zinc, { radius: 0.0045, headHeight: 0.0034, washerRadius: 0.0064, shank: 0.014 });

  // Debossed brand plate on the side of the shroud
  const badge = decalPlane(0.068, 0.021, makeLogoPlateTexture(), { roughness: 0.42, metalness: 0.45 });
  badge.rotation.y = Math.PI / 2;
  badge.position.set(0.1255, 0.006, 0.019);
  g.add(badge);

  return g;
}

export function buildLiftingEye(kit) {
  const g = makeGroup('lifting-eye');
  const paint = kit.get('paintDark');
  const steel = kit.get('steel');
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.017, 0.021, 0.012, 6), paint);
  collar.position.y = 0.006;
  g.add(shadowed(collar));
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.0095, 0.0105, 0.038, 20), paint);
  stem.position.y = 0.031;
  g.add(shadowed(stem));
  const eye = torusZ(0.017, 0.0052, paint, 12, 40);
  eye.position.y = 0.059;
  g.add(shadowed(eye));
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.012, 16, 12), paint);
  boss.position.y = 0.045;
  g.add(boss);
  const thread = new THREE.Mesh(new THREE.TorusGeometry(0.0165, 0.0012, 6, 40), steel);
  thread.position.y = 0.014;
  thread.rotation.x = Math.PI / 2;
  g.add(thread);
  return g;
}

export function buildNameplate(kit) {
  const g = makeGroup('nameplate');
  const plateMat = kit.get('steelBrushed');
  const backing = new THREE.Mesh(roundedBox(0.004, 0.071, 0.112, 0.0015, 2), plateMat);
  backing.position.x = -0.001;
  g.add(backing);

  const texture = makeNameplateTexture();
  const face = decalPlane(0.104, 0.063, texture, { roughness: 0.34, metalness: 0.45 });
  face.rotation.y = -Math.PI / 2;
  face.position.x = -0.0035;
  g.add(face);

  for (const [z, y] of [
    [-0.046, 0.028],
    [-0.046, -0.028],
    [0.046, 0.028],
    [0.046, -0.028],
  ]) {
    const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.0032, 0.0032, 0.0035, 16), kit.get('zinc'));
    rivet.rotation.z = Math.PI / 2;
    rivet.position.set(-0.005, y, z);
    g.add(rivet);
  }
  return g;
}

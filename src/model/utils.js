import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const PI2 = Math.PI * 2;
export const rad = (deg) => (deg * Math.PI) / 180;

export function shadowed(object, cast = true, receive = true) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
  return object;
}

export function roundedBox(w, h, d, radius = 0.006, segments = 3) {
  return new RoundedBoxGeometry(w, h, d, segments, Math.min(radius, w / 2, h / 2, d / 2));
}

export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  return mesh;
}

export function cylinderZ(radiusTop, radiusBottom, length, segments, mat, openEnded = false) {
  const geometry = new THREE.CylinderGeometry(radiusTop, radiusBottom, length, segments, 1, openEnded);
  geometry.rotateX(Math.PI / 2);
  return new THREE.Mesh(geometry, mat);
}

export function circleDisc(radius, mat, segments = 64) {
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(radius, segments), mat);
  return mesh;
}

export function torusZ(radius, tube, mat, radialSegments = 12, tubularSegments = 72, arc = PI2) {
  return new THREE.Mesh(new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments, arc), mat);
}

export function ringExtrudeZ({ outer, inner, depth, bevel = 0.0015, segments = 72 }, mat) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, PI2, false);
  if (inner > 0) {
    const hole = new THREE.Path();
    hole.absarc(0, 0, inner, 0, PI2, true);
    shape.holes.push(hole);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: segments,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geo, mat);
}

/**
 * Extruded circular plate with optional central bore and arbitrary circular holes.
 * holes: [{x, y, r}] in the local XY plane.
 */
export function plateExtrudeZ({ outer, depth, holes = [], bevel = 0.0012, segments = 80 }, mat) {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, 0, PI2, false);
  for (const h of holes) {
    const path = new THREE.Path();
    path.absarc(h.x, h.y, h.r, 0, PI2, true);
    shape.holes.push(path);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: segments,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geo, mat);
}

export function latheZ(profile, mat, segments = 72) {
  const points = profile.map(([r, z]) => new THREE.Vector2(r, z));
  const geo = new THREE.LatheGeometry(points, segments);
  geo.rotateX(Math.PI / 2);
  return new THREE.Mesh(geo, mat);
}

export function curveTube(points, radius, mat, tubularSegments = 120, radialSegments = 8, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'centripetal', 0.5);
  const geo = new THREE.TubeGeometry(curve, tubularSegments, radius, radialSegments, closed);
  return new THREE.Mesh(geo, mat);
}

let boltGeometryCache = new Map();
export function boltGeometry({ radius = 0.006, headHeight = 0.005, washerRadius = 0.009, washerHeight = 0.0014, shank = 0.012 } = {}) {
  const key = [radius, headHeight, washerRadius, washerHeight, shank].join(':');
  if (boltGeometryCache.has(key)) return boltGeometryCache.get(key);
  const head = new THREE.CylinderGeometry(radius, radius, headHeight, 6, 1, false);
  head.rotateX(Math.PI / 2);
  head.translate(0, 0, headHeight / 2);
  const washer = new THREE.CylinderGeometry(washerRadius, washerRadius, washerHeight, 24, 1, false);
  washer.rotateX(Math.PI / 2);
  washer.translate(0, 0, -washerHeight / 2);
  const stem = new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, shank, 12, 1, false);
  stem.rotateX(Math.PI / 2);
  stem.translate(0, 0, -shank / 2);
  const merged = mergeGeometries([head, washer, stem], false);
  head.dispose();
  washer.dispose();
  stem.dispose();
  boltGeometryCache.set(key, merged);
  return merged;
}

/**
 * Bolt heads whose seating plane is z=0 and whose stems extend into -Z.
 * transforms: [{position: [x,y,z], rotationY?: number, rotationX?: number}]
 */
export function addBolts(parent, transforms, mat, options = {}) {
  const geometry = boltGeometry(options);
  const mesh = new THREE.InstancedMesh(geometry, mat, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((t, i) => {
    dummy.position.set(...t.position);
    dummy.rotation.set(t.rotationX ?? 0, t.rotationY ?? 0, t.rotationZ ?? 0);
    dummy.scale.setScalar(t.scale ?? 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

export function boltsOnCircle({ count, radius, z, phase = 0, headRadius = 0.006 }) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const a = phase + (i / count) * PI2;
    out.push({
      position: [Math.cos(a) * radius, Math.sin(a) * radius, z],
      rotationY: 0,
      headRadius,
    });
  }
  return out;
}

export function makeCanvasTexture(width, height, draw, colorSpace = THREE.SRGBColorSpace) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  draw(ctx, width, height);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = colorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

export function makeNameplateTexture() {
  return makeCanvasTexture(1024, 640, (ctx, w, h) => {
    const bg = ctx.createLinearGradient(0, 0, w, h);
    bg.addColorStop(0, '#cfd4d4');
    bg.addColorStop(0.24, '#eef1f0');
    bg.addColorStop(0.55, '#aeb5b5');
    bg.addColorStop(1, '#d9dedd');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#3d474a';
    ctx.lineWidth = 9;
    ctx.strokeRect(18, 18, w - 36, h - 36);
    ctx.strokeStyle = 'rgba(50,58,61,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(31, 31, w - 62, h - 62);

    ctx.fillStyle = '#1b2528';
    ctx.textAlign = 'left';
    ctx.font = '700 44px "Arial Narrow", Arial, sans-serif';
    ctx.fillText('AXIS  MOTORLAB', 58, 94);
    ctx.font = '500 29px "Arial Narrow", Arial, sans-serif';
    ctx.fillStyle = '#344044';
    ctx.fillText('THREE-PHASE INDUCTION MOTOR', 58, 134);

    ctx.fillStyle = '#10181b';
    ctx.font = '800 87px "Arial Narrow", Arial, sans-serif';
    ctx.fillText('YE3-132S-4', 58, 226);

    ctx.fillStyle = '#273136';
    ctx.font = '600 31px "Arial Narrow", Arial, sans-serif';
    ctx.fillText('5.5 kW      380 V      50 Hz      11.4 A', 58, 286);
    ctx.fillText('1440 r/min    cosφ 0.83    η 89.6 %', 58, 332);
    ctx.fillText('IP55   IC411   IM B3   S1   IE3', 58, 378);

    ctx.strokeStyle = 'rgba(35,44,47,0.35)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(58, 410);
    ctx.lineTo(w - 58, 410);
    ctx.stroke();

    ctx.fillStyle = '#4a5558';
    ctx.font = '22px "Arial Narrow", Arial, sans-serif';
    ctx.fillText('IEC 60034-1  /  GB/T 28575-2020', 58, 452);
    ctx.fillText('SERIAL  AX3-132S-0550-0091', 58, 486);
    ctx.fillText('MFG  AXIS ELECTRIC WORKS', 58, 520);
    ctx.fillText('NO. 0091  ·  2026', 58, 554);

    // QR-like certification block
    ctx.fillStyle = '#1e282b';
    ctx.fillRect(778, 454, 118, 118);
    ctx.fillStyle = '#dfe3e1';
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if ((x * 7 + y * 3 + x * y) % 3 === 0) ctx.fillRect(789 + x * 12, 465 + y * 12, 9, 9);
      }
    }
    ctx.fillStyle = '#3c474a';
    ctx.font = '19px Arial, sans-serif';
    ctx.fillText('IE3 · PREMIUM', 748, 426);
    ctx.fillText('EFFICIENCY', 748, 448);

    // rivet shadows
    for (const [x, y] of [[45, 45], [w - 45, 45], [45, h - 45], [w - 45, h - 45]]) {
      const rg = ctx.createRadialGradient(x - 4, y - 4, 2, x, y, 14);
      rg.addColorStop(0, '#f7f9f8');
      rg.addColorStop(0.5, '#8e9697');
      rg.addColorStop(1, '#303a3d');
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(x, y, 13, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

export function makeWarningTexture() {
  return makeCanvasTexture(512, 256, (ctx, w, h) => {
    ctx.fillStyle = '#c98522';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#171b1c';
    ctx.fillRect(12, 12, w - 24, h - 24);
    ctx.fillStyle = '#e1a239';
    ctx.fillRect(22, 22, w - 44, h - 44);
    ctx.fillStyle = '#161a1b';
    ctx.font = '800 38px Arial, sans-serif';
    ctx.fillText('WARNING', 42, 76);
    ctx.font = '500 25px Arial, sans-serif';
    ctx.fillText('HIGH VOLTAGE', 42, 116);
    ctx.fillText('DISCONNECT BEFORE SERVICE', 42, 154);
    ctx.font = '700 24px Arial, sans-serif';
    ctx.fillText('⚠  危险电压 · 断电后检修', 42, 198);
  });
}

export function makeLogoPlateTexture() {
  return makeCanvasTexture(512, 160, (ctx, w, h) => {
    ctx.fillStyle = '#20383f';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(170,195,198,0.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#d8e1e0';
    ctx.font = '800 58px "Arial Narrow", Arial, sans-serif';
    ctx.fillText('AXIS', 30, 90);
    ctx.fillStyle = '#e0a04a';
    ctx.fillRect(168, 43, 5, 48);
    ctx.fillStyle = '#b9c6c6';
    ctx.font = '500 24px "Arial Narrow", Arial, sans-serif';
    ctx.fillText('MOTORLAB', 191, 77);
    ctx.fillStyle = '#8ca0a1';
    ctx.font = '20px "Arial Narrow", Arial, sans-serif';
    ctx.fillText('SERIES YE3  ·  IE3', 32, 126);
  });
}

export function decalPlane(width, height, texture, options = {}) {
  const mat = new THREE.MeshPhysicalMaterial({
    map: texture,
    transparent: options.transparent ?? false,
    roughness: options.roughness ?? 0.35,
    metalness: options.metalness ?? 0.35,
    clearcoat: options.clearcoat ?? 0.15,
    clearcoatRoughness: 0.45,
    side: THREE.FrontSide,
    envMapIntensity: 0.7,
  });
  const geometry = new THREE.PlaneGeometry(width, height);
  const mesh = new THREE.Mesh(geometry, mat);
  return mesh;
}

export function mergeMeshList(meshes) {
  const geos = [];
  for (const mesh of meshes) {
    mesh.updateMatrix();
    const g = mesh.geometry.clone().applyMatrix4(mesh.matrix);
    geos.push(g);
  }
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  return merged;
}

export function lineMaterial(color = 0x6f9298, opacity = 0.5) {
  return new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
}

export function circleLine(radius, mat, segments = 128) {
  const geo = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: segments + 1 }, (_, i) => {
      const a = (i / segments) * PI2;
      return new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    }),
  );
  return new THREE.Line(geo, mat);
}

export function lerp(a, b, t) { return a + (b - a) * t; }
export function clamp(v, min = 0, max = 1) { return Math.max(min, Math.min(max, v)); }
export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}
export function easeInOutCubic(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

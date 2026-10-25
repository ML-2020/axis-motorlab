import * as THREE from 'three';

const canvas = (size = 512) => {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
};

function makeNoiseTexture(size = 256) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  let seed = 1961;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = 155 + rnd() * 80;
    img.data[i] = v;
    img.data[i + 1] = v;
    img.data[i + 2] = v;
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  // subtle cast-iron speckle
  for (let i = 0; i < 2200; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const a = 0.02 + rnd() * 0.07;
    ctx.fillStyle = `rgba(20,24,25,${a})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.3 + rnd() * 1.1, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function makeBrushedTexture(size = 512) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, size, 0);
  g.addColorStop(0, '#858d90');
  g.addColorStop(0.32, '#c8cdd0');
  g.addColorStop(0.55, '#8f979a');
  g.addColorStop(0.78, '#d9dde0');
  g.addColorStop(1, '#767f82');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  let seed = 441;
  const rnd = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let i = 0; i < 1600; i++) {
    ctx.strokeStyle = `rgba(255,255,255,${0.02 + rnd() * 0.06})`;
    ctx.lineWidth = 0.4 + rnd();
    const y = rnd() * size;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(size, y + (rnd() - 0.5) * 2);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 1);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCarbonTexture(size = 256) {
  const c = canvas(size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#101311';
  ctx.fillRect(0, 0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.055)';
  ctx.lineWidth = 1;
  const step = 8;
  for (let x = -size; x < size * 2; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + size, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, size);
    ctx.lineTo(x + size, 0);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTextureSet(renderer) {
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const noise = makeNoiseTexture();
  noise.anisotropy = maxAniso;
  const brushed = makeBrushedTexture();
  brushed.anisotropy = maxAniso;
  const carbon = makeCarbonTexture();
  carbon.anisotropy = maxAniso;
  return { noise, brushed, carbon };
}

export function createMaterialTemplates(textures) {
  const paint = new THREE.MeshPhysicalMaterial({
    color: 0x24434b,
    metalness: 0.28,
    roughness: 0.44,
    clearcoat: 0.32,
    clearcoatRoughness: 0.5,
    roughnessMap: textures.noise,
    envMapIntensity: 0.72,
  });
  const paintDark = new THREE.MeshPhysicalMaterial({
    color: 0x172d34,
    metalness: 0.3,
    roughness: 0.5,
    clearcoat: 0.2,
    clearcoatRoughness: 0.6,
    roughnessMap: textures.noise,
    envMapIntensity: 0.62,
  });
  const paintWarm = new THREE.MeshPhysicalMaterial({
    color: 0x9c5b2c,
    metalness: 0.22,
    roughness: 0.48,
    clearcoat: 0.28,
    clearcoatRoughness: 0.55,
    roughnessMap: textures.noise,
    envMapIntensity: 0.7,
  });
  return {
    paint,
    paintDark,
    paintWarm,
    cast: new THREE.MeshStandardMaterial({
      color: 0x242a2c,
      metalness: 0.62,
      roughness: 0.62,
      roughnessMap: textures.noise,
      envMapIntensity: 0.55,
    }),
    steel: new THREE.MeshStandardMaterial({
      color: 0xb4bdc0,
      metalness: 1,
      roughness: 0.26,
      envMapIntensity: 1.05,
    }),
    steelBrushed: new THREE.MeshStandardMaterial({
      color: 0xc4cacc,
      map: textures.brushed,
      metalness: 0.96,
      roughness: 0.3,
      envMapIntensity: 1.0,
    }),
    steelDark: new THREE.MeshStandardMaterial({
      color: 0x697276,
      metalness: 0.95,
      roughness: 0.38,
      envMapIntensity: 0.9,
    }),
    blackOxide: new THREE.MeshStandardMaterial({
      color: 0x353b3d,
      metalness: 0.88,
      roughness: 0.44,
      envMapIntensity: 0.7,
    }),
    zinc: new THREE.MeshStandardMaterial({
      color: 0xc6cbca,
      metalness: 0.88,
      roughness: 0.34,
      envMapIntensity: 0.85,
    }),
    copper: new THREE.MeshPhysicalMaterial({
      color: 0xb96633,
      metalness: 1,
      roughness: 0.27,
      clearcoat: 0.22,
      clearcoatRoughness: 0.5,
      envMapIntensity: 1.05,
    }),
    copperDark: new THREE.MeshStandardMaterial({
      color: 0x74401f,
      metalness: 0.92,
      roughness: 0.4,
      envMapIntensity: 0.8,
    }),
    brass: new THREE.MeshStandardMaterial({
      color: 0xc9a45e,
      metalness: 1,
      roughness: 0.3,
      envMapIntensity: 0.95,
    }),
    insulation: new THREE.MeshStandardMaterial({
      color: 0x7f5630,
      metalness: 0.08,
      roughness: 0.8,
      envMapIntensity: 0.35,
    }),
    laminate: new THREE.MeshStandardMaterial({
      color: 0x737b7d,
      metalness: 0.88,
      roughness: 0.42,
      envMapIntensity: 0.85,
    }),
    laminateEdge: new THREE.MeshStandardMaterial({
      color: 0x4b5254,
      metalness: 0.9,
      roughness: 0.5,
      envMapIntensity: 0.7,
    }),
    aluminum: new THREE.MeshStandardMaterial({
      color: 0xaab3b5,
      metalness: 0.88,
      roughness: 0.34,
      envMapIntensity: 0.9,
    }),
    rubber: new THREE.MeshStandardMaterial({
      color: 0x0c0f10,
      metalness: 0.04,
      roughness: 0.92,
      envMapIntensity: 0.25,
    }),
    plastic: new THREE.MeshStandardMaterial({
      color: 0x171a1b,
      metalness: 0.12,
      roughness: 0.48,
      envMapIntensity: 0.55,
    }),
    plasticFan: new THREE.MeshPhysicalMaterial({
      color: 0x1a1d1f,
      metalness: 0.15,
      roughness: 0.42,
      clearcoat: 0.4,
      clearcoatRoughness: 0.38,
      map: textures.carbon,
      envMapIntensity: 0.8,
    }),
    plasticAmber: new THREE.MeshPhysicalMaterial({
      color: 0x8a4c21,
      metalness: 0.05,
      roughness: 0.56,
      clearcoat: 0.22,
      clearcoatRoughness: 0.6,
      envMapIntensity: 0.55,
    }),
    gasket: new THREE.MeshStandardMaterial({
      color: 0x2b2320,
      metalness: 0.05,
      roughness: 0.95,
      envMapIntensity: 0.25,
    }),
    ceramic: new THREE.MeshStandardMaterial({
      color: 0xd7cdbb,
      metalness: 0.02,
      roughness: 0.55,
      envMapIntensity: 0.4,
    }),
    terminal: new THREE.MeshStandardMaterial({
      color: 0x1d2528,
      metalness: 0.2,
      roughness: 0.6,
      envMapIntensity: 0.4,
    }),
    warning: new THREE.MeshStandardMaterial({
      color: 0xd69027,
      metalness: 0.1,
      roughness: 0.55,
      envMapIntensity: 0.4,
    }),
  };
}

export class PartMaterials {
  constructor(templates) {
    this.templates = templates;
    this.cache = new Map();
    this.original = new Map();
  }

  get(name) {
    if (!this.cache.has(name)) {
      const template = this.templates[name];
      if (!template) throw new Error(`Unknown material: ${name}`);
      const mat = template.clone();
      mat.userData.baseEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0x000000);
      mat.userData.baseEmissiveIntensity = mat.emissiveIntensity ?? 1;
      mat.userData.baseOpacity = mat.opacity;
      mat.userData.baseTransparent = mat.transparent;
      mat.userData.baseDepthWrite = mat.depthWrite;
      this.cache.set(name, mat);
      this.original.set(name, mat);
    }
    return this.cache.get(name);
  }

  all() {
    return [...this.cache.values()];
  }

  setGhost(on, opacity = 0.14) {
    for (const mat of this.cache.values()) {
      if (on) {
        mat.transparent = true;
        mat.opacity = mat.userData.baseOpacity * opacity;
        mat.depthWrite = false;
        mat.side = THREE.DoubleSide;
      } else {
        mat.transparent = mat.userData.baseTransparent;
        mat.opacity = mat.userData.baseOpacity;
        mat.depthWrite = mat.userData.baseDepthWrite;
        mat.side = THREE.FrontSide;
      }
      mat.needsUpdate = true;
    }
  }

  /**
   * Smoothly blends between solid and x-ray. amount=0 is fully solid,
   * amount=1 is a faint glassy shell.
   */
  setGhostAmount(amount) {
    const t = Math.max(0, Math.min(1, amount));
    const active = t > 0.002;
    for (const mat of this.cache.values()) {
      if (active) {
        mat.transparent = true;
        mat.opacity = mat.userData.baseOpacity * (1 - 0.88 * t);
        mat.depthWrite = t < 0.25;
        mat.side = THREE.DoubleSide;
      } else {
        mat.transparent = mat.userData.baseTransparent;
        mat.opacity = mat.userData.baseOpacity;
        mat.depthWrite = mat.userData.baseDepthWrite;
        mat.side = THREE.FrontSide;
      }
    }
  }

  setHighlight(on, color = 0xffa64d, intensity = 0.42) {
    for (const mat of this.cache.values()) {
      if (!mat.emissive) continue;
      if (on) {
        mat.emissive.set(color);
        mat.emissiveIntensity = intensity;
      } else {
        mat.emissive.copy(mat.userData.baseEmissive);
        mat.emissiveIntensity = mat.userData.baseEmissiveIntensity;
      }
    }
  }
}

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { clamp, lerp, makeCanvasTexture, PI2 } from '../model/utils.js';
import { Motor } from '../model/motor.js';

const GHOST_IDS = new Set([
  'stator-frame',
  'rear-endshield',
  'front-endshield',
  'fan-cover',
  'cooling-fan',
  'terminal-box',
  'terminal-lid',
  'nameplate',
  'rear-bearing-cover',
  'front-bearing-cover',
  'lifting-eye',
]);

const COLOR = {
  bgTop: 0x0a1216,
  bgBottom: 0x040607,
  accent: 0x7cc4ce,
  accentWarm: 0xe0a04a,
  floor: 0x080c0e,
  grid: 0x294248,
};

function radialShadowTexture() {
  return makeCanvasTexture(256, 256, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.72)');
    g.addColorStop(0.3, 'rgba(0,0,0,0.42)');
    g.addColorStop(0.65, 'rgba(0,0,0,0.12)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function dotTexture() {
  return makeCanvasTexture(64, 64, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(220,245,250,0.9)');
    g.addColorStop(0.6, 'rgba(140,190,200,0.35)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
}

function floorTexture() {
  return makeCanvasTexture(1024, 1024, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 30, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#121c20');
    g.addColorStop(0.4, '#0a1215');
    g.addColorStop(0.8, '#05090b');
    g.addColorStop(1, '#030506');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // soft cast-concrete mottling
    let seed = 712;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 1200; i++) {
      const x = rnd() * w;
      const y = rnd() * h;
      const r = 3 + rnd() * 60;
      ctx.fillStyle = `rgba(125,160,165,${0.006 + rnd() * 0.012})`;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // technical circles etched into the floor
    ctx.strokeStyle = 'rgba(120,170,178,0.11)';
    for (const radius of [160, 260, 380, 470]) {
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.arc(w / 2, h / 2, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(120,170,178,0.16)';
    for (let i = 0; i < 72; i++) {
      const a = (i / 72) * Math.PI * 2;
      const r0 = i % 6 === 0 ? 380 : 420;
      ctx.beginPath();
      ctx.moveTo(w / 2 + Math.cos(a) * r0, h / 2 + Math.sin(a) * r0);
      ctx.lineTo(w / 2 + Math.cos(a) * 470, h / 2 + Math.sin(a) * 470);
      ctx.stroke();
    }
  });
}

export class Stage {
  constructor(canvas, content, options = {}) {
    this.canvas = canvas;
    this.content = content;
    this.container = options.container || document.body;
    this.onHover = null;
    this.onSelect = null;
    this.currentPreset = 'hero';
    this.mode = 'hero';
    this.isNarrow = window.innerWidth < 820;
    this.autoRotateWanted = true;
    this.userAdjusted = false;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.pointerActive = false;
    this.pointerDown = null;
    this.lastHoverCheck = 0;
    this.hoveredId = null;
    this.focus = null;
    this.cameraTween = null;

    this.setupRenderer();
    this.motor = new Motor(this.renderer, content);
    this.setupScene();
    this.setupLights();
    this.setupFloor();
    this.setupCamera();
    this.setupEffects();
    this.bindEvents();
    this.applyPreset('hero', true);
    this.introCameraTween();
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.info.autoReset = true;
  }

  setupScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x060a0c, 0.052);

    // Gradient dome gives the stage depth without a flat background.
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(30, 48, 24),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {},
        vertexShader: `
          varying vec3 vPosition;
          void main() {
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vPosition;
          void main() {
            vec3 dir = normalize(vPosition);
            vec3 top = vec3(0.027, 0.043, 0.051);
            vec3 bottom = vec3(0.005, 0.008, 0.010);
            float h = smoothstep(-0.2, 0.75, dir.y);
            vec3 col = mix(bottom, top, h);
            float halo = exp(-abs(dir.y + 0.02) * 7.0) * 0.018;
            col += vec3(0.12, 0.28, 0.32) * halo;
            col += 0.012 * vec3(0.2, 0.55, 0.62) * pow(max(0.0, dir.z * 0.5 + 0.5), 4.0);
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    );
    this.scene.add(dome);
    this.dome = dome;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const envScene = new RoomEnvironment();
    this.envRT = pmrem.fromScene(envScene, 0.02);
    this.scene.environment = this.envRT.texture;
    this.scene.environmentIntensity = 0.62;
    envScene.dispose?.();
    pmrem.dispose();

    this.motor.root.position.y = 0.132;
    this.scene.add(this.motor.root);
  }

  setupLights() {
    const hemi = new THREE.HemisphereLight(0x6e98a3, 0x06090b, 0.34);
    this.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffe4c2, 2.7);
    key.position.set(3.6, 4.8, 3.8);
    key.target.position.set(0, 0.4, 0);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -2.4;
    key.shadow.camera.right = 2.4;
    key.shadow.camera.top = 2.8;
    key.shadow.camera.bottom = -1.2;
    key.shadow.camera.near = 0.5;
    key.shadow.camera.far = 14;
    key.shadow.bias = -0.0006;
    key.shadow.normalBias = 0.018;
    key.shadow.radius = 3.5;
    this.scene.add(key, key.target);
    this.keyLight = key;

    const fill = new THREE.DirectionalLight(0x84bccb, 0.78);
    fill.position.set(-4, 2.1, 2.2);
    this.scene.add(fill);

    const rim = new THREE.DirectionalLight(0x6fa3b3, 1.15);
    rim.position.set(-1.8, 2.4, -4);
    this.scene.add(rim);

    const warm = new THREE.PointLight(0xff9a49, 9, 6, 2);
    warm.position.set(2.4, 0.45, -1.9);
    this.scene.add(warm);

    const cool = new THREE.PointLight(0x68c5d6, 14, 7, 2);
    cool.position.set(-2.6, 1.1, -1.2);
    this.scene.add(cool);

    const front = new THREE.PointLight(0xa7d8e0, 3.2, 5, 2);
    front.position.set(1.3, 0.15, 2.6);
    this.scene.add(front);
  }

  setupFloor() {
    const floorTex = floorTexture();
    floorTex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(34, 34),
      new THREE.MeshPhysicalMaterial({
        map: floorTex,
        color: 0x8d9a9c,
        roughness: 0.62,
        metalness: 0.2,
        envMapIntensity: 0.22,
        clearcoat: 0.08,
        clearcoatRoughness: 0.65,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);
    this.floor = floor;

    const grid = new THREE.GridHelper(8, 32, 0x2f5157, 0x1b2e33);
    grid.position.y = 0.002;
    grid.material.transparent = true;
    grid.material.opacity = 0.09;
    grid.material.depthWrite = false;
    this.scene.add(grid);
    this.grid = grid;

    const contact = new THREE.Mesh(
      new THREE.PlaneGeometry(1.75, 1.45),
      new THREE.MeshBasicMaterial({
        map: radialShadowTexture(),
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    contact.rotation.x = -Math.PI / 2;
    contact.position.set(0, 0.004, 0);
    this.scene.add(contact);
    this.contact = contact;

    // A faint outer ring and cardinal ticks anchor the object in space.
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x7198a0,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
      toneMapped: false,
    });
    const outerRing = new THREE.Mesh(new THREE.RingGeometry(1.34, 1.345, 160), ringMat);
    outerRing.rotation.x = -Math.PI / 2;
    outerRing.position.y = 0.003;
    this.scene.add(outerRing);

    const ticks = new THREE.Group();
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * PI2;
      const major = i % 5 === 0;
      const length = major ? 0.09 : 0.035;
      const r0 = 1.36;
      const r1 = r0 + length;
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(Math.cos(a) * r0, 0, Math.sin(a) * r0),
        new THREE.Vector3(Math.cos(a) * r1, 0, Math.sin(a) * r1),
      ]);
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        color: major ? 0x94b7bd : 0x5c7b82,
        transparent: true,
        opacity: major ? 0.24 : 0.12,
        depthWrite: false,
        toneMapped: false,
      }));
      ticks.add(line);
    }
    ticks.position.y = 0.003;
    this.scene.add(ticks);

    // Dust motes in the stage volume.
    const dot = dotTexture();
    const count = 240;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    let seed = 221;
    const rnd = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < count; i++) {
      const r = 0.7 + rnd() * 3.6;
      const a = rnd() * PI2;
      positions[i * 3] = Math.cos(a) * r;
      positions[i * 3 + 1] = 0.12 + rnd() * 2.2;
      positions[i * 3 + 2] = Math.sin(a) * r;
      speeds[i] = 0.012 + rnd() * 0.03;
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dustMat = new THREE.PointsMaterial({
      map: dot,
      color: 0xa9c8cc,
      size: 0.012,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      toneMapped: false,
    });
    this.dust = new THREE.Points(dustGeo, dustMat);
    this.dustSpeeds = speeds;
    this.scene.add(this.dust);
  }

  setupCamera() {
    this.camera = new THREE.PerspectiveCamera(33, window.innerWidth / window.innerHeight, 0.03, 80);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.055;
    this.controls.enablePan = false;
    this.controls.enableZoom = false;
    this.controls.autoRotate = true;
    this.controls.autoRotateSpeed = 0.42;
    this.controls.minPolarAngle = 0.32;
    this.controls.maxPolarAngle = Math.PI * 0.49;
    this.controls.target.set(0, 0.3, 0);
    this.controls.touches.ONE = THREE.TOUCH.NONE;
    this.controls.touches.TWO = THREE.TOUCH.NONE;
    const isCoarse = window.matchMedia('(pointer: coarse)').matches;
    this.controls.enabled = !isCoarse;

    this.controls.addEventListener('start', () => {
      this.cancelCameraTween();
      this.userAdjusted = true;
      this.controls.autoRotate = false;
      this.userIdleTimer = 0;
    });
  }

  setupEffects() {
    this.effectsGroup = new THREE.Group();
    this.effectsGroup.name = 'technical-overlays';
    this.motor.root.add(this.effectsGroup);

    this.fieldGroup = new THREE.Group();
    this.effectsGroup.add(this.fieldGroup);

    this.fieldMaterials = [];
    this.fieldArcs = [];
    const arcColors = [0xe6a24c, 0x77d4df, 0xe6a24c, 0x77d4df];
    for (const z of [0.104, -0.104]) {
      for (let i = 0; i < 4; i++) {
        const mat = new THREE.MeshBasicMaterial({
          color: arcColors[i],
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          side: THREE.DoubleSide,
          toneMapped: false,
        });
        const arc = new THREE.Mesh(new THREE.TorusGeometry(0.071, 0.0024, 6, 56, 0.66), mat);
        arc.rotation.z = (i / 4) * PI2 + 0.18;
        arc.position.z = z;
        this.fieldGroup.add(arc);
        this.fieldMaterials.push(mat);
        this.fieldArcs.push(arc);
      }
    }

    // Outer rotating-field envelope shown through the x-ray shell.
    this.haloMaterials = [];
    this.haloGroup = new THREE.Group();
    this.fieldGroup.add(this.haloGroup);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: i % 2 ? 0x77d4df : 0xf0ac5a,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        toneMapped: false,
      });
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.192, 0.0024, 6, 72, 0.7), mat);
      arc.rotation.z = (i / 4) * PI2 + 0.2;
      this.haloGroup.add(arc);
      this.haloMaterials.push(mat);
    }
    const glowSprite = dotTexture();
    this.haloSprites = [];
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.SpriteMaterial({
        map: glowSprite,
        color: i % 2 ? 0x9ceff5 : 0xffbd6d,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.setScalar(0.04);
      sprite.renderOrder = 4;
      this.effectsGroup.add(sprite);
      this.haloSprites.push(sprite);
    }

    // Airflow streaks over the cooling fins.
    this.airflowGroup = new THREE.Group();
    this.effectsGroup.add(this.airflowGroup);
    this.airflowMaterials = [];
    this.airCurves = [];
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.62 + (i / 6) * Math.PI * 1.24;
      const radius = 0.165 + (i % 2) * 0.012;
      const path = [
        [Math.sin(a) * 0.095, Math.cos(a) * 0.095, -0.35],
        [Math.sin(a) * radius, Math.cos(a) * radius, -0.25],
        [Math.sin(a) * (radius + 0.01), Math.cos(a) * (radius + 0.01), -0.08],
        [Math.sin(a) * radius, Math.cos(a) * radius, 0.1],
        [Math.sin(a) * (radius - 0.02), Math.cos(a) * (radius - 0.02), 0.18],
      ];
      const curve = new THREE.CatmullRomCurve3(path.map((p) => new THREE.Vector3(...p)));
      this.airCurves.push(curve);
      const tubeMat = new THREE.MeshBasicMaterial({
        color: 0x83cdd6,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      });
      this.airflowMaterials.push(tubeMat);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 50, 0.0016, 4, false), tubeMat);
      this.airflowGroup.add(tube);
    }

    // Moving airflow particles
    const perCurve = 8;
    const particleCount = this.airCurves.length * perCurve;
    this.airParticles = [];
    const positions = new Float32Array(particleCount * 3);
    for (let c = 0; c < this.airCurves.length; c++) {
      for (let i = 0; i < perCurve; i++) {
        this.airParticles.push({ curve: c, t: i / perCurve, speed: 0.12 + Math.random() * 0.08 });
      }
    }
    const dot = dotTexture();
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.airParticleMat = new THREE.PointsMaterial({
      map: dot,
      color: 0xa7f4f8,
      size: 0.011,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      toneMapped: false,
    });
    this.airPoints = new THREE.Points(pGeo, this.airParticleMat);
    this.airflowGroup.add(this.airPoints);

    // A scanning ring that visualizes the rotating field envelope.
    const scanMat = new THREE.MeshBasicMaterial({
      color: 0x74d1dc,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    this.scanRing = new THREE.Mesh(new THREE.RingGeometry(0.17, 0.173, 80), scanMat);
    this.scanRing.rotation.x = Math.PI / 2;
    this.scanRing.position.set(0, 0, 0.08);
    this.scanMat = scanMat;
    this.effectsGroup.add(this.scanRing);

    this.runMix = 0;
    this.cutawayMix = 0;
    this.spinAngle = 0;
    this.spinVelocity = 0;
    this.runWanted = false;
    this.cutawayWanted = false;
    this.effectsTime = 0;
  }

  bindEvents() {
    this._onPointerMove = (event) => {
      if (event.pointerType === 'touch') return;
      const rect = this.renderer.domElement.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      this.pointerActive = true;
    };
    this._onPointerLeave = () => {
      this.pointerActive = false;
      this.setHover(null);
    };
    this._onPointerDown = (event) => {
      this.pointerDown = { x: event.clientX, y: event.clientY, time: performance.now() };
    };
    this._onPointerUp = (event) => {
      if (!this.pointerDown) return;
      const dx = event.clientX - this.pointerDown.x;
      const dy = event.clientY - this.pointerDown.y;
      const dt = performance.now() - this.pointerDown.time;
      this.pointerDown = null;
      if (Math.hypot(dx, dy) > 7 || dt > 550) return;
      const hit = this.pick(event.clientX, event.clientY);
      if (hit && this.onSelect) this.onSelect(hit);
    };
    this._onResize = () => this.resize();
    this._onWheel = (event) => {
      // The page scrolls; do not trap wheel events for zoom.
      if (this.hoveredId) this.setHover(null);
    };
    this.renderer.domElement.addEventListener('pointermove', this._onPointerMove);
    this.renderer.domElement.addEventListener('pointerleave', this._onPointerLeave);
    this.renderer.domElement.addEventListener('pointerdown', this._onPointerDown);
    this.renderer.domElement.addEventListener('pointerup', this._onPointerUp);
    this.renderer.domElement.addEventListener('wheel', this._onWheel, { passive: true });
    window.addEventListener('resize', this._onResize);
  }

  resize() {
    this.isNarrow = window.innerWidth < 820;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.isNarrow ? 1.5 : 1.8));
    this.renderer.setSize(width, height, false);
    const preset = this.getPresets()[this.currentPreset] || this.getPresets().hero;
    this.applyPreset(this.currentPreset, true);
  }

  introCameraTween() {
    const preset = this.getPresets().hero;
    const pos = new THREE.Vector3(...preset.pos);
    const dir = pos.clone().sub(new THREE.Vector3(...preset.target)).normalize();
    pos.addScaledVector(dir, 1.1);
    this.camera.position.copy(pos);
    this.controls.target.set(...preset.target);
    this.controls.update();
    this.camera.fov = preset.fov;
    this.camera.updateProjectionMatrix();
    this.tweenCameraTo(preset, 2.4, 'inOut');
  }

  getPresets() {
    const narrow = this.isNarrow;
    if (narrow) {
      return {
        hero: { pos: [1.9, 1.14, 2.78], target: [-0.03, 0.42, 0], fov: 36, autoRotate: true },
        anatomy: { pos: [2.0, 1.12, 2.35], target: [-0.02, 0.4, 0], fov: 35, autoRotate: false },
        explode: { pos: [1.2, 1.9, 7.35], target: [0, 0.58, 0], fov: 40, autoRotate: false },
        parts: { pos: [1.2, 1.9, 7.2], target: [0, 0.22, 0], fov: 40, autoRotate: false },
        operation: { pos: [1.9, 1.05, 2.4], target: [0, 0.36, 0], fov: 34, autoRotate: false },
        data: { pos: [3.8, 2.2, 4.8], target: [0, 0.32, 0], fov: 38, autoRotate: false },
      };
    }
    return {
      hero: { pos: [1.7, 0.96, 2.35], target: [-0.56, 0.27, 0], fov: 31, autoRotate: true },
      anatomy: { pos: [2.25, 0.98, 2.08], target: [-0.22, 0.26, 0], fov: 31, autoRotate: false },
      explode: { pos: [1.08, 1.48, 3.82], target: [-0.13, 0.6, 0], fov: 31, autoRotate: false },
      parts: { pos: [1.14, 1.54, 3.92], target: [-0.06, 0.6, 0], fov: 31, autoRotate: false },
      operation: { pos: [2.05, 1.02, 2.32], target: [-0.08, 0.25, 0], fov: 30, autoRotate: false },
      data: { pos: [3.8, 2.0, 4.2], target: [0, 0.3, 0], fov: 34, autoRotate: false },
    };
  }

  applyPreset(name, immediate = false) {
    this.currentPreset = name;
    const preset = this.getPresets()[name] || this.getPresets().hero;
    this.autoRotateWanted = !!preset.autoRotate;
    this.mode = name;
    if (immediate) {
      this.camera.position.set(...preset.pos);
      this.controls.target.set(...preset.target);
      this.camera.fov = preset.fov;
      this.camera.updateProjectionMatrix();
      this.controls.autoRotate = this.autoRotateWanted && !this.isNarrow;
      this.controls.update();
      this.cameraTween = null;
      return;
    }
    this.tweenCameraTo(preset, name === 'hero' ? 1.7 : 1.25, 'inOut');
  }

  tweenCameraTo(preset, duration = 1.2, ease = 'inOut') {
    this.cameraTween = {
      startPos: this.camera.position.clone(),
      startTarget: this.controls.target.clone(),
      startFov: this.camera.fov,
      endPos: new THREE.Vector3(...preset.pos),
      endTarget: new THREE.Vector3(...preset.target),
      endFov: preset.fov,
      elapsed: 0,
      duration,
      ease,
    };
    this.controls.autoRotate = false;
    this.controls.enabled = false;
    this.focus = null;
  }

  cancelCameraTween() {
    if (!this.cameraTween) return;
    this.cameraTween = null;
    this.controls.enabled = !window.matchMedia('(pointer: coarse)').matches;
    this.controls.autoRotate = this.autoRotateWanted && this.currentPreset === 'hero';
  }

  setMode(name) {
    if (this.mode === name) return;
    this.applyPreset(name);
  }

  setRunning(running) {
    this.runWanted = !!running;
  }

  setCutaway(on) {
    this.cutawayWanted = !!on;
  }

  focusPart(id) {
    const part = this.motor.getPart(id);
    if (!part) return;
    const center = this.motor.getWorldCenter(id);
    const box = this.motor.getWorldBox(id, 0.05);
    const radius = box?.getBoundingSphere(new THREE.Sphere()).radius ?? 0.15;
    const dir = this.camera.position.clone().sub(this.controls.target).normalize();
    const distance = clamp(radius * 5.4 + 0.75, 1.15, 3.2);
    const target = center;
    this.focus = { id };
    this.tweenCameraTo(
      {
        pos: target.clone().addScaledVector(dir, distance).toArray(),
        target: target.toArray(),
        fov: 30,
      },
      1.1,
      'inOut',
    );
  }

  clearFocus() {
    this.focus = null;
    this.applyPreset(this.currentPreset);
  }

  pick(clientX, clientY) {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.pointer.set(x, y);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const roots = [...this.motor.parts.values()].map((p) => p.group);
    const hits = this.raycaster.intersectObjects(roots, true);
    for (const hit of hits) {
      let obj = hit.object;
      let partId = null;
      while (obj) {
        if (obj.userData?.partId) {
          partId = obj.userData.partId;
          break;
        }
        obj = obj.parent;
      }
      if (!partId) continue;
      const part = this.motor.getPart(partId);
      if (part?.ghosted) continue;
      return { id: partId, point: hit.point, data: part?.data };
    }
    return null;
  }

  setHover(hit, clientX, clientY) {
    const id = hit?.id || null;
    if (id === this.hoveredId) {
      if (this.onHover && id) this.onHover(hit, clientX, clientY);
      return;
    }
    this.hoveredId = id;
    this.renderer.domElement.style.cursor = id ? 'pointer' : '';
    if (this.onHover) this.onHover(hit, clientX, clientY);
  }

  project(position) {
    const v = position.clone().project(this.camera);
    return {
      x: (v.x * 0.5 + 0.5) * window.innerWidth,
      y: (-v.y * 0.5 + 0.5) * window.innerHeight,
      z: v.z,
      visible: v.z > -1 && v.z < 1,
    };
  }

  update(dt, elapsed) {
    this.effectsTime += dt;

    if (this.cameraTween) {
      const tw = this.cameraTween;
      tw.elapsed += dt;
      const raw = clamp(tw.elapsed / tw.duration);
      const t = tw.ease === 'inOut' ? (raw < 0.5 ? 4 * raw ** 3 : 1 - (-2 * raw + 2) ** 3 / 2) : raw;
      this.camera.position.lerpVectors(tw.startPos, tw.endPos, t);
      this.controls.target.lerpVectors(tw.startTarget, tw.endTarget, t);
      this.camera.fov = lerp(tw.startFov, tw.endFov, t);
      this.camera.updateProjectionMatrix();
      this.camera.lookAt(this.controls.target);
      if (raw >= 1) {
        this.cameraTween = null;
        this.controls.enabled = !window.matchMedia('(pointer: coarse)').matches;
        this.controls.autoRotate = this.autoRotateWanted && this.currentPreset === 'hero' && !this.isNarrow;
      }
    } else {
      if (!this.controls.enabled) this.controls.enabled = !window.matchMedia('(pointer: coarse)').matches;
      this.controls.autoRotate = this.autoRotateWanted && this.currentPreset === 'hero' && !this.isNarrow;
      this.controls.update();
    }

    // Rotor run-up / coast-down inertia
    const targetMix = this.runWanted ? 1 : 0;
    this.runMix = THREE.MathUtils.damp(this.runMix, targetMix, this.runWanted ? 5 : 2.4, dt);
    if (this.runWanted) {
      this.spinVelocity = THREE.MathUtils.damp(this.spinVelocity, 2.5, 3.4, dt);
    } else {
      this.spinVelocity = THREE.MathUtils.damp(this.spinVelocity, 0, 1.8, dt);
    }
    if (Math.abs(this.spinVelocity) > 0.0002) {
      this.spinAngle = (this.spinAngle + this.spinVelocity * dt) % PI2;
      this.motor.setSpin(this.spinAngle);
    }

    // Ghosting transition for X-ray mode.
    const targetCut = this.cutawayWanted ? 1 : 0;
    this.cutawayMix = THREE.MathUtils.damp(this.cutawayMix, targetCut, 6.5, dt);
    if (Math.abs(this.cutawayMix - (this._lastCutawayMix ?? -1)) > 0.002) {
      this._lastCutawayMix = this.cutawayMix;
      for (const id of GHOST_IDS) {
        const part = this.motor.getPart(id);
        if (part) part.kit.setGhostAmount(this.cutawayMix * 0.94);
      }
    }

    // Effects visibility and movement
    const fieldOn = this.cutawayMix > 0.02 || this.runWanted;
    this.fieldGroup.rotation.z += dt * (0.5 + this.runMix * 0.9);
    const pulse = 0.55 + Math.sin(this.effectsTime * 4.2) * 0.18;
    for (let i = 0; i < this.fieldMaterials.length; i++) {
      this.fieldMaterials[i].opacity = this.cutawayMix * (0.5 + pulse * 0.28);
    }
    for (const arc of this.fieldArcs) {
      arc.visible = fieldOn && this.cutawayMix > 0.01;
    }
    this.haloGroup.rotation.z = -this.effectsTime * 0.2;
    for (let i = 0; i < this.haloMaterials.length; i++) {
      this.haloMaterials[i].opacity = this.cutawayMix * (0.24 + pulse * 0.16);
    }
    const haloAngle = this.effectsTime * 0.72;
    this.haloSprites.forEach((sprite, i) => {
      const a = haloAngle + (i / 4) * PI2;
      sprite.position.set(Math.cos(a) * 0.2, Math.sin(a) * 0.2, 0.012);
      sprite.material.opacity = this.cutawayMix * (0.54 + pulse * 0.25);
    });

    const airOpacity = this.runMix * 0.23;
    for (const mat of this.airflowMaterials) mat.opacity = airOpacity;
    this.airflowGroup.visible = airOpacity > 0.001;

    const posAttr = this.airPoints.geometry.getAttribute('position');
    if (airOpacity > 0.001) {
      for (let i = 0; i < this.airParticles.length; i++) {
        const p = this.airParticles[i];
        p.t += dt * p.speed * (0.4 + this.runMix);
        if (p.t > 1) p.t -= 1;
        const point = this.airCurves[p.curve].getPoint(p.t);
        posAttr.setXYZ(i, point.x, point.y, point.z);
      }
      posAttr.needsUpdate = true;
      this.airParticleMat.opacity = this.runMix * 0.9;
    }

    this.scanMat.opacity = this.cutawayMix * 0.3;
    this.scanRing.visible = this.cutawayMix > 0.01;
    this.scanRing.position.z = 0.16 - ((this.effectsTime * 0.22) % 0.32);

    // Contact shadow and floor respond to the exploded diagram height.
    const lift = clamp((this.motor.root.position.y - 0.132) / 0.42);
    this.contact.material.opacity = lerp(0.9, 0.26, lift);
    this.contact.scale.setScalar(1 + lift * 0.35);
    this.contact.position.x = 0;

    // Drift dust slowly
    const dustPos = this.dust.geometry.getAttribute('position');
    for (let i = 0; i < dustPos.count; i++) {
      let y = dustPos.getY(i) + this.dustSpeeds[i] * dt;
      if (y > 2.5) y = 0.08;
      dustPos.setY(i, y);
    }
    dustPos.needsUpdate = true;
    this.dust.rotation.y += dt * 0.008;

    // Hover picking at a modest rate
    if (this.pointerActive && performance.now() - this.lastHoverCheck > 42) {
      this.lastHoverCheck = performance.now();
      const rect = this.renderer.domElement.getBoundingClientRect();
      const clientX = (this.pointer.x * 0.5 + 0.5) * rect.width + rect.left;
      const clientY = (-this.pointer.y * 0.5 + 0.5) * rect.height + rect.top;
      const hit = this.pick(clientX, clientY);
      this.setHover(hit, clientX, clientY);
    }

    // Turn the model's floor-level shadow with the orbit camera? Keep the
    // contact shadow at the motor root to feel grounded.
    this.contact.position.z = 0;
    this.renderer.render(this.scene, this.camera);
  }
}

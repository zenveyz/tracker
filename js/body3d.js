// 3D-модель тела с мышцами (Three.js).
// Вращение одним пальцем/мышью, зум щипком/колёсиком, сдвиг двумя пальцами/правой кнопкой.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const COL = {
  idle: new THREE.Color('#4a5370'),
  idleLight: new THREE.Color('#b9c1d6'),
  hover: new THREE.Color('#7381a8'),
  planned: new THREE.Color('#8a6f86'),
  primary: new THREE.Color('#ff5a32'),
  secondary: new THREE.Color('#ffa36b'),
  base: new THREE.Color('#3b4258'),
  baseLight: new THREE.Color('#dfe3ec'),
};

// процедурная текстура «волокон» для рельефа мышц
function fiberTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#808080'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 90; i++) {
    const x = Math.random() * 256, w = 0.6 + Math.random() * 1.6;
    g.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.08)`;
    g.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)';
    g.fillRect(x, 0, w, 256);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(3, 1);
  return t;
}

function shadowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, 'rgba(0,0,0,0.55)');
  gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

const SPH = new THREE.SphereGeometry(1, 40, 28);

export function createBody3D(host, { onSelect, light = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'body3d-canvas';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
  camera.position.set(0, 1.05, 4.1);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.95, 0);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.9;
  controls.minDistance = 1.1;
  controls.maxDistance = 6;
  controls.minPolarAngle = 0.25;
  controls.maxPolarAngle = Math.PI - 0.35;
  controls.screenSpacePanning = true;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
  controls.addEventListener('change', () => {
    // не даём «увести» модель далеко
    const t = controls.target;
    t.x = THREE.MathUtils.clamp(t.x, -0.6, 0.6);
    t.y = THREE.MathUtils.clamp(t.y, 0.1, 1.8);
    t.z = THREE.MathUtils.clamp(t.z, -0.6, 0.6);
  });

  // свет
  scene.add(new THREE.HemisphereLight(0xe4e9ff, 0x141722, 0.75));
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(1.8, 3, 2.6); scene.add(key);
  const fill = new THREE.DirectionalLight(0xaebcff, 0.6); fill.position.set(-2.5, 1.5, 1.5); scene.add(fill);
  const rimA = new THREE.DirectionalLight(0xff8a4c, 2.2); rimA.position.set(-2, 2.2, -2.5); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0x5ad1ff, 1.6); rimB.position.set(2.4, 1.2, -2.2); scene.add(rimB);

  // тень на полу
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.4), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.002; scene.add(shadow);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.535, 96), new THREE.MeshBasicMaterial({ color: 0xff7a45, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
  ring.rotation.x = -Math.PI / 2; ring.position.y = 0.003; scene.add(ring);

  // материалы
  const fiber = fiberTexture();
  const baseMat = new THREE.MeshPhysicalMaterial({ color: light ? COL.baseLight : COL.base, roughness: 0.58, metalness: 0.0, clearcoat: 0.05, envMapIntensity: 0.5, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new THREE.Color('#8fa0d8') });
  const muscleMats = {};
  const matFor = (m) => {
    if (!muscleMats[m]) {
      muscleMats[m] = new THREE.MeshPhysicalMaterial({
        color: (light ? COL.idleLight : COL.idle).clone(), roughness: 0.5, metalness: 0.0, clearcoat: 0.12, clearcoatRoughness: 0.6, sheen: 0.5, sheenRoughness: 0.5, sheenColor: new THREE.Color('#9fb0e8'),
        bumpMap: fiber, bumpScale: 0.9, emissive: new THREE.Color(0x000000), envMapIntensity: 0.8,
      });
      muscleMats[m].userData = { target: muscleMats[m].color.clone(), emTarget: new THREE.Color(0x000000) };
    }
    return muscleMats[m];
  };

  const body = new THREE.Group();
  scene.add(body);
  const pickables = [];

  const ell = (mat, p, s, r = [0, 0, 0], muscle) => {
    const m = new THREE.Mesh(SPH, mat);
    m.position.set(...p); m.scale.set(...s); m.rotation.set(...r);
    if (muscle) { m.userData.muscle = muscle; pickables.push(m); }
    body.add(m);
    return m;
  };
  const limb = (mat, a, b, r) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B);
    const g = new THREE.CapsuleGeometry(r, len, 10, 28);
    const m = new THREE.Mesh(g, mat);
    m.position.copy(A).add(B).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    body.add(m);
    return m;
  };
  // пара (левая/правая сторона)
  const pairE = (mat, [x, y, z], s, [rx, ry, rz] = [0, 0, 0], muscle) => {
    ell(mat, [x, y, z], s, [rx, ry, rz], muscle);
    ell(mat, [-x, y, z], s, [rx, -ry, -rz], muscle);
  };
  const pairL = (mat, [ax, ay, az], [bx, by, bz], r) => {
    limb(mat, [ax, ay, az], [bx, by, bz], r);
    limb(mat, [-ax, ay, az], [-bx, by, bz], r);
  };

  // гладкие формы вращения (торс, конечности)
  const lathe = (mat, profile, { sx = 1, sz = 1, pos = [0, 0, 0] } = {}) => {
    const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 56);
    g.scale(sx, 1, sz);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.position.set(...pos);
    body.add(m);
    return m;
  };
  const taper = (mat, a, b, radii) => {
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b);
    const len = A.distanceTo(B), n = radii.length;
    const r0 = radii[0], rn = radii[n - 1];
    const prof = [[0, -r0 * 0.7], [r0 * 0.72, -r0 * 0.42], [r0 * 0.95, -r0 * 0.12]];
    radii.forEach((r, i) => prof.push([r, (i / (n - 1)) * len]));
    prof.push([rn * 0.95, len + rn * 0.12], [rn * 0.72, len + rn * 0.42], [0, len + rn * 0.7]);
    const g = new THREE.LatheGeometry(prof.map(([r, y]) => new THREE.Vector2(r, y)), 40);
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, mat);
    m.position.copy(A);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    body.add(m);
    return m;
  };
  const pairT = (mat, [ax, ay, az], [bx, by, bz], radii) => {
    taper(mat, [ax, ay, az], [bx, by, bz], radii);
    taper(mat, [-ax, ay, az], [-bx, by, bz], radii);
  };

  // ---------- база (кожа) ----------
  ell(baseMat, [0, 1.668, 0.004], [0.09, 0.114, 0.102]);             // голова
  ell(baseMat, [0, 1.602, 0.026], [0.066, 0.056, 0.07]);              // челюсть
  ell(baseMat, [0, 1.655, 0.1], [0.014, 0.024, 0.02]);                // нос
  pairE(baseMat, [0.09, 1.665, 0.0], [0.012, 0.026, 0.018]);          // уши
  taper(baseMat, [0, 1.45, -0.01], [0, 1.6, 0.0], [0.064, 0.058, 0.054]); // шея
  lathe(baseMat, [[0, 0.85], [0.1, 0.86], [0.14, 0.89], [0.152, 0.94], [0.145, 1.0], [0.128, 1.06], [0.124, 1.1], [0.13, 1.16], [0.142, 1.23],
    [0.152, 1.3], [0.156, 1.36], [0.15, 1.41], [0.128, 1.455], [0.085, 1.485], [0.055, 1.5], [0, 1.505]], { sx: 1.18, sz: 0.74 });
  pairT(baseMat, [0.198, 1.415, -0.012], [0.243, 1.15, -0.025], [0.056, 0.054, 0.048, 0.04]);   // плечо
  pairT(baseMat, [0.243, 1.15, -0.025], [0.284, 0.9, 0.012], [0.042, 0.045, 0.038, 0.03, 0.026]); // предплечье
  pairE(baseMat, [0.293, 0.838, 0.02], [0.028, 0.06, 0.044], [0, 0, 0.12]); // кисть
  pairE(baseMat, [0.272, 0.85, 0.05], [0.012, 0.03, 0.012], [0.5, 0, 0.4]);   // большой палец
  pairT(baseMat, [0.092, 0.92, 0.0], [0.104, 0.5, 0.008], [0.094, 0.09, 0.08, 0.066, 0.053]);   // бедро
  pairT(baseMat, [0.104, 0.5, 0.008], [0.104, 0.075, -0.012], [0.052, 0.06, 0.054, 0.042, 0.033, 0.03]); // голень
  pairE(baseMat, [0.104, 0.5, 0.045], [0.034, 0.038, 0.028]);        // колено
  pairE(baseMat, [0.106, 0.034, 0.048], [0.042, 0.032, 0.115]);      // стопа

  // ---------- мышцы ----------
  pairE(matFor('chest'), [0.083, 1.34, 0.08], [0.094, 0.064, 0.036], [0.08, 0.32, -0.1], 'chest');
  pairE(matFor('shoulders'), [0.204, 1.39, -0.004], [0.066, 0.086, 0.07], [0, 0, -0.32], 'shoulders');
  pairE(matFor('biceps'), [0.218, 1.275, 0.026], [0.04, 0.085, 0.04], [0.1, 0, 0.18], 'biceps');
  pairE(matFor('triceps'), [0.221, 1.28, -0.036], [0.044, 0.092, 0.04], [-0.1, 0, 0.18], 'triceps');
  pairE(matFor('forearms'), [0.258, 1.05, 0.004], [0.042, 0.095, 0.04], [0, 0, 0.16], 'forearms');
  [1.205, 1.13, 1.055].forEach((y) => pairE(matFor('abs'), [0.033, y, 0.086 - (1.205 - y) * 0.03], [0.032, 0.036, 0.015], [0, 0.16, 0], 'abs'));
  pairE(matFor('abs'), [0.028, 0.985, 0.086], [0.028, 0.044, 0.014], [0, 0.12, 0], 'abs');
  pairE(matFor('obliques'), [0.112, 1.11, 0.036], [0.036, 0.09, 0.052], [0, 0.6, 0.06], 'obliques');
  pairE(matFor('traps'), [0.074, 1.47, -0.03], [0.082, 0.036, 0.05], [0, 0, -0.42], 'traps');
  pairE(matFor('traps'), [0.042, 1.37, -0.088], [0.058, 0.12, 0.02], [0.05, -0.2, 0.12], 'traps');
  pairE(matFor('lats'), [0.112, 1.235, -0.066], [0.062, 0.165, 0.034], [0.05, -0.5, 0.34], 'lats');
  pairE(matFor('lowerback'), [0.034, 1.06, -0.08], [0.028, 0.092, 0.028], [0, 0, 0], 'lowerback');
  pairE(matFor('glutes'), [0.076, 0.925, -0.068], [0.078, 0.085, 0.058], [0, 0.15, 0], 'glutes');
  pairE(matFor('quads'), [0.132, 0.72, 0.02], [0.05, 0.165, 0.055], [0, 0, 0.03], 'quads');
  pairE(matFor('quads'), [0.09, 0.71, 0.038], [0.046, 0.175, 0.055], [0, 0, -0.04], 'quads');
  pairE(matFor('quads'), [0.078, 0.575, 0.036], [0.034, 0.06, 0.038], [0, 0, 0], 'quads');
  pairE(matFor('hamstrings'), [0.1, 0.72, -0.042], [0.06, 0.17, 0.044], [0, 0, 0], 'hamstrings');
  pairE(matFor('calves'), [0.09, 0.365, -0.03], [0.037, 0.098, 0.044], [0, 0, 0], 'calves');
  pairE(matFor('calves'), [0.119, 0.375, -0.026], [0.033, 0.088, 0.04], [0, 0, 0], 'calves');
  pairE(matFor('calves'), [0.114, 0.3, 0.03], [0.022, 0.12, 0.026], [0, 0, 0], 'calves');

  // ---------- состояние подсветки ----------
  let state = { primary: [], secondary: [], planned: [], hover: null };
  function applyColors() {
    Object.entries(muscleMats).forEach(([m, mat]) => {
      const tgt = mat.userData.target, em = mat.userData.emTarget;
      if (state.primary.includes(m)) { tgt.copy(COL.primary); em.set(0x9a2008); }
      else if (state.secondary.includes(m)) { tgt.copy(COL.secondary); em.set(0x5a2208); }
      else if (state.hover === m) { tgt.copy(light ? new THREE.Color('#9aa5c4') : COL.hover); em.set(0x000000); }
      else if (state.planned.includes(m)) { tgt.copy(COL.planned); em.set(0x000000); }
      else { tgt.copy(light ? COL.idleLight : COL.idle); em.set(0x000000); }
    });
  }

  // ---------- выбор мышцы ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(ev) {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(pickables, false)[0];
    return hit ? hit.object.userData.muscle : null;
  }
  let down = null;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; userTouched = true; });
  el.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    if (moved < 7 && performance.now() - down.t < 600) {
      const m = pick(e);
      onSelect && onSelect(m);
    }
    down = null;
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || down) return;
    const m = pick(e);
    if (m !== state.hover) { state.hover = m; el.style.cursor = m ? 'pointer' : 'grab'; applyColors(); }
  });
  el.addEventListener('pointerleave', () => { if (state.hover) { state.hover = null; applyColors(); } });

  // ---------- размер ----------
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // на узких экранах отодвигаем камеру, чтобы тело влезало
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // ---------- анимация камеры ----------
  let tween = null;
  let userTouched = false;
  let intro = 0;
  function orbitTo(azimuth, { distance, targetY } = {}) {
    const off = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    const from = { th: sph.theta, r: sph.radius, phi: sph.phi, ty: controls.target.y, tx: controls.target.x, tz: controls.target.z };
    let to = azimuth;
    while (to - from.th > Math.PI) to -= Math.PI * 2;
    while (to - from.th < -Math.PI) to += Math.PI * 2;
    intro = 1;
    tween = { from, to: { th: to, r: distance ?? from.r, phi: Math.PI / 2 - 0.05, ty: targetY ?? from.ty, tx: 0, tz: 0 }, t0: performance.now(), dur: 750 };
  }

  // ---------- цикл ----------
  let running = true, raf = 0;
  const clock = new THREE.Clock();
  function tick() {
    raf = requestAnimationFrame(tick);
    if (!host.isConnected || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.t0) / tween.dur);
      const e = 1 - Math.pow(1 - k, 3);
      const L = (a, b) => a + (b - a) * e;
      const sph = new THREE.Spherical(L(tween.from.r, tween.to.r), L(tween.from.phi, tween.to.phi), L(tween.from.th, tween.to.th));
      controls.target.set(L(tween.from.tx, tween.to.tx), L(tween.from.ty, tween.to.ty), L(tween.from.tz, tween.to.tz));
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));
      camera.lookAt(controls.target);
      if (k >= 1) tween = null;
    } else if (!userTouched && intro < 1) {
      // лёгкое вступительное покачивание
      intro += dt / 3.2;
      const a = Math.sin(intro * Math.PI * 2) * 0.35 * (1 - intro);
      const off = camera.position.clone().sub(controls.target);
      const sph = new THREE.Spherical().setFromVector3(off);
      sph.theta = a;
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(sph));
    }
    // плавная смена цветов
    Object.values(muscleMats).forEach((mat) => {
      mat.color.lerp(mat.userData.target, 0.16);
      mat.emissive.lerp(mat.userData.emTarget, 0.16);
    });
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 380);
    state.primary.forEach((m) => { if (muscleMats[m]) muscleMats[m].emissiveIntensity = 0.7 + pulse * 0.5; });
    ring.material.opacity = 0.2 + pulse * 0.15;
    controls.update();
    renderer.render(scene, camera);
  }
  tick();

  applyColors();

  return {
    set({ primary = [], secondary = [], planned = [] } = {}) {
      state = { ...state, primary, secondary: secondary.filter((m) => !primary.includes(m)), planned };
      applyColors();
    },
    // повернуть к стороне, где видна мышца
    face(side) { orbitTo(side === 'back' ? Math.PI : 0); },
    reset() { orbitTo(0, { distance: 4.1, targetY: 0.95 }); },
    zoom(f) {
      const off = camera.position.clone().sub(controls.target);
      const r = THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance);
      camera.position.copy(controls.target).add(off.setLength(r));
    },
    setLight(v) { light = v; baseMat.color.copy(v ? COL.baseLight : COL.base); applyColors(); },
    dispose() { running = false; cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); },
  };
}

export const BACK_SIDE = ['lats', 'lowerback', 'glutes', 'hamstrings', 'triceps'];

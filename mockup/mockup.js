import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const NAMES = {
  neck: 'Шея', chest: 'Грудь', shoulders: 'Плечи (дельты)', biceps: 'Бицепс', triceps: 'Трицепс', forearms: 'Предплечья', abs: 'Пресс',
  obliques: 'Косые мышцы', traps: 'Трапеции', lats: 'Спина (широчайшие)', lowerback: 'Поясница', glutes: 'Ягодицы',
  quads: 'Квадрицепсы', hamstrings: 'Бицепс бедра', adductors: 'Приводящие', calves: 'Икры',
};
const SIDE = { lats: 'back', lowerback: 'back', glutes: 'back', hamstrings: 'back', triceps: 'back', traps: 'back', chest: 'front', abs: 'front', obliques: 'front', biceps: 'front', quads: 'front', neck: 'front' };

const stage = document.getElementById('stage');
const tip = document.getElementById('tip');

// ---------- сцена ----------
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
stage.prepend(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.35;

const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
camera.position.set(0, 1.0, 4.4);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 0.92, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.7;
controls.maxDistance = 7;
controls.screenSpacePanning = true;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
window.__mock = { camera, controls }; // для отладки

const hemi = new THREE.HemisphereLight(0xe8edff, 0x1a1d2a, 0.6);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 1.7);
key.position.set(1.6, 3.2, 2.6);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.camera.left = -1; key.shadow.camera.right = 1; key.shadow.camera.top = 2; key.shadow.camera.bottom = -0.2;
key.shadow.bias = -0.0004;
key.shadow.normalBias = 0.02;
scene.add(key);
const fill = new THREE.DirectionalLight(0xb8c4ff, 0.55); fill.position.set(-2.4, 1.6, 1.8); scene.add(fill);
const rimA = new THREE.DirectionalLight(0xff9a5c, 1.5); rimA.position.set(-2.2, 2.4, -2.6); scene.add(rimA);
const rimB = new THREE.DirectionalLight(0x6ad5ff, 1.1); rimB.position.set(2.4, 1.4, -2.4); scene.add(rimB);

// пол
const floor = new THREE.Mesh(new THREE.CircleGeometry(1.2, 64), new THREE.ShadowMaterial({ opacity: 0.35 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.512, 96), new THREE.MeshBasicMaterial({ color: 0xff7a45, transparent: true, opacity: 0.3 }));
ring.rotation.x = -Math.PI / 2; ring.position.y = 0.002; scene.add(ring);

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);
resize();

// ---------- модель ----------
const C = {
  skin: new THREE.Color('#c3c7d0'),
  muscle: new THREE.Color('#d2d5dc'),
  hair: new THREE.Color('#4a4f5c'),
  line: new THREE.Color('#1d2029'),
  sel: new THREE.Color('#ff4f2e'),
  hover: new THREE.Color('#ffb59a'),
};
// цвета как на схеме
const SCHEME = {
  neck: '#f0a35e', chest: '#e5372f', shoulders: '#e9df47', biceps: '#8e44ad', triceps: '#8e44ad', forearms: '#2f4fb0', forearmsO: '#2f4fb0', forearmsI: '#36b3b0',
  abs: '#2e8b3e', obliques: '#2e8b3e', traps: '#3da84c', lats: '#e5372f', teres: '#36b3b0', lowerback: '#d63a33',
  glutes: '#a64bc0', quads: '#b4611f', hamstrings: '#6a1c10', adductors: '#d48ad8', adductorsB: '#8f5a2b',
  calves: '#8ac34a', tibialis: '#5bc6c2', base: '#f2f2f4', hair: '#f2f2f4',
};
const SCHEME_C = Object.fromEntries(Object.entries(SCHEME).map(([k, v]) => [k, new THREE.Color(v)]));
let mesh = null, groups = null, colorKeys = null, line = null, colors = null;
let selected = null, hovered = null, showLines = true, scheme = false;
let style = 'line'; // line — как на фото, color — цвета схемы, sculpt — объёмная
let matSculpt = null, matToon = null, outline = null;

// модель тела: готовый файл (упрощённая сетка + разметка мышц), собирается скриптом tools/build.mjs
Promise.all([fetch('./model/body.json').then((r) => r.json()), fetch('./model/body.bin').then((r) => r.arrayBuffer())]).then(([meta, buf]) => {
  const t0 = performance.now();
  const [oPos, oIdx, oG, oC, oL, oGv, oIn] = meta.offsets;
  const nv = meta.vertices;
  const positions = new Float32Array(buf, oPos, nv * 3);
  const indices = new Uint32Array(buf, oIdx, meta.indices);
  const gIds = new Uint8Array(buf, oG, nv), cIds = new Uint8Array(buf, oC, nv), lv = new Uint8Array(buf, oL, nv);
  groups = Array.from(gIds, (i) => meta.groups[i]);
  colorKeys = Array.from(cIds, (i) => meta.colors[i]);
  line = Float32Array.from(lv, (x) => x / 255);
  const gv = oGv !== undefined ? new Uint8Array(buf, oGv, nv) : new Uint8Array(nv);
  const g = new THREE.BufferGeometry();
  // гладкие поля для линий: граница мышц и ложбинки рельефа
  g.setAttribute('aEdge', new THREE.BufferAttribute(lv, 1, true));
  g.setAttribute('aGroove', new THREE.BufferAttribute(gv, 1, true));
  g.setAttribute('aInner', new THREE.BufferAttribute(oIn !== undefined ? new Uint8Array(buf, oIn, nv) : new Uint8Array(nv), 1, true));
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  g.setIndex(new THREE.BufferAttribute(indices, 1));
  g.computeVertexNormals();
  colors = new Float32Array(nv * 3);
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  matSculpt = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, clearcoat: 0.12, clearcoatRoughness: 0.6, sheen: 0.3, sheenColor: new THREE.Color('#ffe9df'), sheenRoughness: 0.6 });
  // «рисованный» материал: несколько ступеней освещения, как заливка в иллюстрации
  const steps = new Uint8Array([150, 196, 232, 255]);
  const grad = new THREE.DataTexture(steps, 4, 1, THREE.RedFormat);
  grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
  matToon = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
  withLines(matToon); withLines(matSculpt);
  mesh = new THREE.Mesh(g, matToon);
  mesh.castShadow = true;
  scene.add(mesh);
  window.__mock.mesh = mesh;
  // контур силуэта: та же модель, чуть раздутая, рисуется изнанкой чёрным
  const om = new THREE.MeshBasicMaterial({ color: 0x14161c, side: THREE.BackSide });
  om.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.0024;'); };
  outline = new THREE.Mesh(g, om);
  scene.add(outline);
  applyStyle();
  paint();
  document.getElementById('loader')?.remove();
  document.getElementById('stat').innerHTML = `Модель: ${(nv / 1000).toFixed(0)} тыс. вершин.<br>3D-модель тела: «Male body», автор Chin Eeyang (Sketchfab), лицензия CC BY 4.0. Голова, разметка мышц и стиль — Kosmic.`;
  console.log('модель готова за', Math.round(performance.now() - t0), 'мс');
}).catch((e) => { document.getElementById('loader').textContent = 'Не удалось загрузить модель: ' + e.message; });

// ---------- линии в шейдере: ровная граница = изолиния гладкого поля ----------
const lineU = { uLineOn: { value: 1 }, uLineT: { value: 0.76 }, uLineC: { value: new THREE.Color('#14161c') }, uGroove: { value: 0.5 } };
function withLines(mat) {
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, lineU);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aEdge;\nattribute float aGroove;\nattribute float aInner;\nvarying float vEdge;\nvarying float vGroove;\nvarying float vInner;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdge = aEdge;\nvGroove = aGroove;\nvInner = aInner;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uLineOn;\nuniform float uLineT;\nuniform vec3 uLineC;\nuniform float uGroove;\nvarying float vEdge;\nvarying float vGroove;\nvarying float vInner;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float we = max(fwidth(vEdge), 0.0001);
        float le = smoothstep(uLineT - we, uLineT + we, vEdge);
        float wg = max(fwidth(vGroove), 0.0001);
        float lg = smoothstep(0.86 - wg, 0.86 + wg, vGroove) * uGroove;
        vec3 lc = mix(uLineC, diffuseColor.rgb, 0.55 * vInner);   // рельеф внутри мышцы — светлее
        diffuseColor.rgb = mix(diffuseColor.rgb, lc, max(le, lg) * uLineOn);`);
  };
}

const LINE_C = { skin: new THREE.Color('#ffffff'), muscle: new THREE.Color('#ffffff'), hair: new THREE.Color('#ffffff'), line: new THREE.Color('#14161c'), sel: new THREE.Color('#ff5a3c'), hover: new THREE.Color('#ffd9cc') };

function applyStyle() {
  const light = style !== 'sculpt';
  document.body.classList.toggle('light', light);
  if (mesh) {
    mesh.material = light ? matToon : matSculpt;
    outline.visible = light;
    floor.visible = !light; ring.visible = !light;
    // в рисованном стиле — мягкий свет сверху-спереди, чтобы читался объём каждой мышцы
    hemi.intensity = light ? 1.3 : 0.6;
    key.intensity = light ? 1.25 : 1.7;
    key.position.set(light ? 1.0 : 1.6, 2.6, light ? 3.2 : 2.6);
    fill.intensity = light ? 0.25 : 0.55;
    rimA.intensity = light ? 0 : 1.5; rimB.intensity = light ? 0 : 1.1;
    renderer.toneMapping = light ? THREE.NoToneMapping : THREE.ACESFilmicToneMapping;
    scene.environmentIntensity = light ? 0.0 : 0.35;
    mesh.material.needsUpdate = true;
  }
  document.querySelectorAll('[data-style]').forEach((b) => b.classList.toggle('on', b.dataset.style === style));
  lineU.uLineOn.value = showLines ? 1 : 0;
  lineU.uLineC.value.set(style === 'sculpt' ? '#2a2e38' : '#14161c');
  lineU.uGroove.value = 0; // штрихи рельефа отключены — только плавные границы мышц
  paint();
}

function paint() {
  if (!mesh) return;
  const tmp = new THREE.Color();
  const dim = new THREE.Color('#c9ccd3');
  const P = style === 'line' ? LINE_C : C;
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i], ck = colorKeys[i];
    if (style === 'color') {
      tmp.copy(SCHEME_C[ck] || SCHEME_C.base);
      if (selected && g !== selected && g !== 'base') tmp.lerp(dim, 0.6);
      else if (g === hovered && g !== selected) tmp.offsetHSL(0, 0, 0.08);
    } else {
      tmp.copy(ck === 'hair' ? P.hair : g === 'base' ? P.skin : P.muscle);
      if (g === selected) tmp.lerp(P.sel, 0.9);
      else if (g === hovered) tmp.lerp(P.hover, 0.6);
    }
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  mesh.geometry.attributes.color.needsUpdate = true;
}

// ---------- выбор ----------
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
function pick(e) {
  if (!mesh) return null;
  const r = renderer.domElement.getBoundingClientRect();
  ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObject(mesh, false)[0];
  if (!hit) return null;
  const f = hit.face;
  // область — по большинству вершин треугольника
  const rs = [groups[f.a], groups[f.b], groups[f.c]];
  const m = rs.find((x) => x !== 'base' && rs.filter((y) => y === x).length >= 2) || rs.find((x) => x !== 'base');
  return m || 'base';
}

function select(m) {
  selected = m && m !== 'base' ? (selected === m ? null : m) : null;
  document.getElementById('selName').textContent = selected ? NAMES[selected] : 'Мышца не выбрана';
  document.getElementById('selSub').textContent = selected ? 'Выбрано · здесь появятся упражнения' : 'Нажми на тело или выбери из списка';
  document.querySelectorAll('#list button').forEach((b) => b.classList.toggle('on', b.dataset.m === selected));
  paint();
}

let down = null;
const el = renderer.domElement;
el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; intro = 1; });
el.addEventListener('pointerup', (e) => {
  if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7 && performance.now() - down.t < 600) select(pick(e));
  down = null;
});
el.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || down) return;
  const m = pick(e);
  const h = m && m !== 'base' ? m : null;
  if (h !== hovered) { hovered = h; paint(); el.style.cursor = h ? 'pointer' : 'grab'; }
  if (h) {
    const r = stage.getBoundingClientRect();
    tip.textContent = NAMES[h];
    tip.style.left = `${e.clientX - r.left}px`; tip.style.top = `${e.clientY - r.top}px`; tip.style.opacity = 1;
  } else tip.style.opacity = 0;
});
el.addEventListener('pointerleave', () => { tip.style.opacity = 0; if (hovered) { hovered = null; paint(); } });

// список мышц
const list = document.getElementById('list');
list.innerHTML = Object.entries(NAMES).map(([k, v]) => `<button data-m="${k}"><i></i>${v}</button>`).join('');
list.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  select(b.dataset.m);
  if (selected && SIDE[selected]) face(SIDE[selected]);
});
document.getElementById('lines').addEventListener('change', (e) => { showLines = e.target.checked; applyStyle(); });
document.querySelectorAll('[data-style]').forEach((b) => b.addEventListener('click', () => { style = b.dataset.style; applyStyle(); }));

// ---------- камера ----------
let tween = null, intro = 0;
function orbitTo(theta, dist) {
  intro = 1;
  const off = camera.position.clone().sub(controls.target);
  const s = new THREE.Spherical().setFromVector3(off);
  let to = theta;
  while (to - s.theta > Math.PI) to -= Math.PI * 2;
  while (to - s.theta < -Math.PI) to += Math.PI * 2;
  tween = { a: { th: s.theta, r: s.radius, phi: s.phi, t: controls.target.clone() }, b: { th: to, r: dist ?? s.radius, phi: Math.PI / 2 - 0.04, t: new THREE.Vector3(0, 0.92, 0) }, t0: performance.now() };
}
function face(side) {
  orbitTo(side === 'back' ? Math.PI : side === 'side' ? Math.PI / 2 : 0);
  document.querySelectorAll('[data-face]').forEach((b) => b.classList.toggle('on', b.dataset.face === side));
}
document.querySelectorAll('[data-face]').forEach((b) => b.addEventListener('click', () => face(b.dataset.face)));
document.querySelectorAll('[data-z]').forEach((b) => b.addEventListener('click', () => {
  const off = camera.position.clone().sub(controls.target);
  orbitTo(new THREE.Spherical().setFromVector3(off).theta, THREE.MathUtils.clamp(off.length() * +b.dataset.z, controls.minDistance, controls.maxDistance));
}));
document.querySelector('[data-reset]').addEventListener('click', () => { orbitTo(0, 4.4); document.querySelectorAll('[data-face]').forEach((b) => b.classList.toggle('on', b.dataset.face === 'front')); });

const clock = new THREE.Clock();
(function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (tween) {
    const k = Math.min(1, (performance.now() - tween.t0) / 800), e = 1 - Math.pow(1 - k, 3);
    const L = (a, b) => a + (b - a) * e;
    controls.target.lerpVectors(tween.a.t, tween.b.t, e);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(L(tween.a.r, tween.b.r), L(tween.a.phi, tween.b.phi), L(tween.a.th, tween.b.th))));
    camera.lookAt(controls.target);
    if (k >= 1) tween = null;
  } else if (mesh && intro < 1) {
    // плавное вступительное покачивание
    intro = Math.min(1, intro + dt / 3.5);
    const off = camera.position.clone().sub(controls.target);
    const s = new THREE.Spherical().setFromVector3(off);
    s.theta = Math.sin(intro * Math.PI * 2) * 0.5 * (1 - intro);
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
  }
  ring.material.opacity = 0.22 + 0.1 * Math.sin(performance.now() / 500);
  controls.update();
  renderer.render(scene, camera);
})();

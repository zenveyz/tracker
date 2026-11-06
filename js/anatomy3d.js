// 3D-тело с мышцами для раздела «Тренировки».
// Модель тела: «Male body», Chin Eeyang (Sketchfab), лицензия CC BY 4.0.
// Голова, разметка мышц, упрощение и стиль — Kosmic (собирается скриптом mockup/tools/build2.mjs).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const SCHEME = {
  neck: '#f0a35e', chest: '#e5372f', shoulders: '#e9df47', biceps: '#8e44ad', triceps: '#8e44ad', forearms: '#2f4fb0', forearmsO: '#2f4fb0', forearmsI: '#36b3b0',
  abs: '#2e8b3e', obliques: '#2e8b3e', traps: '#3da84c', lats: '#e5372f', teres: '#36b3b0', lowerback: '#d63a33',
  glutes: '#a64bc0', quads: '#b4611f', hamstrings: '#6a1c10', adductors: '#d48ad8', adductorsB: '#8f5a2b',
  calves: '#8ac34a', tibialis: '#5bc6c2', base: '#f2f2f4', hair: '#f2f2f4',
};
const C = {
  white: new THREE.Color('#ffffff'),
  dark: new THREE.Color('#3a4052'),
  primary: new THREE.Color('#ff5a36'),
  secondary: new THREE.Color('#ffb48a'),
  planned: new THREE.Color('#ffe2d6'),
  hover: new THREE.Color('#ffd0bf'),
  dim: new THREE.Color('#c9ccd3'),
};
const SCHEME_C = Object.fromEntries(Object.entries(SCHEME).map(([k, v]) => [k, new THREE.Color(v)]));
const MODEL_URL = new URL('../models/', import.meta.url);

export function createAnatomy3D(host, { onSelect, light = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.domElement.className = 'body3d-canvas';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.05, 50);
  const HOME = { pos: new THREE.Vector3(0, 1.0, 4.6), target: new THREE.Vector3(0, 0.97, 0) };
  camera.position.copy(HOME.pos);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(HOME.target);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.7;
  controls.maxDistance = 5.2;
  controls.minPolarAngle = 0.35;          // не уходить вертикально над/под фигуру
  controls.maxPolarAngle = Math.PI - 0.45;
  controls.screenSpacePanning = true;
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };

  scene.add(new THREE.HemisphereLight(0xe8edff, 0x1a1d2a, 1.3));
  const key = new THREE.DirectionalLight(0xffffff, 1.25); key.position.set(1.0, 2.6, 3.2); scene.add(key);
  const back = new THREE.DirectionalLight(0xffffff, 0.5); back.position.set(-1.2, 2.0, -3.0); scene.add(back);

  // ---------- линии мышц в шейдере ----------
  const lineU = { uLineOn: { value: 1 }, uLineT: { value: 0.76 }, uLineC: { value: new THREE.Color('#14161c') } };
  const withLines = (mat) => {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, lineU);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nattribute float aEdge;\nattribute float aInner;\nvarying float vEdge;\nvarying float vInner;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvEdge = aEdge;\nvInner = aInner;');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float uLineOn;\nuniform float uLineT;\nuniform vec3 uLineC;\nvarying float vEdge;\nvarying float vInner;')
        .replace('#include <color_fragment>', `#include <color_fragment>
          float we = max(fwidth(vEdge), 0.0001);
          float le = smoothstep(uLineT - we, uLineT + we, vEdge);
          // границы мышц — тёмные, рельеф внутри мышцы — светлее (наполовину к цвету мышцы)
          vec3 lc = mix(uLineC, diffuseColor.rgb, 0.55 * vInner);
          diffuseColor.rgb = mix(diffuseColor.rgb, lc, le * uLineOn);`);
    };
  };

  let mesh = null, outline = null, groups = null, colorKeys = null, colors = null;
  let state = { primary: [], secondary: [], planned: [] }, hovered = null, style = 'line', heat = null;
  const HEAT_HI = new THREE.Color('#e5372f'), HEAT_LO = new THREE.Color('#f2f2f4');

  function paint() {
    if (!mesh) return;
    const tmp = new THREE.Color();
    const anyFocus = state.primary.length > 0;
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      if (heat) {
        // нагрузка за период: почти не тренировал — белая, больше всего — насыщенно-красная
        const v = g === 'base' ? 0 : heat[g] || 0;
        tmp.copy(HEAT_LO).lerp(HEAT_HI, v > 0 ? 0.18 + 0.82 * v : 0);
        if (colorKeys[i] === 'hair') tmp.copy(SCHEME_C.hair || HEAT_LO);
      } else if (style === 'color') {
        tmp.copy(SCHEME_C[colorKeys[i]] || SCHEME_C.base);
        if (anyFocus && g !== 'base' && !state.primary.includes(g) && !state.secondary.includes(g)) tmp.lerp(C.dim, 0.65);
        if (state.primary.includes(g)) tmp.lerp(C.primary, 0.25);
      } else {
        tmp.copy(C.white);
        if (state.primary.includes(g)) tmp.copy(C.primary);
        else if (state.secondary.includes(g)) tmp.copy(C.secondary);
        else if (state.planned.includes(g)) tmp.copy(C.planned);
      }
      if (g !== 'base' && g === hovered && !state.primary.includes(g)) tmp.lerp(C.hover, 0.5);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    mesh.geometry.attributes.color.needsUpdate = true;
  }

  const ready = Promise.all([
    fetch(new URL('body.json', MODEL_URL)).then((r) => r.json()),
    fetch(new URL('body.bin', MODEL_URL)).then((r) => r.arrayBuffer()),
  ]).then(([meta, buf]) => {
    const [oPos, oIdx, oG, oC, oL, , oIn] = meta.offsets;
    const nv = meta.vertices;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(buf, oPos, nv * 3), 3));
    g.setIndex(new THREE.BufferAttribute(new Uint32Array(buf, oIdx, meta.indices), 1));
    g.setAttribute('aEdge', new THREE.BufferAttribute(new Uint8Array(buf, oL, nv), 1, true));
    g.setAttribute('aInner', new THREE.BufferAttribute(oIn !== undefined ? new Uint8Array(buf, oIn, nv) : new Uint8Array(nv), 1, true));
    g.computeVertexNormals();
    groups = Array.from(new Uint8Array(buf, oG, nv), (i) => meta.groups[i]);
    colorKeys = Array.from(new Uint8Array(buf, oC, nv), (i) => meta.colors[i]);
    colors = new Float32Array(nv * 3);
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const steps = new Uint8Array([150, 196, 232, 255]);
    const grad = new THREE.DataTexture(steps, 4, 1, THREE.RedFormat);
    grad.minFilter = grad.magFilter = THREE.NearestFilter; grad.needsUpdate = true;
    const mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: grad });
    withLines(mat);
    mesh = new THREE.Mesh(g, mat);
    scene.add(mesh);
    const om = new THREE.MeshBasicMaterial({ color: 0x14161c, side: THREE.BackSide });
    om.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', 'vec3 transformed = position + normal * 0.0024;'); };
    outline = new THREE.Mesh(g, om);
    scene.add(outline);
    paint();
  });

  // ---------- выбор мышцы ----------
  const ray = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(e) {
    if (!mesh) return null;
    const r = renderer.domElement.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(mesh, false)[0];
    if (!hit) return null;
    const f = hit.face, rs = [groups[f.a], groups[f.b], groups[f.c]];
    return rs.find((x) => x !== 'base' && rs.filter((y) => y === x).length >= 2) || rs.find((x) => x !== 'base') || null;
  }
  let down = null, intro = 0;
  const el = renderer.domElement;
  el.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; intro = 1; });
  el.addEventListener('pointerup', (e) => {
    if (down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 7 && performance.now() - down.t < 600) { const m = pick(e); if (m && onSelect) onSelect(m); }
    down = null;
  });
  el.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse' || down) return;
    const m = pick(e);
    if (m !== hovered) { hovered = m; el.style.cursor = m ? 'pointer' : 'grab'; paint(); }
  });
  el.addEventListener('pointerleave', () => { if (hovered) { hovered = null; paint(); } });

  // ---------- размер ----------
  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // ---------- камера ----------
  let tween = null;
  function orbitTo(theta, dist, target = HOME.target) {
    intro = 1;
    const off = camera.position.clone().sub(controls.target);
    const sph = new THREE.Spherical().setFromVector3(off);
    let to = theta;
    while (to - sph.theta > Math.PI) to -= Math.PI * 2;
    while (to - sph.theta < -Math.PI) to += Math.PI * 2;
    tween = { a: { th: sph.theta, r: sph.radius, phi: sph.phi, t: controls.target.clone() }, b: { th: to, r: dist ?? sph.radius, phi: Math.PI / 2 - 0.03, t: target.clone() }, t0: performance.now() };
  }
  let raf = 0;
  const clock = new THREE.Clock();
  (function loop() {
    raf = requestAnimationFrame(loop);
    if (!host.isConnected || document.hidden) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (tween) {
      const k = Math.min(1, (performance.now() - tween.t0) / 750), e = 1 - Math.pow(1 - k, 3);
      const L = (a, b) => a + (b - a) * e;
      controls.target.lerpVectors(tween.a.t, tween.b.t, e);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(new THREE.Spherical(L(tween.a.r, tween.b.r), L(tween.a.phi, tween.b.phi), L(tween.a.th, tween.b.th))));
      camera.lookAt(controls.target);
      if (k >= 1) tween = null;
    } else if (mesh && intro < 1) {
      intro = Math.min(1, intro + dt / 3.2);
      const off = camera.position.clone().sub(controls.target);
      const s = new THREE.Spherical().setFromVector3(off);
      s.theta = Math.sin(intro * Math.PI * 2) * 0.45 * (1 - intro);
      camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
    }
    controls.update();
    // фигура не уплывает: центр вращения держим рядом с телом, камеру сдвигаем вместе с ним
    const t = controls.target, c = new THREE.Vector3(
      THREE.MathUtils.clamp(t.x, -0.22, 0.22), THREE.MathUtils.clamp(t.y, 0.35, 1.62), THREE.MathUtils.clamp(t.z, -0.2, 0.2));
    if (!c.equals(t)) { camera.position.add(c.clone().sub(t)); t.copy(c); }
    renderer.render(scene, camera);
  })();

  return {
    ready,
    set({ primary = [], secondary = [], planned = [] } = {}) {
      state = { primary, secondary: secondary.filter((m) => !primary.includes(m)), planned };
      paint();
    },
    face(side) { orbitTo(side === 'back' ? Math.PI : side === 'side' ? Math.PI / 2 : 0); },
    zoom(f) {
      const off = camera.position.clone().sub(controls.target);
      orbitTo(new THREE.Spherical().setFromVector3(off).theta, THREE.MathUtils.clamp(off.length() * f, controls.minDistance, controls.maxDistance), controls.target.clone());
    },
    reset() { orbitTo(0, HOME.pos.distanceTo(HOME.target)); },
    setStyle(s) { style = s; paint(); },
    setHeat(h) { heat = h; paint(); },
    setLight() { /* модель всегда светлая — как на схеме */ },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); controls.dispose(); renderer.dispose(); },
  };
}

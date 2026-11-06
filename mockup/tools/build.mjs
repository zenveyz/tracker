// Сборка модели тела для макета:
//  1) читаем GLB (Male body, Chin Eeyang, CC BY 4.0), упрощаем сетку,
//  2) размечаем мышцы как на схеме, считаем линии границ,
//  3) добавляем гладкую голову с причёской,
//  4) сохраняем компактный бинарный файл model/body.bin + model/body.json
import { writeFileSync } from 'node:fs';
import { loadGLB } from './glb.mjs';
import { ellipsoid, cone, makeField, polygonize } from '../sculpt.js';

const here = (p) => new URL(p, import.meta.url).pathname.slice(1);
const t0 = Date.now();
const src = loadGLB(here('../model/male_body.glb'));
console.log('исходник:', src.positions.length / 3, 'вершин,', src.indices.length / 3, 'треугольников');

// ---------- 1. упрощение (кластеризация вершин) ----------
const CELL = +(process.argv[2] || 0.42); // см
function simplify(P, I, cell) {
  const map = new Map(), sum = [], vid = new Int32Array(P.length / 3);
  for (let i = 0; i < P.length / 3; i++) {
    const k = `${Math.floor(P[i * 3] / cell)},${Math.floor(P[i * 3 + 1] / cell)},${Math.floor(P[i * 3 + 2] / cell)}`;
    let id = map.get(k);
    if (id === undefined) { id = sum.length / 4; map.set(k, id); sum.push(0, 0, 0, 0); }
    sum[id * 4] += P[i * 3]; sum[id * 4 + 1] += P[i * 3 + 1]; sum[id * 4 + 2] += P[i * 3 + 2]; sum[id * 4 + 3]++;
    vid[i] = id;
  }
  const n = sum.length / 4, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) for (let c = 0; c < 3; c++) pos[i * 3 + c] = sum[i * 4 + c] / sum[i * 4 + 3];
  const seen = new Set(), idx = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = vid[I[t]], b = vid[I[t + 1]], c = vid[I[t + 2]];
    if (a === b || b === c || a === c) continue;
    const key = [a, b, c].sort((x, y) => x - y).join(',');
    if (seen.has(key)) continue;
    seen.add(key); idx.push(a, b, c);
  }
  return { positions: pos, indices: Uint32Array.from(idx) };
}
const body = simplify(src.positions, src.indices, CELL);
console.log('упрощено:', body.positions.length / 3, 'вершин,', body.indices.length / 3, 'треугольников');

function normalsOf(P, I) {
  const N = new Float32Array(P.length);
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2];
    const vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { N[k] += nx; N[k + 1] += ny; N[k + 2] += nz; }
  }
  for (let i = 0; i < N.length; i += 3) { const l = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= l; N[i + 1] /= l; N[i + 2] /= l; }
  return N;
}

// ---------- 2. разметка мышц (координаты модели, см; правая сторона x>0, левая зеркально) ----------
const PI = Math.PI;
const wrap = (a) => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
const blob = (u, v, cu, cv, ru, rv, p = 2) => Math.pow(Math.abs((u - cu) / ru), p) + Math.pow(Math.abs((v - cv) / rv), p) < 1;
// «кости» модели (найдены по сечениям сетки)
const BONES = {
  torso: [[0, 92, -6], [0, 164, -5], 15],
  neck: [[0, 164, -5], [0, 180, -4], 6],
  uarm: [[20, 154, -5], [38, 125, -6.5], 5.2],
  farm: [[38, 125, -6.5], [45.3, 103, 2.5], 4],
  hand: [[45.3, 103, 2.5], [48.7, 84, 7], 3.2],
  thigh: [[11, 90, -7], [15.8, 49, -10.5], 7.5],
  shin: [[15.8, 49, -10.5], [18.6, 9, -12.5], 5],
  foot: [[18.6, 9, -12.5], [20, 2, 6], 4],
};
function seg(p, [a, b]) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const px = p[0] - a[0], py = p[1] - a[1], pz = p[2] - a[2];
  let t = (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz);
  t = Math.max(0, Math.min(1, t));
  return { t, d: [px - bx * t, py - by * t, pz - bz * t] };
}
function partOf(P) {
  let best = 'torso', bd = 1e9;
  for (const [k, [a, b, r]] of Object.entries(BONES)) {
    const { d } = seg(P, [a, b]);
    const s = Math.hypot(...d) - r;
    if (s < bd) { bd = s; best = k; }
  }
  return best;
}

function label(x, y, z) {
  const ax = Math.abs(x), s = x >= 0 ? 'R' : 'L';
  const P = [ax, y, z];
  const part = partOf(P);
  const M = (g, sub = '', color = g) => [g, `${g}:${s}:${sub}`, color];
  const B = (sub, sided = true) => ['base', sided ? `base:${s}:${sub}` : `base:${sub}`, 'base'];
  const glute = () => z < -9 && blob(ax, y, 9, 92, 10.5, 11.5, 2.6);
  const bone = (k) => seg(P, BONES[k]);
  switch (part) {
    case 'uarm': {
      const { t, d } = bone('uarm');
      const th = Math.atan2(d[0], d[2]);
      const dO = Math.abs(wrap(th - PI / 2));
      const tMax = 0.5 - 0.24 * Math.pow(dO / 1.9, 1.25);
      if (dO < 2.15 && t < tMax) return M('shoulders');
      // ниже дельты: спереди бицепс, сзади трицепс — сплошь до локтя, как на схеме
      return Math.cos(th - 0.25) > -0.1 ? M('biceps') : M('triceps');
    }
    case 'farm': {
      const { t, d } = bone('farm');
      const th = Math.atan2(d[0], d[2]);
      if (t > 0.9) return B('wrist');
      // наружная (синяя) и внутренняя (бирюзовая) группы — сплошь от локтя до запястья
      return th > -0.25 && th < 2.7 ? M('forearms', 'o', 'forearmsO') : M('forearms', 'i', 'forearmsI');
    }
    case 'thigh': {
      const { t, d } = bone('thigh');
      const th = Math.atan2(d[0], d[2]);
      const ph = wrap(th - PI);
      if (glute()) return M('glutes');
      // спереди: квадрицепсы на всё бедро, внутри — розовый треугольник приводящих
      const innerEdge = -0.62 + t * 0.55;
      if (th > 1.45 && th < 2.1 && t > 0.02 && t < 0.5) return M('quads', 'tfl', 'adductors'); // наружная розовая полоска (напрягатель фасции)
      if (t < 0.86 && th <= innerEdge && th > -2.3 && t < 0.78) return M('adductors');
      if (t > 0.04 && t < 0.86 - Math.max(0, th - 1.2) * 0.1 && th > innerEdge && th < 2.05) {
        return M('quads', th > 0.85 ? 'vl' : (th < 0.05 && t > 0.5) ? 'vm' : 'rf');
      }
      if (blob(ph, t, -0.42, 0.52, 0.5, 0.42, 2)) return M('hamstrings', 'bf');
      if (blob(ph, t, 0.38, 0.52, 0.45, 0.42, 2)) return M('hamstrings', 'st');
      if (blob(ph, t, 1.2, 0.34, 0.5, 0.38, 2)) return M('adductors', 'b', 'adductorsB');
      return B(t > 0.85 ? 'knee' : 'thigh');
    }
    case 'shin': {
      const { t, d } = bone('shin');
      const th = Math.atan2(d[0], d[2]);
      const ph = wrap(th - PI);
      if (blob(ph, t, -0.48, 0.42, 0.66, 0.4, 1.6)) return M('calves', 'lat');
      if (blob(ph, t, 0.48, 0.44, 0.7, 0.42, 1.6)) return M('calves', 'med');
      if (blob(th, t, 0.42, 0.44, 0.4, 0.3, 2)) return M('calves', 'tib', 'tibialis');
      if (t < 0.08) return B('knee');
      if (t > 0.86) return B('ankle');
      return B(Math.abs(th) < PI / 2 ? 'shinF' : 'shinB');
    }
    case 'torso': {
      const front = z > -5;
      if (front) {
        const k = Math.min(ax, 21) / 21;
        const yt = 163 - 6.5 * Math.pow(k, 1.3);                       // ключица → плечо
        const yb = 136.5 + 4.5 * k * k - 3 * Math.sin(PI * k);         // нижний край груди дугой
        if (ax > 0.25 && ax < 21.5 && y < yt && y > yb) return M('chest');
        if (ax >= 20 && y > 138) return M('shoulders');
        if (y > 164) return B('neck', false);
        const absW = 7.2 - 1.6 * Math.max(0, (104 - y) / 9);
        const vLine = 93 + ax * 0.85;
        if (ax < absW && y < 135.5 && y > Math.max(94, vLine - 0.8)) {
          return M('abs');
        }
        if (y > vLine && y < yb && ax < 21) return M('obliques');
        return B('groin', false);
      }
      if (y > 164 && ax < 7) return M('traps');
      if (y > 150 + ax * 0.5) return M('traps');
      if (y > 124 && ax < 10.5 * (y - 124) / 26) return M('traps');
      if (blob(ax, y, 15.5, 146, 5.2, 3.6, 2)) return M('lats', 't', 'teres');
      if (ax / 8 + Math.abs(y - 110) / 10 < 1) return M('lowerback');
      if (glute()) return M('glutes');
      if (ax > 20 && y > 138) return M('shoulders', 'r');
      if (y > 101 + Math.max(0, 15 - ax) * 0.3 && ax < 22) return M('lats');
      return B('back', false);
    }
    case 'neck': return B('neck', false);
    case 'hand': return B('hand');
    case 'foot': return B('foot');
    default: return ['base', 'base', 'base'];
  }
}

const P = body.positions, I = body.indices, n = P.length / 3;
let N = normalsOf(P, I);
const groups = new Array(n), keys = new Array(n), colors = new Array(n);
for (let v = 0; v < n; v++) {
  const [g, k, c] = label(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]);
  groups[v] = g; keys[v] = k; colors[v] = c;
}
// линии: проверяем участки вокруг точки по касательной
const line = new Float32Array(n);
const R1 = CELL * 0.85, DIRS = 12;
for (let v = 0; v < n; v++) {
  const x = P[v * 3], y = P[v * 3 + 1], z = P[v * 3 + 2];
  const nx = N[v * 3], ny = N[v * 3 + 1], nz = N[v * 3 + 2];
  let tx = -nz, ty = 0, tz = nx;
  let tl = Math.hypot(tx, ty, tz);
  if (tl < 1e-3) { tx = 1; ty = 0; tz = 0; tl = 1; }
  tx /= tl; ty /= tl; tz /= tl;
  const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
  let diff = 0;
  for (let j = 0; j < DIRS; j++) {
    const a = (j / DIRS) * PI * 2, c = Math.cos(a) * R1, s2 = Math.sin(a) * R1;
    if (label(x + tx * c + bx * s2, y + ty * c + by * s2, z + tz * c + bz * s2)[1] !== keys[v]) diff++;
  }
  const t = Math.min(1, diff / (DIRS * 0.14));
  line[v] = t * t * (3 - 2 * t);
}
console.log('разметка и линии готовы');

// ---------- 3. перевод в метры (рост 1,8 м с головой) + голова ----------
const FOOT = 1.7, NECK_TOP = 179.4;
const S = 1.8 / (NECK_TOP + 23.2 - FOOT);
const yN = (NECK_TOP - FOOT) * S, zN = -3.6 * S;
for (let v = 0; v < n; v++) { P[v * 3] *= S; P[v * 3 + 1] = (P[v * 3 + 1] - FOOT) * S; P[v * 3 + 2] *= S; }

const prims = [];
const add = (part, prim, { mirror = false, k = 0.03 } = {}) => {
  prims.push({ ...prim, part, k });
  if (mirror) {
    const m = prim.type === 'c' ? cone([-prim.a[0], prim.a[1], prim.a[2]], [-prim.b[0], prim.b[1], prim.b[2]], prim.r1, prim.r2) : ellipsoid([-prim.c[0], prim.c[1], prim.c[2]], prim.r);
    prims.push({ ...m, part, k });
  }
};
add('neck', cone([0, yN - 0.06, zN - 0.002], [0, yN + 0.045, zN + 0.004], 0.054, 0.05), { k: 0.03 });
add('head', ellipsoid([0, yN + 0.118, zN + 0.0], [0.07, 0.094, 0.087]), { k: 0.02 });
add('head', ellipsoid([0, yN + 0.07, zN + 0.028], [0.054, 0.066, 0.063]), { k: 0.04 });
add('head', ellipsoid([0, yN + 0.018, zN + 0.052], [0.034, 0.03, 0.04]), { k: 0.04 });
add('head', ellipsoid([0.069, yN + 0.09, zN - 0.006], [0.009, 0.021, 0.013]), { mirror: true, k: 0.01 });
// причёска: «шапка» волос и вихры вверх-назад, как на схеме
add('hair', ellipsoid([0, yN + 0.152, zN - 0.012], [0.075, 0.07, 0.09]), { k: 0.012 });
[[0, 0.03, 1.0], [0.022, 0.032, 0.92], [-0.022, 0.034, 0.9], [0.01, 0.005, 1.05], [-0.012, 0.002, 1.02], [0.035, 0.0, 0.85], [-0.036, 0.0, 0.84],
 [0.0, -0.025, 0.95], [0.022, -0.03, 0.85], [-0.024, -0.032, 0.82], [0.045, 0.02, 0.75], [-0.046, 0.02, 0.74]]
  .forEach(([x, z, k]) => add('hair', cone([x * 0.9, yN + 0.19, zN + z], [x * 1.25, yN + 0.19 + 0.052 * k, zN + z - 0.022 * k], 0.02, 0.0018), { k: 0.012 }));
const hf = makeField(prims);
const headMesh = polygonize(hf, { min: [-0.11, yN - 0.05, -0.15], max: [0.11, 1.86, 0.13], h: 0.0024 });
// оставляем только то, что выше шеи тела (низ головы прячется внутри шеи)
const hp = headMesh.positions, hi = headMesh.indices;
const hm = new Int32Array(hp.length / 3).fill(-1), HP = [], HI = [], hKeys = [];
for (let t = 0; t < hi.length; t += 3) {
  const a = hi[t], b = hi[t + 1], c = hi[t + 2];
  if (Math.min(hp[a * 3 + 1], hp[b * 3 + 1], hp[c * 3 + 1]) < yN - 0.03) continue;
  for (const v of [a, b, c]) {
    if (hm[v] < 0) {
      hm[v] = HP.length / 3;
      HP.push(hp[v * 3], hp[v * 3 + 1], hp[v * 3 + 2]);
      const inf = hf(hp[v * 3], hp[v * 3 + 1], hp[v * 3 + 2], true);
      hKeys.push(inf.prim && inf.prim.part === 'hair' ? 'hair' : 'head');
    }
    HI.push(hm[v]);
  }
}
console.log('голова:', HP.length / 3, 'вершин');

// ---------- 4. сборка и запись ----------
const GROUPS = ['base', 'chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'traps', 'lats', 'lowerback', 'glutes', 'quads', 'hamstrings', 'adductors', 'calves'];
const COLORS = ['base', 'hair', 'chest', 'shoulders', 'biceps', 'triceps', 'forearmsO', 'forearmsI', 'abs', 'obliques', 'traps', 'lats', 'teres', 'lowerback', 'glutes', 'quads', 'hamstrings', 'adductors', 'adductorsB', 'calves', 'tibialis'];
const nh = HP.length / 3, total = n + nh;
const pos = new Float32Array(total * 3); pos.set(P); pos.set(HP, n * 3);
const idx = new Uint32Array(I.length + HI.length); idx.set(I); for (let i = 0; i < HI.length; i++) idx[I.length + i] = HI[i] + n;
const gArr = new Uint8Array(total), cArr = new Uint8Array(total), lArr = new Uint8Array(total);
for (let v = 0; v < n; v++) { gArr[v] = GROUPS.indexOf(groups[v]); cArr[v] = COLORS.indexOf(colors[v]); lArr[v] = Math.round(line[v] * 255); }
for (let v = 0; v < nh; v++) { gArr[n + v] = 0; cArr[n + v] = COLORS.indexOf(hKeys[v]); }
// линия вокруг волос
for (let t = 0; t < HI.length; t += 3) {
  const a = HI[t], b = HI[t + 1], c = HI[t + 2];
  if (hKeys[a] !== hKeys[b] || hKeys[b] !== hKeys[c]) for (const v of [a, b, c]) lArr[n + v] = 255;
}
const header = { vertices: total, indices: idx.length, groups: GROUPS, colors: COLORS, height: 1.8,
  credit: 'Male body — Chin Eeyang (sketchfab.com/chinyang1607), CC BY 4.0. Голова, разметка мышц и упрощение — Kosmic.' };
const parts = [pos, idx, gArr, cArr, lArr];
const offsets = []; let off = 0;
for (const a of parts) { offsets.push(off); off += a.byteLength; off = Math.ceil(off / 4) * 4; }
const out = Buffer.alloc(off);
parts.forEach((a, i) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).copy(out, offsets[i]));
header.offsets = offsets;
writeFileSync(here('../model/body.bin'), out);
writeFileSync(here('../model/body.json'), JSON.stringify(header));
const cnt = {}; groups.forEach((g) => (cnt[g] = (cnt[g] || 0) + 1));
console.log('записано:', (out.length / 1048576).toFixed(1), 'МБ,', total, 'вершин,', idx.length / 3, 'треугольников за', ((Date.now() - t0) / 1000).toFixed(1), 'с');
console.log(JSON.stringify(cnt));

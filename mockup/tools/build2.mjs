// Сборка модели тела v2: зоны мышц «растекаются» от опорных точек по поверхности
// и останавливаются в ложбинках между мышцами — так цвета ложатся на настоящие мышцы модели.
// Модель: «Male body», Chin Eeyang (Sketchfab), CC BY 4.0.
import { writeFileSync } from 'node:fs';
import { loadGLB } from './glb.mjs';
import { ellipsoid, cone, makeField, polygonize, dist } from '../sculpt.js';
import { label } from './labels.mjs';

const here = (p) => new URL(p, import.meta.url).pathname.slice(1);
const t0 = Date.now();
const CELL = +(process.argv[2] || 0.42);

// ---------- упрощение ----------
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
    const key = a < b ? (b < c ? `${a},${b},${c}` : a < c ? `${a},${c},${b}` : `${c},${a},${b}`) : (a < c ? `${b},${a},${c}` : b < c ? `${b},${c},${a}` : `${c},${b},${a}`);
    if (seen.has(key)) continue;
    seen.add(key); idx.push(a, b, c);
  }
  return { positions: pos, indices: Uint32Array.from(idx) };
}
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

const src = loadGLB(here('../model/male_body.glb'));
const body = simplify(src.positions, src.indices, CELL);
const P = body.positions, I = body.indices, n = P.length / 3;
const N = normalsOf(P, I);
console.log('сетка:', n, 'вершин,', I.length / 3, 'треугольников');

// ---------- соседи ----------
const deg = new Int32Array(n);
for (let t = 0; t < I.length; t += 3) { deg[I[t]] += 2; deg[I[t + 1]] += 2; deg[I[t + 2]] += 2; }
const start = new Int32Array(n + 1);
for (let i = 0; i < n; i++) start[i + 1] = start[i] + deg[i];
const nb = new Int32Array(start[n]), fill = start.slice(0, n);
for (let t = 0; t < I.length; t += 3) {
  const a = I[t], b = I[t + 1], c = I[t + 2];
  nb[fill[a]++] = b; nb[fill[a]++] = c; nb[fill[b]++] = a; nb[fill[b]++] = c; nb[fill[c]++] = a; nb[fill[c]++] = b;
}
const dist3 = (a, b) => Math.hypot(P[a * 3] - P[b * 3], P[a * 3 + 1] - P[b * 3 + 1], P[a * 3 + 2] - P[b * 3 + 2]);

// ---------- вогнутость (ложбинки между мышцами) ----------
let conc = new Float32Array(n);
for (let v = 0; v < n; v++) {
  let mx = 0, my = 0, mz = 0, c = 0;
  for (let k = start[v]; k < start[v + 1]; k++) { const w = nb[k]; mx += P[w * 3]; my += P[w * 3 + 1]; mz += P[w * 3 + 2]; c++; }
  if (!c) continue;
  mx = mx / c - P[v * 3]; my = my / c - P[v * 3 + 1]; mz = mz / c - P[v * 3 + 2];
  conc[v] = (mx * N[v * 3] + my * N[v * 3 + 1] + mz * N[v * 3 + 2]) / CELL; // >0 — ложбинка
}
for (let it = 0; it < 3; it++) {
  const nc = new Float32Array(n);
  for (let v = 0; v < n; v++) {
    let s = conc[v] * 2, c = 2;
    for (let k = start[v]; k < start[v + 1]; k++) { s += conc[nb[k]]; c++; }
    nc[v] = s / c;
  }
  conc = nc;
}
const pos = Array.from(conc).filter((x) => x > 0).sort((a, b) => a - b);
const c95 = pos[Math.floor(pos.length * 0.95)] || 1;
const cn = Float32Array.from(conc, (x) => Math.max(0, x / c95));

// ---------- разметка по схеме + подгонка границ к ложбинкам ----------
// 1) у каждой вершины метка «по схеме»
const regions = [], keyId = new Map();
const rid = (g, key, color) => { let id = keyId.get(key); if (id === undefined) { id = regions.length; keyId.set(key, id); regions.push({ group: g, key, color }); } return id; };
const ruleR = new Int32Array(n);
for (let v = 0; v < n; v++) { const [g, k, c] = label(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); ruleR[v] = rid(g, k, c); }
// 2) расстояние до границы «по схеме»
const rd = new Float32Array(n).fill(1e9);
let fr = [];
for (let v = 0; v < n; v++) for (let k = start[v]; k < start[v + 1]; k++) if (ruleR[nb[k]] !== ruleR[v]) { rd[v] = 0; fr.push(v); break; }
for (let it = 0; it < 12 && fr.length; it++) {
  const next = [];
  for (const v of fr) for (let k = start[v]; k < start[v + 1]; k++) { const w = nb[k], d = rd[v] + dist3(v, w); if (d < rd[w]) { rd[w] = d; next.push(w); } }
  fr = next;
}
// 3) вершины дальше MARGIN от границы — опорные; полоса у границы заново «растекается»
//    и граница останавливается в ближайшей ложбинке модели
const MARGIN = +(process.argv[3] || 1.4); // см
const region = new Int32Array(n).fill(-1);
const cost = new Float64Array(n).fill(Infinity);
const heap = [];
const push = (c, v) => { heap.push([c, v]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
for (let v = 0; v < n; v++) if (rd[v] >= MARGIN) { region[v] = ruleR[v]; cost[v] = 0; push(0, v); }
const GROOVE = 5;
while (heap.length) {
  const [c, v] = pop();
  if (c > cost[v]) continue;
  for (let k = start[v]; k < start[v + 1]; k++) {
    const w = nb[k];
    const g = 0.5 * (cn[v] + cn[w]);
    const nc = c + dist3(v, w) * (1 + GROOVE * Math.pow(Math.min(g, 3), 1.6));
    if (nc < cost[w]) { cost[w] = nc; region[w] = region[v]; push(nc, w); }
  }
}
for (let v = 0; v < n; v++) if (region[v] < 0) region[v] = ruleR[v];
// 4) сглаживание «зубчиков»: вершина берёт метку большинства соседей (2 прохода)
for (let it = 0; it < 12; it++) {
  const nr = region.slice();
  for (let v = 0; v < n; v++) {
    const cnt = new Map(); let best = region[v], bc = 0;
    for (let k = start[v]; k < start[v + 1]; k++) { const r = region[nb[k]]; const c = (cnt.get(r) || 0) + 1; cnt.set(r, c); if (c > bc) { bc = c; best = r; } }
    if (bc > (start[v + 1] - start[v]) * 0.5) nr[v] = best;
  }
  region.set(nr);
}
{
  const comp = new Int32Array(n).fill(-1);
  let fixed = 0;
  for (let v0 = 0; v0 < n; v0++) {
    if (comp[v0] >= 0) continue;
    const list = [v0]; comp[v0] = v0;
    for (let q = 0; q < list.length; q++) {
      const v = list[q];
      for (let k = start[v]; k < start[v + 1]; k++) { const w = nb[k]; if (comp[w] < 0 && region[w] === region[v0]) { comp[w] = v0; list.push(w); } }
    }
    if (list.length >= 120) continue;
    const cnt = new Map();
    for (const v of list) for (let k = start[v]; k < start[v + 1]; k++) { const r = region[nb[k]]; if (r !== region[v0]) cnt.set(r, (cnt.get(r) || 0) + 1); }
    let best = -1, bc = 0;
    cnt.forEach((c, r) => { if (c > bc) { bc = c; best = r; } });
    if (best >= 0) { for (const v of list) region[v] = best; fixed++; }
  }
  console.log('убрано островков:', fixed);
}

// ---------- линии: граница зон + мягкий край ----------
const isEdge = new Uint8Array(n);
for (let v = 0; v < n; v++) for (let k = start[v]; k < start[v + 1]; k++) if (region[nb[k]] !== region[v]) { isEdge[v] = 1; break; }
const ed = new Float32Array(n).fill(1e9);
let front = [];
for (let v = 0; v < n; v++) if (isEdge[v]) { ed[v] = 0; front.push(v); }
for (let it = 0; it < 10 && front.length; it++) {
  const next = [];
  for (const v of front) for (let k = start[v]; k < start[v + 1]; k++) {
    const w = nb[k], d = ed[v] + dist3(v, w);
    if (d < ed[w]) { ed[w] = d; next.push(w); }
  }
  front = next;
}
// внутренние линии (между частями одной мышцы) — отдельный признак, чтобы рисовать их светлее
const bfs = (seed) => {
  const d = new Float32Array(n).fill(1e9); let fr2 = [];
  for (let v = 0; v < n; v++) if (seed[v]) { d[v] = 0; fr2.push(v); }
  for (let it = 0; it < 10 && fr2.length; it++) {
    const nx = [];
    for (const v of fr2) for (let k = start[v]; k < start[v + 1]; k++) { const w = nb[k], dd = d[v] + dist3(v, w); if (dd < d[w]) { d[w] = dd; nx.push(w); } }
    fr2 = nx;
  }
  return d;
};
const seedE = new Uint8Array(n), seedI = new Uint8Array(n);
for (let v = 0; v < n; v++) for (let k = start[v]; k < start[v + 1]; k++) {
  const r = region[nb[k]]; if (r === region[v]) continue;
  if ((regions[r] || {}).group === (regions[region[v]] || {}).group) seedI[v] = 1; else seedE[v] = 1;
}
const dE = bfs(seedE), dI = bfs(seedI);
let innerF = Float32Array.from({ length: n }, (_, v) => (dI[v] < dE[v] ? 1 : 0));
for (let it = 0; it < 3; it++) {
  const nf = new Float32Array(n);
  for (let v = 0; v < n; v++) { let s2 = innerF[v] * 2, c = 2; for (let k = start[v]; k < start[v + 1]; k++) { s2 += innerF[nb[k]]; c++; } nf[v] = s2 / c; }
  innerF = nf;
}
const lineB = new Uint8Array(n), lineG = new Uint8Array(n);
// плавная линия: гладкое расстояние до границы (ed уже посчитано по поверхности), затем
// сглаживаем поле — в шейдере линия = ровная полоса вокруг границы
let fd = Float32Array.from(ed, (d) => Math.min(d, CELL * 4));
for (let it = 0; it < 3; it++) {
  const nf = new Float32Array(n);
  for (let v = 0; v < n; v++) {
    let s2 = fd[v] * 2, c = 2;
    for (let k = start[v]; k < start[v + 1]; k++) { s2 += fd[nb[k]]; c++; }
    nf[v] = s2 / c;
  }
  fd = nf;
}
for (let v = 0; v < n; v++) {
  lineB[v] = Math.round(255 * Math.max(0, 1 - fd[v] / (CELL * 4)));   // 1 — на границе, 0 — далеко
  lineG[v] = Math.round(255 * Math.min(1, cn[v] / 3));
}

// ---------- мягче рельеф: сглаживание Таубина ----------
const SMOOTH = +(process.argv[4] || 10);
{
  const tmp = new Float32Array(P.length);
  const step = (lam) => {
    for (let v = 0; v < n; v++) {
      let mx = 0, my = 0, mz = 0, c = 0;
      for (let k = start[v]; k < start[v + 1]; k++) { const w = nb[k]; mx += P[w * 3]; my += P[w * 3 + 1]; mz += P[w * 3 + 2]; c++; }
      if (!c) { tmp[v * 3] = P[v * 3]; tmp[v * 3 + 1] = P[v * 3 + 1]; tmp[v * 3 + 2] = P[v * 3 + 2]; continue; }
      tmp[v * 3] = P[v * 3] + lam * (mx / c - P[v * 3]);
      tmp[v * 3 + 1] = P[v * 3 + 1] + lam * (my / c - P[v * 3 + 1]);
      tmp[v * 3 + 2] = P[v * 3 + 2] + lam * (mz / c - P[v * 3 + 2]);
    }
    P.set(tmp);
  };
  for (let it = 0; it < SMOOTH; it++) { step(0.5); step(-0.53); }
}

// ---------- шея уже (сужаем верх шеи модели к её оси) ----------
for (let v = 0; v < n; v++) {
  const y = P[v * 3 + 1];
  if (y < 162) continue;
  const t = Math.min(1, (y - 162) / 9), f = 1 - 0.17 * t * t * (3 - 2 * t);
  P[v * 3] *= f;
  P[v * 3 + 2] = -3.4 + (P[v * 3 + 2] + 3.4) * f;
}

// ---------- масштаб в метры, обрезка шеи, голова ----------
const FOOT = 1.7, NECK_TOP = 179.4;
const S = 1.8 / (NECK_TOP + 23.2 - FOOT);
const TALL = 1.075; // тело выше
const WIDE = 1.05;  // и чуть крупнее (шире/толще)
for (let v = 0; v < n; v++) { P[v * 3] *= S * WIDE; P[v * 3 + 1] = (P[v * 3 + 1] - FOOT) * S * TALL; P[v * 3 + 2] *= S * WIDE; }
const yCut = (171 - FOOT) * S * TALL;           // здесь шея модели заменяется нашей
const ncz = -3.4 * S * WIDE, nrx = 7.0 * S * 0.83 * WIDE, nrz = 6.3 * S * 0.83 * WIDE;
// убираем верх шеи модели
const keepT = [];
for (let t = 0; t < I.length; t += 3) {
  const a = I[t], b = I[t + 1], c = I[t + 2];
  if (Math.max(P[a * 3 + 1], P[b * 3 + 1], P[c * 3 + 1]) > yCut + 0.002) continue;
  keepT.push(a, b, c);
}

// разворачиваем перевёрнутые треугольники (после упрощения) — иначе сквозь них видны чёрные «точки» контура
{
  const VN = new Float32Array(P.length);
  const fn = (t) => { const a = keepT[t] * 3, b = keepT[t + 1] * 3, c = keepT[t + 2] * 3;
    const ux = P[b] - P[a], uy = P[b + 1] - P[a + 1], uz = P[b + 2] - P[a + 2], vx = P[c] - P[a], vy = P[c + 1] - P[a + 1], vz = P[c + 2] - P[a + 2];
    return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx]; };
  for (let t = 0; t < keepT.length; t += 3) { const f = fn(t); for (const v of [keepT[t], keepT[t + 1], keepT[t + 2]]) { VN[v * 3] += f[0]; VN[v * 3 + 1] += f[1]; VN[v * 3 + 2] += f[2]; } }
  let flipped = 0;
  for (let t = 0; t < keepT.length; t += 3) {
    const f = fn(t); let d = 0;
    for (const v of [keepT[t], keepT[t + 1], keepT[t + 2]]) d += f[0] * VN[v * 3] + f[1] * VN[v * 3 + 1] + f[2] * VN[v * 3 + 2];
    if (d < 0) { const tmp = keepT[t + 1]; keepT[t + 1] = keepT[t + 2]; keepT[t + 2] = tmp; flipped++; }
  }
  console.log('развёрнуто треугольников:', flipped);
}

const prims = [];
const add = (part, prim, { mirror = false, k = 0.03, sub = false } = {}) => {
  prims.push({ ...prim, part, k, sub });
  if (mirror) {
    const m = prim.type === 'c' ? cone([-prim.a[0], prim.a[1], prim.a[2]], [-prim.b[0], prim.b[1], prim.b[2]], prim.r1, prim.r2) : ellipsoid([-prim.c[0], prim.c[1], prim.c[2]], prim.r);
    prims.push({ ...m, part, k, sub });
  }
};
function hy0() { return yCut + 0.045; }
// шея: эллипс, совпадающий с сечением шеи модели в месте стыка, сужается кверху
add('neck', ellipsoid([0, yCut - 0.005, ncz], [nrx * 0.995, 0.06, nrz * 0.995], [-0.12, 0, 0]), { k: 0.02 }); // «воротник» по сечению шеи модели, сужается кверху
// шея — ровный столбик с лёгким наклоном вперёд, плавно уходит под череп
add('neck', cone([0, yCut + 0.006, ncz - 0.002], [0, hy0() + 0.075, -0.024], 0.046, 0.036), { k: 0.04 });
// голова как у персонажа на схеме: круглый череп, широкая челюсть, уши, лицо без черт
const hy = hy0();  // уровень подбородка
add('head', ellipsoid([0, hy + 0.138, -0.014], [0.078, 0.088, 0.09]), { k: 0.03 });       // череп (гладкий, как у манекена)
add('head', ellipsoid([0, hy + 0.092, 0.012], [0.07, 0.082, 0.072]), { k: 0.045 });       // лицо
add('head', ellipsoid([0, hy + 0.04, 0.006], [0.062, 0.048, 0.06]), { k: 0.05 });         // широкая челюсть
add('head', ellipsoid([0, hy + 0.012, 0.036], [0.03, 0.022, 0.026]), { k: 0.04 });        // подбородок
add('head', ellipsoid([0.054, hy + 0.032, -0.014], [0.015, 0.02, 0.026], [0, 0.3, 0]), { mirror: true, k: 0.018 }); // углы челюсти
add('head', cone([0.054, hy + 0.026, -0.016], [0.015, hy + 0.004, 0.038], 0.011, 0.011), { mirror: true, k: 0.02 }); // чёткая линия челюсти
// затылок: череп мягко сливается со столбиком шеи — без горба
// лицо как у манекена: гладкое, без черт
// рельеф шеи: грудино-ключично-сосцевидные мышцы — от-за ушей к яремной ямке (та же группа «шея»)
const SCM_A = [0.05, hy + 0.07, -0.028], SCM_B = [0.022, yCut + 0.022, 0.012];
add('neckm', cone(SCM_A, SCM_B, 0.009, 0.005), { mirror: true, k: 0.016 });

// причёски нет — голова гладкая, как у манекена

const hf = makeField(prims);
const hm = polygonize(hf, { min: [-0.16, yCut - 0.03, -0.19], max: [0.16, 2.1, 0.16], h: 0.0022 });
const hp = hm.positions, hi = hm.indices;
const map = new Int32Array(hp.length / 3).fill(-1), HP = [], HI = [], HK = [];
for (let t = 0; t < hi.length; t += 3) {
  const a = hi[t], b = hi[t + 1], c = hi[t + 2];
  if (Math.min(hp[a * 3 + 1], hp[b * 3 + 1], hp[c * 3 + 1]) < yCut - 0.008) continue; // низ шеи прячется внутрь тела
  for (const v of [a, b, c]) {
    if (map[v] < 0) {
      map[v] = HP.length / 3;
      HP.push(hp[v * 3], hp[v * 3 + 1], hp[v * 3 + 2]);
      const inf = hf(hp[v * 3], hp[v * 3 + 1], hp[v * 3 + 2], true);
      HK.push(inf.prim && inf.prim.part === 'hair' ? 'hair' : 'base');
    }
    HI.push(map[v]);
  }
}

// ---------- запись ----------
const GROUPS = ['base', 'neck', 'chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'abs', 'obliques', 'traps', 'lats', 'lowerback', 'glutes', 'quads', 'hamstrings', 'adductors', 'calves'];
const COLORS = ['base', 'hair', 'neck', 'chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'forearmsO', 'forearmsI', 'abs', 'obliques', 'traps', 'lats', 'teres', 'lowerback', 'glutes', 'quads', 'hamstrings', 'adductors', 'adductorsB', 'calves', 'tibialis'];
const nh = HP.length / 3, total = n + nh;
const posOut = new Float32Array(total * 3); posOut.set(P); posOut.set(HP, n * 3);
const idxOut = new Uint32Array(keepT.length + HI.length); idxOut.set(keepT); for (let i = 0; i < HI.length; i++) idxOut[keepT.length + i] = HI[i] + n;
const gArr = new Uint8Array(total), cArr = new Uint8Array(total), lArr = new Uint8Array(total), gvArr = new Uint8Array(total), inArr = new Uint8Array(total);
for (let v = 0; v < n; v++) {
  const r = regions[region[v]] || { group: 'base', color: 'base' };
  gArr[v] = GROUPS.indexOf(r.group); cArr[v] = COLORS.indexOf(r.color); lArr[v] = lineB[v]; gvArr[v] = lineG[v]; inArr[v] = Math.round(255 * innerF[v]);
}
for (let v = 0; v < nh; v++) { gArr[n + v] = 0; cArr[n + v] = COLORS.indexOf(HK[v]); }
{
  const hairP = prims.filter((q) => q.part === 'hair'), headP = prims.filter((q) => q.part !== 'hair');
  const neckP = prims.filter((q) => q.part === 'neck' || q.part === 'neckm'), scmP = prims.filter((q) => q.part === 'neckm'), neckO = prims.filter((q) => q.part === 'neck'), faceP = prims.filter((q) => q.part === 'head');
  for (let v = 0; v < nh; v++) {
    const x = HP[v * 3], y = HP[v * 3 + 1], z = HP[v * 3 + 2];
    let dH = 1, dB = 1;
    const ds = new Map();
    for (const q of hairP) {
      const d = dist(q, x, y, z);
      if (d < dH) dH = d;
      if (q.strand !== undefined) ds.set(q.strand, Math.min(ds.get(q.strand) ?? 1, d));
    }
    for (const q of headP) { const d = dist(q, x, y, z); if (d < dB) dB = d; }
    let line = Math.max(0, 1 - Math.abs(dH - dB) / 0.0028);                 // линия роста волос
    let inner = 0;
    if (dH < dB && ds.size > 1) {                                          // линии между прядями
      const arr = [...ds.values()].sort((a, b) => a - b);
      if (arr[0] < 0.004) { const li = Math.max(0, 1 - (arr[1] - arr[0]) / 0.0035); if (li > line) { line = li; inner = 1; } }
    }
    // шея — одна зона, к голове её присоединяет линия челюсти
    if (dH >= dB) {
      let dN = 1, dF = 1;
      for (const q of neckP) { const d = dist(q, x, y, z); if (d < dN) dN = d; }
      for (const q of faceP) { const d = dist(q, x, y, z); if (d < dF) dF = d; }
      if (dN < dF) { gArr[n + v] = GROUPS.indexOf('neck'); cArr[n + v] = COLORS.indexOf('neck'); }
      if (z > -0.035 && y < hy + 0.055) line = Math.max(line, Math.max(0, 1 - Math.abs(dN - dF) / 0.0028));
      // рельеф шеи: V-линии от-за ушей к яремной ямке (продолжают линии на теле)
      if (dN < dF && z > -0.01) {
        const vx = 0.025 + (y - yCut) * 0.35;
        const li = Math.max(0, 1 - Math.abs(Math.abs(x) - vx) / 0.0075); if (li > line) { line = li; inner = 1; }
      }
    }
    lArr[n + v] = Math.round(255 * line); inArr[n + v] = inner * 255;
  }
}

const header = { vertices: total, indices: idxOut.length, groups: GROUPS, colors: COLORS, height: 1.8, version: 2,
  credit: 'Male body — Chin Eeyang (sketchfab.com/chinyang1607), CC BY 4.0. Голова, разметка мышц и упрощение — Kosmic.' };
const parts = [posOut, idxOut, gArr, cArr, lArr, gvArr, inArr];
const offsets = []; let off = 0;
for (const a of parts) { offsets.push(off); off += a.byteLength; off = Math.ceil(off / 4) * 4; }
const out = Buffer.alloc(off);
parts.forEach((a, i) => Buffer.from(a.buffer, a.byteOffset, a.byteLength).copy(out, offsets[i]));
header.offsets = offsets;
writeFileSync(here('../model/body.bin'), out);
writeFileSync(here('../model/body.json'), JSON.stringify(header));
const cnt = {}; for (let v = 0; v < n; v++) { const g = GROUPS[gArr[v]]; cnt[g] = (cnt[g] || 0) + 1; }
console.log('записано:', (out.length / 1048576).toFixed(1), 'МБ,', total, 'вершин за', ((Date.now() - t0) / 1000).toFixed(1), 'с');
console.log(JSON.stringify(cnt));

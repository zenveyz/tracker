// Генератор «скульптурного» 3D-тела.
// Тело описано набором примитивов (эллипсоиды и конусы со скруглением) как поле расстояний (SDF).
// Примитивы плавно сливаются в одну поверхность; на границах групп мышц прорезаются бороздки.
// Поверхность строится алгоритмом Surface Nets.

// ---------- SDF-примитивы ----------
function rotMat(rx = 0, ry = 0, rz = 0) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  // R = Rz * Ry * Rx; храним обратную (транспонированную)
  const m = [
    cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx,
    sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx,
    -sy, cy * sx, cy * cx,
  ];
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]];
}

export function ellipsoid(c, r, rot = [0, 0, 0]) {
  const R = rotMat(...rot);
  const ext = Math.max(...r) + 0.03;
  return {
    type: 'e', c, r, R,
    box: [c[0] - ext, c[0] + ext, c[1] - ext, c[1] + ext, c[2] - ext, c[2] + ext],
  };
}
export function cone(a, b, r1, r2) {
  const ext = Math.max(r1, r2) + 0.03;
  return {
    type: 'c', a, b, r1, r2,
    box: [Math.min(a[0], b[0]) - ext, Math.max(a[0], b[0]) + ext, Math.min(a[1], b[1]) - ext, Math.max(a[1], b[1]) + ext, Math.min(a[2], b[2]) - ext, Math.max(a[2], b[2]) + ext],
  };
}

function sdEllipsoid(P, px, py, pz) {
  let x = px - P.c[0], y = py - P.c[1], z = pz - P.c[2];
  const R = P.R;
  const lx = R[0] * x + R[1] * y + R[2] * z, ly = R[3] * x + R[4] * y + R[5] * z, lz = R[6] * x + R[7] * y + R[8] * z;
  const a = lx / P.r[0], b = ly / P.r[1], c = lz / P.r[2];
  const k0 = Math.sqrt(a * a + b * b + c * c);
  const a2 = lx / (P.r[0] * P.r[0]), b2 = ly / (P.r[1] * P.r[1]), c2 = lz / (P.r[2] * P.r[2]);
  const k1 = Math.sqrt(a2 * a2 + b2 * b2 + c2 * c2) || 1e-6;
  return (k0 * (k0 - 1)) / k1;
}
// конус со скруглёнными концами (round cone, формула Иниго Килеса)
function sdCone(P, px, py, pz) {
  const ax = P.a[0], ay = P.a[1], az = P.a[2];
  const bax = P.b[0] - ax, bay = P.b[1] - ay, baz = P.b[2] - az;
  const pax = px - ax, pay = py - ay, paz = pz - az;
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = P.r1 - P.r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const y = pax * bax + pay * bay + paz * baz, z = y - l2;
  const xx = pax * l2 - bax * y, xy = pay * l2 - bay * y, xz = paz * l2 - baz * y;
  const x2 = xx * xx + xy * xy + xz * xz, y2 = y * y * l2, z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - P.r2;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - P.r1;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - P.r1;
}
export const dist = (P, x, y, z) => (P.type === 'e' ? sdEllipsoid(P, x, y, z) : sdCone(P, x, y, z));

function smin(a, b, k) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

// ---------- описание тела ----------
// part — часть тела (для разметки мышц), форма задаётся примитивами
export function buildBodyDef() {
  const prims = [];
  const add = (part, prim, { mirror = true, k = 0.03, sub = false } = {}) => {
    prims.push({ ...prim, part, k, sub });
    if (mirror) prims.push({ ...mirrorPrim(prim), part, k, sub });
  };

  // голова, шея, волосы
  // голова: гладкая, без черт лица — как на схеме
  add('head', ellipsoid([0, 1.682, -0.006], [0.075, 0.095, 0.092]), { mirror: false, k: 0.02 });
  add('head', ellipsoid([0, 1.632, 0.022], [0.058, 0.074, 0.07]), { mirror: false, k: 0.04 });
  add('head', ellipsoid([0, 1.572, 0.04], [0.04, 0.034, 0.05]), { mirror: false, k: 0.04 });                      // подбородок, плавно
  // торчащие вверх пряди
  [[0, 0.01, 0.86], [0.03, 0.02, 0.84], [-0.03, 0.022, 0.845], [0.055, 0.0, 0.825], [-0.055, 0.005, 0.83], [0.015, -0.025, 0.85], [-0.018, -0.03, 0.845],
   [0.045, -0.04, 0.825], [-0.045, -0.042, 0.82], [0, -0.06, 0.835], [0.028, 0.045, 0.82], [-0.028, 0.048, 0.815], [0, 0.05, 0.83]]
    .forEach(([x, z, ty]) => add('hair', cone([x * 0.9, 1.74, z * 0.9 - 0.008], [x * 1.45, 1.0 + ty, z * 1.2 - 0.022], 0.024, 0.0025), { mirror: false, k: 0.014 }));
  add('neck', cone([0, 1.46, -0.012], [0, 1.6, 0.0], 0.058, 0.05), { mirror: false, k: 0.04 });
  // торс
  add('torso', ellipsoid([0, 1.31, -0.008], [0.166, 0.175, 0.106]), { mirror: false, k: 0.05 });
  add('torso', ellipsoid([0, 1.1, 0.0], [0.118, 0.15, 0.086]), { mirror: false, k: 0.05 });
  add('torso', ellipsoid([0, 0.955, -0.01], [0.134, 0.1, 0.096]), { mirror: false, k: 0.05 });
  // руки
  add('uarm', cone([0.194, 1.372, -0.012], [0.243, 1.12, -0.026], 0.052, 0.04));
  add('farm', cone([0.243, 1.12, -0.026], [0.284, 0.875, 0.012], 0.041, 0.026));
  add('hand', ellipsoid([0.294, 0.808, 0.02], [0.026, 0.06, 0.048], [0, 0, 0.12]), { k: 0.02 });
  [[-0.01, 0.07], [0.01, 0.078], [0.03, 0.074], [0.049, 0.062]].forEach(([dz, len]) =>
    add('hand', cone([0.299, 0.762, 0.0 + dz], [0.31, 0.762 - len, 0.002 + dz * 1.3], 0.0098, 0.0072), { k: 0.008 }));
  add('hand', cone([0.284, 0.81, 0.056], [0.28, 0.76, 0.084], 0.0115, 0.0085), { k: 0.01 });
  // ноги
  add('thigh', cone([0.088, 0.9, 0.0], [0.102, 0.5, 0.008], 0.08, 0.05), { k: 0.04 });
  add('thigh', ellipsoid([0.056, 0.79, 0.004], [0.04, 0.13, 0.05]), { k: 0.04 });
  add('shin', cone([0.104, 0.5, 0.008], [0.105, 0.085, -0.014], 0.05, 0.029));
  add('knee', ellipsoid([0.104, 0.5, 0.042], [0.034, 0.038, 0.026]), { k: 0.02 });
  add('foot', ellipsoid([0.106, 0.034, 0.046], [0.042, 0.032, 0.112]), { k: 0.03 });

  // рельеф мышц (только форма; разметка — по линиям схемы)
  add('torso', ellipsoid([0.08, 1.338, 0.068], [0.095, 0.066, 0.045], [0.08, 0.32, -0.1]), { k: 0.03 }); // грудь
  add('uarm', ellipsoid([0.192, 1.345, -0.006], [0.05, 0.074, 0.052], [0, 0, -0.36]), { k: 0.05 });    // дельты
  add('uarm', ellipsoid([0.219, 1.242, 0.022], [0.04, 0.088, 0.04], [0.1, 0, 0.19]), { k: 0.02 });     // бицепс
  add('uarm', ellipsoid([0.222, 1.252, -0.04], [0.043, 0.094, 0.04], [-0.1, 0, 0.19]), { k: 0.02 });   // трицепс
  add('farm', ellipsoid([0.256, 1.03, 0.006], [0.041, 0.095, 0.038], [0, 0, 0.16]), { k: 0.02 });      // предплечье
  [1.21, 1.14, 1.07].forEach((y) => add('torso', ellipsoid([0.03, y, 0.062 - (1.21 - y) * 0.03], [0.03, 0.034, 0.02], [0, 0.18, 0]), { k: 0.022 }));
  add('torso', ellipsoid([0.026, 0.995, 0.06], [0.027, 0.046, 0.018], [0, 0.12, 0]), { k: 0.022 });
  add('torso', ellipsoid([0.075, 1.445, -0.03], [0.085, 0.032, 0.046], [0, 0, -0.5]), { k: 0.035 });  // трапеции
  add('torso', ellipsoid([0.04, 1.36, -0.08], [0.056, 0.12, 0.024], [0.05, -0.2, 0.12]), { k: 0.03 });
  add('torso', ellipsoid([0.033, 1.06, -0.074], [0.027, 0.09, 0.024]), { k: 0.025 });                   // поясница
  add('torso', ellipsoid([0.07, 0.925, -0.06], [0.072, 0.084, 0.056], [0, 0.15, 0]), { k: 0.03 });      // ягодицы
  add('thigh', ellipsoid([0.124, 0.72, 0.014], [0.046, 0.165, 0.05], [0, 0, 0.03]), { k: 0.025 });
  add('thigh', ellipsoid([0.09, 0.71, 0.034], [0.046, 0.175, 0.05], [0, 0, -0.04]), { k: 0.025 });
  add('thigh', ellipsoid([0.08, 0.575, 0.032], [0.034, 0.06, 0.036]), { k: 0.02 });
  add('thigh', ellipsoid([0.1, 0.72, -0.038], [0.06, 0.17, 0.044]), { k: 0.025 });
  add('shin', ellipsoid([0.09, 0.365, -0.03], [0.037, 0.098, 0.042]), { k: 0.02 });
  add('shin', ellipsoid([0.12, 0.375, -0.026], [0.033, 0.088, 0.038]), { k: 0.02 });
  add('shin', ellipsoid([0.115, 0.3, 0.026], [0.02, 0.12, 0.022]), { k: 0.02 });

  prims.forEach((p, i) => { p.id = i; });
  return prims;
}

function mirrorPrim(p) {
  if (p.type === 'c') return cone([-p.a[0], p.a[1], p.a[2]], [-p.b[0], p.b[1], p.b[2]], p.r1, p.r2);
  const m = ellipsoid([-p.c[0], p.c[1], p.c[2]], p.r, [0, 0, 0]);
  m.R = [p.R[0], -p.R[1], -p.R[2], -p.R[3], p.R[4], p.R[5], -p.R[6], p.R[7], p.R[8]];
  return m;
}

// ---------- поле расстояний ----------
export function makeField(prims) {
  const SLAB = 0.04, NS = Math.ceil(2.4 / SLAB);
  const slabs = Array.from({ length: NS }, () => []);
  prims.forEach((p) => {
    const a = Math.max(0, Math.floor(p.box[2] / SLAB)), b = Math.min(NS - 1, Math.floor(p.box[3] / SLAB));
    for (let s = a; s <= b; s++) slabs[s].push(p);
  });
  const near = (y) => slabs[Math.min(NS - 1, Math.max(0, Math.floor(y / SLAB)))];
  function field(x, y, z, info) {
    const list = near(y);
    let d = 1, best = null, bestD = 1;
    for (let i = 0; i < list.length; i++) {
      const p = list[i], b = p.box;
      if (x < b[0] || x > b[1] || y < b[2] || y > b[3] || z < b[4] || z > b[5]) continue;
      const di = dist(p, x, y, z);
      if (p.sub) { d = -smin(-d, di, p.k); continue; } // плавное вычитание
      d = d === 1 ? di : smin(d, di, p.k);
      if (di < bestD) { bestD = di; best = p; }
    }
    return info ? { d, prim: best } : d;
  }
  return field;
}

// ---------- разметка мышц по схеме ----------
const UA = [[0.194, 1.372, -0.012], [0.243, 1.12, -0.026]];
const FA = [[0.243, 1.12, -0.026], [0.284, 0.875, 0.012]];
const TH = [[0.088, 0.9, 0.0], [0.102, 0.5, 0.008]];
const SH = [[0.104, 0.5, 0.008], [0.105, 0.085, -0.014]];
function seg(p, [a, b]) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const px = p[0] - a[0], py = p[1] - a[1], pz = p[2] - a[2];
  let t = (px * bx + py * by + pz * bz) / (bx * bx + by * by + bz * bz);
  t = Math.max(0, Math.min(1, t));
  return { t, d: [px - bx * t, py - by * t, pz - bz * t] };
}

// возвращает [группа для выбора, ключ участка (для линий), ключ цвета]
// Каждая мышца — отдельная фигура (овал, капля, ромб) в координатах части тела:
// для рук и ног — угол вокруг оси (0 — спереди, + — наружу) и доля длины t,
// для торса — проекция спереди/сзади.
const PI = Math.PI;
const wrap = (a) => { while (a > PI) a -= 2 * PI; while (a < -PI) a += 2 * PI; return a; };
// «суперэллипс»: p=2 — овал, p<2 — заострённый, p>2 — скруглённый прямоугольник
const blob = (u, v, cu, cv, ru, rv, p = 2) => Math.pow(Math.abs((u - cu) / ru), p) + Math.pow(Math.abs((v - cv) / rv), p) < 1;

export function label(x, y, z, part) {
  const ax = Math.abs(x), s = x >= 0 ? 'R' : 'L';
  const P = [ax, y, z];
  const M = (g, sub = '', color = g) => [g, `${g}:${s}:${sub}`, color];
  const B = (sub, sided = true) => ['base', sided ? `base:${s}:${sub}` : `base:${sub}`, 'base'];
  const glute = () => z < -0.01 && blob(ax, y, 0.074, 0.905, 0.084, 0.09, 2.6);

  switch (part) {
    case 'uarm': {
      const { t, d } = seg(P, UA);
      const th = Math.atan2(d[0], d[2]);
      const dO = Math.abs(wrap(th - PI / 2));                 // угол от наружной стороны
      const tMax = 0.52 - 0.24 * Math.pow(dO / 1.9, 1.25);    // дельта спускается «клином» снаружи
      if (dO < 2.15 && t < tMax) return M('shoulders');
      if (blob(th, t, 0.1, 0.6, 1.05, 0.4, 2.2)) return M('biceps');
      if (blob(wrap(th - PI), t, -0.1, 0.6, 1.3, 0.42, 2.2)) return M('triceps');
      return B('arm');
    }
    case 'farm': {
      const { t, d } = seg(P, FA);
      const th = Math.atan2(d[0], d[2]);
      if (t < 0.9 && blob(th, t, 1.25, 0.36, 1.25, 0.48, 2)) return M('forearms', 'o', 'forearmsO');
      if (t < 0.9 && blob(th, t, -1.0, 0.34, 1.45, 0.46, 2)) return M('forearms', 'i', 'forearmsI');
      return B(t > 0.88 ? 'hand' : 'farm');
    }
    case 'thigh': {
      const { t, d } = seg(P, TH);
      const th = Math.atan2(d[0], d[2]);
      const ph = wrap(th - PI);
      if (glute()) return M('glutes');
      if (y > 0.86 && ax < 0.06 && z > -0.01) return B('groin', false);
      // спереди
      if (blob(th, t, 0.05, 0.47, 0.5, 0.52, 1.6)) return M('quads', 'rf');
      if (blob(th, t, 0.95, 0.5, 0.72, 0.46, 2)) return M('quads', 'vl');
      if (blob(th, t, -0.55, 0.72, 0.48, 0.24, 2)) return M('quads', 'vm');
      if (blob(th, t, -1.2, 0.28, 0.72, 0.36, 2)) return M('adductors');
      // сзади
      if (blob(ph, t, -0.42, 0.52, 0.5, 0.4, 2)) return M('hamstrings', 'bf');
      if (blob(ph, t, 0.38, 0.52, 0.45, 0.4, 2)) return M('hamstrings', 'st');
      if (blob(ph, t, 1.2, 0.34, 0.5, 0.38, 2)) return M('adductors', 'b', 'adductorsB');
      return B(t > 0.85 ? 'legk' : 'thigh');
    }
    case 'shin': {
      const { t, d } = seg(P, SH);
      const th = Math.atan2(d[0], d[2]);
      const ph = wrap(th - PI);
      if (blob(ph, t, -0.45, 0.3, 0.62, 0.27, 1.7)) return M('calves', 'lat');
      if (blob(ph, t, 0.45, 0.33, 0.66, 0.3, 1.7)) return M('calves', 'med');
      if (blob(th, t, 0.42, 0.44, 0.4, 0.3, 2)) return M('calves', 'tib', 'tibialis');
      if (t < 0.06) return B('legk');
      if (t > 0.86) return B('ankle');
      return B(Math.abs(th) < PI / 2 ? 'shinF' : 'shinB');
    }
    case 'torso': {
      const front = z > -0.01;
      if (front) {
        const k = Math.min(ax, 0.17) / 0.17;
        const yt = 1.448 - 0.09 * Math.pow(k, 1.5);                                  // ключица → подмышка
        const yb = 1.255 + 0.03 * k * k - 0.032 * Math.sin(PI * k);                  // нижний край груди дугой
        if (ax > 0.003 && ax < 0.172 && y < yt && y > yb) return M('chest');
        if (y >= yt && y < 1.48 - (ax - 0.03) * 0.55 && ax > 0.03 && ax < 0.17) return M('traps', 'f');
        if (y > 1.47) return B(ax < 0.022 ? 'neckc' : 'neck', ax >= 0.022);
        const absW = 0.056 - 0.012 * Math.max(0, (1.04 - y) / 0.1);
        const vLine = 0.915 + ax * 0.85;
        if (ax < absW && y < 1.25 && y > Math.max(0.93, vLine - 0.01)) {
          const centers = [1.212, 1.142, 1.072, 0.99];
          let band = 0;
          centers.forEach((c, i) => { if (Math.abs(y - c) < Math.abs(y - centers[band])) band = i; });
          return M('abs', String(band));
        }
        if (y > vLine && y < yb && ax < 0.175) return M('obliques');
        return B('groin', false);
      }
      // спина
      if (y > 1.45 && ax < 0.07) return M('traps');
      if (y > 1.3 + ax * 0.55) return M('traps');
      if (y > 1.12 && ax < 0.085 * (y - 1.12) / 0.19) return M('traps');
      if (blob(ax, y, 0.126, 1.275, 0.044, 0.03, 2)) return M('lats', 't', 'teres');
      if (ax / 0.07 + Math.abs(y - 1.04) / 0.09 < 1) return M('lowerback');
      if (glute()) return M('glutes');
      if (y > 0.995 + Math.max(0, 0.13 - ax) * 0.25 && ax < 0.178) return M('lats');
      return B('back', false);
    }
    case 'neck': return z > 0.0 && Math.abs(x) < 0.022 ? B('neckc', false) : B('neck');
    case 'head': return B('head', false);
    case 'knee': return B('knee');
    case 'foot': return B('foot');
    case 'hand': return B('hand');
    default: return ['base', 'base', 'base'];
  }
}

// ---------- Surface Nets ----------
export function polygonize(field, { min = [-0.36, -0.01, -0.19], max = [0.36, 1.83, 0.2], h = 0.0075 } = {}) {
  const nx = Math.ceil((max[0] - min[0]) / h) + 1, ny = Math.ceil((max[1] - min[1]) / h) + 1, nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const V = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) {
    const z = min[2] + k * h;
    for (let j = 0; j < ny; j++) {
      const y = min[1] + j * h;
      for (let i = 0; i < nx; i++) V[i + nx * (j + ny * k)] = field(min[0] + i * h, y, z, false);
    }
  }
  const cx = nx - 1, cy = ny - 1, cz = nz - 1;
  const cellIdx = new Int32Array(cx * cy * cz).fill(-1);
  const pos = [];
  const idx = [];
  const corner = new Float32Array(8);
  const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const CO = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const vi = (i, j, k) => i + nx * (j + ny * k);
  const ci = (i, j, k) => i + cx * (j + cy * k);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      const v = V[vi(i + CO[c][0], j + CO[c][1], k + CO[c][2])];
      corner[c] = v;
      if (v < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of EDGES) {
      const va = corner[a], vb = corner[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      sx += CO[a][0] + (CO[b][0] - CO[a][0]) * t;
      sy += CO[a][1] + (CO[b][1] - CO[a][1]) * t;
      sz += CO[a][2] + (CO[b][2] - CO[a][2]) * t;
      n++;
    }
    cellIdx[ci(i, j, k)] = pos.length / 3;
    pos.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h);
    const inside0 = mask & 1;
    if (((mask >> 1) & 1) !== inside0 && j > 0 && k > 0) quad(ci(i, j, k), ci(i, j - 1, k), ci(i, j - 1, k - 1), ci(i, j, k - 1), inside0);
    if (((mask >> 2) & 1) !== inside0 && k > 0 && i > 0) quad(ci(i, j, k), ci(i, j, k - 1), ci(i - 1, j, k - 1), ci(i - 1, j, k), inside0);
    if (((mask >> 4) & 1) !== inside0 && i > 0 && j > 0) quad(ci(i, j, k), ci(i - 1, j, k), ci(i - 1, j - 1, k), ci(i, j - 1, k), inside0);
  }
  function quad(a, b, c, d, flip) {
    const A = cellIdx[a], B = cellIdx[b], C = cellIdx[c], D = cellIdx[d];
    if (A < 0 || B < 0 || C < 0 || D < 0) return;
    if (flip) idx.push(A, B, C, A, C, D);
    else idx.push(A, D, C, A, C, B);
  }
  return { positions: new Float32Array(pos), indices: new Uint32Array(idx) };
}

// нормали, мышцы, линии границ
export function annotate(field, positions, indices) {
  const n = positions.length / 3;
  const normals = new Float32Array(n * 3);
  const groups = new Array(n), keys = new Array(n), colorKeys = new Array(n);
  const e = 0.0012;
  for (let v = 0; v < n; v++) {
    const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
    const gx = field(x + e, y, z) - field(x - e, y, z);
    const gy = field(x, y + e, z) - field(x, y - e, z);
    const gz = field(x, y, z + e) - field(x, y, z - e);
    const l = Math.hypot(gx, gy, gz) || 1;
    normals[v * 3] = gx / l; normals[v * 3 + 1] = gy / l; normals[v * 3 + 2] = gz / l;
    const inf = field(x, y, z, true);
    const part = inf.prim ? inf.prim.part : 'torso';
    const [g, k, c] = part === 'hair' ? ['base', 'hair', 'hair'] : label(x, y, z, part);
    groups[v] = g; keys[v] = k; colorKeys[v] = c;
  }
  // линии: проверяем участки вокруг точки по касательной — так граница получается гладкой
  const line = new Float32Array(n);
  const keyAt = (x, y, z) => {
    const inf = field(x, y, z, true);
    const part = inf.prim ? inf.prim.part : 'torso';
    return part === 'hair' ? 'hair' : label(x, y, z, part)[1];
  };
  const R1 = 0.0034, DIRS = 12;
  for (let v = 0; v < n; v++) {
    const x = positions[v * 3], y = positions[v * 3 + 1], z = positions[v * 3 + 2];
    const nx = normals[v * 3], ny = normals[v * 3 + 1], nz = normals[v * 3 + 2];
    // базис касательной плоскости
    let tx = -nz, ty = 0, tz = nx;
    if (Math.abs(ny) < 0.9) { tx = ny * 0 - nz * 1; ty = 0; tz = nx; }
    let tl = Math.hypot(tx, ty, tz);
    if (tl < 1e-4) { tx = 1; ty = 0; tz = 0; tl = 1; }
    tx /= tl; ty /= tl; tz /= tl;
    const bx = ny * tz - nz * ty, by = nz * tx - nx * tz, bz = nx * ty - ny * tx;
    let diff = 0;
    for (let j = 0; j < DIRS; j++) {
      const a2 = (j / DIRS) * Math.PI * 2, c = Math.cos(a2) * R1, s2 = Math.sin(a2) * R1;
      const k = keyAt(x + tx * c + bx * s2, y + ty * c + by * s2, z + tz * c + bz * s2);
      if (k !== keys[v]) diff++;
    }
    const t = Math.min(1, diff / (DIRS * 0.12));
    line[v] = t * t * (3 - 2 * t);
  }
  // ---- рельеф: каждая мышца — отдельная выпуклая «подушка» ----
  // расстояние по поверхности до ближайшей границы (обход графа сетки)
  const adj = Array.from({ length: n }, () => []);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    adj[a].push(b, c); adj[b].push(a, c); adj[c].push(a, b);
  }
  const distB = new Float32Array(n).fill(1e9);
  let queue = [];
  for (let v = 0; v < n; v++) if (line[v] > 0.5) { distB[v] = 0; queue.push(v); }
  const len = (a, b) => Math.hypot(positions[a * 3] - positions[b * 3], positions[a * 3 + 1] - positions[b * 3 + 1], positions[a * 3 + 2] - positions[b * 3 + 2]);
  for (let iter = 0; iter < 40 && queue.length; iter++) {
    const next = [];
    for (const v of queue) {
      for (const w of adj[v]) {
        const nd = distB[v] + len(v, w);
        if (nd < distB[w] - 1e-6) { distB[w] = nd; next.push(w); }
      }
    }
    queue = next;
  }
  const AMP = { chest: 0.0105, abs: 0.0075, shoulders: 0.0055, biceps: 0.009, triceps: 0.009, forearms: 0.0068, obliques: 0.0055,
    traps: 0.0075, lats: 0.0075, lowerback: 0.0055, glutes: 0.0105, quads: 0.009, hamstrings: 0.0085, adductors: 0.006, calves: 0.009 };
  for (let v = 0; v < n; v++) {
    const g = line[v];
    const amp = AMP[groups[v]] || 0;
    // мышца поднимается от края к центру, у границы — вдавленная бороздка
    const lift = amp * (1 - Math.exp(-Math.min(distB[v], 0.2) / 0.0085)) - 0.0022 * g;
    positions[v * 3] += normals[v * 3] * lift;
    positions[v * 3 + 1] += normals[v * 3 + 1] * lift;
    positions[v * 3 + 2] += normals[v * 3 + 2] * lift;
  }
  // нормали заново — по новой форме
  normals.fill(0);
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i] * 3, b = indices[i + 1] * 3, c = indices[i + 2] * 3;
    const ux = positions[b] - positions[a], uy = positions[b + 1] - positions[a + 1], uz = positions[b + 2] - positions[a + 2];
    const vx = positions[c] - positions[a], vy = positions[c + 1] - positions[a + 1], vz = positions[c + 2] - positions[a + 2];
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    for (const k of [a, b, c]) { normals[k] += nx; normals[k + 1] += ny; normals[k + 2] += nz; }
  }
  for (let v = 0; v < n; v++) {
    const l = Math.hypot(normals[v * 3], normals[v * 3 + 1], normals[v * 3 + 2]) || 1;
    normals[v * 3] /= l; normals[v * 3 + 1] /= l; normals[v * 3 + 2] /= l;
  }
  return { normals, groups, colorKeys, line };
}

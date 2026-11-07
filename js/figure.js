// Анимированные иллюстрации упражнений.
// Фигура человека строится по «скелету» (кинематика + IK для рук и ног),
// поза задаётся двумя ключевыми кадрами A → B, между ними плавная анимация.

const L = { T: 26, N: 3, HR: 6.4, UA: 15, FA: 14, TH: 20, SH: 19.5 };
const GROUND = 94;
const R = Math.PI / 180;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const f1 = (n) => Math.round(n * 10) / 10;

function ik(root, target, l1, l2, s) {
  const dx = target[0] - root[0], dy = target[1] - root[1];
  let d = Math.hypot(dx, dy) || 0.001;
  const max = l1 + l2 - 0.01, min = Math.abs(l1 - l2) + 0.5;
  let t = target;
  if (d > max) { t = [root[0] + (dx / d) * max, root[1] + (dy / d) * max]; d = max; }
  if (d < min) d = min;
  const base = Math.atan2(dy, dx);
  const a = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
  const ang = base - s * a;
  const j = [root[0] + Math.cos(ang) * l1, root[1] + Math.sin(ang) * l1];
  const ex = t[0] - j[0], ey = t[1] - j[1], el = Math.hypot(ex, ey) || 1;
  return [j, [j[0] + (ex / el) * l2, j[1] + (ey / el) * l2]];
}

// ---------- решение позы ----------
function solve(p) {
  const hip = p.hip;
  const t = p.sh ? Math.atan2(p.sh[0] - hip[0], -(p.sh[1] - hip[1])) / R : p.t || 0;
  const u = [Math.sin(t * R), -Math.cos(t * R)];
  const face = p.face || 1;
  const n = [Math.cos(t * R) * face, Math.sin(t * R) * face];
  const front = p.view === 'front';
  const sh = add(hip, mul(u, L.T - (front ? 0 : 0)));
  const ht = (p.head || 0) * R;
  const hd = [u[0] * Math.cos(ht) - u[1] * Math.sin(ht), u[0] * Math.sin(ht) + u[1] * Math.cos(ht)];
  const head = add(sh, mul(hd, L.N + L.HR));
  const neck = add(sh, mul(hd, L.N));
  const side = [Math.cos(t * R), Math.sin(t * R)];
  const shrug = p.shrug || 0;
  const pt = (s) => (s[0] === 't' ? add(add(sh, mul(u, s[1])), mul(n, s[2])) : s.map((v) => (Number.isFinite(v) ? v : 0)));
  const arms = [0, 1].map((i) => {
    const off = front ? (i === 0 ? -8 : 8) : 0;
    const root = add(add(sh, mul(side, off)), mul(u, shrug + (front ? -1.5 : 0)));
    const target = pt(p.hands[i]);
    const es = (p.es && p.es[i]) ?? (front ? (i === 0 ? 1 : -1) : -1);
    const [el, hd2] = ik(root, target, L.UA, L.FA, es);
    return { root, el, hd: hd2 };
  });
  const legs = [0, 1].map((i) => {
    const off = front ? (i === 0 ? -5 : 5) : 0;
    const root = add(hip, mul(side, off));
    const target = pt(p.feet[i]);
    const ks = (p.ks && p.ks[i]) ?? (front ? (i === 0 ? -1 : 1) : 1);
    const [kn, an] = ik(root, target, L.TH, L.SH, ks);
    // направление стопы: из шаблона или (по умолчанию) вычисляется по сгибу колена при отрисовке
    const toeDir = p.toe ? p.toe[i] : null;
    return { root, kn, an, toeDir };
  });
  return { hip, sh, u, n, t, head, neck, arms, legs, front, side };
}

// куда смотрит лицо (перпендикуляр к оси головы, в сторону взгляда)
function headFace(J) {
  const up = [J.head[0] - J.neck[0], J.head[1] - J.neck[1]], l = Math.hypot(up[0], up[1]) || 1;
  const p = [-up[1] / l, up[0] / l];
  return p[0] * J.n[0] + p[1] * J.n[1] >= 0 ? p : [-p[0], -p[1]];
}

// ---------- интерполяция поз ----------
function lerp(a, b, k) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * k;
  if (Array.isArray(a)) return a.map((v, i) => lerp(v, b[i], k));
  if (a && typeof a === 'object') {
    const o = {};
    for (const key of Object.keys(a)) o[key] = b && key in b ? lerp(a[key], b[key], k) : a[key];
    return o;
  }
  return a;
}

// ---------- примитивы рисования ----------
const line = (a, b, w, cls) => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" stroke-width="${w}" class="${cls}"/>`;
const circ = (c, r, cls, extra = '') => `<circle cx="${f1(c[0])}" cy="${f1(c[1])}" r="${r}" class="${cls}" ${extra}/>`;
const rect = (x, y, w, h, cls, rx = 1.5) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" class="${cls}"/>`;

const EQ = {
  plate: (c, r = 8.5) => `${circ(c, r, 'fx-plate')}${circ(c, 2.2, 'fx-hub')}`,
  db: (c) => `<g transform="translate(${f1(c[0])} ${f1(c[1])})">${rect(-6.5, -0.9, 13, 1.8, 'fx-bar', 0.9)}${rect(-8, -3.2, 3.4, 6.4, 'fx-dbh', 1.2)}${rect(4.6, -3.2, 3.4, 6.4, 'fx-dbh', 1.2)}</g>`,
  dbV: (c) => `<g transform="translate(${f1(c[0])} ${f1(c[1])})">${rect(-0.9, -6.5, 1.8, 13, 'fx-bar', 0.9)}${rect(-3.2, -8, 6.4, 3.4, 'fx-dbh', 1.2)}${rect(-3.2, 4.6, 6.4, 3.4, 'fx-dbh', 1.2)}</g>`,
  bench: (x1, x2, y) => `${rect(x1, y, x2 - x1, 4.5, 'fx-pad', 2)}${rect(x1 + 4, y + 4.5, 2.5, GROUND - y - 4.5, 'fx-frame', 0.6)}${rect(x2 - 6.5, y + 4.5, 2.5, GROUND - y - 4.5, 'fx-frame', 0.6)}`,
  post: (x, y1 = -10) => rect(x - 1.8, y1, 3.6, GROUND - y1, 'fx-frame', 1),
  pulley: (c) => `${circ(c, 3.2, 'fx-pulley')}${circ(c, 1, 'fx-hub')}`,
  cable: (a, b) => `<line x1="${f1(a[0])}" y1="${f1(a[1])}" x2="${f1(b[0])}" y2="${f1(b[1])}" class="fx-cable"/>`,
  bar: (x1, x2, y) => `${rect(x1, y - 1.3, x2 - x1, 2.6, 'fx-frame', 1.3)}`,
};

// ---------- шаблоны движений ----------
const STAND = { hip: [58, 56], t: 0, feet: [[60, 93], [56, 93]], hands: [[60, 58], [57, 58]] };
const S = (o) => ({ ...STAND, ...o });
const LYING = { hip: [40, 66], t: 90, face: -1, feet: [[24, 93], [27, 93]], ks: [-1, -1] };
const Ly = (o) => ({ ...LYING, ...o });
const benchEq = () => EQ.bench(18, 84, 70);

const T = {
  bench: { a: Ly({ hands: [[67, 50], [66, 50]], es: [1, 1] }), b: Ly({ hands: [[67, 38], [66, 38]], es: [1, 1] }), back: benchEq, eq: 'barbell' },
  incline: {
    a: { hip: [46, 68], t: 62, face: -1, hands: [['t', 2, 6], ['t', 2, 6]], es: [1, 1], feet: [[28, 93], [31, 93]], ks: [-1, -1] },
    b: { hip: [46, 68], t: 62, face: -1, hands: [['t', 6, 27], ['t', 6, 27]], es: [1, 1], feet: [[28, 93], [31, 93]], ks: [-1, -1] },
    back: () => `${rect(30, 72, 24, 4.5, 'fx-pad', 2)}<line x1="48" y1="74" x2="76" y2="46" class="fx-padline"/>${rect(40, 76, 2.5, 18, 'fx-frame', .6)}${rect(60, 60, 2.5, 34, 'fx-frame', .6)}`,
    eq: 'db',
  },
  fly: { a: Ly({ hands: [[60, 66], [60, 66]], es: [1, 1] }), b: Ly({ hands: [[67, 40], [66, 40]], es: [1, 1] }), back: benchEq, eq: 'db' },
  pullover: { a: Ly({ hands: [[94, 74], [94, 74]], es: [1, 1] }), b: Ly({ hands: [[68, 40], [68, 40]], es: [1, 1] }), back: benchEq, eq: 'db' },
  skull: { a: Ly({ hands: [[82, 54], [82, 54]], es: [-1, -1] }), b: Ly({ hands: [[67, 38], [67, 38]], es: [-1, -1] }), back: benchEq, eq: 'barbell' },
  pushup: {
    a: { hip: [56, 80], sh: [82, 79], hands: [[82, 93], [84, 93]], feet: [[18, 92], [21, 92]], toe: [[2, 1], [2, 1]] },
    b: { hip: [54, 72], sh: [80, 62], hands: [[82, 93], [84, 93]], feet: [[18, 92], [21, 92]], toe: [[2, 1], [2, 1]] },
  },
  plank: {
    a: { hip: [50, 80], sh: [77, 78], hands: [[92, 92], [92, 92]], es: [-1, -1], feet: [[13, 91], [16, 91]], toe: [[2, 1], [2, 1]] },
    b: { hip: [50, 78], sh: [77, 77.5], hands: [[92, 92], [92, 92]], es: [-1, -1], feet: [[13, 91], [16, 91]], toe: [[2, 1], [2, 1]] },
  },
  sidePlank: {
    a: { hip: [52, 82], sh: [78, 72], hands: [[80, 93], [80, 64]], es: [-1, 1], feet: [[16, 92], [16, 92]], toe: [[0, 1], [0, 1]] },
    b: { hip: [52, 75], sh: [78, 68], hands: [[80, 93], [80, 40]], es: [-1, 1], feet: [[16, 92], [16, 92]], toe: [[0, 1], [0, 1]] },
  },
  abWheel: {
    a: { hip: [46, 72], sh: [62, 52], hands: [[66, 84], [66, 84]], feet: [[22, 93], [24, 93]], toe: [[-4, 0], [-4, 0]] },
    b: { hip: [54, 82], sh: [80, 80], hands: [[100, 84], [100, 84]], feet: [[22, 93], [24, 93]], toe: [[-4, 0], [-4, 0]] },
    front: (J) => `${circ(add(J.arms[1].hd, [0, 3.5]), 5.5, 'fx-plate')}${circ(add(J.arms[1].hd, [0, 3.5]), 1.6, 'fx-hub')}`,
  },
  dips: {
    a: { hip: [58, 46], sh: [60, 20], hands: [[61, 46], [61, 46]], feet: [[46, 68], [44, 68]] },
    b: { hip: [55, 58], sh: [65, 34], hands: [[61, 46], [61, 46]], feet: [[40, 70], [38, 70]] },
    back: () => `${EQ.bar(44, 78, 47)}${rect(46, 47, 2.5, 47, 'fx-frame', .6)}${rect(74, 47, 2.5, 47, 'fx-frame', .6)}`,
  },
  dipsT: {
    a: { hip: [59, 46], sh: [60, 20], hands: [[61, 46], [61, 46]], feet: [[48, 68], [46, 68]] },
    b: { hip: [59, 56], sh: [61, 31], hands: [[61, 46], [61, 46]], feet: [[46, 70], [44, 70]] },
    back: () => `${EQ.bar(44, 78, 47)}${rect(46, 47, 2.5, 47, 'fx-frame', .6)}${rect(74, 47, 2.5, 47, 'fx-frame', .6)}`,
  },
  benchDips: {
    a: { hip: [46, 62], sh: [44, 36], hands: [[38, 64], [38, 64]], feet: [[86, 93], [89, 93]] },
    b: { hip: [46, 79], sh: [44, 53], hands: [[38, 64], [38, 64]], feet: [[86, 93], [89, 93]] },
    back: () => EQ.bench(14, 42, 64),
  },
  pullup: {
    a: { hip: [58, 52], sh: [58, 26], hands: [[56, -2], [60, -2]], es: [-1, -1], feet: [[50, 86], [48, 86]] },
    b: { hip: [57, 38], sh: [58, 12], hands: [[56, -2], [60, -2]], es: [-1, -1], feet: [[49, 72], [47, 72]] },
    back: () => `${EQ.bar(26, 92, -2)}${rect(26, -2, 2.5, 96, 'fx-frame', .6)}${rect(89.5, -2, 2.5, 96, 'fx-frame', .6)}`,
  },
  hang: {
    a: { hip: [58, 52], sh: [58, 26], hands: [[56, -2], [60, -2]], es: [-1, -1], feet: [[50, 86], [48, 86]] },
    b: { hip: [60, 52], sh: [59, 26], hands: [[56, -2], [60, -2]], es: [-1, -1], feet: [[54, 87], [52, 87]] },
    back: () => `${EQ.bar(26, 92, -2)}${rect(26, -2, 2.5, 96, 'fx-frame', .6)}${rect(89.5, -2, 2.5, 96, 'fx-frame', .6)}`,
  },
  legRaise: {
    a: { hip: [58, 52], sh: [58, 26], hands: [[56, -2], [60, -2]], es: [-1, -1], feet: [[58, 90], [56, 90]] },
    b: { hip: [57, 52], sh: [58, 26], hands: [[56, -2], [60, -2]], es: [-1, -1], feet: [[94, 46], [92, 46]], toe: [[2, -6], [2, -6]] },
    back: () => `${EQ.bar(26, 92, -2)}${rect(26, -2, 2.5, 96, 'fx-frame', .6)}${rect(89.5, -2, 2.5, 96, 'fx-frame', .6)}`,
  },
  pulldown: {
    a: { hip: [54, 70], t: -8, hands: [[58, 2], [62, 2]], es: [-1, -1], feet: [[78, 93], [81, 93]] },
    b: { hip: [54, 70], t: -16, hands: [[56, 42], [58, 42]], es: [-1, -1], feet: [[78, 93], [81, 93]] },
    back: () => `${EQ.post(98)}${rect(56, -10, 44, 3, 'fx-frame', 1)}${EQ.pulley([60, -6])}${rect(38, 72, 28, 4.5, 'fx-pad', 2)}${rect(50, 76, 2.5, 18, 'fx-frame', .6)}${circ([74, 63], 3.5, 'fx-pad')}`,
    front: (J) => `${EQ.cable([60, -6], J.arms[1].hd)}${rect(J.arms[1].hd[0] - 12, J.arms[1].hd[1] - 1, 24, 2.2, 'fx-bar', 1)}`,
  },
  seatedRow: {
    a: { hip: [42, 80], t: 22, hands: [[84, 72], [84, 72]], feet: [[88, 86], [90, 86]], toe: [[0, -6], [0, -6]] },
    b: { hip: [42, 80], t: -8, hands: [[48, 63], [48, 63]], feet: [[88, 86], [90, 86]], toe: [[0, -6], [0, -6]] },
    back: () => `${EQ.post(104)}${EQ.pulley([102, 84])}${rect(22, 83, 34, 4, 'fx-pad', 2)}${rect(92, 78, 3, 14, 'fx-frame', 1)}`,
    front: (J) => EQ.cable([102, 84], J.arms[1].hd),
  },
  barbellRow: {
    a: { hip: [44, 56], t: 72, hands: [[69, 76], [69, 76]], feet: [[58, 93], [55, 93]] },
    b: { hip: [44, 56], t: 70, hands: [[60, 62], [60, 62]], feet: [[58, 93], [55, 93]] },
    eq: 'barbell',
  },
  dbRow: {
    a: { hip: [46, 52], t: 80, hands: [[70, 80], [86, 66]], es: [-1, -1], feet: [[54, 93], [44, 93]] },
    b: { hip: [46, 52], t: 78, hands: [[58, 60], [86, 66]], es: [-1, -1], feet: [[54, 93], [44, 93]] },
    back: () => EQ.bench(60, 104, 66),
    eqNear: 'db',
  },
  crossover: {
    a: S({ t: 14, hands: [[70, 26], [70, 26]], es: [1, 1], feet: [[64, 93], [52, 93]] }),
    b: S({ t: 14, hands: [[78, 60], [78, 60]], es: [1, 1], feet: [[64, 93], [52, 93]] }),
    back: () => `${EQ.post(100)}${EQ.pulley([98, 4])}`,
    front: (J) => EQ.cable([98, 4], J.arms[1].hd),
  },
  ohp: { a: S({ hands: [[64, 27], [64, 27]], es: [-1, -1] }), b: S({ hands: [[60, -2], [60, -2]], es: [-1, -1] }), eq: 'barbell' },
  dbPress: {
    a: { hip: [54, 66], t: 0, hands: [[64, 28], [62, 28]], es: [-1, -1], feet: [[76, 93], [79, 93]] },
    b: { hip: [54, 66], t: 0, hands: [[58, 4], [56, 4]], es: [-1, -1], feet: [[76, 93], [79, 93]] },
    back: () => `${rect(42, 68, 26, 4.5, 'fx-pad', 2)}${rect(40, 30, 4.5, 40, 'fx-pad', 2)}${rect(52, 72, 2.5, 22, 'fx-frame', .6)}`,
    eq: 'db',
  },
  lateral: {
    a: S({ view: 'front', hip: [60, 56], hands: [[48, 58], [72, 58]], feet: [[55, 95], [65, 95]] }),
    b: S({ view: 'front', hip: [60, 56], hands: [[30, 30], [90, 30]], feet: [[55, 95], [65, 95]] }),
    eq: 'dbV',
  },
  rearFly: {
    a: { hip: [44, 56], t: 74, hands: [[70, 78], [68, 78]], es: [1, 1], feet: [[58, 93], [55, 93]] },
    b: { hip: [44, 56], t: 72, hands: [[64, 50], [62, 50]], es: [1, 1], feet: [[58, 93], [55, 93]] },
    eq: 'db',
  },
  facePull: {
    a: S({ hands: [[86, 24], [86, 24]], es: [1, 1], feet: [[64, 93], [52, 93]] }),
    b: S({ t: -4, hands: [[66, 18], [66, 18]], es: [1, 1], feet: [[64, 93], [52, 93]] }),
    back: () => `${EQ.post(102)}${EQ.pulley([100, 22])}`,
    front: (J) => EQ.cable([100, 22], J.arms[1].hd),
  },
  uprightRow: { a: S({ hands: [[62, 58], [62, 58]], es: [1, 1] }), b: S({ hands: [[64, 30], [64, 30]], es: [1, 1] }), eq: 'barbell' },
  shrug: {
    a: S({ view: 'front', hip: [60, 56], hands: [[48, 58], [72, 58]], feet: [[55, 95], [65, 95]], shrug: 0 }),
    b: S({ view: 'front', hip: [60, 56], hands: [[48, 53], [72, 53]], feet: [[55, 95], [65, 95]], shrug: 5 }),
    eq: 'frontBar',
  },
  curl: { a: S({ hands: [[60, 58], [58, 58]] }), b: S({ hands: [[69, 36], [67, 36]] }), eq: 'barbell' },
  preacher: {
    a: { hip: [48, 68], t: 14, hands: [[84, 62], [84, 62]], es: [1, 1], feet: [[66, 93], [69, 93]] },
    b: { hip: [48, 68], t: 14, hands: [[68, 34], [68, 34]], es: [1, 1], feet: [[66, 93], [69, 93]] },
    back: () => `${rect(36, 70, 22, 4.5, 'fx-pad', 2)}${rect(46, 74, 2.5, 20, 'fx-frame', .6)}<line x1="66" y1="40" x2="80" y2="62" class="fx-padline"/>${rect(74, 60, 2.5, 34, 'fx-frame', .6)}`,
    eq: 'barbell',
  },
  concentration: {
    a: { hip: [46, 70], t: 42, hands: [[70, 88], [52, 74]], es: [1, -1], feet: [[70, 93], [40, 93]] },
    b: { hip: [46, 70], t: 42, hands: [[66, 58], [52, 74]], es: [1, -1], feet: [[70, 93], [40, 93]] },
    back: () => `${rect(30, 72, 26, 4.5, 'fx-pad', 2)}${rect(40, 76, 2.5, 18, 'fx-frame', .6)}`,
    eqNear: 'db',
  },
  pushdown: {
    a: S({ t: 8, hands: [[72, 42], [72, 42]] }),
    b: S({ t: 8, hands: [[70, 64], [70, 64]] }),
    back: () => `${EQ.post(98)}${EQ.pulley([96, 2])}`,
    front: (J) => EQ.cable([96, 2], J.arms[1].hd),
  },
  overheadExt: { a: S({ hands: [[48, 22], [48, 22]], es: [-1, -1] }), b: S({ hands: [[60, -2], [60, -2]], es: [-1, -1] }), eq: 'db' },
  wristCurl: {
    a: { hip: [46, 68], t: 18, hands: [[78, 72], [78, 72]], es: [1, 1], feet: [[70, 93], [73, 93]] },
    b: { hip: [46, 68], t: 18, hands: [[78, 63], [78, 63]], es: [1, 1], feet: [[70, 93], [73, 93]] },
    back: () => `${rect(34, 70, 22, 4.5, 'fx-pad', 2)}${rect(44, 74, 2.5, 20, 'fx-frame', .6)}`,
    eq: 'barbell',
  },
  farmer: {
    a: S({ hip: [58, 57], feet: [[68, 93], [48, 93]], hands: [[60, 60], [56, 60]] }),
    b: S({ hip: [58, 57], feet: [[48, 93], [68, 93]], hands: [[56, 60], [60, 60]] }),
    eq: 'db',
  },
  crunch: {
    a: { hip: [52, 88], t: -90, hands: [['t', 6, 2], ['t', 6, 2]], es: [1, 1], feet: [[72, 93], [75, 93]], ks: [1, 1] },
    b: { hip: [52, 88], t: -58, hands: [['t', 6, 2], ['t', 6, 2]], es: [1, 1], feet: [[72, 93], [75, 93]], ks: [1, 1] },
  },
  bicycle: {
    a: { hip: [52, 88], t: -62, hands: [['t', 6, 2], ['t', 6, 2]], es: [1, 1], feet: [[66, 70], [88, 82]], ks: [1, 1], toe: [[6, -2], [6, -2]] },
    b: { hip: [52, 88], t: -66, hands: [['t', 6, 2], ['t', 6, 2]], es: [1, 1], feet: [[88, 82], [66, 70]], ks: [1, 1], toe: [[6, -2], [6, -2]] },
  },
  russianTwist: {
    a: { hip: [50, 88], t: -32, hands: [['t', 10, 14], ['t', 10, 14]], es: [1, 1], feet: [[80, 76], [82, 76]], ks: [1, 1] },
    b: { hip: [50, 88], t: -38, hands: [['t', 4, 18], ['t', 4, 18]], es: [1, 1], feet: [[80, 76], [82, 76]], ks: [1, 1] },
    eq: 'barbell', plateR: 5,
  },
  sideBend: {
    a: S({ view: 'front', hip: [60, 56], t: -12, hands: [[42, 60], [66, 58]], feet: [[55, 95], [65, 95]] }),
    b: S({ view: 'front', hip: [60, 56], t: 12, hands: [[56, 58], [80, 62]], feet: [[55, 95], [65, 95]] }),
    eqNear: 'dbV',
  },
  woodchopper: {
    a: S({ view: 'front', hip: [60, 56], t: 10, hands: [[86, 12], [90, 14]], feet: [[53, 95], [67, 95]] }),
    b: S({ view: 'front', hip: [60, 56], t: -12, hands: [[36, 70], [40, 72]], feet: [[53, 95], [67, 95]] }),
    back: () => `${EQ.post(106)}${EQ.pulley([104, 0])}`,
    front: (J) => EQ.cable([104, 0], J.arms[1].hd),
  },
  deadlift: {
    a: { hip: [42, 64], t: 62, hands: [[64, 80], [64, 80]], feet: [[60, 93], [57, 93]] },
    b: S({ hands: [[59, 58], [59, 58]] }),
    eq: 'barbell',
  },
  rdl: {
    a: S({ hands: [[60, 60], [60, 60]] }),
    b: { hip: [46, 56], t: 76, hands: [[72, 80], [72, 80]], feet: [[60, 93], [57, 93]] },
    eq: 'barbell',
  },
  goodMorning: {
    a: S({ hands: [['t', 2, -5], ['t', 2, -5]], es: [1, 1] }),
    b: { hip: [46, 56], t: 76, hands: [['t', 2, -5], ['t', 2, -5]], es: [1, 1], feet: [[60, 93], [57, 93]] },
    eq: 'barbellBack',
  },
  hyper: {
    a: { hip: [56, 56], t: 150, hands: [['t', 3, 6], ['t', 3, 6]], feet: [[26, 78], [26, 78]], ks: [-1, -1], toe: [[0, 6], [0, 6]] },
    b: { hip: [56, 56], t: 58, hands: [['t', 3, 6], ['t', 3, 6]], feet: [[26, 78], [26, 78]], ks: [-1, -1], toe: [[0, 6], [0, 6]] },
    back: () => `<line x1="30" y1="86" x2="62" y2="58" class="fx-padline"/>${rect(28, 74, 4, 20, 'fx-frame', 1)}${rect(56, 58, 3, 36, 'fx-frame', 1)}`,
  },
  superman: {
    a: { hip: [56, 88], t: 90, hands: [[106, 90], [106, 90]], es: [1, 1], feet: [[18, 90], [18, 90]], toe: [[0, 3], [0, 3]] },
    b: { hip: [56, 87], t: 80, hands: [[104, 72], [104, 72]], es: [1, 1], feet: [[19, 80], [19, 80]], toe: [[0, 3], [0, 3]] },
  },
  squat: {
    a: S({ t: 4, hands: [['t', 0, -5], ['t', 0, -5]], es: [1, 1] }),
    b: { hip: [44, 72], t: 40, hands: [['t', 0, -5], ['t', 0, -5]], es: [1, 1], feet: [[60, 93], [57, 93]] },
    eq: 'barbellBack',
  },
  frontSquat: {
    a: S({ t: 2, hands: [['t', 0, 7], ['t', 0, 7]], es: [-1, -1] }),
    b: { hip: [44, 72], t: 32, hands: [['t', 0, 7], ['t', 0, 7]], es: [-1, -1], feet: [[60, 93], [57, 93]] },
    eq: 'chestPlate',
  },
  goblet: {
    a: S({ t: 2, hands: [['t', -3, 8], ['t', -3, 8]], es: [-1, -1] }),
    b: { hip: [46, 74], t: 28, hands: [['t', -3, 8], ['t', -3, 8]], es: [-1, -1], feet: [[60, 93], [57, 93]] },
    eq: 'dbV1',
  },
  lunge: {
    a: S({ feet: [[74, 93], [40, 93]], hip: [57, 58], hands: [[59, 60], [55, 60]], toe: [[6, 0], [5, 2]] }),
    b: S({ feet: [[74, 93], [40, 93]], hip: [56, 72], hands: [[58, 74], [54, 74]], toe: [[6, 0], [5, 2]] }),
    eq: 'db',
  },
  bulgarian: {
    a: S({ feet: [[72, 93], [32, 70]], hip: [56, 58], toe: [[6, 0], [-5, 0]], hands: [[58, 60], [54, 60]] }),
    b: S({ feet: [[72, 93], [32, 70]], hip: [54, 72], toe: [[6, 0], [-5, 0]], hands: [[56, 74], [52, 74]] }),
    back: () => EQ.bench(14, 40, 72),
    eq: 'db',
  },
  legPress: {
    a: { hip: [38, 74], t: -52, hands: [[42, 76], [42, 76]], feet: [[60, 62], [62, 62]], toe: [[3, -5], [3, -5]] },
    b: { hip: [38, 74], t: -52, hands: [[42, 76], [42, 76]], feet: [[72, 50], [74, 50]], toe: [[3, -5], [3, -5]] },
    back: () => `<line x1="10" y1="54" x2="34" y2="78" class="fx-padline"/>${rect(30, 76, 22, 4.5, 'fx-pad', 2)}${rect(36, 80, 3, 14, 'fx-frame', 1)}<line x1="40" y1="94" x2="98" y2="36" class="fx-rail"/>`,
    front: (J) => { const a = J.legs[1].an; return `<line x1="${f1(a[0] - 5)}" y1="${f1(a[1] - 6)}" x2="${f1(a[0] + 9)}" y2="${f1(a[1] + 8)}" class="fx-platform"/>`; },
  },
  legPressCalf: {
    a: { hip: [38, 74], t: -52, hands: [[42, 76], [42, 76]], feet: [[70, 52], [72, 52]], toe: [[3, -5], [3, -5]] },
    b: { hip: [38, 74], t: -52, hands: [[42, 76], [42, 76]], feet: [[70, 52], [72, 52]], toe: [[6, -2], [6, -2]] },
    back: () => `<line x1="10" y1="54" x2="34" y2="78" class="fx-padline"/>${rect(30, 76, 22, 4.5, 'fx-pad', 2)}${rect(36, 80, 3, 14, 'fx-frame', 1)}<line x1="40" y1="94" x2="98" y2="36" class="fx-rail"/>`,
    front: (J) => { const a = J.legs[1].toe; return `<line x1="${f1(a[0] - 7)}" y1="${f1(a[1] - 7)}" x2="${f1(a[0] + 7)}" y2="${f1(a[1] + 7)}" class="fx-platform"/>`; },
  },
  legExt: {
    a: { hip: [48, 66], t: -6, hands: [[50, 70], [50, 70]], feet: [[69, 86], [71, 86]] },
    b: { hip: [48, 66], t: -6, hands: [[50, 70], [50, 70]], feet: [[86, 64], [88, 64]], toe: [[2, -6], [2, -6]] },
    back: () => `${rect(34, 68, 30, 4.5, 'fx-pad', 2)}${rect(32, 34, 4.5, 36, 'fx-pad', 2)}${rect(46, 72, 2.5, 22, 'fx-frame', .6)}`,
    front: (J) => circ(add(J.legs[1].an, [1, -2]), 3.4, 'fx-pad'),
  },
  legCurlSeated: {
    a: { hip: [48, 66], t: -6, hands: [[50, 70], [50, 70]], feet: [[86, 64], [88, 64]], toe: [[2, -6], [2, -6]] },
    b: { hip: [48, 66], t: -6, hands: [[50, 70], [50, 70]], feet: [[64, 86], [66, 86]] },
    back: () => `${rect(34, 68, 30, 4.5, 'fx-pad', 2)}${rect(32, 34, 4.5, 36, 'fx-pad', 2)}${rect(46, 72, 2.5, 22, 'fx-frame', .6)}`,
    front: (J) => circ(add(J.legs[1].an, [1, 3]), 3.4, 'fx-pad'),
  },
  legCurlLying: {
    a: { hip: [54, 64], t: 90, hands: [[90, 72], [90, 72]], es: [1, 1], feet: [[16, 64], [16, 64]], toe: [[0, 6], [0, 6]] },
    b: { hip: [54, 64], t: 90, hands: [[90, 72], [90, 72]], es: [1, 1], feet: [[42, 42], [42, 42]], toe: [[-6, 0], [-6, 0]] },
    back: () => EQ.bench(22, 92, 68),
    front: (J) => circ(add(J.legs[1].an, [0, 3]), 3.4, 'fx-pad'),
  },
  nordic: {
    a: { hip: [48, 72], t: 4, hands: [['t', 10, 8], ['t', 10, 8]], feet: [[28, 90], [28, 90]], ks: [1, 1], toe: [[-3, -4], [-3, -4]] },
    b: { hip: [62, 82], t: 66, hands: [['t', 10, 10], ['t', 10, 10]], feet: [[28, 90], [28, 90]], ks: [1, 1], toe: [[-3, -4], [-3, -4]] },
    back: () => rect(16, 86, 30, 6, 'fx-pad', 2),
  },
  hipThrust: {
    a: { hip: [58, 82], sh: [36, 64], face: -1, hands: [['t', -26, 2], ['t', -26, 2]], es: [1, 1], feet: [[74, 93], [77, 93]] },
    b: { hip: [60, 64], sh: [36, 62], face: -1, hands: [['t', -26, 2], ['t', -26, 2]], es: [1, 1], feet: [[74, 93], [77, 93]] },
    back: () => EQ.bench(8, 38, 64),
    eqHip: true,
  },
  bridge: {
    a: { hip: [52, 90], sh: [26, 90], face: -1, hands: [[46, 92], [46, 92]], es: [1, 1], feet: [[70, 93], [73, 93]] },
    b: { hip: [54, 74], sh: [28, 89], face: -1, hands: [[46, 92], [46, 92]], es: [1, 1], feet: [[70, 93], [73, 93]] },
  },
  kickback: {
    a: S({ t: 14, hands: [[86, 42], [86, 42]], es: [1, 1], feet: [[58, 93], [58, 93]] }),
    b: S({ t: 22, hands: [[86, 42], [86, 42]], es: [1, 1], feet: [[60, 93], [24, 72]], toe: [[6, 0], [2, 5]] }),
    back: () => `${EQ.post(92)}${EQ.pulley([90, 88])}`,
    front: (J) => EQ.cable([90, 88], J.legs[1].an),
  },
  calfRaise: {
    a: S({ feet: [[58, 92], [56, 92]], toe: [[6, 0], [6, 0]] }),
    b: S({ hip: [58, 50], feet: [[58, 86], [56, 86]], toe: [[5, 6], [5, 6]], hands: [[60, 52], [58, 52]] }),
    back: () => rect(56, 92, 26, 4, 'fx-frame', 1),
  },
  seatedCalf: {
    a: { hip: [44, 70], t: 0, hands: [[66, 64], [66, 64]], es: [1, 1], feet: [[68, 91], [70, 91]] },
    b: { hip: [44, 66], t: 0, hands: [[66, 60], [66, 60]], es: [1, 1], feet: [[68, 86], [70, 86]], toe: [[5, 5], [5, 5]] },
    back: () => `${rect(30, 72, 24, 4.5, 'fx-pad', 2)}${rect(40, 76, 2.5, 18, 'fx-frame', .6)}`,
    front: (J) => rect(f1(J.legs[1].kn[0] - 6), f1(J.legs[1].kn[1] - 5), 12, 4, 'fx-pad', 2),
  },
  // шея: лёжа на спине — подбородок к груди, блин на лбу
  neckFlex: {
    a: Ly({ hands: [['t', 9, 5], ['t', 9, 5]], es: [1, 1], head: 0 }),
    b: Ly({ hands: [['t', 6, 10], ['t', 6, 10]], es: [1, 1], head: -48 }),
    back: () => EQ.bench(18, 76, 70),
    front: (J) => EQ.plate(add(J.head, mul(headFace(J), 6.5)), 5.5),
  },
  // шея: лёжа на животе — голова поднимается назад, блин на затылке
  neckExt: {
    a: { hip: [42, 61], t: 90, face: 1, hands: [['t', 9, -6], ['t', 9, -6]], es: [1, 1], feet: [[4, 63], [4, 63]], toe: [[0, 6], [0, 6]], head: 38 },
    b: { hip: [42, 61], t: 90, face: 1, hands: [['t', 5, -11], ['t', 5, -11]], es: [1, 1], feet: [[4, 63], [4, 63]], toe: [[0, 6], [0, 6]], head: -32 },
    back: () => EQ.bench(8, 70, 66),
    front: (J) => EQ.plate(add(J.head, mul(headFace(J), -6.5)), 5.5),
  },
  // шея: наклоны в сторону, ладонь упирается в висок (вид спереди)
  neckSide: {
    a: S({ view: 'front', hip: [60, 56], head: 0, hands: [[48, 58], [69, 21]], es: [1, 1], feet: [[55, 95], [65, 95]] }),
    b: S({ view: 'front', hip: [60, 56], head: 24, hands: [[48, 58], [73, 24]], es: [1, 1], feet: [[55, 95], [65, 95]] }),
  },
  // сведение ног в тренажёре (вид спереди, сидя)
  adductor: {
    a: S({ view: 'front', hip: [60, 64], hands: [[47, 68], [73, 68]], feet: [[30, 92], [90, 92]] }),
    b: S({ view: 'front', hip: [60, 64], hands: [[47, 68], [73, 68]], feet: [[52, 92], [68, 92]] }),
    back: () => `${rect(42, 30, 36, 34, 'fx-pad', 4)}${rect(40, 64, 40, 5, 'fx-pad', 2)}${rect(58, 69, 4, 25, 'fx-frame', 1)}`,
    front: (J) => J.legs.map((Lg, i) => circ(add(Lg.kn, [i === 0 ? -4.5 : 4.5, 0]), 3.4, 'fx-pad')).join(''),
  },
  // сумо-присед: широкая стойка, гантель между ног (вид спереди)
  sumo: {
    a: S({ view: 'front', hip: [60, 55], hands: [[58, 70], [62, 70]], es: [1, -1], feet: [[40, 95], [80, 95]] }),
    b: S({ view: 'front', hip: [60, 71], hands: [[58, 84], [62, 84]], es: [1, -1], feet: [[40, 95], [80, 95]] }),
    front: (J) => EQ.dbV(add(lerpP(J.arms[0].hd, J.arms[1].hd, 0.5), [0, 5])),
  },
  // боковые выпады (вид спереди)
  sideLunge: {
    a: S({ view: 'front', hip: [60, 56], hands: [[51, 57], [69, 57]], es: [-1, 1], feet: [[44, 95], [76, 95]] }),
    b: S({ view: 'front', hip: [71, 69], hands: [[62, 70], [80, 70]], es: [-1, 1], feet: [[38, 95], [82, 95]] }),
  },
  jumpRope: {
    a: S({ hands: [[48, 60], [68, 60]], feet: [[60, 93], [56, 93]], toe: [[6, 0], [6, 0]] }),
    b: S({ hip: [58, 50], hands: [[48, 54], [68, 54]], feet: [[60, 86], [56, 86]], toe: [[5, 5], [5, 5]] }),
    rope: true,
  },
};

const MAP = {
  'bench-press': 'bench', 'incline-db-press': 'incline', 'push-ups': 'pushup', 'db-fly': 'fly', 'cable-crossover': 'crossover', 'chest-dips': 'dips',
  ohp: 'ohp', 'db-shoulder-press': 'dbPress', 'lateral-raise': 'lateral', 'rear-delt-fly': 'rearFly', 'arnold-press': 'dbPress', 'face-pull': 'facePull',
  'barbell-curl': 'curl', 'hammer-curl': ['curl', 'db'], 'preacher-curl': 'preacher', 'concentration-curl': 'concentration', 'chin-ups': 'pullup',
  'skull-crusher': 'skull', pushdown: 'pushdown', 'close-grip-bench': 'bench', 'triceps-dips': 'dipsT', 'overhead-ext': 'overheadExt', 'bench-dips': 'benchDips',
  'wrist-curl': 'wristCurl', 'reverse-wrist-curl': 'wristCurl', 'farmer-walk': 'farmer', 'dead-hang': 'hang',
  crunches: 'crunch', plank: 'plank', 'hanging-leg-raise': 'legRaise', bicycle: 'bicycle', 'ab-wheel': 'abWheel',
  'russian-twist': 'russianTwist', 'side-plank': 'sidePlank', 'side-bend': 'sideBend', woodchopper: 'woodchopper',
  'barbell-shrug': 'shrug', 'db-shrug': ['shrug', 'dbV'], 'upright-row': 'uprightRow',
  'pull-ups': 'pullup', 'lat-pulldown': 'pulldown', 'barbell-row': 'barbellRow', 'db-row': 'dbRow', 'seated-row': 'seatedRow', pullover: 'pullover',
  deadlift: 'deadlift', hyperextension: 'hyper', 'good-morning': 'goodMorning', superman: 'superman',
  'hip-thrust': 'hipThrust', 'bulgarian-split': 'bulgarian', 'cable-kickback': 'kickback', 'glute-bridge': 'bridge',
  squat: 'squat', 'leg-press': 'legPress', lunges: 'lunge', 'leg-extension': 'legExt', 'front-squat': 'frontSquat', 'goblet-squat': 'goblet',
  rdl: 'rdl', 'lying-leg-curl': 'legCurlLying', 'seated-leg-curl': 'legCurlSeated', 'nordic-curl': 'nordic',
  'neck-flexion': 'neckFlex', 'neck-extension': 'neckExt', 'neck-side': 'neckSide',
  'adductor-machine': 'adductor', 'sumo-squat': 'sumo', 'side-lunge': 'sideLunge',
  'standing-calf': 'calfRaise', 'seated-calf': 'seatedCalf', 'leg-press-calf': 'legPressCalf', 'jump-rope': 'jumpRope',
};
// для своих упражнений — по группе мышц
const BY_MUSCLE = {
  chest: 'bench', shoulders: 'ohp', biceps: 'curl', triceps: 'pushdown', forearms: 'wristCurl', abs: 'crunch', obliques: 'russianTwist',
  neck: 'shrug', traps: 'shrug', lats: 'pulldown', lowerback: 'hyper', glutes: 'hipThrust', quads: 'squat', hamstrings: 'rdl', calves: 'calfRaise', adductors: 'lunge',
};

function templateFor(ex) {
  let m = MAP[ex.id];
  if (!m) m = BY_MUSCLE[ex.muscle] || 'curl';
  const [key, eqOverride] = Array.isArray(m) ? m : [m, null];
  const tpl = T[key];
  return { tpl, eq: eqOverride || tpl.eq, eqNear: tpl.eqNear };
}

// ---------- рисование тела ----------
// Тело — заливные формы (корпус с грудью, талией и ягодицами, руки и ноги с мышцами, голова, кисти, ступни).
// Подсветка закрашивает саму мышцу на нужной стороне: бицепс — спереди плеча, трицепс — сзади,
// квадрицепс — спереди бедра, бицепс бедра — сзади, икры — сзади голени, грудь — спереди корпуса и т.д.
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const len = (v) => Math.hypot(v[0], v[1]) || 1e-6;
const nrm = (v) => { const l = len(v); return [v[0] / l, v[1] / l]; };
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const perp = (v) => [-v[1], v[0]];
const lerpP = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
const P = (p) => `${f1(p[0])} ${f1(p[1])}`;

// замкнутая сглаженная фигура через точки (Catmull-Rom → Безье)
function smooth(pts, closed = true) {
  const n = pts.length;
  const g = (i) => pts[closed ? (i + n) % n : clamp(i, 0, n - 1)];
  let d = `M${P(pts[0])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = g(i - 1), p1 = g(i), p2 = g(i + 1), p3 = g(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${P(c1)} ${P(c2)} ${P(p2)}`;
  }
  return d + (closed ? 'Z' : '');
}
const pathEl = (d, cls) => `<path d="${d}" class="${cls}"/>`;

// сегмент конечности с профилем толщины: widths = [[t, w], ...] по длине 0..1
function limbPath(a, b, widths) {
  const dir = nrm(sub(b, a)), p = perp(dir), L2 = len(sub(b, a));
  const left = [], right = [];
  widths.forEach(([t, w]) => { const c = lerpP(a, b, t); left.push(add(c, mul(p, w / 2))); right.push(add(c, mul(p, -w / 2))); });
  const w0 = widths[0][1] / 2, w1 = widths[widths.length - 1][1] / 2;
  // скруглённые концы
  const capA = add(a, mul(dir, -w0 * 0.85)), capB = add(b, mul(dir, w1 * 0.85));
  return smooth([...left, capB, ...right.reverse(), capA]);
  void L2;
}
// область мышцы на конечности: side = направление (единичный вектор) стороны, где мышца
function limbRegion(a, b, widths, sideVec, t0, t1, from = 0.05, to = 1.02) {
  const dir = nrm(sub(b, a)), p = perp(dir);
  const s = dot(p, sideVec) >= 0 ? 1 : -1;
  const wAt = (t) => { for (let i = 1; i < widths.length; i++) if (t <= widths[i][0]) { const [ta, wa] = widths[i - 1], [tb, wb] = widths[i]; return wa + (wb - wa) * ((t - ta) / (tb - ta || 1)); } return widths[widths.length - 1][1]; };
  const outer = [], inner = [];
  const N = 7;
  for (let i = 0; i <= N; i++) {
    const t = t0 + (t1 - t0) * (i / N), env = Math.sin(Math.PI * (i / N)) ** 0.6;
    const c = lerpP(a, b, t), hw = wAt(t) / 2;
    outer.push(add(c, mul(p, s * hw * (from + (to - from) * env))));
    inner.unshift(add(c, mul(p, s * hw * from)));
  }
  return smooth([...outer, ...inner.slice(1, -1)]);
}

// профили толщины
const W = {
  ua: [[0, 6.6], [0.35, 6.4], [0.75, 5.2], [1, 4.4]],
  fa: [[0, 4.6], [0.3, 5], [1, 3.4]],
  th: [[0, 9.6], [0.35, 8.6], [1, 6]],
  sh: [[0, 5.8], [0.3, 6.4], [0.75, 4.4], [1, 3.6]],
};
// профиль корпуса сбоку: [высота по оси корпуса, вперёд (+n), назад (−n)]
const TORSO_SIDE = [[-2, 4.2, -5.6], [1.5, 4.8, -6.4], [5, 4.6, -5], [10, 4.1, -4.1], [15.5, 5.1, -4.5], [20.5, 6.2, -5.2], [24.5, 4.8, -4.8], [27.4, 2.6, -3.2]];
// спереди: [высота, полуширина]
const TORSO_FRONT = [[-2, 7.6], [2, 8.2], [6, 7.4], [10, 6.6], [15.5, 7.6], [20.5, 9.2], [24.5, 9.8], [27.4, 7.8]];

const tAt = (prof, y, col) => {
  if (y <= prof[0][0]) return prof[0][col];
  for (let i = 1; i < prof.length; i++) if (y <= prof[i][0]) { const a = prof[i - 1], b = prof[i]; return a[col] + (b[col] - a[col]) * ((y - a[0]) / (b[0] - a[0])); }
  return prof[prof.length - 1][col];
};

function torsoPath(J) {
  const at = (y, off) => add(add(J.hip, mul(J.u, y)), mul(J.front ? J.side : J.n, off));
  if (J.front) {
    const r = TORSO_FRONT.map(([y, w]) => at(y, w)), l = TORSO_FRONT.map(([y, w]) => at(y, -w)).reverse();
    return smooth([...r, ...l]);
  }
  const f = TORSO_SIDE.map(([y, fr]) => at(y, fr)), b = TORSO_SIDE.map(([y, , bk]) => at(y, bk)).reverse();
  return smooth([...f, ...b]);
}
// область на корпусе: side 'front' | 'back' | 'mid' (для косых), y0..y1 по оси, доли от края
function torsoRegion(J, side, y0, y1, from, to) {
  const at = (y, off) => add(add(J.hip, mul(J.u, y)), mul(J.n, off));
  const N = 7, outer = [], inner = [];
  for (let i = 0; i <= N; i++) {
    const y = y0 + (y1 - y0) * (i / N), env = 0.55 + 0.45 * Math.sin(Math.PI * (i / N));
    const fr = tAt(TORSO_SIDE, y, 1), bk = tAt(TORSO_SIDE, y, 2);
    if (side === 'mid') { outer.push(at(y, fr * to * env)); inner.unshift(at(y, bk * from * env)); continue; }
    const edge = side === 'front' ? fr : bk;
    outer.push(at(y, edge * (from + (to - from) * env)));
    inner.unshift(at(y, edge * from));
  }
  return smooth([...outer, ...inner]);
}
function torsoRegionFront(J, x0, x1, y0, y1, mirror = true) {
  const at = (y, x) => add(add(J.hip, mul(J.u, y)), mul(J.side, x));
  const one = (s) => {
    const pts = [], N = 6;
    for (let i = 0; i <= N; i++) { const y = y0 + (y1 - y0) * (i / N), e = 0.6 + 0.4 * Math.sin(Math.PI * i / N); pts.push(at(y, s * (x0 + (x1 - x0) * e))); }
    for (let i = N; i >= 0; i--) { const y = y0 + (y1 - y0) * (i / N); pts.push(at(y, s * x0)); }
    return smooth(pts);
  };
  return mirror ? one(1) + one(-1) : one(1);
}

// передняя сторона сегмента конечности: туда, куда сгибается сустав (руки) или противоположно (ноги)
function interiorDir(a, j, b, seg0, seg1, fallback) {
  // вектор от сустава к дальнему концу второго сегмента, перпендикулярно первому сегменту
  const d = nrm(sub(seg1, seg0));
  const v = sub(b, j), along = dot(v, d);
  const pv = sub(v, mul(d, along));
  if (len(pv) < 2.2) { const fb = sub(fallback, mul(d, dot(fallback, d))); return len(fb) < 0.05 ? perp(d) : nrm(fb); }
  return nrm(pv);
  void a;
}

function anatomy(J) {
  const faceDir = J.n;
  const arms = J.arms.map((A) => {
    // бицепс — со стороны, куда сгибается локоть
    const antUA = interiorDir(A.root, A.el, A.hd, A.root, A.el, faceDir);
    const antFA = interiorDir(A.hd, A.el, A.root, A.el, A.hd, faceDir);
    return { ...A, antUA, antFA };
  });
  const legs = J.legs.map((Lg) => {
    // колено сгибается назад: сторона бедра, куда уходит голень — задняя (бицепс бедра)
    const postTH = interiorDir(Lg.root, Lg.kn, Lg.an, Lg.root, Lg.kn, mul(faceDir, -1));
    const postSH = interiorDir(Lg.an, Lg.kn, Lg.root, Lg.kn, Lg.an, mul(faceDir, -1));
    const antSH = mul(postSH, -1);
    // ступня: перпендикулярно голени, носком вперёд (или как задано в шаблоне)
    const sd = nrm(sub(Lg.an, Lg.kn));
    let fd = Lg.toeDir ? nrm(Lg.toeDir) : nrm(add(mul(antSH, 1), mul(sd, 0.12)));
    if (J.front) fd = nrm(add(sd, [0, 0]));
    return { ...Lg, postTH, antTH: mul(postTH, -1), postSH, antSH, fd };
  });
  return { arms, legs };
}

function footPath(Lg, front) {
  if (front) { const c = add(Lg.an, [0, 1.6]); return `M${P(add(c, [-2.6, -1]))} Q${P(add(c, [0, -2.4]))} ${P(add(c, [2.6, -1]))} L${P(add(c, [2.8, 1.2]))} Q${P(add(c, [0, 2.2]))} ${P(add(c, [-2.8, 1.2]))}Z`; }
  const fd = Lg.fd, up = perp(fd);
  const s = dot(up, sub(Lg.kn, Lg.an)) > 0 ? 1 : -1; // «верх» стопы — к колену
  const heel = add(Lg.an, mul(fd, -2.2)), toe = add(Lg.an, mul(fd, 6.8));
  const pts = [add(heel, mul(up, s * 1.6)), add(Lg.an, mul(up, s * 2.4)), add(lerpP(Lg.an, toe, 0.65), mul(up, s * 1.5)), toe, add(lerpP(Lg.an, toe, 0.5), mul(up, -s * 1.5)), add(heel, mul(up, -s * 1.5))];
  return smooth(pts);
}

function headPath(J) {
  const c = J.head, up = nrm(sub(J.head, J.neck)), fw = J.front ? [0, 0] : faceVec(J, up);
  const r = 5.4, rv = 6.5;
  const side = perp(up);
  const pts = [];
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    let p = add(add(c, mul(up, Math.cos(a) * rv)), mul(side, Math.sin(a) * r));
    pts.push(p);
  }
  let d = smooth(pts);
  if (!J.front) { // намёк на лицо: нос со стороны взгляда
    const nose = add(add(c, mul(fw, r + 0.6)), mul(up, -0.6));
    d += `M${P(add(c, mul(fw, r - 0.8)))} L${P(nose)} L${P(add(add(c, mul(fw, r - 0.6)), mul(up, -2.2)))}Z`;
  }
  return d;
}
function faceVec(J, up) { const s = dot(perp(up), J.n) >= 0 ? 1 : -1; return mul(perp(up), s); }

function drawPart(d, cls) { return pathEl(d, cls); }

// подсветка мышцы (main — основная, cls — fx-hl / fx-hl2)
function muscleShapes(J, A, muscle, cls, which) {
  const out = [];
  const arm = (i) => A.arms[i], leg = (i) => A.legs[i];
  const both = J.front ? [0, 1] : [which];
  const R2 = (d) => pathEl(d, cls);
  switch (muscle) {
    case 'biceps': both.forEach((i) => out.push(R2(J.front ? limbRegion(arm(i).root, arm(i).el, W.ua, perp(nrm(sub(arm(i).el, arm(i).root))), 0.15, 0.88, -0.55, 0.55) : limbRegion(arm(i).root, arm(i).el, W.ua, arm(i).antUA, 0.16, 0.9)))); break;
    case 'triceps': both.forEach((i) => out.push(R2(J.front ? limbRegion(arm(i).root, arm(i).el, W.ua, mul(arm(i).antUA, -1), 0.1, 0.85, 0.35, 1.02) : limbRegion(arm(i).root, arm(i).el, W.ua, mul(arm(i).antUA, -1), 0.1, 0.9)))); break;
    case 'forearms': both.forEach((i) => out.push(R2(limbRegion(arm(i).el, arm(i).hd, W.fa, arm(i).antFA, 0.05, 0.8, -0.9, 1.02)))); break;
    case 'shoulders': both.forEach((i) => { const a = arm(i), c = lerpP(a.root, a.el, 0.12); out.push(`<ellipse cx="${f1(c[0])}" cy="${f1(c[1])}" rx="4.6" ry="4.6" class="${cls}"/>`); }); break;
    case 'quads': both.forEach((i) => out.push(R2(J.front ? limbRegion(leg(i).root, leg(i).kn, W.th, [1, 0], 0.12, 0.92, -0.75, 0.75) : limbRegion(leg(i).root, leg(i).kn, W.th, leg(i).antTH, 0.1, 0.94)))); break;
    case 'hamstrings': both.forEach((i) => out.push(R2(J.front ? limbRegion(leg(i).root, leg(i).kn, W.th, [1, 0], 0.15, 0.9, -0.7, 0.7) : limbRegion(leg(i).root, leg(i).kn, W.th, leg(i).postTH, 0.12, 0.94)))); break;
    case 'adductors': both.forEach((i) => out.push(R2(J.front ? limbRegion(leg(i).root, leg(i).kn, W.th, mul(J.side, i === 0 ? 1 : -1), 0.05, 0.7, 0.05, 1.02) : limbRegion(leg(i).root, leg(i).kn, W.th, leg(i).antTH, 0.08, 0.7, -0.45, 0.45)))); break;
    case 'calves': both.forEach((i) => out.push(R2(J.front ? limbRegion(leg(i).kn, leg(i).an, W.sh, [1, 0], 0.08, 0.7, -0.8, 0.8) : limbRegion(leg(i).kn, leg(i).an, W.sh, leg(i).postSH, 0.06, 0.72)))); break;
    case 'glutes': out.push(R2(J.front ? torsoRegionFront(J, 0.5, 7.6, -2, 4) : torsoRegion(J, 'back', -2.5, 6, 0.15, 1.05))); break;
    case 'chest': out.push(R2(J.front ? torsoRegionFront(J, 0.6, 8.6, 16.5, 24.2) : torsoRegion(J, 'front', 15, 24.5, 0.2, 1.04))); break;
    case 'abs': out.push(R2(J.front ? torsoRegionFront(J, 0.4, 3.8, 2.5, 15, true) : torsoRegion(J, 'front', 2.5, 14.5, 0.15, 1.04))); break;
    case 'obliques': out.push(R2(J.front ? torsoRegionFront(J, 4.2, 7.4, 3, 14.5) : torsoRegion(J, 'mid', 3, 14, 0.45, 0.75))); break;
    case 'lats': out.push(R2(J.front ? torsoRegionFront(J, 6.4, 9.6, 12, 21.5) : torsoRegion(J, 'back', 10.5, 22.5, 0.2, 1.04))); break;
    case 'lowerback': out.push(R2(J.front ? torsoRegionFront(J, 0.3, 4, 1, 10) : torsoRegion(J, 'back', 1, 10.5, 0.12, 1.04))); break;
    case 'traps': out.push(R2(J.front ? torsoRegionFront(J, 2, 8.2, 24, 28.6) : torsoRegion(J, 'back', 21, 28.2, 0.05, 1.05))); break;
    case 'neck': out.push(R2(limbPath(J.sh, J.neck, [[0, 4.6], [1, 4]]))); break;
    default: break;
  }
  return out.join('');
}

// ---------- сборка кадра ----------
function frame(ex, k) {
  const { tpl, eq, eqNear } = templateFor(ex);
  const pose = lerp(tpl.a, tpl.b, k);
  const J = solve(pose);
  const A = anatomy(J);
  const fA = A.arms[0], nA = A.arms[1], fL = A.legs[0], nL = A.legs[1];
  A.legs.forEach((Lg, i) => { J.legs[i].toe = add(Lg.an, mul(Lg.fd, 6.8)); });
  const main = ex.muscle, sec = (ex.secondary || []).slice(0, 3);
  const out = [];
  out.push(`<ellipse cx="${f1(J.hip[0] + 2)}" cy="${GROUND + 1}" rx="34" ry="2.6" class="fx-shadow"/>`);
  if (tpl.back) out.push(tpl.back(J));

  const hl = (part) => {
    // part: 'farLeg' | 'farArm' | 'torso' | 'nearLeg' | 'nearArm'
    const isFar = part.startsWith('far'), isLeg = part.endsWith('Leg'), isArm = part.endsWith('Arm');
    const pick = (m) => {
      const legM = ['quads', 'hamstrings', 'calves', 'adductors'].includes(m);
      const armM = ['biceps', 'triceps', 'forearms', 'shoulders'].includes(m);
      if (part === 'torso') return !legM && !armM;
      return (isLeg && legM) || (isArm && armM);
    };
    const idx = isFar ? 0 : 1;
    let s = '';
    if (J.front && (isFar)) return ''; // спереди обе стороны рисуются вместе с ближними
    sec.forEach((m) => { if (pick(m)) s += muscleShapes(J, A, m, isFar ? 'fx-hl2 fx-dim' : 'fx-hl2', idx); });
    if (pick(main)) s += muscleShapes(J, A, main, isFar ? 'fx-hl fx-dim' : 'fx-hl', idx);
    return s;
  };
  const leg = (Lg, cls) => drawPart(limbPath(Lg.root, Lg.kn, W.th), cls) + drawPart(limbPath(Lg.kn, Lg.an, W.sh), cls) + drawPart(footPath(Lg, J.front), cls);
  const arm = (Ar, cls) => drawPart(limbPath(Ar.root, Ar.el, W.ua), cls) + drawPart(limbPath(Ar.el, Ar.hd, W.fa), cls) + circ(add(Ar.hd, mul(nrm(sub(Ar.hd, Ar.el)), 1.2)), 2.4, cls);
  const farCls = J.front ? 'fx-part' : 'fx-part fx-farp';

  // дальние конечности
  out.push(leg(fL, farCls), hl('farLeg'));
  if (!J.front) out.push(arm(fA, farCls), hl('farArm'));
  // шея, корпус, голова
  out.push(drawPart(limbPath(J.sh, J.neck, [[0, 5.2], [1, 4.4]]), 'fx-part'));
  out.push(drawPart(torsoPath(J), 'fx-part'), hl('torso'));
  if (main === 'neck' || sec.includes('neck')) out.push(muscleShapes(J, A, 'neck', main === 'neck' ? 'fx-hl' : 'fx-hl2', 1));
  out.push(drawPart(headPath(J), 'fx-part fx-headp'));
  // ближняя нога
  if (J.front) out.push(leg(fL, 'fx-part'));
  out.push(leg(nL, 'fx-part'), hl('nearLeg'));
  if (J.front) out.push(arm(fA, 'fx-part'));
  // снаряды за ближней рукой
  const handEq = (type, h) => (type === 'db' ? EQ.db(h) : type === 'dbV' ? EQ.dbV(h) : type === 'barbell' ? EQ.plate(h, tpl.plateR || 8.5) : '');
  if (eq === 'barbell' || eqNear) out.push(handEq(eq || eqNear, nA.hd));
  if (eq === 'db' && !J.front) out.push(EQ.db(fA.hd));
  if (eq === 'barbellBack') out.push(EQ.plate(add(J.sh, mul(J.n, -3)), 8.5));
  if (eq === 'chestPlate') out.push(EQ.plate(add(J.sh, mul(J.n, 5)), 8.5));
  if (eq === 'dbV1') out.push(EQ.dbV(add(J.sh, add(mul(J.n, 7), mul(J.u, -4)))));
  if (tpl.eqHip) out.push(EQ.plate(add(J.hip, mul(J.n, 4)), 8.5));
  if (eq === 'frontBar') out.push(`${rect(f1(fA.hd[0] - 12), f1(fA.hd[1] - 1), f1(nA.hd[0] - fA.hd[0] + 24), 2.2, 'fx-bar', 1)}${rect(f1(fA.hd[0] - 14), f1(fA.hd[1] - 8), 4, 16, 'fx-dbh', 1.5)}${rect(f1(nA.hd[0] + 10), f1(nA.hd[1] - 8), 4, 16, 'fx-dbh', 1.5)}`);
  // ближняя рука
  out.push(arm(nA, 'fx-part'), hl('nearArm'));
  if (eq === 'db' && !J.front) out.push(EQ.db(nA.hd));
  if (eq === 'db' && J.front) out.push(EQ.dbV(nA.hd), EQ.dbV(fA.hd));
  if (eq === 'dbV') out.push(EQ.dbV(nA.hd), EQ.dbV(fA.hd));
  if (eq === 'barbell') out.push(EQ.plate(nA.hd, tpl.plateR || 8.5));
  if (tpl.front) out.push(tpl.front(J));
  if (tpl.rope) {
    const y = k < 0.5 ? -14 + k * 40 : GROUND + 2;
    const mid = [58, k < 0.5 ? -10 + k * 30 : GROUND + 3 - (k - 0.5) * 6];
    out.push(`<path d="M${f1(fA.hd[0])} ${f1(fA.hd[1])} Q ${mid[0]} ${f1(y)} ${f1(nA.hd[0])} ${f1(nA.hd[1])}" class="fx-cable" />`);
  }
  return out.join('');
}

// плавность: туда-обратно с паузами в крайних точках
function phase(tMs, dur = 2600) {
  const x = (tMs % dur) / dur; // 0..1
  const tri = x < 0.5 ? x * 2 : 2 - x * 2; // 0..1..0
  const held = clamp((tri - 0.08) / 0.84, 0, 1);
  return 0.5 - 0.5 * Math.cos(Math.PI * held);
}

export function exerciseFigure(ex, { cls = '', still = false } = {}) {
  const k = typeof still === 'number' ? still : still ? 0.55 : 0;
  return `<svg class="fx ${cls}" viewBox="0 -14 120 112" ${still ? '' : `data-fx="${ex.id}"`} aria-hidden="true">
    <line x1="0" y1="${GROUND + 1}" x2="120" y2="${GROUND + 1}" class="fx-ground"/>
    <g class="fx-g">${frame(ex, k)}</g></svg>`;
}

// ---------- общий цикл анимации для всех видимых фигур ----------
const live = new Map(); // svg -> ex
let raf = 0;
const io = typeof IntersectionObserver !== 'undefined' ? new IntersectionObserver((entries) => {
  entries.forEach((e) => { e.target._fxVisible = e.isIntersecting; });
}, { rootMargin: '60px' }) : null;

function loop(t) {
  raf = requestAnimationFrame(loop);
  live.forEach((ex, svg) => {
    if (!svg.isConnected) { live.delete(svg); io && io.unobserve(svg); return; }
    if (io && !svg._fxVisible) return;
    const offset = svg._fxOffset || 0;
    const g = svg.querySelector('.fx-g');
    g.innerHTML = frame(ex, phase(t + offset, ex._dur || 2600));
  });
  if (!live.size) { cancelAnimationFrame(raf); raf = 0; }
}

export function animateFigures(root, getEx) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  root.querySelectorAll('svg[data-fx]').forEach((svg, i) => {
    if (live.has(svg)) return;
    const ex = getEx(svg.dataset.fx);
    if (!ex) return;
    svg._fxOffset = (i * 370) % 2600;
    live.set(svg, ex);
    if (io) io.observe(svg); else svg._fxVisible = true;
  });
  if (live.size && !raf) raf = requestAnimationFrame(loop);
}

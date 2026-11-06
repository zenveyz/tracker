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
  const pt = (s) => (s[0] === 't' ? add(add(sh, mul(u, s[1])), mul(n, s[2])) : s);
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
    const td = p.toe ? p.toe[i] : front ? [0, 0] : [6, 0];
    const toe = Array.isArray(td) && td.length === 2 && typeof td[0] === 'number' && p.toeAbs ? td : add(an, td);
    return { root, kn, an, toe };
  });
  return { hip, sh, u, n, t, head, neck, arms, legs, front };
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
    a: { hip: [52, 81], sh: [78, 78], hands: [[94, 93], [94, 93]], feet: [[14, 92], [17, 92]], toe: [[2, 1], [2, 1]] },
    b: { hip: [52, 78], sh: [78, 77], hands: [[94, 93], [94, 93]], feet: [[14, 92], [17, 92]], toe: [[2, 1], [2, 1]] },
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
    a: { hip: [58, 58], sh: [60, 32], hands: [[61, 58], [61, 58]], feet: [[46, 80], [44, 80]] },
    b: { hip: [55, 70], sh: [65, 46], hands: [[61, 58], [61, 58]], feet: [[42, 90], [40, 90]] },
    back: () => `${EQ.bar(44, 78, 59)}${rect(46, 59, 2.5, 35, 'fx-frame', .6)}${rect(74, 59, 2.5, 35, 'fx-frame', .6)}`,
  },
  dipsT: {
    a: { hip: [59, 58], sh: [60, 32], hands: [[61, 58], [61, 58]], feet: [[48, 80], [46, 80]] },
    b: { hip: [59, 68], sh: [61, 43], hands: [[61, 58], [61, 58]], feet: [[48, 86], [46, 86]] },
    back: () => `${EQ.bar(44, 78, 59)}${rect(46, 59, 2.5, 35, 'fx-frame', .6)}${rect(74, 59, 2.5, 35, 'fx-frame', .6)}`,
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
    b: { hip: [54, 70], t: -16, hands: [['t', 0, 9], ['t', 0, 9]], es: [-1, -1], feet: [[78, 93], [81, 93]] },
    back: () => `${EQ.post(98)}${rect(56, -10, 44, 3, 'fx-frame', 1)}${EQ.pulley([60, -6])}${rect(38, 72, 28, 4.5, 'fx-pad', 2)}${rect(50, 76, 2.5, 18, 'fx-frame', .6)}${circ([74, 63], 3.5, 'fx-pad')}`,
    front: (J) => `${EQ.cable([60, -6], J.arms[1].hd)}${rect(J.arms[1].hd[0] - 12, J.arms[1].hd[1] - 1, 24, 2.2, 'fx-bar', 1)}`,
  },
  seatedRow: {
    a: { hip: [42, 80], t: 22, hands: [[84, 72], [84, 72]], feet: [[88, 86], [90, 86]], toe: [[0, -6], [0, -6]] },
    b: { hip: [42, 80], t: -8, hands: [['t', 8, 9], ['t', 8, 9]], feet: [[88, 86], [90, 86]], toe: [[0, -6], [0, -6]] },
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

// ---------- подсветка мышц на фигуре ----------
function torsoMark(J, from, to, off, w) {
  const a = add(add(J.hip, mul(J.u, from)), mul(J.n, off));
  const b = add(add(J.hip, mul(J.u, to)), mul(J.n, off));
  return line(a, b, w, 'fx-hl');
}
function hlShapes(J, muscle, cls) {
  const near = J.arms[1], nl = J.legs[1];
  const far = J.arms[0], fl = J.legs[0];
  const seg = (a, b, w) => line(a, b, w, cls);
  switch (muscle) {
    case 'biceps': case 'triceps': return seg(near.root, near.el, 5.2) + (J.front ? seg(far.root, far.el, 5.2) : '');
    case 'forearms': return seg(near.el, near.hd, 4.6) + (J.front ? seg(far.el, far.hd, 4.6) : '');
    case 'quads': case 'hamstrings': return seg(nl.root, nl.kn, 6.4) + (J.front ? seg(fl.root, fl.kn, 6.4) : '');
    case 'calves': return seg(nl.kn, nl.an, 5.4) + (J.front ? seg(fl.kn, fl.an, 5.4) : '');
    case 'shoulders': return circ(near.root, 4.4, cls) + (J.front ? circ(far.root, 4.4, cls) : '');
    case 'glutes': return circ(add(J.hip, mul(J.n, J.front ? 0 : -2.5)), 5.2, cls);
    case 'chest': return torsoMark(J, 17, 24, J.front ? 0 : 2.2, J.front ? 10 : 4.6).replace('fx-hl', cls);
    case 'abs': return torsoMark(J, 3, 15, J.front ? 0 : 2.4, J.front ? 6 : 4).replace('fx-hl', cls);
    case 'obliques': return torsoMark(J, 4, 14, 0, J.front ? 9 : 5).replace('fx-hl', cls);
    case 'lats': return torsoMark(J, 12, 23, J.front ? 0 : -2.4, J.front ? 11 : 4.6).replace('fx-hl', cls);
    case 'lowerback': return torsoMark(J, 2, 10, J.front ? 0 : -2.4, 4.2).replace('fx-hl', cls);
    case 'traps': return seg(add(J.sh, mul(J.n, J.front ? 0 : -1.5)), J.neck, 5);
    default: return '';
  }
}

// ---------- сборка кадра ----------
function frame(ex, k) {
  const { tpl, eq, eqNear } = templateFor(ex);
  const pose = lerp(tpl.a, tpl.b, k);
  const J = solve(pose);
  const fA = J.arms[0], nA = J.arms[1], fL = J.legs[0], nL = J.legs[1];
  const out = [];
  // тень
  out.push(`<ellipse cx="${f1(J.hip[0] + 2)}" cy="${GROUND + 1}" rx="34" ry="2.6" class="fx-shadow"/>`);
  if (tpl.back) out.push(tpl.back(J));
  const limb = (a, b, c, w, cls) => `<polyline points="${f1(a[0])},${f1(a[1])} ${f1(b[0])},${f1(b[1])} ${f1(c[0])},${f1(c[1])}" stroke-width="${w}" class="${cls}"/>`;
  const farCls = J.front ? 'fx-body' : 'fx-far';
  // дальние конечности
  out.push(limb(fL.root, fL.kn, fL.an, 6.6, farCls), line(fL.an, fL.toe, 4, farCls));
  if (!J.front) out.push(limb(fA.root, fA.el, fA.hd, 5.4, farCls));
  // корпус
  const hipC = J.front ? `${line(add(J.hip, mul([Math.cos(J.t * R), Math.sin(J.t * R)], -5)), add(J.hip, mul([Math.cos(J.t * R), Math.sin(J.t * R)], 5)), 9, 'fx-body')}` : '';
  out.push(line(J.hip, add(J.sh, mul(J.u, -1)), J.front ? 14 : 10.5, 'fx-body'), hipC);
  if (J.front) out.push(line(fA.root, nA.root, 7, 'fx-body'));
  out.push(line(J.sh, J.neck, 4.5, 'fx-body'));
  out.push(circ(J.head, L.HR, 'fx-head'));
  // подсветка
  const main = ex.muscle, sec = (ex.secondary || []).slice(0, 3);
  sec.forEach((m) => out.push(hlShapes(J, m, 'fx-hl2')));
  out.push(hlShapes(J, main, 'fx-hl'));
  // ближние конечности
  out.push(limb(nL.root, nL.kn, nL.an, 6.6, 'fx-body'), line(nL.an, nL.toe, 4, 'fx-body'));
  // повторная подсветка ног поверх
  if (['quads', 'hamstrings', 'calves', 'glutes'].includes(main)) out.push(hlShapes(J, main, 'fx-hl'));
  if (J.front) out.push(limb(fA.root, fA.el, fA.hd, 5.4, 'fx-body'));
  // оборудование в руках (за ближней рукой)
  const handEq = (type, h) => {
    if (type === 'db') return EQ.db(h);
    if (type === 'dbV') return EQ.dbV(h);
    if (type === 'barbell') return EQ.plate(h, tpl.plateR || 8.5);
    return '';
  };
  if (eq === 'barbell' || eqNear) out.push(handEq(eq || eqNear, nA.hd));
  if (eq === 'db' && !J.front) out.push(EQ.db(fA.hd));
  if (eq === 'barbellBack') out.push(EQ.plate(add(J.sh, mul(J.n, -3)), 8.5));
  if (eq === 'chestPlate') out.push(EQ.plate(add(J.sh, mul(J.n, 5)), 8.5));
  if (eq === 'dbV1') out.push(EQ.dbV(add(J.sh, add(mul(J.n, 7), mul(J.u, -4)))));
  if (tpl.eqHip) out.push(EQ.plate(add(J.hip, mul(J.n, 4)), 8.5));
  if (eq === 'frontBar') out.push(`${rect(f1(fA.hd[0] - 12), f1(fA.hd[1] - 1), f1(nA.hd[0] - fA.hd[0] + 24), 2.2, 'fx-bar', 1)}${rect(f1(fA.hd[0] - 14), f1(fA.hd[1] - 8), 4, 16, 'fx-dbh', 1.5)}${rect(f1(nA.hd[0] + 10), f1(nA.hd[1] - 8), 4, 16, 'fx-dbh', 1.5)}`);
  out.push(limb(nA.root, nA.el, nA.hd, 5.4, 'fx-body'));
  if (['biceps', 'triceps', 'forearms', 'shoulders'].includes(main)) out.push(hlShapes(J, main, 'fx-hl'));
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

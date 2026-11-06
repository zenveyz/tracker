// Разметка мышц по схеме (координаты модели, см). Используется сборщиком.
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

export function label(x, y, z) {
  const ax = Math.abs(x), s = x >= 0 ? 'R' : 'L';
  const P = [ax, y, z];
  // круглая коленная чашечка спереди
  if (Math.hypot(ax - 15.7, y - 52.5, z - (-4.6)) < 4.1) return ['base', `base:${s}:kneecap`, 'base'];
  let part = partOf(P);
  if (part === 'thigh' && y < 50.5) part = 'shin';   // ниже коленного сустава — уже голень
  // верх бедра спереди до паховой линии — это мышцы бедра, а не «туловище»
  if (part === 'torso' && z > -8 && ax > 4 && y < 93 + ax * 0.85 - 0.6) part = 'thigh';
  // запястье: нижняя часть предплечья, которую ближе отнесло к кисти
  if (part === 'hand' && seg(P, BONES.hand).t < 0.14) part = 'farm';
  // одна мышца на группу: внутренние части (головки, доли) не делим
  const M = (g, sub, color) => { const c = color || g; return [g, `${g}:${s}:${c}`, c]; };
  const MS = (g, sub, color) => { const c = color || g; return [g, `${g}:${s}:${sub}:${c}`, c]; };   // отдельная часть мышцы — с линией между частями
  const B = (sub, sided = true) => ['base', sided ? `base:${s}:${sub}` : `base:${sub}`, 'base'];
  // ягодицы по модели: выпуклость ~104 см, складка ~94,5 см, верх ~116 см
  const glute = () => z < -8 && ax < 19 && blob(ax, y, 9.2, 105.2, 10.8, 11.2, 2.3) && y > 94.3 + ax * 0.04;
  const bone = (k) => seg(P, BONES[k]);
  switch (part) {
    case 'uarm': {
      const { t, d } = bone('uarm');
      const th = Math.atan2(d[0], d[2]);
      const dO = Math.abs(wrap(th - PI / 2));
      const tMax = 0.32 - 0.15 * Math.pow(dO / 1.9, 1.25);   // нижний край дельты по модели: ~145 см снаружи
      if (dO < 2.15 && t < tMax) return M('shoulders');
      // ниже дельты: спереди бицепс, сзади трицепс — сплошь до локтя, как на схеме
      if (t > 0.86 && Math.cos(th - 0.25) > -0.1) return M('forearms');  // у локтя спереди начинается предплечье
      return Math.cos(th - 0.25) > -0.1 ? M('biceps') : M('triceps');
    }
    case 'farm': {
      const { t, d } = bone('farm');
      const th = Math.atan2(d[0], d[2]);
      if (t > 0.95) return B('wrist');
      // наружная (синяя) и внутренняя (бирюзовая) группы — сплошь от локтя до запястья
      return th > -0.25 && th < 2.7 ? M('forearms', 'o', 'forearmsO') : M('forearms', 'i', 'forearmsI');
    }
    case 'thigh': {
      // t: 0 — тазобедренный сустав, 1 — колено; th: 0 — спереди, +π/2 — снаружи, −π/2 — изнутри, ±π — сзади
      const { t, d } = bone('thigh');
      const th = Math.atan2(d[0], d[2]);
      const ph = wrap(th - PI);
      const back = Math.abs(ph) < PI / 2;
      // сзади: ягодицы до ягодичной складки
      if (back && glute()) return M('glutes');
      if (back && y > 94 + Math.abs(ph) * 1.2) return M('glutes');            // средняя ягодичная — над бедром сбоку
      if (!back || Math.abs(th) < 1.75) {
        // спереди и снаружи
        if (th > 1.15 - 0.5 * t && th < 1.85 && t < 0.55) return M('quads', 'tfl', 'adductors');   // наружная розовая полоса (напрягатель фасции)
        if (th < 0.12 - 1.5 * t && th > -1.85 && t < 0.84) return M('adductors');         // розовый клин: у паха — половина бедра, к колену сужается
        if (th < -0.72) return M('quads');                                                 // у колена изнутри — медиальная головка
        if (th >= -0.72 && th <= 1.85) {
          // три головки квадрицепса: прямая (веретено по центру), латеральная (снаружи), медиальная (капля внутри у колена)
          const half = 0.42 * Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.45) / 0.5, 2)));
          if (Math.abs(th - 0.12) < half) return M('quads', 'rf');
          if (th > 0.12) return M('quads', 'vl');
          return M('quads', 'vm');
        }
      }
      // сзади
      if (Math.abs(ph) < 0.95) return MS('hamstrings', ph > 0.05 - 0.25 * t ? 'in' : 'out');             // две головки задней поверхности до колена
      if (ph >= 0.95 && ph < 1.75) return M('adductors', 'b', 'adductorsB');                // изнутри сзади
      if (ph <= -0.95 && ph > -1.75) return M('quads', 'vlb', 'adductorsB');                // снаружи сзади
      return B('thigh');
    }
    case 'shin': {
      // t: 0 — колено, 1 — лодыжка; th: 0 — спереди, + наружу; ph: 0 — сзади
      const { t, d } = bone('shin');
      const th = Math.atan2(d[0], d[2]);
      const ph = wrap(th - PI);
      if (t > 0.9) return B('legskin');
      // икры: округлая мышца сзади, поднята выше — от подколенной ямки до ~2/3 голени
      // спереди изнутри видна только внутренняя головка икры — бирюзовый овал, как на схеме
      const ft = (t - 0.36) / 0.26;
      if (Math.abs(ft) < 1 && Math.abs(th + 1.3) < 0.42 * Math.sqrt(1 - ft * ft)) return M('calves', 'front', 'tibialis');
      // сзади: две головки икры, сверху округлые, книзу сходятся клином
      const ct = (t - 0.3) / 0.38;
      const w = ct <= 0 ? (ct > -1 ? 1.75 * Math.sqrt(1 - ct * ct) : 0) : Math.max(0, 1.75 * (1 - ct));
      if (Math.abs(ph) < w) return MS('calves', ph > 0 ? 'm' : 'l');
      return B('legskin');   // перед голени — белый, как на схеме
    }
    case 'torso': {
      const front = z > -5;
      if (front) {
        const k = Math.min(ax, 21) / 21;
        const yt = 163 - 6.5 * Math.pow(k, 1.3);                       // ключица → плечо
        const yb = 141.2 + Math.pow(Math.max(0, ax - 14) / 7, 2) * 9;  // нижняя складка груди по модели (141 см → 150 у подмышки)
        if (ax > 0.25 && ax < 21.5 && y < yt && y > yb) return M('chest');
        if (ax >= 20 && y > yb) return M('shoulders');
        if (y > 164) return ['neck', ax < 0.6 + (y - 164) * 0.3 ? 'neck:c' : `neck:${s}`, 'neck'];   // шея: V-линия мышц к яремной ямке
        const absW = 7.2 - 1.6 * Math.max(0, (104 - y) / 9);
        const vLine = 93 + ax * 0.85;
        if (ax < absW && y < yb - 0.3 && y > Math.max(94, vLine - 0.8)) {
          return M('abs');
        }
        if (y > vLine && y < yb && ax < 21) return M('obliques');
        return B('groin', false);
      }
      // трапеция — одна мышца: от шеи к плечам и ромбом вниз до середины спины
      if (y > 164 && ax < 7) return M('traps');
      if (y > 150 + ax * 0.5) return M('traps');
      if (y > 131 && ax < 10.5 * (y - 131) / 19) return M('traps');
      if (ax > 20 && y > 138) return M('shoulders');
      // ягодицы — две выделенные округлые мышцы
      if (glute()) return M('glutes');
      // поперечная линия на талии: выше — широчайшие, ниже — поясница до ягодиц
      const waist = 123;                         // поперечная линия: конец широчайших
      if (y >= waist && ax < 22) return M('lats');
      if (y < waist && y > 100 && ax < 18.5) return M('lowerback');   // поясница — над ягодицами
      if (y < waist && y > 95 && ax >= 18.5) return M('obliques');      // бока талии
      if (y < 95.5 && ax < 19) return M('hamstrings');                  // верх бедра сзади — сразу под ягодичной складкой
      return B('back', false);
    }
    case 'neck': return ['neck', z > -4 && ax < 0.6 + (y - 164) * 0.3 ? 'neck:c' : `neck:${s}`, 'neck'];
    case 'hand': return B('hand');
    case 'foot': return B('legskin');
    default: return ['base', 'base', 'base'];
  }
}


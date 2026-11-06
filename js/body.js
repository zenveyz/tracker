import { MUSCLES } from './data/exercises.js';

// Анатомическая схема тела (вид спереди и сзади), стилизованная иллюстрация.
// Координаты левой половины (центр x = 150), правая половина зеркалится.
// Размер одной фигуры: 300 × 640.

const rr = (x1, y1, x2, y2, r = 5) =>
  `M${x1 + r} ${y1} L${x2 - r} ${y1} Q${x2} ${y1} ${x2} ${y1 + r} L${x2} ${y2 - r} Q${x2} ${y2} ${x2 - r} ${y2} L${x1 + r} ${y2} Q${x1} ${y2} ${x1} ${y2 - r} L${x1} ${y1 + r} Q${x1} ${y1} ${x1 + r} ${y1} Z`;

// силуэт (то, что видно в «щелях» между мышцами)
const SIL_TORSO = 'M150 88 L137 88 C 136 102 128 113 110 119 C 96 123 86 130 84 142 C 84 156 92 166 100 176 C 104 200 107 228 110 250 C 112 270 108 290 104 306 C 100 332 98 362 100 392 C 102 420 104 440 108 458 C 104 482 102 506 104 530 C 106 556 110 576 112 594 C 106 602 100 610 104 621 L 141 621 C 142 610 137 600 135 593 C 134 562 138 532 138 502 C 138 482 136 468 138 456 C 141 420 144 382 146 342 C 147 332 149 326 150 324 Z';
const SIL_ARM = 'M90 128 C 76 136 71 158 69 182 C 66 206 62 236 58 258 C 52 288 47 314 43 338 C 40 350 46 352 52 350 C 56 344 60 330 64 318 C 70 298 76 282 80 268 C 86 248 90 226 94 206 C 98 190 100 176 100 166 Z';
const HAND = 'M43 338 C 36 346 31 360 30 376 C 29 388 33 398 39 401 C 44 403 49 400 51 392 C 53 380 55 364 58 344 C 54 340 48 338 43 338 Z';
const HAND_LINES = 'M37 372 L35 392 M42 374 L41 398 M47 372 L47 394';
const FOOT = 'M106 596 C 100 604 98 613 103 620 L 140 620 C 141 612 139 603 135 596 Z';
const KNEE = 'M110 452 C 112 446 120 444 128 446 C 134 448 138 452 137 460 C 136 468 128 472 120 471 C 113 470 109 462 110 452 Z';
const NECK_F = 'M137 80 C 138 95 136 108 128 121 L 172 121 C 164 108 162 95 163 80 Z';

const FRONT = {
  muscles: [
    ['traps', 'M139 99 C 131 109 120 116 106 121 C 116 124 128 125 140 124 L 147 121 Z'],
    ['shoulders', 'M112 121 C 96 120 84 128 80 144 C 77 160 76 176 78 192 C 84 186 90 176 94 164 C 98 152 104 142 112 134 C 116 130 117 124 112 121 Z'],
    ['chest', 'M148 128 C 138 125 124 124 114 128 C 106 136 101 148 100 162 C 100 178 104 190 112 197 C 124 203 138 203 148 198 Z'],
    ['biceps', 'M98 168 C 88 178 80 196 76 216 C 73 232 74 246 78 256 C 85 254 90 246 93 234 C 97 216 100 196 100 180 Z'],
    ['triceps', 'M78 194 C 73 208 69 226 67 244 C 67 250 70 255 74 256 C 74 236 76 214 80 198 Z'],
    ['forearms', 'M66 260 C 58 274 52 294 48 314 C 46 324 44 332 45 338 L 52 340 C 56 318 62 296 70 278 C 73 270 73 264 71 259 Z'],
    ['forearms', 'M76 262 C 78 278 74 296 68 314 C 64 326 60 336 56 342 L 53 341 C 57 320 63 298 70 280 C 73 272 75 266 76 262 Z'],
    ['abs', rr(131, 205, 148, 230, 5)],
    ['abs', rr(131, 234, 148, 258, 5)],
    ['abs', rr(131, 262, 148, 286, 5)],
    ['abs', 'M148 290 L134 290 C 131 300 134 312 141 320 C 145 323 148 322 148 322 Z'],
    ['obliques', 'M128 204 C 118 205 111 210 109 222 C 110 244 111 266 109 286 C 116 296 124 304 131 310 C 129 292 128 270 128 250 C 128 232 128 216 128 204 Z'],
    ['obliques', 'M110 182 C 104 186 104 194 108 198 C 114 196 116 188 110 182 Z'],
    ['obliques', 'M109 199 C 104 204 105 211 110 214 C 115 211 115 203 109 199 Z'],
    ['quads', 'M103 314 C 98 342 96 374 99 404 C 101 424 105 440 112 450 C 116 424 118 394 119 364 C 120 342 114 324 103 314 Z'],
    ['quads', 'M121 316 C 117 342 117 372 119 402 C 121 422 124 438 128 448 C 135 434 138 406 138 380 C 138 352 132 330 121 316 Z'],
    ['quads', 'M139 392 C 134 412 133 432 135 450 C 142 454 146 446 145 430 C 144 414 142 402 139 392 Z'],
    ['calves', 'M106 468 C 101 490 101 516 106 542 C 112 532 116 512 116 492 C 116 480 112 471 106 468 Z'],
    ['calves', 'M119 472 C 117 502 117 536 119 572 C 124 566 126 536 126 504 C 126 490 123 479 119 472 Z'],
    ['calves', 'M137 464 C 141 488 141 514 136 540 C 130 526 128 504 128 488 C 128 476 131 467 137 464 Z'],
  ],
  neutral: [
    'M147 332 C 140 342 136 358 135 376 C 141 368 145 358 147 348 Z', // приводящие
    'M134 112 C 140 104 144 96 146 88 L 150 88 L 150 124 C 144 122 138 118 134 112 Z', // шея
  ],
  lines: { center: 'M150 128 L150 322', side: 'M104 312 C 112 330 128 340 146 332 M114 128 C 118 124 128 122 140 124' },
};

const BACK = {
  muscles: [
    ['traps', 'M150 94 L138 94 C 135 108 125 117 107 122 C 114 127 123 135 130 146 C 138 164 144 190 150 218 Z'],
    ['shoulders', 'M108 123 C 93 123 83 132 79 148 C 77 164 77 178 78 192 C 85 185 91 174 95 162 C 99 150 104 141 112 135 Z'],
    ['lats', 'M130 146 C 118 144 106 150 101 164 C 108 174 122 180 136 176 C 140 164 138 152 130 146 Z'],
    ['lats', 'M102 168 C 99 196 103 228 110 256 C 117 268 128 276 141 280 L 147 262 C 143 232 137 206 129 186 C 121 177 111 171 102 168 Z'],
    ['triceps', 'M96 170 C 86 178 79 196 76 218 C 74 236 75 248 80 256 C 86 254 90 246 92 236 C 96 216 98 196 99 182 Z'],
    ['triceps', 'M78 192 C 72 206 68 226 67 244 C 67 250 70 255 74 256 C 74 236 76 214 80 198 Z'],
    ['forearms', 'M66 260 C 58 274 52 294 48 314 C 46 324 44 332 45 338 L 52 340 C 56 318 62 296 70 278 C 73 270 73 264 71 259 Z'],
    ['forearms', 'M76 262 C 78 278 74 296 68 314 C 64 326 60 336 56 342 L 53 341 C 57 320 63 298 70 280 C 73 272 75 266 76 262 Z'],
    ['lowerback', 'M148 222 C 141 234 137 252 137 272 C 137 286 141 296 148 302 Z'],
    ['obliques', 'M110 256 C 106 270 106 286 108 300 C 116 294 122 286 126 276 C 120 272 114 264 110 256 Z'],
    ['glutes', 'M149 304 C 136 299 118 300 108 312 C 102 328 104 348 112 362 C 124 371 140 369 149 362 Z'],
    ['hamstrings', 'M104 366 C 100 392 100 422 105 450 C 110 456 117 454 120 446 C 122 420 122 394 120 370 Z'],
    ['hamstrings', 'M123 372 C 123 398 125 424 129 450 C 136 455 142 450 144 440 C 146 416 146 392 146 370 C 138 374 130 374 123 372 Z'],
    ['calves', 'M106 466 C 100 488 100 514 106 536 C 113 542 121 538 123 524 C 125 502 123 480 116 468 Z'],
    ['calves', 'M125 464 C 124 488 126 514 130 536 C 137 544 143 538 143 520 C 145 496 141 474 132 464 Z'],
  ],
  neutral: [
    'M110 534 C 112 556 114 576 114 592 L 134 592 C 134 570 136 552 138 532 C 130 542 118 542 110 534 Z', // ахиллы / камбаловидная
  ],
  lines: { center: 'M150 96 L150 302', side: 'M130 146 C 124 160 120 172 116 176' },
};

function muscleLayer(m, d, opts, idx) {
  const { selected, fills = {}, planned = [] } = opts;
  const cls = ['m'];
  if (selected === m || (Array.isArray(selected) && selected.includes(m))) cls.push('sel');
  else if (planned.includes(m)) cls.push('planned');
  const fill = fills[m] && !cls.includes('sel') ? ` style="fill:${fills[m]}"` : '';
  return `<path class="${cls.join(' ')}" data-muscle="${m}" d="${d}"${fill}><title>${MUSCLES[m].name}</title></path><path class="m-shade" d="${d}"/>`;
}

function half(def, opts) {
  return `${def.neutral.map((d) => `<path class="m-neutral" d="${d}"/><path class="m-shade" d="${d}"/>`).join('')}
    ${def.muscles.map(([m, d], i) => muscleLayer(m, d, opts, i)).join('')}`;
}

// содержимое фигуры без обёртки <svg> (для большого просмотрщика)
export function bodyInner(side = 'front', opts = {}) {
  const def = side === 'front' ? FRONT : BACK;
  const mirror = (s) => `<g transform="matrix(-1 0 0 1 300 0)">${s}</g>`;
  const base = `<path class="bs-sil" d="${SIL_TORSO}"/><path class="bs-sil" d="${SIL_ARM}"/>`;
  const skin = `<path class="bs-skin" d="${HAND}"/><path class="bs-line" d="${HAND_LINES}"/><path class="bs-skin" d="${FOOT}"/><path class="bs-skin" d="${KNEE}"/>`;
  const head = side === 'front'
    ? `<path class="bs-skin" d="${NECK_F}"/><ellipse class="bs-skin" cx="150" cy="54" rx="29" ry="37"/>
       <ellipse class="bs-skin" cx="121" cy="58" rx="4.5" ry="9"/><ellipse class="bs-skin" cx="179" cy="58" rx="4.5" ry="9"/>
       <path class="bs-face" d="M150 54 C 149 60 148 64 147 67 Q 150 69 153 67"/>`
    : `<path class="bs-skin" d="${NECK_F}"/><ellipse class="bs-skin" cx="150" cy="54" rx="29" ry="37"/>
       <ellipse class="bs-skin" cx="121" cy="58" rx="4.5" ry="9"/><ellipse class="bs-skin" cx="179" cy="58" rx="4.5" ry="9"/>`;
  const inner = `${base}${skin}${half(def, opts)}`;
  return `<g class="body-fig ${side}">
    ${inner}${mirror(inner)}
    ${head}
    <path class="bs-line" d="${def.lines.center} ${def.lines.side}"/>
    <path class="bs-line" transform="matrix(-1 0 0 1 300 0)" d="${def.lines.side}"/>
  </g>`;
}

export function bodySVG(side = 'front', opts = {}) {
  return `<svg viewBox="0 0 300 630" class="body-svg ${opts.interactive ? 'interactive' : ''}" role="img" aria-label="Тело — вид ${side === 'front' ? 'спереди' : 'сзади'}">${bodyInner(side, opts)}</svg>`;
}

// Общие градиенты для всех схем тела (один раз на документ)
export function ensureBodyDefs() {
  if (document.getElementById('body-defs')) return;
  const holder = document.createElement('div');
  holder.innerHTML = `<svg id="body-defs" width="0" height="0" style="position:absolute;width:0;height:0" aria-hidden="true"><defs>
    <linearGradient id="gradSel" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" style="stop-color:#ff9a6b"/><stop offset=".55" style="stop-color:#ff5a36"/><stop offset="1" style="stop-color:#e0301e"/>
    </linearGradient>
    <linearGradient id="musG" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" style="stop-color:var(--mus-1)"/><stop offset="1" style="stop-color:var(--mus-2)"/>
    </linearGradient>
    <linearGradient id="silG" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" style="stop-color:var(--sil-1)"/><stop offset="1" style="stop-color:var(--sil-2)"/>
    </linearGradient>
    <linearGradient id="skinG" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" style="stop-color:var(--skin-1)"/><stop offset="1" style="stop-color:var(--skin-2)"/>
    </linearGradient>
    <radialGradient id="musShade" cx=".36" cy=".28" r=".9">
      <stop offset="0" stop-color="#fff" stop-opacity=".42"/>
      <stop offset=".45" stop-color="#fff" stop-opacity="0"/>
      <stop offset="1" stop-color="#000" stop-opacity=".38"/>
    </radialGradient>
  </defs></svg>`;
  document.body.prepend(holder.firstElementChild);
}

// Цвет «тепловой карты» по интенсивности 0..1
export function heatColor(t) {
  if (t <= 0) return null;
  const p = Math.round(30 + 70 * Math.min(1, t));
  return `color-mix(in srgb, #ff5a36 ${p}%, var(--mus-2))`;
}

// Мини-тела спереди и сзади рядом (для дня / недели)
export function miniBodies(fills, { lg = false, labels = true } = {}) {
  return `<div class="mini-bodies ${lg ? 'lg' : ''}">
    <div>${bodySVG('front', { fills })}${labels ? '<div class="lbl">Спереди</div>' : ''}</div>
    <div>${bodySVG('back', { fills })}${labels ? '<div class="lbl">Сзади</div>' : ''}</div>
  </div>`;
}

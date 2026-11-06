// Анимированная сцена «Гора»: стикмен поднимается к вершине по мере выполнения дневных целей.

const QUOTES = [
  'Каждый шаг приближает к вершине',
  'Дисциплина сильнее мотивации',
  'Маленькие шаги каждый день — большой результат',
  'Ты сильнее, чем думаешь',
  'Вершина любит упрямых',
  'Не сравнивай себя с другими — сравнивай со вчерашним собой',
  'Сделай сегодня то, за что завтра скажешь спасибо',
  'Путь в тысячу шагов начинается с одного',
  'Усталость пройдёт — гордость останется',
  'Не останавливайся, когда устал. Остановись, когда закончил',
];

const TRAIL = 'M58 208 C 120 206, 180 198, 182 188 S 128 172, 146 160 S 214 150, 212 134 S 180 118, 196 106 S 240 96, 234 82 S 220 70, 236 64 S 248 48, 250 40';
const PEAK_M = 4400;

function period(h = new Date().getHours()) {
  if (h >= 5 && h < 10) return 'dawn';
  if (h >= 10 && h < 17) return 'day';
  if (h >= 17 && h < 21) return 'dusk';
  return 'night';
}

function stars() {
  let out = '';
  let seed = 7;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 46; i++) {
    const x = rnd() * 400, y = rnd() * 110, r = rnd() * 0.9 + 0.3;
    out += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(2)}" style="animation-delay:${(rnd() * 4).toFixed(2)}s"/>`;
  }
  return out;
}

function pines(xs, y, s = 1) {
  return xs.map(([x, k]) => {
    const h = 14 * k * s, w = 5 * k * s;
    return `<path d="M${x} ${y - h} L${x + w} ${y - h * 0.35} L${x + w * 0.55} ${y - h * 0.38} L${x + w * 1.2} ${y} L${x - w * 1.2} ${y} L${x - w * 0.55} ${y - h * 0.38} L${x - w} ${y - h * 0.35} Z"/>`;
  }).join('');
}

export function heroHTML({ progress, parts }) {
  const p = period();
  const day = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  const quote = QUOTES[day % QUOTES.length];
  const done = progress >= 0.999;
  const alt = Math.round(progress * PEAK_M / 10) * 10;
  const sunPos = { dawn: [70, 70], day: [320, 34], dusk: [345, 92], night: [330, 40] }[p];
  return `
  <section class="hero hero-${p}" data-hero>
   <div class="hero-scene" data-hero-scene>
    <svg class="hero-svg" viewBox="0 -30 400 250" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs>
        <linearGradient id="hSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="sky1"/><stop offset=".65" class="sky2"/><stop offset="1" class="sky3"/></linearGradient>
        <radialGradient id="hGlow"><stop offset="0" class="glow1"/><stop offset="1" class="glow2"/></radialGradient>
        <linearGradient id="hMain" x1="0" y1="0" x2="1" y2="1"><stop offset="0" class="main1"/><stop offset="1" class="main2"/></linearGradient>
        <linearGradient id="hFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="far1"/><stop offset="1" class="far2"/></linearGradient>
        <linearGradient id="hShade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
      </defs>
      <rect x="-120" y="-80" width="660" height="310" fill="url(#hSky)"/>
      ${p === 'night' ? `<g class="h-stars">${stars()}</g>` : ''}
      <circle cx="${sunPos[0]}" cy="${sunPos[1]}" r="46" fill="url(#hGlow)" class="h-glow"/>
      <circle cx="${sunPos[0]}" cy="${sunPos[1]}" r="${p === 'night' ? 11 : 14}" class="h-sun"/>
      ${p === 'night' ? `<circle cx="${sunPos[0] + 5}" cy="${sunPos[1] - 3}" r="10" class="h-moon-cut"/>` : ''}
      <g class="h-clouds">
        <g class="cloud c1"><ellipse cx="0" cy="0" rx="22" ry="7"/><ellipse cx="10" cy="-5" rx="13" ry="8"/><ellipse cx="-9" cy="-3" rx="10" ry="6"/></g>
        <g class="cloud c2"><ellipse cx="0" cy="0" rx="16" ry="5"/><ellipse cx="7" cy="-4" rx="9" ry="6"/></g>
        <g class="cloud c3"><ellipse cx="0" cy="0" rx="26" ry="7"/><ellipse cx="-8" cy="-5" rx="14" ry="8"/><ellipse cx="12" cy="-3" rx="10" ry="6"/></g>
      </g>
      <path class="h-far" d="M-80 160 L-40 120 L-10 138 L0 150 L36 116 L70 132 L118 84 L150 112 L188 92 L214 104 L262 66 L300 98 L340 74 L372 100 L400 88 L436 112 L470 84 L520 120 L520 220 L-80 220 Z" fill="url(#hFar)"/>
      <g class="h-birds"><path d="M0 0 q 3 -3 6 0 q 3 -3 6 0"/><path d="M14 6 q 2.5 -2.5 5 0 q 2.5 -2.5 5 0"/><path d="M-12 8 q 2 -2 4 0 q 2 -2 4 0"/></g>
      <path class="h-main" d="M-60 220 L-20 196 L30 210 L118 140 L150 128 L250 38 L300 82 L318 76 L360 112 L400 104 L440 128 L480 116 L520 150 L520 220 Z" fill="url(#hMain)"/>
      <path d="M250 38 L300 82 L318 76 L360 112 L400 104 L440 128 L480 116 L520 150 L520 220 L262 220 Z" fill="url(#hShade)"/>
      <path class="h-snow" d="M250 38 L272 58 L264 57 L258 64 L250 57 L242 64 L236 58 L230 56 Z"/>
      <path class="h-ridge" d="M250 38 L232 70 L214 84 L196 112 L170 136"/>
      <path class="h-trail" d="${TRAIL}" data-trail/>
      <path class="h-trail-done" d="${TRAIL}" data-trail-done/>
      <g class="h-camps">
        ${[0.25, 0.5, 0.75].map((k) => `<g data-camp="${k}"><circle r="2.6"/></g>`).join('')}
      </g>
      <g class="h-flag" transform="translate(250 40)">
        <line x1="0" y1="0" x2="0" y2="-20"/>
        <path class="flag" d="M0 -20 L14 -16 L0 -12 Z"/>
      </g>
      <path class="h-fg" d="M-80 200 Q -30 190 0 204 Q 50 190 104 208 T 220 206 T 330 202 T 400 198 T 520 200 L520 230 L-80 230 Z"/>
      <g class="h-pines">${pines([[-40, 1], [-24, 1.3], [14, 1.1], [26, 0.8], [330, 1], [346, 1.25], [362, 0.85], [384, 1.1], [430, 1.2], [446, 0.9], [480, 1.1]], 210)}</g>
      <g class="h-man" data-man>
        <rect class="pack" x="-4.6" y="-16.5" width="3.4" height="6" rx="1.2"/>
        <line class="leg" data-l="t0"/><line class="leg" data-l="s0"/>
        <line class="leg" data-l="t1"/><line class="leg" data-l="s1"/>
        <line class="torso" x1="0" y1="-9" x2="0" y2="-16.5"/>
        <circle class="head" cx="0" cy="-19.6" r="2.7"/>
        <line class="arm" data-l="u0"/><line class="arm" data-l="f0"/>
        <line class="arm" data-l="u1"/><line class="arm" data-l="f1"/>
        <line class="pole" data-l="pole"/>
      </g>
      <g class="h-sparks" data-sparks></g>
    </svg>
    <div class="hero-top">
      <div class="hero-quote">${quote}</div>
    </div>
   </div>
    <div class="hero-bottom">
      <div class="hero-alt"><span class="num" data-alt>${alt.toLocaleString('ru-RU')}</span> м <span class="muted-l">из ${PEAK_M.toLocaleString('ru-RU')} м</span>
        ${done ? '<span class="hero-done">Вершина покорена! 🏔️</span>' : `<span class="hero-pct">${Math.round(progress * 100)}% пути</span>`}</div>
      <div class="hero-chips">${parts.map((x) => `<span class="hc ${x.v >= 1 ? 'ok' : ''}">${x.e} ${x.label}</span>`).join('')}</div>
    </div>
  </section>`;
}

// ---------- анимация ----------
const st = { p: 0, target: 0, raf: 0, phase: 0, last: 0, svg: null, arrivedAt: 0 };

export function startHero(root, progress) {
  const svg = root.querySelector('[data-hero] svg');
  if (!svg) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  st.svg = svg;
  st.path = svg.querySelector('[data-trail]');
  st.done = svg.querySelector('[data-trail-done]');
  st.man = svg.querySelector('[data-man]');
  st.len = st.path.getTotalLength();
  st.target = progress;
  st.done.style.strokeDasharray = `${st.len} ${st.len}`;
  // лагеря
  svg.querySelectorAll('[data-camp]').forEach((g) => {
    const pt = st.path.getPointAtLength(+g.dataset.camp * st.len);
    g.setAttribute('transform', `translate(${pt.x} ${pt.y})`);
    g.classList.toggle('reached', progress >= +g.dataset.camp);
  });
  fitViewBox(root);
  if (reduce) { st.p = progress; draw(0, false); return; }
  if (!st.raf) { st.last = performance.now(); st.raf = requestAnimationFrame(loop); }
}

export function stopHero() {
  cancelAnimationFrame(st.raf);
  st.raf = 0;
}

function fitViewBox(root) {
  const hero = root.querySelector('[data-hero-scene]');
  if (!hero) return;
  const apply = () => {
    const r = hero.getBoundingClientRect();
    if (!r.width || !r.height) return;
    const aspect = r.width / r.height;
    // всегда видна тропа от подножия до флага на вершине
    let vbH = 212, vbW = vbH * aspect;
    if (vbW > 580) { vbW = 580; vbH = vbW / aspect; }
    if (vbW < 250) { vbW = 250; vbH = vbW / aspect; }
    const vbY = 218 - vbH;
    const vbX = Math.max(-80, Math.min(520 - vbW, 158 - vbW / 2));
    st.svg.setAttribute('viewBox', `${vbX.toFixed(1)} ${vbY.toFixed(1)} ${vbW.toFixed(1)} ${vbH.toFixed(1)}`);
  };
  apply();
  if (!hero._ro) { hero._ro = new ResizeObserver(apply); hero._ro.observe(hero); }
}

function loop(now) {
  st.raf = requestAnimationFrame(loop);
  if (!st.svg || !st.svg.isConnected) { stopHero(); return; }
  const dt = Math.min(0.05, (now - st.last) / 1000);
  st.last = now;
  const diff = st.target - st.p;
  const walking = Math.abs(diff) > 0.0005;
  if (walking) {
    const speed = 0.11; // доля пути в секунду
    st.p += Math.sign(diff) * Math.min(Math.abs(diff), speed * dt);
    st.phase += dt * 9.5;
    if (Math.abs(st.target - st.p) <= 0.0005 && st.target >= 0.999) { st.arrivedAt = now; burst(); }
  }
  draw(now, walking);
}

function seg(el, a, b) {
  el.setAttribute('x1', a[0].toFixed(2)); el.setAttribute('y1', a[1].toFixed(2));
  el.setAttribute('x2', b[0].toFixed(2)); el.setAttribute('y2', b[1].toFixed(2));
}
const P = (a, len, deg) => [a[0] + Math.sin(deg * Math.PI / 180) * len, a[1] + Math.cos(deg * Math.PI / 180) * len];

function draw(now, walking) {
  const L = st.p * st.len;
  const pt = st.path.getPointAtLength(L);
  const ahead = st.path.getPointAtLength(Math.min(st.len, L + 3));
  const back = st.path.getPointAtLength(Math.max(0, L - 3));
  const dx = ahead.x - back.x, dy = ahead.y - back.y;
  const dir = dx >= 0 ? 1 : -1;
  const slope = Math.atan2(-dy, Math.abs(dx) || 0.001) * 180 / Math.PI; // >0 — вверх
  st.done.style.strokeDashoffset = `${st.len - L}`;
  const alt = st.svg.closest('[data-hero]').querySelector('[data-alt]');
  if (alt) alt.textContent = (Math.round(st.p * PEAK_M / 10) * 10).toLocaleString('ru-RU');

  const t = now / 1000;
  const celebrate = st.target >= 0.999 && !walking && st.p >= 0.999;
  const q = (k) => st.man.querySelector(`[data-l="${k}"]`);
  const hip = [0, -9], sh = [0, -16];
  let bob = 0, th0, th1, sk0, sk1, ua0, ua1, fa0, fa1, jump = 0;
  if (walking) {
    const s = Math.sin(st.phase);
    th0 = 26 * s; th1 = -26 * s;
    sk0 = th0 - Math.max(0, -Math.cos(st.phase)) * 38;
    sk1 = th1 - Math.max(0, Math.cos(st.phase)) * 38;
    ua0 = -24 * s; ua1 = 24 * s; fa0 = ua0 + 25; fa1 = ua1 + 25;
    bob = Math.abs(Math.cos(st.phase)) * 0.7;
  } else if (celebrate) {
    jump = Math.max(0, Math.sin(t * 5)) * 3;
    th0 = 8; th1 = -8; sk0 = 6; sk1 = -6;
    ua0 = 165 + Math.sin(t * 10) * 12; ua1 = -165 - Math.sin(t * 10 + 1) * 12; fa0 = ua0; fa1 = ua1;
  } else {
    const b = Math.sin(t * 2.2);
    th0 = 6; th1 = -5; sk0 = 3; sk1 = -6;
    ua0 = -8 + b * 2; ua1 = 10 + b * 2; fa0 = ua0 + 12; fa1 = ua1 + 20;
    bob = b * 0.35;
  }
  const H = [hip[0], hip[1] + bob];
  const k0 = P(H, 5, th0), k1 = P(H, 5, th1);
  seg(q('t0'), H, k0); seg(q('s0'), k0, P(k0, 5, sk0));
  seg(q('t1'), H, k1); seg(q('s1'), k1, P(k1, 5, sk1));
  const S = [sh[0], sh[1] + bob];
  const e0 = P(S, 3.9, ua0), e1 = P(S, 3.9, ua1);
  const h0 = P(e0, 3.6, fa0), h1 = P(e1, 3.6, fa1);
  seg(q('u0'), S, e0); seg(q('f0'), e0, h0);
  seg(q('u1'), S, e1); seg(q('f1'), e1, h1);
  if (celebrate) seg(q('pole'), h1, P(h1, 9, 180));
  else seg(q('pole'), h1, [h1[0] + 1.5, 0]);
  st.man.querySelector('.torso').setAttribute('y2', (-16.5 + bob).toFixed(2));
  st.man.querySelector('.torso').setAttribute('y1', (-9 + bob).toFixed(2));
  st.man.querySelector('.head').setAttribute('cy', (-19.6 + bob).toFixed(2));
  st.man.querySelector('.pack').setAttribute('y', (-16.5 + bob).toFixed(2));
  const lean = walking ? Math.min(14, Math.max(-6, slope * 0.35)) : 0;
  st.man.setAttribute('transform', `translate(${pt.x.toFixed(2)} ${(pt.y - jump).toFixed(2)}) scale(${dir * 0.95} 0.95) rotate(${(lean).toFixed(1)})`);
  // лагеря «зажигаются» при прохождении
  st.svg.querySelectorAll('[data-camp]').forEach((g) => g.classList.toggle('reached', st.p >= +g.dataset.camp - 0.001));
}

function burst() {
  const g = st.svg.querySelector('[data-sparks]');
  if (!g) return;
  const colors = ['#ffd166', '#ff6b6b', '#4cc9f0', '#80ed99', '#f72585'];
  g.innerHTML = Array.from({ length: 18 }, (_, i) => {
    const a = (i / 18) * Math.PI * 2, r = 16 + (i % 3) * 6;
    return `<circle cx="250" cy="30" r="1.6" fill="${colors[i % colors.length]}" style="--dx:${(Math.cos(a) * r).toFixed(1)}px;--dy:${(Math.sin(a) * r).toFixed(1)}px"/>`;
  }).join('');
  setTimeout(() => { g.innerHTML = ''; }, 1400);
}

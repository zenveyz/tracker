import { icon } from './icons.js';

// ---------- строки / числа ----------
export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export const fmt = (n, d = 0) => Number(n || 0).toLocaleString('ru-RU', { maximumFractionDigits: d });
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (a > 10 && a < 20) return many;
  if (b > 1 && b < 5) return few;
  if (b === 1) return one;
  return many;
}

// ---------- даты ----------
export const DAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
export const DAY_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];

export function dateKey(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
export function parseKey(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
export const weekdayIdx = (d = new Date()) => (d.getDay() + 6) % 7; // 0 = пн
export function weekStart(d = new Date()) { const x = new Date(d); x.setHours(0, 0, 0, 0); return addDays(x, -weekdayIdx(x)); }
export function weekDates(d = new Date()) { const s = weekStart(d); return Array.from({ length: 7 }, (_, i) => addDays(s, i)); }
export function humanDate(d) {
  const today = dateKey(), k = dateKey(d);
  if (k === today) return 'Сегодня';
  if (k === dateKey(addDays(new Date(), -1))) return 'Вчера';
  if (k === dateKey(addDays(new Date(), 1))) return 'Завтра';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
export const longDate = (d = new Date()) => `${DAY_FULL[weekdayIdx(d)]}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;

export function splitDuration(ms) {
  ms = Math.max(0, ms);
  const s = Math.floor(ms / 1000);
  return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
export function fmtClock(ms) {
  const { d, h, m, s } = splitDuration(ms);
  const pad = (x) => String(x).padStart(2, '0');
  const hh = d * 24 + h;
  return hh > 0 ? `${hh}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
export function fmtHuman(ms) {
  const { d, h, m } = splitDuration(ms);
  if (d > 0) return `${d} ${plural(d, 'день', 'дня', 'дней')} ${h} ч`;
  if (h > 0) return `${h} ч ${m} мин`;
  return `${m} мин`;
}

// ---------- кольцо прогресса ----------
export function ring(pct, { size = 120, stroke = 12, c1 = 'var(--a1)', c2 = 'var(--a2)', id = 'r' + Math.random().toString(36).slice(2, 7), center = '' } = {}) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, off = c * (1 - clamp(pct, 0, 1));
  return `<div class="ring" style="width:${size}px;height:${size}px">
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient></defs>
      <circle class="ring-track" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke-width="${stroke}"/>
      <circle class="ring-val" cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="url(#${id})" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${c}" stroke-dashoffset="${off}"/>
    </svg>
    <div class="ring-center">${center}</div>
  </div>`;
}

// ---------- шторка (bottom sheet / модальное окно) ----------
const sheetEl = () => document.getElementById('sheet');
const backdropEl = () => document.getElementById('sheet-backdrop');
let closeTimer = null;
let onCloseCb = null;

export function openSheet({ title, body, onMount, onClose }) {
  clearTimeout(closeTimer);
  const el = sheetEl(), bd = backdropEl();
  el.innerHTML = `<div class="grabber"></div>
    <div class="sheet-head"><h3>${title}</h3><button class="icon-btn ghost" data-close aria-label="Закрыть">${icon('x')}</button></div>
    <div class="sheet-body">${body}</div>`;
  el.hidden = false; bd.hidden = false;
  el.scrollTop = 0;
  onCloseCb = onClose || null;
  requestAnimationFrame(() => { el.classList.add('show'); bd.classList.add('show'); });
  el.querySelector('[data-close]').onclick = closeSheet;
  bd.onclick = closeSheet;
  attachSheetDrag(el);
  onMount && onMount(el);
  const first = el.querySelector('[autofocus]');
  if (first && window.matchMedia('(min-width: 720px)').matches) setTimeout(() => first.focus(), 200);
  return closeSheet;
}

export function closeSheet() {
  const el = sheetEl(), bd = backdropEl();
  el.classList.remove('show'); bd.classList.remove('show');
  const cb = onCloseCb; onCloseCb = null;
  closeTimer = setTimeout(() => { el.hidden = true; bd.hidden = true; el.innerHTML = ''; }, 320);
  cb && cb();
}

function attachSheetDrag(el) {
  const grab = el.querySelector('.grabber');
  let y0 = null, dy = 0;
  const start = (e) => { y0 = e.touches[0].clientY; dy = 0; el.style.transition = 'none'; };
  const move = (e) => { if (y0 == null) return; dy = Math.max(0, e.touches[0].clientY - y0); el.style.transform = `translateY(${dy}px)`; };
  const end = () => { el.style.transition = ''; el.style.transform = ''; if (dy > 90) closeSheet(); y0 = null; };
  [grab, el.querySelector('.sheet-head')].forEach((h) => {
    h.addEventListener('touchstart', start, { passive: true });
    h.addEventListener('touchmove', move, { passive: true });
    h.addEventListener('touchend', end);
  });
}

document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !sheetEl().hidden) closeSheet(); });

// ---------- тост ----------
let toastTimer;
export function toast(msg, emoji = '✨') {
  const el = document.getElementById('toast');
  el.innerHTML = `<span>${emoji}</span><span>${esc(msg)}</span>`;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
}

// ---------- конфетти ----------
export function confetti() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const cv = document.getElementById('confetti'), ctx = cv.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; ctx.scale(dpr, dpr);
  const colors = ['#a78bfa', '#f472b6', '#22d3ee', '#facc15', '#34d399', '#fb923c'];
  const parts = Array.from({ length: 140 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 120, y: innerHeight * 0.45,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 15 - 5, r: Math.random() * 6 + 4,
    c: colors[(Math.random() * colors.length) | 0], rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
  }));
  let t = 0;
  (function frame() {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    parts.forEach((p) => {
      p.vy += 0.42; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.c;
      ctx.globalAlpha = Math.max(0, 1 - t / 110); ctx.fillRect(-p.r / 2, -p.r / 4, p.r, p.r / 2); ctx.restore();
    });
    if (++t < 110) requestAnimationFrame(frame); else ctx.clearRect(0, 0, innerWidth, innerHeight);
  })();
}

// ---------- мелкие компоненты ----------
export function stepper(name, value, { step = 1, min = 0, max = 99999, dec = 0 } = {}) {
  return `<div class="stepper" data-stepper data-step="${step}" data-min="${min}" data-max="${max}" data-dec="${dec}">
    <button type="button" data-dir="-1" aria-label="Меньше">${icon('minus', 18)}</button>
    <input type="number" inputmode="decimal" name="${name}" value="${value}" step="any" />
    <button type="button" data-dir="1" aria-label="Больше">${icon('plus', 18)}</button>
  </div>`;
}
export function bindSteppers(root) {
  root.querySelectorAll('[data-stepper]').forEach((st) => {
    const inp = st.querySelector('input');
    const step = +st.dataset.step, min = +st.dataset.min, max = +st.dataset.max, dec = +st.dataset.dec;
    st.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => {
      const v = clamp((parseFloat(inp.value.replace(',', '.')) || 0) + step * +b.dataset.dir, min, max);
      inp.value = +v.toFixed(dec);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
    }));
  });
}
export const num = (v, def = 0) => { const n = parseFloat(String(v ?? '').replace(',', '.')); return Number.isFinite(n) ? n : def; };

export const EMOJIS = ['🎯', '🏆', '💪', '🏃', '📚', '🧘', '💧', '🥗', '😴', '🚭', '🍬', '📵', '💰', '✈️', '🎨', '🎸', '🧠', '❤️', '🌱', '☀️', '🚴', '🏊', '✍️', '🧹'];
export const COLORS = ['#a78bfa', '#f472b6', '#22d3ee', '#34d399', '#facc15', '#fb923c', '#f87171', '#60a5fa'];

export function emojiPicker(current) {
  return `<div class="emoji-grid" data-emoji-grid>${EMOJIS.map((e) => `<button type="button" data-emoji="${e}" class="${e === current ? 'on' : ''}">${e}</button>`).join('')}</div>`;
}
export function colorPicker(current) {
  return `<div class="color-row" data-color-row>${COLORS.map((c) => `<button type="button" data-color="${c}" class="${c === current ? 'on' : ''}" style="background:${c}" aria-label="Цвет"></button>`).join('')}</div>`;
}
export function bindPickers(root, onEmoji, onColor) {
  root.querySelectorAll('[data-emoji]').forEach((b) => b.addEventListener('click', () => {
    root.querySelectorAll('[data-emoji]').forEach((x) => x.classList.toggle('on', x === b)); onEmoji(b.dataset.emoji);
  }));
  root.querySelectorAll('[data-color]').forEach((b) => b.addEventListener('click', () => {
    root.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('on', x === b)); onColor(b.dataset.color);
  }));
}

// Подтверждение действия
export function confirmSheet(title, text, okLabel = 'Удалить') {
  return new Promise((resolve) => {
    let answered = false;
    openSheet({
      title,
      body: `<p class="muted" style="margin:0;line-height:1.5">${text}</p>
        <div class="fields-2"><button class="btn" data-no>Отмена</button><button class="btn btn-primary" data-yes style="background:linear-gradient(135deg,#fb7185,#e11d48)">${okLabel}</button></div>`,
      onMount: (el) => {
        el.querySelector('[data-no]').onclick = () => { answered = true; resolve(false); closeSheet(); };
        el.querySelector('[data-yes]').onclick = () => { answered = true; resolve(true); closeSheet(); };
      },
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

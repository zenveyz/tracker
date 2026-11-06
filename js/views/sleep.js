import { sleepHeat } from '../stats.js';
import { getState, update } from '../store.js';
import { icon } from '../icons.js';
import { esc, fmt, plural, ring, openSheet, closeSheet, toast, stepper, bindSteppers, num, dateKey, parseKey, addDays, humanDate, DAY_SHORT, weekdayIdx, confirmSheet, clamp } from '../ui.js';

const ui = { period: 'week', sel: null };
const QUALITY = [
  { v: 1, e: '😫', t: 'Ужасно' },
  { v: 2, e: '😕', t: 'Плохо' },
  { v: 3, e: '😐', t: 'Нормально' },
  { v: 4, e: '🙂', t: 'Хорошо' },
  { v: 5, e: '😴', t: 'Отлично' },
];
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

// ---------- данные ----------
export const sleepData = () => getState().sleep || {};
export const sleepGoal = () => getState().settings.sleepGoal || 8;
export function fmtH(h) {
  if (!h && h !== 0) return '—';
  const m = Math.round(h * 60);
  return `${Math.floor(m / 60)} ч ${String(m % 60).padStart(2, '0')} мин`;
}
const fmtShort = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`; };
function duration(bed, wake) {
  const [bh, bm] = bed.split(':').map(Number), [wh, wm] = wake.split(':').map(Number);
  let mins = wh * 60 + wm - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60;
  return mins / 60;
}
export function lastNight() {
  const d = sleepData();
  const today = d[dateKey()];
  if (today) return { key: dateKey(), ...today };
  const y = d[dateKey(addDays(new Date(), -1))];
  return y ? { key: dateKey(addDays(new Date(), -1)), ...y } : null;
}
function minutesOfDay(t, isBed) {
  const [h, m] = t.split(':').map(Number);
  let v = h * 60 + m;
  if (isBed && v < 12 * 60) v += 24 * 60; // 01:00 — это «поздно вечером»
  return v;
}
const fromMinutes = (v) => { v = ((Math.round(v) % 1440) + 1440) % 1440; return `${String(Math.floor(v / 60)).padStart(2, '0')}:${String(v % 60).padStart(2, '0')}`; };

function series() {
  const d = sleepData();
  const today = new Date();
  if (ui.period === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const dt = addDays(today, i - 6), k = dateKey(dt);
      return { key: k, label: DAY_SHORT[weekdayIdx(dt)], v: d[k]?.hours || 0, sub: humanDate(dt) };
    });
  }
  if (ui.period === 'month') {
    return Array.from({ length: 30 }, (_, i) => {
      const dt = addDays(today, i - 29), k = dateKey(dt);
      return { key: k, label: i % 5 === 4 || i === 29 ? String(dt.getDate()) : '', v: d[k]?.hours || 0, sub: humanDate(dt) };
    });
  }
  // год — средние по месяцам
  return Array.from({ length: 12 }, (_, i) => {
    const m = new Date(today.getFullYear(), today.getMonth() - 11 + i, 1);
    const vals = Object.entries(d).filter(([k]) => { const x = parseKey(k); return x.getFullYear() === m.getFullYear() && x.getMonth() === m.getMonth(); }).map(([, v]) => v.hours);
    return { key: 'm' + i, label: MONTHS_SHORT[m.getMonth()].slice(0, 1).toUpperCase(), v: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0, sub: `${MONTHS_SHORT[m.getMonth()]} ${m.getFullYear()} · среднее` };
  });
}

function stats(list) {
  const vals = list.filter((x) => x.v > 0);
  const goal = sleepGoal();
  const avg = vals.length ? vals.reduce((a, b) => a + b.v, 0) / vals.length : 0;
  const best = vals.reduce((a, b) => (b.v > (a?.v || 0) ? b : a), null);
  const hit = vals.filter((x) => x.v >= goal).length;
  return { avg, best, hit, count: vals.length };
}
export function sleepStreak() {
  const d = sleepData(), goal = sleepGoal();
  let n = 0, dt = new Date();
  if (!(d[dateKey(dt)]?.hours >= goal)) dt = addDays(dt, -1);
  while (d[dateKey(dt)]?.hours >= goal && n < 3650) { n++; dt = addDays(dt, -1); }
  return n;
}

// ---------- рендер ----------
export function render(root) {
  const d = sleepData(), goal = sleepGoal();
  const last = lastNight();
  const list = series();
  const S = stats(list);
  const entries = Object.entries(d).sort((a, b) => b[0].localeCompare(a[0]));
  const recent = entries.slice(0, 14);
  const bedAvg = recent.length ? recent.reduce((a, [, v]) => a + minutesOfDay(v.bed, true), 0) / recent.length : null;
  const wakeAvg = recent.length ? recent.reduce((a, [, v]) => a + minutesOfDay(v.wake, false), 0) / recent.length : null;
  const maxV = Math.max(goal + 1.5, ...list.map((x) => x.v), 10);
  const diff = S.avg ? S.avg - goal : 0;
  const q = last && QUALITY.find((x) => x.v === last.quality);
  const streak = sleepStreak();
  if (ui.sel && !list.some((x) => x.key === ui.sel)) ui.sel = null;
  const sel = ui.sel ? list.find((x) => x.key === ui.sel) : null;

  root.innerHTML = `
    <header class="page-head">
      <div class="row" style="gap:12px">
        <a class="icon-btn" href="#/home" aria-label="Назад">${icon('chevL', 18)}</a>
        <div><h1>Сон</h1><div class="sub">Сколько ты спишь и как отдыхаешь</div></div>
      </div>
      <button class="btn btn-primary desktop-only" data-log>${icon('plus', 18)} Записать сон</button>
    </header>

    <div class="grid grid-dash">
      <div class="card pad-lg sleep-hero">
        <div class="sleep-stars" aria-hidden="true"></div>
        <div class="row" style="gap:20px;position:relative;flex-wrap:wrap">
          ${ring(last ? last.hours / goal : 0, { size: 150, stroke: 13, c1: '#818cf8', c2: '#c084fc', center: `
            <div style="font-size:30px">${q ? q.e : '🌙'}</div>
            <div class="bold num" style="font-size:20px;margin-top:2px">${last ? fmtShort(last.hours) : '—'}</div>
            <div class="tiny" style="opacity:.7">из ${goal} ч</div>` })}
          <div class="grow stack" style="gap:10px;min-width:170px">
            <div><div class="small bold" style="opacity:.75">${last ? (last.key === dateKey() ? 'Прошлой ночью' : 'Позапрошлой ночью') : 'Ещё нет записей'}</div>
              <div style="font-size:28px;font-weight:800;letter-spacing:-0.02em">${last ? fmtH(last.hours) : 'Как спалось?'}</div></div>
            ${last ? `<div class="row small" style="gap:14px;opacity:.9">
              <span class="row" style="gap:6px">${icon('moon', 15)} ${last.bed}</span>
              <span style="opacity:.5">→</span>
              <span class="row" style="gap:6px">${icon('sun', 15)} ${last.wake}</span>
              ${q ? `<span class="badge" style="background:rgba(255,255,255,.14);color:#fff">${q.t}</span>` : ''}</div>` : ''}
            <button class="btn btn-sm mobile-only" data-log style="align-self:flex-start;background:rgba(255,255,255,.16);border:0;color:#fff">${icon('plus', 15)} Записать сон</button>
          </div>
        </div>
      </div>

      <div class="stat-tiles sleep-tiles">
        <div class="stat-tile"><b>${S.avg ? fmtShort(S.avg) : '—'}</b><span>в среднем</span></div>
        <div class="stat-tile"><b>${S.best ? fmtShort(S.best.v) : '—'}</b><span>лучшая ночь</span></div>
        <div class="stat-tile"><b>${S.hit}<small class="muted">/${S.count}</small></b><span>ночей ≥ ${goal} ч</span></div>
        <div class="stat-tile"><b>${streak} 🔥</b><span>${plural(streak, 'ночь', 'ночи', 'ночей')} подряд</span></div>
        <div class="stat-tile"><b>${bedAvg != null ? fromMinutes(bedAvg) : '—'}</b><span>обычно ложусь</span></div>
        <div class="stat-tile"><b>${wakeAvg != null ? fromMinutes(wakeAvg) : '—'}</b><span>обычно встаю</span></div>
      </div>
    </div>

    <div class="card pad-lg" style="margin-top:14px">
      <div class="row between wrap" style="gap:10px">
        <div class="seg" style="width:280px">
          ${[['week', 'Неделя'], ['month', 'Месяц'], ['year', 'Год']].map(([k, l]) => `<button data-period="${k}" class="${ui.period === k ? 'on' : ''}">${l}</button>`).join('')}
        </div>
        <div class="sleep-readout">
          ${sel ? `<b>${sel.v ? fmtH(sel.v) : 'нет данных'}</b><span>${sel.sub}</span>` : `<b>${S.avg ? fmtH(S.avg) : '—'}</b><span>среднее за ${ui.period === 'week' ? 'неделю' : ui.period === 'month' ? 'месяц' : 'год'}</span>`}
        </div>
      </div>
      <div class="sleep-chart ${ui.period}">
        <div class="sc-goal" style="bottom:${(goal / maxV) * 100}%"><span>цель ${goal} ч</span></div>
        ${S.avg ? `<div class="sc-avg" style="bottom:${(S.avg / maxV) * 100}%"><span>ср. ${fmtShort(S.avg)}</span></div>` : ''}
        ${list.map((x, i) => `<button class="sc-col ${x.v >= goal ? 'hit' : ''} ${x.key === ui.sel ? 'sel' : ''}" data-bar="${x.key}" aria-label="${x.sub}: ${x.v ? fmtH(x.v) : 'нет данных'}">
          <i style="height:${x.v ? Math.max(3, (x.v / maxV) * 100) : 0}%;animation-delay:${i * (ui.period === 'month' ? 12 : 40)}ms"></i>
          <span>${x.label}</span>
        </button>`).join('')}
      </div>
      ${S.count ? `<div class="sleep-insight">${diff >= 0
        ? `✨ В среднем ты спишь на <b>${fmtH(diff).replace('0 ч ', '')}</b> больше цели — отлично!`
        : `💡 В среднем тебе не хватает <b>${fmtH(-diff).replace('0 ч ', '')}</b> до цели. Попробуй ложиться на ${Math.round(-diff * 60)} мин раньше.`}</div>` : ''}
    </div>

    <div class="section-title"><h2>🗓️ История</h2><button class="link" data-goal>Цель: ${goal} ч · изменить</button></div>
    ${entries.length ? `<div class="list">${entries.slice(0, 30).map(([k, v]) => {
      const qq = QUALITY.find((x) => x.v === v.quality);
      return `<div class="item">
        <span class="ic" style="background:color-mix(in srgb,#818cf8 18%,transparent);color:#a5b4fc">${qq ? qq.e : '🌙'}</span>
        <div class="grow"><div class="t">${humanDate(parseKey(k))}</div><div class="s">${v.bed} → ${v.wake}${qq ? ` · ${qq.t}` : ''}</div></div>
        <div class="bold num ${v.hours >= goal ? '' : 'muted'}">${fmtShort(v.hours)}</div>
        <button class="icon-btn ghost sm" data-edit="${k}" aria-label="Изменить">${icon('edit', 15)}</button>
      </div>`;
    }).join('')}</div>`
      : `<div class="card"><div class="empty"><div class="em">🌙</div><h4>Записей пока нет</h4><p>Отметь, во сколько лёг и встал, — и здесь появится статистика сна.</p>
        <button class="btn btn-primary" data-log>${icon('plus', 18)} Записать сон</button></div></div>`}`;
  root.insertAdjacentHTML('beforeend', `<div class="heat-wrap">${sleepHeat()}</div>`);
}

export function bind(root) {
  root.addEventListener('click', (e) => {
    const t = (s) => e.target.closest(s);
    let el;
    if (t('[data-log]')) return logSheet();
    if (t('[data-goal]')) return goalSheet();
    if ((el = t('[data-edit]'))) return logSheet(el.dataset.edit);
    if ((el = t('[data-period]'))) { ui.period = el.dataset.period; ui.sel = null; render(root); return; }
    if ((el = t('[data-bar]'))) { ui.sel = ui.sel === el.dataset.bar ? null : el.dataset.bar; render(root); }
  });
}

export function logSheet(key) {
  const d = sleepData();
  const k0 = key || dateKey();
  const ex = d[k0];
  let quality = ex?.quality || 4;
  openSheet({
    title: key ? 'Изменить запись' : 'Как ты спал?',
    body: `
      <div class="field"><span class="label">Утро какого дня</span><input class="input" type="date" name="date" value="${k0}" max="${dateKey()}" /></div>
      <div class="fields-2">
        <div class="field"><span class="label">🌙 Лёг спать</span><input class="input" type="time" name="bed" value="${ex?.bed || '23:30'}" /></div>
        <div class="field"><span class="label">☀️ Проснулся</span><input class="input" type="time" name="wake" value="${ex?.wake || '07:30'}" /></div>
      </div>
      <div class="sleep-calc" data-calc></div>
      <div class="field"><span class="label">Качество сна</span>
        <div class="quality-row">${QUALITY.map((x) => `<button type="button" class="q-btn ${x.v === quality ? 'on' : ''}" data-q="${x.v}"><span>${x.e}</span><small>${x.t}</small></button>`).join('')}</div></div>
      <button class="btn btn-primary btn-block" data-save style="background:linear-gradient(135deg,#818cf8,#c084fc)">${icon('check', 18)} Сохранить</button>
      ${key ? `<button class="btn btn-block btn-danger" data-del>${icon('trash', 18)} Удалить запись</button>` : ''}`,
    onMount: (el) => {
      const f = (n) => el.querySelector(`[name="${n}"]`);
      const calc = () => {
        const h = duration(f('bed').value || '23:30', f('wake').value || '07:30');
        const goal = sleepGoal();
        el.querySelector('[data-calc]').innerHTML = `<b>${fmtH(h)}</b><span>${h >= goal ? 'цель выполнена 🎉' : `до цели ${fmtH(goal - h).replace('0 ч ', '')}`}</span>`;
      };
      ['bed', 'wake'].forEach((n) => f(n).addEventListener('input', calc));
      calc();
      el.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
        quality = +b.dataset.q; el.querySelectorAll('[data-q]').forEach((x) => x.classList.toggle('on', x === b));
      }));
      el.querySelector('[data-save]').addEventListener('click', () => {
        const date = f('date').value || dateKey();
        const bed = f('bed').value || '23:30', wake = f('wake').value || '07:30';
        const hours = +duration(bed, wake).toFixed(3);
        update((s) => {
          s.sleep ||= {};
          if (key && key !== date) delete s.sleep[key];
          s.sleep[date] = { bed, wake, hours, quality };
        });
        closeSheet();
        toast(`Сон: ${fmtH(hours)}`, '😴');
      });
      el.querySelector('[data-del]')?.addEventListener('click', async () => {
        if (await confirmSheet('Удалить запись?', 'Запись о сне за этот день будет удалена.')) {
          update((s) => { delete s.sleep[key]; });
          toast('Удалено', '🗑️');
        }
      });
    },
  });
}

function goalSheet() {
  openSheet({
    title: 'Цель сна',
    body: `<div class="field"><span class="label">Сколько часов хочу спать</span>${stepper('goal', sleepGoal(), { step: 0.5, min: 4, max: 12, dec: 1 })}</div>
      <button class="btn btn-primary btn-block" data-save>${icon('check', 18)} Сохранить</button>`,
    onMount: (el) => {
      bindSteppers(el);
      el.querySelector('[data-save]').addEventListener('click', () => {
        update((s) => { s.settings.sleepGoal = clamp(num(el.querySelector('[name=goal]').value, 8), 4, 12); });
        closeSheet(); toast('Цель обновлена', '🎯');
      });
    },
  });
}

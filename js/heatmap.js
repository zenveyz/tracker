// Календарь-«тепловая карта» за месяц или год: каждая клетка — день, цвет — результат дня.
// Используется в тренировках, сне, еде и привычках.
import { dateKey, addDays } from './ui.js';
import { icon } from './icons.js';

const MONTHS_NOM = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const MONTHS_SHORT = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг', 'Сен', 'Окт', 'Ноя', 'Дек'];
const MONTHS_GEN = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WD = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export const HEAT = { green: '#22c55e', lime: '#a3e635', yellow: '#facc15', orange: '#fb923c', red: '#ef4444', rest: '#3b4150' };

const reg = new Map();   // id → настройки карточки
const st = new Map();    // id → { mode, anchor, picked }

const wd = (d) => (d.getDay() + 6) % 7;             // 0 — понедельник
const sameDay = (a, b) => dateKey(a) === dateKey(b);

// период, который сейчас показан
export function heatRange(id) {
  const s = st.get(id) || { mode: 'month', anchor: new Date() };
  const a = s.anchor;
  if (s.mode === 'year') return { mode: 'year', from: new Date(a.getFullYear(), 0, 1), to: new Date(a.getFullYear(), 11, 31) };
  return { mode: 'month', from: new Date(a.getFullYear(), a.getMonth(), 1), to: new Date(a.getFullYear(), a.getMonth() + 1, 0) };
}
export function eachDay(from, to, fn) {
  for (let d = new Date(from); d <= to; d = addDays(d, 1)) fn(dateKey(d), new Date(d));
}

/**
 * opts: {
 *   title?: string,                          // подпись над календарём
 *   day: (key, date) => ({ c, tip } | null), // цвет дня (null — нет данных)
 *   legend: [[color, label], ...],
 *   summary: (range) => string,              // текст справа сверху («88 тренировок»)
 *   onRange?: (range) => void,               // вызывается при смене периода
 * }
 */
export function heatCard(id, opts) {
  reg.set(id, opts);
  if (!st.has(id)) st.set(id, { mode: 'month', anchor: new Date(), picked: null });
  return `<div class="card heat-card" data-heat="${id}">${inner(id)}</div>`;
}

function inner(id) {
  const o = reg.get(id), s = st.get(id), r = heatRange(id);
  const today = new Date();
  const big = s.mode === 'year' ? String(r.from.getFullYear()) : `${MONTHS_NOM[r.from.getMonth()]} <span class="faint">${r.from.getFullYear()}</span>`;
  const isFuture = (d) => d > today && !sameDay(d, today);
  const cell = (d, withNum) => {
    const key = dateKey(d);
    const v = isFuture(d) ? null : o.day(key, d);
    const cls = `hm-c${v ? ' on' : ''}${sameDay(d, today) ? ' today' : ''}${s.picked === key ? ' picked' : ''}`;
    return `<button class="${cls}" style="${v ? `--hc:${v.c}` : ''}" data-heat-day="${key}" aria-label="${d.getDate()} ${MONTHS_GEN[d.getMonth()]}">${withNum ? `<span>${d.getDate()}</span>` : ''}</button>`;
  };

  let grid = '';
  if (s.mode === 'year') {
    const start = addDays(r.from, -wd(r.from)), end = addDays(r.to, 6 - wd(r.to));
    const cols = Math.round((end - start) / 86400000 + 1) / 7;
    let cells = '', labels = '';
    let col = 0;
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const inYear = d >= r.from && d <= r.to;
      cells += inYear ? cell(d, false) : '<i class="hm-c ghost"></i>';
      if (wd(d) === 6) col++;
    }
    for (let m = 0; m < 12; m++) {
      const first = new Date(r.from.getFullYear(), m, 1);
      const c = Math.floor((first - start) / 86400000 / 7);
      labels += `<span style="grid-column:${c + 1}">${MONTHS_SHORT[m]}</span>`;
    }
    grid = `<div class="hm-scroll"><div class="hm-year" style="--cols:${cols}">
      <div class="hm-months">${labels}</div>
      <div class="hm-ygrid">${cells}</div>
    </div></div>`;
  } else {
    let cells = '';
    for (let i = 0; i < wd(r.from); i++) cells += '<i class="hm-c ghost"></i>';
    eachDay(r.from, r.to, (k, d) => { cells += cell(d, true); });
    grid = `<div class="hm-month">
      ${WD.map((w) => `<b>${w}</b>`).join('')}
      ${cells}
    </div>`;
  }

  let tip = '';
  if (s.picked) {
    const d = new Date(s.picked + 'T12:00:00');
    const v = isFuture(d) ? null : o.day(s.picked, d);
    tip = `<div class="hm-tip"><b>${d.getDate()} ${MONTHS_GEN[d.getMonth()]}</b> · ${v?.tip || (isFuture(d) ? 'ещё впереди' : 'нет данных')}</div>`;
  }

  return `
    <div class="hm-head">
      <div>
        ${o.title ? `<div class="muted small bold">${o.title}</div>` : ''}
        <div class="hm-big">${big}</div>
      </div>
      <div class="hm-sum">${o.summary(r)}</div>
    </div>
    <div class="hm-ctrl">
      <div class="seg hm-seg">
        <button data-heat-act="month" class="${s.mode === 'month' ? 'on' : ''}">Месяц</button>
        <button data-heat-act="year" class="${s.mode === 'year' ? 'on' : ''}">Год</button>
      </div>
      <div class="row" style="gap:6px">
        <button class="icon-btn sm" data-heat-act="prev" title="Назад">${icon('chevL', 16)}</button>
        <button class="icon-btn sm" data-heat-act="now" title="Сегодня">${icon('calendar', 15)}</button>
        <button class="icon-btn sm" data-heat-act="next" title="Вперёд">${icon('chevR', 16)}</button>
      </div>
    </div>
    ${grid}
    ${tip}
    <div class="hm-legend"><span class="muted">Дни</span>${o.legend.map(([c, l]) => `<span><i style="background:${c}"></i>${l}</span>`).join('')}</div>`;
}

function redraw(id) {
  const el = document.querySelector(`[data-heat="${id}"]`);
  if (el && reg.has(id)) el.innerHTML = inner(id);
}

document.addEventListener('click', (e) => {
  const card = e.target.closest('[data-heat]');
  if (!card) return;
  const id = card.dataset.heat, s = st.get(id), o = reg.get(id);
  if (!s || !o) return;
  const day = e.target.closest('[data-heat-day]');
  if (day) { s.picked = s.picked === day.dataset.heatDay ? null : day.dataset.heatDay; redraw(id); return; }
  const act = e.target.closest('[data-heat-act]')?.dataset.heatAct;
  if (!act) return;
  const a = s.anchor;
  if (act === 'month' || act === 'year') s.mode = act;
  if (act === 'now') s.anchor = new Date();
  if (act === 'prev' || act === 'next') {
    const k = act === 'prev' ? -1 : 1;
    s.anchor = s.mode === 'year' ? new Date(a.getFullYear() + k, a.getMonth(), 1) : new Date(a.getFullYear(), a.getMonth() + k, 1);
  }
  s.picked = null;
  redraw(id);
  o.onRange?.(heatRange(id));
});

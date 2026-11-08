// Календарь «что предстоит»: привычки по их дням недели и сроки целей.
// Общий для страниц «Привычки» и «Цели». Нажатие на день показывает список дел на этот день.
import { getState } from './store.js';
import { icon } from './icons.js';
import { LOCALE } from './i18n.js';
import { esc, dateKey, parseKey, addDays, weekdayIdx, humanDate, DAY_SHORT, DAY_FULL } from './ui.js';
import { isDue, dayProgress, freqLabel } from './views/habits.js';

const cal = { month: null, sel: null };

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };

// всё, что относится к дню
function itemsFor(d) {
  const s = getState(), key = dateKey(d), today = dateKey();
  const end = startOfDay(addDays(d, 1)).getTime();
  const out = [];
  s.goals.forEach((g) => {
    const doneKey = g.done && g.completedAt ? dateKey(new Date(g.completedAt)) : null;
    if (doneKey === key) out.push({ kind: 'goal', g, done: true });
    else if (!g.done && g.deadline === key) out.push({ kind: 'goal', g, done: false, late: key < today });
  });
  s.habits.forEach((h) => {
    if (h.type === 'timer' && h.mode === 'since') return;
    if ((h.createdAt || 0) >= end || !isDue(h, d)) return;
    out.push({ kind: 'habit', h, p: key <= today ? dayProgress(h, key) : null });
  });
  return out;
}

function cellHTML(d, inMonth) {
  const key = dateKey(d), today = dateKey();
  const items = inMonth ? itemsFor(d) : [];
  // точками помечаем то, что бывает не каждый день: сроки целей и привычки по дням недели
  const marks = items.filter((it) => it.kind === 'goal' || (it.h.days && it.h.days.length < 7)).slice(0, 3);
  const habits = items.filter((it) => it.kind === 'habit');
  const allDone = key <= today && habits.length && habits.every((it) => it.p >= 1);
  const late = items.some((it) => it.late);
  return `<button type="button" class="pc-cell ${inMonth ? '' : 'out'} ${key < today ? 'past' : ''} ${key === today ? 'today' : ''} ${key === cal.sel ? 'sel' : ''} ${allDone ? 'all' : ''}" data-cal-day="${key}" ${inMonth ? '' : 'tabindex="-1"'}>
    <span class="n">${d.getDate()}</span>
    <span class="pc-dots">${marks.map((it) => `<i style="background:${it.late ? '#fb7185' : (it.g || it.h).color}"></i>`).join('')}${late && !marks.some((m) => m.late) ? '<i style="background:#fb7185"></i>' : ''}</span>
  </button>`;
}

function dayListHTML(d) {
  const key = dateKey(d), today = dateKey();
  const items = itemsFor(d).sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'goal' ? -1 : 1));
  const head = `<div class="pc-day-head"><b>${humanDate(d)}</b><span class="muted small">${DAY_FULL[weekdayIdx(d)]}${items.length ? ` · ${items.length}` : ''}</span></div>`;
  if (!items.length) return `${head}<div class="muted small pc-empty">На этот день ничего не запланировано</div>`;
  return `${head}<div class="list">${items.map((it) => {
    if (it.kind === 'goal') {
      const g = it.g;
      const st = it.done ? `<span class="pc-tag ok">${icon('check', 13, 3)} выполнено</span>`
        : it.late ? '<span class="pc-tag late">срок прошёл</span>' : '<span class="pc-tag">срок цели</span>';
      return `<a class="item" href="#/goals" style="--gc:${g.color}"><span class="ic" style="background:color-mix(in srgb,${g.color} 20%,transparent)">${g.emoji}</span>
        <div class="grow"><div class="t ellipsis">${esc(g.title)}</div><div class="muted tiny bold">Цель</div></div>${st}</a>`;
    }
    const h = it.h;
    const st = it.p == null ? '<span class="pc-tag">предстоит</span>'
      : it.p >= 1 ? `<span class="pc-tag ok">${icon('check', 13, 3)} сделано</span>`
      : key === today ? `<span class="pc-tag">${it.p > 0 ? Math.round(it.p * 100) + '%' : 'сегодня'}</span>` : '<span class="pc-tag miss">пропущено</span>';
    return `<a class="item" href="#/habits" style="--gc:${h.color}"><span class="ic" style="background:color-mix(in srgb,${h.color} 20%,transparent)">${h.emoji}</span>
      <div class="grow"><div class="t ellipsis">${esc(h.title)}</div><div class="muted tiny bold">${freqLabel(h)}</div></div>${st}</a>`;
  }).join('')}</div>`;
}

export function plannerHTML() {
  const now = new Date();
  cal.month ||= new Date(now.getFullYear(), now.getMonth(), 1);
  cal.sel ||= dateKey(now);
  const m = cal.month;
  const first = addDays(m, -weekdayIdx(m));
  const last = new Date(m.getFullYear(), m.getMonth() + 1, 0);
  const weeks = Math.ceil((weekdayIdx(m) + last.getDate()) / 7);
  const title = m.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' }).replace(' г.', '');
  const cells = Array.from({ length: weeks * 7 }, (_, i) => { const d = addDays(first, i); return cellHTML(d, d.getMonth() === m.getMonth()); }).join('');
  return `<div class="card plan-cal" data-plan>
    <div class="row between pc-head">
      <div class="row" style="gap:8px"><span class="dc-ic pc-ic">${icon('calendar', 17)}</span><div><div class="bold">Календарь</div><div class="muted tiny bold">что предстоит</div></div></div>
      <div class="row" style="gap:4px">
        <button class="icon-btn sm ghost" data-cal-move="-1" aria-label="Предыдущий месяц">${icon('chevL', 18)}</button>
        <span class="pc-month" data-cal-today>${title.charAt(0).toUpperCase() + title.slice(1)}</span>
        <button class="icon-btn sm ghost" data-cal-move="1" aria-label="Следующий месяц">${icon('chevR', 18)}</button>
      </div>
    </div>
    <div class="pc-grid">${DAY_SHORT.map((n) => `<span class="pc-wd">${n}</span>`).join('')}${cells}</div>
    <div class="pc-day">${dayListHTML(parseKey(cal.sel))}</div>
  </div>`;
}

// обработка нажатий внутри календаря; true — если нажатие было его
export function plannerClick(e) {
  const box = e.target.closest('[data-plan]');
  if (!box) return false;
  let el;
  if ((el = e.target.closest('[data-cal-move]'))) {
    const m = cal.month;
    cal.month = new Date(m.getFullYear(), m.getMonth() + +el.dataset.calMove, 1);
  } else if (e.target.closest('[data-cal-today]')) {
    const now = new Date();
    cal.month = new Date(now.getFullYear(), now.getMonth(), 1); cal.sel = dateKey(now);
  } else if ((el = e.target.closest('[data-cal-day]'))) {
    cal.sel = el.dataset.calDay;
    const d = parseKey(cal.sel);
    if (d.getMonth() !== cal.month.getMonth()) cal.month = new Date(d.getFullYear(), d.getMonth(), 1);
  } else return !!e.target.closest('.pc-grid, .pc-head');
  box.outerHTML = plannerHTML();
  return true;
}

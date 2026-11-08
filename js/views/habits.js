import { habitsHeat } from '../stats.js';
import { getState, update, uid } from '../store.js';
import { icon } from '../icons.js';
import { plannerHTML, plannerClick } from '../planner.js';
import { esc, fmt, plural, openSheet, closeSheet, toast, stepper, bindSteppers, num, emojiPicker, colorPicker, bindPickers, confetti, confirmSheet, clamp, COLORS, dateKey, addDays, weekDates, weekdayIdx, DAY_SHORT, splitDuration, fmtClock, fmtHuman } from '../ui.js';

const ui = { filter: 'all' };

// ---------- логика привычек ----------
// на паузе время замирает в момент паузы
export function sinceMs(h) { return (h.pausedAt || Date.now()) - (h.startedAt || Date.now()); }
export function swMs(h, key = dateKey()) {
  let v = (h.log || {})[key] || 0;
  if (h.running && h.runStart && key === dateKey()) v += Date.now() - h.runStart;
  return v;
}
// прогресс за день 0..1
export function dayProgress(h, key = dateKey()) {
  const v = (h.log || {})[key] || 0;
  if (h.type === 'check') return v ? 1 : 0;
  if (h.type === 'count') return clamp(v / (h.target || 1), 0, 1);
  if (h.type === 'timer' && h.mode === 'stopwatch') return clamp(swMs(h, key) / ((h.target || 10) * 60000), 0, 1);
  return 0;
}
// по каким дням недели привычка (0 = пн); без days — каждый день
export const isWeekly = (h) => Array.isArray(h.days) && h.days.length > 0 && h.days.length < 7;
export function isDue(h, d = new Date()) { return !isWeekly(h) || h.days.includes(weekdayIdx(d)); }
export function freqLabel(h) {
  if (h.type === 'timer' && h.mode === 'since') return 'сколько прошло';
  if (!isWeekly(h)) return 'каждый день';
  const days = [...h.days].sort().map((i) => DAY_SHORT[i]);
  return days.length === 1 ? `раз в неделю · ${days[0]}` : days.join(', ');
}
// привычки, запланированные на сегодня
export const dueToday = (habits) => habits.filter((h) => !(h.type === 'timer' && h.mode === 'since') && isDue(h));

// серия: сколько запланированных дней подряд выполнено (дни вне расписания пропускаются)
export function streak(h) {
  if (h.type === 'timer' && h.mode === 'since') return Math.floor(sinceMs(h) / 86400000);
  let n = 0, d = new Date();
  if (!isDue(h, d) || dayProgress(h, dateKey(d)) < 1) d = addDays(d, -1);
  for (let i = 0; i < 3650; i++, d = addDays(d, -1)) {
    if (!isDue(h, d)) continue;
    if (dayProgress(h, dateKey(d)) >= 1) n++; else break;
  }
  return n;
}

export function timerUnits(ms) {
  const { d, h, m, s } = splitDuration(ms);
  const p = (x) => String(x).padStart(2, '0');
  return `<div><b>${d}</b><span>${plural(d, 'день', 'дня', 'дней')}</span></div><div><b>${p(h)}</b><span>час</span></div><div><b>${p(m)}</b><span>мин</span></div><div><b>${p(s)}</b><span>сек</span></div>`;
}

// обновление «живых» таймеров на странице
export function tickTimers(root) {
  if (!root) return;
  const hs = getState().habits;
  root.querySelectorAll('[data-tick-since]').forEach((el) => {
    const h = hs.find((x) => x.id === el.dataset.tickSince);
    if (h) el.innerHTML = timerUnits(sinceMs(h));
  });
  root.querySelectorAll('[data-tick-sw]').forEach((el) => {
    const h = hs.find((x) => x.id === el.dataset.tickSw);
    if (h) el.textContent = fmtClock(swMs(h));
  });
  root.querySelectorAll('[data-tick-swbar]').forEach((el) => {
    const h = hs.find((x) => x.id === el.dataset.tickSwbar);
    if (h) el.style.width = dayProgress(h) * 100 + '%';
  });
}
export const tick = tickTimers;

const TYPE_LABEL = { check: 'Отметка', count: 'Количество', timer: 'Таймер' };

// ---------- рендер ----------
export function render(root) {
  const habits = getState().habits;
  const list = habits.filter((h) => ui.filter === 'all' || h.type === ui.filter);
  const daily = dueToday(habits);
  const doneToday = daily.filter((h) => dayProgress(h) >= 1).length;

  root.innerHTML = `
    <header class="page-head">
      <div><h1>Привычки</h1><div class="sub">Отмечай каждый день, считай повторы и засекай время</div></div>
      <button class="btn btn-primary desktop-only" data-new>${icon('plus', 18)} Новая привычка</button>
    </header>

    ${habits.length ? `<div class="card card-accent" style="margin-bottom:16px">
      <div class="row"><div class="grow"><div class="bold">${daily.length ? `Сегодня выполнено ${doneToday} из ${daily.length}` : 'Сегодня по плану ничего нет'}</div>
        <div class="bar" style="margin-top:10px"><i style="width:${daily.length ? (doneToday / daily.length) * 100 : 0}%"></i></div></div>
        <span style="font-size:30px;margin-left:8px">${doneToday === daily.length && daily.length ? '🔥' : '🌱'}</span></div></div>` : ''}

    <div class="chips" style="margin-bottom:16px">
      ${[['all', 'Все'], ['check', '✅ Отметка'], ['count', '🔢 Количество'], ['timer', '⏱️ Таймеры']].map(([k, l]) => `<button class="chip ${ui.filter === k ? 'on' : ''}" data-filter="${k}">${l}</button>`).join('')}
    </div>

    ${list.length ? `<div class="grid grid-auto">${list.map(habitCard).join('')}</div>` : `
      <div class="card"><div class="empty"><div class="em">🌱</div><h4>${habits.length ? 'Нет привычек этого типа' : 'Создай первую привычку'}</h4>
        <p>Например: «Пить воду», «10 000 шагов», «Без сладкого» с таймером, сколько ты держишься.</p>
        <button class="btn btn-primary" data-new>${icon('plus', 18)} Новая привычка</button></div></div>`}

    ${habits.length ? `<div style="margin-top:16px">${plannerHTML()}</div>` : ''}

    <button class="fab mobile-only" data-new aria-label="Новая привычка">${icon('plus', 26)}</button>`;
  root.insertAdjacentHTML('beforeend', `<div class="heat-wrap">${habitsHeat()}</div>`);
}

function weekDots(h) {
  const today = dateKey();
  return `<div class="week-dots">${weekDates().map((d, i) => {
    const k = dateKey(d), p = dayProgress(h, k);
    return `<div class="wdot ${p >= 1 ? 'on' : p > 0 ? 'part' : ''} ${isDue(h, d) ? '' : 'off'} ${k === today ? 'today' : ''}"><i></i>${DAY_SHORT[i]}</div>`;
  }).join('')}</div>`;
}

function habitCard(h) {
  const today = dateKey();
  const v = (h.log || {})[today] || 0;
  const st = streak(h);
  let body = '';
  let action = '';

  if (h.type === 'check') {
    action = `<button class="big-check ${v ? 'on' : ''}" data-check="${h.id}" aria-label="Отметить">${icon('check', 22, 3)}</button>`;
    body = `<div style="margin-top:14px">${weekDots(h)}</div>`;
  } else if (h.type === 'count') {
    action = `<div class="bold num" style="font-size:18px">${fmt(v)}<span class="muted small">/${fmt(h.target)}</span></div>`;
    body = `<div class="bar" style="margin-top:14px"><i style="width:${dayProgress(h) * 100}%"></i></div>
      <div class="prog-controls">
        <button class="icon-btn sm" data-count="${h.id}" data-dir="-1" aria-label="Меньше">${icon('minus', 16)}</button>
        <button class="btn btn-sm grow" data-count="${h.id}" data-dir="1" style="background:color-mix(in srgb,${h.color} 22%,transparent);border-color:transparent">${icon('plus', 15)} ${fmt(h.step || 1)} ${esc(h.unit || '')}</button>
      </div>
      <div style="margin-top:12px">${weekDots(h)}</div>`;
  } else if (h.mode === 'since') {
    body = `<div class="timer-widget" style="--c1:${h.color};--c2:color-mix(in srgb, ${h.color} 55%, #312e81);margin-top:14px">
        <div class="tw-title">${icon(h.pausedAt ? 'pause' : 'hourglass', 15)} ${h.pausedAt ? 'На паузе' : 'Держусь уже'}</div>
        <div class="tw-units" data-tick-since="${h.id}">${timerUnits(sinceMs(h))}</div>
        <div class="tw-sub">Рекорд: ${h.best ? fmtHuman(Math.max(h.best, sinceMs(h))) : fmtHuman(sinceMs(h))}${h.resets?.length ? ` · попыток: ${h.resets.length + 1}` : ''}</div>
      </div>
      <div class="prog-controls">
        <button class="btn btn-sm grow" data-pause="${h.id}">${h.pausedAt ? `${icon('play', 15)} Продолжить` : `${icon('pause', 15)} Пауза`}</button>
        <button class="btn btn-sm grow" data-reset="${h.id}">${icon('rotate', 15)} Начать заново</button>
      </div>`;
  } else {
    const ms = swMs(h);
    body = `<div class="timer-face" style="--gc:${h.color}">
        <button class="big-check ${h.running ? 'on pulse' : ''}" data-sw="${h.id}" style="color:${h.running ? '#fff' : 'var(--text)'}" aria-label="${h.running ? 'Пауза' : 'Старт'}">${icon(h.running ? 'pause' : 'play', 20)}</button>
        <div class="grow"><div class="tf-time" data-tick-sw="${h.id}">${fmtClock(ms)}</div>
        <div class="tf-sub">сегодня · цель ${fmt(h.target)} мин</div>
        <div class="bar thin" style="margin-top:8px"><i data-tick-swbar="${h.id}" style="width:${dayProgress(h) * 100}%"></i></div></div>
      </div>
      <div style="margin-top:12px">${weekDots(h)}</div>`;
  }

  return `<div class="goal-card" style="--gc:${h.color}">
    <div class="gc-top">
      <div class="gc-emoji">${h.emoji}</div>
      <div class="grow"><div class="gc-title">${esc(h.title)}</div>
        <div class="gc-sub row" style="gap:8px">${TYPE_LABEL[h.type]}${h.type === 'timer' ? (h.mode === 'since' ? ' · сколько прошло' : ' · секундомер') : ''}${h.type === 'timer' && h.mode === 'since' ? '' : ' · ' + freqLabel(h)}
        ${st ? `<span class="streak">${icon('flame', 13)} ${st} ${isWeekly(h) ? plural(st, 'раз', 'раза', 'раз') : plural(st, 'день', 'дня', 'дней')}</span>` : ''}</div></div>
      ${action}
      <button class="icon-btn sm ghost" data-edit="${h.id}" aria-label="Изменить">${icon('dots', 18)}</button>
    </div>
    ${body}
  </div>`;
}

// ---------- события ----------
export function bind(root) {
  root.addEventListener('click', (e) => {
    const t = (sel) => e.target.closest(sel);
    let el;
    if (plannerClick(e)) return;
    if (t('[data-new]')) return habitSheet();
    if ((el = t('[data-filter]'))) { ui.filter = el.dataset.filter; render(root); return; }
    if ((el = t('[data-edit]'))) return habitSheet(getState().habits.find((x) => x.id === el.dataset.edit));
    if ((el = t('[data-check]'))) {
      let on = false;
      update((s) => { const h = s.habits.find((x) => x.id === el.dataset.check); h.log ||= {}; const k = dateKey(); h.log[k] = h.log[k] ? 0 : 1; on = !!h.log[k]; });
      if (on) celebrateIfAll();
      return;
    }
    if ((el = t('[data-count]'))) {
      const dir = +el.dataset.dir;
      let reached = false;
      update((s) => {
        const h = s.habits.find((x) => x.id === el.dataset.count); h.log ||= {};
        const k = dateKey(), before = h.log[k] || 0;
        h.log[k] = Math.max(0, +(before + dir * (h.step || 1)).toFixed(2));
        reached = before < h.target && h.log[k] >= h.target;
      });
      if (reached) { toast('Норма на сегодня выполнена!', '🎉'); celebrateIfAll(); }
      return;
    }
    if ((el = t('[data-sw]'))) { toggleStopwatch(el.dataset.sw); return; }
    if ((el = t('[data-pause]'))) {
      update((s) => {
        const x = s.habits.find((y) => y.id === el.dataset.pause);
        if (x.pausedAt) { x.startedAt += Date.now() - x.pausedAt; delete x.pausedAt; } // продолжить: время паузы не засчитывается
        else x.pausedAt = Date.now();
      });
      return;
    }
    if ((el = t('[data-reset]'))) {
      const h = getState().habits.find((x) => x.id === el.dataset.reset);
      confirmSheet('Начать заново?', `Таймер «${esc(h.title)}» обнулится. Текущий результат (${fmtHuman(sinceMs(h))}) сохранится как рекорд, если он лучше.`, 'Сбросить').then((ok) => {
        if (!ok) return;
        update((s) => { const x = s.habits.find((y) => y.id === h.id); const cur = sinceMs(x); x.best = Math.max(x.best || 0, cur); (x.resets ||= []).push({ at: Date.now(), ms: cur }); x.startedAt = Date.now(); delete x.pausedAt; });
        toast('Новая попытка! Ты справишься', '💪');
      });
    }
  });
}

export function toggleStopwatch(id) {
  let reached = false;
  update((s) => {
    const h = s.habits.find((x) => x.id === id);
    h.log ||= {};
    const k = dateKey();
    if (h.running) {
      const before = h.log[k] || 0;
      h.log[k] = before + (Date.now() - h.runStart);
      h.running = false; h.runStart = null;
      reached = before < h.target * 60000 && h.log[k] >= h.target * 60000;
    } else { h.running = true; h.runStart = Date.now(); }
  });
  if (reached) { toast('Цель по времени выполнена!', '⏱️'); celebrateIfAll(); }
}

function celebrateIfAll() {
  const daily = dueToday(getState().habits);
  if (daily.length > 1 && daily.every((h) => dayProgress(h) >= 1)) { confetti(); toast('Все привычки на сегодня выполнены!', '🔥'); }
}

function toLocalInput(ts) {
  const d = new Date(ts); d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function habitSheet(habit) {
  const h = habit || { title: '', emoji: '💧', color: COLORS[2], type: 'check', target: 8, step: 1, unit: '', mode: 'since', startedAt: Date.now() };
  let { emoji, color, type, mode } = h;
  mode ||= 'since';
  let weekly = isWeekly(h);
  const days = new Set(weekly ? h.days : [weekdayIdx()]);
  openSheet({
    title: habit ? 'Изменить привычку' : 'Новая привычка',
    body: `
      <div class="field"><span class="label">Привычка</span><input class="input" name="title" value="${esc(h.title)}" placeholder="Например: Пить воду" autofocus /></div>
      <div class="field"><span class="label">Тип</span>
        <div class="type-cards">
          <button type="button" class="type-card ${type === 'check' ? 'on' : ''}" data-type="check"><span class="t">✅ Отметка</span><span class="d">Просто отмечаю: сделал или нет.</span></button>
          <button type="button" class="type-card ${type === 'count' ? 'on' : ''}" data-type="count"><span class="t">🔢 Количество</span><span class="d">Стаканы, страницы, шаги — с нормой на день.</span></button>
          <button type="button" class="type-card ${type === 'timer' ? 'on' : ''}" data-type="timer"><span class="t">⏱️ Таймер</span><span class="d">Сколько прошло времени или секундомер.</span></button>
        </div></div>
      <div data-f="count" class="fields-3" ${type === 'count' ? '' : 'hidden'}>
        <div class="field"><span class="label">Норма в день</span>${stepper('target', type === 'count' ? h.target : 8, { step: 1, min: 1, max: 100000 })}</div>
        <div class="field"><span class="label">Шаг «+»</span>${stepper('step', h.step || 1, { step: 1, min: 1, max: 10000 })}</div>
        <div class="field"><span class="label">Единица</span><input class="input" name="unit" value="${esc(h.unit || '')}" placeholder="стак." /></div>
      </div>
      <div data-f="timer" class="stack" ${type === 'timer' ? '' : 'hidden'}>
        <div class="seg">
          <button type="button" data-mode="since" class="${mode === 'since' ? 'on' : ''}">${icon('hourglass', 16)} Сколько прошло</button>
          <button type="button" data-mode="stopwatch" class="${mode === 'stopwatch' ? 'on' : ''}">${icon('stopwatch', 16)} Секундомер</button>
        </div>
        <div data-m="since" class="field" ${mode === 'since' ? '' : 'hidden'}>
          <span class="label">С какого момента считать (например, когда бросил курить)</span>
          <input class="input" type="datetime-local" name="startedAt" value="${toLocalInput(h.startedAt || Date.now())}" />
        </div>
        <div data-m="stopwatch" class="field" ${mode === 'stopwatch' ? '' : 'hidden'}>
          <span class="label">Цель в день, минут (например, медитация или чтение)</span>
          ${stepper('minutes', type === 'timer' && h.mode === 'stopwatch' ? h.target : 15, { step: 5, min: 1, max: 1440 })}
        </div>
      </div>
      <div class="field" data-freq ${type === 'timer' && mode === 'since' ? 'hidden' : ''}><span class="label">Как часто</span>
        <div class="seg">
          <button type="button" data-freq-set="daily" class="${weekly ? '' : 'on'}">Каждый день</button>
          <button type="button" data-freq-set="weekly" class="${weekly ? 'on' : ''}">По дням недели</button>
        </div>
        <div class="week-strip" data-days style="margin-top:10px" ${weekly ? '' : 'hidden'}>${DAY_SHORT.map((n, i) => `<button type="button" class="day-pill ${days.has(i) ? 'on' : ''}" data-d="${i}" style="padding:10px 0"><span class="dn">${n}</span></button>`).join('')}</div>
        <div class="muted tiny" data-days-hint style="margin-top:6px" ${weekly ? '' : 'hidden'}>Раз в неделю — выбери один день. В эти дни привычка появится в календаре.</div>
      </div>
      <div class="field"><span class="label">Иконка</span>${emojiPicker(emoji)}</div>
      <div class="field"><span class="label">Цвет</span>${colorPicker(color)}</div>
      <button class="btn btn-primary btn-block" data-save>${icon('check', 18)} ${habit ? 'Сохранить' : 'Создать привычку'}</button>
      ${habit ? `<button class="btn btn-block btn-danger" data-del>${icon('trash', 18)} Удалить привычку</button>` : ''}`,
    onMount: (el) => {
      bindSteppers(el);
      bindPickers(el, (x) => (emoji = x), (x) => (color = x));
      el.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
        type = b.dataset.type;
        el.querySelectorAll('[data-type]').forEach((x) => x.classList.toggle('on', x === b));
        el.querySelectorAll('[data-f]').forEach((x) => { x.hidden = x.dataset.f !== type; });
        syncFreq();
      }));
      const syncFreq = () => { el.querySelector('[data-freq]').hidden = type === 'timer' && mode === 'since'; };
      el.querySelectorAll('[data-freq-set]').forEach((b) => b.addEventListener('click', () => {
        weekly = b.dataset.freqSet === 'weekly';
        el.querySelectorAll('[data-freq-set]').forEach((x) => x.classList.toggle('on', x === b));
        el.querySelector('[data-days]').hidden = !weekly;
        el.querySelector('[data-days-hint]').hidden = !weekly;
      }));
      el.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
        const i = +b.dataset.d;
        if (days.has(i)) days.delete(i); else days.add(i);
        b.classList.toggle('on', days.has(i));
      }));
      el.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
        mode = b.dataset.mode;
        el.querySelectorAll('[data-mode]').forEach((x) => x.classList.toggle('on', x === b));
        el.querySelectorAll('[data-m]').forEach((x) => { x.hidden = x.dataset.m !== mode; });
        syncFreq();
      }));
      const f = (n) => el.querySelector(`[name="${n}"]`).value;
      el.querySelector('[data-save]').addEventListener('click', () => {
        const title = f('title').trim();
        if (!title) { toast('Напиши название привычки', '✍️'); return; }
        const data = { title, emoji, color, type };
        const usesFreq = !(type === 'timer' && mode === 'since');
        if (usesFreq && weekly && !days.size) { toast('Выбери хотя бы один день', '📅'); return; }
        data.days = usesFreq && weekly && days.size < 7 ? [...days].sort() : undefined;
        if (type === 'count') Object.assign(data, { target: Math.max(1, num(f('target'), 8)), step: Math.max(1, num(f('step'), 1)), unit: f('unit').trim() });
        if (type === 'timer') {
          data.mode = mode;
          if (mode === 'since') { const ts = new Date(f('startedAt')).getTime(); data.startedAt = Number.isFinite(ts) ? Math.min(ts, Date.now()) : Date.now(); }
          else data.target = Math.max(1, num(f('minutes'), 15));
        }
        update((s) => {
          if (habit) Object.assign(s.habits.find((x) => x.id === habit.id), data);
          else s.habits.push({ id: uid(), log: {}, createdAt: Date.now(), ...data });
        });
        closeSheet(); toast(habit ? 'Сохранено' : 'Привычка создана', emoji);
      });
      el.querySelector('[data-del]')?.addEventListener('click', async () => {
        if (await confirmSheet('Удалить привычку?', `«${esc(habit.title)}» и вся её история будут удалены.`)) {
          update((s) => { s.habits = s.habits.filter((x) => x.id !== habit.id); });
          toast('Привычка удалена', '🗑️');
        }
      });
    },
  });
}

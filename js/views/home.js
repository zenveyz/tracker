import { getState, update, uid } from '../store.js';
import { icon } from '../icons.js';
import { bodySnapsHTML } from '../bodysnap.js';
import { MUSCLES, findExercise } from '../data/exercises.js';
import { esc, fmt, ring, longDate, dateKey, weekdayIdx, clamp, plural, fmtClock, toast } from '../ui.js';
import { dayItems, isDone, muscleLoad, loadFills } from './workouts.js';
import { dayTotals } from './food.js';
import { dayProgress, sinceMs, swMs, timerUnits, tickTimers, toggleStopwatch, streak } from './habits.js';
import { heroHTML, startHero, stopHero } from '../hero.js';
import { lastNight, sleepGoal, sleepData, fmtH, logSheet } from './sleep.js';
import { addDays, DAY_SHORT } from '../ui.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return 'Доброй ночи';
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

const sec = (s) => `style="--a1:var(--${s}-1);--a2:var(--${s}-2)"`;

export function render(root) {
  const s = getState(), st = s.settings;
  const d = weekdayIdx();
  const items = dayItems(d);
  const muscles = [...new Set(items.map((it) => findExercise(it.exId, s.customExercises)?.muscle).filter(Boolean))];
  const doneN = items.filter((it) => isDone(d, it.id)).length;
  const t = dayTotals(dateKey());
  const kp = t.kcal / st.kcalGoal;
  const timers = s.habits.filter((h) => h.type === 'timer' && (h.mode === 'since' || h.running));
  const habits = s.habits.filter((h) => !(h.type === 'timer' && h.mode === 'since'));
  const habitsDone = habits.filter((h) => dayProgress(h) >= 1).length;
  const goals = s.goals.filter((g) => !g.done).slice(0, 4);
  const { progress, parts } = dayProgressAll();
  const last = lastNight(), sg = sleepGoal(), sd = sleepData();
  const week = Array.from({ length: 7 }, (_, i) => { const d = addDays(new Date(), i - 6); return { l: DAY_SHORT[weekdayIdx(d)], v: sd[dateKey(d)]?.hours || 0 }; });

  root.innerHTML = `
    <header class="page-head hello">
      <div><div class="muted small bold">${longDate()}</div>
      <h1 style="margin-top:6px">${greeting()}${st.name ? `, <span class="grad-text">${esc(st.name)}</span>` : ''} 👋</h1></div>
      <a class="icon-btn mobile-only" href="#/settings" aria-label="Настройки">${icon('sliders', 18)}</a>
    </header>

    ${heroHTML({ progress, parts })}

    <div class="card pad-lg dash-card sleep-card" data-go="sleep" style="margin:14px 0">
      <div class="row" style="gap:14px">
        <span class="dc-ic" style="background:linear-gradient(135deg,#818cf8,#c084fc)">${icon('moon', 18)}</span>
        <div class="grow"><div class="dc-title">Сон</div>
          <div class="muted tiny bold">${last ? `${last.bed} → ${last.wake} · цель ${sg} ч` : 'Отметь, как ты спал'}</div></div>
        <div class="sleep-mini">${week.map((w, i) => `<div class="${w.v >= sg ? 'hit' : ''} ${i === 6 ? 'today' : ''}"><i style="height:${Math.min(100, (w.v / (sg + 2)) * 100)}%"></i><span>${w.l}</span></div>`).join('')}</div>
      </div>
      <div class="row between" style="margin-top:14px">
        <div><span class="big-num">${last ? fmtH(last.hours).replace(' мин', '<small> мин</small>').replace(' ч', '<small> ч</small>') : '—'}</span></div>
        <button class="btn btn-sm" data-sleep-log>${icon('plus', 15)} ${last && last.key === dateKey() ? 'Изменить' : 'Записать сон'}</button>
      </div>
    </div>

    ${timers.length ? `<div class="grid grid-auto" style="margin-bottom:14px">${timers.map((h) => h.mode === 'since' ? `
      <div class="timer-widget" style="--c1:${h.color};--c2:color-mix(in srgb, ${h.color} 55%, #312e81)" data-go="habits">
        <div class="tw-title">${h.emoji} ${esc(h.title)}</div>
        <div class="tw-units" data-tick-since="${h.id}">${timerUnits(sinceMs(h))}</div>
      </div>` : `
      <div class="timer-widget" style="--c1:${h.color};--c2:color-mix(in srgb, ${h.color} 55%, #312e81)">
        <div class="row between" style="position:relative;z-index:1"><div class="tw-title">${h.emoji} ${esc(h.title)} · идёт</div>
          <button class="icon-btn sm" data-sw="${h.id}" style="background:rgba(255,255,255,.22);border:0;color:#fff" aria-label="Пауза">${icon('pause', 16)}</button></div>
        <div class="tw-time" data-tick-sw="${h.id}">${fmtClock(swMs(h))}</div>
      </div>`).join('')}</div>` : ''}

    <div class="grid grid-dash">
      <div class="card pad-lg dash-card" data-go="workouts" ${sec('workouts')}>
        <div class="dc-head"><span class="dc-ic" style="background:linear-gradient(135deg,var(--a1),var(--a2))">${icon('dumbbell', 18)}</span>
          <div><div class="dc-title">Тренировка сегодня</div><div class="muted tiny bold">${items.length ? `${doneN} из ${items.length} выполнено` : 'день отдыха'}</div></div>
          <span class="dc-more">${icon('chevR', 18)}</span></div>
        ${items.length ? `
          <div class="row" style="align-items:center;gap:16px">
            <div style="flex:none">${bodySnapsHTML(muscleLoad(items), { fills: loadFills(muscleLoad(items)) })}</div>
            <div class="grow stack" style="gap:8px">
              ${muscles.map((m) => `<span class="badge accent" style="align-self:flex-start">${MUSCLES[m].emoji} ${MUSCLES[m].name}</span>`).join('')}
              <div class="bar thin" style="margin-top:6px"><i style="width:${(doneN / items.length) * 100}%"></i></div>
            </div>
          </div>` : `<div class="muted small" style="line-height:1.5">На сегодня упражнений нет. Открой «Тренировки», выбери мышцы на теле и поставь упражнения в план.</div>`}
      </div>

      <div class="card pad-lg dash-card" data-go="food" ${sec('food')}>
        <div class="dc-head"><span class="dc-ic" style="background:linear-gradient(135deg,var(--a1),var(--a2))">${icon('apple', 18)}</span>
          <div><div class="dc-title">Питание</div><div class="muted tiny bold">цель ${fmt(st.kcalGoal)} ккал</div></div>
          <span class="dc-more">${icon('chevR', 18)}</span></div>
        <div class="row" style="gap:18px">
          ${ring(kp, { size: 108, stroke: 11, c1: kp > 1 ? '#fb7185' : 'var(--a1)', c2: kp > 1 ? '#e11d48' : 'var(--a2)', center: `<div class="bold num" style="font-size:20px">${fmt(t.kcal)}</div><div class="muted tiny">ккал</div>` })}
          <div class="grow stack" style="gap:10px">
            <div class="row between small"><span class="muted bold">💧 Вода</span><span class="num bold">${fmt(t.water)} / ${fmt(st.waterGoal)}</span></div>
            <div class="bar thin"><i style="width:${clamp(t.water / st.waterGoal, 0, 1) * 100}%;background:var(--water)"></i></div>
            <button class="btn btn-sm" data-water style="align-self:flex-start">${icon('plus', 15)} стакан воды</button>
          </div>
        </div>
      </div>
    </div>

    <div class="grid grid-dash" style="margin-top:14px">
      <div class="card pad-lg" ${sec('habits')}>
        <div class="dc-head row" style="margin-bottom:14px"><span class="dc-ic" style="width:36px;height:36px;border-radius:12px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--a1),var(--a2))">${icon('flame', 18)}</span>
          <div class="grow"><div class="dc-title bold">Привычки</div><div class="muted tiny bold">${habits.length ? `${habitsDone} из ${habits.length} сегодня` : 'пока нет'}</div></div>
          <a class="link small muted bold" href="#/habits">Все</a></div>
        ${habits.length ? `<div class="list">${habits.slice(0, 6).map((h) => {
          const p = dayProgress(h), stx = streak(h);
          return `<div class="item" style="--gc:${h.color}">
            <span class="ic" style="background:color-mix(in srgb,${h.color} 20%,transparent)">${h.emoji}</span>
            <div class="grow"><div class="t ellipsis">${esc(h.title)}</div>
              <div class="bar thin" style="margin-top:7px"><i style="width:${p * 100}%;background:${h.color}"></i></div></div>
            ${stx ? `<span class="streak">${icon('flame', 13)}${stx}</span>` : ''}
            ${h.type === 'check' ? `<button class="check ${p >= 1 ? 'on' : ''}" data-hcheck="${h.id}" style="${p >= 1 ? `background:${h.color}` : ''}" aria-label="Отметить">${icon('check', 18, 3)}</button>`
              : h.type === 'count' ? `<button class="icon-btn sm" data-hcount="${h.id}" aria-label="Плюс">${icon('plus', 16)}</button>`
              : `<button class="icon-btn sm" data-sw="${h.id}" aria-label="Старт/пауза">${icon(h.running ? 'pause' : 'play', 15)}</button>`}
          </div>`;
        }).join('')}</div>` : `<a class="btn btn-block" href="#/habits">${icon('plus', 18)} Создать привычку</a>`}
      </div>

      <div class="card pad-lg" ${sec('goals')}>
        <div class="row" style="margin-bottom:14px"><span style="width:36px;height:36px;border-radius:12px;display:grid;place-items:center;color:#fff;background:linear-gradient(135deg,var(--a1),var(--a2))">${icon('target', 18)}</span>
          <div class="grow"><div class="bold" style="font-size:15px">Цели</div><div class="muted tiny bold">${s.goals.filter((g) => !g.done).length} активных · ${s.goals.filter((g) => g.done).length} выполнено</div></div>
          <a class="link small muted bold" href="#/goals">Все</a></div>
        ${goals.length ? `<div class="list">${goals.map((g) => {
          const p = g.type === 'single' ? 0 : clamp(g.current / g.target, 0, 1);
          return `<a class="item" href="#/goals" style="text-decoration:none;color:inherit">
            <span class="ic" style="background:color-mix(in srgb,${g.color} 20%,transparent)">${g.emoji}</span>
            <div class="grow"><div class="t ellipsis">${esc(g.title)}</div>
            ${g.type === 'progress' ? `<div class="bar thin" style="margin-top:7px"><i style="width:${p * 100}%;background:${g.color}"></i></div>` : '<div class="s">разовая цель</div>'}</div>
            ${g.type === 'progress' ? `<span class="bold num small">${Math.round(p * 100)}%</span>` : ''}
          </a>`;
        }).join('')}</div>` : `<a class="btn btn-block" href="#/goals">${icon('plus', 18)} Поставить цель</a>`}
      </div>
    </div>`;
  startHero(root, dayProgressAll().progress);
}

export function bind(root) {
  root.addEventListener('click', (e) => {
    const t = (sel) => e.target.closest(sel);
    let el;
    if (t('[data-water]')) {
      update((s) => { (s.food[dateKey()] ||= { food: [], drinks: [] }).drinks.push({ id: uid(), name: 'Вода', ml: 250, kcal: 0, e: '💧', water: true, time: new Date().toTimeString().slice(0, 5) }); });
      toast('+250 мл воды', '💧');
      return;
    }
    if ((el = t('[data-sw]'))) { toggleStopwatch(el.dataset.sw); return; }
    if ((el = t('[data-hcheck]'))) {
      update((s) => { const h = s.habits.find((x) => x.id === el.dataset.hcheck); h.log ||= {}; const k = dateKey(); h.log[k] = h.log[k] ? 0 : 1; });
      return;
    }
    if ((el = t('[data-hcount]'))) {
      update((s) => { const h = s.habits.find((x) => x.id === el.dataset.hcount); h.log ||= {}; const k = dateKey(); h.log[k] = (h.log[k] || 0) + (h.step || 1); });
      return;
    }
    if (t('[data-sleep-log]')) { logSheet(); return; }
    if ((el = t('[data-go]'))) location.hash = '#/' + el.dataset.go;
  });
}

export const tick = tickTimers;
export function unmount() { stopHero(); }

// общий прогресс дня — сколько «пути на гору» пройдено
function dayProgressAll() {
  const s = getState(), st = s.settings;
  const parts = [];
  const d = weekdayIdx();
  const items = dayItems(d);
  if (items.length) { const n = items.filter((it) => isDone(d, it.id)).length; parts.push({ e: '🏋️', label: `Тренировка ${n}/${items.length}`, v: n / items.length }); }
  const t = dayTotals(dateKey());
  parts.push({ e: '💧', label: `Вода ${fmt(t.water / 1000, 1)}/${fmt(st.waterGoal / 1000, 1)} л`, v: clamp(t.water / st.waterGoal, 0, 1) });
  parts.push({ e: '🍽️', label: `${fmt(t.kcal)} ккал`, v: clamp(t.kcal / st.kcalGoal, 0, 1) });
  const hs = s.habits.filter((h) => !(h.type === 'timer' && h.mode === 'since'));
  if (hs.length) { const n = hs.filter((h) => dayProgress(h) >= 1).length; parts.push({ e: '🔥', label: `Привычки ${n}/${hs.length}`, v: n / hs.length }); }
  const sl = (s.sleep || {})[dateKey()];
  parts.push({ e: '😴', label: sl ? `Сон ${fmtH(sl.hours).replace(' мин', 'м').replace(' ч ', 'ч ')}` : 'Сон', v: sl ? clamp(sl.hours / (st.sleepGoal || 8), 0, 1) : 0 });
  const progress = parts.reduce((a, x) => a + x.v, 0) / parts.length;
  return { progress, parts };
}

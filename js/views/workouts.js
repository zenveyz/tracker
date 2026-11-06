import { getState, update, uid } from '../store.js';
import { icon } from '../icons.js';
import { bodySVG, miniBodies, heatColor } from '../body.js';
import { MUSCLES, MUSCLE_ORDER, EXERCISES, EQUIP_EMOJI, findExercise } from '../data/exercises.js';
import { exerciseFigure, animateFigures } from '../figure.js';
import { bodyViewHTML, initBodyView } from '../bodyview.js';
import { workoutHeat, trainedItems } from '../stats.js';
import { heatRange, eachDay } from '../heatmap.js';
import { requirePremium, isPremium, lockedHTML } from '../premium.js';
import { esc, fmt, plural, openSheet, closeSheet, toast, stepper, bindSteppers, num, DAY_SHORT, DAY_FULL, weekDates, weekdayIdx, dateKey, confirmSheet, confetti } from '../ui.js';

// ---------- локальное состояние экрана ----------
const ui = {
  tab: 'body',
  muscle: null,
  day: weekdayIdx(),
  focusEx: null, // упражнение, мышцы которого подсвечены на теле
  view3d: true, // только 3D-тело (2D-схема — лишь запасной вариант, если WebGL недоступен)
  bodyStyle: 'line', // line — как схема, color — цветные мышцы
};
let bv = null;
const BACK_ONLY = ['lats', 'lowerback', 'glutes', 'hamstrings', 'triceps', 'traps'];
const FRONT_ONLY = ['neck', 'chest', 'biceps', 'abs', 'obliques', 'quads', 'adductors'];

// ---------- 3D ----------
let b3 = null, b3host = null, b3state = 'idle'; // idle | loading | ready | failed
function mount3D(root) {
  const slot = root.querySelector('[data-body3d-slot]');
  if (!slot) return;
  if (!b3host) { b3host = document.createElement('div'); b3host.className = 'body3d-host'; }
  slot.appendChild(b3host);
  if (b3state === 'idle') {
    b3state = 'loading';
    import('../anatomy3d.js').then((m) => {
      b3 = m.createAnatomy3D(b3host, {
        onSelect: (mus) => { if (mus) selectMuscle(mus, document.querySelector('#main > .view'), { fromBody: true }); },
      });
      return b3.ready;
    }).then(() => {
      b3state = 'ready';
      document.querySelector('[data-body3d-loader]')?.remove();
      sync3D();
    }).catch((err) => { console.warn('3D недоступно', err); b3state = 'failed'; rerender(); });
  }
}
function highlightSets() {
  const s = getState();
  const planned = [...new Set(s.myExercises.map((id) => exById(id)?.muscle).filter(Boolean))];
  const ex = ui.focusEx && exById(ui.focusEx);
  if (ex) return { primary: [ex.muscle], secondary: ex.secondary || [], planned };
  return { primary: ui.muscle ? [ui.muscle] : [], secondary: [], planned };
}
function sync3D() {
  if (!b3) return;
  b3.setStyle(ui.bodyStyle);
  if (ui.tab === 'history') { b3.set({}); b3.setHeat(periodHeat()); return; }
  b3.setHeat(null);
  b3.set(highlightSets());
}
// ---------- история: какие мышцы тренировались за месяц / год ----------
function periodLoad(range = heatRange('workouts')) {
  const items = [];
  const now = new Date();
  eachDay(range.from, range.to, (k, d) => { if (d <= now) items.push(...trainedItems(k)); });
  return muscleLoad(items);
}
function periodHeat() {
  const load = periodLoad(), max = Math.max(0, ...Object.values(load));
  const heat = {};
  if (max > 0) Object.entries(load).forEach(([m, v]) => { heat[m] = v / max; });
  return heat;
}
function loadListHTML() {
  const load = periodLoad(), max = Math.max(1, ...Object.values(load));
  const rows = MUSCLE_ORDER.map((m) => [m, load[m] || 0]).sort((a, b) => b[1] - a[1]);
  if (!rows[0][1]) return `<div class="muted small" style="line-height:1.5">За этот период нет отмеченных тренировок. Отмечай упражнения во вкладке «Неделя» — и здесь появится, какие мышцы ты тренировал больше всего.</div>`;
  return `<div class="load-list">${rows.map(([m, v]) => `<div class="load-row">
      <span>${MUSCLES[m].name}</span>
      <div class="bar"><i style="width:${(v / max) * 100}%;background:color-mix(in srgb, #e5372f ${Math.round(25 + 75 * v / max)}%, #f2f2f4)"></i></div>
      <span class="muted num" style="text-align:right">${fmt(Math.round(v * 10) / 10)}</span>
    </div>`).join('')}</div>`;
}
function onHistoryRange() {
  const list = document.querySelector('[data-load-list]');
  if (list) list.innerHTML = loadListHTML();
  sync3D();
}
function historyTab() {
  if (!isPremium()) return `<div class="grid grid-dash"><div class="stack">${workoutHeat()}</div>
    ${lockedHTML('История и нагрузка на мышцы', `<div class="card body-card"><div class="bold">Нагрузка на мышцы</div><div style="margin-top:14px">${loadListHTML()}</div></div>`, 'card')}</div>`;
  return `
  <div class="grid grid-dash">
    <div class="stack">
      ${workoutHeat(onHistoryRange)}
    </div>
    <div class="card body-card">
      <div class="row between" style="margin-bottom:10px;gap:8px">
        <div><div class="bold">Нагрузка на мышцы</div><div class="muted small">за выбранный месяц или год · подходы</div></div>
        <div class="seg" style="max-width:200px"><button data-3d="front">Спереди</button><button data-3d="back">Сзади</button></div>
      </div>
      <div class="stage3d">
        <div class="body3d-slot" data-body3d-slot></div>
        ${b3state !== 'ready' ? `<div class="body3d-loader" data-body3d-loader><div class="spinner"></div><span>Загружаю 3D-модель…</span></div>` : ''}
        <div class="stage-legend"><span><i style="background:#f2f2f4;border:1px solid #999"></i>мало</span><span><i style="background:#e5372f"></i>больше всего</span></div>
      </div>
      <div data-load-list style="margin-top:14px">${loadListHTML()}</div>
    </div>
  </div>`;
}
function faceFor(muscle) {
  if (!muscle) return;
  const side = BACK_ONLY.includes(muscle) ? 'back' : FRONT_ONLY.includes(muscle) ? 'front' : null;
  if (ui.view3d && b3 && side) b3.face(side);
  if (!ui.view3d && bv) bv.showSideFor(muscle, side);
}

// ---------- расчёты ----------
const allEx = () => [...EXERCISES, ...getState().customExercises];
const exById = (id) => findExercise(id, getState().customExercises);

export function muscleLoad(items) {
  const load = {};
  items.forEach((it) => {
    const e = exById(it.exId);
    if (!e) return;
    load[e.muscle] = (load[e.muscle] || 0) + (it.sets || 1);
    (e.secondary || []).forEach((m) => { load[m] = (load[m] || 0) + (it.sets || 1) * 0.5; });
  });
  return load;
}
export function loadFills(load) {
  const max = Math.max(1, ...Object.values(load));
  const fills = {};
  Object.entries(load).forEach(([m, v]) => { fills[m] = heatColor(v / max); });
  return fills;
}
const volume = (it) => (it.weight || 0) * (it.reps || 0) * (it.sets || 0);
export const dayItems = (d) => getState().plan[d] || [];
export const isDone = (d, id) => (getState().doneLog[dateKey(weekDates()[d])] || []).includes(id);
const primaryMuscles = (items) => [...new Set(items.map((it) => exById(it.exId)?.muscle).filter(Boolean))];

// ---------- рендер ----------
export function render(root) {
  const s = getState();
  const myCount = s.myExercises.length;
  root.innerHTML = `
    <header class="page-head">
      <div><h1>Тренировки</h1><div class="sub">Выбирай мышцы, собирай упражнения и планируй неделю</div></div>
    </header>
    <div class="seg" style="margin-bottom:18px">
      <button data-tab="body" class="${ui.tab === 'body' ? 'on' : ''}">${icon('body', 17)}Тело</button>
      <button data-tab="mine" class="${ui.tab === 'mine' ? 'on' : ''}">${icon('list', 17)}Мои${myCount ? ` · ${myCount}` : ''}</button>
      <button data-tab="week" class="${ui.tab === 'week' ? 'on' : ''}">${icon('calendar', 17)}Неделя</button>
      <button data-tab="history" class="${ui.tab === 'history' ? 'on' : ''}">${icon('chart', 17)}История</button>
    </div>
    ${ui.tab === 'body' ? bodyTab() : ui.tab === 'mine' ? mineTab() : ui.tab === 'history' ? historyTab() : weekTab()}`;
  bindSteppers(root);
  if ((ui.tab === 'body' || (ui.tab === 'history' && isPremium())) && ui.view3d && b3state !== 'failed') mount3D(root);
  bv = ui.tab === 'body' && !ui.view3d ? initBodyView(root, { onSelect: (m) => selectMuscle(m, root, { fromBody: true }) }) : null;
  animateFigures(root, exById);
  sync3D();
}

// ===== вкладка «Тело» =====
function bodyTab() {
  const hs = highlightSets();
  const focus = ui.focusEx && exById(ui.focusEx);
  const use3D = ui.view3d && b3state !== 'failed';
  const fills = {};
  hs.secondary.forEach((m) => { fills[m] = heatColor(0.5); });
  const legend = focus ? `<div class="stage-legend"><span><i class="lg-p"></i>${MUSCLES[focus.muscle].name}</span>${(focus.secondary || []).length ? `<span><i class="lg-s"></i>вспомогательные</span>` : ''}</div>` : '';
  return `
  <div class="body-wrap">
    <div class="card body-card">
      <div class="row between" style="margin-bottom:10px;gap:8px">
        ${use3D ? `<div class="seg" style="flex:1;max-width:300px">
            <button data-3d="front">Спереди</button><button data-3d="back">Сзади</button><button data-3d="side">Сбоку</button>
          </div>` : `<div class="seg" style="flex:1;max-width:300px">
            <button data-bv-mode="front">Спереди</button><button data-bv-mode="back">Сзади</button><button data-bv-mode="both">Оба</button>
          </div>`}
      </div>
      ${use3D ? `
      <div class="stage3d">
        <div class="body3d-slot" data-body3d-slot></div>
        ${b3state !== 'ready' ? `<div class="body3d-loader" data-body3d-loader><div class="spinner"></div><span>Загружаю 3D-модель…</span></div>` : ''}
        <div class="stage-tools">
          <button class="icon-btn sm glass" data-3d="in" title="Приблизить">${icon('plus', 16)}</button>
          <button class="icon-btn sm glass" data-3d="out" title="Отдалить">${icon('minus', 16)}</button>
          <button class="icon-btn sm glass" data-3d="reset" title="Сбросить вид">${icon('undo', 16)}</button>
          <button class="icon-btn sm glass ${ui.bodyStyle === 'color' ? 'on-color' : ''}" data-3dstyle title="Цвета мышц">${icon('layers', 16)}</button>
        </div>
        ${legend}
      </div>
      <div class="body-hint" style="justify-content:center;margin-top:8px">${icon('swap', 14)} Крути пальцем · щипок — зум · двумя пальцами — двигать · ${icon('layers', 13)} — цвета</div>`
      : `
      <div class="stage2d">
        ${bodyViewHTML({ selected: hs.primary, planned: hs.planned, fills })}
        <div class="stage-tools">
          <button class="icon-btn sm glass" data-bv-zoom="1.4" title="Приблизить">${icon('plus', 16)}</button>
          <button class="icon-btn sm glass" data-bv-zoom="0.7" title="Отдалить">${icon('minus', 16)}</button>
          <button class="icon-btn sm glass" data-bv-reset title="Сбросить вид">${icon('undo', 16)}</button>
        </div>
        ${legend}
      </div>
      <div class="body-hint" style="justify-content:center;margin-top:8px">${icon('swap', 14)} Нажми на мышцу · щипок или колесо — зум · свайп — другая сторона</div>`}
      <div class="chips muscle-chips">
        ${MUSCLE_ORDER.map((m) => `<button class="chip ${ui.muscle === m ? 'on' : ''}" data-muscle-chip="${m}">${MUSCLES[m].name}</button>`).join('')}
      </div>
    </div>
    <div data-panel>${musclePanel()}</div>
  </div>`;
}
function fills2D(hs) {
  const f = {};
  hs.secondary.forEach((m) => { f[m] = heatColor(0.45); });
  hs.primary.forEach((m) => { f[m] = heatColor(1); });
  return f;
}

function musclePanel() {
  const s = getState();
  if (!ui.muscle) {
    return `<div class="card pad-lg">
      <div class="empty" style="padding:18px 6px 8px">
        <div class="em">👆</div>
        <h4>Выбери группу мышц</h4>
        <p>Нажми на мышцу на теле — появятся упражнения, которые её качают.</p>
      </div>
      <div class="muscle-grid">
        ${MUSCLE_ORDER.map((m) => {
          const n = s.myExercises.filter((id) => exById(id)?.muscle === m).length;
          return `<button class="item" data-muscle-chip="${m}" style="text-align:left">
            <span class="ic" style="width:36px;height:36px;font-size:17px">${MUSCLES[m].emoji}</span>
            <span class="grow"><span class="t" style="font-size:13.5px;display:block">${MUSCLES[m].name}</span>
            <span class="s">${n ? `выбрано: ${n}` : `${allEx().filter((e) => e.muscle === m).length} упр.`}</span></span>
          </button>`;
        }).join('')}
      </div>
    </div>`;
  }
  const m = ui.muscle;
  const list = allEx().filter((e) => e.muscle === m);
  const also = allEx().filter((e) => e.muscle !== m && (e.secondary || []).includes(m)).slice(0, 6);
  return `<div class="card pad-lg">
    <div class="muscle-panel-head">
      <div class="mp-ic" style="font-size:22px">${MUSCLES[m].emoji}</div>
      <div class="grow"><div style="font-weight:800;font-size:19px;letter-spacing:-0.02em">${MUSCLES[m].name}</div>
      <div class="muted small">${list.length} ${plural(list.length, 'упражнение', 'упражнения', 'упражнений')} · нажми «+», чтобы добавить</div></div>
      <button class="icon-btn ghost" data-clear-muscle aria-label="Закрыть">${icon('x', 18)}</button>
    </div>
    <div class="list">${list.map((e) => exCard(e, s.myExercises.includes(e.id))).join('')}</div>
    ${also.length ? `<div class="section-title" style="margin:20px 2px 10px"><h2 style="font-size:14px" class="muted">Тоже задействуют эту мышцу</h2></div>
      <div class="list">${also.map((e) => exCard(e, s.myExercises.includes(e.id))).join('')}</div>` : ''}
    <button class="btn btn-block" data-custom-ex="${m}" style="margin-top:14px">${icon('plus', 18)} Своё упражнение</button>
  </div>`;
}

function exCard(e, added) {
  const lvl = ['', 'Легко', 'Средне', 'Сложно'][e.level || 1];
  const focused = ui.focusEx === e.id;
  const f = {};
  (e.secondary || []).forEach((m) => { f[m] = heatColor(0.45); });
  f[e.muscle] = heatColor(1);
  return `<div class="ex-card ${added ? 'added' : ''} ${focused ? 'focused' : ''}" data-focus-ex="${e.id}">
    <div class="ex-row">
      <div class="ex-thumb fig">${exerciseFigure(e)}</div>
      <div class="grow">
        <div class="ex-name">${esc(e.name)}</div>
        <div class="ex-meta"><span class="badge">${esc(e.equip || 'Своё')}</span><span class="badge">${lvl}</span>
        ${(e.secondary || []).slice(0, 2).map((m) => `<span class="badge">+ ${MUSCLES[m].name}</span>`).join('')}</div>
        ${focused ? '' : '<div class="tiny faint ex-hint">Нажми — покажу на теле, что качает</div>'}
      </div>
      <button class="icon-btn ${added ? 'accent' : ''}" data-toggle-ex="${e.id}" aria-label="${added ? 'Убрать' : 'Добавить'}">${icon(added ? 'check' : 'plus', 18)}</button>
    </div>
    ${focused ? `<div class="ex-expand">
      <div class="ex-demo">${exerciseFigure(e, { cls: 'big' })}</div>
      <div class="ex-side">
        <div class="label" style="margin-bottom:6px">Что качает</div>
        <div class="mini-bodies">${bodySVG('front', { fills: f })}${bodySVG('back', { fills: f })}</div>
        <div class="ex-muscles"><span class="badge accent">● ${MUSCLES[e.muscle].name}</span>${(e.secondary || []).map((m) => `<span class="badge sec">● ${MUSCLES[m].name}</span>`).join('')}</div>
      </div>
      ${e.tip ? `<div class="ex-tip full">💡 ${esc(e.tip)}</div>` : ''}
      <div class="fields-2 full">
        <button class="btn" data-plan-ex="${e.id}">${icon('calendar', 17)} В план</button>
        <button class="btn btn-primary" data-toggle-ex="${e.id}">${icon(added ? 'check' : 'plus', 17)} ${added ? 'Уже в «Моих»' : 'В «Мои»'}</button>
      </div>
    </div>` : ''}
  </div>`;
}

// ===== вкладка «Мои упражнения» =====
function mineTab() {
  const s = getState();
  if (!s.myExercises.length) {
    return `<div class="card"><div class="empty"><div class="em">🏋️</div><h4>Пока пусто</h4>
      <p>Открой вкладку «Тело», выбери мышцу и добавь упражнения — они появятся здесь.</p>
      <button class="btn btn-primary" data-tab="body">${icon('body', 18)} Выбрать на теле</button></div></div>`;
  }
  const groups = {};
  s.myExercises.forEach((id) => { const e = exById(id); if (e) (groups[e.muscle] ||= []).push(e); });
  return `
    <div class="card card-accent" style="margin-bottom:16px">
      <div class="row"><div class="grow"><div class="bold">Собери тренировку</div>
      <div class="muted small" style="margin-top:3px">Нажми на календарь у упражнения, чтобы поставить его в нужный день и указать вес и подходы.</div></div>
      <span style="font-size:30px">📅</span></div>
    </div>
    ${MUSCLE_ORDER.filter((m) => groups[m]).map((m) => `
      <div class="section-title"><h2>${MUSCLES[m].emoji} ${MUSCLES[m].name}</h2><span class="badge">${groups[m].length}</span></div>
      <div class="list">${groups[m].map((e) => {
        const days = Object.entries(s.plan).filter(([, arr]) => arr.some((it) => it.exId === e.id)).map(([d]) => DAY_SHORT[d]);
        return `<div class="ex-card ex-row">
          <div class="ex-thumb fig" data-info-ex="${e.id}">${exerciseFigure(e)}</div>
          <div class="grow"><div class="ex-name">${esc(e.name)}</div>
            <div class="ex-meta">${days.length ? days.map((d) => `<span class="badge accent">${d}</span>`).join('') : '<span class="badge">не в плане</span>'}</div></div>
          <button class="icon-btn accent" data-plan-ex="${e.id}" aria-label="Добавить в день">${icon('calendar', 18)}</button>
          <button class="icon-btn ghost" data-toggle-ex="${e.id}" aria-label="Убрать">${icon('trash', 17)}</button>
        </div>`;
      }).join('')}</div>`).join('')}`;
}

// ===== вкладка «Неделя» =====
function weekTab() {
  const s = getState();
  const dates = weekDates();
  const today = weekdayIdx();
  const items = dayItems(ui.day);
  const load = muscleLoad(items);
  const sets = items.reduce((a, it) => a + (it.sets || 0), 0);
  const vol = items.reduce((a, it) => a + volume(it), 0);
  const doneN = items.filter((it) => isDone(ui.day, it.id)).length;
  const muscles = primaryMuscles(items);

  // итог недели
  const all = Object.values(s.plan).flat();
  const wLoad = muscleLoad(all);
  const wSets = all.reduce((a, it) => a + (it.sets || 0), 0);
  const wVol = all.reduce((a, it) => a + volume(it), 0);
  const trainDays = Object.values(s.plan).filter((a) => a.length).length;
  const wDone = Object.entries(s.plan).reduce((a, [d, arr]) => a + arr.filter((it) => isDone(+d, it.id)).length, 0);
  const maxLoad = Math.max(1, ...Object.values(wLoad));
  const ranked = MUSCLE_ORDER.map((m) => [m, wLoad[m] || 0]).sort((a, b) => b[1] - a[1]);

  return `
    <div class="week-strip">
      ${dates.map((d, i) => `<button class="day-pill ${i === ui.day ? 'on' : ''} ${i === today ? 'today' : ''}" data-day="${i}">
        <span class="dn">${DAY_SHORT[i]}</span><span class="dd">${d.getDate()}</span>
        <span class="dots">${(s.plan[i] || []).slice(0, 4).map(() => '<i></i>').join('')}</span>
      </button>`).join('')}
    </div>

    <div class="grid grid-dash" style="margin-top:16px">
      <div class="card pad-lg">
        <div class="row between">
          <div><div style="font-weight:800;font-size:20px;letter-spacing:-0.02em">${DAY_FULL[ui.day]}${ui.day === today ? ' <span class="badge accent">сегодня</span>' : ''}</div>
          <div class="muted small" style="margin-top:4px">${muscles.length ? muscles.map((m) => MUSCLES[m].name).join(' · ') : 'День отдыха'}</div></div>
          ${items.length ? `<span class="badge">${doneN}/${items.length}</span>` : ''}
        </div>
        ${items.length ? `
        <div style="margin:16px 0 6px">${miniBodies(loadFills(load))}</div>
        <div class="plan-stats">
          <div class="plan-stat"><b>${items.length}</b><span>упражнений</span></div>
          <div class="plan-stat"><b>${sets}</b><span>подходов</span></div>
          <div class="plan-stat"><b>${fmt(vol)}</b><span>кг объём</span></div>
        </div>` : `<div class="empty" style="padding:26px 10px 10px"><div class="em">😴</div><h4>Ничего не запланировано</h4><p>Добавь упражнения — и увидишь, что качаешь в этот день.</p></div>`}
      </div>

      <div class="stack">
        ${items.map((it) => planItem(it)).join('')}
        <button class="btn btn-primary btn-block" data-add-to-day>${icon('plus', 18)} Добавить упражнение</button>
      </div>
    </div>

    <div class="section-title" style="margin-top:34px"><h2>📊 Итог недели</h2></div>
    <div class="card pad-lg">
      <div class="stat-tiles">
        <div class="stat-tile"><b>${trainDays}</b><span>${plural(trainDays, 'день', 'дня', 'дней')} тренировок</span></div>
        <div class="stat-tile"><b>${all.length}</b><span>упражнений</span></div>
        <div class="stat-tile"><b>${wSets}</b><span>подходов</span></div>
        <div class="stat-tile"><b>${fmt(wVol / 1000, 1)} т</b><span>общий тоннаж</span></div>
        <div class="stat-tile"><b>${all.length ? Math.round((wDone / all.length) * 100) : 0}%</b><span>выполнено</span></div>
      </div>
      ${all.length ? `
      <div class="grid grid-dash" style="margin-top:20px;align-items:center">
        <div>${miniBodies(loadFills(wLoad), { lg: true })}</div>
        <div class="stack" style="gap:10px">
          ${ranked.map(([m, v]) => `<div class="heat-row"><span class="${v ? '' : 'faint'}">${MUSCLES[m].name}</span>
            <div class="bar"><i style="width:${(v / maxLoad) * 100}%"></i></div><span class="num small ${v ? '' : 'faint'}" style="text-align:right">${v ? fmt(v, 1) : '—'}</span></div>`).join('')}
          <div class="tiny faint">Число — подходы на мышцу за неделю (вспомогательные мышцы считаются как ½).</div>
        </div>
      </div>` : `<div class="empty" style="padding:20px 0 0"><p>Здесь появится полная картина недели: какие мышцы и сколько ты качал.</p></div>`}
    </div>

    <div class="week-grid" style="margin-top:14px">
      ${DAY_SHORT.map((d, i) => {
        const its = dayItems(i);
        const f = loadFills(muscleLoad(its));
        const ms = primaryMuscles(its);
        return `<div class="week-day-card" data-day="${i}">
          <div class="wd-name">${DAY_FULL[i]}</div>
          <div class="mini-bodies" style="gap:0">${bodySVG('front', { fills: f })}${bodySVG('back', { fills: f })}</div>
          <div class="wd-sub">${ms.length ? ms.slice(0, 3).map((m) => MUSCLES[m].name).join(', ') : 'Отдых'}</div>
        </div>`;
      }).join('')}
    </div>`;
}

function planItem(it) {
  const e = exById(it.exId);
  if (!e) return '';
  const done = isDone(ui.day, it.id);
  return `<div class="plan-item ${done ? 'done' : ''}">
    <div class="row">
      <button class="check ${done ? 'on' : ''}" data-done="${it.id}" aria-label="Выполнено">${icon('check', 18, 3)}</button>
      <div class="ex-thumb fig sm" data-info-ex="${e.id}">${exerciseFigure(e)}</div>
      <div class="grow"><div class="ex-name">${esc(e.name)}</div><div class="muted tiny" style="margin-top:3px">${MUSCLES[e.muscle].name}</div></div>
      <button class="icon-btn ghost sm" data-edit-item="${it.id}" aria-label="Изменить">${icon('edit', 16)}</button>
    </div>
    <div class="plan-stats">
      <div class="plan-stat"><b>${it.sets}</b><span>подходы</span></div>
      <div class="plan-stat"><b>${it.reps}</b><span>повторы</span></div>
      <div class="plan-stat"><b>${it.weight ? fmt(it.weight, 1) : '—'}</b><span>кг</span></div>
    </div>
    ${it.note ? `<div class="ex-tip">📝 ${esc(it.note)}</div>` : ''}
  </div>`;
}

// ---------- события ----------
export function bind(root) {
  root.addEventListener('click', onClick);
}

function rerender() {
  const root = document.querySelector('#main > .view');
  if (root) render(root);
}

function selectMuscle(m, root, { fromBody = false } = {}) {
  ui.muscle = ui.muscle === m && !ui.focusEx ? null : m;
  ui.focusEx = null;
  ui.tab = 'body';
  render(root);
  if (ui.muscle && !fromBody) faceFor(ui.muscle);
  if (ui.muscle && window.innerWidth < 920 && !fromBody) {
    root.querySelector('[data-panel]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function onClick(e) {
  const root = e.currentTarget;
  const t = (sel) => e.target.closest(sel);
  let el;

  if ((el = t('[data-tab]'))) { ui.tab = el.dataset.tab; render(root); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
  if (t('[data-3dstyle]')) { ui.bodyStyle = ui.bodyStyle === 'color' ? 'line' : 'color'; render(root); return; }
  if ((el = t('[data-bv-mode]'))) { bv?.fit(el.dataset.bvMode); return; }
  if ((el = t('[data-bv-zoom]'))) { bv?.zoom(+el.dataset.bvZoom); return; }
  if (t('[data-bv-reset]')) { bv?.fit(window.innerWidth < 640 ? 'front' : 'both'); return; }
  if ((el = t('[data-3d]'))) {
    if (!b3) return;
    const a = el.dataset['3d'];
    if (a === 'front' || a === 'back' || a === 'side') b3.face(a);
    else if (a === 'in') b3.zoom(0.8);
    else if (a === 'out') b3.zoom(1.25);
    else b3.reset();
    return;
  }
  if ((el = t('.interactive-2d [data-muscle]'))) { selectMuscle(el.dataset.muscle, root); return; }
  if ((el = t('[data-info-ex]'))) { exerciseSheet(el.dataset.infoEx); return; }
  if ((el = t('[data-muscle-chip]'))) { ui.tab = 'body'; selectMuscle(el.dataset.muscleChip, root); return; }
  if (t('[data-clear-muscle]')) { ui.muscle = null; render(root); return; }

  if ((el = t('[data-toggle-ex]'))) {
    const id = el.dataset.toggleEx;
    const has = getState().myExercises.includes(id);
    if (has && Object.values(getState().plan).some((a) => a.some((it) => it.exId === id))) {
      confirmSheet('Убрать упражнение?', 'Оно также удалится из плана на неделю.', 'Убрать').then((ok) => {
        if (!ok) return;
        update((s) => {
          s.myExercises = s.myExercises.filter((x) => x !== id);
          Object.keys(s.plan).forEach((d) => { s.plan[d] = s.plan[d].filter((it) => it.exId !== id); });
        });
      });
      return;
    }
    update((s) => { s.myExercises = has ? s.myExercises.filter((x) => x !== id) : [...s.myExercises, id]; });
    toast(has ? 'Убрано из списка' : 'Добавлено в «Мои упражнения»', has ? '🗑️' : '💪');
    return;
  }
  if ((el = t('[data-custom-ex]'))) { const m = el.dataset.customEx; requirePremium('Свои упражнения', () => customExerciseSheet(m)); return; }
  if ((el = t('[data-plan-ex]'))) { planSheet({ exId: el.dataset.planEx }); return; }
  if ((el = t('[data-day]'))) {
    ui.day = +el.dataset.day; render(root);
    if (el.classList.contains('week-day-card')) window.scrollTo({ top: 0, behavior: 'smooth' });
    return;
  }
  if (t('[data-add-to-day]')) { pickExerciseSheet(); return; }
  if ((el = t('[data-done]'))) {
    const id = el.dataset.done;
    const key = dateKey(weekDates()[ui.day]);
    let allDone = false;
    update((s) => {
      const arr = s.doneLog[key] || [];
      s.doneLog[key] = arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id];
      const items = s.plan[ui.day] || [];
      s.trainLog ||= {};
      s.trainLog[key] = s.doneLog[key].map((x) => items.find((it) => it.id === x)).filter(Boolean).map((it) => ({ exId: it.exId, sets: it.sets || 1 }));
      allDone = items.length > 0 && items.every((it) => s.doneLog[key].includes(it.id)) && !arr.includes(id);
    });
    if (allDone) { confetti(); toast('Тренировка выполнена!', '🔥'); }
    return;
  }
  if ((el = t('[data-edit-item]'))) {
    const it = dayItems(ui.day).find((x) => x.id === el.dataset.editItem);
    if (it) planSheet({ exId: it.exId, item: it });
    return;
  }
  if ((el = t('[data-focus-ex]')) && !t('button')) {
    const id = el.dataset.focusEx;
    ui.focusEx = ui.focusEx === id ? null : id;
    render(root);
    const ex = exById(id);
    if (ui.focusEx && ex) faceFor(ex.muscle);
  }
}

// подробная карточка упражнения
function exerciseSheet(id) {
  const e = exById(id);
  if (!e) return;
  const f = {};
  (e.secondary || []).forEach((m) => { f[m] = heatColor(0.45); });
  f[e.muscle] = heatColor(1);
  openSheet({
    title: esc(e.name),
    body: `
      <div class="ex-demo sheet-demo">${exerciseFigure(e, { cls: 'big' })}</div>
      <div class="row" style="gap:14px;align-items:flex-start">
        <div class="mini-bodies" style="flex:none">${bodySVG('front', { fills: f })}${bodySVG('back', { fills: f })}</div>
        <div class="stack grow" style="gap:8px">
          <div class="label">Основная мышца</div><div><span class="badge accent">● ${MUSCLES[e.muscle].name}</span></div>
          ${(e.secondary || []).length ? `<div class="label">Вспомогательные</div><div class="ex-muscles">${e.secondary.map((m) => `<span class="badge sec">● ${MUSCLES[m].name}</span>`).join('')}</div>` : ''}
          <div class="label">Оборудование</div><div class="small">${esc(e.equip || 'Своё')}</div>
        </div>
      </div>
      ${e.tip ? `<div class="card tight small" style="line-height:1.5">💡 ${esc(e.tip)}</div>` : ''}
      <div class="fields-2">
        <button class="btn" data-show3d>${icon('body', 17)} На 3D-теле</button>
        <button class="btn btn-primary" data-plan>${icon('calendar', 17)} В план</button>
      </div>`,
    onMount: (el) => {
      animateFigures(el, exById);
      el.querySelector('[data-plan]').onclick = () => planSheet({ exId: e.id });
      el.querySelector('[data-show3d]').onclick = () => {
        closeSheet();
        ui.tab = 'body'; ui.muscle = e.muscle; ui.focusEx = e.id;
        rerender();
        setTimeout(() => faceFor(e.muscle), 50);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    },
  });
}

// ---------- шторки ----------
function pickExerciseSheet() {
  const s = getState();
  const mine = s.myExercises.map(exById).filter(Boolean);
  const list = mine.length ? mine : [];
  openSheet({
    title: `Добавить на ${DAY_FULL[ui.day].toLowerCase()}`,
    body: list.length ? `
      <input class="input" placeholder="Поиск упражнения…" data-search autofocus />
      <div class="list" data-pick-list style="max-height:52dvh;overflow:auto">
        ${list.map((e) => `<button class="item" data-pick="${e.id}" data-name="${esc(e.name.toLowerCase())}" style="text-align:left">
          <span class="ic fig">${exerciseFigure(e)}</span>
          <span class="grow"><span class="t" style="display:block">${esc(e.name)}</span><span class="s">${MUSCLES[e.muscle].name}</span></span>
          ${icon('chevR', 18)}</button>`).join('')}
      </div>
      <button class="btn btn-block" data-go-body>${icon('body', 18)} Выбрать другие на теле</button>`
      : `<div class="empty" style="padding:10px"><div class="em">🏋️</div><h4>Сначала выбери упражнения</h4><p>Во вкладке «Тело» нажми на мышцу и добавь упражнения в «Мои».</p></div>
         <button class="btn btn-primary btn-block" data-go-body>${icon('body', 18)} Перейти к телу</button>`,
    onMount: (el) => {
      el.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => planSheet({ exId: b.dataset.pick })));
      el.querySelector('[data-go-body]')?.addEventListener('click', () => { closeSheet(); ui.tab = 'body'; rerender(); });
      el.querySelector('[data-search]')?.addEventListener('input', (ev) => {
        const q = ev.target.value.trim().toLowerCase();
        el.querySelectorAll('[data-pick]').forEach((b) => { b.hidden = q && !b.dataset.name.includes(q); });
      });
    },
  });
}

function planSheet({ exId, item }) {
  const e = exById(exId);
  if (!e) return;
  const d = item || { sets: e.def?.sets || 3, reps: e.def?.reps || 10, weight: e.def?.weight || 0, note: '' };
  const days = new Set(item ? [ui.day] : [ui.tab === 'week' ? ui.day : weekdayIdx()]);
  openSheet({
    title: item ? 'Изменить подход' : 'В план тренировок',
    body: `
      <div class="ex-card ex-row"><div class="ex-thumb fig">${exerciseFigure(e)}</div>
        <div class="grow"><div class="ex-name">${esc(e.name)}</div><div class="muted tiny" style="margin-top:3px">${MUSCLES[e.muscle].name}</div></div></div>
      ${item ? '' : `<div class="field"><span class="label">В какие дни</span>
        <div class="week-strip" data-days>${DAY_SHORT.map((n, i) => `<button type="button" class="day-pill ${days.has(i) ? 'on' : ''}" data-d="${i}" style="padding:10px 0"><span class="dn">${n}</span></button>`).join('')}</div></div>`}
      <div class="fields-3">
        <div class="field"><span class="label">Подходы</span>${stepper('sets', d.sets, { step: 1, min: 1, max: 20 })}</div>
        <div class="field"><span class="label">Повторы</span>${stepper('reps', d.reps, { step: 1, min: 1, max: 300 })}</div>
        <div class="field"><span class="label">Вес, кг</span>${stepper('weight', d.weight, { step: 2.5, min: 0, max: 600, dec: 1 })}</div>
      </div>
      <div class="field"><span class="label">Заметка</span><input class="input" name="note" placeholder="Например: отдых 90 сек" value="${esc(d.note || '')}" /></div>
      <button class="btn btn-primary btn-block" data-save>${icon('check', 18)} ${item ? 'Сохранить' : 'Добавить в план'}</button>
      ${item ? `<button class="btn btn-block btn-danger" data-del>${icon('trash', 18)} Удалить из дня</button>` : ''}`,
    onMount: (el) => {
      bindSteppers(el);
      el.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => {
        const i = +b.dataset.d; days.has(i) ? days.delete(i) : days.add(i); b.classList.toggle('on', days.has(i));
      }));
      const val = (n) => el.querySelector(`[name="${n}"]`).value;
      el.querySelector('[data-save]').addEventListener('click', () => {
        const data = { sets: Math.max(1, Math.round(num(val('sets'), 3))), reps: Math.max(1, Math.round(num(val('reps'), 10))), weight: Math.max(0, num(val('weight'), 0)), note: val('note').trim() };
        if (item) {
          update((s) => { const x = s.plan[ui.day].find((p) => p.id === item.id); Object.assign(x, data); });
          toast('Сохранено', '✅');
        } else {
          if (!days.size) { toast('Выбери хотя бы один день', '📅'); return; }
          update((s) => {
            if (!s.myExercises.includes(exId)) s.myExercises.push(exId);
            days.forEach((di) => s.plan[di].push({ id: uid(), exId, ...data }));
          });
          toast(`Добавлено: ${[...days].sort().map((i) => DAY_SHORT[i]).join(', ')}`, '📅');
        }
        closeSheet();
      });
      el.querySelector('[data-del]')?.addEventListener('click', () => {
        update((s) => { s.plan[ui.day] = s.plan[ui.day].filter((p) => p.id !== item.id); });
        closeSheet(); toast('Удалено', '🗑️');
      });
    },
  });
}

function customExerciseSheet(muscle) {
  openSheet({
    title: 'Своё упражнение',
    body: `
      <div class="field"><span class="label">Название</span><input class="input" name="name" placeholder="Например: Жим в Смите" autofocus /></div>
      <div class="field"><span class="label">Группа мышц</span>
        <select class="input" name="muscle">${MUSCLE_ORDER.map((m) => `<option value="${m}" ${m === muscle ? 'selected' : ''}>${MUSCLES[m].name}</option>`).join('')}</select></div>
      <button class="btn btn-primary btn-block" data-save>${icon('plus', 18)} Создать и добавить</button>`,
    onMount: (el) => {
      el.querySelector('[data-save]').addEventListener('click', () => {
        const name = el.querySelector('[name=name]').value.trim();
        if (!name) { toast('Введи название', '✍️'); return; }
        const m = el.querySelector('[name=muscle]').value;
        const id = 'c-' + uid();
        update((s) => {
          s.customExercises.push({ id, name, muscle: m, equip: 'Своё', secondary: [], level: 1, tip: '', def: { sets: 3, reps: 10, weight: 0 } });
          s.myExercises.push(id);
        });
        closeSheet(); toast('Упражнение создано', '💪');
      });
    },
  });
}

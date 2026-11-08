// Календари «месяц / год» для разделов: правила цвета каждого дня.
import { getState } from './store.js';
import { heatCard, eachDay, HEAT } from './heatmap.js';
import { plural, dateKey } from './ui.js';
import { isDue } from './views/habits.js';
import { MUSCLES, findExercise } from './data/exercises.js';

const clamp01 = (x) => Math.max(0, Math.min(1, x));
const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59).getTime();
const fmtH = (h) => { const m = Math.round(h * 60); return `${Math.floor(m / 60)} ч${m % 60 ? ` ${m % 60} мин` : ''}`; };
const today = () => dateKey();

// ---------- тренировки ----------
// что было сделано в этот день: снимок из trainLog, иначе — пункты плана по id из doneLog
export function trainedItems(key, s = getState()) {
  if (s.trainLog?.[key]?.length) return s.trainLog[key];
  const ids = s.doneLog[key] || [];
  if (!ids.length) return [];
  const all = Object.values(s.plan).flat();
  return ids.map((id) => all.find((it) => it.id === id)).filter(Boolean);
}
function workoutDay(key, d) {
  const s = getState();
  const items = trainedItems(key, s);
  if (items.length || (s.doneLog[key] || []).length) {
    const mus = [...new Set(items.map((it) => findExercise(it.exId, s.customExercises)?.muscle).filter(Boolean))];
    return { c: HEAT.green, tip: `тренировка${mus.length ? ': ' + mus.map((m) => MUSCLES[m]?.name).join(', ') : ''}` };
  }
  if (key === today() || endOfDay(d) < (s.meta.createdAt || 0)) return null;
  const planned = (s.plan[(d.getDay() + 6) % 7] || []).length > 0;
  return planned ? { c: HEAT.red, tip: 'пропущена тренировка' } : { c: HEAT.rest, tip: 'день отдыха' };
}
export function workoutHeat(onRange) {
  return heatCard('workouts', {
    title: 'Тренировки',
    day: workoutDay,
    legend: [[HEAT.red, 'Пропуск'], [HEAT.green, 'Тренировка'], [HEAT.rest, 'Отдых']],
    summary: (r) => {
      let n = 0;
      eachDay(r.from, r.to, (k, d) => { if (workoutDay(k, d)?.c === HEAT.green) n++; });
      return `${n} ${plural(n, 'тренировка', 'тренировки', 'тренировок')}`;
    },
    onRange,
  });
}

// ---------- сон ----------
function sleepDay(key) {
  const s = getState(), v = s.sleep[key];
  if (!v || !v.hours) return null;
  const goal = s.settings.sleepGoal || 8, h = v.hours;
  const c = h >= goal ? HEAT.green : h >= goal - 1 ? HEAT.lime : h >= goal - 2 ? HEAT.yellow : h >= goal - 3 ? HEAT.orange : HEAT.red;
  return { c, tip: `сон ${fmtH(h)}` };
}
export function sleepHeat() {
  const g = getState().settings.sleepGoal || 8;
  return heatCard('sleep', {
    title: 'Сон',
    day: sleepDay,
    legend: [[HEAT.red, `< ${g - 3} ч`], [HEAT.orange, `${g - 3}–${g - 2} ч`], [HEAT.yellow, `${g - 2}–${g - 1} ч`], [HEAT.lime, `${g - 1}–${g} ч`], [HEAT.green, `${g}+ ч`]],
    summary: (r) => {
      const v = [];
      eachDay(r.from, r.to, (k) => { const x = getState().sleep[k]?.hours; if (x) v.push(x); });
      return v.length ? `в среднем ${fmtH(v.reduce((a, b) => a + b, 0) / v.length)}` : 'нет записей';
    },
  });
}

// ---------- еда ----------
function kcalOf(key) {
  const d = getState().food[key];
  if (!d || !(d.food?.length || d.drinks?.length)) return null;
  return [...(d.food || []), ...(d.drinks || [])].reduce((a, x) => a + (x.kcal || 0), 0);
}
function foodDay(key) {
  const k = kcalOf(key);
  if (k === null) return null;
  const goal = getState().settings.kcalGoal || 2200, r = k / goal, dev = Math.abs(r - 1);
  const c = dev <= 0.1 ? HEAT.green : dev <= 0.2 ? HEAT.lime : dev <= 0.35 ? HEAT.yellow : r < 1 ? HEAT.orange : HEAT.red;
  return { c, tip: `${Math.round(k)} ккал из ${goal}` };
}
export function foodHeat() {
  return heatCard('food', {
    title: 'Питание',
    day: foodDay,
    legend: [[HEAT.green, 'В норме'], [HEAT.lime, '±20%'], [HEAT.yellow, '±35%'], [HEAT.orange, 'Мало'], [HEAT.red, 'Много']],
    summary: (r) => {
      let n = 0;
      eachDay(r.from, r.to, (k) => { if (foodDay(k)?.c === HEAT.green) n++; });
      return `в норме ${n} ${plural(n, 'день', 'дня', 'дней')}`;
    },
  });
}

// ---------- привычки ----------
function habitProgress(h, key) {
  const v = (h.log || {})[key] || 0;
  if (h.type === 'check') return v ? 1 : 0;
  if (h.type === 'count') return clamp01(v / (h.target || 1));
  if (h.type === 'timer' && h.mode === 'stopwatch') return clamp01(v / ((h.target || 10) * 60000));
  return 0;
}
function habitsDay(key, d) {
  const hs = getState().habits.filter((h) => !(h.type === 'timer' && h.mode === 'since') && (h.createdAt || 0) <= endOfDay(d) && isDue(h, d));
  if (!hs.length) return null;
  const done = hs.filter((h) => habitProgress(h, key) >= 1).length;
  const p = hs.reduce((a, h) => a + habitProgress(h, key), 0) / hs.length;
  if (key === today() && p === 0) return null;
  const c = p >= 1 ? HEAT.green : p >= 0.66 ? HEAT.lime : p >= 0.33 ? HEAT.yellow : p > 0 ? HEAT.orange : HEAT.red;
  return { c, tip: `выполнено ${done} из ${hs.length}` };
}
export function habitsHeat() {
  return heatCard('habits', {
    title: 'Привычки',
    day: habitsDay,
    legend: [[HEAT.red, 'Ничего'], [HEAT.orange, 'Мало'], [HEAT.yellow, 'Половина'], [HEAT.lime, 'Почти'], [HEAT.green, 'Все']],
    summary: (r) => {
      let n = 0;
      eachDay(r.from, r.to, (k, d) => { if (habitsDay(k, d)?.c === HEAT.green) n++; });
      return `все выполнены: ${n} ${plural(n, 'день', 'дня', 'дней')}`;
    },
  });
}

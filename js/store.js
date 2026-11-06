// Локальное хранилище. Всё лежит в localStorage этого браузера.
// Структура сделана так, чтобы позже можно было добавить синхронизацию с облаком (Supabase):
// у состояния есть meta.updatedAt, у записей — id.

const KEY = 'kosmic:v1';
const listeners = new Set();

function defaults() {
  return {
    version: 1,
    meta: { createdAt: Date.now(), updatedAt: Date.now() },
    settings: {
      name: '',
      theme: 'dark',
      kcalGoal: 2200,
      waterGoal: 2000,
      proteinGoal: 140,
      fatGoal: 70,
      carbGoal: 250,
      sleepGoal: 8,
    },
    // id упражнений из базы + свои упражнения
    myExercises: [],
    customExercises: [],
    // недельный план: 0 = понедельник ... 6 = воскресенье
    plan: { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] },
    // выполненные пункты плана по датам: { '2026-11-05': [planItemId, ...] }
    doneLog: {},
    // что именно сделано в день (снимок, чтобы история не менялась при правке плана)
    trainLog: {},
    // питание по датам: { '2026-11-05': { food: [...], drinks: [...] } }
    food: {},
    goals: [],
    habits: [],
    // сон по датам утра: { '2026-11-05': { bed: '23:30', wake: '07:10', hours: 7.67, quality: 4 } }
    sleep: {},
  };
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults();
    const data = JSON.parse(raw);
    return merge(defaults(), data);
  } catch (e) {
    console.warn('Не удалось прочитать данные', e);
    return defaults();
  }
}

function merge(base, data) {
  const out = { ...base, ...data };
  out.settings = { ...base.settings, ...(data.settings || {}) };
  out.meta = { ...base.meta, ...(data.meta || {}) };
  out.plan = { ...base.plan, ...(data.plan || {}) };
  return out;
}

let state = load();

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Не удалось сохранить', e);
  }
}

export function getState() {
  return state;
}

export function update(mutator) {
  mutator(state);
  state.meta.updatedAt = Date.now();
  save();
  listeners.forEach((fn) => fn(state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function exportData() {
  return JSON.stringify(state, null, 2);
}

export function importData(json) {
  const data = JSON.parse(json);
  if (!data || typeof data !== 'object' || !data.settings) throw new Error('Неверный файл');
  state = merge(defaults(), data);
  save();
  listeners.forEach((fn) => fn(state));
}

export function resetAll() {
  state = defaults();
  save();
  listeners.forEach((fn) => fn(state));
}

// Просим браузер не удалять данные (особенно важно для Safari на iPhone)
export async function requestPersistence() {
  try {
    if (navigator.storage && navigator.storage.persist) {
      const already = await navigator.storage.persisted();
      if (!already) await navigator.storage.persist();
    }
  } catch (_) { /* не критично */ }
}

import { startI18n } from './i18n.js';
import { startEmojiIcons } from './emoji.js';
import { getState, subscribe, requestPersistence } from './store.js';
import { icon } from './icons.js';
import { ensureBodyDefs } from './body.js';
import { closeSheet } from './ui.js';
import * as home from './views/home.js';
import * as workouts from './views/workouts.js';
import * as food from './views/food.js';
import * as goals from './views/goals.js';
import * as habits from './views/habits.js';
import * as settings from './views/settings.js';
import * as sleep from './views/sleep.js';
import { recheck as recheckPremium } from './premium.js';

const ROUTES = {
  home: { view: home, label: 'Главная', icon: 'home' },
  workouts: { view: workouts, label: 'Тренировки', icon: 'dumbbell' },
  food: { view: food, label: 'Еда', icon: 'apple' },
  goals: { view: goals, label: 'Цели', icon: 'target' },
  habits: { view: habits, label: 'Привычки', icon: 'flame' },
  settings: { view: settings, label: 'Настройки', icon: 'sliders' },
  sleep: { view: sleep, label: 'Сон', icon: 'moon', hidden: true },
};

const main = document.getElementById('main');
let current = null;
let container = null;

function renderNav(active) {
  const nav = document.getElementById('nav');
  nav.innerHTML = `
    <div class="nav-brand"><span class="logo">${icon('sparkles', 20)}</span>Kosmic</div>
    ${Object.entries(ROUTES).filter(([, r]) => !r.hidden).map(([k, r]) => `
      <a class="nav-item ${k === active ? 'active' : ''}" data-s="${k}" href="#/${k}">
        <span class="nav-ic">${icon(r.icon, 20)}</span><span>${r.label}</span>
      </a>`).join('')}
    <div class="nav-foot">Все данные хранятся на этом устройстве.</div>`;
}

function applyTheme() {
  const t = getState().settings.theme || 'dark';
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]').setAttribute('content', t === 'light' ? '#f3f4f9' : '#0a0c13');
}

function route() {
  const key = (location.hash.replace(/^#\/?/, '').split('/')[0]) || 'home';
  const r = ROUTES[key] ? key : 'home';
  if (current && current !== r && ROUTES[current].view.unmount) ROUTES[current].view.unmount();
  closeSheet();
  current = r;
  document.body.dataset.section = r;
  renderNav(r === 'sleep' ? 'home' : r);
  container = document.createElement('div');
  container.className = 'view';
  main.replaceChildren(container);
  const v = ROUTES[r].view;
  v.bind && v.bind(container);
  v.render(container);
  window.scrollTo({ top: 0 });
}

subscribe(() => {
  applyTheme();
  if (container && current) ROUTES[current].view.render(container);
});

// Обновление «живых» таймеров каждую секунду без полной перерисовки
setInterval(() => {
  if (current && ROUTES[current].view.tick) ROUTES[current].view.tick(container);
}, 1000);

window.addEventListener('hashchange', route);
startI18n();
startEmojiIcons();
ensureBodyDefs();
applyTheme();
route();
requestPersistence();
recheckPremium();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

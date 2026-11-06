// Kosmic Премиум: окно «Купите Премиум», ввод ключа и проверка подписки.
//
// Как это работает:
//  1. Кнопка «Купить» открывает страницу оплаты платёжного сервиса (CONFIG.checkoutUrl).
//  2. После оплаты сервис присылает покупателю ключ (license key) на почту.
//  3. Пользователь вводит ключ здесь → приложение спрашивает сервер проверки (CONFIG.verifyUrl),
//     активна ли подписка. Сервер — server/premium-worker.js (Cloudflare Worker).
//  4. Раз в сутки статус перепроверяется: если подписку отменили — премиум выключится.
//     Без интернета премиум продолжает работать до 7 дней с последней проверки.
import { getState, update } from './store.js';
import { openSheet, closeSheet, toast, esc } from './ui.js';
import { icon } from './icons.js';

// ======== НАСТРОЙКИ (заполни, когда будет аккаунт в платёжном сервисе) ========
export const CONFIG = {
  price: '2,99 $',            // цена, которую видит пользователь
  period: 'в месяц',
  checkoutUrl: '',            // ссылка на оплату (страница товара «Премиум» в платёжном сервисе)
  verifyUrl: '',              // адрес сервера проверки ключей, напр. https://kosmic-premium.ТВОЙ.workers.dev
};
// ===============================================================================

const DAY = 86400000;
const RECHECK = DAY;          // как часто перепроверять ключ
const OFFLINE_GRACE = 7 * DAY;
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const TEST_KEY = 'TEST-PREMIUM'; // работает только на localhost, для проверки окна

export const FEATURES = [
  ['💪', 'Свои упражнения', 'добавляй любые упражнения в базу и в план'],
  ['✨', 'Будущие функции', 'всё новое, что появится в Премиуме'],
  ['❤️', 'Поддержка Kosmic', 'приложение развивается на твою подписку'],
];

export function isPremium(s = getState()) {
  const p = s.premium;
  if (!p?.active || !p.key) return false;
  if (p.expiresAt && Date.now() > p.expiresAt) return false;
  return Date.now() - (p.checkedAt || 0) < OFFLINE_GRACE;
}

// Обёртка для платных функций: если премиум есть — выполняет действие, иначе показывает окно.
export function requirePremium(feature, fn) {
  if (isPremium()) { fn(); return; }
  paywall(feature);
}

async function verify(key) {
  if (isLocal && key === TEST_KEY) return { valid: true, expiresAt: null, test: true };
  if (!CONFIG.verifyUrl) throw new Error('no-server');
  const r = await fetch(CONFIG.verifyUrl.replace(/\/$/, '') + '/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key, device: deviceId() }),
  });
  if (!r.ok) throw new Error('server-' + r.status);
  return r.json(); // { valid: boolean, expiresAt: number|null, reason?: string }
}

function deviceId() {
  let id = localStorage.getItem('kosmic:device');
  if (!id) { id = 'd-' + Math.random().toString(36).slice(2, 12); localStorage.setItem('kosmic:device', id); }
  return id;
}

export async function activate(key) {
  key = key.trim();
  if (!key) { toast('Введи ключ', '🔑'); return false; }
  try {
    const res = await verify(key);
    if (!res.valid) { toast(res.reason === 'expired' ? 'Подписка закончилась' : 'Ключ не подошёл', '⚠️'); return false; }
    update((s) => { s.premium = { key, active: true, checkedAt: Date.now(), expiresAt: res.expiresAt || null, test: !!res.test }; });
    toast('Премиум включён', '👑');
    return true;
  } catch (e) {
    toast(e.message === 'no-server' ? 'Оплата ещё не подключена' : 'Нет связи с сервером, попробуй позже', '⚠️');
    return false;
  }
}

export function deactivate() {
  update((s) => { delete s.premium; });
}

// Фоновая перепроверка подписки (вызывается при запуске приложения).
export async function recheck() {
  const p = getState().premium;
  if (!p?.key || p.test || !navigator.onLine) return;
  if (Date.now() - (p.checkedAt || 0) < RECHECK) return;
  try {
    const res = await verify(p.key);
    update((s) => { s.premium = { ...p, active: !!res.valid, checkedAt: Date.now(), expiresAt: res.expiresAt || null }; });
    if (!res.valid) toast('Подписка Премиум закончилась', '👑');
  } catch (_) { /* нет связи — попробуем в следующий раз */ }
}

export function premiumCardHTML() {
  const p = getState().premium, on = isPremium();
  if (on) {
    return `<div class="card pad-lg stack premium-card on">
      <div class="row between"><div class="bold">👑 Kosmic Премиум</div><span class="pill-on">активен</span></div>
      <div class="muted small" style="line-height:1.5">Ключ: <span class="num">${esc(maskKey(p.key))}</span>${p.expiresAt ? ` · до ${new Date(p.expiresAt).toLocaleDateString('ru-RU')}` : ''}${p.test ? ' · тестовый' : ''}</div>
      <div class="tiny faint">Отменить подписку можно по ссылке из письма об оплате. Чтобы включить Премиум на другом устройстве, введи там этот же ключ.</div>
      <button class="btn" data-premium-off>Выйти из Премиума на этом устройстве</button>
    </div>`;
  }
  return `<div class="card pad-lg stack premium-card">
    <div class="bold">👑 Kosmic Премиум</div>
    <div class="muted small">${CONFIG.price} ${CONFIG.period} · свои упражнения и будущие функции</div>
    <button class="btn btn-primary" data-premium-open>${icon('sparkles', 18)} Подробнее</button>
  </div>`;
}

const maskKey = (k) => (k.length > 8 ? k.slice(0, 4) + '…' + k.slice(-4) : k);

export function paywall(feature) {
  openSheet({
    title: '👑 Kosmic Премиум',
    body: `
      ${feature ? `<div class="pw-lock">${icon('bolt', 16)} «${esc(feature)}» доступно в Премиуме</div>` : ''}
      <div class="pw-list">${FEATURES.map(([e, t, d]) => `<div class="pw-item"><span>${e}</span><div><b>${t}</b><div class="muted small">${d}</div></div></div>`).join('')}</div>
      <div class="pw-price"><b>${CONFIG.price}</b> <span class="muted">${CONFIG.period}</span><div class="tiny faint">отмена в любой момент</div></div>
      <button class="btn btn-primary btn-block" data-buy>${icon('sparkles', 18)} Купить Премиум</button>
      <div class="pw-or"><span>уже купил?</span></div>
      <div class="row" style="gap:8px">
        <input class="input" name="key" placeholder="Ключ из письма" autocomplete="off" spellcheck="false" style="flex:1" />
        <button class="btn" data-activate>Активировать</button>
      </div>
      <div class="tiny faint" style="line-height:1.5">Оплата проходит на защищённой странице платёжного сервиса — данные карты в Kosmic не попадают. После оплаты ключ придёт на почту.</div>`,
    onMount: (el) => {
      el.querySelector('[data-buy]').addEventListener('click', () => {
        if (!CONFIG.checkoutUrl) { toast('Оплата скоро появится', '⏳'); return; }
        window.open(CONFIG.checkoutUrl, '_blank', 'noopener');
      });
      const go = async () => {
        const btn = el.querySelector('[data-activate]');
        btn.disabled = true;
        const ok = await activate(el.querySelector('[name=key]').value);
        btn.disabled = false;
        if (ok) closeSheet();
      };
      el.querySelector('[data-activate]').addEventListener('click', go);
      el.querySelector('[name=key]').addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
    },
  });
}

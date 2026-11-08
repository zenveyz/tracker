import { LOCALE } from './i18n.js';
// Kosmic Премиум: окно с планами (месяц / год / навсегда), ввод ключа и его проверка.
//
// Как это работает:
//  1. Кнопка «Купить» открывает страницу оплаты выбранного плана (CONFIG.plans[].checkoutUrl).
//  2. После оплаты сервис присылает покупателю ключ (license key) на почту.
//  3. Пользователь вводит ключ здесь → приложение спрашивает сервер проверки (CONFIG.verifyUrl),
//     действует ли ключ. Сервер — server/premium-worker.js (Cloudflare Worker).
//  4. Раз в сутки статус перепроверяется: если ключ отозван (возврат денег) — премиум выключится.
//     Без интернета премиум продолжает работать до 7 дней с последней проверки.
import { getState, update } from './store.js';
import { openSheet, closeSheet, toast, esc } from './ui.js';
import { icon } from './icons.js';

// ======== НАСТРОЙКИ (заполни, когда будет аккаунт в платёжном сервисе) ========
export const CONFIG = {
  // три плана; checkoutUrl — ссылка на оплату этого товара в платёжном сервисе
  plans: [
    { id: 'month', title: 'Месяц', price: '2,99 $', per: 'в месяц', note: 'первые 7 дней бесплатно', trialDays: 7, checkoutUrl: 'https://zenvey.lemonsqueezy.com/checkout/buy/ff99d8f9-964f-48f1-a651-08253a2df464' },
    { id: 'year', title: 'Год', price: '19,99 $', per: 'в год', note: '≈ 1,67 $ в месяц', badge: '−45%', popular: true, checkoutUrl: 'https://zenvey.lemonsqueezy.com/checkout/buy/2ec6df82-4b84-4024-b634-90b17bed998c' },
    { id: 'life', title: 'Навсегда', price: '24,99 $', per: 'один раз', note: 'без подписки и продлений', checkoutUrl: 'https://zenvey.lemonsqueezy.com/checkout/buy/800a43d9-b139-4388-8996-b66d0f7c462b' },
  ],
  // Lemon Squeezy: магазин 516765, товары 1505754 (навсегда), 1505896 (месяц), 1505905 (год)
  verifyUrl: 'https://falling-frog-f2b0.kosmic-sv.workers.dev', // сервер проверки ключей (Cloudflare Worker, код — server/premium-worker.js)
  // Премиум бесплатно для всех — подарок. Чтобы снова сделать платным, поставь false.
  freeGift: true,
};
// ===============================================================================

const DAY = 86400000;
const RECHECK = DAY;          // как часто перепроверять ключ
const OFFLINE_GRACE = 7 * DAY;
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const TEST_KEY = 'TEST-PREMIUM'; // работает только на localhost, для проверки окна

// Промокоды: здесь хранится только SHA-256 хеш, сам код в репозитории не виден.
// Новый код: node -e "console.log(require('crypto').createHash('sha256').update('МОЙ-КОД').digest('hex'))"
// и добавь хеш в список. Чтобы отключить код — удали его хеш.
const PROMO_HASHES = [
  'a3f29d17eab3d9bccc60d1182f292591b61f62d0b111f483d759882073bf860a', // промокод владельца
];
async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
export async function redeemPromo(code) {
  code = code.trim().toUpperCase();
  if (!code) { toast('Введи промокод', '🎟️'); return false; }
  if (!PROMO_HASHES.includes(await sha256(code))) { toast('Промокод не подошёл', '⚠️'); return false; }
  update((s) => { s.premium = { key: code, active: true, checkedAt: Date.now(), expiresAt: null, promo: true }; });
  toast('Премиум включён по промокоду', '🎟️');
  return true;
}

export const FEATURES = [
  ['💪', 'Свои упражнения', 'добавляй любые упражнения в базу и в план'],
  ['📈', 'Прогресс', 'календари за месяц и год, история тренировок и нагрузка на мышцы'],
  ['✨', 'Будущие функции', 'всё новое, что появится в Премиуме'],
  ['❤️', 'Поддержка Kosmic', 'приложение развивается благодаря тебе'],
];

const ownPremium = (s = getState()) => {
  const p = s.premium;
  if (!p?.active || !p.key) return false;
  if (p.expiresAt && Date.now() > p.expiresAt) return false;
  return p.promo || Date.now() - (p.checkedAt || 0) < OFFLINE_GRACE;
};
export function isPremium(s = getState()) {
  return CONFIG.freeGift || ownPremium(s);
}

// Один раз показываем, что Премиум — подарок
export function showGiftOnce() {
  if (!CONFIG.freeGift || getState().giftSeen) return;
  setTimeout(() => {
    update((s) => { s.giftSeen = true; });
    openSheet({
      title: '🎁 Премиум в подарок',
      body: `<div class="card pad-lg stack premium-card on gift-card">
          <div class="bold" style="font-size:17px">Спасибо, что установил Kosmic!</div>
          <div class="muted small" style="line-height:1.55">Сейчас все функции Премиума открыты бесплатно — это наш подарок тебе.</div>
        </div>
        <div class="pw-list">${FEATURES.slice(0, 3).map(([e, t, d]) => `<div class="pw-item"><span>${e}</span><div><b>${t}</b><div class="muted small">${d}</div></div></div>`).join('')}</div>
        <button class="btn btn-primary btn-block" data-gift-ok>${icon('check', 18)} Отлично</button>`,
      onMount: (el) => el.querySelector('[data-gift-ok]').addEventListener('click', closeSheet),
    });
  }, 900);
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
  if (!p?.key || p.test || p.promo || !navigator.onLine) return;
  if (Date.now() - (p.checkedAt || 0) < RECHECK) return;
  try {
    const res = await verify(p.key);
    update((s) => { s.premium = { ...p, active: !!res.valid, checkedAt: Date.now(), expiresAt: res.expiresAt || null }; });
    if (!res.valid) toast('Подписка Премиум закончилась', '👑');
  } catch (_) { /* нет связи — попробуем в следующий раз */ }
}

export function premiumCardHTML() {
  const p = getState().premium, on = ownPremium();
  if (!on && CONFIG.freeGift) {
    return `<div class="card pad-lg stack premium-card on gift-card">
      <div class="row between"><div class="bold">🎁 Kosmic Премиум</div><span class="pill-on">в подарок</span></div>
      <div class="muted small" style="line-height:1.5">Сейчас Премиум бесплатный для всех, кто установил Kosmic: свои упражнения, прогресс и все новые функции. Спасибо, что ты с нами!</div>
    </div>`;
  }
  if (on) {
    return `<div class="card pad-lg stack premium-card on">
      <div class="row between"><div class="bold">👑 Kosmic Премиум</div><span class="pill-on">активен</span></div>
      <div class="muted small" style="line-height:1.5">Ключ: <span class="num">${esc(maskKey(p.key))}</span>${p.expiresAt ? ` · до ${new Date(p.expiresAt).toLocaleDateString(LOCALE)}` : ''}${p.test ? ' · тестовый' : ''}${p.promo ? ' · промокод, бессрочно' : ''}</div>
      <div class="tiny faint">Чтобы включить Премиум на другом устройстве, введи там этот же ключ.</div>
      <button class="btn" data-premium-off>Выйти из Премиума на этом устройстве</button>
    </div>`;
  }
  return `<div class="card pad-lg stack premium-card">
    <div class="bold">👑 Kosmic Премиум</div>
    <div class="muted small">от ${CONFIG.plans[0].price} в месяц · 7 дней бесплатно · свои упражнения, прогресс и будущие функции</div>
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
      <div class="pw-plans">${CONFIG.plans.map((p) => `
        <button type="button" class="pw-plan ${p.popular ? 'on' : ''}" data-plan="${p.id}">
          ${p.popular ? '<span class="pw-pop">Популярный</span>' : ''}
          <span class="pw-pt">${p.title}${p.badge ? ` <i>${p.badge}</i>` : ''}</span>
          <b>${p.price}</b><span class="pw-per">${p.per}</span>
          <span class="pw-note">${p.note}</span>
        </button>`).join('')}</div>
      <a class="btn btn-primary btn-block" data-buy href="#" target="_blank" rel="noopener">${icon('sparkles', 18)} <span data-buy-label></span></a>
      <div class="tiny faint" style="text-align:center;margin-top:-6px">Подписку можно отменить в любой момент по ссылке из письма</div>
      <div class="pw-or"><span>уже купил?</span></div>
      <div class="row" style="gap:8px">
        <input class="input" name="key" placeholder="Ключ из письма" autocomplete="off" spellcheck="false" style="flex:1" />
        <button class="btn" data-activate>Активировать</button>
      </div>
      <div class="tiny faint" style="line-height:1.5">Оплата проходит на защищённой странице платёжного сервиса — данные карты в Kosmic не попадают. После оплаты ключ придёт на почту.</div>
      <div class="pw-promo">
        <button class="link-btn" data-promo-toggle>🎟️ Есть промокод?</button>
        <div class="row" data-promo-row hidden style="gap:8px">
          <input class="input" name="promo" placeholder="Промокод" autocomplete="off" spellcheck="false" style="flex:1;text-transform:uppercase" />
          <button class="btn" data-promo>Применить</button>
        </div>
      </div>`,
    onMount: (el) => {
      let plan = CONFIG.plans.find((p) => p.popular) || CONFIG.plans[0];
      const label = el.querySelector('[data-buy-label]');
      const pick = (p) => {
        plan = p;
        el.querySelectorAll('[data-plan]').forEach((b) => b.classList.toggle('on', b.dataset.plan === p.id));
        // обычная ссылка, а не window.open: так страница оплаты открывается и в приложении на экране «Домой» (iPhone)
        el.querySelector('[data-buy]').href = p.checkoutUrl || '#';
        label.textContent = p.trialDays ? `Попробовать ${p.trialDays} дней бесплатно` : p.id === 'life' ? `Купить навсегда за ${p.price}` : `Оформить за ${p.price} ${p.per}`;
      };
      pick(plan);
      el.querySelectorAll('[data-plan]').forEach((b) => b.addEventListener('click', () => pick(CONFIG.plans.find((p) => p.id === b.dataset.plan))));
      el.querySelector('[data-buy]').addEventListener('click', (e) => {
        if (!plan.checkoutUrl) { e.preventDefault(); toast('Оплата скоро появится', '⏳'); }
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
      const promoRow = el.querySelector('[data-promo-row]');
      el.querySelector('[data-promo-toggle]').addEventListener('click', () => {
        promoRow.hidden = !promoRow.hidden;
        if (!promoRow.hidden) promoRow.querySelector('input').focus();
      });
      const usePromo = async () => { if (await redeemPromo(el.querySelector('[name=promo]').value)) closeSheet(); };
      el.querySelector('[data-promo]').addEventListener('click', usePromo);
      el.querySelector('[name=promo]').addEventListener('keydown', (e) => { if (e.key === 'Enter') usePromo(); });
    },
  });
}

// Заглушка вместо платного блока: размытый предпросмотр + кнопка «Открыть в Премиуме».
export function lockedHTML(feature, preview = '', cls = 'card') {
  return `<div class="${cls} locked-box">
    ${preview ? `<div class="locked-preview" aria-hidden="true" inert>${preview}</div>` : ''}
    <div class="locked-over">
      <div class="locked-crown">👑</div>
      <div class="bold">${esc(feature)} — в Премиуме</div>
      <button class="btn btn-primary" data-paywall="${esc(feature)}">${icon('sparkles', 16)} Открыть</button>
    </div>
  </div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-paywall]');
  if (b) { e.stopPropagation(); paywall(b.dataset.paywall); }
}, true);

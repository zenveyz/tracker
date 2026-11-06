// Сервер проверки ключей Kosmic Премиум — Cloudflare Worker (бесплатный тариф).
// Пример для Lemon Squeezy: после оплаты подписки покупатель получает license key на почту,
// а этот сервер спрашивает у Lemon Squeezy, действует ли ключ (подписка оплачена и не отменена).
//
// Развёртывание (см. server/README.md):
//   переменные окружения Worker:
//     STORE_ID        — id магазина в Lemon Squeezy (число)
//     PRODUCT_IDS     — id товаров Премиума через запятую (месяц, год, навсегда), напр. 101,102,103
//     ALLOWED_ORIGIN  — адрес сайта, напр. https://zenveyz.github.io
//
// Секретные ключи API здесь не нужны: проверка лицензии в Lemon Squeezy работает по самому ключу.
// Другой платёжный сервис подключается заменой функции checkKey().

const LS_VALIDATE = 'https://api.lemonsqueezy.com/v1/licenses/validate';

async function checkKey(key, env) {
  const r = await fetch(LS_VALIDATE, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ license_key: key }),
  });
  const data = await r.json().catch(() => ({}));
  const lic = data.license_key || {}, meta = data.meta || {};
  // ключ должен быть именно от нашего магазина и нашего товара
  if (!data.valid && !lic.status) return { valid: false, reason: 'unknown' };
  const products = String(env.PRODUCT_IDS || env.PRODUCT_ID || '').split(',').map((x) => x.trim());
  if (String(meta.store_id) !== String(env.STORE_ID) || !products.includes(String(meta.product_id))) {
    return { valid: false, reason: 'unknown' };
  }
  const expiresAt = lic.expires_at ? Date.parse(lic.expires_at) : null;
  if (lic.status === 'expired' || (expiresAt && expiresAt < Date.now())) return { valid: false, reason: 'expired', expiresAt };
  if (lic.status === 'disabled') return { valid: false, reason: 'disabled' };
  return { valid: true, expiresAt };
}

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN || '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    const url = new URL(req.url);
    if (req.method !== 'POST' || url.pathname !== '/verify') return new Response('Not found', { status: 404, headers: cors });
    let body;
    try { body = await req.json(); } catch (_) { return new Response('Bad request', { status: 400, headers: cors }); }
    const key = String(body.key || '').trim().slice(0, 200);
    if (!key) return Response.json({ valid: false, reason: 'empty' }, { headers: cors });
    try {
      return Response.json(await checkKey(key, env), { headers: cors });
    } catch (_) {
      return new Response('Upstream error', { status: 502, headers: cors });
    }
  },
};

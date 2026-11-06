import { foodHeat } from '../stats.js';
import { getState, update, uid } from '../store.js';
import { icon } from '../icons.js';
import { esc, fmt, ring, openSheet, closeSheet, toast, stepper, bindSteppers, num, dateKey, parseKey, addDays, humanDate, DAY_SHORT, weekdayIdx, clamp } from '../ui.js';

const ui = { date: dateKey() };

const FOOD_PRESETS = [
  { name: 'Овсянка', kcal: 350, p: 12, f: 7, c: 60, e: '🥣' },
  { name: 'Яйца (2 шт)', kcal: 155, p: 13, f: 11, c: 1, e: '🥚' },
  { name: 'Куриная грудка 150 г', kcal: 250, p: 46, f: 5, c: 0, e: '🍗' },
  { name: 'Рис 200 г', kcal: 260, p: 5, f: 1, c: 57, e: '🍚' },
  { name: 'Банан', kcal: 105, p: 1, f: 0, c: 27, e: '🍌' },
  { name: 'Творог 200 г', kcal: 240, p: 34, f: 10, c: 6, e: '🥛' },
  { name: 'Салат', kcal: 120, p: 3, f: 8, c: 9, e: '🥗' },
  { name: 'Протеин', kcal: 120, p: 24, f: 1, c: 3, e: '🥤' },
];
const DRINK_PRESETS = [
  { name: 'Вода', ml: 250, kcal: 0, e: '💧', water: true },
  { name: 'Кофе', ml: 200, kcal: 5, e: '☕' },
  { name: 'Капучино', ml: 300, kcal: 130, e: '☕' },
  { name: 'Чай', ml: 250, kcal: 0, e: '🍵', water: true },
  { name: 'Сок', ml: 250, kcal: 115, e: '🧃' },
  { name: 'Кола', ml: 330, kcal: 140, e: '🥤' },
  { name: 'Молоко', ml: 250, kcal: 130, e: '🥛' },
  { name: 'Энергетик', ml: 250, kcal: 112, e: '⚡' },
];

export function dayData(key, s = getState()) {
  return s.food[key] || { food: [], drinks: [] };
}
export function dayTotals(key) {
  const d = dayData(key);
  const t = { kcal: 0, p: 0, f: 0, c: 0, water: 0, drinksKcal: 0 };
  d.food.forEach((x) => { t.kcal += x.kcal || 0; t.p += x.p || 0; t.f += x.f || 0; t.c += x.c || 0; });
  d.drinks.forEach((x) => { t.kcal += x.kcal || 0; t.drinksKcal += x.kcal || 0; if (x.water) t.water += x.ml || 0; });
  return t;
}
function ensureDay(s, key) { return (s.food[key] ||= { food: [], drinks: [] }); }
const timeNow = () => new Date().toTimeString().slice(0, 5);

export function render(root) {
  const s = getState(), st = s.settings;
  const key = ui.date;
  const d = dayData(key);
  const t = dayTotals(key);
  const left = st.kcalGoal - t.kcal;
  const pct = t.kcal / st.kcalGoal;
  const glasses = Math.max(1, Math.round(st.waterGoal / 250));
  const filled = t.water / 250;
  const isToday = key === dateKey();

  // последние 7 дней
  const days = Array.from({ length: 7 }, (_, i) => addDays(parseKey(key), i - 6));
  const vals = days.map((dd) => dayTotals(dateKey(dd)).kcal);
  const maxV = Math.max(st.kcalGoal * 1.15, ...vals);

  // недавние продукты (для быстрого добавления)
  const recent = [];
  Object.keys(s.food).sort().reverse().forEach((k) => s.food[k].food.forEach((x) => {
    if (recent.length < 8 && !recent.some((r) => r.name === x.name)) recent.push(x);
  }));

  root.innerHTML = `
    <header class="page-head">
      <div><h1>Питание</h1><div class="sub">Калории, БЖУ и напитки за день</div></div>
      <div class="date-nav">
        <button class="icon-btn" data-shift="-1" aria-label="Назад">${icon('chevL', 18)}</button>
        <div class="dl desktop-only">${humanDate(parseKey(key))}</div>
        <button class="icon-btn" data-shift="1" aria-label="Вперёд" ${isToday ? 'disabled style="opacity:.35"' : ''}>${icon('chevR', 18)}</button>
      </div>
    </header>
    <div class="mobile-only muted small bold" style="margin:-10px 4px 14px">${humanDate(parseKey(key))}</div>

    <div class="grid grid-dash">
      <div class="card pad-lg card-accent">
        <div class="kcal-hero">
          ${ring(pct, { size: 150, stroke: 14, c1: pct > 1 ? '#fb7185' : 'var(--a1)', c2: pct > 1 ? '#e11d48' : 'var(--a2)', center: `
            <div class="big-num">${fmt(t.kcal)}</div><div class="muted tiny bold" style="margin-top:4px">из ${fmt(st.kcalGoal)} ккал</div>` })}
          <div class="grow stack" style="min-width:180px">
            <div><div class="muted small bold">${left >= 0 ? 'Осталось' : 'Перебор'}</div>
              <div style="font-size:26px;font-weight:800;letter-spacing:-0.02em;color:${left >= 0 ? 'inherit' : '#fb7185'}">${fmt(Math.abs(left))} ккал</div></div>
            <div class="row" style="gap:12px">
              ${macro('Белки', t.p, st.proteinGoal, '#60a5fa')}
              ${macro('Жиры', t.f, st.fatGoal, '#facc15')}
              ${macro('Углев.', t.c, st.carbGoal, '#f472b6')}
            </div>
          </div>
        </div>
        <div class="fields-2" style="margin-top:20px">
          <button class="btn btn-primary" data-add-food>${icon('plus', 18)} Сколько я съел</button>
          <button class="btn" data-add-drink>${icon('cup', 18)} Напиток</button>
        </div>
        <button class="btn btn-sm" data-goal style="margin-top:12px;width:100%;background:none;border-style:dashed">${icon('target', 15)} Цель: ${fmt(st.kcalGoal)} ккал · изменить</button>
      </div>

      <div class="card pad-lg">
        <div class="row between">
          <div class="row"><span class="ic" style="width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--water) 18%,transparent);color:var(--water)">${icon('droplet', 20)}</span>
          <div><div class="bold">Вода</div><div class="muted small">${fmt(t.water)} / ${fmt(st.waterGoal)} мл</div></div></div>
          <div class="row" style="gap:6px">
            <button class="icon-btn sm" data-water="-250" aria-label="Убрать стакан">${icon('minus', 16)}</button>
            <button class="icon-btn sm" data-water="250" style="background:var(--water);color:#fff;border:0" aria-label="Добавить стакан">${icon('plus', 16)}</button>
          </div>
        </div>
        <div class="water-glasses" style="margin-top:16px">
          ${Array.from({ length: glasses }, (_, i) => `<div class="glass" data-glass="${i}"><i style="height:${clamp(filled - i, 0, 1) * 100}%"></i></div>`).join('')}
        </div>
        <div class="quick-row" style="margin-top:14px">
          ${[150, 250, 330, 500].map((ml) => `<button class="chip" data-water="${ml}">+${ml} мл</button>`).join('')}
        </div>
        <div class="section-title" style="margin:22px 0 4px"><h2 style="font-size:14px">Калории за 7 дней</h2></div>
        <div class="mini-chart" style="position:relative">
          <div class="goal-line" style="bottom:${(st.kcalGoal / maxV) * 100 * 0.82 + 18}px" title="Цель"></div>
          ${days.map((dd, i) => `<div class="col ${vals[i] > st.kcalGoal ? 'over' : ''} ${i === 6 ? 'today' : ''}" data-jump="${dateKey(dd)}" style="cursor:pointer">
            <i style="height:${(vals[i] / maxV) * 82}%"></i><span>${DAY_SHORT[weekdayIdx(dd)]}</span></div>`).join('')}
        </div>
      </div>
    </div>

    <div class="section-title"><h2>🍽️ Еда · ${fmt(t.kcal - t.drinksKcal)} ккал</h2></div>
    ${d.food.length ? `<div class="list">${d.food.slice().reverse().map((x) => `
      <div class="item"><span class="ic">${x.e || '🍽️'}</span>
        <div class="grow"><div class="t ellipsis">${esc(x.name)}</div>
        <div class="s">${x.time || ''}${x.p || x.f || x.c ? ` · Б ${fmt(x.p)} · Ж ${fmt(x.f)} · У ${fmt(x.c)}` : ''}</div></div>
        <div class="bold num">${fmt(x.kcal)}<span class="muted tiny"> ккал</span></div>
        <button class="icon-btn ghost sm" data-del-food="${x.id}" aria-label="Удалить">${icon('trash', 16)}</button>
      </div>`).join('')}</div>`
      : `<div class="card"><div class="empty" style="padding:22px 10px"><div class="em">🍳</div><h4>Пока ничего не съедено</h4><p>Нажми «Сколько я съел», чтобы добавить приём пищи.</p></div></div>`}

    ${recent.length ? `<div class="section-title"><h2 style="font-size:14px" class="muted">Быстро добавить снова</h2></div>
      <div class="chips">${recent.map((x, i) => `<button class="chip" data-recent="${i}">${x.e || '🍽️'} ${esc(x.name)} · ${fmt(x.kcal)}</button>`).join('')}</div>` : ''}

    <div class="section-title"><h2>🥤 Напитки · ${fmt(t.drinksKcal)} ккал</h2></div>
    ${d.drinks.length ? `<div class="list">${d.drinks.slice().reverse().map((x) => `
      <div class="item"><span class="ic" style="background:color-mix(in srgb,var(--water) 16%,transparent)">${x.e || '🥤'}</span>
        <div class="grow"><div class="t">${esc(x.name)}</div><div class="s">${x.time || ''} · ${fmt(x.ml)} мл</div></div>
        <div class="bold num">${fmt(x.kcal)}<span class="muted tiny"> ккал</span></div>
        <button class="icon-btn ghost sm" data-del-drink="${x.id}" aria-label="Удалить">${icon('trash', 16)}</button>
      </div>`).join('')}</div>`
      : `<div class="card"><div class="empty" style="padding:22px 10px"><div class="em">🥤</div><p style="margin:0">Напитков пока нет</p></div></div>`}
  `;
  root.insertAdjacentHTML('beforeend', `<div class="heat-wrap">${foodHeat()}</div>`);
  root._recent = recent;
}

function macro(label, v, goal, color) {
  return `<div class="macro"><div class="mh">${label}<span>${fmt(v)}/${goal}</span></div>
    <div class="bar thin"><i style="width:${clamp(v / goal, 0, 1) * 100}%;background:${color}"></i></div></div>`;
}

export function bind(root) {
  root.addEventListener('click', (e) => {
    const t = (sel) => e.target.closest(sel);
    let el;
    if ((el = t('[data-shift]'))) {
      const next = addDays(parseKey(ui.date), +el.dataset.shift);
      if (dateKey(next) > dateKey()) return;
      ui.date = dateKey(next); render(root); return;
    }
    if ((el = t('[data-jump]'))) { ui.date = el.dataset.jump; render(root); return; }
    if (t('[data-add-food]')) return foodSheet();
    if (t('[data-add-drink]')) return drinkSheet();
    if (t('[data-goal]')) return goalSheet();
    if ((el = t('[data-water]'))) {
      const ml = +el.dataset.water;
      update((s) => {
        const d = ensureDay(s, ui.date);
        if (ml > 0) d.drinks.push({ id: uid(), name: 'Вода', ml, kcal: 0, e: '💧', water: true, time: timeNow() });
        else {
          const idx = d.drinks.map((x) => x.name === 'Вода').lastIndexOf(true);
          if (idx >= 0) d.drinks.splice(idx, 1);
        }
      });
      if (ml > 0) {
        const t2 = dayTotals(ui.date);
        if (t2.water >= getState().settings.waterGoal && t2.water - ml < getState().settings.waterGoal) toast('Норма воды выполнена!', '💧');
      }
      return;
    }
    if ((el = t('[data-recent]'))) {
      const x = root._recent[+el.dataset.recent];
      update((s) => ensureDay(s, ui.date).food.push({ ...x, id: uid(), time: timeNow() }));
      toast(`${x.name} добавлено`, x.e || '🍽️');
      return;
    }
    if ((el = t('[data-del-food]'))) { update((s) => { const d = ensureDay(s, ui.date); d.food = d.food.filter((x) => x.id !== el.dataset.delFood); }); return; }
    if ((el = t('[data-del-drink]'))) { update((s) => { const d = ensureDay(s, ui.date); d.drinks = d.drinks.filter((x) => x.id !== el.dataset.delDrink); }); }
  });
}

function foodSheet() {
  let emoji = '🍽️';
  openSheet({
    title: 'Сколько я съел',
    body: `
      <div class="field"><span class="label">Быстрый выбор</span>
        <div class="chips" style="flex-wrap:wrap">${FOOD_PRESETS.map((p, i) => `<button type="button" class="chip" data-preset="${i}">${p.e} ${p.name}</button>`).join('')}</div></div>
      <div class="field"><span class="label">Что съел</span><input class="input" name="name" placeholder="Например: Паста с курицей" autofocus /></div>
      <div class="field"><span class="label">Калории</span>${stepper('kcal', 300, { step: 50, min: 0, max: 5000 })}</div>
      <div class="fields-3">
        <div class="field"><span class="label">Белки, г</span><input class="input" name="p" inputmode="decimal" placeholder="0" /></div>
        <div class="field"><span class="label">Жиры, г</span><input class="input" name="f" inputmode="decimal" placeholder="0" /></div>
        <div class="field"><span class="label">Углев., г</span><input class="input" name="c" inputmode="decimal" placeholder="0" /></div>
      </div>
      <button class="btn btn-primary btn-block" data-save>${icon('plus', 18)} Добавить</button>`,
    onMount: (el) => {
      bindSteppers(el);
      const f = (n) => el.querySelector(`[name="${n}"]`);
      el.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
        const p = FOOD_PRESETS[+b.dataset.preset];
        f('name').value = p.name; f('kcal').value = p.kcal; f('p').value = p.p; f('f').value = p.f; f('c').value = p.c; emoji = p.e;
        el.querySelectorAll('[data-preset]').forEach((x) => x.classList.toggle('on', x === b));
      }));
      el.querySelector('[data-save]').addEventListener('click', () => {
        const name = f('name').value.trim() || 'Приём пищи';
        const item = { id: uid(), name, kcal: Math.round(num(f('kcal').value)), p: num(f('p').value), f: num(f('f').value), c: num(f('c').value), e: emoji, time: timeNow() };
        update((s) => ensureDay(s, ui.date).food.push(item));
        closeSheet(); toast(`+${fmt(item.kcal)} ккал`, emoji);
      });
    },
  });
}

function drinkSheet() {
  let sel = { e: '🥤', water: false };
  openSheet({
    title: 'Добавить напиток',
    body: `
      <div class="field"><span class="label">Быстрый выбор</span>
        <div class="chips" style="flex-wrap:wrap">${DRINK_PRESETS.map((p, i) => `<button type="button" class="chip" data-preset="${i}">${p.e} ${p.name}</button>`).join('')}</div></div>
      <div class="field"><span class="label">Напиток</span><input class="input" name="name" placeholder="Например: Смузи" /></div>
      <div class="fields-2">
        <div class="field"><span class="label">Объём, мл</span>${stepper('ml', 250, { step: 50, min: 0, max: 3000 })}</div>
        <div class="field"><span class="label">Калории</span>${stepper('kcal', 0, { step: 10, min: 0, max: 2000 })}</div>
      </div>
      <label class="row small" style="gap:10px;cursor:pointer"><input type="checkbox" name="water" style="width:20px;height:20px;accent-color:var(--water)" /> Засчитать в норму воды</label>
      <button class="btn btn-primary btn-block" data-save>${icon('plus', 18)} Добавить</button>`,
    onMount: (el) => {
      bindSteppers(el);
      const f = (n) => el.querySelector(`[name="${n}"]`);
      el.querySelectorAll('[data-preset]').forEach((b) => b.addEventListener('click', () => {
        const p = DRINK_PRESETS[+b.dataset.preset];
        sel = p; f('name').value = p.name; f('ml').value = p.ml; f('kcal').value = p.kcal; f('water').checked = !!p.water;
        el.querySelectorAll('[data-preset]').forEach((x) => x.classList.toggle('on', x === b));
      }));
      el.querySelector('[data-save]').addEventListener('click', () => {
        const item = { id: uid(), name: f('name').value.trim() || 'Напиток', ml: Math.round(num(f('ml').value)), kcal: Math.round(num(f('kcal').value)), e: sel.e, water: f('water').checked, time: timeNow() };
        update((s) => ensureDay(s, ui.date).drinks.push(item));
        closeSheet(); toast(`${item.name} · ${item.ml} мл`, item.e);
      });
    },
  });
}

function goalSheet() {
  const st = getState().settings;
  openSheet({
    title: 'Цели питания',
    body: `
      <div class="field"><span class="label">Калории в день</span>${stepper('kcalGoal', st.kcalGoal, { step: 50, min: 800, max: 6000 })}</div>
      <div class="field"><span class="label">Вода в день, мл</span>${stepper('waterGoal', st.waterGoal, { step: 250, min: 250, max: 6000 })}</div>
      <div class="fields-3">
        <div class="field"><span class="label">Белки, г</span>${stepper('proteinGoal', st.proteinGoal, { step: 5, min: 0, max: 500 })}</div>
        <div class="field"><span class="label">Жиры, г</span>${stepper('fatGoal', st.fatGoal, { step: 5, min: 0, max: 400 })}</div>
        <div class="field"><span class="label">Углев., г</span>${stepper('carbGoal', st.carbGoal, { step: 10, min: 0, max: 900 })}</div>
      </div>
      <button class="btn btn-primary btn-block" data-save>${icon('check', 18)} Сохранить</button>`,
    onMount: (el) => {
      bindSteppers(el);
      el.querySelector('[data-save]').addEventListener('click', () => {
        update((s) => ['kcalGoal', 'waterGoal', 'proteinGoal', 'fatGoal', 'carbGoal'].forEach((k) => {
          s.settings[k] = Math.round(num(el.querySelector(`[name="${k}"]`).value, s.settings[k]));
        }));
        closeSheet(); toast('Цели обновлены', '🎯');
      });
    },
  });
}

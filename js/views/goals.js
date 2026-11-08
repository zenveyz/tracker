import { LOCALE } from '../i18n.js';
import { getState, update, uid } from '../store.js';
import { icon } from '../icons.js';
import { esc, fmt, plural, openSheet, closeSheet, toast, stepper, bindSteppers, num, emojiPicker, colorPicker, bindPickers, confetti, confirmSheet, clamp, COLORS } from '../ui.js';

const ui = { filter: 'active' };

const pctOf = (g) => (g.type === 'single' ? (g.done ? 1 : 0) : clamp((g.current || 0) / (g.target || 1), 0, 1));
function daysLeft(g) {
  if (!g.deadline) return '';
  const d = Math.ceil((new Date(g.deadline + 'T23:59:59') - new Date()) / 86400000);
  if (d < 0) return '<span style="color:#fb7185">срок прошёл</span>';
  if (d === 0) return 'срок — сегодня';
  return `осталось ${d} ${plural(d, 'день', 'дня', 'дней')}`;
}

export function render(root) {
  const goals = getState().goals;
  const active = goals.filter((g) => !g.done), done = goals.filter((g) => g.done);
  const list = ui.filter === 'active' ? active : done;
  const avg = active.length ? active.reduce((a, g) => a + pctOf(g), 0) / active.length : 0;

  root.innerHTML = `
    <header class="page-head">
      <div><h1>Цели</h1><div class="sub">Разовые цели — свайпни, чтобы выполнить. Большие — двигайся шаг за шагом.</div></div>
      <button class="btn btn-primary desktop-only" data-new>${icon('plus', 18)} Новая цель</button>
    </header>

    <div class="grid grid-2 grid-3" style="margin-bottom:18px">
      <div class="card tight row"><span style="font-size:26px">🎯</span><div><div class="big-num" style="font-size:24px">${active.length}</div><div class="muted tiny bold">в процессе</div></div></div>
      <div class="card tight row"><span style="font-size:26px">🏆</span><div><div class="big-num" style="font-size:24px">${done.length}</div><div class="muted tiny bold">выполнено</div></div></div>
      <div class="card tight row desktop-only"><span style="font-size:26px">📈</span><div><div class="big-num" style="font-size:24px">${Math.round(avg * 100)}%</div><div class="muted tiny bold">средний прогресс</div></div></div>
    </div>

    <div class="seg" style="margin-bottom:16px;max-width:360px">
      <button data-filter="active" class="${ui.filter === 'active' ? 'on' : ''}">Активные · ${active.length}</button>
      <button data-filter="done" class="${ui.filter === 'done' ? 'on' : ''}">Выполненные · ${done.length}</button>
    </div>

    ${list.length ? `<div class="grid grid-auto">${list.map(goalCard).join('')}</div>` : `
      <div class="card"><div class="empty">
        <div class="em">${ui.filter === 'active' ? '🚀' : '🏆'}</div>
        <h4>${ui.filter === 'active' ? 'Добавь первую цель' : 'Здесь будут выполненные цели'}</h4>
        <p>${ui.filter === 'active' ? 'Например: «Пробежать 5 км» или «Накопить 100 000 ₽».' : 'Выполняй цели — и собирай коллекцию побед.'}</p>
        ${ui.filter === 'active' ? `<button class="btn btn-primary" data-new>${icon('plus', 18)} Новая цель</button>` : ''}
      </div></div>`}

    <button class="fab mobile-only" data-new aria-label="Новая цель">${icon('plus', 26)}</button>`;
}

function goalCard(g) {
  const p = pctOf(g);
  const sub = g.type === 'single'
    ? (g.done ? `выполнено ${new Date(g.completedAt).toLocaleDateString(LOCALE)}` : daysLeft(g) || 'разовая цель')
    : `${fmt(g.current, 2)} / ${fmt(g.target, 2)} ${esc(g.unit || '')}${g.deadline && !g.done ? ' · ' + daysLeft(g) : ''}`;

  const inner = `<div class="goal-card ${g.done ? 'completed' : ''}" style="--gc:${g.color}">
    <div class="gc-top">
      <div class="gc-emoji">${g.emoji}</div>
      <div class="grow"><div class="gc-title">${esc(g.title)}</div><div class="gc-sub">${sub}</div></div>
      ${g.type === 'single'
        ? `<button class="big-check ${g.done ? 'on' : ''}" data-complete="${g.id}" aria-label="Выполнить">${icon('check', 22, 3)}</button>`
        : `<div class="bold num" style="font-size:18px">${Math.round(p * 100)}%</div>`}
    </div>
    ${g.type === 'progress' ? `
      <div class="bar" style="margin-top:14px"><i style="width:${p * 100}%"></i></div>
      ${g.done ? '' : `<div class="prog-controls">
        <button class="icon-btn sm" data-step="${g.id}" data-dir="-1" aria-label="Меньше">${icon('minus', 16)}</button>
        <button class="btn btn-sm grow" data-step="${g.id}" data-dir="1" style="background:color-mix(in srgb,${g.color} 22%,transparent);border-color:transparent">${icon('plus', 15)} ${fmt(g.step || 1, 2)} ${esc(g.unit || '')}</button>
        <button class="btn btn-sm" data-set="${g.id}">Я прошёл…</button>
        <button class="icon-btn sm ghost" data-edit="${g.id}" aria-label="Изменить">${icon('dots', 18)}</button>
      </div>`}` : `
      <div class="row between" style="margin-top:12px">
        ${g.done ? '<span class="swipe-hint">🏆 Готово!</span>' : `<span class="swipe-hint">свайпни вправо, чтобы выполнить ${icon('arrowR', 13)}</span>`}
        <button class="icon-btn sm ghost" data-edit="${g.id}" aria-label="Изменить">${icon('dots', 18)}</button>
      </div>`}
    ${g.done ? `<button class="btn btn-sm" data-undo="${g.id}" style="margin-top:12px;width:100%">${icon('undo', 15)} Вернуть в активные</button>` : ''}
  </div>`;

  if (g.type === 'single' && !g.done) {
    return `<div class="swipe-wrap" data-swipe="${g.id}" style="--gc:${g.color}">
      <div class="swipe-bg">${icon('check', 22, 3)} Выполнено!</div>${inner}</div>`;
  }
  return inner;
}

function complete(id) {
  update((s) => { const g = s.goals.find((x) => x.id === id); g.done = true; g.completedAt = Date.now(); if (g.type === 'progress') g.current = g.target; });
  confetti(); toast('Цель выполнена!', '🏆');
}

export function bind(root) {
  root.addEventListener('click', (e) => {
    const t = (sel) => e.target.closest(sel);
    let el;
    if (t('[data-new]')) return goalSheet();
    if ((el = t('[data-filter]'))) { ui.filter = el.dataset.filter; render(root); return; }
    if ((el = t('[data-complete]'))) {
      const g = getState().goals.find((x) => x.id === el.dataset.complete);
      if (g && !g.done) complete(g.id);
      return;
    }
    if ((el = t('[data-undo]'))) { update((s) => { const g = s.goals.find((x) => x.id === el.dataset.undo); g.done = false; g.completedAt = null; if (g.type === 'progress' && g.current >= g.target) g.current = Math.max(0, g.target - (g.step || 1)); }); return; }
    if ((el = t('[data-edit]'))) { goalSheet(getState().goals.find((x) => x.id === el.dataset.edit)); return; }
    if ((el = t('[data-step]'))) {
      const id = el.dataset.step, dir = +el.dataset.dir;
      let reached = false;
      update((s) => {
        const g = s.goals.find((x) => x.id === id);
        g.current = +clamp((g.current || 0) + dir * (g.step || 1), 0, g.target).toFixed(2);
        if (g.current >= g.target) { g.done = true; g.completedAt = Date.now(); reached = true; }
      });
      if (reached) { confetti(); toast('Цель достигнута!', '🏆'); }
      return;
    }
    if ((el = t('[data-set]'))) setProgressSheet(getState().goals.find((x) => x.id === el.dataset.set));
  });

  // свайп разовых целей
  root.addEventListener('pointerdown', (e) => {
    const wrap = e.target.closest('[data-swipe]');
    if (!wrap || e.target.closest('button')) return;
    const card = wrap.querySelector('.goal-card');
    const x0 = e.clientX, y0 = e.clientY;
    let dx = 0, active = false;
    const move = (ev) => {
      dx = ev.clientX - x0;
      const dy = ev.clientY - y0;
      if (!active && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { active = true; wrap.classList.add('dragging'); }
      if (active) card.style.transform = `translateX(${Math.max(0, dx)}px)`;
    };
    const up = () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up);
      wrap.classList.remove('dragging');
      if (active && dx > wrap.offsetWidth * 0.35) {
        wrap.classList.add('swiped');
        card.style.transform = `translateX(${wrap.offsetWidth}px)`;
        setTimeout(() => complete(wrap.dataset.swipe), 260);
      } else card.style.transform = '';
    };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up);
  });
}

function goalSheet(goal) {
  const g = goal || { title: '', emoji: '🎯', color: COLORS[0], type: 'single', target: 10, current: 0, unit: '', step: 1, deadline: '' };
  let { emoji, color, type } = g;
  openSheet({
    title: goal ? 'Изменить цель' : 'Новая цель',
    body: `
      <div class="field"><span class="label">Цель</span><input class="input" name="title" value="${esc(g.title)}" placeholder="Например: Прочитать 12 книг" autofocus /></div>
      <div class="field"><span class="label">Тип цели</span>
        <div class="type-cards">
          <button type="button" class="type-card ${type === 'single' ? 'on' : ''}" data-type="single"><span class="t">✅ Разовая</span><span class="d">Сделал — свайпнул, и цель выполнена.</span></button>
          <button type="button" class="type-card ${type === 'progress' ? 'on' : ''}" data-type="progress"><span class="t">📈 С прогрессом</span><span class="d">Иду к цели постепенно и отмечаю, сколько прошёл.</span></button>
        </div></div>
      <div data-progress-fields ${type === 'progress' ? '' : 'hidden'} class="stack">
        <div class="fields-2">
          <div class="field"><span class="label">Цель (число)</span>${stepper('target', g.target, { step: 1, min: 1, max: 1e9, dec: 2 })}</div>
          <div class="field"><span class="label">Единица</span><input class="input" name="unit" value="${esc(g.unit)}" placeholder="км, книг, ₽…" /></div>
        </div>
        <div class="fields-2">
          <div class="field"><span class="label">Уже прошёл</span>${stepper('current', g.current, { step: 1, min: 0, max: 1e9, dec: 2 })}</div>
          <div class="field"><span class="label">Шаг кнопки «+»</span>${stepper('step', g.step, { step: 1, min: 0.01, max: 1e9, dec: 2 })}</div>
        </div>
      </div>
      <div class="field"><span class="label">Срок (необязательно)</span><input class="input" type="date" name="deadline" value="${g.deadline || ''}" /></div>
      <div class="field"><span class="label">Иконка</span>${emojiPicker(emoji)}</div>
      <div class="field"><span class="label">Цвет</span>${colorPicker(color)}</div>
      <button class="btn btn-primary btn-block" data-save>${icon('check', 18)} ${goal ? 'Сохранить' : 'Создать цель'}</button>
      ${goal ? `<button class="btn btn-block btn-danger" data-del>${icon('trash', 18)} Удалить цель</button>` : ''}`,
    onMount: (el) => {
      bindSteppers(el);
      bindPickers(el, (x) => (emoji = x), (x) => (color = x));
      el.querySelectorAll('[data-type]').forEach((b) => b.addEventListener('click', () => {
        type = b.dataset.type;
        el.querySelectorAll('[data-type]').forEach((x) => x.classList.toggle('on', x === b));
        el.querySelector('[data-progress-fields]').hidden = type !== 'progress';
      }));
      const f = (n) => el.querySelector(`[name="${n}"]`).value;
      el.querySelector('[data-save]').addEventListener('click', () => {
        const title = f('title').trim();
        if (!title) { toast('Напиши, какая цель', '✍️'); return; }
        const data = { title, emoji, color, type, deadline: f('deadline'), target: Math.max(0.01, num(f('target'), 10)), current: Math.max(0, num(f('current'), 0)), unit: f('unit').trim(), step: Math.max(0.01, num(f('step'), 1)) };
        update((s) => {
          if (goal) Object.assign(s.goals.find((x) => x.id === goal.id), data);
          else s.goals.unshift({ id: uid(), ...data, done: false, createdAt: Date.now(), completedAt: null });
        });
        closeSheet(); toast(goal ? 'Сохранено' : 'Цель создана', emoji);
      });
      el.querySelector('[data-del]')?.addEventListener('click', async () => {
        if (await confirmSheet('Удалить цель?', `«${esc(goal.title)}» будет удалена без возможности восстановления.`)) {
          update((s) => { s.goals = s.goals.filter((x) => x.id !== goal.id); });
          toast('Цель удалена', '🗑️');
        }
      });
    },
  });
}

function setProgressSheet(g) {
  if (!g) return;
  openSheet({
    title: 'Насколько я продвинулся',
    body: `
      <div class="goal-card" style="--gc:${g.color}"><div class="gc-top"><div class="gc-emoji">${g.emoji}</div>
        <div class="grow"><div class="gc-title">${esc(g.title)}</div><div class="gc-sub">цель: ${fmt(g.target, 2)} ${esc(g.unit)}</div></div></div></div>
      <div class="fields-2">
        <div class="field"><span class="label">Добавить</span>${stepper('add', g.step || 1, { step: g.step || 1, min: 0, max: 1e9, dec: 2 })}</div>
        <div class="field"><span class="label">Или всего прошёл</span>${stepper('total', g.current, { step: g.step || 1, min: 0, max: 1e9, dec: 2 })}</div>
      </div>
      <div class="fields-2">
        <button class="btn" data-total>Сохранить «всего»</button>
        <button class="btn btn-primary" data-add>${icon('plus', 18)} Добавить</button>
      </div>`,
    onMount: (el) => {
      bindSteppers(el);
      const apply = (value) => {
        let reached = false;
        update((s) => {
          const x = s.goals.find((y) => y.id === g.id);
          x.current = +clamp(value, 0, x.target).toFixed(2);
          if (x.current >= x.target) { x.done = true; x.completedAt = Date.now(); reached = true; }
        });
        closeSheet();
        if (reached) { confetti(); toast('Цель достигнута!', '🏆'); } else toast('Прогресс обновлён', '📈');
      };
      el.querySelector('[data-add]').addEventListener('click', () => apply((g.current || 0) + num(el.querySelector('[name=add]').value)));
      el.querySelector('[data-total]').addEventListener('click', () => apply(num(el.querySelector('[name=total]').value)));
    },
  });
}

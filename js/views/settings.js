import { getState, update, exportData, importData, resetAll } from '../store.js';
import { icon } from '../icons.js';
import { esc, toast, confirmSheet, dateKey } from '../ui.js';
import { premiumCardHTML, paywall, deactivate } from '../premium.js';

export function render(root) {
  const st = getState().settings;
  const s = getState();
  const size = new Blob([exportData()]).size;
  root.innerHTML = `
    <header class="page-head"><div><h1>Настройки</h1><div class="sub">Профиль, оформление и резервные копии</div></div></header>

    <div class="grid grid-dash">
      <div class="stack">
        <div class="card pad-lg stack">
          <div class="field"><span class="label">Как к тебе обращаться</span>
            <input class="input" name="name" value="${esc(st.name)}" placeholder="Имя" maxlength="30" /></div>
          <div class="field"><span class="label">Тема</span>
            <div class="theme-swatches">
              <button class="theme-swatch dark ${st.theme !== 'light' ? 'on' : ''}" data-theme-set="dark">${icon('moon', 16)}&nbsp;Тёмная</button>
              <button class="theme-swatch light ${st.theme === 'light' ? 'on' : ''}" data-theme-set="light">${icon('sun', 16)}&nbsp;Светлая</button>
            </div></div>
        </div>

        <div class="card pad-lg stack">
          <div class="bold">💾 Резервная копия</div>
          <div class="muted small" style="line-height:1.5">Все данные хранятся только в этом браузере. Сохраняй копию в файл — так можно перенести данные на другое устройство (телефон ↔ ноутбук) или восстановить их.</div>
          <div class="fields-2">
            <button class="btn btn-primary" data-export>${icon('download', 18)} Сохранить</button>
            <label class="btn" style="cursor:pointer">${icon('upload', 18)} Загрузить<input type="file" accept="application/json,.json" data-import hidden /></label>
          </div>
          <div class="tiny faint">Размер данных: ${(size / 1024).toFixed(1)} КБ · упражнений в плане: ${Object.values(s.plan).flat().length} · целей: ${s.goals.length} · привычек: ${s.habits.length}</div>
        </div>
      </div>

      <div class="stack">
        ${premiumCardHTML()}
        <div class="card pad-lg stack">
          <div class="bold">📱 Установить на телефон</div>
          <div class="muted small" style="line-height:1.6">
            <b>iPhone:</b> открой сайт в Safari → кнопка «Поделиться» → «На экран Домой».<br/>
            <b>Android:</b> в Chrome меню ⋮ → «Установить приложение».<br/>
            <b>Компьютер:</b> в Chrome/Edge значок установки в адресной строке.
          </div>
        </div>
        <div class="card pad-lg stack">
          <div class="bold" style="color:#fb7185">Опасная зона</div>
          <button class="btn btn-danger" data-reset>${icon('trash', 18)} Удалить все данные</button>
        </div>
        <div class="tiny faint" style="text-align:center;line-height:1.6">Kosmic · версия 1.1 · данные: localStorage<br>3D-модель тела: «Male body», автор Chin Eeyang (Sketchfab), лицензия CC BY 4.0. Голова, разметка мышц и стиль — Kosmic.</div>
      </div>
    </div>`;
}

export function bind(root) {
  root.addEventListener('change', async (e) => {
    if (e.target.name === 'name') { update((s) => { s.settings.name = e.target.value.trim(); }); toast('Сохранено', '👋'); }
    if (e.target.matches('[data-import]')) {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        if (await confirmSheet('Загрузить копию?', 'Текущие данные на этом устройстве будут заменены данными из файла.', 'Загрузить')) {
          importData(text); toast('Данные восстановлены', '✅');
        }
      } catch (_) { toast('Не удалось прочитать файл', '⚠️'); }
      e.target.value = '';
    }
  });
  root.addEventListener('click', async (e) => {
    const el = e.target.closest('[data-theme-set]');
    if (el) { update((s) => { s.settings.theme = el.dataset.themeSet; }); return; }
    if (e.target.closest('[data-premium-open]')) { paywall(); return; }
    if (e.target.closest('[data-premium-off]')) {
      if (await confirmSheet('Выйти из Премиума?', 'Подписка не отменится — ключ можно будет ввести снова. Отменить оплату можно по ссылке из письма.', 'Выйти')) deactivate();
      return;
    }
    if (e.target.closest('[data-export]')) {
      const blob = new Blob([exportData()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `kosmic-backup-${dateKey()}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      toast('Копия сохранена', '💾');
      return;
    }
    if (e.target.closest('[data-reset]')) {
      if (await confirmSheet('Удалить всё?', 'Все тренировки, еда, цели и привычки будут удалены с этого устройства. Сначала лучше сохранить резервную копию.', 'Удалить всё')) {
        resetAll(); toast('Данные удалены', '🗑️');
      }
    }
  });
}

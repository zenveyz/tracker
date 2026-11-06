// Просмотрщик анатомической схемы: спереди / сзади / обе стороны,
// зум щипком и колёсиком, перемещение пальцем или мышью, двойное нажатие — приблизить.
import { bodyInner } from './body.js';

const FIG_W = 300, FIG_H = 630, GAP = 40;
const REGIONS = {
  front: { x: 0, y: 0, w: FIG_W, h: FIG_H + 30 },
  back: { x: FIG_W + GAP, y: 0, w: FIG_W, h: FIG_H + 30 },
  both: { x: 0, y: 0, w: FIG_W * 2 + GAP, h: FIG_H + 30 },
};

// состояние сохраняется между перерисовками
const view = { mode: null, k: 1, tx: 0, ty: 0, custom: false };

export function bodyViewHTML(opts = {}) {
  return `<div class="bv" data-bv>
    <svg class="bv-svg" aria-label="Схема мышц">
      <g class="bv-vp" data-vp>
        <g>${bodyInner('front', opts)}</g>
        <g transform="translate(${FIG_W + GAP} 0)">${bodyInner('back', opts)}</g>
        <text x="${FIG_W / 2}" y="${FIG_H + 22}" class="bv-label">СПЕРЕДИ</text>
        <text x="${FIG_W * 1.5 + GAP}" y="${FIG_H + 22}" class="bv-label">СЗАДИ</text>
      </g>
    </svg>
  </div>`;
}

export const viewMode = () => view.mode;

export function initBodyView(root, { onSelect } = {}) {
  const el = root.querySelector('[data-bv]');
  if (!el) return null;
  const svg = el.querySelector('svg');
  const vp = el.querySelector('[data-vp]');
  const size = () => ({ W: el.clientWidth, H: el.clientHeight });
  if (!view.mode) view.mode = window.innerWidth < 640 ? 'front' : 'both';

  function apply(animate) {
    vp.style.transition = animate ? 'transform .55s cubic-bezier(.2,.8,.2,1)' : 'none';
    vp.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.k})`;
  }
  function fit(mode, animate = true) {
    view.mode = mode;
    view.custom = false;
    const { W, H } = size();
    if (!W || !H) return;
    const r = REGIONS[mode];
    const k = Math.min(W / (r.w + 24), H / (r.h + 16));
    view.k = k;
    view.tx = (W - r.w * k) / 2 - r.x * k;
    view.ty = (H - r.h * k) / 2 - r.y * k;
    apply(animate);
    root.querySelectorAll('[data-bv-mode]').forEach((b) => b.classList.toggle('on', b.dataset.bvMode === mode && !view.custom));
  }
  const minK = () => { const { W, H } = size(); const r = REGIONS.both; return Math.min(W / (r.w + 24), H / (r.h + 16)) * 0.9; };
  const maxK = () => minK() * 7;
  function zoomAt(px, py, factor, animate = false) {
    const nk = Math.min(maxK(), Math.max(minK(), view.k * factor));
    const f = nk / view.k;
    view.tx = px - (px - view.tx) * f;
    view.ty = py - (py - view.ty) * f;
    view.k = nk;
    view.custom = true;
    clampPan();
    apply(animate);
    root.querySelectorAll('[data-bv-mode]').forEach((b) => b.classList.remove('on'));
  }
  function clampPan() {
    const { W, H } = size();
    const cw = (FIG_W * 2 + GAP) * view.k, ch = (FIG_H + 30) * view.k;
    const m = 60;
    view.tx = Math.min(W - m, Math.max(m - cw, view.tx));
    view.ty = Math.min(H - m, Math.max(m - ch, view.ty));
  }

  // начальное положение
  if (view.custom) apply(false); else fit(view.mode, false);
  if (!el._ro) {
    el._ro = new ResizeObserver(() => { if (!view.custom) fit(view.mode, false); });
    el._ro.observe(el);
  }

  // ---------- жесты ----------
  const pts = new Map();
  let g = null; // текущий жест
  let lastTap = 0;
  const local = (e) => { const r = svg.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  el.addEventListener('pointerdown', (e) => {
    try { el.setPointerCapture(e.pointerId); } catch (_) { /* синтетические события */ }
    pts.set(e.pointerId, local(e));
    if (pts.size === 1) {
      const [x, y] = local(e);
      g = { type: 'one', x0: x, y0: y, tx: view.tx, ty: view.ty, moved: false, target: e.target.closest('[data-muscle]'), t: performance.now(), scrollY: window.scrollY, cy: e.clientY };
    } else if (pts.size === 2) {
      const [a, b] = [...pts.values()];
      g = { type: 'pinch', d0: Math.hypot(a[0] - b[0], a[1] - b[1]), m0: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], k0: view.k, tx: view.tx, ty: view.ty, moved: true };
    }
  });
  el.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId) || !g) return;
    pts.set(e.pointerId, local(e));
    if (g.type === 'pinch' && pts.size >= 2) {
      const [a, b] = [...pts.values()];
      const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      const m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      const nk = Math.min(maxK(), Math.max(minK(), g.k0 * (d / g.d0)));
      view.k = nk;
      view.tx = m[0] - (g.m0[0] - g.tx) * (nk / g.k0);
      view.ty = m[1] - (g.m0[1] - g.ty) * (nk / g.k0);
      view.custom = true;
      clampPan();
      apply(false);
      root.querySelectorAll('[data-bv-mode]').forEach((bb) => bb.classList.remove('on'));
    } else if (g.type === 'one') {
      const [x, y] = local(e);
      const dx = x - g.x0, dy = y - g.y0;
      if (!g.moved && Math.hypot(dx, dy) > 7) {
        g.moved = true;
        // если схема не приближена и жест вертикальный — прокручиваем страницу
        g.scroll = !view.custom && Math.abs(dy) > Math.abs(dx) && e.pointerType === 'touch';
        g.swipe = !view.custom && !g.scroll && e.pointerType === 'touch';
      }
      if (!g.moved) return;
      if (g.scroll) { window.scrollTo(0, g.scrollY - (e.clientY - g.cy)); return; }
      if (g.swipe) { vp.style.transition = 'none'; vp.style.transform = `translate(${view.tx + dx * 0.6}px, ${view.ty}px) scale(${view.k})`; g.dx = dx; return; }
      view.tx = g.tx + dx; view.ty = g.ty + dy;
      clampPan();
      apply(false);
    }
  });
  const end = (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId);
    if (!g) return;
    if (g.type === 'pinch') { if (pts.size === 0) g = null; else { const [x, y] = [...pts.values()][0]; g = { type: 'one', x0: x, y0: y, tx: view.tx, ty: view.ty, moved: true }; } return; }
    if (g.swipe) {
      // свайп переключает сторону
      const dx = g.dx || 0;
      if (Math.abs(dx) > 50 && view.mode !== 'both') fit(dx < 0 ? 'back' : 'front');
      else fit(view.mode);
    } else if (!g.moved && e.type === 'pointerup') {
      const now = performance.now();
      if (now - lastTap < 300) {
        // двойное нажатие — приблизить / вернуть
        const [x, y] = local(e);
        if (view.custom) fit(view.mode); else zoomAt(x, y, 2.2, true);
        lastTap = 0;
      } else {
        lastTap = now;
        if (g.target && onSelect) onSelect(g.target.dataset.muscle);
      }
    }
    g = null;
  };
  el.addEventListener('pointerup', end);
  el.addEventListener('pointercancel', end);
  el.addEventListener('wheel', (e) => {
    e.preventDefault();
    const [x, y] = local(e);
    zoomAt(x, y, Math.exp(-e.deltaY * 0.0015));
  }, { passive: false });

  return {
    fit,
    zoom(f) { const { W, H } = size(); zoomAt(W / 2, H / 2, f, true); },
    // показать сторону, где находится мышца (на телефоне)
    showSideFor(muscle, side) { if (view.mode !== 'both' && !view.custom && side && side !== view.mode) fit(side); },
  };
}

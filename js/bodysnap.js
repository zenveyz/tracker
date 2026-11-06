// Картинки тела «спереди / сзади» из 3D-модели — для карточек (главная, план дня, итог недели).
// Белая фигура с линиями мышц, как на схеме; мышцы, которые ты качаешь, — в цвете схемы,
// чем больше нагрузка, тем насыщеннее.
import { miniBodies } from './body.js';

const cache = new Map();     // ключ → { front, back } (data URL)
const fallback = new Map();  // ключ → html 2D-схемы на случай, если WebGL недоступен
let queue = Promise.resolve();
let engine = null;           // { render(norm) → {front, back} }
let failed = false;

function hashKey(norm) {
  const str = Object.entries(norm).filter(([, v]) => v > 0).sort(([a], [b]) => a.localeCompare(b))
    .map(([m, v]) => `${m}:${Math.round(v * 20)}`).join('|');
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) | 0;
  return 's' + (h >>> 0).toString(36);
}

const pairHTML = (p) => `<img src="${p.front}" alt="Спереди" draggable="false"><img src="${p.back}" alt="Сзади" draggable="false">`;

/**
 * load: { muscleId: число } — нагрузка (например, подходы). fills — цвета для запасной 2D-схемы.
 * size: 'sm' | 'md' | 'lg'
 */
export function bodySnapsHTML(load, { size = 'md', fills = {} } = {}) {
  const max = Math.max(0, ...Object.values(load));
  const norm = {};
  Object.entries(load).forEach(([m, v]) => { if (v > 0) norm[m] = v / max; });
  const key = hashKey(norm);
  if (failed) return miniBodies(fills, { labels: false, lg: size === 'lg' });
  const done = cache.get(key);
  if (done) return `<div class="snap-pair ${size}">${pairHTML(done)}</div>`;
  fallback.set(key, miniBodies(fills, { labels: false, lg: size === 'lg' }));
  schedule(key, norm);
  return `<div class="snap-pair ${size} loading" data-snap="${key}"><i></i><i></i></div>`;
}

function schedule(key, norm) {
  queue = queue.then(async () => {
    if (cache.has(key) || failed) return;
    try {
      engine ||= await makeEngine();
      cache.set(key, engine.render(norm));
    } catch (e) {
      console.warn('3D-картинки недоступны, показываю 2D-схему', e);
      failed = true;
    }
    document.querySelectorAll(`[data-snap="${key}"]`).forEach((el) => {
      if (failed) { el.outerHTML = fallback.get(key) || ''; return; }
      el.classList.remove('loading');
      el.removeAttribute('data-snap');
      el.innerHTML = pairHTML(cache.get(key));
    });
  });
}

async function makeEngine() {
  const THREE = await import('three');
  const { loadBody, bodyMaterials, addLights, SCHEME_C } = await import('./anatomy3d.js');
  const m = await loadBody();
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  addLights(scene);
  const { mat, om } = bodyMaterials();
  scene.add(new THREE.Mesh(m.geometry, mat), new THREE.Mesh(m.geometry, om));

  // кадр точно по фигуре
  const bb = m.geometry.boundingBox, size = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3());
  const H = size.y * 1.03, W = size.x * 1.06;
  const camera = new THREE.OrthographicCamera(-W / 2, W / 2, H / 2, -H / 2, 0.1, 20);
  const PX_H = 560;
  renderer.setSize(Math.round(PX_H * W / H), PX_H, false);

  const white = new THREE.Color('#ffffff'), tmp = new THREE.Color();
  function paint(norm) {
    const { groups, colorKeys, colors } = m;
    for (let i = 0; i < groups.length; i++) {
      const v = norm[groups[i]] || 0;
      tmp.copy(white);
      if (v > 0 && colorKeys[i] !== 'hair') tmp.lerp(SCHEME_C[colorKeys[i]] || SCHEME_C.base, 0.4 + 0.6 * v);
      colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
    }
    m.geometry.attributes.color.needsUpdate = true;
  }
  function shot(z) {
    camera.position.set(c.x, c.y, c.z + z);
    camera.lookAt(c.x, c.y, c.z);
    renderer.render(scene, camera);
    return renderer.domElement.toDataURL('image/png');
  }
  return {
    render(norm) {
      paint(norm);
      return { front: shot(5), back: shot(-5) };
    },
  };
}

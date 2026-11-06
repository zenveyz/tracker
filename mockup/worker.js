import { buildBodyDef, makeField, polygonize, annotate } from './sculpt.js';

// Оставляем только треугольники, у которых все вершины проходят проверку, и сжимаем вершины
function crop(mesh, keep) {
  const { positions, indices } = mesh;
  const map = new Int32Array(positions.length / 3).fill(-1);
  const pos = [], idx = [];
  for (let i = 0; i < indices.length; i += 3) {
    const a = indices[i], b = indices[i + 1], c = indices[i + 2];
    if (!keep(positions[a * 3 + 1], positions[b * 3 + 1], positions[c * 3 + 1])) continue;
    for (const v of [a, b, c]) {
      if (map[v] < 0) { map[v] = pos.length / 3; pos.push(positions[v * 3], positions[v * 3 + 1], positions[v * 3 + 2]); }
      idx.push(map[v]);
    }
  }
  return { positions: pos, indices: idx };
}

self.onmessage = (e) => {
  const t0 = performance.now();
  const h = e.data?.h || 0.0036;
  const field = makeField(buildBodyDef());
  // тело — обычное разрешение, голова — в 2 раза подробнее; стык прячется внутри шеи
  const SEAM = 1.515;
  const body = crop(polygonize(field, { min: [-0.36, -0.01, -0.19], max: [0.36, SEAM + 0.03, 0.2], h }), (a, b, c) => Math.max(a, b, c) < SEAM + 0.01);
  const head = crop(polygonize(field, { min: [-0.12, SEAM - 0.03, -0.13], max: [0.12, 1.89, 0.15], h: h / 2 }), (a, b, c) => Math.min(a, b, c) > SEAM - 0.01);
  const nb = body.positions.length / 3;
  const positions = new Float32Array([...body.positions, ...head.positions]);
  const indices = new Uint32Array(body.indices.length + head.indices.length);
  indices.set(body.indices);
  for (let i = 0; i < head.indices.length; i++) indices[body.indices.length + i] = head.indices[i] + nb;
  const { normals, groups, colorKeys, line } = annotate(field, positions, indices);
  self.postMessage({ positions, indices, normals, groups, colorKeys, line, ms: Math.round(performance.now() - t0) },
    [positions.buffer, indices.buffer, normals.buffer, line.buffer]);
};

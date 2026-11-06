import { loadGLB } from './glb.mjs';
const { positions: P } = loadGLB(new URL('../model/male_body.glb', import.meta.url).pathname.slice(1));
const n = P.length / 3;
console.log('verts', n);
const slice = (cond, y0, y1, step) => {
  for (let y = y0; y < y1; y += step) {
    let sx = 0, sz = 0, c = 0, mnx = 1e9, mxx = -1e9, mnz = 1e9, mxz = -1e9;
    for (let i = 0; i < n; i++) {
      const x = P[i * 3], yy = P[i * 3 + 1], z = P[i * 3 + 2];
      if (yy < y || yy >= y + step || !cond(x, yy, z)) continue;
      sx += x; sz += z; c++; mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mnz = Math.min(mnz, z); mxz = Math.max(mxz, z);
    }
    if (c) console.log(y.toFixed(0).padStart(4), 'n', String(c).padStart(6), 'cx', (sx / c).toFixed(1), 'cz', (sz / c).toFixed(1), 'x', mnx.toFixed(1), mxx.toFixed(1), 'z', mnz.toFixed(1), mxz.toFixed(1));
  }
};
const which = process.argv[2];
if (which === 'torso') slice((x) => Math.abs(x) < 30, 80, 182, 4);
if (which === 'arm') slice((x) => x > 0, 80, 165, 4);
if (which === 'leg') slice((x) => x > 0, 0, 100, 5);
if (which === 'arm2') slice((x, y) => x > (y > 132 ? 24 : y > 110 ? 21 : 22), 80, 162, 4);
if (which === 'groin') slice((x, y, z) => Math.abs(x) < 8 && z > -2, 70, 100, 2);
if (which === 'neck') slice((x) => true, 160, 182, 2);

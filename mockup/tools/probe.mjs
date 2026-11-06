// Профиль вогнутости вдоль линии на поверхности: где проходят настоящие ложбинки
import { loadGLB } from './glb.mjs';
const src = loadGLB(new URL('../model/male_body.glb', import.meta.url).pathname.slice(1));
const P = src.positions, I = src.indices, n = P.length / 3;
// нормали
const N = new Float32Array(P.length);
for (let t = 0; t < I.length; t += 3) { const a = I[t]*3, b = I[t+1]*3, c = I[t+2]*3;
  const ux=P[b]-P[a],uy=P[b+1]-P[a+1],uz=P[b+2]-P[a+2],vx=P[c]-P[a],vy=P[c+1]-P[a+1],vz=P[c+2]-P[a+2];
  const nx=uy*vz-uz*vy, ny=uz*vx-ux*vz, nz=ux*vy-uy*vx; for (const k of [a,b,c]) { N[k]+=nx; N[k+1]+=ny; N[k+2]+=nz; } }
// профиль: для каждой высоты y — самая передняя (или задняя/наружная) точка в полосе
const mode = process.argv[2], fixed = +process.argv[3];
const rows = new Map();
for (let v = 0; v < n; v++) {
  const x = P[v*3], y = P[v*3+1], z = P[v*3+2];
  let key, depth;
  if (mode === 'front') { if (Math.abs(x - fixed) > 0.4) continue; key = Math.round(y); depth = z; }
  if (mode === 'back') { if (Math.abs(x - fixed) > 0.4) continue; key = Math.round(y); depth = -z; }
  if (mode === 'outer') { if (Math.abs(z - fixed) > 0.6 || x < 15) continue; key = Math.round(y); depth = x; }
  const r = rows.get(key); if (!r || depth > r.d) rows.set(key, { d: depth, y });
}
const ks = [...rows.keys()].sort((a, b) => b - a);
let prev = null;
for (const k of ks) { const r = rows.get(k); const slope = prev ? (r.d - prev).toFixed(2) : ''; console.log(String(k).padStart(4), r.d.toFixed(2).padStart(7), slope.padStart(6)); prev = r.d; }

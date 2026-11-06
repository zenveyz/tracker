// Чтение GLB без библиотек: собирает все треугольники в одну сетку (координаты: y вверх, z вперёд, см)
import { readFileSync } from 'node:fs';
export function loadGLB(path) {
  const b = readFileSync(path);
  const jsonLen = b.readUInt32LE(12);
  const j = JSON.parse(b.slice(20, 20 + jsonLen).toString());
  const binStart = 20 + jsonLen + 8;
  const view = (acc) => {
    const a = j.accessors[acc], bv = j.bufferViews[a.bufferView];
    const off = binStart + (bv.byteOffset || 0) + (a.byteOffset || 0);
    const n = a.count * ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type]);
    if (a.componentType === 5126) return new Float32Array(b.buffer.slice(b.byteOffset + off, b.byteOffset + off + n * 4));
    if (a.componentType === 5125) return new Uint32Array(b.buffer.slice(b.byteOffset + off, b.byteOffset + off + n * 4));
    if (a.componentType === 5123) return new Uint16Array(b.buffer.slice(b.byteOffset + off, b.byteOffset + off + n * 2));
    throw new Error('type ' + a.componentType);
  };
  const pos = [], idx = [];
  let base = 0;
  for (const m of j.meshes) for (const p of m.primitives) {
    const P = view(p.attributes.POSITION), I = view(p.indices);
    for (let i = 0; i < P.length; i += 3) pos.push(P[i], P[i + 2], -P[i + 1]); // z-up → y-up
    for (let i = 0; i < I.length; i++) idx.push(I[i] + base);
    base += P.length / 3;
  }
  return { positions: Float32Array.from(pos), indices: Uint32Array.from(idx), meta: j.asset };
}

// Генерирует PNG-иконки для iPhone/Android (без внешних библиотек)
import { writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, file) {
  const raw = Buffer.alloc((size * 4 + 1) * size);
  const c1 = [124, 92, 255], c2 = [34, 211, 238];
  const SS = 4;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let star = 0, dot = 0;
      for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
        const u = (x + (sx + 0.5) / SS) / size, v = (y + (sy + 0.5) / SS) / size;
        const dx = Math.abs(u - 0.5) / 0.31, dy = Math.abs(v - 0.5) / 0.31;
        if (Math.sqrt(dx) + Math.sqrt(dy) < 1) star++;
        if ((u - 0.723) ** 2 + (v - 0.285) ** 2 < 0.043 ** 2) dot++;
      }
      const a = star / (SS * SS), b = (dot / (SS * SS)) * 0.85;
      const t = (x + y) / (2 * size);
      const base = c1.map((v, i) => v + (c2[i] - v) * t);
      const w = Math.min(1, a + b);
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = base[0] + (255 - base[0]) * w;
      raw[o + 1] = base[1] + (255 - base[1]) * w;
      raw[o + 2] = base[2] + (255 - base[2]) * w;
      raw[o + 3] = 255;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const out = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
  writeFileSync(file, out);
}
const dir = new URL('../icons/', import.meta.url);
for (const s of [180, 192, 512]) png(s, new URL(`icon-${s}.png`, dir));
console.log('ok');

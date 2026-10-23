// node tools/zone.mjs raw w h quadJSON sens -> seg2/out.raw
import fs from 'fs';
const { _interne } = await import('../theme/assets/mm-mur-3d.js');
const [,, raw, w, h, q, sens = '0.5'] = process.argv;
const t = performance.now();
const r = _interne.masqueZone(new Uint8ClampedArray(fs.readFileSync(raw)), +w, +h, JSON.parse(q), +sens);
console.log('part', r.part.toFixed(3), Math.round(performance.now() - t) + ' ms');
fs.writeFileSync('seg2/out.raw', Buffer.from(r.m));

// Rendu d'une série de carreaux sur une photo : node tools/t16.mjs <photo> <prefixe> <u,v;u,v;u,v;u,v> <handle>...
import { chromium } from 'playwright';
import fs from 'fs';
const [,, photo, pre, coins, ...handles] = process.argv;
const pts = coins.split(';').map((s) => s.split(',').map(Number));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--ignore-certificate-errors', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
for (const h of handles) {
  const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
  p.on('pageerror', (e) => console.log('PAGEERR', e.message));
  await p.goto('http://127.0.0.1:8765/test/index.html?h=' + h, { waitUntil: 'networkidle' });
  await p.tap('[data-mm-m3-open]');
  await p.waitForFunction(() => document.querySelector('#mm-mur-3d'));
  await p.waitForTimeout(800);
  const S = (js) => p.evaluate(`(async () => { const r = document.querySelector('#mm-mur-3d').shadowRoot; ${js} })()`);
  const input = await p.evaluateHandle(() => document.querySelector('#mm-mur-3d').shadowRoot.querySelectorAll('[data-f]')[1]);
  await input.asElement().setInputFiles(photo);
  await p.waitForTimeout(1800);
  const box = await S(`const c = r.querySelector('canvas.cv').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height };`);
  for (const [u, v] of pts) { await p.touchscreen.tap(box.x + box.w * u, box.y + box.h * v); await p.waitForTimeout(300); }
  await p.waitForTimeout(2500);
  const d = await S(`return r.querySelector('canvas.cv').toDataURL('image/jpeg', 0.9)`);
  fs.writeFileSync(`seg2/${pre}-${h.split('-carrelage-adhesif-')[0]}-${h.split('-carrelage-adhesif-')[1].replace(/-\d.*$/, '')}.jpg`, Buffer.from(d.split(',')[1], 'base64'));
  await p.close();
}
await b.close();

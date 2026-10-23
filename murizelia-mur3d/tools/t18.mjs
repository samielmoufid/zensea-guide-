// « Garder un objet » : zone posée, puis objets touchés -> shots/g-*.png
// node tools/t18.mjs <photo> <coins u,v;…> <objets u,v;…> <nom> [carreau]
import { chromium } from 'playwright';
const [,, photo, coins, objets, nom, h = 'mosaela-carrelage-adhesif-3d-damier-bleu-saphir-25-4x25-4-cm'] = process.argv;
const pts = (t) => t.split(';').map((s) => s.split(',').map(Number));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 })).newPage();
p.on('pageerror', (e) => console.log('PAGEERR', e.message));
await p.goto('http://127.0.0.1:8765/test/index.html?h=' + h, { waitUntil: 'networkidle' });
await p.tap('[data-mm-m3-open]');
await p.waitForFunction(() => document.querySelector('#mm-mur-3d'));
await p.waitForTimeout(800);
const S = (js) => p.evaluate(`(async () => { const r = document.querySelector('#mm-mur-3d').shadowRoot; ${js} })()`);
if (nom === 'accueil') { await p.screenshot({ path: 'shots/g-accueil.png' }); await b.close(); process.exit(0); }
const input = await p.evaluateHandle(() => document.querySelector('#mm-mur-3d').shadowRoot.querySelectorAll('[data-f]')[1]);
await input.asElement().setInputFiles(photo);
await p.waitForTimeout(1500);
const box = await S(`const c = r.querySelector('canvas.cv').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height };`);
for (const [u, v] of pts(coins)) { await p.touchscreen.tap(box.x + box.w * u, box.y + box.h * v); await p.waitForTimeout(300); }
await p.waitForTimeout(2000);
await p.screenshot({ path: `shots/g-${nom}-0.png` });
await S(`r.querySelector('[data-sub="garder"]').click()`); await p.waitForTimeout(400);
console.log('indice :', await S(`return r.querySelector('.hint').textContent`));
const box2 = await S(`const c = r.querySelector('canvas.cv').getBoundingClientRect(); return { x: c.x, y: c.y, w: c.width, h: c.height };`);
for (const [u, v] of pts(objets)) { await p.touchscreen.tap(box2.x + box2.w * u, box2.y + box2.h * v); await p.waitForTimeout(700); }
await p.waitForTimeout(800);
console.log('panneau :', await S(`return [...r.querySelectorAll('.subs [data-r]')].map(c => c.textContent.trim() + (c.disabled ? '(off)' : '')).join(' | ')`));
await p.screenshot({ path: `shots/g-${nom}-1.png` });
const d = await S(`return r.querySelector('canvas.cv').toDataURL('image/jpeg', 0.9)`);
(await import('fs')).writeFileSync(`shots/g-${nom}-rendu.jpg`, Buffer.from(d.split(',')[1], 'base64'));
await S(`r.querySelector('[data-r="annuler"]').click()`); await p.waitForTimeout(500);
console.log('après Annuler :', await S(`return [...r.querySelectorAll('.subs [data-r]')].map(c => c.textContent.trim() + (c.disabled ? '(off)' : '')).join(' | ')`));
await b.close();

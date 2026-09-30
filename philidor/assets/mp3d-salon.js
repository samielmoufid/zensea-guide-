/* Maison Philidor — Le salon des règles (backgammon), expérience 3D à la première personne.
   Three.js r170 chargé depuis jsDelivr (les imports nus sont résolus par le CDN via /+esm). */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { GLTFLoader } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/loaders/GLTFLoader.js/+esm';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js/+esm';

const CFG = JSON.parse(document.getElementById('mp3d-config').textContent);
const racine = document.getElementById('mp3d');
const $ = (s, r = racine) => r.querySelector(s);
const mobile = window.matchMedia('(max-width: 749px)').matches;
const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ */
/* Rendu                                                                */
/* ------------------------------------------------------------------ */
const canvas = $('#mp3d-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05040a);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

const camera = new THREE.PerspectiveCamera(mobile ? 62 : 52, 1, 0.05, 60);
const SIEGE = new THREE.Vector3(0, 1.2, 1.02);          // œil du joueur, assis
const REGARD = new THREE.Vector3(0, 0.84, -0.6);         // vers l'hôte, de l'autre côté de la table
camera.position.copy(SIEGE);
camera.lookAt(REGARD);

function redim() {
  const w = racine.clientWidth, h = racine.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', redim);
redim();

/* ------------------------------------------------------------------ */
/* Chargement                                                           */
/* ------------------------------------------------------------------ */
const gestion = new THREE.LoadingManager();
const barre = $('#mp3d-progress i');
let chargeFini = false;
gestion.onProgress = (u, n, t) => { if (barre) barre.style.width = Math.round(100 * n / t) + '%'; };
const chargeurTex = new THREE.TextureLoader(gestion);
const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

function tex(url, rep = 1, rep2, couleur = false) {
  const t = chargeurTex.load(url);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rep, rep2 === undefined ? rep : rep2);
  t.anisotropy = aniso;
  if (couleur) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function pbr(nom, rep, rep2, { normal, ...opts } = {}) {
  const m = new THREE.MeshStandardMaterial({
    map: tex(CFG.tex[nom + '-d'], rep, rep2, true),
    roughnessMap: CFG.tex[nom + '-r'] ? tex(CFG.tex[nom + '-r'], rep, rep2) : null,
    normalMap: CFG.tex[nom + '-n'] ? tex(CFG.tex[nom + '-n'], rep, rep2) : null,
    roughness: 1, metalness: 0, ...opts,
  });
  if (m.normalMap) m.normalScale.set(normal || 0.6, normal || 0.6);
  return m;
}
function boite(w, h, d, mat, x = 0, y = 0, z = 0, ombre = true) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = ombre; m.receiveShadow = true;
  return m;
}
const bois = (c, r = 0.55) => new THREE.MeshStandardMaterial({ color: c, roughness: r, metalness: 0 });
const laiton = new THREE.MeshStandardMaterial({ color: 0xc9a961, roughness: 0.32, metalness: 1 });

/* ------------------------------------------------------------------ */
/* La pièce : le salon                                                  */
/* ------------------------------------------------------------------ */
const salon = new THREE.Group();
scene.add(salon);
const L = 6.4, P = 5.6, H = 3.3;   // largeur (x), profondeur (z), hauteur

// sol et plafond
const sol = new THREE.Mesh(new THREE.PlaneGeometry(L, P), pbr('parquet', 3.2, 2.8, { normal: 0.5 }));
sol.rotation.x = -Math.PI / 2; sol.receiveShadow = true; salon.add(sol);
const plafond = new THREE.Mesh(new THREE.PlaneGeometry(L, P), new THREE.MeshStandardMaterial({ color: 0xf3ecdf, roughness: 0.95 }));
plafond.rotation.x = Math.PI / 2; plafond.position.y = H; salon.add(plafond);
// corniche
const cornMat = new THREE.MeshStandardMaterial({ color: 0xefe6d6, roughness: 0.9 });
[[0, H - 0.09, -P / 2 + 0.06, L, 0], [0, H - 0.09, P / 2 - 0.06, L, 0], [-L / 2 + 0.06, H - 0.09, 0, P, Math.PI / 2], [L / 2 - 0.06, H - 0.09, 0, P, Math.PI / 2]]
  .forEach(([x, y, z, l, ry]) => { const c = boite(l, 0.18, 0.12, cornMat, x, y, z, false); c.rotation.y = ry; salon.add(c); });

// murs (plâtre beige) + lambris bas
const murMat = pbr('mur', 4, 2.2, { roughness: 0.95 });
const lambrisMat = bois(0x5a3f2a, 0.5);
function mur(w, x, z, ry) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, H), murMat); m.position.y = H / 2; m.receiveShadow = true; g.add(m);
  const lb = boite(w, 0.95, 0.04, lambrisMat, 0, 0.475, 0.02, false); g.add(lb);
  const moul = boite(w, 0.05, 0.06, lambrisMat, 0, 0.97, 0.03, false); g.add(moul);
  for (let i = -w / 2 + 0.3; i < w / 2; i += 0.6) g.add(boite(0.03, 0.72, 0.012, bois(0x4a3222, 0.5), i, 0.5, 0.045, false));
  g.position.set(x, 0, z); g.rotation.y = ry;
  return g;
}
salon.add(mur(L, 0, -P / 2, 0));               // fond (derrière l'hôte)
salon.add(mur(L, 0, P / 2, Math.PI));          // derrière le joueur
salon.add(mur(P, -L / 2, 0, Math.PI / 2));     // gauche (fenêtre)
salon.add(mur(P, L / 2, 0, -Math.PI / 2));     // droite (bibliothèque)

// fenêtre à petits carreaux, mur de gauche, avec la lumière du jour
const fen = new THREE.Group();
fen.position.set(-L / 2 + 0.03, 1.75, -0.4); fen.rotation.y = Math.PI / 2;
const cadreMat = bois(0xeae2d2, 0.7);
fen.add(boite(1.5, 0.08, 0.12, cadreMat, 0, 1.06, 0)); fen.add(boite(1.5, 0.1, 0.16, cadreMat, 0, -1.06, 0));
fen.add(boite(0.08, 2.2, 0.12, cadreMat, -0.75, 0, 0)); fen.add(boite(0.08, 2.2, 0.12, cadreMat, 0.75, 0, 0));
fen.add(boite(0.05, 2.1, 0.06, cadreMat, 0, 0, 0));
for (let y = -0.7; y <= 0.71; y += 0.7) fen.add(boite(1.45, 0.045, 0.06, cadreMat, 0, y, 0));
const jour = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 2.1), new THREE.MeshBasicMaterial({ color: 0xfff2d6 }));
jour.position.z = -0.02; fen.add(jour);
const vitre = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 2.1), new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.05, thickness: 0.01, transparent: true, opacity: 0.35 }));
vitre.position.z = 0.02; fen.add(vitre);
// rideaux
const rideauMat = new THREE.MeshStandardMaterial({ color: 0x7a2a2a, roughness: 0.9 });
[-1.0, 1.0].forEach(x => { const r = boite(0.34, 2.75, 0.14, rideauMat, x, 0.1, 0.12); fen.add(r); });
fen.add(boite(2.5, 0.05, 0.05, laiton, 0, 1.45, 0.14));
salon.add(fen);

// bibliothèque, mur de droite
const biblio = new THREE.Group();
biblio.position.set(L / 2 - 0.2, 0, -0.2); biblio.rotation.y = -Math.PI / 2;
const chene = bois(0x4b3220, 0.5);
biblio.add(boite(2.4, 2.6, 0.36, chene, 0, 1.3, 0));
const couleursLivres = [0x5a1f1f, 0x2b3a55, 0x3d4a2a, 0x6b4a1f, 0x232323, 0x7a5a2a, 0x4d2c4a, 0x8a6d33, 0x2e2519, 0x9a3b2b];
for (let e = 0; e < 5; e++) {
  const y = 0.32 + e * 0.5;
  biblio.add(boite(2.3, 0.03, 0.34, bois(0x6a4a30, 0.5), 0, y, 0));
  let x = -1.1;
  while (x < 1.08) {
    const w = 0.03 + Math.random() * 0.035, h = 0.22 + Math.random() * 0.16;
    const l = boite(w, h, 0.22, bois(couleursLivres[Math.floor(Math.random() * couleursLivres.length)], 0.7), x + w / 2, y + 0.015 + h / 2, 0.02, false);
    l.rotation.z = (Math.random() - 0.5) * 0.03;
    biblio.add(l); x += w + 0.004;
    if (Math.random() < 0.08) x += 0.06;
  }
}
salon.add(biblio);

// tableaux sur le mur du fond
function tableau(w, h, x, y, z, ry, teinte) {
  const g = new THREE.Group();
  g.add(boite(w + 0.12, h + 0.12, 0.05, laiton, 0, 0, 0, false));
  const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * h / w);
  const ctx = c.getContext('2d');
  const W = c.width, Hh = c.height;
  const ciel = ctx.createLinearGradient(0, 0, 0, Hh * 0.62);
  ciel.addColorStop(0, teinte[1]); ciel.addColorStop(0.55, teinte[0]); ciel.addColorStop(1, '#c9a26a');
  ctx.fillStyle = ciel; ctx.fillRect(0, 0, W, Hh);
  // nuages
  for (let i = 0; i < 22; i++) { ctx.fillStyle = `rgba(230,205,170,${0.05 + Math.random() * 0.12})`; ctx.beginPath(); ctx.ellipse(Math.random() * W, Hh * (0.1 + Math.random() * 0.4), 40 + Math.random() * 120, 10 + Math.random() * 28, 0, 0, 7); ctx.fill(); }
  // collines lointaines puis proches
  [['#6f6a5a', 0.58, 60], ['#4c4a3a', 0.66, 46], ['#2f2c22', 0.76, 34]].forEach(([col, base, amp], k) => {
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, Hh);
    for (let x = 0; x <= W; x += 8) ctx.lineTo(x, Hh * base + Math.sin(x * 0.013 + k * 2) * amp + Math.sin(x * 0.041 + k) * amp * 0.3);
    ctx.lineTo(W, Hh); ctx.fill();
  });
  // arbres sombres au premier plan
  for (let i = 0; i < 9; i++) { const x = Math.random() * W, y = Hh * (0.72 + Math.random() * 0.12), r = 18 + Math.random() * 40; ctx.fillStyle = '#1b1a12'; ctx.fillRect(x - 3, y, 6, Hh - y); ctx.beginPath(); ctx.ellipse(x, y, r, r * 1.4, 0, 0, 7); ctx.fill(); }
  // plan d'eau qui reflète le ciel
  const eau = ctx.createLinearGradient(0, Hh * 0.8, 0, Hh); eau.addColorStop(0, '#5a5540'); eau.addColorStop(1, '#23201a');
  ctx.fillStyle = eau; ctx.fillRect(0, Hh * 0.86, W, Hh * 0.14);
  // craquelures et vernis
  for (let i = 0; i < 700; i++) { ctx.fillStyle = `rgba(20,14,8,${Math.random() * 0.12})`; ctx.fillRect(Math.random() * W, Math.random() * Hh, 1, 1 + Math.random() * 3); }
  const v = ctx.createRadialGradient(W / 2, Hh / 2, Hh * 0.2, W / 2, Hh / 2, Hh * 0.8); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(15,10,5,.55)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, Hh);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: t, roughness: 0.85 }));
  p.position.z = 0.03; g.add(p);
  g.position.set(x, y, z); g.rotation.y = ry; return g;
}
salon.add(tableau(1.1, 1.4, -1.3, 1.95, -P / 2 + 0.03, 0, ['#b98a5a', '#3a3b3a']));
salon.add(tableau(0.8, 1.0, 1.4, 1.9, -P / 2 + 0.03, 0, ['#c49a66', '#4a4a45']));

// cheminée, mur du fond, à droite
const chem = new THREE.Group(); chem.position.set(2.1, 0, -P / 2 + 0.3);
const pierre = new THREE.MeshStandardMaterial({ color: 0xd9cdb8, roughness: 0.9 });
chem.add(boite(1.6, 1.25, 0.6, pierre, 0, 0.625, 0)); chem.add(boite(1.8, 0.1, 0.7, bois(0x3a2a1c), 0, 1.3, 0));
chem.add(boite(0.9, 0.85, 0.5, new THREE.MeshStandardMaterial({ color: 0x0b0806, roughness: 1 }), 0, 0.45, 0.08));
const feu = new THREE.PointLight(0xff7a2a, 12, 6, 2); feu.position.set(2.1, 0.5, -P / 2 + 0.55); scene.add(feu);
const braise = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xff9a3a })); braise.position.set(0, 0.2, 0.12); braise.scale.y = 0.5; chem.add(braise);
salon.add(chem);

// tapis sous la table
const tapis = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), new THREE.MeshStandardMaterial({ color: 0x6b2a2a, roughness: 1 }));
tapis.rotation.x = -Math.PI / 2; tapis.position.y = 0.006; tapis.receiveShadow = true; salon.add(tapis);
const bordTapis = new THREE.Mesh(new THREE.RingGeometry(0.01, 0.02, 4), new THREE.MeshStandardMaterial({ color: 0xc9a961 }));
bordTapis.visible = false; salon.add(bordTapis);

/* ------------------------------------------------------------------ */
/* Lumières                                                             */
/* ------------------------------------------------------------------ */
scene.add(new THREE.HemisphereLight(0xfff4e0, 0x3a2a1c, 0.35));
const soleil = new THREE.DirectionalLight(0xfff0d0, 2.2);
soleil.position.set(-4.5, 3.4, -1.2); soleil.target.position.set(0.4, 0.8, 0.2);
soleil.castShadow = true; soleil.shadow.mapSize.set(2048, 2048);
soleil.shadow.camera.left = -3; soleil.shadow.camera.right = 3; soleil.shadow.camera.top = 3; soleil.shadow.camera.bottom = -3;
soleil.shadow.bias = -0.0004; soleil.shadow.normalBias = 0.02;
scene.add(soleil, soleil.target);
// lustre au-dessus de la table : chandelles
const lustre = new THREE.Group(); lustre.position.set(0, H - 0.75, 0);
lustre.add(new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.75, 8), laiton).translateY(0.375));
const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 10, 40), laiton); anneau.rotation.x = Math.PI / 2; lustre.add(anneau);
const flammes = [];
for (let i = 0; i < 6; i++) {
  const a = i / 6 * Math.PI * 2, x = Math.cos(a) * 0.34, z = Math.sin(a) * 0.34;
  lustre.add(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.12, 8), new THREE.MeshStandardMaterial({ color: 0xfff6e0, roughness: 0.6 })).translateX(x).translateZ(z).translateY(0.06));
  const f = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffd38a })); f.scale.y = 1.8; f.position.set(x, 0.145, z); lustre.add(f); flammes.push(f);
}
const lampe = new THREE.PointLight(0xffc98a, 9, 7, 2); lampe.position.set(0, H - 0.6, 0); lampe.castShadow = true; lampe.shadow.mapSize.set(1024, 1024); lampe.shadow.bias = -0.002; scene.add(lampe);
salon.add(lustre);

/* ------------------------------------------------------------------ */
/* La table et les sièges                                               */
/* ------------------------------------------------------------------ */
const TABLE_Y = 0.76;                       // hauteur du plateau
const tableMat = pbr('table', 1.6, 1.0, { normal: 0.4 });
const table = new THREE.Group();
const plateau = boite(1.75, 0.045, 1.05, tableMat, 0, TABLE_Y - 0.0225, 0);
table.add(plateau);
table.add(boite(1.6, 0.09, 0.9, bois(0x3f2a1a, 0.5), 0, TABLE_Y - 0.09, 0));
function piedTourne(x, z) {
  const pts = [];
  const prof = [[0.05, 0], [0.055, 0.04], [0.035, 0.08], [0.045, 0.2], [0.03, 0.26], [0.05, 0.34], [0.03, 0.4], [0.04, 0.55], [0.028, 0.6], [0.046, 0.66], [0.05, 0.7]];
  prof.forEach(([r, y]) => pts.push(new THREE.Vector2(r, y)));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 24), bois(0x3a2618, 0.45));
  m.position.set(x, 0, z); m.castShadow = true; m.receiveShadow = true;
  return m;
}
[[-0.75, -0.42], [0.75, -0.42], [-0.75, 0.42], [0.75, 0.42]].forEach(([x, z]) => table.add(piedTourne(x, z)));
scene.add(table);

function chaise(z, ry) {
  const g = new THREE.Group();
  const m = bois(0x3a2618, 0.5);
  g.add(boite(0.48, 0.05, 0.46, m, 0, 0.47, 0));
  g.add(boite(0.46, 0.06, 0.42, new THREE.MeshStandardMaterial({ color: 0x6e2b2b, roughness: 0.95 }), 0, 0.525, 0));
  [[-0.21, -0.2], [0.21, -0.2], [-0.21, 0.2], [0.21, 0.2]].forEach(([x, zz]) => g.add(boite(0.04, 0.46, 0.04, m, x, 0.23, zz)));
  [[-0.21], [0.21]].forEach(([x]) => g.add(boite(0.04, 0.55, 0.04, m, x, 0.77, -0.2)));
  g.add(boite(0.46, 0.09, 0.03, m, 0, 1.0, -0.2));
  g.add(boite(0.46, 0.06, 0.03, m, 0, 0.8, -0.2));
  [-0.1, 0, 0.1].forEach(x => g.add(boite(0.03, 0.34, 0.02, m, x, 0.75, -0.2)));
  g.position.set(0, 0, z); g.rotation.y = ry;
  return g;
}
salon.add(chaise(-1.02, 0));           // l'hôte
const chaiseJoueur = chaise(1.05, Math.PI); salon.add(chaiseJoueur);   // le joueur

/* ------------------------------------------------------------------ */
/* Le jeu d'échecs                                                      */
/* ------------------------------------------------------------------ */
function grainBois(ctx, w, h, base, veine, n = 260) {
  ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    ctx.strokeStyle = veine; ctx.globalAlpha = 0.05 + Math.random() * 0.14; ctx.lineWidth = 1 + Math.random() * 2.5;
    const y = Math.random() * h; ctx.beginPath(); ctx.moveTo(0, y);
    for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x / 90 + i) * 6 + (Math.random() - 0.5) * 3);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}
const echecs = new THREE.Group();
const TAILLE_ECH = 0.42, CASE = TAILLE_ECH / 8;
{
  const c = document.createElement('canvas'); c.width = c.height = 1024; const ctx = c.getContext('2d');
  const q = 1024 / 8;
  for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) {
    const clair = (i + j) % 2 === 0;
    ctx.save(); ctx.translate(i * q, j * q);
    ctx.beginPath(); ctx.rect(0, 0, q, q); ctx.clip();
    grainBois(ctx, q, q, clair ? '#d8c39c' : '#5a3a24', clair ? '#b89a6a' : '#2f1c10', 40);
    ctx.restore();
  }
  ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i++) { ctx.beginPath(); ctx.moveTo(i * q, 0); ctx.lineTo(i * q, 1024); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * q); ctx.lineTo(1024, i * q); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  const surf = new THREE.Mesh(new THREE.BoxGeometry(TAILLE_ECH, 0.012, TAILLE_ECH), [bois(0x3a2618), bois(0x3a2618), new THREE.MeshStandardMaterial({ map: t, roughness: 0.42 }), bois(0x3a2618), bois(0x3a2618), bois(0x3a2618)]);
  surf.position.y = 0.014; surf.castShadow = true; surf.receiveShadow = true; echecs.add(surf);
  const cadre = boite(TAILLE_ECH + 0.05, 0.016, TAILLE_ECH + 0.05, pbr('noyer', 1, 1, { roughness: 0.4 }), 0, 0.008, 0);
  echecs.add(cadre);
}
const buis = new THREE.MeshStandardMaterial({ color: 0xe3caa0, roughness: 0.38 });
const ebene = new THREE.MeshStandardMaterial({ color: 0x2a1811, roughness: 0.32 });
function lathe(prof, mat, hauteur) {
  const pts = prof.map(([r, y]) => new THREE.Vector2(r * hauteur, y * hauteur));
  const m = new THREE.Mesh(new THREE.LatheGeometry(pts, 28), mat);
  m.castShadow = true; m.receiveShadow = true; return m;
}
const PROFILS = {
  pion:     [[0, 0], [0.34, 0], [0.36, 0.05], [0.28, 0.1], [0.16, 0.17], [0.13, 0.36], [0.2, 0.44], [0.13, 0.52], [0.22, 0.6], [0.24, 0.72], [0.17, 0.86], [0.06, 0.98], [0, 1]],
  tour:     [[0, 0], [0.33, 0], [0.35, 0.05], [0.26, 0.11], [0.17, 0.2], [0.15, 0.5], [0.18, 0.6], [0.24, 0.66], [0.25, 0.9], [0.27, 0.92], [0.2, 0.92], [0.2, 1], [0, 1]],
  cavalier: [[0, 0], [0.33, 0], [0.35, 0.05], [0.26, 0.11], [0.17, 0.2], [0.15, 0.4], [0.17, 0.46], [0.19, 0.48], [0, 0.48]],
  fou:      [[0, 0], [0.32, 0], [0.34, 0.05], [0.25, 0.11], [0.15, 0.2], [0.12, 0.5], [0.19, 0.58], [0.12, 0.64], [0.2, 0.7], [0.19, 0.84], [0.1, 0.92], [0.05, 0.94], [0.07, 0.99], [0, 1]],
  dame:     [[0, 0], [0.35, 0], [0.37, 0.05], [0.27, 0.11], [0.16, 0.2], [0.12, 0.52], [0.2, 0.6], [0.13, 0.66], [0.22, 0.74], [0.24, 0.86], [0.17, 0.92], [0.2, 0.95], [0.05, 0.97], [0, 1]],
  roi:      [[0, 0], [0.36, 0], [0.38, 0.05], [0.28, 0.11], [0.16, 0.2], [0.12, 0.54], [0.2, 0.62], [0.13, 0.68], [0.22, 0.76], [0.24, 0.87], [0.16, 0.92], [0.09, 0.93], [0, 0.93]],
};
const HAUTEURS = { pion: 0.052, tour: 0.062, cavalier: 0.068, fou: 0.075, dame: 0.088, roi: 0.098 };
function piece(type, blanc) {
  const mat = blanc ? buis : ebene, h = HAUTEURS[type];
  const g = new THREE.Group();
  g.add(lathe(PROFILS[type], mat, h));
  if (type === 'roi') {
    g.add(boite(0.006, 0.026, 0.006, mat, 0, h * 0.93 + 0.013, 0));
    g.add(boite(0.018, 0.006, 0.006, mat, 0, h * 0.93 + 0.017, 0));
  }
  if (type === 'dame') {
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; const b = new THREE.Mesh(new THREE.SphereGeometry(0.0035, 8, 8), mat); b.position.set(Math.cos(a) * h * 0.17, h * 0.93, Math.sin(a) * h * 0.17); g.add(b); }
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.005, 10, 10), mat); s.position.y = h * 1.0; g.add(s);
  }
  if (type === 'fou') { const s = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 10, 10), mat); s.position.y = h * 1.02; g.add(s); }
  if (type === 'cavalier') {
    const tete = new THREE.Group();
    const cou = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.013, 0.03, 12), mat); cou.position.y = 0.015; cou.rotation.x = -0.35; tete.add(cou);
    const cr = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 10), mat); cr.scale.set(0.8, 0.85, 1.5); cr.position.set(0, 0.034, 0.008); tete.add(cr);
    const mus = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.018), mat); mus.position.set(0, 0.03, 0.025); tete.add(mus);
    [-0.005, 0.005].forEach(x => { const o = new THREE.Mesh(new THREE.ConeGeometry(0.003, 0.009, 6), mat); o.position.set(x, 0.048, 0.002); tete.add(o); });
    tete.position.y = h * 0.48; tete.rotation.y = blanc ? 0 : Math.PI;
    tete.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    g.add(tete);
  }
  return g;
}
const RANGEE = ['tour', 'cavalier', 'fou', 'dame', 'roi', 'fou', 'cavalier', 'tour'];
for (let i = 0; i < 8; i++) {
  const x = -TAILLE_ECH / 2 + CASE / 2 + i * CASE;
  const ajoute = (type, blanc, rang) => { const p = piece(type, blanc); p.position.set(x, 0.02, -TAILLE_ECH / 2 + CASE / 2 + rang * CASE); echecs.add(p); };
  ajoute(RANGEE[i], false, 0); ajoute('pion', false, 1); ajoute('pion', true, 6); ajoute(RANGEE[i], true, 7);
}
echecs.position.set(-0.52, TABLE_Y, -0.06); echecs.rotation.y = 0.12;
scene.add(echecs);

/* ------------------------------------------------------------------ */
/* Le backgammon                                                        */
/* ------------------------------------------------------------------ */
const bg = new THREE.Group();
const BG_L = 0.58, BG_P = 0.44, BORD = 0.03, BARRE = 0.045;
const demi = (BG_L - 2 * BORD - BARRE) / 2;         // largeur d'une moitié de plateau
const FLECHE = demi / 6, LONG_FLECHE = (BG_P - 2 * BORD) * 0.42;
{
  // surface de jeu : flèches peintes dans le bois
  const c = document.createElement('canvas'); c.width = 2048; c.height = Math.round(2048 * BG_P / BG_L); const ctx = c.getContext('2d');
  const px = 2048 / BG_L;
  grainBois(ctx, c.width, c.height, '#c9ad7f', '#a8895a', 500);
  const clair = '#e8d7b3', sombre = '#5b3a22';
  for (let m = 0; m < 2; m++) for (let i = 0; i < 6; i++) {
    const x0 = (BORD + m * (demi + BARRE) + i * FLECHE) * px, x1 = x0 + FLECHE * px, xm = (x0 + x1) / 2;
    const yh = BORD * px, yb = (BG_P - BORD) * px, lf = LONG_FLECHE * px;
    // flèches du haut
    ctx.fillStyle = (i + m) % 2 === 0 ? sombre : clair; ctx.beginPath(); ctx.moveTo(x0, yh); ctx.lineTo(x1, yh); ctx.lineTo(xm, yh + lf); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 2; ctx.stroke();
    // flèches du bas
    ctx.fillStyle = (i + m) % 2 === 0 ? clair : sombre; ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.lineTo(xm, yb - lf); ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  // barre centrale et bords
  ctx.save(); ctx.translate((BORD + demi) * px, 0); grainBois(ctx, BARRE * px, c.height, '#4a3020', '#2d1b10', 120); ctx.restore();
  ctx.strokeStyle = 'rgba(0,0,0,.4)'; ctx.lineWidth = 6; ctx.strokeRect(BORD * px, BORD * px, (BG_L - 2 * BORD) * px, (BG_P - 2 * BORD) * px);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso;
  const surf = new THREE.Mesh(new THREE.BoxGeometry(BG_L - 2 * BORD + 0.002, 0.008, BG_P - 2 * BORD + 0.002), [bois(0x3a2618), bois(0x3a2618), new THREE.MeshStandardMaterial({ map: t, roughness: 0.4 }), bois(0x3a2618), bois(0x3a2618), bois(0x3a2618)]);
  surf.position.y = 0.012; surf.receiveShadow = true; bg.add(surf);
  const noyer = pbr('noyer', 1.2, 0.9, { roughness: 0.38 });
  bg.add(boite(BG_L, 0.008, BG_P, noyer, 0, 0.004, 0));                       // fond
  bg.add(boite(BG_L, 0.028, BORD, noyer, 0, 0.018, -BG_P / 2 + BORD / 2));    // rebords
  bg.add(boite(BG_L, 0.028, BORD, noyer, 0, 0.018, BG_P / 2 - BORD / 2));
  bg.add(boite(BORD, 0.028, BG_P, noyer, -BG_L / 2 + BORD / 2, 0.018, 0));
  bg.add(boite(BORD, 0.028, BG_P, noyer, BG_L / 2 - BORD / 2, 0.018, 0));
  bg.add(boite(BARRE, 0.028, BG_P - 2 * BORD, noyer, 0, 0.018, 0));           // barre
  [-0.16, 0.16].forEach(z => bg.add(boite(0.05, 0.006, 0.02, laiton, 0, 0.033, z)));   // charnières
}
const ivoire = new THREE.MeshStandardMaterial({ color: 0xf0e4cc, roughness: 0.3 });
const brun = new THREE.MeshStandardMaterial({ color: 0x3b2417, roughness: 0.3 });
const pionGeo = new THREE.CylinderGeometry(0.019, 0.019, 0.0095, 40);
function pionBg(blanc) { const m = new THREE.Mesh(pionGeo, blanc ? ivoire : brun); m.castShadow = true; m.receiveShadow = true; return m; }
// position de départ ; les flèches sont numérotées du point de vue du joueur (1 = en bas à droite)
const DEPART = { 24: [2, true], 13: [5, true], 8: [3, true], 6: [5, true], 1: [2, false], 12: [5, false], 17: [3, false], 19: [5, false] };
function posFleche(n) {
  // 1..12 : rangée du bas (côté joueur, z > 0), de droite à gauche ; 13..24 : rangée du haut, de gauche à droite
  const bas = n <= 12, k = bas ? 12 - n : n - 13;          // 0..11 de gauche à droite
  const m = k < 6 ? 0 : 1, i = k % 6;
  const x = -BG_L / 2 + BORD + m * (demi + BARRE) + i * FLECHE + FLECHE / 2;
  const z0 = bas ? BG_P / 2 - BORD - 0.021 : -BG_P / 2 + BORD + 0.021;
  return { x, z0, dir: bas ? -1 : 1 };
}
Object.entries(DEPART).forEach(([n, [nb, blanc]]) => {
  const p = posFleche(+n);
  for (let i = 0; i < nb; i++) {
    const pm = pionBg(blanc);
    const rang = i % 5, etage = Math.floor(i / 5);
    pm.position.set(p.x, 0.016 + 0.0048 + etage * 0.0097, p.z0 + p.dir * rang * 0.039);
    bg.add(pm);
  }
});
// dés, gobelets et videau
function faceDe(n, fond, point) {
  const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
  ctx.fillStyle = fond; ctx.fillRect(0, 0, 128, 128);
  const pos = { 1: [[64, 64]], 2: [[36, 36], [92, 92]], 3: [[36, 36], [64, 64], [92, 92]], 4: [[36, 36], [92, 36], [36, 92], [92, 92]], 5: [[36, 36], [92, 36], [64, 64], [36, 92], [92, 92]], 6: [[36, 30], [92, 30], [36, 64], [92, 64], [36, 98], [92, 98]] }[n];
  ctx.fillStyle = point; pos.forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function de(x, z, rot, fond = '#f4ecd8', point = '#1a1210', taille = 0.016) {
  const mats = [1, 6, 2, 5, 3, 4].map(n => new THREE.MeshStandardMaterial({ map: faceDe(n, fond, point), roughness: 0.25 }));
  const m = new THREE.Mesh(new THREE.BoxGeometry(taille, taille, taille), mats);
  m.position.set(x, 0.016 + taille / 2, z); m.rotation.y = rot; m.castShadow = true; return m;
}
bg.add(de(-0.11, 0.03, 0.4)); bg.add(de(-0.075, 0.06, -0.7));
bg.add(de(0.12, -0.04, 0.9, '#2a1811', '#f4ecd8')); bg.add(de(0.155, -0.075, -0.3, '#2a1811', '#f4ecd8'));
{ // videau
  const faces = [2, 32, 4, 16, 8, 64].map(n => { const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d'); ctx.fillStyle = '#efe3c8'; ctx.fillRect(0, 0, 128, 128); ctx.fillStyle = '#1a1210'; ctx.font = 'bold 64px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(n), 64, 68); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.3 }); });
  const v = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.024, 0.024), faces); v.position.set(0, 0.016 + 0.012, 0); v.castShadow = true; bg.add(v);
}
function gobelet(x, z) {
  const g = new THREE.Group();
  const cuir = pbr('cuir', 1, 1, { roughness: 0.75, normal: 0.8 });
  const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.032, 0.085, 28, 1, true), cuir); corps.material.side = THREE.DoubleSide; corps.position.y = 0.0425; corps.castShadow = true; g.add(corps);
  const fond = new THREE.Mesh(new THREE.CircleGeometry(0.032, 28), cuir); fond.rotation.x = -Math.PI / 2; fond.position.y = 0.001; g.add(fond);
  const lisere = new THREE.Mesh(new THREE.TorusGeometry(0.036, 0.003, 8, 32), laiton); lisere.rotation.x = Math.PI / 2; lisere.position.y = 0.085; g.add(lisere);
  g.position.set(x, 0, z); return g;
}
bg.add(gobelet(BG_L / 2 + 0.07, 0.1)); bg.add(gobelet(-BG_L / 2 - 0.07, -0.1));
bg.position.set(0.36, TABLE_Y, -0.1); bg.rotation.y = -0.06;
scene.add(bg);

/* ------------------------------------------------------------------ */
/* Le livre des règles : typographie sur canvas                          */
/* ------------------------------------------------------------------ */
const PW = 1024, PH = 1366, MARGE = 96;
const SERIF = 'Georgia, "Times New Roman", serif';
const ENCRE = '#2b1f16', OR = '#8a6d33', ROUGE = '#7a2a1e';

function papier(ctx) {
  const g = ctx.createLinearGradient(0, 0, PW, 0);
  g.addColorStop(0, '#f1e7d2'); g.addColorStop(0.5, '#f7efdc'); g.addColorStop(1, '#efe4cc');
  ctx.fillStyle = g; ctx.fillRect(0, 0, PW, PH);
  for (let i = 0; i < 1400; i++) { ctx.fillStyle = `rgba(120,90,50,${Math.random() * 0.06})`; ctx.fillRect(Math.random() * PW, Math.random() * PH, 1 + Math.random() * 2, 1 + Math.random() * 2); }
  const v = ctx.createRadialGradient(PW / 2, PH / 2, PH * 0.35, PW / 2, PH / 2, PH * 0.85);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(60,40,20,.16)');
  ctx.fillStyle = v; ctx.fillRect(0, 0, PW, PH);
}
function lignes(ctx, texte, largeur) {
  const mots = texte.split(' '), out = []; let l = '';
  for (const m of mots) { const t = l ? l + ' ' + m : m; if (ctx.measureText(t).width > largeur && l) { out.push(l); l = m; } else l = t; }
  if (l) out.push(l); return out;
}
function paragraphe(ctx, texte, x, y, largeur, taille, interligne, couleur = ENCRE, poids = '', justifie = true) {
  ctx.font = `${poids} ${taille}px ${SERIF}`; ctx.fillStyle = couleur; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  const ls = lignes(ctx, texte, largeur);
  ls.forEach((l, i) => {
    const derniere = i === ls.length - 1;
    if (justifie && !derniere && l.includes(' ')) {
      const mots = l.split(' '), lm = mots.reduce((s, m) => s + ctx.measureText(m).width, 0), esp = (largeur - lm) / (mots.length - 1);
      let cx = x; mots.forEach(m => { ctx.fillText(m, cx, y); cx += ctx.measureText(m).width + esp; });
    } else ctx.fillText(l, x, y);
    y += interligne;
  });
  return y;
}
function fleuron(ctx, x, y, w) {
  ctx.strokeStyle = OR; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w * 0.42, y); ctx.moveTo(x + w * 0.58, y); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.fillStyle = OR; ctx.font = `28px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText('❦', x + w / 2, y + 10); ctx.textAlign = 'left';
}
/* Schéma du plateau. position = { fleche: [nombre, blanc] } ; barre = [nbBlancs, nbNoirs] */
function schema(ctx, x, y, w, position, opts = {}) {
  const h = w * 0.6, bord = w * 0.035, barre = w * 0.07, demiL = (w - 2 * bord - barre) / 2, fl = demiL / 6, lf = (h - 2 * bord) * 0.42;
  ctx.save();
  ctx.fillStyle = '#5a3a24'; ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#c9ad7f'; ctx.fillRect(x + bord, y + bord, w - 2 * bord, h - 2 * bord);
  ctx.fillStyle = '#4a3020'; ctx.fillRect(x + bord + demiL, y + bord, barre, h - 2 * bord);
  const posF = n => { const bas = n <= 12, k = bas ? 12 - n : n - 13, m = k < 6 ? 0 : 1, i = k % 6; return { cx: x + bord + m * (demiL + barre) + i * fl + fl / 2, bas }; };
  for (let n = 1; n <= 24; n++) {
    const { cx, bas } = posF(n), x0 = cx - fl / 2, x1 = cx + fl / 2;
    const sombre = (n % 2 === 0) !== bas;
    ctx.fillStyle = sombre ? '#5b3a22' : '#e8d7b3';
    if (opts.surligne && opts.surligne.includes(n)) ctx.fillStyle = '#c9a961';
    ctx.beginPath();
    if (bas) { ctx.moveTo(x0, y + h - bord); ctx.lineTo(x1, y + h - bord); ctx.lineTo(cx, y + h - bord - lf); }
    else { ctx.moveTo(x0, y + bord); ctx.lineTo(x1, y + bord); ctx.lineTo(cx, y + bord + lf); }
    ctx.closePath(); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,.3)'; ctx.lineWidth = 1; ctx.stroke();
    // numéro
    ctx.fillStyle = '#f7efdc'; ctx.font = `bold ${Math.round(fl * 0.36)}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(String(n), cx, bas ? y + h - bord / 2 : y + bord / 2);
  }
  const r = fl * 0.42;
  const pion = (cx, cy, blanc) => { ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fillStyle = blanc ? '#f0e4cc' : '#3b2417'; ctx.fill(); ctx.strokeStyle = blanc ? '#8a7a5a' : '#120a06'; ctx.lineWidth = 2; ctx.stroke(); };
  Object.entries(position || {}).forEach(([n, [nb, blanc]]) => {
    const { cx, bas } = posF(+n);
    for (let i = 0; i < Math.min(nb, 5); i++) pion(cx, bas ? y + h - bord - r - i * 2 * r : y + bord + r + i * 2 * r, blanc);
    if (nb > 5) { ctx.fillStyle = blanc ? '#3b2417' : '#f0e4cc'; ctx.font = `bold ${Math.round(r * 1.1)}px ${SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(nb), cx, bas ? y + h - bord - r - 8 * r : y + bord + r + 8 * r); }
  });
  if (opts.barre) { const [nbB, nbN] = opts.barre; for (let i = 0; i < nbB; i++) pion(x + w / 2, y + h / 2 + r + i * 2 * r, true); for (let i = 0; i < nbN; i++) pion(x + w / 2, y + h / 2 - r - i * 2 * r, false); }
  if (opts.fleche) { // flèche de déplacement [de, vers]
    const a = posF(opts.fleche[0]), b = posF(opts.fleche[1]);
    const ay = a.bas ? y + h - bord - lf - r : y + bord + lf + r, by = b.bas ? y + h - bord - lf - r : y + bord + lf + r;
    ctx.strokeStyle = ROUGE; ctx.fillStyle = ROUGE; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(a.cx, ay);
    ctx.quadraticCurveTo((a.cx + b.cx) / 2, (ay + by) / 2 - (a.bas ? 60 : -60), b.cx, by); ctx.stroke();
    ctx.beginPath(); ctx.arc(b.cx, by, 7, 0, 7); ctx.fill();
  }
  let finLegende = 0;
  if (opts.legende) { ctx.textBaseline = 'alphabetic'; finLegende = paragraphe(ctx, opts.legende, x, y + h + 34, w, 22, 28, '#5a4a3a', 'italic', false) + 22; }
  ctx.restore();
  return opts.legende ? finLegende : y + h + 30;
}
function de2D(ctx, x, y, s, n) {
  ctx.fillStyle = '#f4ecd8'; ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, s, s, s * 0.16); ctx.fill(); ctx.stroke();
  const p = { 1: [[.5, .5]], 2: [[.28, .28], [.72, .72]], 3: [[.28, .28], [.5, .5], [.72, .72]], 4: [[.28, .28], [.72, .28], [.28, .72], [.72, .72]], 5: [[.28, .28], [.72, .28], [.5, .5], [.28, .72], [.72, .72]], 6: [[.28, .25], [.72, .25], [.28, .5], [.72, .5], [.28, .75], [.72, .75]] }[n];
  ctx.fillStyle = '#1a1210'; p.forEach(([a, b]) => { ctx.beginPath(); ctx.arc(x + a * s, y + b * s, s * 0.085, 0, 7); ctx.fill(); });
}

/* Rendu d'une page à partir d'une description */
function rendrePage(spec, numero) {
  const c = document.createElement('canvas'); c.width = PW; c.height = PH; const ctx = c.getContext('2d');
  papier(ctx);
  const W = PW - 2 * MARGE;
  if (spec.type === 'garde') {
    // papier marbré « peigné », discret
    const teintes = ['#7a3b34', '#3b4a63', '#8a6d33', '#5a4a3a', '#c9a961'];
    for (let i = 0; i < 90; i++) {
      ctx.strokeStyle = teintes[i % 5]; ctx.globalAlpha = 0.16 + Math.random() * 0.14; ctx.lineWidth = 6 + Math.random() * 22; ctx.lineCap = 'round';
      const y0 = (i / 90) * PH + (Math.random() - 0.5) * 30, amp = 18 + Math.random() * 26, freq = 0.006 + Math.random() * 0.006, ph = Math.random() * 7;
      ctx.beginPath(); ctx.moveTo(0, y0);
      for (let xx = 0; xx <= PW; xx += 12) ctx.lineTo(xx, y0 + Math.sin(xx * freq + ph) * amp + Math.sin(xx * 0.03 + ph * 2) * 5);
      ctx.stroke();
    }
    // veines fines
    for (let i = 0; i < 40; i++) { ctx.strokeStyle = '#3a2e22'; ctx.globalAlpha = 0.12; ctx.lineWidth = 1.2; ctx.beginPath(); let yy = Math.random() * PH; ctx.moveTo(0, yy); for (let xx = 0; xx <= PW; xx += 30) { yy += (Math.random() - 0.5) * 24; ctx.lineTo(xx, yy); } ctx.stroke(); }
    ctx.globalAlpha = 1;
    if (spec.exlibris) { ctx.fillStyle = 'rgba(247,239,220,.92)'; ctx.fillRect(PW / 2 - 230, PH / 2 - 150, 460, 300); ctx.strokeStyle = OR; ctx.lineWidth = 3; ctx.strokeRect(PW / 2 - 214, PH / 2 - 134, 428, 268); ctx.fillStyle = ENCRE; ctx.textAlign = 'center'; ctx.font = `italic 30px ${SERIF}`; ctx.fillText('Ex libris', PW / 2, PH / 2 - 60); ctx.font = `bold 44px ${SERIF}`; ctx.fillText('Maison Philidor', PW / 2, PH / 2 + 4); ctx.font = `24px ${SERIF}`; ctx.fillStyle = OR; ctx.fillText('Paris · Jeux de tradition depuis toujours', PW / 2, PH / 2 + 58); ctx.fillText('❦', PW / 2, PH / 2 + 108); }
    return c;
  }
  if (spec.type === 'titre') {
    ctx.strokeStyle = OR; ctx.lineWidth = 3; ctx.strokeRect(60, 60, PW - 120, PH - 120); ctx.lineWidth = 1; ctx.strokeRect(76, 76, PW - 152, PH - 152);
    ctx.textAlign = 'center'; ctx.fillStyle = OR; ctx.font = `28px ${SERIF}`; ctx.fillText('M A I S O N   P H I L I D O R', PW / 2, 300);
    ctx.fillStyle = ENCRE; ctx.font = `bold 104px ${SERIF}`; ctx.fillText('Le', PW / 2, 470); ctx.fillText('Backgammon', PW / 2, 590);
    fleuron(ctx, PW / 2 - 200, 660, 400);
    ctx.font = `italic 34px ${SERIF}`; ctx.fillStyle = ENCRE; ctx.fillText('Règles du jeu, matériel & conseils', PW / 2, 750);
    ctx.font = `26px ${SERIF}`; ctx.fillStyle = '#5a4a3a'; paragraphe(ctx, spec.sous, MARGE + 60, 850, W - 120, 26, 36, '#5a4a3a', 'italic', false);
    ctx.textAlign = 'center'; ctx.font = `24px ${SERIF}`; ctx.fillStyle = OR; ctx.fillText('Paris — Café de la Régence', PW / 2, PH - 200); ctx.fillText('M · DCC · L', PW / 2, PH - 160);
    return c;
  }
  // page courante : en-tête, titre de chapitre, blocs
  ctx.fillStyle = OR; ctx.font = `italic 22px ${SERIF}`; ctx.textAlign = numero % 2 ? 'right' : 'left';
  ctx.fillText(numero % 2 ? 'Règles du jeu' : 'Le Backgammon — Maison Philidor', numero % 2 ? PW - MARGE : MARGE, 62);
  ctx.strokeStyle = OR; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(MARGE, 76); ctx.lineTo(PW - MARGE, 76); ctx.stroke();
  let y = 150;
  if (spec.chapitre) { ctx.fillStyle = OR; ctx.font = `26px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillText(spec.chapitre.toUpperCase().split('').join(' '), MARGE, y); y += 58; }
  if (spec.titre) { ctx.fillStyle = ENCRE; ctx.font = `bold 54px ${SERIF}`; ctx.textAlign = 'left'; lignes(ctx, spec.titre, W).forEach(l => { ctx.fillText(l, MARGE, y); y += 62; }); y += 8; fleuron(ctx, MARGE, y, 260); y += 52; }
  let premier = true;
  for (const b of spec.blocs || []) {
    if (b.h) { y += 14; ctx.fillStyle = ROUGE; ctx.font = `bold 32px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillText(b.h, MARGE, y); y += 46; premier = false; }
    if (b.p) {
      if (premier && spec.titre) {
        // lettrine
        const lettre = b.p[0], reste = b.p.slice(1);
        ctx.fillStyle = OR; ctx.font = `bold 110px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillText(lettre, MARGE, y + 68);
        const lw = ctx.measureText(lettre).width + 14;
        ctx.font = `27px ${SERIF}`; ctx.fillStyle = ENCRE;
        const ls = lignes(ctx, reste, W - lw);
        let yy = y; ls.slice(0, 3).forEach(l => { ctx.fillText(l, MARGE + lw, yy); yy += 38; });
        const suite = ls.slice(3).join(' ');
        y = suite ? paragraphe(ctx, suite, MARGE, yy, W, 27, 38) : yy;
        premier = false;
      } else y = paragraphe(ctx, b.p, MARGE, y, W, 27, 38);
      y += 16;
    }
    if (b.ul) { for (const it of b.ul) { ctx.fillStyle = OR; ctx.font = `27px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillText('❧', MARGE + 6, y); y = paragraphe(ctx, it, MARGE + 46, y, W - 46, 27, 38, ENCRE, '', false); y += 6; } y += 12; }
    if (b.note) { ctx.fillStyle = '#efe3c8'; const hh = 36 * (lignes((ctx.font = `italic 24px ${SERIF}`, ctx), b.note, W - 60).length) + 40; ctx.fillRect(MARGE, y - 30, W, hh); ctx.fillStyle = OR; ctx.fillRect(MARGE, y - 30, 6, hh); y = paragraphe(ctx, b.note, MARGE + 30, y + 4, W - 60, 24, 36, '#4a3a2a', 'italic', false); y += 30; }
    if (b.schema) { const w2 = b.schema.petit ? W * 0.72 : W; y = schema(ctx, MARGE + (W - w2) / 2, y, w2, b.schema.pos, b.schema); }
    if (b.des) { let x = MARGE; b.des.forEach(n => { de2D(ctx, x, y - 10, 70, n); x += 90; }); ctx.fillStyle = '#5a4a3a'; ctx.font = `italic 24px ${SERIF}`; ctx.textAlign = 'left'; ctx.fillText(b.legende || '', x + 10, y + 36); y += 100; }
  }
  // folio
  ctx.fillStyle = OR; ctx.font = `24px ${SERIF}`; ctx.textAlign = 'center'; ctx.fillText(String(numero), PW / 2, PH - 60);
  return c;
}

/* ------------------------------------------------------------------ */
/* Le texte des règles                                                  */
/* ------------------------------------------------------------------ */
const DEPART_SCHEMA = { 24: [2, true], 13: [5, true], 8: [3, true], 6: [5, true], 1: [2, false], 12: [5, false], 17: [3, false], 19: [5, false] };
const PAGES = [
  { type: 'garde', exlibris: true },
  { type: 'titre', sous: 'Un jeu de course et de blocage vieux de cinq mille ans, où la chance des dés se plie à la décision du joueur. Ce livre vous apprend tout ce qu’il faut savoir pour vous asseoir à la table : le matériel, la mise en place, le déplacement des pions, la sortie et le cube de doublement.' },
  { chapitre: 'Chapitre I', titre: 'Un peu d’histoire', blocs: [
    { p: 'Le backgammon descend des jeux de tables joués en Mésopotamie il y a près de cinq mille ans. Les Romains y jouaient sous le nom de duodecim scripta, puis de tabula ; au Moyen Âge, toute l’Europe pratique les « tables ». La France en garde une variante savante, le trictrac, qui fait fureur dans les salons du XVIIIe siècle — au moment même où Philidor règne sur l’échiquier du Café de la Régence.' },
    { p: 'Le nom anglais backgammon apparaît vers 1645. Les règles modernes se fixent en 1931 aux États-Unis, avec l’ajout décisif du cube de doublement, qui transforme un jeu de hasard en jeu de décisions. Aujourd’hui, le backgammon se joue partout : dans les cafés d’Istanbul comme en tournoi international, avec les mêmes quinze pions et les mêmes deux dés.' },
    { note: 'Ce que vous allez apprendre : le matériel et la mise en place, le but du jeu, le déplacement des pions, les coups particuliers (frapper, rentrer, sortir), le cube de doublement et quelques principes de stratégie pour bien débuter.' },
  ] },
  { chapitre: 'Chapitre II', titre: 'Le matériel', blocs: [
    { p: 'Le plateau se compose de vingt-quatre flèches (ou pointes) réparties en quatre quadrants de six flèches : le jan intérieur et le jan extérieur de chaque joueur. Une barre centrale sépare les deux moitiés ; c’est là que sont posés les pions frappés.' },
    { schema: { pos: {}, legende: 'Les 24 flèches, vues du joueur assis en bas : jan intérieur de 1 à 6, jan extérieur de 7 à 12.' } },
    { ul: ['Quinze pions par joueur, d’une couleur chacun.', 'Deux dés par joueur et, de préférence, un gobelet chacun.', 'Un videau, le cube de doublement (faces 2, 4, 8, 16, 32, 64).'] },
  ] },
  { chapitre: 'Chapitre III', titre: 'La mise en place', blocs: [
    { p: 'Chaque joueur dispose ses quinze pions ainsi : deux sur la flèche 24, cinq sur la 13, trois sur la 8 et cinq sur la 6. Les pions adverses occupent les positions symétriques. Les flèches sont numérotées dans le sens de la marche de chaque joueur : la 24 est la plus éloignée de son jan intérieur, la 1 la plus proche.' },
    { schema: { pos: DEPART_SCHEMA, legende: 'Position de départ. Les pions clairs (en bas) avancent des flèches hautes vers leur jan intérieur, en bas à droite. Les pions sombres font le trajet inverse.' } },
    { note: 'Retenez la formule 2 · 5 · 3 · 5 : deux pions au fond du camp adverse, cinq au milieu, trois et cinq dans son propre camp.' },
  ] },
  { chapitre: 'Chapitre IV', titre: 'Le but du jeu', blocs: [
    { p: 'Chaque joueur fait le tour du plateau dans un sens opposé à celui de l’adversaire, pour ramener ses quinze pions dans son jan intérieur, puis les sortir du plateau. Le premier à avoir sorti tous ses pions gagne la partie.' },
    { p: 'Les pions clairs se déplacent en fer à cheval, des flèches 24 vers la flèche 1 : ils descendent le long du camp adverse, traversent la barre par le haut, puis reviennent vers leur jan intérieur. Les pions sombres suivent le chemin inverse. Les deux armées se croisent donc sans cesse — c’est là que naissent les blocages et les frappes.' },
    { schema: { pos: { 13: [5, true], 6: [5, true] }, fleche: [13, 6], legende: 'Le sens de la marche des pions clairs : du jan extérieur adverse vers leur propre jan intérieur.' } },
  ] },
  { chapitre: 'Chapitre V', titre: 'Lancer les dés et déplacer ses pions', blocs: [
    { h: 'Qui commence ?' },
    { p: 'Chaque joueur lance un dé. Le plus fort commence et joue avec les deux dés déjà tombés. En cas d’égalité, on relance. Ensuite, chacun à son tour lance ses deux dés, dans la moitié droite du plateau.' },
    { h: 'Le déplacement' },
    { p: 'Chaque dé indique le nombre de flèches dont un pion avance. On peut déplacer deux pions différents, ou le même pion deux fois — à condition que la flèche intermédiaire soit ouverte. Un dé qui affiche 4 et un dé qui affiche 2 permettent donc de jouer 4 puis 2, 2 puis 4, ou 4 + 2 = 6 avec un seul pion.' },
    { des: [4, 2], legende: 'Un 4 et un 2 : deux mouvements, ou un seul de six flèches.' },
    { h: 'Les doubles' },
    { p: 'Quand les deux dés montrent la même valeur, le joueur la joue quatre fois. Un double 5 permet ainsi quatre déplacements de cinq flèches, répartis comme on l’entend.' },
    { des: [5, 5], legende: 'Un double 5 : quatre déplacements de cinq flèches.' },
  ] },
  { chapitre: 'Chapitre V', titre: 'Flèches ouvertes, flèches fermées', blocs: [
    { p: 'Un pion ne peut se poser que sur une flèche ouverte : vide, occupée par ses propres pions, ou occupée par un seul pion adverse. Une flèche tenue par deux pions adverses ou plus est fermée : on ne peut ni s’y arrêter, ni s’en servir comme étape intermédiaire.' },
    { ul: ['On est obligé de jouer ses deux dés si c’est possible.', 'Si un seul des deux dés peut être joué, on doit jouer le plus grand des deux quand on a le choix.', 'Si aucun mouvement n’est possible, on passe son tour.', 'Il n’y a pas de limite au nombre de pions sur une même flèche.'] },
    { note: 'Six flèches consécutives tenues par vos pions forment un prime : aucun pion adverse situé derrière ne peut plus passer. C’est l’arme la plus forte du jeu.' },
  ] },
  { chapitre: 'Chapitre VI', titre: 'Frapper et rentrer', blocs: [
    { p: 'Un pion seul sur une flèche est un blot. Si un pion adverse se pose dessus, il est frappé : on le retire du plateau et on le place sur la barre. Son propriétaire devra le faire rentrer avant de pouvoir jouer quoi que ce soit d’autre.' },
    { schema: { petit: true, pos: { 8: [1, true], 12: [5, false], 6: [5, true] }, surligne: [8], fleche: [12, 8], legende: 'Le pion clair seul sur la flèche 8 est un blot : un pion sombre venant de la 12 avec un 4 le frappe et l’envoie sur la barre.' } },
    { h: 'Rentrer un pion' },
    { p: 'Pour rentrer, on lance les dés normalement et l’on pose le pion dans le jan intérieur adverse, sur la flèche dont le numéro correspond au dé (compté depuis le fond). Si les deux flèches indiquées sont fermées, on perd son tour. Tant qu’un pion reste sur la barre, aucun autre pion ne peut bouger.' },
    { note: 'Un pion clair frappé rentre dans le jan intérieur sombre, sur les flèches 19 à 24 ; un pion sombre rentre sur les flèches 1 à 6.' },
  ] },
  { chapitre: 'Chapitre VII', titre: 'La sortie des pions', blocs: [
    { p: 'Dès que les quinze pions d’un joueur sont réunis dans son jan intérieur, il peut commencer à les sortir. Chaque dé permet de sortir un pion situé sur la flèche correspondante : un 5 sort un pion de la flèche 5.' },
    { ul: ['Si la flèche indiquée est vide, on doit d’abord déplacer un pion situé sur une flèche plus haute.', 'S’il n’y a plus aucun pion sur une flèche plus haute, on sort un pion de la flèche la plus élevée encore occupée.', 'Un pion frappé pendant la sortie doit rentrer et refaire tout le tour avant que la sortie ne reprenne.'] },
    { schema: { petit: true, pos: { 1: [3, true], 2: [3, true], 3: [2, true], 4: [3, true], 5: [2, true], 6: [2, true] }, legende: 'Les quinze pions clairs sont dans le jan intérieur : la sortie peut commencer.' } },
    { note: 'La sortie est une course : comptez vos pips pour savoir si vous êtes devant ou derrière.' },
  ] },
  { chapitre: 'Chapitre VIII', titre: 'Gagner simple, gammon ou backgammon', blocs: [
    { p: 'La partie vaut un point lorsque le perdant a sorti au moins un pion. Elle vaut le double — un gammon — si le perdant n’a sorti aucun pion. Elle vaut le triple — un backgammon — si, en plus, le perdant a encore un pion sur la barre ou dans le jan intérieur du vainqueur.' },
    { ul: ['Victoire simple : 1 point.', 'Gammon : 2 points (l’adversaire n’a rien sorti).', 'Backgammon : 3 points (l’adversaire a encore un pion chez vous ou sur la barre).'] },
    { p: 'Ces multiplicateurs se combinent avec la valeur du cube de doublement : un gammon avec le cube sur 4 rapporte huit points. C’est ce qui donne au jeu son sel — et parfois ses vertiges.' },
  ] },
  { chapitre: 'Chapitre IX', titre: 'Le videau, ou cube de doublement', blocs: [
    { p: 'Au début, le cube est posé sur la barre, face 64 vers le haut, ce qui signifie « un ». À son tour, avant de lancer les dés, un joueur qui pense être en avantage peut proposer de doubler l’enjeu : il tourne le cube sur 2 et le pousse vers l’adversaire.' },
    { ul: ['L’adversaire accepte : la partie vaut désormais deux fois plus, et il devient seul propriétaire du cube — lui seul pourra redoubler, sur 4, puis 8…', 'L’adversaire refuse : il abandonne et perd la partie à sa valeur actuelle.', 'On ne peut doubler qu’avant de lancer ses dés, et jamais deux fois de suite sans que l’adversaire ait redoublé.'] },
    { note: 'Règle de Crawford, en match : lorsqu’un joueur n’est plus qu’à un point de la victoire, le cube est interdit pendant la partie suivante, puis redevient libre.' },
    { p: 'Bien doubler est tout l’art du backgammon. En règle générale, on double lorsqu’on estime ses chances de gagner à un peu plus de deux sur trois, et l’on accepte un double tant que l’on garde environ une chance sur quatre.' },
  ] },
  { chapitre: 'Chapitre X', titre: 'Conseils pour bien débuter', blocs: [
    { ul: ['Faites des points : deux pions sur une flèche ne peuvent pas être frappés. Visez en priorité vos flèches 5, 4 et 7.', 'Évitez de laisser des blots à portée des pions adverses, surtout dans votre jan intérieur.', 'Construisez un prime devant les pions adverses restés au fond de votre camp.', 'Ne courez pas trop tôt : sortez vos deux pions arrière quand la voie est libre, pas avant.', 'Comptez la course. Avec dix pips d’avance, foncez ; avec du retard, cherchez le contact.', 'Doublez avec audace, acceptez avec sang-froid : la plupart des doubles se prennent.'] },
    { h: 'L’étiquette de la table' },
    { p: 'On lance les dés dans le gobelet, dans la moitié droite du plateau ; un dé qui s’arrête de travers ou sur un pion est relancé. On termine son coup en ramassant ses dés. Et l’on se souhaite « bonne partie » — c’est ainsi qu’on jouait déjà au Café de la Régence.' },
  ] },
  { chapitre: 'Lexique', titre: 'Les mots du backgammon', blocs: [
    { ul: ['Flèche (ou pointe) : l’une des 24 cases triangulaires du plateau.', 'Jan intérieur : les six dernières flèches d’un joueur, où il rentre ses pions avant de les sortir.', 'Jan extérieur : les six flèches qui précèdent le jan intérieur.', 'Barre : la séparation centrale, où l’on pose les pions frappés.', 'Blot : un pion seul sur une flèche, exposé à la frappe.', 'Frapper : envoyer un pion adverse isolé sur la barre.', 'Prime : six flèches consécutives tenues, infranchissables.', 'Pip count : le nombre total de flèches restant à parcourir.', 'Videau : le cube de doublement.', 'Gammon, backgammon : victoire double, victoire triple.'] },
    { note: 'Toute la Maison Philidor vous souhaite de belles parties. Une question sur un plateau, une essence de bois ou une taille de pions ? Nous répondons avec plaisir.' },
  ] },
];
const pagesCanvas = PAGES.map((p, i) => rendrePage(p, i + 1));
if (pagesCanvas.length % 2) pagesCanvas.push(rendrePage({ type: 'garde' }, pagesCanvas.length + 1));
const NB_DOUBLES = pagesCanvas.length / 2;    // nombre de doubles pages
const texPage = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t; };
const texPages = pagesCanvas.map(texPage);
const gauche = i => texPages[2 * i], droite = i => texPages[2 * i + 1];

/* ------------------------------------------------------------------ */
/* Le livre en volume                                                   */
/* ------------------------------------------------------------------ */
const LW = 0.30, LH = 0.40, EP = 0.026, COUV = 0.008;
const livre = new THREE.Group();
const cuirLivre = pbr('cuir', 1.4, 1.8, { roughness: 0.6, normal: 0.9, color: 0x6a2b1e });
function couvertureTexture() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 1366; const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(0,0,0,0)'; ctx.clearRect(0, 0, 1024, 1366);
  ctx.strokeStyle = '#d9b86a'; ctx.lineWidth = 8; ctx.strokeRect(70, 70, 884, 1226); ctx.lineWidth = 3; ctx.strokeRect(96, 96, 832, 1174);
  ctx.fillStyle = '#d9b86a'; ctx.textAlign = 'center';
  ctx.font = `36px ${SERIF}`; ctx.fillText('M A I S O N   P H I L I D O R', 512, 300);
  ctx.font = `bold 120px ${SERIF}`; ctx.fillText('LE', 512, 560); ctx.fillText('BACKGAMMON', 512, 700);
  ctx.font = `italic 44px ${SERIF}`; ctx.fillText('Règles du jeu', 512, 820);
  ctx.font = `120px ${SERIF}`; ctx.fillText('❦', 512, 1060);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = aniso; return t;
}
const dorure = new THREE.MeshStandardMaterial({ map: couvertureTexture(), transparent: true, roughness: 0.3, metalness: 0.9, color: 0xffffff, depthWrite: false });
const tranche = new THREE.MeshStandardMaterial({ color: 0xe9dcc0, roughness: 0.9 });
{ // stries des tranches
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const ctx = c.getContext('2d'); ctx.fillStyle = '#e6d8bb'; ctx.fillRect(0, 0, 256, 64);
  for (let i = 0; i < 64; i += 2) { ctx.fillStyle = i % 4 ? '#d6c6a6' : '#efe3c8'; ctx.fillRect(0, i, 256, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1, 1); tranche.map = t; tranche.needsUpdate = true;
}
// dos (couverture arrière) et pile de droite, fixes
livre.add(boite(LW + 0.012, COUV, LH + 0.016, cuirLivre, LW / 2 + 0.006, COUV / 2, 0));
const pileDroite = boite(LW, EP, LH, tranche, LW / 2, COUV + EP / 2, 0);
livre.add(pileDroite);
const pageDroite = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), new THREE.MeshStandardMaterial({ map: droite(0), roughness: 0.85 }));
pageDroite.rotation.x = -Math.PI / 2; pageDroite.position.set(LW / 2, COUV + EP + 0.0004, 0); pageDroite.receiveShadow = true; livre.add(pageDroite);
// moitié gauche : pile + couverture avant, articulée sur la charnière (x = 0, y = sommet de la pile droite)
const charniere = new THREE.Group(); charniere.position.set(0, COUV + EP, 0); livre.add(charniere);
charniere.add(boite(LW, EP, LH, tranche, LW / 2, EP / 2, 0));
const couvAvant = boite(LW + 0.012, COUV, LH + 0.016, cuirLivre, LW / 2 + 0.006, EP + COUV / 2, 0);
charniere.add(couvAvant);
const titreCouv = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), dorure); titreCouv.rotation.x = -Math.PI / 2; titreCouv.position.set(LW / 2, EP + COUV + 0.0005, 0); charniere.add(titreCouv);
const pageGauche = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), new THREE.MeshStandardMaterial({ map: gauche(0), roughness: 0.85 }));
pageGauche.rotation.set(Math.PI / 2, 0, Math.PI); pageGauche.position.set(LW / 2, -0.0004, 0); charniere.add(pageGauche);   // face vers le bas, donc vers le haut une fois ouvert
// le dos arrondi
const dos = new THREE.Mesh(new THREE.CylinderGeometry(COUV + EP + 0.004, COUV + EP + 0.004, LH + 0.016, 24, 1, false, Math.PI / 2, Math.PI), cuirLivre);
dos.rotation.x = Math.PI / 2; dos.position.set(-0.002, COUV + EP, 0); livre.add(dos);
// la page qui tourne : deux faces
const pageTournante = new THREE.Group(); pageTournante.position.set(0, COUV + EP + 0.0008, 0); pageTournante.visible = false; livre.add(pageTournante);
const faceAvant = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), new THREE.MeshStandardMaterial({ map: droite(0), roughness: 0.85 })); faceAvant.rotation.x = -Math.PI / 2; faceAvant.position.x = LW / 2; pageTournante.add(faceAvant);
const faceArriere = new THREE.Mesh(new THREE.PlaneGeometry(LW, LH), new THREE.MeshStandardMaterial({ map: gauche(1), roughness: 0.85 })); faceArriere.rotation.set(Math.PI / 2, 0, Math.PI); faceArriere.position.set(LW / 2, -0.0002, 0); pageTournante.add(faceArriere);
livre.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.livre = true; } });
const LIVRE_FERME = new THREE.Vector3(-0.14, TABLE_Y, 0.30), LIVRE_OUVERT = new THREE.Vector3(0.0, TABLE_Y, 0.28);
livre.position.copy(LIVRE_FERME); livre.rotation.y = -0.06;
scene.add(livre);

/* ------------------------------------------------------------------ */
/* Petits interpolateurs                                                 */
/* ------------------------------------------------------------------ */
const tweens = [];
const easeInOut = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
function tween(duree, maj, ease = easeInOut, fin) {
  const tw = { t0: performance.now(), duree, maj, ease, fin };
  tweens.push(tw); return tw;
}
function majTweens(now) {
  for (let i = tweens.length - 1; i >= 0; i--) {
    const tw = tweens[i], k = Math.min(1, (now - tw.t0) / tw.duree);
    tw.maj(tw.ease(k));
    if (k >= 1) { tweens.splice(i, 1); tw.fin && tw.fin(); }
  }
}

/* ------------------------------------------------------------------ */
/* L'hôte : personnage assis en face                                    */
/* ------------------------------------------------------------------ */
let hote = null, os = {}, teteBase = null, dosBase = null;
/* Oriente un os pour que son enfant pointe dans la direction voulue (repère monde), en gardant sa torsion. */
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v = new THREE.Vector3();
function orienter(nom, x, y, z) {
  const o = os[nom]; if (!o) return;
  const enfant = o.children.find(c => c.isBone); if (!enfant) return;
  hote.updateMatrixWorld(true);
  o.getWorldQuaternion(_q1);
  const repos = enfant.position.clone().normalize().applyQuaternion(_q1);      // direction actuelle de l'os
  const delta = _q2.setFromUnitVectors(repos, _v.set(x, y, z).normalize());
  const monde = delta.multiply(_q1);                                            // nouvelle orientation monde
  o.parent.getWorldQuaternion(_q1);
  o.quaternion.copy(_q1.invert().multiply(monde));
}
new GLTFLoader(gestion).load(CFG.persona, gltf => {
  hote = gltf.scene;
  hote.traverse(o => {
    if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; if (o.material) { o.material.roughness = Math.min(0.95, (o.material.roughness ?? 0.7) + 0.1); o.material.envMapIntensity = 0.5; } }
    if (o.isBone) os[o.name.replace('mixamorig:', '').replace('mixamorig', '')] = o;
  });
  // taille normalisée à 1,72 m, le modèle regarde vers +z donc vers le joueur
  const b = new THREE.Box3().setFromObject(hote); hote.scale.setScalar(1.72 / (b.max.y - b.min.y));
  scene.add(hote); hote.updateMatrixWorld(true);
  // position assise : cuisses vers le joueur, mollets vers le sol, pieds à plat
  orienter('LeftUpLeg', 0.16, -0.1, 1); orienter('RightUpLeg', -0.16, -0.1, 1);
  orienter('LeftLeg', 0.04, -1, 0.06); orienter('RightLeg', -0.04, -1, 0.06);
  orienter('LeftFoot', 0, -0.3, 1); orienter('RightFoot', 0, -0.3, 1);
  // buste droit, à peine penché vers la table
  orienter('Spine', 0, 1, 0.1); orienter('Spine1', 0, 1, 0.08); orienter('Spine2', 0, 1, 0.04);
  orienter('Neck', 0, 1, 0.12); orienter('Head', 0, 1, 0.3);
  // bras posés sur la table, mains vers le plateau
  orienter('LeftArm', 0.3, -0.62, 0.72); orienter('RightArm', -0.3, -0.62, 0.72);
  orienter('LeftForeArm', -0.2, -0.42, 0.88); orienter('RightForeArm', 0.2, -0.42, 0.88);
  orienter('LeftHand', -0.25, -0.15, 1); orienter('RightHand', 0.25, -0.15, 1);
  teteBase = os.Head ? os.Head.rotation.clone() : null;
  dosBase = os.Spine1 ? os.Spine1.rotation.clone() : null;
  // on pose le bassin sur l'assise de la chaise
  hote.updateMatrixWorld(true);
  if (os.Hips) { const p = new THREE.Vector3(); os.Hips.getWorldPosition(p); hote.position.y += 0.6 - p.y; hote.position.x -= p.x; hote.position.z += -0.86 - p.z; }
});
function idleHote(t) {
  if (!hote) return;
  if (os.Spine1 && dosBase) os.Spine1.rotation.x = dosBase.x + Math.sin(t * 1.1) * 0.015;
  if (os.Head && teteBase) {
    // regarde le joueur, avec un peu de vie
    os.Head.rotation.x = teteBase.x + 0.04 + Math.sin(t * 0.7) * 0.03;
    os.Head.rotation.y = teteBase.y - regard.yaw * 0.25 + Math.sin(t * 0.43) * 0.05;
    os.Head.rotation.z = teteBase.z + Math.sin(t * 0.31) * 0.02;
  }
}

/* ------------------------------------------------------------------ */
/* Le voyage : tunnel de lumière puis arrivée dans le salon             */
/* ------------------------------------------------------------------ */
const voyage = new THREE.Group(); scene.add(voyage);
const anneaux = [];
for (let i = 0; i < 46; i++) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1.5 + Math.sin(i * 0.7) * 0.25, 0.025 + (i % 3) * 0.01, 8, 64), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xc9a961 : 0xffe1a8, transparent: true, opacity: 0.85 }));
  m.position.set(SIEGE.x + Math.sin(i * 0.4) * 0.15, SIEGE.y + Math.cos(i * 0.5) * 0.12, SIEGE.z + 1.2 + i * 0.7); m.rotation.z = i * 0.35; voyage.add(m); anneaux.push(m);
}
{ // poussière d'étoiles
  const n = 2600, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 3.2; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = SIEGE.y + Math.sin(a) * r; pos[i * 3 + 2] = SIEGE.z + Math.random() * 36; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  voyage.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xfff0c8, size: 0.016, transparent: true, opacity: 0.9, sizeAttenuation: true })));
}
const brouillard = new THREE.Fog(0x05040a, 2, 26);

const intro = $('#mp3d-intro'), hud = $('#mp3d-hud'), indice = $('#mp3d-hint');
let phase = 'chargement';   // chargement → voyage → salon → lecture
const regard = { yaw: 0, pitch: 0, cibleYaw: 0, ciblePitch: 0 };
let departVoyage = 0;
const DUREE_VOYAGE = reduit ? 1200 : (Number(new URLSearchParams(location.search).get('voyage')) || 5200);

function demarrerVoyage() {
  phase = 'voyage'; departVoyage = performance.now();
  salon.visible = false; table.visible = false; echecs.visible = false; bg.visible = false; livre.visible = false; if (hote) hote.visible = false;
  scene.fog = brouillard; renderer.toneMappingExposure = 1.15;
  intro.classList.add('is-voyage');
  $('#mp3d-intro-titre').textContent = CFG.titre; $('#mp3d-intro-sous').textContent = CFG.sous;
}
function arrivee() {
  phase = 'salon';
  salon.visible = table.visible = echecs.visible = bg.visible = livre.visible = true; if (hote) hote.visible = true;
  voyage.visible = false; scene.fog = null; scene.background = new THREE.Color(0x120d08);
  camera.position.copy(SIEGE); camera.fov = mobile ? 62 : 52; camera.updateProjectionMatrix();
  renderer.toneMappingExposure = 0.15;
  tween(1600, k => { renderer.toneMappingExposure = 0.15 + 0.9 * k; }, easeOut);
  intro.classList.add('is-fini'); setTimeout(() => { intro.hidden = true; }, 1400);
  hud.hidden = false; indice.hidden = false; setTimeout(() => indice.classList.add('is-efface'), 7000);
}
gestion.onLoad = () => { chargeFini = true; if (barre) barre.style.width = '100%'; setTimeout(demarrerVoyage, 350); };
$('#mp3d-passer').addEventListener('click', () => { if (phase === 'voyage') arrivee(); });
// sécurité : si un fichier ne se charge pas, on part quand même après 12 s
setTimeout(() => { if (!chargeFini) { chargeFini = true; demarrerVoyage(); } }, 12000);

/* ------------------------------------------------------------------ */
/* Regarder autour de soi                                               */
/* ------------------------------------------------------------------ */
let pointeur = null, aBouge = false;
const LIM_YAW = 0.85, LIM_HAUT = 0.42, LIM_BAS = -0.7;
racine.addEventListener('pointerdown', e => { if (phase === 'chargement' || phase === 'voyage') return; pointeur = { x: e.clientX, y: e.clientY, yaw: regard.cibleYaw, pitch: regard.ciblePitch }; aBouge = false; });
racine.addEventListener('pointermove', e => {
  if (pointeur) {
    const dx = e.clientX - pointeur.x, dy = e.clientY - pointeur.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) aBouge = true;
    const s = (mobile ? 2.2 : 1.6) / racine.clientWidth;
    regard.cibleYaw = THREE.MathUtils.clamp(pointeur.yaw + dx * s, -LIM_YAW, LIM_YAW);
    regard.ciblePitch = THREE.MathUtils.clamp(pointeur.pitch + dy * s * 0.8, LIM_BAS, LIM_HAUT);
  } else if (!mobile && phase === 'salon') {
    // léger suivi de la souris quand on ne clique pas
    const nx = (e.clientX / racine.clientWidth - 0.5), ny = (e.clientY / racine.clientHeight - 0.5);
    regard.cibleYaw = THREE.MathUtils.clamp(regard.cibleYaw * 0.0 + -nx * 0.5 + regard.baseYaw, -LIM_YAW, LIM_YAW);
    regard.ciblePitch = THREE.MathUtils.clamp(ny * 0.35 + regard.basePitch, LIM_BAS, LIM_HAUT);
  }
});
regard.baseYaw = 0; regard.basePitch = 0;
racine.addEventListener('pointerup', e => {
  const clic = pointeur && !aBouge; if (pointeur) { regard.baseYaw = regard.cibleYaw; regard.basePitch = regard.ciblePitch; } pointeur = null;
  if (!clic || phase === 'voyage' || phase === 'chargement') return;
  if (e.target.closest('button, a')) return;
  // que vise-t-on ?
  const nd = new THREE.Vector2((e.clientX / racine.clientWidth) * 2 - 1, -(e.clientY / racine.clientHeight) * 2 + 1);
  const ray = new THREE.Raycaster(); ray.setFromCamera(nd, camera);
  const hit = ray.intersectObject(livre, true)[0];
  if (hit) {
    if (!ouvert) ouvrirLivre();
    else if (phase === 'salon') modeLecture();
    else { const local = livre.worldToLocal(hit.point.clone()); local.x > 0 ? pageSuivante() : pagePrecedente(); }
  }
});
racine.addEventListener('pointercancel', () => { pointeur = null; });
window.addEventListener('keydown', e => { if (e.key === 'ArrowRight') pageSuivante(); if (e.key === 'ArrowLeft') pagePrecedente(); if (e.key === 'Escape' && phase === 'lecture') modeSalon(); });

/* ------------------------------------------------------------------ */
/* Le livre : ouvrir, tourner les pages, lire                           */
/* ------------------------------------------------------------------ */
let ouvert = false, doublePage = 0, enCours = false;
const majHud = () => { $('#mp3d-page-no').textContent = `${2 * doublePage + 1}–${2 * doublePage + 2} / ${pagesCanvas.length}`; $('#mp3d-prev').disabled = doublePage === 0; $('#mp3d-next').disabled = doublePage >= NB_DOUBLES - 1; };
function ouvrirLivre() {
  if (ouvert || enCours) return; enCours = true;
  hud.classList.add('is-livre'); indice.classList.add('is-efface');
  const x0 = livre.position.x, x1 = LIVRE_OUVERT.x;
  tween(1300, k => { charniere.rotation.z = -Math.PI * k; livre.position.x = x0 + (x1 - x0) * k; dos.scale.z = 1 - 0.9 * k; dos.position.y = (COUV + EP) * (1 - 0.5 * k); }, easeInOut, () => { ouvert = true; enCours = false; majHud(); if (phase === 'salon') modeLecture(); if (mobile) { lecture2D.hidden = false; majLecture2D(); } });
}
function fermerLivre() {
  if (!ouvert || enCours) return; enCours = true;
  if (phase === 'lecture') modeSalon();
  const x0 = livre.position.x;
  tween(1100, k => { charniere.rotation.z = -Math.PI * (1 - k); livre.position.x = x0 + (LIVRE_FERME.x - x0) * k; dos.scale.z = 0.1 + 0.9 * k; dos.position.y = (COUV + EP) * (0.5 + 0.5 * k); }, easeInOut, () => { ouvert = false; enCours = false; hud.classList.remove('is-livre'); });
}
function tournerPage(sens) {
  if (!ouvert || enCours) return;
  const cible = doublePage + sens; if (cible < 0 || cible >= NB_DOUBLES) return;
  enCours = true;
  if (sens > 0) {
    faceAvant.material.map = droite(doublePage); faceArriere.material.map = gauche(cible);
    pageDroite.material.map = droite(cible);
    pageTournante.rotation.z = 0; pageTournante.visible = true;
    tween(900, k => { pageTournante.rotation.z = -Math.PI * k; pageTournante.scale.x = 1 - Math.sin(k * Math.PI) * 0.12; },
      easeInOut, () => { pageGauche.material.map = gauche(cible); pageTournante.visible = false; doublePage = cible; enCours = false; majHud(); majLecture2D(); });
  } else {
    faceAvant.material.map = droite(cible); faceArriere.material.map = gauche(doublePage);
    pageGauche.material.map = gauche(cible);
    pageTournante.rotation.z = -Math.PI; pageTournante.visible = true;
    tween(900, k => { pageTournante.rotation.z = -Math.PI * (1 - k); pageTournante.scale.x = 1 - Math.sin(k * Math.PI) * 0.12; },
      easeInOut, () => { pageDroite.material.map = droite(cible); pageTournante.visible = false; doublePage = cible; enCours = false; majHud(); majLecture2D(); });
  }
  [faceAvant, faceArriere, pageDroite, pageGauche].forEach(m => m.material.needsUpdate = true);
}
const pageSuivante = () => tournerPage(1), pagePrecedente = () => tournerPage(-1);
$('#mp3d-next').addEventListener('click', pageSuivante); $('#mp3d-prev').addEventListener('click', pagePrecedente);
$('#mp3d-fermer').addEventListener('click', fermerLivre);
$('#mp3d-table').addEventListener('click', () => { if (phase === 'lecture') modeSalon(); else if (ouvert) modeLecture(); });

// caméra : à table, ou penchée sur le livre
const LECTURE_POS = mobile ? new THREE.Vector3(0.0, 1.5, 0.62) : new THREE.Vector3(0.0, 1.27, 0.64), LECTURE_CIBLE = new THREE.Vector3(0.0, TABLE_Y + 0.02, 0.26);
let camPos = SIEGE.clone(), camCible = REGARD.clone(), fovCible = camera.fov;
function modeLecture() {
  if (phase !== 'salon' || !ouvert) return; phase = 'lecture';
  hud.classList.add('is-lecture'); $('#mp3d-table').textContent = 'Relever la tête'; chaiseJoueur.visible = false;
  const p0 = camera.position.clone(), c0 = camCible.clone(), f0 = camera.fov, f1 = mobile ? 58 : 38;
  tween(1400, k => { camPos.lerpVectors(p0, LECTURE_POS, k); camCible.lerpVectors(c0, LECTURE_CIBLE, k); camera.fov = f0 + (f1 - f0) * k; camera.updateProjectionMatrix(); });
  regard.cibleYaw = regard.ciblePitch = regard.baseYaw = regard.basePitch = 0;
}
function modeSalon() {
  if (phase !== 'lecture') return; phase = 'salon';
  hud.classList.remove('is-lecture'); $('#mp3d-table').textContent = 'Se pencher sur le livre'; chaiseJoueur.visible = true;
  const p0 = camera.position.clone(), c0 = camCible.clone(), f0 = camera.fov, f1 = mobile ? 62 : 52;
  tween(1300, k => { camPos.lerpVectors(p0, SIEGE, k); camCible.lerpVectors(c0, REGARD, k); camera.fov = f0 + (f1 - f0) * k; camera.updateProjectionMatrix(); });
}
// lecture confortable en 2D
const lecture2D = $('#mp3d-lecture'), cG = $('#mp3d-2d-g'), cD = $('#mp3d-2d-d');
function majLecture2D() {
  if (lecture2D.hidden) return;
  [[cG, pagesCanvas[2 * doublePage]], [cD, pagesCanvas[2 * doublePage + 1]]].forEach(([c, src]) => { c.width = src.width; c.height = src.height; c.getContext('2d').drawImage(src, 0, 0); });
  $('#mp3d-2d-no').textContent = `Pages ${2 * doublePage + 1}–${2 * doublePage + 2} sur ${pagesCanvas.length}`;
}
$('#mp3d-lire').addEventListener('click', () => { lecture2D.hidden = false; majLecture2D(); });
$('#mp3d-2d-fermer').addEventListener('click', () => { lecture2D.hidden = true; });
$('#mp3d-2d-prev').addEventListener('click', () => { if (doublePage > 0) { doublePage--; pageGauche.material.map = gauche(doublePage); pageDroite.material.map = droite(doublePage); majHud(); majLecture2D(); } });
$('#mp3d-2d-next').addEventListener('click', () => { if (doublePage < NB_DOUBLES - 1) { doublePage++; pageGauche.material.map = gauche(doublePage); pageDroite.material.map = droite(doublePage); majHud(); majLecture2D(); } });

/* ------------------------------------------------------------------ */
/* Boucle                                                                */
/* ------------------------------------------------------------------ */
const q = new THREE.Quaternion(), e3 = new THREE.Euler(), dirBase = new THREE.Vector3();
let derniere = performance.now();
function boucle(now) {
  requestAnimationFrame(boucle);
  const dt = Math.min(0.05, (now - derniere) / 1000); derniere = now;
  const t = now / 1000;
  majTweens(now);
  if (phase === 'voyage') {
    const k = Math.min(1, (now - departVoyage) / DUREE_VOYAGE), e = 1 - Math.pow(1 - k, 2.2);
    camera.position.set(SIEGE.x + Math.sin(t * 2.1) * 0.03 * (1 - e), SIEGE.y + Math.cos(t * 1.7) * 0.03 * (1 - e), SIEGE.z + 34 * (1 - e));
    camera.lookAt(SIEGE.x, SIEGE.y, SIEGE.z - 3);
    camera.fov = (mobile ? 62 : 52) + 38 * Math.sin(Math.min(1, k * 1.15) * Math.PI); camera.updateProjectionMatrix();
    anneaux.forEach((a, i) => { a.rotation.z += dt * (0.4 + (i % 4) * 0.2); a.material.opacity = 0.85 * (1 - Math.pow(k, 6)); });
    if (k >= 1) arrivee();
  } else if (phase !== 'chargement') {
    regard.yaw += (regard.cibleYaw - regard.yaw) * Math.min(1, dt * 6);
    regard.pitch += (regard.ciblePitch - regard.pitch) * Math.min(1, dt * 6);
    camera.position.copy(camPos).add(new THREE.Vector3(Math.sin(t * 0.9) * 0.004, Math.sin(t * 1.3) * 0.005, 0)); // respiration
    dirBase.copy(camCible).sub(camPos).normalize();
    e3.set(regard.pitch, -regard.yaw, 0, 'YXZ');
    q.setFromEuler(e3);
    const d = dirBase.clone().applyQuaternion(q);
    camera.lookAt(camera.position.clone().add(d));
    idleHote(t);
  }
  flammes.forEach((f, i) => { f.scale.y = 1.6 + Math.sin(t * 11 + i) * 0.25; f.scale.x = f.scale.z = 1 + Math.sin(t * 13 + i * 2) * 0.12; });
  lampe.intensity = 9 + Math.sin(t * 9) * 0.4 + Math.sin(t * 23) * 0.25;
  feu.intensity = 12 + Math.sin(t * 7) * 1.5 + Math.sin(t * 19) * 0.8;
  renderer.render(scene, camera);
}
requestAnimationFrame(boucle);

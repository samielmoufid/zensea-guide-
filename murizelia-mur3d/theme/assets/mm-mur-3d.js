/*
  Murizelia — « Voir sur mon mur »
  Visualiseur de carrelage mural : photo ou vidéo du mur du client, et pièce 3D.
  Chargé à la demande par snippets/mm-mur-3d.liquid (import dynamique) : rien n'est chargé tant
  que le client n'ouvre pas le visualiseur.
*/

const TUILES = {"minera-carrelage-adhesif-effet-marbre-blanc-anthracite-30x30-cm":{"f":"marbre","m":[30.0,30.0],"p":[30.0,30.0],"r":0,"c":"#eae9e9"},"minera-carrelage-adhesif-effet-marbre-blanc-dore-30x30-cm":{"f":"marbre","m":[30.0,30.0],"p":[30.0,30.0],"r":0,"c":"#bcb7ad"},"minera-carrelage-adhesif-effet-marbre-bleu-dore-30x30-cm":{"f":"marbre","m":[30.0,30.0],"p":[30.0,30.0],"r":0,"c":"#a1b0b8"},"minera-carrelage-adhesif-effet-marbre-graphite-dore-30x30-cm":{"f":"marbre","m":[30.0,30.0],"p":[30.0,30.0],"r":0,"c":"#7d6f5c"},"minera-carrelage-adhesif-effet-marbre-gris-dore-30x30-cm":{"f":"marbre","m":[30.0,30.0],"p":[30.0,30.0],"r":0,"c":"#b1b1b6"},"minera-carrelage-adhesif-effet-marbre-noir-dore-30x30-cm":{"f":"marbre","m":[30.0,30.0],"p":[30.0,30.0],"r":0,"c":"#18140c"},"minera-carrelage-adhesif-effet-marbre-rose-dore-30x30-cm":{"f":"marbre","m":[30.0,30.0],"p":[30.0,30.0],"r":0,"c":"#f1d0ce"},"minera-carrelage-adhesif-effet-marbre-vert-dore-30x30-cm":{"f":"marbre","m":[30.0,30.0],"p":[30.0,30.0],"r":0,"c":"#b3c1ab"},"mosaela-carrelage-adhesif-3d-beige-sable-25-4x25-4-cm":{"f":"mosaique","m":[25.58,25.58],"p":[25.4,25.4],"r":1,"c":"#d9b77b"},"mosaela-carrelage-adhesif-3d-bleu-azur-25-4x25-4-cm":{"f":"mosaique","m":[25.75,25.75],"p":[25.4,25.4],"r":1,"c":"#2d6484"},"mosaela-carrelage-adhesif-3d-damier-bleu-saphir-25-4x25-4-cm":{"f":"damier","m":[25.51,25.51],"p":[25.4,25.4],"r":1,"c":"#8596aa"},"mosaela-carrelage-adhesif-3d-damier-bordeaux-25-4x25-4-cm":{"f":"damier","m":[25.52,25.52],"p":[25.4,25.4],"r":1,"c":"#b08b87"},"mosaela-carrelage-adhesif-3d-damier-vert-sapin-25-4x25-4-cm":{"f":"damier","m":[25.47,25.47],"p":[25.4,25.4],"r":1,"c":"#97a197"},"mosaela-carrelage-adhesif-3d-orange-terracotta-25-4x25-4-cm":{"f":"mosaique","m":[25.57,25.57],"p":[25.4,25.4],"r":1,"c":"#c08975"},"mosaela-carrelage-adhesif-3d-rouge-bordeaux-25-4x25-4-cm":{"f":"mosaique","m":[25.5,25.5],"p":[25.4,25.4],"r":1,"c":"#5a3230"},"mosaela-carrelage-adhesif-3d-vert-bouteille-25-4x25-4-cm":{"f":"mosaique","m":[25.58,25.58],"p":[25.4,25.4],"r":1,"c":"#3c523d"},"mosaela-carrelage-adhesif-3d-vert-olive-25-4x25-4-cm":{"f":"mosaique","m":[25.63,25.63],"p":[25.4,25.4],"r":1,"c":"#5e622e"},"stria-carrelage-adhesif-3d-blanc-brillant-25x25-cm":{"f":"baguettes","m":[25.12,25.12],"p":[25.0,25.0],"r":1,"c":"#e5e5e5"},"stria-carrelage-adhesif-3d-bleu-indigo-30x30-cm":{"f":"baguettes","m":[30.44,30.44],"p":[30.0,30.0],"r":1,"c":"#5c6e7d"},"stria-carrelage-adhesif-3d-rose-poudre-30x30-cm":{"f":"baguettes","m":[30.38,30.38],"p":[30.0,30.0],"r":1,"c":"#e4d1cc"},"stria-carrelage-adhesif-3d-rouge-bordeaux-30x30-cm":{"f":"baguettes","m":[30.28,30.28],"p":[30.0,30.0],"r":1,"c":"#723932"},"stria-carrelage-adhesif-3d-vert-d-eau-25x25-cm":{"f":"baguettes","m":[25.24,25.24],"p":[25.0,25.0],"r":1,"c":"#afd7d1"},"stria-carrelage-adhesif-3d-vert-emeraude-30x30-cm":{"f":"baguettes","m":[30.32,30.32],"p":[30.0,30.0],"r":1,"c":"#3b7063"},"stria-carrelage-adhesif-3d-vert-grise-30x30-cm":{"f":"baguettes","m":[30.32,30.32],"p":[30.0,30.0],"r":1,"c":"#cccbc0"},"stria-carrelage-adhesif-3d-vieux-rose-25x25-cm":{"f":"baguettes","m":[25.09,25.09],"p":[25.0,25.0],"r":1,"c":"#daa7af"}};
const VERSION = '202610212333';

// photo d'exemple : vraie cuisine (panorama Poly Haven CC0 recadré), mur du fond repéré à la main
const DEMO = { quad: [[397, 352], [1566, 268], [1566, 1000], [397, 988]], largeur: 330 };

const asset = (nom) => new URL(nom, import.meta.url).href + '?v=' + VERSION;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const fr = (x, d = 1) => x.toLocaleString('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d });

function canvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return c;
}

const imgs = new Map();
function image(src, cache = true) {
  if (cache && imgs.has(src)) return imgs.get(src);
  const p = new Promise((ok, ko) => {
    const i = new Image();
    i.crossOrigin = 'anonymous';
    i.decoding = 'async';
    i.onload = () => ok(i);
    i.onerror = () => { imgs.delete(src); ko(new Error('Image introuvable : ' + src)); };
    i.src = src;
  });
  if (cache) imgs.set(src, p);
  return p;
}


export function nomCourt(titre) {
  const [marque, reste = ''] = titre.split(/\s+[–—-]\s+/);
  let c = reste.replace(/^.*?adh[ée]sif\s+/i, '').replace(/^(effet marbre|3D)\s+/i, '').trim();
  c = c.charAt(0).toUpperCase() + c.slice(1);
  return { marque: marque.trim(), couleur: c || titre };
}

/* ------------------------------------------------------------------ */
/* Textures : plaque -> motif repetable (pose droite, alternee, couchee) */
/* ------------------------------------------------------------------ */

// quart de tour k (sens horaire) ; pour une carte de normales, on tourne aussi les vecteurs
function tourner(img, taille, k, normale) {
  const c = canvas(taille, taille);
  const g = c.getContext('2d', { willReadFrequently: !!normale });
  g.imageSmoothingQuality = 'high';
  g.translate(taille / 2, taille / 2);
  g.rotate(k * Math.PI / 2);
  g.drawImage(img, -taille / 2, -taille / 2, taille, taille);
  if (normale && k % 4) {
    const d = g.getImageData(0, 0, taille, taille), p = d.data;
    for (let i = 0; i < p.length; i += 4) {
      const x = p[i], y = p[i + 1];
      if (k === 1) { p[i] = y; p[i + 1] = 255 - x; }
      else if (k === 2) { p[i] = 255 - x; p[i + 1] = 255 - y; }
      else { p[i] = 255 - y; p[i + 1] = x; }
    }
    g.putImageData(d, 0, 0);
  }
  return c;
}

const compos = new Map();
async function composer(h, pose) {
  const cle = h + '|' + pose;
  if (compos.has(cle)) return compos.get(cle);
  const t = TUILES[h];
  const [alb, nor, rug] = await Promise.all([
    image(asset('mm-mur-' + h + '.jpg')),
    image(asset('mm-mur-' + h + '-n.jpg')),
    t.r ? image(asset('mm-mur-' + h + '-r.jpg')) : null,
  ]);
  const N = pose === 'alternee' ? 4 : 1;
  const pa = N === 1 ? 1024 : 512, pn = N === 1 ? 512 : 256, pr = N === 1 ? 256 : 128;
  const A = canvas(N * pa, N * pa), B = canvas(N * pn, N * pn), R = rug ? canvas(N * pr, N * pr) : null;
  const ga = A.getContext('2d'), gb = B.getContext('2d'), gr = R && R.getContext('2d');
  let s = 11;
  const rot = [];
  for (let i = 0; i < N * N; i++) {
    s = (s * 16807) % 2147483647;
    rot.push(pose === 'horizontale' ? 1 : N === 1 ? 0 : s % 4);
  }
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const k = rot[i * N + j];
      ga.drawImage(k ? tourner(alb, pa, k) : alb, j * pa, i * pa, pa, pa);
      gb.drawImage(k ? tourner(nor, pn, k, true) : nor, j * pn, i * pn, pn, pn);
      if (gr) gr.drawImage(k ? tourner(rug, pr, k) : rug, j * pr, i * pr, pr, pr);
    }
  }
  const tx = { h, f: t.f, m: t.m, p: t.p, N, A, B, R, rot, pose, id: cle };
  compos.set(cle, tx);
  return tx;
}

/* ------------------------------------------------------------------ */
/* Géométrie : homographie, focale, repère du mur                       */
/* ------------------------------------------------------------------ */

// carré unité (0,0) (1,0) (1,1) (0,1) -> quadrilatère p0 p1 p2 p3 (Heckbert), matrice ligne par ligne
function homographie(p) {
  const [x0, y0] = p[0], [x1, y1] = p[1], [x2, y2] = p[2], [x3, y3] = p[3];
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  let g = 0, h = 0;
  if (Math.abs(sx) > 1e-9 || Math.abs(sy) > 1e-9) {
    const den = dx1 * dy2 - dx2 * dy1;
    g = (sx * dy2 - dx2 * sy) / den;
    h = (dx1 * sy - sx * dy1) / den;
  }
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h, 1];
}

function inverse3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (Math.abs(det) < 1e-12) return null;
  const k = 1 / det;
  return [A * k, -(b * i - c * h) * k, (b * f - c * e) * k,
    B * k, (a * i - c * g) * k, -(a * f - c * d) * k,
    C * k, -(a * h - b * g) * k, (a * e - b * d) * k];
}

const colonnes = (m) => new Float32Array([m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]);
const norm = (v) => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
const croix = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const scal = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/*
  À partir des 4 coins du mur (supposé rectangulaire) : focale estimée (Zhang & He), rapport
  largeur / hauteur réel du mur et repère du mur dans l'espace caméra (x droite, y bas, z avant).
*/
function cadre(quad, W, H) {
  const m = homographie(quad), cx = W / 2, cy = H / 2;
  const g1 = [m[0] - cx * m[6], m[3] - cy * m[6], m[6]];
  const g2 = [m[1] - cx * m[7], m[4] - cy * m[7], m[7]];
  const D = Math.max(W, H);
  let f = 0.78 * D;
  const den = g1[2] * g2[2];
  if (Math.abs(den) > 1e-12) {
    const f2 = -(g1[0] * g2[0] + g1[1] * g2[1]) / den;
    if (f2 > 0) {
      const fe = Math.sqrt(f2);
      if (fe > 0.45 * D && fe < 2.6 * D) f = fe;
    }
  }
  const r1 = [g1[0] / f, g1[1] / f, g1[2]], r2 = [g2[0] / f, g2[1] / f, g2[2]];
  const rapport = Math.hypot(...r1) / Math.hypot(...r2);
  const X = norm(r1);
  let Y = norm(r2);
  Y = norm([Y[0] - scal(Y, X) * X[0], Y[1] - scal(Y, X) * X[1], Y[2] - scal(Y, X) * X[2]]);
  const Nw = norm(croix(Y, X));            // vers la caméra
  const up = [-Y[0], -Y[1], -Y[2]];
  return { m, f, rapport, R1: X, R2: up, N: Nw };
}

function quadValide(q, w, h) {
  let signe = 0, aire = 0;
  for (let i = 0; i < 4; i++) {
    const a = q[i], b = q[(i + 1) % 4], c = q[(i + 2) % 4];
    if (!isFinite(a[0]) || !isFinite(a[1])) return false;
    if (a[0] < -0.3 * w || a[0] > 1.3 * w || a[1] < -0.3 * h || a[1] > 1.3 * h) return false;
    const z = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (signe && Math.sign(z) !== signe) return false;
    signe = Math.sign(z);
    aire += a[0] * b[1] - b[0] * a[1];
  }
  return Math.abs(aire / 2) > w * h * 0.01;
}

/* ------------------------------------------------------------------ */
/* Éclairage de la photo : lumière du mur, exposition, balance, direction */
/* ------------------------------------------------------------------ */

const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
const LIN = new Float32Array(256).map((_, i) => lin(i));
const srgb = (v) => 255 * (v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055);

function flou(a, w, h, r) {
  const t = new Float32Array(a.length), o = new Float32Array(a.length);
  for (let y = 0; y < h; y++) {
    let s = 0;
    for (let x = -r; x <= r; x++) s += a[y * w + clamp(x, 0, w - 1)];
    for (let x = 0; x < w; x++) {
      t[y * w + x] = s / (2 * r + 1);
      s += a[y * w + clamp(x + r + 1, 0, w - 1)] - a[y * w + clamp(x - r, 0, w - 1)];
    }
  }
  for (let x = 0; x < w; x++) {
    let s = 0;
    for (let y = -r; y <= r; y++) s += t[clamp(y, 0, h - 1) * w + x];
    for (let y = 0; y < h; y++) {
      o[y * w + x] = s / (2 * r + 1);
      s += t[clamp(y + r + 1, 0, h - 1) * w + x] - t[clamp(y - r, 0, h - 1) * w + x];
    }
  }
  return o;
}

/*
  px : image réduite (RGBA, ~128 px). zone(x, y) -> poids 0..1 du mur (masque et quadrilatère).
  Renvoie l'éclairage lissé du mur seul (flou normalisé : les meubles voisins ne déteignent pas).
*/
// surface du 2e degré z = c0 + c1 u + c2 v + c3 u² + c4 v² + c5 uv (moindres carrés pondérés)
const base6 = (u, v) => [1, u, v, u * u, v * v, u * v];
const surface = (c, u, v) => c[0] + c[1] * u + c[2] * v + c[3] * u * u + c[4] * v * v + c[5] * u * v;
function ajusteSurface(pts, garder) {
  const A = Array.from({ length: 6 }, () => new Float64Array(7));
  pts.forEach((p, k) => {
    if (garder && !garder[k]) return;
    const f = base6(p[0], p[1]);
    for (let i = 0; i < 6; i++) { for (let j = 0; j < 6; j++) A[i][j] += f[i] * f[j]; A[i][6] += f[i] * p[2]; }
  });
  for (let i = 0; i < 6; i++) A[i][i] += 1e-6;
  for (let i = 0; i < 6; i++) {
    let m = i;
    for (let r = i + 1; r < 6; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
    [A[i], A[m]] = [A[m], A[i]];
    for (let r = 0; r < 6; r++) {
      if (r === i || !A[i][i]) continue;
      const f = A[r][i] / A[i][i];
      for (let c = i; c < 7; c++) A[r][c] -= f * A[i][c];
    }
  }
  return A.map((l, i) => (l[i] ? l[6] / l[i] : 0));
}

function eclairage(px, w, h, zone, lisse) {
  const n = w * h, R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n), M = new Float32Array(n);
  const lums = new Float32Array(n);
  let ar = 0, ag = 0, ab = 0;
  for (let i = 0, j = 0; i < n; i++, j += 4) {
    const x = i % w, y = (i - x) / w;
    R[i] = LIN[px[j]]; G[i] = LIN[px[j + 1]]; B[i] = LIN[px[j + 2]];
    M[i] = zone((x + 0.5) / w, (y + 0.5) / h);
    ar += R[i]; ag += G[i]; ab += B[i];
    lums[i] = 0.2126 * R[i] + 0.7152 * G[i] + 0.0722 * B[i];
  }
  const r = Math.max(2, Math.round(w / 40));
  const fm = flou(M, w, h, r);
  const fr_ = flou(R.map((v, i) => v * M[i]), w, h, r);
  const fg = flou(G.map((v, i) => v * M[i]), w, h, r);
  const fb = flou(B.map((v, i) => v * M[i]), w, h, r);
  const pr = flou(R, w, h, r), pg = flou(G, w, h, r), pb = flou(B, w, h, r);
  const out = new Uint8Array(n * 3);
  let sr = 0, sg = 0, sb = 0, sm = 0, sx = 0, sy = 0, sxx = 0, syy = 0, sxy = 0, sl = 0, slx = 0, sly = 0;
  for (let i = 0; i < n; i++) {
    const x = i % w, y = (i - x) / w;
    const k = clamp((fm[i] - 0.04) / 0.2, 0, 1);
    const q = fm[i] > 1e-4 ? 1 / fm[i] : 0;
    const vr = k * fr_[i] * q + (1 - k) * pr[i], vg = k * fg[i] * q + (1 - k) * pg[i], vb = k * fb[i] * q + (1 - k) * pb[i];
    out[i * 3] = srgb(vr); out[i * 3 + 1] = srgb(vg); out[i * 3 + 2] = srgb(vb);
    const m = M[i];
    if (m > 0.5) {
      sr += R[i]; sg += G[i]; sb += B[i]; sm++;
      const u = x / w - 0.5, v = y / h - 0.5, l = Math.log(lums[i] + 0.003);
      sx += u; sy += v; sxx += u * u; syy += v * v; sxy += u * v; sl += l; slx += l * u; sly += l * v;
    }
  }
  sm = Math.max(sm, 1);
  const ref = [Math.max(sr / sm, 0.004), Math.max(sg / sm, 0.004), Math.max(sb / sm, 0.004)];
  // pente de la lumière sur le mur (régression du log de la luminance)
  const mx = sx / sm, my = sy / sm;
  const cxx = sxx / sm - mx * mx, cyy = syy / sm - my * my, cxy = sxy / sm - mx * my;
  const clx = slx / sm - mx * sl / sm, cly = sly / sm - my * sl / sm;
  const det = cxx * cyy - cxy * cxy;
  const grad = Math.abs(det) > 1e-8 ? [(clx * cyy - cly * cxy) / det, (cly * cxx - clx * cxy) / det] : [0, 0];
  if (lisse) {
    /*
      Zone entière carrelée (objets non contournés) : la lumière est un dégradé lissé ajusté sur le mur,
      en écartant ce qui s'en éloigne (meubles, objets), pour ne pas reporter leurs taches sur le carrelage.
    */
    const pts = [];
    for (let i = 0; i < n; i++) {
      if (M[i] <= 0.5) continue;
      const x = i % w, y = (i - x) / w;
      pts.push([x / w - 0.5, y / h - 0.5, Math.log(lums[i] + 0.003), i]);
    }
    if (pts.length > 24) {
      let c = ajusteSurface(pts, null), garder = null;
      for (let it = 0; it < 3; it++) {
        const res = pts.map((p) => Math.abs(p[2] - surface(c, p[0], p[1])));
        const seuil = Float32Array.from(res).sort()[Math.floor(res.length * 0.65)];
        garder = res.map((r) => r <= seuil);
        c = ajusteSurface(pts, garder);
      }
      let cr = 0, cg = 0, cb = 0, mf = 0, k = 0;
      pts.forEach((p, j) => {
        if (!garder[j]) return;
        cr += R[p[3]]; cg += G[p[3]]; cb += B[p[3]]; mf += Math.exp(surface(c, p[0], p[1])); k++;
      });
      ref[0] = Math.max(cr / k, 0.004); ref[1] = Math.max(cg / k, 0.004); ref[2] = Math.max(cb / k, 0.004);
      mf /= k;
      for (let i = 0; i < n; i++) {
        const x = i % w, y = (i - x) / w;
        const e = clamp(Math.exp(surface(c, x / w - 0.5, y / h - 0.5)) / mf, 0.2, 3);
        out[i * 3] = srgb(Math.min(1, ref[0] * e)); out[i * 3 + 1] = srgb(Math.min(1, ref[1] * e)); out[i * 3 + 2] = srgb(Math.min(1, ref[2] * e));
      }
      grad[0] = c[1]; grad[1] = c[2];
    }
  }
  const tri = Float32Array.from(lums).sort();
  const p95 = tri[Math.floor(n * 0.95)];
  const lref = 0.2126 * ref[0] + 0.7152 * ref[1] + 0.0722 * ref[2];
  const expo = clamp(Math.max(lref / 0.74, 0.7 * p95 / 0.85), 0.16, 1.2);
  const am = (ar + ag + ab) / 3 / n || 1;
  const cast = [ar / n / am, ag / n / am, ab / n / am].map((c) => clamp(1 + (c - 1) * 0.35, 0.85, 1.15));
  return { tex: out, w, h, ref, expo, cast, grad };
}

/* ------------------------------------------------------------------ */
/* Rendu WebGL du carrelage sur la photo                                */
/* ------------------------------------------------------------------ */

const VS = 'attribute vec2 aP;varying vec2 vUv;void main(){vUv=vec2(aP.x*.5+.5,.5-aP.y*.5);gl_Position=vec4(aP,0.,1.);}';

const FS = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPhoto, uLow, uMask, uAlb, uNor, uRug;
uniform vec2 uSize, uDim, uMotif, uOrig, uSeed;
uniform mat3 uHinv;
uniform float uN, uHasMask, uHasRug, uRugBase, uGloss, uRelief, uSplit, uReveal, uMarge, uActif, uF, uExpo, uFwPx;
uniform vec3 uRef, uCast, uR1, uR2, uNw, uL;

float lum(vec3 c){ return dot(c, vec3(0.2126, 0.7152, 0.0722)); }
vec3 toLin(vec3 c){ return pow(max(c, 0.0), vec3(2.2)); }

void main(){
  vec3 photo = texture2D(uPhoto, vUv).rgb;
  vec3 res = photo;
  vec2 p = vUv * uSize;
  vec3 q = uHinv * vec3(p, 1.0);
  if (uActif > 0.5 && q.z > 0.0) {
    vec2 uv = q.xy / q.z;
#ifdef DERIV
    vec2 fw = fwidth(uv) + 1e-6;
#else
    vec2 fw = vec2(uFwPx);
#endif
    vec2 d = min(uv + uMarge, 1.0 + uMarge - uv) / fw;
    float cov = clamp(min(d.x, d.y) + 0.5, 0.0, 1.0);
    vec3 low = toLin(texture2D(uLow, vUv).rgb);
    if (uHasMask > 0.5) {
      float mk = texture2D(uMask, vUv).r;
      float m = smoothstep(0.3, 0.7, mk);
      // bande de transition : on tranche au pixel près selon la ressemblance avec la couleur du mur
      float bande = 1.0 - abs(mk * 2.0 - 1.0);
      if (bande > 0.0) {
        vec3 pl = toLin(photo);
        vec3 cp = pl / (pl.r + pl.g + pl.b + 0.002), cw = low / (low.r + low.g + low.b + 0.002);
        float dl = abs(log((lum(pl) + 0.01) / (lum(low) + 0.01)));
        float dc = length(cp - cw) * 3.2 + max(dl - 0.55, 0.0) * 0.6;
        float ok = 1.0 - smoothstep(0.07, 0.2, dc);
        m = mix(m, ok, clamp(bande * 1.6, 0.0, 1.0));
      }
      cov *= m;
    }
    float r = length((vUv - uSeed) * vec2(uSize.x / uSize.y, 1.0));
    cov *= smoothstep(uReveal, uReveal - 0.12, r);
    cov *= step(uSplit, vUv.x);
    if (cov > 0.001) {
      vec2 w = vec2(uv.x * uDim.x, (1.0 - uv.y) * uDim.y) + uOrig;
      vec2 st = vec2(w.x, -w.y) / (uMotif * uN);
      vec3 alb = toLin(texture2D(uAlb, st).rgb);
      vec3 nt = texture2D(uNor, st).xyz * 2.0 - 1.0;
      nt.xy *= uRelief;
      vec3 n = normalize(uR1 * nt.x + uR2 * nt.y + uNw * max(nt.z, 0.15));
      vec3 il = low / uRef;
      il = clamp(mix(vec3(lum(il)), il, 0.6), 0.05, 3.0);
      vec3 V = -normalize(vec3((p - 0.5 * uSize) / uF, 1.0));
      float ndl = max(dot(n, uL), 0.0), ndl0 = max(dot(uNw, uL), 0.2);
      float rel = clamp(mix(1.0, ndl / ndl0, 0.85), 0.5, 1.5);
      float rg = uHasRug > 0.5 ? texture2D(uRug, st).g : uRugBase;
      vec3 col = alb * il * uExpo * uCast * rel;
      // reflets : la pièce floutée, décalée par le relief, selon Fresnel
      float nv = max(dot(n, V), 0.0);
      float F = 0.02 + 0.98 * pow(1.0 - nv, 5.0);
      vec3 Rf = reflect(-V, n), R0 = reflect(-V, uNw);
      vec2 dr = (Rf.xy - R0.xy) * 0.45;
      vec3 env = toLin(texture2D(uLow, clamp(vUv + dr, 0.0, 1.0)).rgb);
      float gl = uGloss * (1.0 - rg) * (1.0 - rg);
      // seules les zones plus claires que le mur (fenêtre, lampe) se reflètent franchement : le reflet
      // uniforme d'un mur gris voilerait les teintes foncées, ce que l'œil ne voit pas sur le vrai carreau
      float hl = mix(0.3, 1.0, smoothstep(0.9, 1.8, lum(env) / max(lum(uRef), 0.004)));
      col = mix(col, env * 1.15, clamp(F * gl * hl, 0.0, 0.3));
      vec3 H = normalize(uL + V);
      float sh = mix(700.0, 24.0, rg);
      float sp = pow(max(dot(n, H), 0.0), sh) * (sh + 8.0) / 60.0;
      col += sp * gl * 0.05 * lum(il) * uExpo * uCast;
      // grain et micro-ombres de la photo d'origine
      float lp = lum(toLin(photo)), ll = lum(low);
      col *= 1.0 + clamp((lp - ll) / max(ll, 0.02), -0.03, 0.03) * 0.6;
      res = mix(photo, pow(clamp(col, 0.0, 1.0), vec3(1.0 / 2.2)), cov);
    }
  }
  gl_FragColor = vec4(res, 1.0);
}`;

const GLOSS = { marbre: [0.55, 0.16, 0.45], mosaique: [0.9, 0.12, 1.0], damier: [0.8, 0.14, 0.8], baguettes: [0.8, 0.14, 1.0] };

class RenduMur {
  constructor(cv) {
    const gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, alpha: false, premultipliedAlpha: false });
    if (!gl) throw new Error('webgl');
    this.cv = cv; this.gl = gl;
    this.deriv = !!gl.getExtension('OES_standard_derivatives');
    this.aniso = gl.getExtension('EXT_texture_filter_anisotropic') || gl.getExtension('WEBKIT_EXT_texture_filter_anisotropic');
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    const pr = gl.createProgram();
    gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, (this.deriv ? '#extension GL_OES_standard_derivatives : enable\n#define DERIV 1\n' : '') + FS));
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(pr));
    gl.useProgram(pr);
    this.pr = pr;
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const a = gl.getAttribLocation(pr, 'aP');
    gl.enableVertexAttribArray(a);
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0);
    this.loc = {};
    this.t = {};
    ['uPhoto', 'uLow', 'uMask', 'uAlb', 'uNor', 'uRug'].forEach((nom, i) => {
      this.t[nom] = gl.createTexture();
      gl.uniform1i(this.u(nom), i);
      this.vide(nom);
    });
    this.actif = false;
  }

  u(nom) {
    if (!(nom in this.loc)) this.loc[nom] = this.gl.getUniformLocation(this.pr, nom);
    return this.loc[nom];
  }

  lier(nom) {
    const gl = this.gl, i = ['uPhoto', 'uLow', 'uMask', 'uAlb', 'uNor', 'uRug'].indexOf(nom);
    gl.activeTexture(gl.TEXTURE0 + i);
    gl.bindTexture(gl.TEXTURE_2D, this.t[nom]);
    return gl;
  }

  params(repeter, mip) {
    const gl = this.gl;
    const w = repeter ? gl.REPEAT : gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, w);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, w);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    if (mip) {
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      if (this.aniso) gl.texParameterf(gl.TEXTURE_2D, this.aniso.TEXTURE_MAX_ANISOTROPY_EXT, Math.min(8, gl.getParameter(this.aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT)));
    } else {
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  }

  vide(nom) {
    const gl = this.lier(nom);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    this.params(false, false);
  }

  image(nom, src, { repeter = false, mip = false, brut = false } = {}) {
    const gl = this.lier(nom);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, brut ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    this.params(repeter, mip);
  }

  octets(nom, data, w, h, format) {
    const gl = this.lier(nom);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, format, w, h, 0, format, gl.UNSIGNED_BYTE, data);
    this.params(false, false);
  }

  setTuile(tx) {
    this.image('uAlb', tx.A, { repeter: true, mip: true });
    this.image('uNor', tx.B, { repeter: true, mip: true, brut: true });
    if (tx.R) this.image('uRug', tx.R, { repeter: true, mip: true, brut: true });
    const g = GLOSS[tx.f] || GLOSS.marbre;
    const gl = this.gl;
    gl.uniform1f(this.u('uHasRug'), tx.R ? 1 : 0);
    gl.uniform1f(this.u('uGloss'), g[0]);
    gl.uniform1f(this.u('uRugBase'), g[1]);
    gl.uniform1f(this.u('uRelief'), g[2]);
    gl.uniform1f(this.u('uN'), tx.N);
    gl.uniform2f(this.u('uMotif'), tx.m[0], tx.m[1]);
  }

  setPhoto(src, w, h, brut) {
    this.sw = w; this.sh = h;
    this.image('uPhoto', src, {});
    this.gl.uniform2f(this.u('uSize'), w, h);
  }

  setMasque(seg) {
    const gl = this.gl;
    if (!seg) { gl.uniform1f(this.u('uHasMask'), 0); return; }
    const d = new Uint8Array(seg.w * seg.h);
    for (let i = 0; i < d.length; i++) d[i] = seg.m[i] * 255;
    // adoucit le contour avant l'agrandissement
    const f = flou(Float32Array.from(d), seg.w, seg.h, 2);
    for (let i = 0; i < d.length; i++) d[i] = f[i];
    this.octets('uMask', d, seg.w, seg.h, gl.LUMINANCE);
    gl.uniform1f(this.u('uHasMask'), 1);
  }

  setEclairage(e) {
    const gl = this.gl;
    this.octets('uLow', e.tex, e.w, e.h, gl.RGB);
    gl.uniform3fv(this.u('uRef'), e.ref);
    gl.uniform3fv(this.u('uCast'), e.cast);
    this.expoBase = e.expo;
    this.grad = e.grad;
  }

  setGeometrie(quad, dim, marge) {
    const gl = this.gl;
    const c = cadre(quad, this.sw, this.sh);
    const inv = inverse3(c.m);
    if (!inv) return null;
    gl.uniformMatrix3fv(this.u('uHinv'), false, colonnes(inv));
    gl.uniform1f(this.u('uF'), c.f);
    gl.uniform3fv(this.u('uR1'), c.R1);
    gl.uniform3fv(this.u('uR2'), c.R2);
    gl.uniform3fv(this.u('uNw'), c.N);
    gl.uniform2f(this.u('uDim'), dim[0], dim[1]);
    gl.uniform1f(this.u('uMarge'), marge);
    const per = Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]) + Math.hypot(quad[3][0] - quad[0][0], quad[3][1] - quad[0][1]);
    gl.uniform1f(this.u('uFwPx'), 2 / Math.max(per, 1));
    // départ de la pose : rangée entière en bas, motif centré en largeur
    this.motifOrig = dim;
    this.cadre = c;
    this.lumiere();
    return c;
  }

  // première joint verticale décalée pour centrer la pose en largeur ; rangée entière en bas
  setOrigine(dim, motif) {
    const span = motif[0];
    const reste = dim[0] - Math.floor(dim[0] / span) * span;
    this.gl.uniform2f(this.u('uOrig'), (span - reste / 2) % span, 0);
  }

  lumiere() {
    const c = this.cadre;
    if (!c) return;
    const g = this.grad || [0, 0];
    const k = clamp(Math.hypot(g[0], g[1]) * 1.6, 0, 0.75) / (Math.hypot(g[0], g[1]) || 1);
    const L = norm([
      c.N[0] * 0.8 + c.R1[0] * g[0] * k - c.R2[0] * g[1] * k + c.R2[0] * 0.3,
      c.N[1] * 0.8 + c.R1[1] * g[0] * k - c.R2[1] * g[1] * k + c.R2[1] * 0.3,
      c.N[2] * 0.8 + c.R1[2] * g[0] * k - c.R2[2] * g[1] * k + c.R2[2] * 0.3,
    ]);
    this.gl.uniform3fv(this.u('uL'), L);
  }

  rendu({ actif, expo = 1, split = 0, reveal = 9, graine = [0.5, 0.5] }) {
    const gl = this.gl;
    gl.viewport(0, 0, this.cv.width, this.cv.height);
    gl.uniform1f(this.u('uActif'), actif ? 1 : 0);
    gl.uniform1f(this.u('uExpo'), (this.expoBase || 1) * expo);
    gl.uniform1f(this.u('uSplit'), split);
    gl.uniform1f(this.u('uReveal'), reveal);
    gl.uniform2f(this.u('uSeed'), graine[0], graine[1]);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}

/* ------------------------------------------------------------------ */
/* Interface                                                            */
/* ------------------------------------------------------------------ */

const ICO = {
  x: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  cam: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/></svg>',
  img: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 16l5-5 4 4 3-3 5 5"/><circle cx="15.5" cy="9" r="1.6"/></svg>',
  vid: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><rect x="3" y="6.5" width="12.5" height="11" rx="2"/><path d="M15.5 10.5l5.5-3v9l-5.5-3z"/></svg>',
  ava: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="2"/><path d="M12 3v18"/><path d="M12 5h6.5a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H12z" fill="currentColor" stroke="none" opacity=".35"/></svg>',
  dl: '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v11M7 10.5l5 5 5-5M5 19.5h14"/></svg>',
};

const CSS = `
:host{ all:initial; }
*{ box-sizing:border-box; }
[hidden]{ display:none !important; }
.mv{ position:fixed; inset:0; display:flex; flex-direction:column; background:#0f0d0c; color:#1a1715;
  font-family:var(--mm-body, 'Inter'), system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif; font-size:14px; line-height:1.4;
  -webkit-font-smoothing:antialiased; opacity:0; transition:opacity .25s ease; }
.mv.on{ opacity:1; }
button{ font:inherit; color:inherit; }
.top{ flex:0 0 auto; display:flex; align-items:center; gap:10px; padding:calc(8px + env(safe-area-inset-top,0px)) 12px 8px; background:#0f0d0c; color:#f4efe8; }
.x{ flex:0 0 40px; width:40px; height:40px; border-radius:50%; border:0; background:rgba(255,255,255,.1); color:#fff; display:grid; place-items:center; cursor:pointer; }
.x:hover{ background:rgba(255,255,255,.18); }
button:focus{ outline:none; }
button:focus-visible, .btn:focus-within{ outline:2px solid #c9a46a; outline-offset:2px; }
.ttl{ flex:0 0 auto; display:none; font:500 17px/1 var(--mm-head, 'Instrument Sans'), sans-serif; }
.ttl em{ font-family:var(--mm-accent-font, 'Playfair Display'), serif; font-style:italic; font-weight:400; }
.tabs{ flex:1; display:flex; justify-content:center; min-width:0; }
.tabs-in{ display:flex; gap:2px; padding:3px; border-radius:999px; background:rgba(255,255,255,.09); max-width:100%; }
.tab{ border:0; background:transparent; color:rgba(244,239,232,.78); font-weight:600; font-size:13px; padding:9px 13px; border-radius:999px; cursor:pointer; white-space:nowrap; }
.tab[aria-selected="true"]{ background:#f4efe8; color:#1a1715; }
.tab .lg{ display:none; }
.top .sp{ flex:0 0 40px; }
.main{ flex:1; min-height:0; display:flex; flex-direction:column; }
.stage{ position:relative; flex:1; min-height:0; overflow:hidden; background:#1b1816; }
.dock{ position:relative; flex:0 0 auto; background:#f4efe8; border-radius:18px 18px 0 0; margin-top:-14px; padding:14px 0 calc(12px + env(safe-area-inset-bottom,0px)); box-shadow:0 -12px 30px rgba(0,0,0,.28); z-index:2; }
.tools{ display:flex; gap:8px; overflow-x:auto; padding:0 14px 10px; scrollbar-width:none; }
.tools::-webkit-scrollbar, .tiles::-webkit-scrollbar{ display:none; }
.chip{ flex:0 0 auto; display:inline-flex; align-items:center; gap:7px; height:36px; padding:0 14px; border-radius:999px; border:1px solid rgba(26,23,21,.14); background:#fff; font-weight:600; font-size:13px; color:#1a1715; cursor:pointer; white-space:nowrap; }
.chip.on{ background:#1a1715; color:#fff; border-color:#1a1715; }
.chip.pri{ background:#7a2632; border-color:#7a2632; color:#fff; }
.chip.ava{ border:1.5px solid #7a2632; color:#7a2632; background:#f6e9eb; }
.chip.ava.on{ background:#7a2632; color:#fff; }
.chip:disabled{ opacity:.45; cursor:default; }
.sub{ margin:0 14px 10px; padding:12px 14px; border-radius:14px; background:#fff; border:1px solid rgba(26,23,21,.1); }
.sub .row{ display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
.sub label{ display:flex; align-items:center; gap:6px; font-weight:600; font-size:13px; }
.sub input[type=number]{ width:78px; height:36px; padding:0 8px; border-radius:10px; border:1px solid rgba(26,23,21,.2); font:600 15px inherit; font-family:inherit; text-align:center; background:#fbf8f4; }
.sub input[type=range]{ flex:1; min-width:140px; accent-color:#7a2632; }
.sub p{ margin:8px 0 0; font-size:12.5px; color:#6b625b; }
.fil{ display:flex; gap:6px; padding:0 14px 8px; overflow-x:auto; scrollbar-width:none; }
.fil button{ flex:0 0 auto; border:0; background:transparent; padding:4px 9px; border-radius:999px; font-size:12px; font-weight:600; color:#6b625b; cursor:pointer; }
.fil button.on{ background:rgba(122,38,50,.1); color:#7a2632; }
.tiles{ display:flex; gap:10px; overflow-x:auto; padding:3px 14px 12px; scroll-snap-type:x proximity; scrollbar-width:none; }
.tl{ position:relative; flex:0 0 60px; width:60px; padding:0; border:0; background:none; cursor:pointer; scroll-snap-align:start; text-align:center; }
.tl i{ display:block; width:60px; height:60px; border-radius:12px; overflow:hidden; background:var(--c); box-shadow:inset 0 0 0 1px rgba(0,0,0,.08); }
.tl img{ width:100%; height:100%; object-fit:cover; display:block; }
.tl span{ display:none; }
.tl[aria-selected="true"] i{ box-shadow:0 0 0 2px #f4efe8, 0 0 0 4px #7a2632; }
.tl.cur::after{ content:''; position:absolute; top:-3px; right:-3px; width:12px; height:12px; border-radius:50%; background:#7a2632; box-shadow:0 0 0 2px #f4efe8; }
.foot{ display:flex; align-items:center; gap:12px; padding:10px 14px 0; border-top:1px solid rgba(26,23,21,.08); }
.fi{ flex:1; min-width:0; }
.fi b{ display:block; font:600 15px/1.25 var(--mm-head, 'Instrument Sans'), sans-serif; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.fi span{ display:block; font-size:12.5px; color:#6b625b; }
.cta{ flex:0 0 auto; display:inline-flex; align-items:center; justify-content:center; height:46px; padding:0 18px; border-radius:999px; border:0; background:#7a2632; color:#fff; font-weight:700; font-size:14px; text-decoration:none; cursor:pointer; box-shadow:0 6px 16px rgba(122,38,50,.28); }
.cta:hover{ background:#45111c; }
.cta[aria-busy="true"]{ opacity:.7; }

.hint{ position:absolute; top:14px; left:50%; transform:translateX(-50%); max-width:calc(100% - 28px); padding:9px 15px; border-radius:999px; background:rgba(15,13,12,.74); color:#fff; font-weight:600; font-size:13px; text-align:center; pointer-events:none; -webkit-backdrop-filter:blur(8px); backdrop-filter:blur(8px); z-index:3; transition:opacity .3s; }
.toast{ position:absolute; left:50%; bottom:28px; transform:translate(-50%, 20px); max-width:calc(100% - 28px); padding:11px 16px; border-radius:12px; background:#1a1715; color:#fff; font-size:13px; opacity:0; transition:opacity .25s, transform .25s; pointer-events:none; z-index:6; text-align:center; }
.toast.on{ opacity:1; transform:translate(-50%, 0); }
.load{ position:absolute; inset:0; display:grid; place-items:center; background:rgba(15,13,12,.35); z-index:5; }
.load i{ width:38px; height:38px; border-radius:50%; border:3px solid rgba(255,255,255,.25); border-top-color:#fff; animation:tr .8s linear infinite; }
@keyframes tr{ to{ transform:rotate(360deg); } }
.m{ position:absolute; inset:0; }

/* --- Mon mur --- */
.pe{ position:absolute; inset:0; display:grid; place-items:center; padding:18px; overflow:auto; }
.pe-bg{ position:absolute; inset:0; background:var(--tex) center/170px repeat; filter:brightness(.42) saturate(.9); }
.pe-c{ position:relative; width:100%; max-width:390px; background:#f4efe8; border-radius:22px; padding:22px 18px 16px; text-align:center; box-shadow:0 24px 60px rgba(0,0,0,.4); }
.pe-c h2{ margin:0 0 6px; font:500 22px/1.15 var(--mm-head, 'Instrument Sans'), sans-serif; letter-spacing:-.01em; }
.pe-c h2 em{ font-family:var(--mm-accent-font, 'Playfair Display'), serif; font-style:italic; font-weight:400; color:#7a2632; }
.pe-c > p{ margin:0 0 14px; color:#5c544e; font-size:13.5px; }
.btn{ display:flex; width:100%; min-height:50px; align-items:center; justify-content:center; gap:10px; margin-top:9px; padding:0 16px; border-radius:14px; border:1px solid rgba(26,23,21,.14); background:#fff; font-weight:600; font-size:15px; color:#1a1715; cursor:pointer; position:relative; }
.btn.pri{ background:#7a2632; border-color:#7a2632; color:#fff; box-shadow:0 8px 18px rgba(122,38,50,.3); }
.btn input{ position:absolute; inset:0; opacity:0; cursor:pointer; width:100%; }
.lnk{ margin-top:12px; border:0; background:none; color:#7a2632; font-weight:700; font-size:13.5px; text-decoration:underline; text-underline-offset:3px; cursor:pointer; }
.conseil{ margin:12px 0 0; padding:10px 12px; border-radius:12px; background:#f6e9eb; border:1px solid rgba(122,38,50,.18); color:#45111c; font-size:12.5px; line-height:1.4; text-align:left; }
.conseil b{ display:block; margin-bottom:2px; font-size:11px; font-weight:800; letter-spacing:.12em; text-transform:uppercase; color:#7a2632; }
.tips{ display:flex; justify-content:center; gap:14px; flex-wrap:wrap; margin:14px 0 0; padding:12px 0 0; border-top:1px solid rgba(26,23,21,.08); list-style:none; font-size:12px; color:#6b625b; }
.tips li::before{ content:'✓ '; color:#7a2632; font-weight:700; }
.pv{ position:absolute; inset:0; touch-action:none; user-select:none; -webkit-user-select:none; }
.pv canvas.cv{ position:absolute; display:block; }
.pv svg{ position:absolute; inset:0; width:100%; height:100%; pointer-events:none; overflow:visible; }
.pv polygon{ fill:none; stroke:#fff; stroke-width:1.6; stroke-dasharray:6 5; filter:drop-shadow(0 1px 2px rgba(0,0,0,.6)); }
.hd{ position:absolute; width:48px; height:48px; margin:-24px 0 0 -24px; border-radius:50%; touch-action:none; cursor:grab; z-index:3; }
.hd::before{ content:''; position:absolute; inset:15px; border-radius:50%; background:#fff; box-shadow:0 0 0 2.5px #7a2632, 0 2px 10px rgba(0,0,0,.45); }
.hd:active{ cursor:grabbing; }
.split{ position:absolute; top:0; bottom:0; width:48px; margin-left:-24px; touch-action:none; cursor:ew-resize; z-index:4; }
.split::before{ content:''; position:absolute; top:0; bottom:0; left:23px; width:2px; background:#fff; box-shadow:0 0 6px rgba(0,0,0,.5); }
.split b{ position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); display:flex; gap:2px; padding:7px 10px; border-radius:999px; background:#fff; color:#1a1715; font-size:11px; font-weight:700; white-space:nowrap; box-shadow:0 3px 12px rgba(0,0,0,.35); }
.loupe{ position:absolute; width:116px; height:116px; border-radius:50%; border:3px solid #fff; box-shadow:0 6px 20px rgba(0,0,0,.45); pointer-events:none; z-index:5; }
.live{ position:absolute; left:0; right:0; bottom:26px; display:flex; justify-content:center; gap:10px; z-index:4; }
.live button{ height:48px; padding:0 20px; border-radius:999px; border:0; font-weight:700; font-size:14px; cursor:pointer; }
.live .fg{ background:#fff; color:#1a1715; box-shadow:0 6px 18px rgba(0,0,0,.35); }
.live .st{ background:rgba(15,13,12,.7); color:#fff; }

/* --- Pièce 3D --- */
.p3{ position:absolute; inset:0; }
.p3 canvas{ display:block; width:100%; height:100%; touch-action:none; }
.badge{ position:absolute; left:12px; bottom:28px; padding:7px 11px; border-radius:10px; background:rgba(255,255,255,.88); color:#1a1715; font-size:12px; font-weight:600; z-index:2; pointer-events:none; }


@media (min-width:600px){
  .tab .lg{ display:inline; } .tab .sm{ display:none; }
}
@media (min-width:960px){
  .top{ padding:10px 18px; }
  .ttl{ display:block; }
  .top .sp{ flex:0 0 180px; }
  .main{ flex-direction:row; }
  .dock{ width:390px; flex:0 0 390px; margin:0; border-radius:0; overflow-y:auto; display:flex; flex-direction:column; padding:18px 0; box-shadow:none; }
  .dock > *{ flex-shrink:0; }
  .tools{ flex-wrap:wrap; overflow:visible; }
  .tiles{ flex-wrap:wrap; overflow:visible; gap:12px 10px; }
  .tl{ flex:0 0 calc(25% - 8px); width:auto; }
  .tl i{ width:100%; height:auto; aspect-ratio:1; }
  .tl span{ display:block; margin-top:5px; font-size:11px; line-height:1.2; color:#4b443e; }
  .foot{ margin-top:auto; padding-top:14px; flex-wrap:wrap; }
  .cta{ width:100%; }
  .stage{ border-radius:0; }
}
`;

class Visualiseur {
  constructor(o) {
    this.o = o;
    this.produits = (o.produits || []).filter((p) => TUILES[p.h]);
    this.parH = new Map(this.produits.map((p) => [p.h, p]));
    this.courant = o.courant;
    this.h = this.parH.has(o.courant) ? o.courant : (this.produits[0] || {}).h;
    this.fmt = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: o.devise || 'EUR' });
    this.modes = {};
    this.jeton = 0;
    this.monter();
  }

  $(s) { return this.root.querySelector(s); }
  $$(s) { return [...this.root.querySelectorAll(s)]; }

  monter() {
    const hote = document.createElement('div');
    hote.id = 'mm-mur-3d';
    hote.style.cssText = 'position:fixed;inset:0;z-index:2147483647;display:none;';
    document.body.appendChild(hote);
    this.hote = hote;
    const r = hote.attachShadow({ mode: 'open' });
    this.root = r;
    r.innerHTML = `<style>${CSS}</style>
<div class="mv" role="dialog" aria-modal="true" aria-label="Voir le carrelage sur votre mur">
  <header class="top">
    <button class="x" type="button" aria-label="Fermer">${ICO.x}</button>
    <span class="ttl">Voir sur <em>mon mur</em></span>
    <nav class="tabs"><div class="tabs-in" role="tablist">
      <button class="tab" role="tab" data-tab="photo" aria-selected="true">Mon mur</button>
      <button class="tab" role="tab" data-tab="piece" aria-selected="false">Pièce 3D</button>
    </div></nav>
    <span class="sp"></span>
  </header>
  <div class="main">
    <section class="stage">
      <div class="m m-photo"></div>
      <div class="m m-piece" hidden></div>
      <div class="load" hidden><i></i></div>
      <div class="toast" role="status"></div>
    </section>
    <aside class="dock">
      <div class="tools"></div>
      <div class="subs"></div>
      <div class="fil"></div>
      <div class="tiles" role="listbox" aria-label="Choisir un carrelage"></div>
      <div class="foot">
        <div class="fi"><b></b><span></span></div>
        <a class="cta" href="#"></a>
      </div>
    </aside>
  </div>
</div>`;
    this.$('.x').addEventListener('click', () => this.fermer());
    this.$$('.tab').forEach((b) => b.addEventListener('click', () => this.mode(b.dataset.tab)));
    this.onKey = (e) => { if (e.key === 'Escape') this.fermer(); };
    this.construireTuiles();
    this.$('.cta').addEventListener('click', (e) => this.action(e));
  }

  construireTuiles() {
    const fams = [];
    for (const p of this.produits) {
      const m = nomCourt(p.t).marque;
      if (!fams.includes(m)) fams.push(m);
    }
    const fil = this.$('.fil');
    fil.innerHTML = ['Tous', ...fams].map((f, i) => `<button type="button" class="${i ? '' : 'on'}" data-f="${i ? f : ''}">${f}</button>`).join('');
    fil.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      fil.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      this.$$('.tl').forEach((t) => { t.hidden = !!b.dataset.f && t.dataset.m !== b.dataset.f; });
    });
    const tl = this.$('.tiles');
    tl.innerHTML = this.produits.map((p) => {
      const n = nomCourt(p.t);
      return `<button type="button" class="tl${p.h === this.courant ? ' cur' : ''}" role="option" data-h="${p.h}" data-m="${n.marque}" aria-selected="false" title="${n.marque} · ${n.couleur}" style="--c:${TUILES[p.h].c}">
        <i><img src="${asset('mm-mur-' + p.h + '-t.jpg')}" alt="" loading="lazy" width="120" height="120"></i><span>${n.couleur}</span></button>`;
    }).join('');
    tl.addEventListener('click', (e) => {
      const b = e.target.closest('.tl');
      if (b) this.choisir(b.dataset.h);
    });
  }

  ouvrir(o = {}) {
    if (o.courant && this.parH.has(o.courant) && o.courant !== this.courant) {
      this.courant = o.courant;
      this.$$('.tl').forEach((t) => t.classList.toggle('cur', t.dataset.h === this.courant));
    }
    if (o.carreau && this.parH.has(o.carreau)) this.h = o.carreau;
    else if (o.courant && this.parH.has(o.courant)) this.h = o.courant;
    // toujours au premier plan (bandeau cookies, bulles de chat) : dernier élément du body
    document.body.appendChild(this.hote);
    this.hote.style.display = 'block';
    this.ancienOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.addEventListener('keydown', this.onKey);
    requestAnimationFrame(() => this.$('.mv').classList.add('on'));
    if (!this.ouvert) {
      try { history.pushState({ mmMur: 1 }, ''); } catch (e) { /* navigation privée */ }
      this.onPop = () => { if (this.ouvert) this.fermer(true); };
      window.addEventListener('popstate', this.onPop);
    }
    this.ouvert = true;
    this.choisir(this.h, true);
    const m = o.mode === 'piece' ? 'piece' : 'photo';
    this.mode(m, true);
    if (o.mode === 'demo') this.modes.photo.demo();
    this.$('.x').focus({ preventScroll: true });
  }

  fermer(depuisHistorique) {
    if (!this.ouvert) return;
    this.ouvert = false;
    window.removeEventListener('popstate', this.onPop);
    if (!depuisHistorique && history.state && history.state.mmMur) history.back();
    this.$('.mv').classList.remove('on');
    Object.values(this.modes).forEach((m) => m.sortir && m.sortir());
    document.removeEventListener('keydown', this.onKey);
    document.documentElement.style.overflow = this.ancienOverflow || '';
    setTimeout(() => { if (!this.ouvert) this.hote.style.display = 'none'; }, 250);
  }

  chargement(on) { this.$('.load').hidden = !on; }

  toast(t, ms = 3200) {
    const el = this.$('.toast');
    el.textContent = t;
    el.classList.add('on');
    clearTimeout(this.tt);
    this.tt = setTimeout(() => el.classList.remove('on'), ms);
  }

  // pose normale uniquement, comme le produit est vendu
  pose() {
    return 'droite';
  }

  async tuile() {
    return composer(this.h, this.pose());
  }

  async choisir(h, silencieux) {
    if (!this.parH.has(h)) return;
    this.h = h;
    this.$$('.tl').forEach((t) => t.setAttribute('aria-selected', t.dataset.h === h ? 'true' : 'false'));
    const sel = this.$(`.tl[data-h="${h}"]`);
    if (sel) {
      const tl = this.$('.tiles');
      if (tl.scrollWidth > tl.clientWidth) tl.scrollTo({ left: sel.offsetLeft - (tl.clientWidth - sel.offsetWidth) / 2, behavior: silencieux ? 'auto' : 'smooth' });
    }
    this.majPied();
    const m = this.modes[this.mmode];
    if (m && m.setTuile) {
      const id = ++this.jeton;
      try {
        const tx = await this.tuile();
        if (id === this.jeton) m.setTuile(tx);
      } catch (e) { this.toast('Ce carrelage n’a pas pu être chargé.'); }
    }
    if (m && m.outils) m.outils();
  }

  async mode(nom, force) {
    if (this.mmode === nom && !force) return;
    if (this.mmode && this.modes[this.mmode]) this.modes[this.mmode].sortir();
    this.mmode = nom;
    this.$$('.tab').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === nom ? 'true' : 'false'));
    ['photo', 'piece'].forEach((n) => { this.$('.m-' + n).hidden = n !== nom; });
    if (!this.modes[nom]) this.modes[nom] = new ({ photo: ModePhoto, piece: ModePiece })[nom](this, this.$('.m-' + nom));
    const m = this.modes[nom];
    this.$('.subs').innerHTML = '';
    m.outils();
    this.majPied();
    await m.entrer();
    this.jeton = (this.jeton || 0) + 1;
    try {
      const tx = await this.tuile();
      if (this.mmode === nom) m.setTuile(tx);
    } catch (e) { console.error(e); this.toast('Chargement impossible, vérifiez votre connexion.'); }
  }

  scene() {
    if (!this.pScene) {
      this.pScene = import(this.o.scene || asset('mm-mur-3d-scene.js')).catch((e) => { this.pScene = null; throw e; });
    }
    return this.pScene;
  }

  /* --- pied : nom, prix et action --- */
  majPied() {
    const p = this.parH.get(this.h);
    if (!p) return;
    const n = nomCourt(p.t);
    this.$('.fi b').textContent = `${n.marque} · ${n.couleur}`;
    const cta = this.$('.cta');
    this.$('.fi span').textContent = `à partir de ${this.fmt.format(p.prix / 100)} · plaque ${fr(TUILES[p.h].p[0], 1).replace(',0', '')} × ${fr(TUILES[p.h].p[1], 1).replace(',0', '')} cm`;
    if (this.o.boutique) {
      cta.textContent = 'Voir sur la boutique';
      cta.href = p.u;
      cta.target = '_blank';
      cta.dataset.act = 'lien';
    } else if (p.h === this.courant) { cta.textContent = 'Choisir ma quantité'; cta.href = '#'; cta.dataset.act = 'fermer'; }
    else { cta.textContent = 'Voir ce carrelage'; cta.href = p.u + (p.u.includes('?') ? '&' : '?') + 'mur3d=' + (this.mmode || 'photo'); cta.dataset.act = 'lien'; }
  }

  action(e) {
    if (e.currentTarget.dataset.act !== 'fermer') return;
    e.preventDefault();
    this.fermer();
    const f = document.querySelector('[data-lot-picker], .mm-lots, product-form, form[action*="/cart/add"]');
    if (f) setTimeout(() => f.scrollIntoView({ behavior: 'smooth', block: 'center' }), 280);
  }
}

/* ------------------------------------------------------------------ */
/* Mode « Mon mur » : photo ou vidéo                                    */
/* ------------------------------------------------------------------ */

class ModePhoto {
  constructor(v, el) {
    this.v = v; this.el = el;
    this.etat = 'vide';
    this.dim = [300, 250];
    this.expo = 1;
    this.retouche = null;   // 'montrer' | 'carreler' quand le client retouche au doigt
    this.pinceau = 0.035;   // rayon du pinceau, en part du petit côté de la photo
    this.coins = true;      // points des coins affichés (à faire glisser) ; « Enlever les points » pour le rendu final
    this.split = 0;
    this.reveal = 9;
    const live = v.o.video !== false && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    const tactile = matchMedia('(pointer:coarse)').matches;
    el.innerHTML = `
<div class="pe">
  <div class="pe-bg"></div>
  <div class="pe-c">
    <h2>Votre mur, <em>avec ce carrelage</em></h2>
    <p>Photographiez votre mur : le carrelage s’y pose en taille réelle, avec la lumière de votre pièce.</p>
    ${tactile ? `<label class="btn pri">${ICO.cam}<span>Prendre une photo</span><input type="file" accept="image/*" capture="environment" data-f></label>` : ''}
    <label class="btn${tactile ? '' : ' pri'}">${ICO.img}<span>${tactile ? 'Choisir une photo' : 'Importer une photo de mon mur'}</span><input type="file" accept="image/*" data-f></label>
    ${live ? `<button type="button" class="btn" data-live>${ICO.vid}<span>${tactile ? 'Filmer mon mur en direct' : 'Utiliser ma webcam'}</span></button>` : ''}
    <button type="button" class="lnk" data-demo>Essayer avec une photo exemple</button>
    <p class="conseil"><b>Conseillé :</b> retirez les objets et accessoires déplaçables devant le mur pour avoir le meilleur rendu.</p>
    <ul class="tips"><li>Mur de face, en entier</li><li>Lumière du jour</li><li>Sans flash</li></ul>
  </div>
</div>
<div class="pv" hidden>
  <canvas class="cv"></canvas>
  <svg aria-hidden="true"><polygon points=""/></svg>
  <div class="hd" data-i="0"></div><div class="hd" data-i="1"></div><div class="hd" data-i="2"></div><div class="hd" data-i="3"></div>
  <div class="split" hidden><b>Avant · Après</b></div>
  <canvas class="loupe" width="232" height="232" hidden></canvas>
  <div class="hint"></div>
  <div class="live" hidden><button type="button" class="fg" data-figer>Figer l’image</button><button type="button" class="st" data-stop>Arrêter</button></div>
</div>`;
    this.pe = el.querySelector('.pe');
    this.pv = el.querySelector('.pv');
    this.cv = el.querySelector('.cv');
    this.poly = el.querySelector('polygon');
    this.hds = [...el.querySelectorAll('.hd')];
    this.hint = el.querySelector('.hint');
    this.loupe = el.querySelector('.loupe');
    this.splitEl = el.querySelector('.split');
    el.querySelectorAll('[data-f]').forEach((i) => i.addEventListener('change', () => {
      if (i.files && i.files[0]) this.fichier(i.files[0]);
      i.value = '';
    }));
    const bl = el.querySelector('[data-live]');
    if (bl) bl.addEventListener('click', () => this.video());
    el.querySelector('[data-demo]').addEventListener('click', () => this.demo());
    el.querySelector('[data-figer]').addEventListener('click', () => this.figer());
    el.querySelector('[data-stop]').addEventListener('click', () => this.arreterVideo(true));
    this.brancherGestes();
    this.ro = new ResizeObserver(() => this.placer());
    this.ro.observe(this.pv);
  }

  entrer() {
    this.pe.querySelector('.pe-bg').style.setProperty('--tex', `url("${asset('mm-mur-' + this.v.h + '-t.jpg')}")`);
    if (this.etat !== 'vide') this.demander();
  }

  sortir() { this.arreterVideo(false); }

  setTuile(tx) {
    this.tx = tx;
    this.pe.querySelector('.pe-bg').style.setProperty('--tex', `url("${asset('mm-mur-' + tx.h + '-t.jpg')}")`);
    if (!this.r) return;
    this.r.setTuile(tx);
    this.r.setOrigine(this.dim, tx.m);
    this.majSub();
    this.demander();
  }

  /* --- barre d'outils --- */
  outils() {
    const t = this.v.$('.tools');
    if (this.etat === 'vide') { t.innerHTML = ''; this.v.$('.subs').innerHTML = ''; return; }
    const pret = !!this.quad;
    t.innerHTML = `
      <button type="button" class="chip ava${this.split > 0 ? ' on' : ''}" data-act="split"${pret ? '' : ' disabled'}>${ICO.ava} Avant / après</button>
      <button type="button" class="chip pri" data-act="save"${pret && this.etat === 'photo' ? '' : ' disabled'}>${ICO.dl} Enregistrer l’image</button>
      <button type="button" class="chip" data-act="coins"${pret ? '' : ' disabled'}>${this.coins ? 'Enlever les points' : 'Remettre les points'}</button>
      <button type="button" class="chip${this.sub === 'lum' ? ' on' : ''}" data-sub="lum"${pret ? '' : ' disabled'}>Lumière</button>
      <button type="button" class="chip" data-act="zone"${pret ? '' : ' disabled'}>Nouvelle zone</button>
      <button type="button" class="chip${this.sub === 'ret' ? ' on' : ''}" data-sub="ret"${pret ? '' : ' disabled'}>Retoucher</button>
      <button type="button" class="chip" data-act="nouv">Nouvelle photo</button>`;
    t.querySelectorAll('[data-sub]').forEach((b) => b.addEventListener('click', () => {
      this.sub = this.sub === b.dataset.sub ? null : b.dataset.sub;
      this.retouche = this.sub === 'ret' ? this.retouche || 'montrer' : null;
      this.hint.textContent = 'Passez le doigt sur ce qui doit rester visible';
      this.hint.style.opacity = this.retouche ? 1 : 0;
      this.placer();
      this.outils();
    }));
    t.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => this.act(b.dataset.act)));
    this.majSub();
  }

  majSub() {
    const s = this.v.$('.subs');
    if (this.v.mmode !== 'photo') return;
    if (!this.sub || this.etat === 'vide') { s.innerHTML = ''; return; }
    if (this.sub === 'lum') {
      if (!s.querySelector('[data-expo]')) {
        s.innerHTML = `<div class="sub"><div class="row"><label for="mmx">Luminosité</label><input id="mmx" type="range" min="60" max="140" value="${Math.round(this.expo * 100)}" data-expo></div>
          <p>La lumière de votre photo est reproduite automatiquement ; affinez si besoin.</p></div>`;
        s.querySelector('[data-expo]').addEventListener('input', (e) => { this.expo = e.target.value / 100; this.demander(); });
      }
    } else if (this.sub === 'ret') {
      if (!s.querySelector('[data-r]')) {
        s.innerHTML = `<div class="sub"><div class="row">
          <button type="button" class="chip${this.retouche === 'montrer' ? ' on' : ''}" data-r="montrer">Montrer la photo</button>
          <button type="button" class="chip${this.retouche === 'carreler' ? ' on' : ''}" data-r="carreler">Remettre le carrelage</button>
          <button type="button" class="chip" data-r="annuler">Tout annuler</button></div>
          <div class="row" style="margin-top:10px"><label for="mmp">Pinceau</label><input id="mmp" type="range" min="1" max="10" value="${Math.round(this.pinceau * 100)}" data-p></div>
          <p>Passez le doigt sur un objet pour le faire réapparaître devant le carrelage (miroir, robinet, cadre…), ou sur un oubli pour le carreler.</p></div>`;
        s.querySelectorAll('[data-r]').forEach((b) => b.addEventListener('click', () => {
          if (b.dataset.r === 'annuler') { this.ov = null; this.appliquerRetouches(); this.majTout(); return; }
          this.retouche = b.dataset.r;
          this.hint.textContent = this.retouche === 'montrer' ? 'Passez le doigt sur ce qui doit rester visible' : 'Passez le doigt là où il manque du carrelage';
          this.hint.style.opacity = 1;
          s.innerHTML = '';
          this.majSub();
        }));
        s.querySelector('[data-p]').addEventListener('input', (e) => { this.pinceau = e.target.value / 100; });
      }
    }
  }

  act(a) {
    if (a === 'coins') { this.coins = !this.coins; this.placer(); this.outils(); }
    if (a === 'split') { this.split = this.split > 0 ? 0 : 0.5; this.placer(); this.demander(); this.outils(); }
    if (a === 'nouv') { this.arreterVideo(false); this.etat = 'vide'; this.quad = null; this.pv.hidden = true; this.pe.hidden = false; this.sub = null; this.outils(); this.v.majPied(); }
    if (a === 'save') this.enregistrer();
    if (a === 'zone') this.nouvelleZone();
  }

  /* --- sources --- */
  initRendu() {
    if (this.r) return true;
    try {
      this.r = new RenduMur(this.cv);
      if (this.tx) this.r.setTuile(this.tx);
      return true;
    } catch (e) {
      console.error(e);
      this.v.toast('Votre navigateur ne permet pas l’aperçu 3D (WebGL désactivé).', 5000);
      return false;
    }
  }

  async fichier(f) {
    this.v.chargement(true);
    const u = URL.createObjectURL(f);
    try {
      const img = await image(u, false);
      this.poser(img, img.naturalWidth, img.naturalHeight);
    } catch (e) {
      this.v.toast('Cette photo n’a pas pu être lue. Essayez en JPEG ou PNG.');
    } finally {
      URL.revokeObjectURL(u);
      this.v.chargement(false);
    }
  }

  async demo() {
    this.v.chargement(true);
    try {
      const img = await image(this.v.o.demo || asset('mm-mur-demo.jpg'));
      this.poser(img, img.naturalWidth, img.naturalHeight);
      const k = this.sw / 1600;
      this.dim = [DEMO.largeur, DEMO.largeur];
      this.placement = DEMO.quad.map(([x, y]) => [x * k, y * k]);
      this.finaliserZone(true);
    } catch (e) {
      this.v.toast('La photo exemple n’a pas pu être chargée.');
    } finally {
      this.v.chargement(false);
    }
  }

  poser(src, w0, h0, garder) {
    if (!this.initRendu()) return;
    const s = Math.min(1, 2048 / Math.max(w0, h0));
    const w = Math.round(w0 * s), h = Math.round(h0 * s);
    const c = canvas(w, h);
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(src, 0, 0, w, h);
    this.src = c; this.sw = w; this.sh = h;
    this.cv.width = w; this.cv.height = h;
    this.r.setPhoto(c, w, h);
    this.analyse(c, 480);
    this.etat = 'photo';
    if (!garder) { this.quad = null; this.ov = null; this.mf = null; this.manuel = false; }
    this.pe.hidden = true; this.pv.hidden = false;
    this.el.querySelector('.live').hidden = true;
    this.placement = [];
    this.viseur = null;
    this.aidePose();
    this.hint.style.opacity = garder && this.quad ? 0 : 1;
    this.placer();
    this.outils();
    if (garder && this.quad) this.majTout();
    else this.demander();
  }

  // copies réduites pour la détection (≈480 px) et l'éclairage (≈128 px)
  analyse(src, taille) {
    const sw = src.videoWidth || src.width, sh = src.videoHeight || src.height;
    const k = taille / Math.max(sw, sh);
    this.segW = Math.max(8, Math.round(sw * k)); this.segH = Math.max(8, Math.round(sh * k));
    if (!this.cSeg || this.cSeg.width !== this.segW || this.cSeg.height !== this.segH) this.cSeg = canvas(this.segW, this.segH);
    const g = this.cSeg.getContext('2d', { willReadFrequently: true });
    g.imageSmoothingQuality = 'medium';
    g.drawImage(src, 0, 0, this.segW, this.segH);
    this.pxSeg = g.getImageData(0, 0, this.segW, this.segH).data;
    const kl = 128 / Math.max(sw, sh);
    const lw = Math.max(8, Math.round(sw * kl)), lh = Math.max(8, Math.round(sh * kl));
    if (!this.cLow || this.cLow.width !== lw) this.cLow = canvas(lw, lh);
    const gl = this.cLow.getContext('2d', { willReadFrequently: true });
    gl.drawImage(this.cSeg, 0, 0, lw, lh);
    this.pxLow = gl.getImageData(0, 0, lw, lh).data;
  }

  /* --- retouches et géométrie --- */
  // le carrelage couvre toute la zone encadrée, sauf là où le client a montré la photo au doigt
  appliquerRetouches() {
    if (!this.ov) { this.mf = null; this.r.setMasque(null); return; }
    const W = this.segW, H = this.segH;
    const m = new Uint8Array(W * H).fill(1);
    for (let i = 0; i < m.length; i++) { if (this.ov[i] > 0) m[i] = 1; else if (this.ov[i] < 0) m[i] = 0; }
    this.mf = { m, w: W, h: H };
    this.r.setMasque(this.mf);
  }

  // un coup de pinceau (coordonnées de la photo) entre deux points
  peindre(a, b) {
    const W = this.segW, H = this.segH, k = W / this.sw;
    if (!this.ov || this.ov.length !== W * H) this.ov = new Int8Array(W * H);
    const v = this.retouche === 'carreler' ? 1 : -1;
    const rp = Math.max(2, this.pinceau * Math.min(W, H));
    const x0 = a[0] * k, y0 = a[1] * k, x1 = b[0] * k, y1 = b[1] * k;
    const pas = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / (rp / 3)));
    for (let s = 0; s <= pas; s++) {
      const cx = x0 + (x1 - x0) * s / pas, cy = y0 + (y1 - y0) * s / pas;
      for (let y = Math.max(0, Math.floor(cy - rp)); y <= Math.min(H - 1, Math.ceil(cy + rp)); y++) {
        for (let x = Math.max(0, Math.floor(cx - rp)); x <= Math.min(W - 1, Math.ceil(cx + rp)); x++) {
          if ((x - cx) * (x - cx) + (y - cy) * (y - cy) <= rp * rp) this.ov[y * W + x] = v;
        }
      }
    }
    if (!this.rafPeint) {
      this.rafPeint = requestAnimationFrame(() => { this.rafPeint = 0; this.appliquerRetouches(); this.dessiner(); });
    }
  }

  zone() {
    const inv = inverse3(homographie(this.quad));
    const m = this.mf;
    const marge = 0;
    return (u, v) => {
      const x = u * this.sw, y = v * this.sh;
      const z = inv[6] * x + inv[7] * y + inv[8];
      const a = (inv[0] * x + inv[1] * y + inv[2]) / z, b = (inv[3] * x + inv[4] * y + inv[5]) / z;
      if (z <= 0 || a < -marge || a > 1 + marge || b < -marge || b > 1 + marge) return 0;
      if (!m) return 1;
      return m.m[Math.min(m.h - 1, (v * m.h) | 0) * m.w + Math.min(m.w - 1, (u * m.w) | 0)];
    };
  }

  majTout() {
    if (!this.quad) return;
    this.appliquerRetouches();
    this.r.setEclairage(eclairage(this.pxLow, this.cLow.width, this.cLow.height, this.zone(), !this.mf));
    this.geometrie();
  }

  geometrie() {
    if (!this.quad || !this.r) return;
    this.r.setGeometrie(this.quad, this.dim, 0);
    if (this.tx) this.r.setOrigine(this.dim, this.tx.m);
    this.placer();
    this.demander();
    this.v.majPied();
  }

  animReveal() {
    const t0 = performance.now();
    const pas = (t) => {
      const k = Math.min(1, (t - t0) / 1100);
      this.reveal = 1.7 * (1 - Math.pow(1 - k, 3));
      this.dessiner();
      if (k < 1) requestAnimationFrame(pas);
      else this.reveal = 9;
    };
    requestAnimationFrame(pas);
  }

  demander() {
    if (this.raf || this.etat === 'vide') return;
    this.raf = requestAnimationFrame(() => { this.raf = 0; this.dessiner(); });
  }

  dessiner() {
    if (!this.r || this.etat === 'vide') return;
    this.r.rendu({ actif: !!this.quad && !!this.tx, expo: this.expo, split: this.split, reveal: this.reveal, graine: this.revealGraine || [0.5, 0.5] });
  }

  /* --- mise en page des poignées --- */
  rect() {
    const W = this.pv.clientWidth, H = this.pv.clientHeight;
    if (!this.sw || !W) return null;
    const s = Math.min(W / this.sw, H / this.sh);
    const w = this.sw * s, h = this.sh * s;
    return { x: (W - w) / 2, y: (H - h) / 2, s, w, h };
  }

  placer() {
    const r = this.rect();
    if (!r) return;
    Object.assign(this.cv.style, { left: r.x + 'px', top: r.y + 'px', width: r.w + 'px', height: r.h + 'px' });
    const enPose = !this.quad ? (this.placement || []).concat(this.viseur ? [this.viseur] : []) : null;
    const pts = this.quad ? (this.coins && !this.retouche ? this.quad : []) : enPose;
    this.hds.forEach((hd, i) => {
      hd.hidden = !pts[i];
      if (pts[i]) { hd.style.left = (r.x + pts[i][0] * r.s) + 'px'; hd.style.top = (r.y + pts[i][1] * r.s) + 'px'; }
    });
    this.poly.setAttribute('points', pts.length > 1 ? pts.map(([x, y]) => `${r.x + x * r.s},${r.y + y * r.s}`).join(' ') : '');
    this.splitEl.hidden = !(this.split > 0 && this.quad);
    if (this.split > 0) this.splitEl.style.left = (r.x + this.split * r.w) + 'px';
  }

  versImage(e) {
    const r = this.rect(), b = this.pv.getBoundingClientRect();
    return [(e.clientX - b.left - r.x) / r.s, (e.clientY - b.top - r.y) / r.s];
  }

  brancherGestes() {
    let drag = null;
    this.pv.addEventListener('pointerdown', (e) => {
      if (this.etat === 'vide' || e.target.closest('button')) return;
      const hd = e.target.closest('.hd'), sp = e.target.closest('.split');
      if (this.retouche && this.quad && this.etat === 'photo' && !sp) {
        const [x, y] = this.versImage(e);
        drag = { t: 'peint', der: [x, y] };
        this.peindre(drag.der, drag.der);
        this.montrerLoupe(e, x, y, true);
      } else if (hd && this.quad) drag = { t: 'coin', i: +hd.dataset.i };
      else if (sp) drag = { t: 'split' };
      else if (this.etat === 'photo' && !this.quad) {
        // pose d'un coin : le doigt peut glisser, la loupe montre où tombe le point
        drag = { t: 'pose' };
        const [x, y] = this.versImage(e);
        this.viseur = [clamp(x, 0, this.sw), clamp(y, 0, this.sh)];
        this.placer();
        this.montrerLoupe(e, x, y);
      } else return;
      this.pv.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    this.pv.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const [x, y] = this.versImage(e);
      if (drag.t === 'coin') {
        this.quad[drag.i] = [clamp(x, -0.1 * this.sw, 1.1 * this.sw), clamp(y, -0.1 * this.sh, 1.1 * this.sh)];
        this.manuel = true;
        this.majCoin();
        this.montrerLoupe(e, x, y);
      } else if (drag.t === 'split') {
        this.split = clamp(x / this.sw, 0.001, 1);
        this.placer();
        this.demander();
      } else if (drag.t === 'pose') {
        this.viseur = [clamp(x, 0, this.sw), clamp(y, 0, this.sh)];
        this.placer();
        this.montrerLoupe(e, x, y);
      } else if (drag.t === 'peint') {
        this.peindre(drag.der, [x, y]);
        drag.der = [x, y];
        this.montrerLoupe(e, x, y, true);
      }
    });
    const fin = (e) => {
      if (!drag) return;
      if (drag.t === 'pose' && this.viseur) {
        this.loupe.hidden = true;
        this.placement.push(this.viseur);
        this.viseur = null;
        if (this.placement.length === 4) this.finaliserZone();
        else { this.aidePose(); this.placer(); }
      }
      if (drag.t === 'coin') { this.loupe.hidden = true; this.majTout(); }
      if (drag.t === 'peint') {
        this.loupe.hidden = true;
        this.appliquerRetouches();
        this.r.setEclairage(eclairage(this.pxLow, this.cLow.width, this.cLow.height, this.zone(), !this.mf));
        this.demander();
      }
      drag = null;
    };
    this.pv.addEventListener('pointerup', fin);
    this.pv.addEventListener('pointercancel', fin);
  }

  aidePose() {
    const n = this.placement.length;
    this.hint.textContent = n === 0 ? 'Touchez les 4 coins de la zone à carreler' : `Coin ${n + 1} sur 4 · touchez le coin suivant`;
    this.hint.style.opacity = 1;
  }

  // les 4 points touchés, dans n'importe quel ordre -> haut gauche, haut droit, bas droit, bas gauche
  finaliserZone(demo) {
    const pts = this.placement.slice();
    const cx = pts.reduce((t, p) => t + p[0], 0) / 4, cy = pts.reduce((t, p) => t + p[1], 0) / 4;
    pts.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
    let k = 0;
    pts.forEach((p, i) => { if (p[0] + p[1] < pts[k][0] + pts[k][1]) k = i; });
    const q = [0, 1, 2, 3].map((i) => pts[(k + i) % 4]);
    this.placement = [];
    if (!quadValide(q, this.sw, this.sh)) {
      this.v.toast('Ces 4 points ne forment pas une zone : touchez les 4 coins du mur à carreler.', 4500);
      this.aidePose();
      this.placer();
      return;
    }
    this.quad = q;
    this.manuel = true;
    this.coins = true;
    const c = cadre(q, this.sw, this.sh);
    this.dim = [this.dim[0], Math.round(this.dim[0] / clamp(c.rapport, 0.15, 8))];
    this.majTout();
    this.revealGraine = [cx / this.sw, cy / this.sh];
    this.animReveal();
    this.hint.style.opacity = 0;
    if (!demo) this.v.toast('Carrelage posé sur toute la zone. Faites glisser les points pour ajuster, puis « Enlever les points » pour voir le rendu final.', 5500);
    this.outils();
    this.v.majPied();
  }

  nouvelleZone() {
    this.quad = null;
    this.ov = null;
    this.mf = null;
    this.placement = [];
    this.manuel = false;
    this.aidePose();
    this.placer();
    this.demander();
    this.outils();
    this.v.majPied();
  }

  // point (pixels de la photo) à l'intérieur de la zone encadrée
  dansZone(x, y) {
    if (!this.quad) return false;
    const inv = inverse3(homographie(this.quad));
    if (!inv) return false;
    const z = inv[6] * x + inv[7] * y + inv[8];
    const a = (inv[0] * x + inv[1] * y + inv[2]) / z, b = (inv[3] * x + inv[4] * y + inv[5]) / z;
    return z > 0 && a >= 0 && a <= 1 && b >= 0 && b <= 1;
  }

  majCoin() {
    const c = cadre(this.quad, this.sw, this.sh);
    this.dim = [this.dim[0], Math.round(this.dim[0] / clamp(c.rapport, 0.15, 8))];
    this.geometrie();
  }

  montrerLoupe(e, x, y, pinceau) {
    const l = this.loupe, g = l.getContext('2d'), b = this.pv.getBoundingClientRect();
    l.hidden = false;
    const px = e.clientX - b.left, py = e.clientY - b.top;
    l.style.left = clamp(px - 58, 4, b.width - 120) + 'px';
    l.style.top = (py - 150 < 4 ? py + 40 : py - 150) + 'px';
    const z = 2.6 / (this.rect().s * 2), t = 232 * z;
    g.clearRect(0, 0, 232, 232);
    g.save();
    g.beginPath(); g.arc(116, 116, 116, 0, Math.PI * 2); g.clip();
    if (pinceau) {
      // rendu en cours (canvas WebGL, même résolution que la photo) et cercle du pinceau
      this.dessiner();
      const kc = this.cv.width / this.sw;
      g.drawImage(this.cv, (x - t / 2) * kc, (y - t / 2) * kc, t * kc, t * kc, 0, 0, 232, 232);
      const rp = this.pinceau * Math.min(this.sw, this.sh) * 232 / t;
      g.strokeStyle = '#fff'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(116, 116, rp, 0, Math.PI * 2); g.stroke();
      g.strokeStyle = '#7a2632'; g.lineWidth = 1.2;
      g.beginPath(); g.arc(116, 116, rp, 0, Math.PI * 2); g.stroke();
    } else {
      g.drawImage(this.src, x - t / 2, y - t / 2, t, t, 0, 0, 232, 232);
      g.strokeStyle = '#7a2632'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(116, 92); g.lineTo(116, 140); g.moveTo(92, 116); g.lineTo(140, 116); g.stroke();
    }
    g.restore();
  }

  /* --- vidéo en direct --- */
  async video() {
    if (!this.initRendu()) return;
    try {
      this.flux = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } } });
    } catch (e) {
      this.v.toast('Caméra indisponible : autorisez l’accès ou prenez plutôt une photo.', 4500);
      return;
    }
    const vd = this.vd || (this.vd = Object.assign(document.createElement('video'), { muted: true, playsInline: true, autoplay: true }));
    vd.setAttribute('playsinline', '');
    vd.srcObject = this.flux;
    try { await vd.play(); } catch (e) { /* lecture auto refusée : la première image arrive quand même */ }
    await new Promise((ok) => (vd.videoWidth ? ok() : vd.addEventListener('loadedmetadata', ok, { once: true })));
    const w0 = vd.videoWidth, h0 = vd.videoHeight, s = Math.min(1, 1600 / Math.max(w0, h0));
    this.sw = w0; this.sh = h0;
    this.cv.width = Math.round(w0 * s); this.cv.height = Math.round(h0 * s);
    this.r.setPhoto(vd, w0, h0);
    this.analyse(vd, 256);
    this.etat = 'live';
    this.quad = null; this.manuel = false;
    this.pe.hidden = true; this.pv.hidden = false;
    this.el.querySelector('.live').hidden = false;
    this.hint.textContent = 'Cadrez votre mur, puis touchez « Figer l’image »';
    this.hint.style.opacity = 1;
    this.placer(); this.outils();
    let n = 0;
    const boucle = (t) => {
      if (this.etat !== 'live') return;
      this.r.image('uPhoto', vd, {});
      if (n++ % 3 === 0) {
        this.analyse(vd, 256);
        if (this.quad) this.r.setEclairage(eclairage(this.pxLow, this.cLow.width, this.cLow.height, this.zone(), !this.mf));
      }
      this.dessiner();
      this.boucle = requestAnimationFrame(boucle);
    };
    this.boucle = requestAnimationFrame(boucle);
  }

  figer() {
    if (this.etat !== 'live') return;
    const vd = this.vd;
    const w0 = vd.videoWidth, h0 = vd.videoHeight;
    const c = canvas(w0, h0);
    c.getContext('2d').drawImage(vd, 0, 0, w0, h0);
    this.arreterVideo(false);
    // l'image figée devient la photo : on y pose les 4 coins
    this.poser(c, w0, h0);
  }

  arreterVideo(retour) {
    cancelAnimationFrame(this.boucle);
    if (this.flux) this.flux.getTracks().forEach((t) => t.stop());
    this.flux = null;
    if (this.etat === 'live') {
      this.etat = 'vide';
      this.quad = null;
      this.pv.hidden = true; this.pe.hidden = false;
      this.el.querySelector('.live').hidden = true;
      if (this.v.mmode === 'photo') this.outils();
    }
  }

  /* --- export --- */
  async enregistrer() {
    if (!this.r || this.etat !== 'photo') return;
    const split = this.split;
    this.split = 0;
    this.dessiner();
    const c = canvas(this.cv.width, this.cv.height), g = c.getContext('2d');
    g.drawImage(this.cv, 0, 0);
    this.split = split;
    this.demander();
    const p = this.v.parH.get(this.v.h), n = nomCourt(p.t);
    const fs = Math.max(14, Math.round(c.width * 0.017));
    g.font = `600 ${fs}px Inter, system-ui, sans-serif`;
    const txt = `${n.marque} · ${n.couleur} — simulation Murizelia`;
    const tw = g.measureText(txt).width, pad = fs * 0.7;
    g.fillStyle = 'rgba(15,13,12,.62)';
    g.beginPath();
    const x = pad, y = c.height - pad - fs * 1.9, w = tw + pad * 2, h = fs * 1.9, r = h / 2;
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.fill();
    g.fillStyle = '#fff';
    g.textBaseline = 'middle';
    g.fillText(txt, x + pad, y + h / 2);
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.92));
    if (!blob) return;
    const nom = 'murizelia-mon-mur-' + p.h.split('-').slice(-4).join('-') + '.jpg';
    if (this.v.o.enregistrer) {
      try { await this.v.o.enregistrer(blob, nom); this.v.toast('Photo enregistrée.'); }
      catch (e) { if (!e || e.code !== 'declined') this.v.toast('L’enregistrement n’est pas disponible ici.'); }
      return;
    }
    const file = new File([blob], nom, { type: 'image/jpeg' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Mon mur avec ' + n.marque }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = nom;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    this.v.toast('Photo enregistrée.');
  }
}

/* ------------------------------------------------------------------ */
/* Mode « Pièce 3D »                                                    */
/* ------------------------------------------------------------------ */

class ModePiece {
  constructor(v, el) {
    this.v = v; this.el = el;
    this.nom = 'cuisine';
    this.vue = 'large';
    el.innerHTML = '<div class="p3"></div><div class="hint">Faites glisser pour tourner · pincez pour zoomer</div><div class="badge" hidden></div>';
  }

  async entrer() {
    if (!this.piece) {
      this.v.chargement(true);
      try {
        const m = await this.v.scene();
        this.piece = await m.creerPiece(this.el.querySelector('.p3'), { asset });
      } catch (e) {
        console.error(e);
        this.v.toast('La pièce 3D n’a pas pu être chargée.');
        this.v.chargement(false);
        return;
      }
    }
    this.piece.reprendre();
    this.piece.setScene(this.nom);
    this.badge();
    setTimeout(() => { const h = this.el.querySelector('.hint'); if (h) h.style.opacity = 0; }, 3500);
  }

  sortir() { if (this.piece) this.piece.pause(); }

  async setTuile(tx) {
    if (!this.piece) return;
    this.v.chargement(true);
    await this.piece.setTuile(tx);
    this.v.chargement(false);
    this.badge();
  }

  badge() {
    if (!this.piece) return;
    const z = this.piece.zone();
    const b = this.el.querySelector('.badge');
    b.hidden = !z;
    if (z) b.textContent = `${z.nom} · ${fr(z.l, 2)} × ${fr(z.h, 2)} m · ${fr(z.l * z.h)} m² carrelés`;
  }

  outils() {
    const t = this.v.$('.tools');
    t.innerHTML = `
      <button type="button" class="chip${this.nom === 'cuisine' ? ' on' : ''}" data-s="cuisine">Cuisine</button>
      <button type="button" class="chip${this.nom === 'sdb' ? ' on' : ''}" data-s="sdb">Salle de bain</button>
      <button type="button" class="chip${this.vue === 'pres' ? ' on' : ''}" data-v>Vue de près</button>`;
    t.querySelectorAll('[data-s]').forEach((b) => b.addEventListener('click', () => {
      this.nom = b.dataset.s; this.vue = 'large';
      if (this.piece) { this.piece.setScene(this.nom); this.badge(); }
      this.outils();
    }));
    t.querySelector('[data-v]').addEventListener('click', () => {
      this.vue = this.vue === 'pres' ? 'large' : 'pres';
      if (this.piece) this.piece.vue(this.vue);
      this.outils();
    });
    this.v.$('.subs').innerHTML = '';
  }
}

/* ------------------------------------------------------------------ */

let instance = null;
export function ouvrir(o) {
  if (!instance) instance = new Visualiseur(o);
  instance.ouvrir(o);
  return instance;
}

// exposés pour les tests
export const _interne = { cadre, homographie, eclairage, composer, TUILES };

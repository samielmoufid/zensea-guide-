/*
  Murizelia — pièce 3D et export AR du visualiseur mural.
  Chargé uniquement quand le client ouvre « Pièce 3D » ou « Réalité augmentée ».
  Unités : mètres. Le mur carrelé est le plan z = 0, face vers +z.
*/
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.170.0/+esm';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/controls/OrbitControls.js/+esm';
import { RoomEnvironment } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/environments/RoomEnvironment.js/+esm';
import { RoundedBoxGeometry } from 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/geometries/RoundedBoxGeometry.js/+esm';

const GLTF_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/exporters/GLTFExporter.js/+esm';
const USDZ_URL = 'https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/exporters/USDZExporter.js/+esm';

// rendu des carreaux par famille : rugosité, intensité du relief
const FINI = {
  marbre: { rough: 0.13, normal: 0.35 },
  mosaique: { rough: 0.1, normal: 1.1 },
  damier: { rough: 0.12, normal: 0.9 },
  baguettes: { rough: 0.12, normal: 1.0 },
};

function texCanvas(c, couleur, aniso) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = couleur ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = aniso;
  return t;
}

function materiauTuile(tx, aniso) {
  const fini = FINI[tx.f] || FINI.marbre;
  const m = new THREE.MeshStandardMaterial({
    map: texCanvas(tx.A, true, aniso),
    normalMap: texCanvas(tx.B, false, aniso),
    roughnessMap: tx.R ? texCanvas(tx.R, false, aniso) : null,
    roughness: tx.R ? 1 : fini.rough,
    metalness: 0,
  });
  m.normalScale.set(fini.normal, fini.normal);
  return m;
}

// UV exprimées en motifs : 1 unité = un super-motif de N x N plaques
function uvMur(geo, l, h, tx) {
  const pas = [tx.m[0] / 100 * tx.N, tx.m[1] / 100 * tx.N];
  const span = tx.m[0] / 100;
  const reste = l - Math.floor(l / span + 1e-6) * span;
  const ox = (span - reste / 2) % span;
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + l / 2, y = pos.getY(i) + h / 2;
    uv.setXY(i, (x + ox) / pas[0], y / pas[1]);
  }
  uv.needsUpdate = true;
}

/* ------------------------------------------------------------------ */

export async function creerPiece(el, { asset }) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;
  el.appendChild(renderer.domElement);
  const aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d8d1c8');
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.42;

  const camera = new THREE.PerspectiveCamera(42, 1, 0.03, 40);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.09;
  controls.enablePan = false;
  controls.minDistance = 0.45;
  controls.maxDistance = 5.4;
  controls.minPolarAngle = 0.95;
  controls.maxPolarAngle = 1.78;
  controls.minAzimuthAngle = -0.75;
  controls.maxAzimuthAngle = 0.75;
  controls.rotateSpeed = 0.6;

  const loader = new THREE.TextureLoader();
  const charge = (nom, couleur, rep) => {
    const t = loader.load(asset(nom), () => demander());
    t.colorSpace = couleur ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = aniso;
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  };

  /* --- matières --- */
  const M = {
    peinture: new THREE.MeshStandardMaterial({ color: '#ebe5dc', roughness: 0.94 }),
    plafond: new THREE.MeshStandardMaterial({ color: '#f2efea', roughness: 0.95 }),
    facade: new THREE.MeshStandardMaterial({ color: '#e6dfd4', roughness: 0.5 }),
    caisson: new THREE.MeshStandardMaterial({ color: '#d9d1c5', roughness: 0.6 }),
    socle: new THREE.MeshStandardMaterial({ color: '#2a2622', roughness: 0.8 }),
    laiton: new THREE.MeshStandardMaterial({ color: '#c09a5b', metalness: 1, roughness: 0.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: '#e8e8e8', metalness: 1, roughness: 0.08 }),
    inox: new THREE.MeshStandardMaterial({ color: '#c9c9c7', metalness: 1, roughness: 0.32 }),
    ceramique: new THREE.MeshStandardMaterial({ color: '#f6f4f0', roughness: 0.12 }),
    gres: new THREE.MeshStandardMaterial({ color: '#d8cbb8', roughness: 0.7 }),
    terre: new THREE.MeshStandardMaterial({ color: '#b86f4c', roughness: 0.85 }),
    sauge: new THREE.MeshStandardMaterial({ color: '#8f9c86', roughness: 0.6 }),
    citron: new THREE.MeshStandardMaterial({ color: '#e7c12d', roughness: 0.45 }),
    feuille: new THREE.MeshStandardMaterial({ color: '#4d6b3c', roughness: 0.55, side: THREE.DoubleSide }),
    miroir: new THREE.MeshStandardMaterial({ color: '#e9eef0', metalness: 1, roughness: 0.04, envMap: envTex, envMapIntensity: 1.5 }),
    linge: new THREE.MeshStandardMaterial({ color: '#e9e2d6', roughness: 1 }),
    fenetre: new THREE.MeshBasicMaterial({ color: '#fdfbf6' }),
  };
  const bois = () => new THREE.MeshStandardMaterial({ map: charge('mm-mur-bois.jpg', true, [1, 1]), normalMap: charge('mm-mur-bois-n.jpg', false, [1, 1]), roughness: 0.55, color: '#efe6da' });
  M.bois = bois();

  let matTuile = null;
  let txCourant = null;

  /* --- outils de construction --- */
  const ombre = (o, porte = true, recoit = true) => { o.castShadow = porte; o.receiveShadow = recoit; return o; };
  const boite = (g, w, h, d, m, x, y, z, r = 0) => {
    const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
    const o = ombre(new THREE.Mesh(geo, m));
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  const tour = (g, profil, m, x, y, z, seg = 48) => {
    const o = ombre(new THREE.Mesh(new THREE.LatheGeometry(profil.map(([a, b]) => new THREE.Vector2(a, b)), seg), m));
    o.position.set(x, y, z);
    g.add(o);
    return o;
  };
  const plan = (g, w, h, m, pos, rot) => {
    const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    o.receiveShadow = true;
    o.position.set(...pos);
    if (rot) o.rotation.set(...rot);
    g.add(o);
    return o;
  };

  const piece = (g, L, H, P, sol, rep) => {
    const floor = new THREE.MeshStandardMaterial({ map: charge(sol + '.jpg', true, rep), normalMap: charge(sol + '-n.jpg', false, rep), roughness: 0.5 });
    plan(g, L, P, floor, [0, 0, P / 2], [-Math.PI / 2, 0, 0]);
    plan(g, L, H, M.peinture, [0, H / 2, 0]);
    plan(g, P, H, M.peinture, [-L / 2, H / 2, P / 2], [0, Math.PI / 2, 0]);
    plan(g, P, H, M.peinture, [L / 2, H / 2, P / 2], [0, -Math.PI / 2, 0]);
    plan(g, L, P, M.plafond, [0, H, P / 2], [Math.PI / 2, 0, 0]);
    // plinthes
    boite(g, L, 0.08, 0.012, M.plafond, 0, 0.04, 0.006);
  };

  const zones = [];
  const zoneMur = (g, l, h, x, y, nom) => {
    const geo = new THREE.PlaneGeometry(l, h, 1, 1);
    const o = new THREE.Mesh(geo, M.peinture);
    o.receiveShadow = true;
    o.position.set(x, y + h / 2, 0.004);
    g.add(o);
    const z = { o, l, h, nom };
    zones.push(z);
    g.userData.zone = z;
    return z;
  };

  /* --- cuisine : crédence carrelée du plan de travail au plafond --- */
  function cuisine() {
    const g = new THREE.Group();
    const L = 3.6, H = 2.6, P = 5.4;
    piece(g, L, H, P, 'mm-mur-sol-chene', [L / 1.6, P / 1.6]);
    plan(g, 1.1, 1.25, M.fenetre, [-L / 2 + 0.002, 1.55, 2.5], [0, Math.PI / 2, 0]);
    const yPlan = 0.9, ep = 0.04;
    zoneMur(g, L, H - yPlan - ep, 0, yPlan + ep, 'Crédence');
    // meubles bas
    boite(g, L, 0.1, 0.52, M.socle, 0, 0.05, 0.26);
    boite(g, L, yPlan - 0.1, 0.58, M.caisson, 0, 0.1 + (yPlan - 0.1) / 2, 0.29);
    const nb = 6, lp = L / nb;
    for (let i = 0; i < nb; i++) {
      const x = -L / 2 + lp * (i + 0.5);
      boite(g, lp - 0.004, yPlan - 0.104, 0.02, M.facade, x, 0.1 + (yPlan - 0.1) / 2, 0.59, 0.004);
      boite(g, 0.16, 0.012, 0.012, M.laiton, x, yPlan - 0.07, 0.608, 0.005);
    }
    // plan de travail en chêne, découpé pour l'évier
    const s = new THREE.Shape();
    s.moveTo(-L / 2, 0); s.lineTo(L / 2, 0); s.lineTo(L / 2, 0.62); s.lineTo(-L / 2, 0.62); s.lineTo(-L / 2, 0);
    const trou = new THREE.Path();
    const ex = -0.62, el_ = 0.58, ez = 0.31, ed = 0.4;
    trou.moveTo(ex - el_ / 2, ez - ed / 2); trou.lineTo(ex - el_ / 2, ez + ed / 2); trou.lineTo(ex + el_ / 2, ez + ed / 2); trou.lineTo(ex + el_ / 2, ez - ed / 2); trou.lineTo(ex - el_ / 2, ez - ed / 2);
    s.holes.push(trou);
    const geo = new THREE.ExtrudeGeometry(s, { depth: ep, bevelEnabled: true, bevelThickness: 0.003, bevelSize: 0.003, bevelSegments: 2 });
    const uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 0.9, uv.getY(i) * 0.9);
    const plat = ombre(new THREE.Mesh(geo, M.bois));
    plat.rotation.x = Math.PI / 2;
    plat.position.set(0, yPlan + ep, 0);
    g.add(plat);
    // évier inox
    const cuve = new THREE.Group();
    const pr = 0.2;
    boite(cuve, el_, 0.004, ed, M.inox, 0, -pr, 0);
    boite(cuve, el_, pr, 0.004, M.inox, 0, -pr / 2, -ed / 2);
    boite(cuve, el_, pr, 0.004, M.inox, 0, -pr / 2, ed / 2);
    boite(cuve, 0.004, pr, ed, M.inox, -el_ / 2, -pr / 2, 0);
    boite(cuve, 0.004, pr, ed, M.inox, el_ / 2, -pr / 2, 0);
    cuve.position.set(ex, yPlan + ep, ez);
    g.add(cuve);
    // robinet col de cygne
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.22, 0), new THREE.Vector3(0, 0.34, 0.05),
      new THREE.Vector3(0, 0.33, 0.16), new THREE.Vector3(0, 0.26, 0.2),
    ]);
    const rob = ombre(new THREE.Mesh(new THREE.TubeGeometry(c, 48, 0.012, 16, false), M.chrome));
    rob.position.set(ex, yPlan + ep, 0.06);
    g.add(rob);
    tour(g, [[0, 0], [0.026, 0], [0.026, 0.03], [0.014, 0.05], [0, 0.05]], M.chrome, ex, yPlan + ep, 0.06);
    // planche à découper appuyée sur la crédence
    const pl = boite(g, 0.34, 0.46, 0.018, M.bois, -1.28, yPlan + ep + 0.225, 0.07, 0.008);
    pl.rotation.x = -0.12;
    tour(g, [[0, 0], [0.012, 0], [0.012, 0.003], [0, 0.003]], M.socle, -1.28, yPlan + ep + 0.39, 0.1).rotation.x = Math.PI / 2 - 0.12;
    // coupe de citrons
    const yb = yPlan + ep;
    tour(g, [[0, 0], [0.05, 0], [0.09, 0.012], [0.12, 0.045], [0.13, 0.075], [0.122, 0.077], [0.11, 0.05], [0.085, 0.02], [0.045, 0.008], [0, 0.008]], M.ceramique, 0.25, yb, 0.3);
    [[0.2, 0.04, 0.3], [0.29, 0.04, 0.27], [0.26, 0.04, 0.35], [0.24, 0.085, 0.31]].forEach(([x, y, z], i) => {
      const o = ombre(new THREE.Mesh(new THREE.SphereGeometry(0.038, 24, 16), M.citron));
      o.scale.set(1, 0.86, 0.86);
      o.rotation.set(i, i * 0.7, 0);
      o.position.set(x, yb + y, z);
      g.add(o);
    });
    // pots en grès
    tour(g, [[0, 0], [0.06, 0], [0.065, 0.005], [0.065, 0.2], [0.05, 0.21], [0, 0.21]], M.gres, 0.78, yb, 0.16);
    tour(g, [[0, 0], [0.05, 0], [0.055, 0.005], [0.055, 0.15], [0.042, 0.16], [0, 0.16]], M.ceramique, 0.92, yb, 0.14);
    tour(g, [[0, 0], [0.045, 0], [0.05, 0.004], [0.05, 0.11], [0.038, 0.12], [0, 0.12]], M.terre, 1.03, yb, 0.17);
    // étagères en chêne et vaisselle
    [1.42, 1.82].forEach((y, k) => {
      boite(g, 1.2, 0.04, 0.24, M.bois, 0.86, y, 0.124, 0.006);
      const ys = y + 0.02;
      if (k === 0) {
        for (let i = 0; i < 6; i++) tour(g, [[0, 0], [0.1, 0], [0.12, 0.012], [0.122, 0.016], [0, 0.016]], M.ceramique, 0.42, ys + i * 0.016, 0.12, 40);
        tour(g, [[0, 0], [0.035, 0], [0.042, 0.075], [0.044, 0.09], [0.04, 0.09], [0.036, 0.008], [0, 0.008]], M.sauge, 0.68, ys, 0.11);
        tour(g, [[0, 0], [0.035, 0], [0.042, 0.075], [0.044, 0.09], [0.04, 0.09], [0.036, 0.008], [0, 0.008]], M.sauge, 0.79, ys, 0.12);
        tour(g, [[0, 0], [0.05, 0], [0.06, 0.03], [0.045, 0.14], [0.03, 0.2], [0.034, 0.24], [0, 0.24]], M.gres, 1.2, ys, 0.11);
      } else {
        tour(g, [[0, 0], [0.055, 0], [0.06, 0.005], [0.06, 0.17], [0.045, 0.18], [0, 0.18]], M.ceramique, 0.5, ys, 0.11);
        tour(g, [[0, 0], [0.055, 0], [0.06, 0.005], [0.06, 0.13], [0.045, 0.14], [0, 0.14]], M.ceramique, 0.65, ys, 0.11);
        const pot = tour(g, [[0, 0], [0.05, 0], [0.065, 0.1], [0.06, 0.11], [0, 0.11]], M.terre, 1.12, ys, 0.11);
        for (let i = 0; i < 9; i++) {
          const f = ombre(new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8), M.feuille));
          const a = i / 9 * Math.PI * 2;
          f.scale.set(0.35, 0.12, 1);
          f.position.set(1.12 + Math.cos(a) * 0.06, ys + 0.14 + (i % 3) * 0.03, 0.11 + Math.sin(a) * 0.06);
          f.rotation.set(0.5, -a, 0.3);
          g.add(f);
        }
        pot.castShadow = true;
      }
    });
    // lumière du jour par la fenêtre de gauche
    const soleil = new THREE.DirectionalLight('#fff0dc', 2.6);
    soleil.position.set(-3.2, 3.4, 2.7);
    soleil.target.position.set(0.3, 1.2, 0);
    reglerOmbre(soleil, 2.2);
    g.add(soleil, soleil.target);
    g.add(new THREE.HemisphereLight('#eef2f6', '#b39a7c', 0.55));
    g.userData.cam = {
      large: { pos: [0.45, 1.55, 4.3], cible: [0, 1.25, 0], l: 3.3 },
      pres: { pos: [-0.25, 1.4, 1.05], cible: [0.05, 1.32, 0], l: 0 },
    };
    return g;
  }

  /* --- salle de bain : mur entier carrelé --- */
  function salleDeBain() {
    const g = new THREE.Group();
    const L = 2.7, H = 2.5, P = 4;
    piece(g, L, H, P, 'mm-mur-sol-chevron', [L / 1.1, P / 1.1]);
    plan(g, 1.0, 1.2, M.fenetre, [L / 2 - 0.002, 1.5, 2.2], [0, -Math.PI / 2, 0]);
    zoneMur(g, L, H, 0, 0, 'Mur de la salle de bain');
    // meuble suspendu en chêne + vasque à poser
    boite(g, 1.1, 0.34, 0.47, M.bois, 0, 0.66, 0.24, 0.01);
    boite(g, 1.08, 0.004, 0.005, M.socle, 0, 0.66, 0.476);
    boite(g, 1.12, 0.03, 0.49, M.ceramique, 0, 0.845, 0.245, 0.006);
    tour(g, [[0, 0], [0.12, 0], [0.19, 0.03], [0.21, 0.09], [0.212, 0.12], [0.2, 0.12], [0.195, 0.09], [0.175, 0.04], [0.11, 0.015], [0, 0.015]], M.ceramique, 0, 0.86, 0.25, 64);
    // robinet mural
    const rb = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 0.14), new THREE.Vector3(0, -0.015, 0.2)]);
    const bec = ombre(new THREE.Mesh(new THREE.TubeGeometry(rb, 24, 0.012, 16, false), M.chrome));
    bec.position.set(0, 1.08, 0.004);
    g.add(bec);
    tour(g, [[0, 0], [0.03, 0], [0.03, 0.01], [0, 0.01]], M.chrome, 0, 1.08, 0.004).rotation.x = Math.PI / 2;
    // miroir rond cerclé de laiton
    const mir = new THREE.Mesh(new THREE.CircleGeometry(0.36, 64), M.miroir);
    mir.position.set(0, 1.6, 0.03);
    g.add(mir);
    const cadre = ombre(new THREE.Mesh(new THREE.TorusGeometry(0.365, 0.012, 16, 96), M.laiton));
    cadre.position.set(0, 1.6, 0.03);
    g.add(cadre);
    boite(g, 0.7, 0.7, 0.02, M.socle, 0, 1.6, 0.012).visible = false;
    // serviette, flacons, plante
    boite(g, 0.32, 0.06, 0.2, M.linge, -0.36, 0.89, 0.25, 0.025);
    boite(g, 0.3, 0.05, 0.19, M.linge, -0.36, 0.945, 0.25, 0.022);
    tour(g, [[0, 0], [0.032, 0], [0.034, 0.005], [0.034, 0.13], [0.012, 0.15], [0.012, 0.18], [0, 0.18]], M.gres, 0.36, 0.86, 0.2);
    tour(g, [[0, 0], [0.028, 0], [0.03, 0.005], [0.03, 0.1], [0.01, 0.12], [0.01, 0.14], [0, 0.14]], M.ceramique, 0.44, 0.86, 0.25);
    const pot = tour(g, [[0, 0], [0.09, 0], [0.11, 0.3], [0.105, 0.31], [0, 0.31]], M.terre, 1.0, 0, 0.45);
    for (let i = 0; i < 14; i++) {
      const f = ombre(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), M.feuille));
      const a = i / 14 * Math.PI * 2;
      f.scale.set(0.32, 0.1, 1);
      f.position.set(1.0 + Math.cos(a) * 0.1, 0.42 + (i % 4) * 0.07, 0.45 + Math.sin(a) * 0.1);
      f.rotation.set(0.7 + (i % 3) * 0.2, -a, 0.2);
      g.add(f);
    }
    pot.castShadow = true;
    const soleil = new THREE.DirectionalLight('#fff3e4', 2.3);
    soleil.position.set(3.0, 3.3, 2.6);
    soleil.target.position.set(-0.2, 1.1, 0);
    reglerOmbre(soleil, 1.9);
    g.add(soleil, soleil.target);
    g.add(new THREE.HemisphereLight('#eef2f6', '#a8896a', 0.55));
    g.userData.cam = {
      large: { pos: [0.35, 1.4, 3.5], cible: [0, 1.22, 0], l: 2.6 },
      pres: { pos: [0.55, 1.3, 0.95], cible: [0.55, 1.28, 0], l: 0 },
    };
    return g;
  }

  function reglerOmbre(l, s) {
    l.castShadow = true;
    l.shadow.mapSize.set(2048, 2048);
    l.shadow.camera.left = -s; l.shadow.camera.right = s;
    l.shadow.camera.top = s; l.shadow.camera.bottom = -s;
    l.shadow.camera.near = 0.5; l.shadow.camera.far = 12;
    l.shadow.bias = -0.0004;
    l.shadow.normalBias = 0.02;
  }

  const scenes = {};
  let actuelle = null;
  let vueCourante = 'large';
  let touche = false;

  function cadrer(nom) {
    const c = actuelle.userData.cam[nom];
    const a = camera.aspect;
    camera.fov = a < 0.8 ? 52 : 42;
    camera.updateProjectionMatrix();
    const pos = new THREE.Vector3(...c.pos), cible = new THREE.Vector3(...c.cible);
    if (c.l) {
      // recule pour que la zone carrelée tienne en largeur, même en portrait
      const hfov = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * a);
      const d = (c.l / 2) / Math.tan(hfov / 2);
      pos.z = Math.max(pos.z, Math.min(d, 4.8));
    }
    camera.position.copy(pos);
    controls.target.copy(cible);
    controls.update();
    touche = false;
    demander();
  }

  controls.addEventListener('start', () => { touche = true; });
  controls.addEventListener('change', () => demander());

  let raf = 0, actif = true;
  function demander() {
    if (raf || !actif) return;
    raf = requestAnimationFrame(rendre);
  }
  function rendre() {
    raf = 0;
    const bouge = controls.update();
    renderer.render(scene, camera);
    if (bouge) demander();
  }

  function taille() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (actuelle && !touche) cadrer(vueCourante);
    demander();
  }
  const ro = new ResizeObserver(taille);
  ro.observe(el);

  function appliquerTuile() {
    if (!matTuile || !txCourant) return;
    for (const z of zones) {
      uvMur(z.o.geometry, z.l, z.h, txCourant);
      z.o.material = matTuile;
    }
  }

  const api = {
    async setTuile(tx) {
      if (matTuile) {
        ['map', 'normalMap', 'roughnessMap'].forEach((k) => matTuile[k] && matTuile[k].dispose());
        matTuile.dispose();
      }
      txCourant = tx;
      matTuile = materiauTuile(tx, aniso);
      appliquerTuile();
      demander();
    },
    setScene(nom) {
      if (!scenes[nom]) {
        scenes[nom] = nom === 'sdb' ? salleDeBain() : cuisine();
        scene.add(scenes[nom]);
        appliquerTuile();
      }
      Object.entries(scenes).forEach(([k, g]) => { g.visible = k === nom; });
      actuelle = scenes[nom];
      vueCourante = 'large';
      renderer.shadowMap.needsUpdate = true;
      taille();
      cadrer('large');
    },
    vue(nom) {
      vueCourante = nom;
      cadrer(nom);
    },
    zone() {
      const z = actuelle && actuelle.userData.zone;
      return z ? { nom: z.nom, l: z.l, h: z.h } : null;
    },
    pause() { actif = false; cancelAnimationFrame(raf); raf = 0; },
    reprendre() { actif = true; taille(); demander(); },
    // image fixe (photo d'exemple, vignettes)
    capture(w, h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      return renderer.domElement.toDataURL('image/jpeg', 0.9);
    },
    camera, controls, renderer, THREE,
  };
  return api;
}

/* ------------------------------------------------------------------ */
/* Réalité augmentée : panneau en taille réelle, GLB (Android) + USDZ (iPhone) */
/* ------------------------------------------------------------------ */

function plaques(src, N, cases, k) {
  const pa = src.width / N, c = document.createElement('canvas');
  c.width = cases.nx * k; c.height = cases.ny * k;
  const g = c.getContext('2d');
  g.imageSmoothingQuality = 'high';
  for (let r = 0; r < cases.ny; r++) {
    for (let q = 0; q < cases.nx; q++) {
      // la rangée du bas du panneau correspond à la rangée du bas du motif
      const ri = (N - 1 - ((cases.ny - 1 - r) % N) + N) % N;
      g.drawImage(src, (q % N) * pa, ri * pa, pa, pa, q * k, r * k, k, k);
    }
  }
  return c;
}

export async function preparerAR(tx, s, { usdz } = {}) {
  const k = Math.max(96, Math.min(512, Math.floor(2048 / Math.max(s.nx, s.ny))));
  const A = plaques(tx.A, tx.N, s, k);
  const B = plaques(tx.B, tx.N, s, Math.round(k / 2));
  const R = tx.R ? plaques(tx.R, tx.N, s, Math.round(k / 4)) : null;
  const t = (c, couleur) => {
    const x = new THREE.CanvasTexture(c);
    x.colorSpace = couleur ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    x.userData.mimeType = 'image/jpeg';
    return x;
  };
  const fini = FINI[tx.f] || FINI.marbre;
  const mat = new THREE.MeshStandardMaterial({ map: t(A, true), normalMap: t(B, false), roughnessMap: R ? t(R, false) : null, roughness: R ? 1 : fini.rough, metalness: 0 });
  mat.normalScale.set(fini.normal, fini.normal);
  mat.name = 'Carrelage';
  const ep = 0.004;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(s.l, s.h), mat);
  face.name = 'Carrelage';
  face.position.z = ep + 0.0005;
  const dos = new THREE.Mesh(new THREE.BoxGeometry(s.l, s.h, ep), new THREE.MeshStandardMaterial({ color: '#f1ede6', roughness: 0.8, name: 'Chant' }));
  dos.position.z = ep / 2;
  const g = new THREE.Group();
  g.name = 'Panneau Murizelia';
  g.add(dos, face);
  g.updateMatrixWorld(true);

  const { GLTFExporter } = await import(GLTF_URL);
  const glb = await new GLTFExporter().parseAsync(g, { binary: true });
  const res = { glb: new Blob([glb], { type: 'model/gltf-binary' }) };
  if (usdz) {
    // Coup d'œil (iPhone) : avec l'ancrage vertical, l'axe Y du modèle est la normale du mur.
    // Le panneau est donc posé « à plat » (face vers +Y), dos contre le mur en y = 0.
    g.rotation.x = -Math.PI / 2;
    g.updateMatrixWorld(true);
    const { USDZExporter } = await import(USDZ_URL);
    const u = await new USDZExporter().parseAsync(g, {
      ar: { anchoring: { type: 'plane' }, planeAnchoring: { alignment: 'vertical' } },
      includeAnchoringProperties: true,
      quickLookCompatible: true,
      maxTextureSize: 2048,
    });
    res.usdz = new Blob([u], { type: 'model/vnd.usdz+zip' });
  }
  [mat.map, mat.normalMap, mat.roughnessMap].forEach((x) => x && x.dispose());
  return res;
}

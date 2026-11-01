// Le temple doré : un pavillon de bois ouvert sur une forêt de pins au soleil
// couchant (panorama photographique Poly Haven, CC0). Dix-sept handpans sur
// leurs présentoirs, en cercle autour de soi. On regarde autour, on touche un
// instrument : on s'en approche, il remplit l'écran, et on le joue au doigt.
//
// La scène se dessine elle-même (dessiner) : la forêt (Foret) ne fournit plus
// que le moteur (rendu, regard au doigt et au gyroscope, appuis).

import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { creerHandpan, R, H_BAS, H_HAUT, profondeur } from './handpan.js'
import { MODELES, CONFIGS } from './hpdata.js'

const DEG = Math.PI / 180
const lerp = (a, b, k) => a + (b - a) * k
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const amorti = (dt, vitesse) => 1 - Math.exp(-dt * vitesse)

// Mesures (l'œil debout est à y = 0, le plancher 1,5 m plus bas).
export const SOL = -1.5
const RP = 4.3                 // rayon des piliers
const RA = 2.0                 // rayon de l'anneau des présentoirs
const PIED = 0.9               // hauteur d'un présentoir
const CREUX = profondeur(0.17) // le fond de la coque descend dans l'anneau du présentoir
const INCL = 9 * DEG           // chaque instrument penche vers le centre
// Le soleil, mesuré sur le HDR (azimut du point le plus lumineux), abaissé
// pour la lumière rasante de fin de journée.
const SOLEIL_AZ = 19.9 * DEG, SOLEIL_EL = 24 * DEG
// Rotation du panorama : le soleil passe derrière les instruments de droite.
const PANO_ROT = -40 * DEG

function charger(loader, url) {
  return new Promise((res, rej) => loader.load(url, res, undefined, rej))
}

const image = url => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url })
const pixels = (img, gris) => {
  const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height
  const g = cv.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0)
  return g.getImageData(0, 0, img.width, img.height).data
}
// La lumière de la forêt (HDR), livrée en deux PNG sans perte : mantisses RVB
// et exposant commun (RGBE). On reconstitue une texture flottante (demi-précision).
async function lumiereHDR(base) {
  const [rvb, exp] = await Promise.all([image(base + 'lumiere-rvb.png'), image(base + 'lumiere-exp.png')])
  const w = rvb.width, h = rvb.height
  const m = pixels(rvb), e = pixels(exp)
  const data = new Uint16Array(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    const ex = e[i * 4]
    const k = ex ? Math.pow(2, ex - 136) : 0
    data[i * 4] = THREE.DataUtils.toHalfFloat((m[i * 4] + 0.5) * k)
    data[i * 4 + 1] = THREE.DataUtils.toHalfFloat((m[i * 4 + 1] + 0.5) * k)
    data[i * 4 + 2] = THREE.DataUtils.toHalfFloat((m[i * 4 + 2] + 0.5) * k)
    data[i * 4 + 3] = THREE.DataUtils.toHalfFloat(1)
  }
  const t = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.HalfFloatType)
  t.flipY = true
  t.colorSpace = THREE.LinearSRGBColorSpace
  t.mapping = THREE.EquirectangularReflectionMapping
  t.magFilter = t.minFilter = THREE.LinearFilter
  t.needsUpdate = true
  return t
}

// Texture de canevas : halo radial (lucioles, poussières, lueurs).
function lueur(couleur = '255,236,200', taille = 64) {
  const cv = document.createElement('canvas'); cv.width = cv.height = taille
  const g = cv.getContext('2d'), h = taille / 2
  const r = g.createRadialGradient(h, h, 0, h, h, h)
  r.addColorStop(0, `rgba(${couleur},1)`); r.addColorStop(0.25, `rgba(${couleur},0.55)`); r.addColorStop(1, `rgba(${couleur},0)`)
  g.fillStyle = r; g.fillRect(0, 0, taille, taille)
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace
  return t
}

export class Temple {
  constructor(renderer, { mobile = false, base = './' } = {}) {
    this.renderer = renderer
    this.mobile = mobile
    this.base = base
    this.scene = new THREE.Scene()
    this.loader = new THREE.TextureLoader()
    this.aniso = Math.min(8, renderer.capabilities.getMaxAnisotropy())
    this.t0 = performance.now()
    this.ray = new THREE.Raycaster()
    this.pret = false

    // État de la vue : 'libre' (au centre, on regarde autour), 'jeu' (devant un
    // instrument), 'dessus' (au-dessus, pour jouer à plat).
    this.mode = 'libre'
    this.choisi = null
    this.retourne = false
    this.focus = null            // l'instrument sous le regard (bulle, halo)
    this.survolSouris = null
    this.azimut = 0; this.elev = 54 * DEG
    this.attract = true          // avant l'entrée : la vue tourne lentement
    this.panneau = 0.36          // part de l'écran couverte par le panneau, en bas
    this.camPos = new THREE.Vector3(); this.camQ = new THREE.Quaternion()
    this.guide = null            // champ à jouer (apprentissage) : il pulse
    this.on = { note: null, bulle: null, etiquettes: null, choix: null }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    // Rendu « neutre » (Khronos PBR Neutral) : les couleurs des photos produit
    // restent celles de la fiche, sans la désaturation d'un rendu cinéma.
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    this.scene.backgroundRotation.y = PANO_ROT
    this.scene.environmentRotation.y = PANO_ROT
    this.scene.fog = new THREE.FogExp2(0xd9a873, 0.012)

    this._lumieres()
    this._pavillon()
    this._presentoirs()
    this._handpans()
    this._lanternes()
    this._halo()
    this._lucioles()
    this._poussieres()
    this._rais()
    this._post()
    this._gestes()
  }

  // ---- Chargement ------------------------------------------------------------
  async charger(onProgres = () => {}) {
    const b = this.base + 'temple/'
    const panoUrl = (!this.mobile && this.renderer.capabilities.maxTextureSize >= 8192) ? b + 'foret-6k.jpg' : b + 'foret-4k.jpg'
    let fait = 0
    const etapes = 4
    const avance = () => onProgres(++fait / etapes)
    const [pano, hdr] = await Promise.all([
      charger(this.loader, panoUrl).then(t => { avance(); return t }),
      lumiereHDR(b).then(t => { avance(); return t })
    ])
    pano.mapping = THREE.EquirectangularReflectionMapping
    pano.colorSpace = THREE.SRGBColorSpace
    pano.anisotropy = this.aniso
    this.scene.background = pano
    this.scene.backgroundIntensity = 1.0
    const pm = new THREE.PMREMGenerator(this.renderer)
    this.env = pm.fromEquirectangular(hdr).texture
    pm.dispose(); hdr.dispose()
    this.scene.environment = this.env
    this.scene.environmentIntensity = 0.9
    await this._bois(); avance()
    try {
      const d = await (await fetch(this.base + 'atelier/handpans/champs.json')).json()
      for (const g of this.handpans) {
        const m = g.userData.modele
        // Configuration par défaut : celle de la photo quand elle est vendue.
        const nPhoto = (d[m.id]?.champs?.length ?? 8) + 1
        m.nDefaut = m.configs.includes(nPhoto) ? nPhoto : m.configs[0]
        m.n = m.nDefaut
        g.userData.configurer(CONFIGS[m.n].haut, CONFIGS[m.n].bas)
        g.userData.placerChamps(d[m.id])
      }
    } catch (e) { console.warn('champs.json', e) }
    avance()
    this.pret = true
    // Les photos des instruments, en tâche de fond : le plus proche du regard d'abord.
    ;(async () => { for (const g of this.handpans) await g.userData.charger() })()
  }

  async _bois() {
    const b = this.base + 'temple/'
    const tex = async (nom, srgb, rep) => {
      const t = await charger(this.loader, b + nom)
      t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep)
      t.anisotropy = this.aniso
      if (srgb) t.colorSpace = THREE.SRGBColorSpace
      return t
    }
    const [pd, pn, pr, bd, bn, br] = await Promise.all([
      tex('plancher-diff.jpg', true, 3.2), tex('plancher-nor_gl.jpg', false, 3.2), tex('plancher-rough.jpg', false, 3.2),
      tex('bois-sombre-diff.jpg', true, 1), tex('bois-sombre-nor_gl.jpg', false, 1), tex('bois-sombre-rough.jpg', false, 1)
    ])
    Object.assign(this.matPlancher, { map: pd, normalMap: pn, roughnessMap: pr, color: new THREE.Color(0xe8c9a0) })
    this.matPlancher.needsUpdate = true
    for (const m of [this.matSombre, this.matPilier, this.matPied]) {
      Object.assign(m, { map: bd, normalMap: bn, roughnessMap: br })
      m.needsUpdate = true
    }
  }

  // ---- Lumière -----------------------------------------------------------------
  _lumieres() {
    const dir = new THREE.Vector3(Math.cos(SOLEIL_EL) * Math.cos(SOLEIL_AZ), Math.sin(SOLEIL_EL), Math.cos(SOLEIL_EL) * Math.sin(SOLEIL_AZ))
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), PANO_ROT)
    this.dirSoleil = dir
    this.soleil = new THREE.DirectionalLight(0xffc98f, 1.7)
    this.soleil.position.copy(dir).multiplyScalar(14)
    this.soleil.castShadow = true
    const s = this.mobile ? 1024 : 2048
    this.soleil.shadow.mapSize.set(s, s)
    const sc = this.soleil.shadow.camera
    sc.left = -5.5; sc.right = 5.5; sc.top = 5.5; sc.bottom = -5.5; sc.near = 4; sc.far = 30
    this.soleil.shadow.bias = -0.0004; this.soleil.shadow.normalBias = 0.02; this.soleil.shadow.radius = 5
    this.scene.add(this.soleil, this.soleil.target)
    this.scene.add(new THREE.HemisphereLight(0xffe0bb, 0x5a3a22, 0.45))
  }

  // ---- Le pavillon -----------------------------------------------------------------
  _pavillon() {
    this.matPlancher = new THREE.MeshStandardMaterial({ color: 0xc79a6a, roughness: 0.55, metalness: 0, envMapIntensity: 0.7 })
    this.matSombre = new THREE.MeshStandardMaterial({ color: 0x7a5a42, roughness: 0.75, metalness: 0 })
    this.matPilier = new THREE.MeshStandardMaterial({ color: 0x6a4a34, roughness: 0.6, metalness: 0 })
    this.matLaiton = new THREE.MeshStandardMaterial({ color: 0xd2a15a, roughness: 0.28, metalness: 1, envMapIntensity: 1.2 })
    const pierre = new THREE.MeshStandardMaterial({ color: 0x5e554c, roughness: 0.95 })
    const grp = new THREE.Group(); this.scene.add(grp)

    // Plancher octogonal et deux marches de pierre tout autour.
    const sol = new THREE.Mesh(new THREE.CylinderGeometry(RP + 0.55, RP + 0.55, 0.12, 8, 1), this.matPlancher)
    sol.position.y = SOL - 0.06; sol.rotation.y = Math.PI / 8; sol.receiveShadow = true
    grp.add(sol)
    for (const [r, y, h] of [[RP + 0.85, SOL - 0.2, 0.16], [RP + 1.15, SOL - 0.34, 0.16]]) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r + 0.04, h, 8, 1), pierre)
      m.position.y = y; m.rotation.y = Math.PI / 8; m.receiveShadow = true
      grp.add(m)
    }
    // Un tapis rond tissé sous les pieds.
    const cv = document.createElement('canvas'); cv.width = cv.height = 512
    const g = cv.getContext('2d')
    g.fillStyle = '#7d3f2a'; g.beginPath(); g.arc(256, 256, 256, 0, 7); g.fill()
    for (let i = 0; i < 9; i++) {
      g.strokeStyle = i % 2 ? 'rgba(232,190,120,.55)' : 'rgba(40,20,12,.35)'; g.lineWidth = i % 3 ? 5 : 12
      g.beginPath(); g.arc(256, 256, 240 - i * 26, 0, 7); g.stroke()
    }
    for (let k = 0; k < 24; k++) {
      const a = k * Math.PI / 12
      g.fillStyle = 'rgba(232,190,120,.5)'; g.beginPath(); g.arc(256 + Math.cos(a) * 150, 256 + Math.sin(a) * 150, 7, 0, 7); g.fill()
    }
    const tapisTex = new THREE.CanvasTexture(cv); tapisTex.colorSpace = THREE.SRGBColorSpace
    const tapis = new THREE.Mesh(new THREE.CircleGeometry(1.15, 64), new THREE.MeshStandardMaterial({ map: tapisTex, roughness: 0.95 }))
    tapis.rotation.x = -Math.PI / 2; tapis.position.y = SOL + 0.006; tapis.receiveShadow = true
    grp.add(tapis)

    // Huit piliers, socles de pierre, bague de laiton ; poutres et chevrons.
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4
      const x = Math.cos(a) * RP, z = Math.sin(a) * RP
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.17, 3.6, 24), this.matPilier)
      p.position.set(x, SOL + 1.8, z); p.castShadow = true; p.receiveShadow = true
      const socle = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.2, 8), pierre)
      socle.position.set(x, SOL + 0.1, z); socle.castShadow = true
      const bague = new THREE.Mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.05, 24), this.matLaiton)
      bague.position.set(x, SOL + 0.55, z)
      grp.add(p, socle, bague)
      const b = (i + 1) * Math.PI / 4
      const pa = new THREE.Vector3(x, SOL + 3.6, z), pb = new THREE.Vector3(Math.cos(b) * RP, SOL + 3.6, Math.sin(b) * RP)
      const poutre = new THREE.Mesh(new THREE.BoxGeometry(pa.distanceTo(pb) + 0.3, 0.28, 0.22), this.matSombre)
      poutre.position.copy(pa).add(pb).multiplyScalar(0.5)
      poutre.rotation.y = -Math.atan2(pb.z - pa.z, pb.x - pa.x)
      poutre.castShadow = true
      grp.add(poutre)
    }
    // Toit : le dessous d'un cône de planches sombres, chevrons rayonnants, faîte.
    const H_TOIT = 1.7, R_TOIT = RP + 1.0
    const toit = new THREE.Mesh(new THREE.ConeGeometry(R_TOIT, H_TOIT, 8, 1, true), this.matSombre)
    toit.material = this.matSombre.clone(); toit.material.side = THREE.DoubleSide
    toit.position.y = SOL + 3.6 + H_TOIT / 2 - 0.25; toit.rotation.y = Math.PI / 8
    toit.castShadow = true
    grp.add(toit)
    const faite = new THREE.Vector3(0, SOL + 3.6 + H_TOIT - 0.3, 0)
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI / 16
      const pa = new THREE.Vector3(Math.cos(a) * (R_TOIT - 0.1), SOL + 3.45, Math.sin(a) * (R_TOIT - 0.1))
      const c = new THREE.Mesh(new THREE.BoxGeometry(i % 4 ? 0.06 : 0.12, i % 4 ? 0.08 : 0.16, pa.distanceTo(faite)), this.matSombre)
      c.position.copy(pa).add(faite).multiplyScalar(0.5); c.lookAt(faite)
      grp.add(c)
    }
    // Garde-corps bas, ajouré, sur les travées de derrière.
    for (const i of [3, 4]) {
      const a = i * Math.PI / 4, b = (i + 1) * Math.PI / 4
      const pa = new THREE.Vector3(Math.cos(a) * RP, SOL + 0.85, Math.sin(a) * RP), pb = new THREE.Vector3(Math.cos(b) * RP, SOL + 0.85, Math.sin(b) * RP)
      const rail = new THREE.Mesh(new THREE.BoxGeometry(pa.distanceTo(pb) - 0.34, 0.08, 0.09), this.matSombre)
      rail.position.copy(pa).add(pb).multiplyScalar(0.5); rail.rotation.y = -Math.atan2(pb.z - pa.z, pb.x - pa.x)
      grp.add(rail)
      for (let k = 1; k < 8; k++) {
        const q = pa.clone().lerp(pb, k / 8)
        const bal = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.85, 8), this.matSombre)
        bal.position.set(q.x, SOL + 0.42, q.z)
        grp.add(bal)
      }
    }
  }

  // ---- Les présentoirs ---------------------------------------------------------------
  // Dix-sept pieds de bois sombre en cercle : socle, colonne fuselée, bague de
  // laiton, et un anneau garni où la coque repose. La pièce maîtresse (17
  // notes) a un socle plus haut, au fond.
  _presentoirs() {
    this.matPied = new THREE.MeshStandardMaterial({ color: 0x5a3c28, roughness: 0.5, metalness: 0 })
    const feutre = new THREE.MeshStandardMaterial({ color: 0x2a1a12, roughness: 1 })
    const ombre = (() => {
      const cv = document.createElement('canvas'); cv.width = cv.height = 128
      const c = cv.getContext('2d'), gr = c.createRadialGradient(64, 64, 10, 64, 64, 64)
      gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)')
      c.fillStyle = gr; c.fillRect(0, 0, 128, 128)
      return new THREE.CanvasTexture(cv)
    })()
    this.pieds = []
    const n = MODELES.length
    for (let i = 0; i < n; i++) {
      const a = this.angle(i)
      const g = new THREE.Group()
      g.position.set(Math.cos(a) * RA, SOL, -Math.sin(a) * RA)
      const haut = MODELES[i].dessous ? PIED + 0.06 : PIED
      const socle = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.05, 32), this.matPied)
      socle.position.y = 0.025
      const colonne = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.05, haut - 0.1, 16), this.matPied)
      colonne.position.y = (haut - 0.1) / 2 + 0.05
      const bague = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 20), this.matLaiton)
      bague.position.y = haut * 0.62
      const anneau = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 12, 48), this.matPied)
      anneau.rotation.x = Math.PI / 2; anneau.position.y = haut
      const garni = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.012, 8, 48), feutre)
      garni.rotation.x = Math.PI / 2; garni.position.y = haut + 0.014
      for (let k = 0; k < 3; k++) {
        const b = k * 2 * Math.PI / 3
        const bras = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.02, 0.025), this.matPied)
        bras.position.set(Math.cos(b) * 0.085, haut - 0.03, Math.sin(b) * 0.085); bras.rotation.y = -b
        g.add(bras)
      }
      const tache = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.9), new THREE.MeshBasicMaterial({ map: ombre, transparent: true, depthWrite: false }))
      tache.rotation.x = -Math.PI / 2; tache.position.y = 0.008
      for (const m of [socle, colonne, anneau, bague]) { m.castShadow = true; m.receiveShadow = true }
      g.add(socle, colonne, bague, anneau, garni, tache)
      g.userData = { haut, angle: a }
      this.scene.add(g); this.pieds.push(g)
    }
  }

  // Angle d'un présentoir sur l'anneau (plan x, -z ; 90° = devant au départ).
  angle(i) { return (90 - i * (360 / MODELES.length)) * DEG }
  // Le cap du regard (Foret) qui regarde le présentoir i depuis le centre.
  capVers(i) { return this.angle(i) - Math.PI / 2 }

  // ---- Les handpans -------------------------------------------------------------------
  _handpans() {
    const opts = { loader: this.loader, base: this.base + 'atelier/handpans/', mobile: this.mobile, aniso: this.aniso }
    this.handpans = MODELES.map((m, i) => {
      m.n = m.configs[0]
      m.notes = CONFIGS[m.n].haut; m.notesBas = CONFIGS[m.n].bas
      const g = creerHandpan(m, opts)
      const p = this.pieds[i]
      g.position.set(p.position.x, SOL + p.userData.haut + CREUX, p.position.z)
      g.rotation.set(0, p.userData.angle - Math.PI / 2, 0)
      g.rotateX(INCL)
      g.userData.repos.copy(g.position); g.userData.reposQ.copy(g.quaternion)
      g.userData.index = i
      g.userData.ombre.visible = false
      this.scene.add(g)
      return g
    })
    this.cibles = this.handpans.flatMap(g => [g.userData.coque, g.userData.dessous])
  }

  // ---- Lanternes de papier, accrochées aux piliers ---------------------------------------
  _lanternes() {
    this.lanternes = []
    const papier = new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffb866, emissiveIntensity: 2.2, roughness: 1 })
    const noir = new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.7 })
    const nLum = this.mobile ? 2 : 4
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + Math.PI / 8
      const grp = new THREE.Group()
      const corps = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.34, 20, 1), papier)
      const renfl = new THREE.Mesh(new THREE.SphereGeometry(0.17, 20, 12), papier); renfl.scale.y = 1.15
      const chap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.05, 16), noir); chap.position.y = 0.21
      const pied = chap.clone(); pied.position.y = -0.21
      const fil = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.9, 6), noir); fil.position.y = 0.66
      grp.add(renfl, chap, pied, fil)
      grp.position.set(Math.cos(a) * (RP - 0.35), SOL + 2.75, Math.sin(a) * (RP - 0.35))
      let lum = null
      if (i % (8 / nLum) === 0) {
        lum = new THREE.PointLight(0xffb36a, this.mobile ? 3 : 4, 6, 1.6)
        grp.add(lum)
      }
      grp.userData = { phase: i * 1.37, lum, corps: renfl }
      this.scene.add(grp); this.lanternes.push(grp)
    }
    void 0
  }

  // ---- Halo de l'instrument regardé : anneau au sol et colonne de lumière ------------------
  _halo() {
    const cv = document.createElement('canvas'); cv.width = cv.height = 256
    const g = cv.getContext('2d')
    const r = g.createRadialGradient(128, 128, 40, 128, 128, 128)
    r.addColorStop(0, 'rgba(255,200,110,0)'); r.addColorStop(0.62, 'rgba(255,205,120,0.15)'); r.addColorStop(0.8, 'rgba(255,214,140,0.95)'); r.addColorStop(0.9, 'rgba(255,200,110,0.35)'); r.addColorStop(1, 'rgba(255,200,110,0)')
    g.fillStyle = r; g.fillRect(0, 0, 256, 256)
    const anneauTex = new THREE.CanvasTexture(cv); anneauTex.colorSpace = THREE.SRGBColorSpace
    this.haloSol = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: anneauTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }))
    this.haloSol.rotation.x = -Math.PI / 2
    // Faisceau : un voile vertical toujours face au regard, doux sur les bords,
    // qui s'éteint vers le haut (pas un tube : on ne voit jamais ses parois).
    const cv2 = document.createElement('canvas'); cv2.width = 64; cv2.height = 128
    const g2 = cv2.getContext('2d')
    const lh = g2.createLinearGradient(0, 0, 64, 0)
    lh.addColorStop(0, 'rgba(255,205,120,0)'); lh.addColorStop(0.5, 'rgba(255,214,140,1)'); lh.addColorStop(1, 'rgba(255,205,120,0)')
    g2.fillStyle = lh; g2.fillRect(0, 0, 64, 128)
    g2.globalCompositeOperation = 'destination-in'
    const lv = g2.createLinearGradient(0, 128, 0, 0)
    lv.addColorStop(0, 'rgba(0,0,0,0.55)'); lv.addColorStop(0.45, 'rgba(0,0,0,0.18)'); lv.addColorStop(1, 'rgba(0,0,0,0)')
    g2.fillStyle = lv; g2.fillRect(0, 0, 64, 128)
    const colTex = new THREE.CanvasTexture(cv2); colTex.colorSpace = THREE.SRGBColorSpace
    this.haloCol = new THREE.Sprite(new THREE.SpriteMaterial({ map: colTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false, fog: false }))
    this.haloCol.center.set(0.5, 0)
    this.haloCol.scale.set(0.95, 1.5, 1)
    this.haloGrp = new THREE.Group()
    this.haloGrp.add(this.haloSol, this.haloCol)
    this.haloSol.position.y = SOL + 0.012
    this.haloCol.position.y = SOL + 0.02
    this.scene.add(this.haloGrp)
    this.haloForce = 0
  }

  // ---- Lucioles dans la forêt, poussières dorées sous le toit -------------------------------
  _lucioles() {
    const n = this.mobile ? 36 : 70
    this.lucioles = []
    const tex = lueur('255,232,150', 64)
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }))
      const a = Math.random() * Math.PI * 2, r = RP + 1.6 + Math.random() * 7
      s.userData = { a, r, y: SOL + 0.2 + Math.random() * 2.6, ph: Math.random() * 10, v: 0.4 + Math.random() * 0.8 }
      s.scale.setScalar(0.07 + Math.random() * 0.05)
      this.scene.add(s); this.lucioles.push(s)
    }
  }

  _poussieres() {
    const n = this.mobile ? 180 : 420
    const pos = new Float32Array(n * 3); this.pBase = new Float32Array(n * 3); this.pPh = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * (RP - 0.3)
      this.pBase[i * 3] = Math.cos(a) * r; this.pBase[i * 3 + 1] = SOL + 0.2 + Math.random() * 3.2; this.pBase[i * 3 + 2] = Math.sin(a) * r
      this.pPh[i] = Math.random() * 6.28
    }
    pos.set(this.pBase)
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.pMat = new THREE.PointsMaterial({ map: lueur('255,226,180', 32), size: 0.022, transparent: true, depthWrite: false, opacity: 0.75, blending: THREE.AdditiveBlending, sizeAttenuation: true, toneMapped: false })
    this.points = new THREE.Points(geo, this.pMat); this.nP = n
    this.scene.add(this.points)
  }

  // Rais de soleil : de grands voiles lumineux, dans l'axe du soleil, qui
  // traversent le pavillon entre les piliers.
  _rais() {
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256
    const g = cv.getContext('2d')
    const l = g.createLinearGradient(0, 0, 64, 0)
    l.addColorStop(0, 'rgba(255,214,150,0)'); l.addColorStop(0.5, 'rgba(255,214,150,0.7)'); l.addColorStop(1, 'rgba(255,214,150,0)')
    g.fillStyle = l; g.fillRect(0, 0, 64, 256)
    const v = g.createLinearGradient(0, 0, 0, 256)
    v.addColorStop(0, 'rgba(0,0,0,1)'); v.addColorStop(0.25, 'rgba(0,0,0,0)'); v.addColorStop(0.8, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,1)')
    g.globalCompositeOperation = 'destination-out'; g.fillStyle = v; g.fillRect(0, 0, 64, 256)
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace
    this.rais = []
    const d = this.dirSoleil.clone()
    const lat = new THREE.Vector3(-d.z, 0, d.x).normalize()
    for (let k = 0; k < 5; k++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5 + Math.random() * 0.7, 9), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, side: THREE.DoubleSide, toneMapped: false, fog: false }))
      const off = (k - 2) * 1.5 + (Math.random() - 0.5) * 0.6
      m.position.copy(lat).multiplyScalar(off).add(new THREE.Vector3(0, SOL + 2.0, 0))
      // Le grand axe du voile suit le rayon du soleil.
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d)
      m.userData = { base: 0.05 + Math.random() * 0.05, ph: Math.random() * 6, v: 0.05 + Math.random() * 0.06 }
      this.scene.add(m); this.rais.push(m)
    }
  }

  // ---- Post-traitement : halo des lanternes et du soleil, rendu filmique -------------------
  _post() {
    const w = window.innerWidth, h = window.innerHeight
    this.composer = new EffectComposer(this.renderer)
    this.camRendu = new THREE.PerspectiveCamera(60, w / h, 0.05, 300)
    this.renderPass = new RenderPass(this.scene, this.camRendu)
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.42, 0.6, 0.92)
    this.composer.addPass(this.renderPass)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.resize()
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight
    this.composer.setPixelRatio(this.renderer.getPixelRatio())
    this.composer.setSize(w, h)
    this.bloom.resolution.set(w / 2, h / 2)
  }

  // ---- Interaction ------------------------------------------------------------------------
  _rayon(camera, nx, ny) { this.ray.setFromCamera(new THREE.Vector2(nx, ny), camera) }

  // L'instrument sous le doigt (ou la souris) en vue libre.
  viser(camera, nx, ny) {
    if (!this.pret) return null
    this._rayon(camera, nx, ny)
    const hit = this.ray.intersectObjects(this.cibles, false)[0]
    if (hit) return hit.object.parent
    // Le présentoir compte aussi : on vise souvent un peu bas.
    const pied = this.ray.intersectObjects(this.pieds, true)[0]
    return pied ? this.handpans[this.pieds.indexOf(pied.object.parent)] : null
  }

  // L'instrument le plus près du centre de l'écran (téléphone : pas de survol).
  _auCentre(camera) {
    const avant = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    let best = null, amin = 15 * DEG
    for (const g of this.handpans) {
      const v = g.position.clone().sub(camera.position).normalize()
      const a = v.angleTo(avant)
      if (a < amin) { amin = a; best = g }
    }
    return best
  }

  // On s'approche de cet instrument pour le jouer.
  choisir(g) {
    if (!g) return
    // Sa photo passe devant la file d'attente des autres.
    g.userData.charger()
    this.choisi = g
    this.retourne = false
    this.mode = this.mode === 'dessus' ? 'dessus' : 'jeu'
    this.azimut = 0; this.elev = 54 * DEG
    this.guide = null
    this.on.choix?.(g.userData.modele)
  }

  quitter() {
    if (this.choisi && this.retourne) this.retourne = false
    this.choisi = null
    this.mode = 'libre'
    this.guide = null
  }

  setDessus(on) { if (this.choisi) this.mode = on ? 'dessus' : 'jeu' }

  voisin(sens) {
    if (!this.choisi) return null
    const n = this.handpans.length
    const g = this.handpans[(this.choisi.userData.index + sens + n) % n]
    this.choisir(g)
    return g
  }

  retourner() {
    if (!this.choisi || !this.aDessous(this.choisi)) return false
    this.retourne = !this.retourne
    return this.retourne
  }
  aDessous(g) { return g.userData.champs.some(c => c.userData.bas) }

  // Notes du handpan choisi, de la plus grave à la plus aiguë, pour le clavier.
  champsOrdonnes(bas = this.retourne) {
    if (!this.choisi) return []
    return this.choisi.userData.champs.filter(c => !!c.userData.bas === bas || (!bas && c.userData.idx === 0)).sort((a, b) => a.userData.note - b.userData.note)
  }

  // Frappe d'un champ : son, éclat, onde.
  frapper(champ, vel = 0.9, rejeu = false) {
    const g = champ.userData.handpan
    const pan = clamp(champ.position.x / R, -1, 1) * 0.6
    this.on.note?.(champ.userData.note, vel, pan, champ, rejeu)
    champ.userData.frappe = performance.now()
    const mk = champ.userData.marqueur
    if (mk) mk.userData.pulse = 1
    const halo = g.userData.halo
    halo.visible = true; halo.position.copy(champ.position); halo.quaternion.copy(mk?.quaternion ?? halo.quaternion)
    halo.material.opacity = 0.9; halo.scale.setScalar(0.8)
  }

  // Le doigt : en jeu, chaque appui joue tout de suite (plusieurs doigts à la
  // fois) ; à côté de l'instrument, un glissé le fait tourner.
  _gestes() {
    const el = this.renderer.domElement
    const doigts = new Map()
    el.addEventListener('pointerdown', e => {
      if (this.mode === 'libre' || !this.choisi || this.bloque) return
      const nx = (e.clientX / innerWidth) * 2 - 1, ny = -(e.clientY / innerHeight) * 2 + 1
      const champ = this._champSous(this.camRendu, nx, ny)
      if (champ) { this.frapper(champ, 0.75 + 0.25 * Math.min(1, (e.pressure || 0.5) * 1.6)); doigts.set(e.pointerId, { joue: true }); return }
      doigts.set(e.pointerId, { x: e.clientX, y: e.clientY, az: this.azimut, el: this.elev })
      this.on.tourne?.()
    })
    addEventListener('pointermove', e => {
      const d = doigts.get(e.pointerId)
      if (!d || d.joue) return
      this.azimut = d.az - (e.clientX - d.x) * 0.008
      if (this.mode === 'jeu') this.elev = clamp(d.el + (e.clientY - d.y) * 0.004, 30 * DEG, 84 * DEG)
    }, { passive: true })
    const fin = e => doigts.delete(e.pointerId)
    addEventListener('pointerup', fin); addEventListener('pointercancel', fin)
  }

  _champSous(camera, nx, ny) {
    const g = this.choisi
    if (!g) return null
    this._rayon(camera, nx, ny)
    const bas = this.retourne
    const visibles = g.userData.champs.filter(c => !!c.userData.bas === bas)
    const direct = this.ray.intersectObjects(visibles, false)[0]
    if (direct) return direct.object
    const coque = this.ray.intersectObject(bas ? g.userData.dessous : g.userData.coque, false)[0]
    if (!coque) return null
    const loc = g.worldToLocal(coque.point.clone())
    let best = null, dmin = Infinity
    for (const c of visibles) {
      const d = Math.hypot(c.position.x - loc.x, c.position.z - loc.z)
      if (d < dmin) { dmin = d; best = c }
    }
    return best && dmin < R * 0.4 ? best : null
  }

  // ---- Caméra -------------------------------------------------------------------------------
  // Vue libre : l'œil au centre, le regard donné par Foret (doigt, gyroscope).
  // En jeu : devant l'instrument, à la bonne distance pour qu'il remplisse la
  // partie de l'écran au-dessus du panneau ; on tourne autour au doigt.
  _cibleCamera(cam, yaw, pitch, t) {
    const pos = new THREE.Vector3(), q = new THREE.Quaternion()
    if (this.mode === 'libre' || !this.choisi) {
      if (this.attract) { yaw = this.capVers(0) + Math.sin(t * 0.05) * 0.55; pitch = -9 * DEG }
      pos.set(0, 0, 0)
      q.setFromEuler(new THREE.Euler(pitch, yaw, 0, 'YXZ'))
      return { pos, q, fov: cam.aspect < 1 ? 66 : 56 }
    }
    const g = this.choisi
    const centre = g.userData.repos.clone()
    if (this.retourne) centre.y += 0.22
    const fov = cam.aspect < 1 ? 60 : 50
    const tv = Math.tan(fov * DEG / 2), th = tv * cam.aspect
    const utile = 1 - this.panneau * 0.92                     // hauteur d'écran libre au-dessus du panneau
    const demi = R * 1.1
    const elev = this.mode === 'dessus' ? 89.5 * DEG : this.elev
    const d = Math.max(demi / th, demi * (this.mode === 'dessus' ? 1 : Math.sin(elev) * 1.15) / (tv * utile))
    // Direction depuis l'instrument : vers le centre du temple, puis l'azimut du doigt.
    const ang = g.userData.index != null ? this.angle(g.userData.index) : 0
    const versCentre = new THREE.Vector3(-Math.cos(ang), 0, Math.sin(ang)).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.azimut)
    pos.copy(centre).addScaledVector(versCentre, Math.cos(elev) * d).add(new THREE.Vector3(0, Math.sin(elev) * d, 0))
    // On vise un peu sous l'instrument : il remonte dans la partie libre de l'écran.
    const m = new THREE.Matrix4()
    const haut = this.mode === 'dessus' ? versCentre.clone().negate() : new THREE.Vector3(0, 1, 0)
    const decal = (this.panneau * 0.46) * 2 * tv * d
    const visee = centre.clone()
    const basEcran = this.mode === 'dessus' ? versCentre.clone() : versCentre.clone().multiplyScalar(Math.sin(elev)).add(new THREE.Vector3(0, -Math.cos(elev), 0))
    visee.addScaledVector(basEcran, decal)
    m.lookAt(pos, visee, haut)
    q.setFromRotationMatrix(m)
    return { pos, q, fov }
  }

  // ---- Boucle --------------------------------------------------------------------------------
  dessiner(_, { yaw, pitch }) {
    // Le temps réel (borné) : sur un téléphone lent, la caméra arrive à l'heure.
    const now = performance.now()
    const dt = Math.min(0.25, ((now - (this.tPrec ?? now)) / 1000) || 0.016)
    this.tPrec = now
    const t = (now - this.t0) / 1000
    const cam = this.camRendu
    cam.aspect = innerWidth / innerHeight
    const c = this._cibleCamera(cam, yaw, pitch, t)
    if (!this.initCam) { this.camPos.copy(c.pos); this.camQ.copy(c.q); this.initCam = true }
    if (this.mode === 'libre' && this.camPos.lengthSq() < 0.0004) {
      // Au centre : le regard suit directement Foret, qui le lisse déjà.
      this.camPos.set(0, 0, 0); this.camQ.copy(c.q)
    } else {
      // D'un instrument à l'autre, on tourne autour du centre (coordonnées
      // cylindriques) plutôt que de traverser le temple en ligne droite.
      const k = amorti(dt, this.mode === 'libre' ? 4 : 3.2)
      const r0 = Math.hypot(this.camPos.x, this.camPos.z), r1 = Math.hypot(c.pos.x, c.pos.z)
      if (r0 > 0.05 && r1 > 0.05) {
        const a0 = Math.atan2(this.camPos.z, this.camPos.x), a1 = Math.atan2(c.pos.z, c.pos.x)
        const da = ((a1 - a0 + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI
        const a = a0 + da * k, r = lerp(r0, r1, k)
        this.camPos.set(Math.cos(a) * r, lerp(this.camPos.y, c.pos.y, k), Math.sin(a) * r)
      } else this.camPos.lerp(c.pos, k)
      this.camQ.slerp(c.q, k)
    }
    cam.position.copy(this.camPos); cam.quaternion.copy(this.camQ)
    cam.fov = lerp(cam.fov, c.fov, amorti(dt, 4)); cam.updateProjectionMatrix()

    this._animer(t, dt)
    this.composer.render(dt)
  }

  _animer(t, dt) {
    const cam = this.camRendu
    // Instrument regardé : survol de la souris, ou celui du centre de l'écran.
    const focus = this.mode === 'libre' && !this.attract ? (this.survolSouris || this._auCentre(cam)) : (this.mode !== 'libre' ? this.choisi : null)
    this.focus = focus
    this.haloForce = lerp(this.haloForce, focus ? 1 : 0, amorti(dt, 6))
    if (focus) {
      this.haloGrp.position.set(focus.userData.repos.x, 0, focus.userData.repos.z)
    }
    const pulse = 0.85 + 0.15 * Math.sin(t * 2.4)
    this.haloSol.material.opacity = this.haloForce * pulse * (this.mode === 'libre' ? 1 : 0.55)
    this.haloCol.material.opacity = this.haloForce * pulse * (this.mode === 'libre' ? 0.55 : 0)
    this.haloSol.scale.setScalar(1 + 0.04 * Math.sin(t * 2.4))

    // Bulle au-dessus de l'instrument regardé, en vue libre.
    if (this.on.bulle) {
      if (focus && this.mode === 'libre' && !this.attract) {
        const p = focus.userData.repos.clone(); p.y += 0.42
        p.project(cam)
        this.on.bulle(p.z < 1 ? { modele: focus.userData.modele, x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight } : null)
      } else this.on.bulle(null)
    }

    // Instruments : le choisi se redresse face à nous (et se retourne s'il le faut).
    for (const g of this.handpans) {
      const u = g.userData
      const estChoisi = this.choisi === g && this.mode !== 'libre'
      const cible = u.repos.clone()
      let q = u.reposQ
      if (estChoisi && this.retourne) {
        cible.y += 0.22
        q = u.reposQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI))
      }
      g.position.lerp(cible, amorti(dt, 5))
      g.quaternion.slerp(q, amorti(dt, 5))
      u.marque = lerp(u.marque, estChoisi && !this.retourne ? 1 : 0, amorti(dt, 5))
      u.marqueBas = lerp(u.marqueBas, estChoisi && this.retourne ? 1 : 0, amorti(dt, 5))
      for (const mk of u.marqueurs) {
        mk.userData.pulse *= Math.exp(-dt * 5)
        const guide = this.guide && this.guide.userData.marqueur === mk ? 0.55 + 0.45 * Math.sin(t * 7) : 0
        mk.material.opacity = (mk.userData.bas ? u.marqueBas : u.marque) * (0.16 + 0.08 * Math.sin(t * 2.2 + mk.position.x * 9) + 0.85 * mk.userData.pulse + guide)
        mk.material.color.setHex(guide ? 0xa8ffe0 : 0xfff1cf)
        mk.scale.setScalar(1 + 0.3 * mk.userData.pulse + 0.12 * guide)
        mk.visible = mk.material.opacity > 0.01
      }
      if (u.halo.visible) {
        u.halo.material.opacity *= Math.exp(-dt * 5); u.halo.scale.multiplyScalar(1 + dt * 1.8)
        if (u.halo.material.opacity < 0.02) u.halo.visible = false
      }
    }

    // Étiquettes des notes, sur l'instrument joué.
    if (this.on.etiquettes) {
      const liste = []
      if (this.choisi && this.mode !== 'libre') {
        const bas = this.retourne
        for (const c of this.choisi.userData.champs) {
          if (!!c.userData.bas !== bas) continue
          const p = c.getWorldPosition(new THREE.Vector3()).project(cam)
          liste.push({ champ: c, x: (p.x + 1) / 2 * innerWidth, y: (1 - p.y) / 2 * innerHeight, actif: performance.now() - (c.userData.frappe ?? 0) < 380 })
        }
      }
      this.on.etiquettes(liste)
    }

    // Lanternes : la flamme respire.
    for (const l of this.lanternes) {
      const f = 0.9 + 0.1 * Math.sin(t * 2.3 + l.userData.phase) * Math.sin(t * 0.7 + l.userData.phase)
      l.userData.corps.material.emissiveIntensity = 2.2 * f
      if (l.userData.lum) l.userData.lum.intensity = (this.mobile ? 3 : 4) * f
      l.rotation.z = Math.sin(t * 0.6 + l.userData.phase) * 0.02
    }
    // Lucioles : elles dérivent et clignotent.
    for (const s of this.lucioles) {
      const u = s.userData
      const a = u.a + Math.sin(t * 0.05 * u.v + u.ph) * 0.3
      s.position.set(Math.cos(a) * u.r, u.y + Math.sin(t * 0.3 * u.v + u.ph) * 0.25, Math.sin(a) * u.r)
      s.material.opacity = Math.max(0, Math.sin(t * 0.9 * u.v + u.ph * 3)) ** 3
    }
    // Poussières dans la lumière.
    const pos = this.points.geometry.attributes.position.array
    for (let i = 0; i < this.nP; i++) {
      pos[i * 3] = this.pBase[i * 3] + Math.sin(t * 0.12 + this.pPh[i]) * 0.15
      pos[i * 3 + 1] = SOL + ((this.pBase[i * 3 + 1] - SOL + t * 0.015 + Math.sin(t * 0.08 + this.pPh[i] * 1.3) * 0.12) % 3.4)
      pos[i * 3 + 2] = this.pBase[i * 3 + 2] + Math.cos(t * 0.1 + this.pPh[i] * 0.7) * 0.15
    }
    this.points.geometry.attributes.position.needsUpdate = true
    for (const m of this.rais) m.material.opacity = m.userData.base * (0.6 + 0.4 * Math.sin(t * m.userData.v * 6.283 + m.userData.ph))
  }
}

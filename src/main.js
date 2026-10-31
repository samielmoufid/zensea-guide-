// Orchestration du temple : accueil sur la scène réelle → déverrouillage du
// son et du gyroscope → voile doré → le temple, ses dix-sept handpans, et
// tout ce qu'on peut y faire (jouer, écouter, apprendre, enregistrer, choisir).

import { Foret } from './foret.js'
import { Ambiance } from './ambiance.js'
import { Temple } from './temple.js'
import { Livre } from './livre.js'
import { Loupe } from './loupe.js'
import { MODELES, FAMILLES, CONFIGS, chargerCatalogue, nomNote, prix, plageNotes, gammeDe, urlFiche } from './hpdata.js'
import { MELODIES, LECONS, jouerAir } from './melodies.js'

const N_PAGES = 19
const DEG = Math.PI / 180
const REGARD = -13 * DEG         // le regard, posé sur les instruments

const $ = s => document.querySelector(s)
const params = new URLSearchParams(location.search)
const mobile = matchMedia('(pointer: coarse)').matches || /iPhone|iPad|Android/i.test(navigator.userAgent)
const reduit = matchMedia('(prefers-reduced-motion: reduce)').matches

const entry = $('#entry'), hud = $('#hud'), veil = $('#veil'), hint = $('#entry-hint')
const btnSon = $('#enter-sound'), btnSilence = $('#enter-silent'), toggle = $('#sound-toggle')
const aideEl = $('#t-aide'), bulle = $('#t-bulle'), notesEl = $('#t-notes')
const tous = $('#t-tous'), prec = $('#t-prec'), suiv = $('#t-suiv')
const panneau = $('#panneau'), poignee = $('#poignee'), menu = $('#p-menu')
const lecture = $('#lecture'), livreNum = $('#livre-num')
const leconEl = $('#t-lecon')

// ---- Préférences (gardées d'une visite à l'autre) ----------------------------
const prefs = { hz: 440, noms: 'fr', ambiance: 'foret' }
try { Object.assign(prefs, JSON.parse(localStorage.getItem('zensea-temple') || '{}')) } catch {}
const garderPrefs = () => { try { localStorage.setItem('zensea-temple', JSON.stringify(prefs)) } catch {} }

const ambiance = new Ambiance()
let son = false                  // le son est-il ouvert ?
let foret = null, temple = null
let webgl = !params.has('no3d')

// ---- Scène ---------------------------------------------------------------
try {
  if (webgl) {
    foret = new Foret($('#scene'), { mobile, pavillon: false })
    temple = new Temple(foret.renderer, { mobile })
  }
} catch (e) {
  console.warn('WebGL indisponible :', e)
  webgl = false
}
window.__temple = temple
if (!webgl) {
  $('#scene').hidden = true
  $('#fallback').hidden = false
}

// Le temple se charge pendant l'accueil ; on n'entre jamais dans le noir.
const barre = $('#t-charge-barre')
const pret = (async () => {
  if (!temple) throw new Error('pas de WebGL')
  await Promise.all([
    chargerCatalogue('./temple/catalogue.json'),
    temple.charger(p => { barre.style.width = `${Math.round(p * 100)}%`; hint.textContent = `Préparation du temple… ${Math.round(p * 100)} %` })
  ])
  livre?.setEnvironment(temple.env)
  foret.entrerAtelier(temple, temple.capVers(0))
  entry.classList.add('is-scene')
  $('.t-charge').classList.add('is-fini')
  hint.textContent = mobile ? 'Le temple est prêt' : 'Le temple est prêt · casque conseillé'
  btnSon.disabled = false; btnSilence.disabled = false
})().catch(err => {
  console.error(err)
  if (!webgl) {
    hint.textContent = 'Votre navigateur ne peut pas afficher la 3D. Découvrez nos handpans sur zensea.fr.'
    btnSilence.disabled = false
    btnSilence.textContent = 'Voir les handpans sur zensea.fr'
    btnSilence.onclick = () => { location.href = 'https://zensea.fr/' }
  } else hint.textContent = 'Le temple met du temps à charger… vérifiez votre connexion.'
})

// ---- Le livre (guide offert) -----------------------------------------------
let livre = null, loupe = null
const urlPage = p => `./livre/page-${String(p).padStart(2, '0')}.jpg`
if (foret) {
  livre = new Livre(foret.renderer, {
    mobile, nPages: N_PAGES,
    on: {
      ouvert: () => { hud.classList.add('is-lecture'); lecture.hidden = false; majPage(); montrerAideLivre() },
      ferme: () => { foret.lecture = false; temple.bloque = false; hud.classList.remove('is-lecture'); lecture.hidden = true },
      change: () => majPage(),
      tourne: (dir, rigide) => { if (son) ambiance.page(0.7, rigide) },
      zoom: () => majPage(),
      loupe: p => { if (p) loupe.ouvrir(p) }
    }
  })
  livre.visible = false
  foret.apres = (cam, dt) => livre.rendu(cam, dt)
  loupe = new Loupe($('#loupe'), {
    url: urlPage, total: N_PAGES,
    onOpen: () => { lecture.classList.remove('is-hint'); clearTimeout(aideLivreTimer); aideLivreVue = true },
    onClose: () => {
      const p = loupe.page, etaitZoom = !!livre.zoom
      livre.goTo(Livre.feuillePour(p))
      if (etaitZoom || mobile) livre.zoomTo(p % 2 === 1 ? 'right' : 'left')
    }
  })
}

function ouvrirLivre() {
  if (!livre || livre.ouvert) return
  arreterTout()
  foret.lecture = true
  temple.bloque = true
  livre.charger()
  livre.ouvrir(temple.camRendu)
}

function majPage() {
  if (!livre) return
  const T = livre.turned, S = livre.S
  let txt
  if (livre.zoom) { const p = livre.page(livre.zoom.side); txt = p ? `${p} / ${N_PAGES}` : (T === 0 ? 'Couverture' : '') }
  else if (T === 0) txt = 'Couverture'
  else if (T >= S) txt = 'Fin'
  else {
    const g = livre.page('left'), d = livre.page('right')
    txt = g && d ? `${g} – ${d} / ${N_PAGES}` : (g || d) ? `${g || d} / ${N_PAGES}` : ''
  }
  livreNum.textContent = txt
}
let aideLivreTimer, aideLivreVue = false
function montrerAideLivre() {
  if (aideLivreVue) return
  lecture.classList.add('is-hint')
  clearTimeout(aideLivreTimer)
  aideLivreTimer = setTimeout(() => lecture.classList.remove('is-hint'), 7000)
}
$('#livre-fermer').addEventListener('click', () => livre?.fermer())
$('#livre-prev').addEventListener('click', () => { if (!livre) return; livre.zoom ? livre.zoomNav(-1) : livre.prev() })
$('#livre-next').addEventListener('click', () => { if (!livre) return; livre.zoom ? livre.zoomNav(1) : livre.next() })

// ---- Boucle ---------------------------------------------------------------
if (foret) {
  let raf
  const boucle = () => {
    if (temple.pret) foret.rendu()
    raf = requestAnimationFrame(boucle)
  }
  boucle()
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else boucle() })
  addEventListener('resize', () => { temple.resize(); majPanneau() })
}

// ---- Entrée ----------------------------------------------------------------
let entre = false
async function entrer(avecSon) {
  if (entre) return
  entre = true
  // Le son et le gyroscope exigent le geste : tout part d'ici, avant toute attente.
  if (avecSon && ambiance.unlock()) son = true
  if (foret && mobile) foret.activerGyro().catch(() => {})
  await pret
  toggle.setAttribute('aria-pressed', son ? 'true' : 'false')
  if (son) ambiance.setAmbiance(prefs.ambiance)

  entry.classList.add('is-leaving')
  veil.style.transition = 'opacity 1.1s cubic-bezier(.4,0,.6,1)'
  void veil.offsetHeight
  veil.style.opacity = '0.92'
  await attendre(1100)
  entry.remove()
  hud.hidden = false
  temple.attract = false
  foret.regarder(temple.capVers(0), REGARD)
  veil.style.transition = 'opacity 2.6s cubic-bezier(.3,0,.2,1)'
  veil.style.opacity = '0'
  await attendre(reduit ? 300 : 900)
  hud.classList.add('is-live')
  // Venu d'une fiche produit (guide.zensea.fr/?handpan=103) : ce handpan-là, tout de suite.
  const id = params.get('handpan')
  const g = id && temple.handpans.find(h => h.userData.modele.id === id)
  if (g) ouvrir(g)
  else {
    aide(mobile ? 'Glissez ou inclinez le téléphone pour regarder · touchez un handpan pour le jouer' : 'Faites glisser pour regarder autour de vous · cliquez sur un handpan pour le jouer', 6000)
    const astuce = $('#t-astuce'); astuce.hidden = false
  }
}
btnSon.addEventListener('click', () => entrer(true))
btnSilence.addEventListener('click', () => entrer(false))

// ---- Aide ------------------------------------------------------------------
let aideTimer
function aide(txt, duree = 4500) {
  aideEl.textContent = txt
  aideEl.classList.add('is-on')
  clearTimeout(aideTimer)
  aideTimer = setTimeout(() => aideEl.classList.remove('is-on'), duree)
}

// ---- Vue libre : bulle et choix d'un instrument ------------------------------
let bulleModele = null
if (temple) {
  temple.on.bulle = info => {
    if (!info || hud.hidden) { if (!bulle.hidden) bulle.hidden = true; bulleModele = null; return }
    const m = info.modele
    if (m !== bulleModele) {
      bulleModele = m
      bulle.querySelector('.t-bulle__nom').textContent = m.nom
      bulle.querySelector('.t-bulle__sous').innerHTML = `${m.couleur}${m.prixMin ? ` · dès <b>${prix(m.prixMin)}</b>` : ''}`
      bulle.querySelector('.t-bulle__act span').textContent = mobile ? 'Toucher pour jouer' : 'Cliquer pour jouer'
    }
    bulle.hidden = false
    bulle.style.left = `${clamp(info.x, 100, innerWidth - 100)}px`
    bulle.style.top = `${clamp(info.y, 120, innerHeight - 40)}px`
  }
  bulle.addEventListener('click', () => { if (temple.focus) ouvrir(temple.focus) })
  foret.onTap = (nx, ny) => {
    if (livre?.ouvert || temple.mode !== 'libre' || hud.hidden) return
    const g = temple.viser(temple.camRendu, nx, ny)
    if (g) ouvrir(g)
  }
  foret.onInteraction = () => aideEl.classList.remove('is-on')
  $('#scene').addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse' || temple.mode !== 'libre' || livre?.ouvert) return
    const g = temple.viser(temple.camRendu, (e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1)
    temple.survolSouris = g
    document.body.style.cursor = g ? 'pointer' : ''
  }, { passive: true })
  temple.on.tourne = () => aideEl.classList.remove('is-on')
}

// ---- Jouer un instrument ---------------------------------------------------------
const modeleChoisi = () => temple?.choisi?.userData.modele

function ouvrir(g) {
  if (!g) return
  arreterTout()
  fermerFeuilles()
  temple.survolSouris = null
  document.body.style.cursor = ''
  temple.choisir(g)
  foret.statique = true
  hud.classList.add('is-jeu')
  panneau.hidden = false; tous.hidden = false; prec.hidden = false; suiv.hidden = false
  bulle.hidden = true
  $('#t-astuce').hidden = true
  remplirPanneau()
  if (son) ambiance.sourdine(true)
  aide(mobile ? 'Touchez les notes · glissez à côté pour tourner autour' : 'Cliquez sur les notes, ou jouez au clavier (1 à 0) · glissez à côté pour tourner', 5000)
  // Sa voix, tout de suite : le ding, puis deux notes.
  if (son) {
    const cs = temple.champsOrdonnes(false)
    ;[[0, 0.75, 650], [4, 0.6, 1000], [6, 0.55, 1250]].forEach(([r, v, t]) => setTimeout(() => { if (temple.choisi === g && cs[r]) temple.frapper(cs[r], v, true) }, t))
  }
  try { history.replaceState(null, '', `?handpan=${g.userData.modele.id}`) } catch {}
}

function fermer() {
  if (!temple.choisi) return
  arreterTout()
  const i = temple.choisi.userData.index
  temple.quitter()
  foret.statique = false
  foret.regarder(temple.capVers(i), REGARD)
  hud.classList.remove('is-jeu')
  panneau.hidden = true; tous.hidden = true; prec.hidden = true; suiv.hidden = true
  panneau.classList.remove('is-ouvert'); poignee.setAttribute('aria-expanded', 'false')
  menu.hidden = true
  if (son) ambiance.sourdine(false)
  aide(mobile ? 'Glissez pour regarder autour de vous · touchez un handpan pour le jouer' : 'Faites glisser pour regarder · cliquez sur un handpan pour le jouer')
  try { history.replaceState(null, '', location.pathname) } catch {}
}
tous.addEventListener('click', fermer)
prec.addEventListener('click', () => voisin(-1))
suiv.addEventListener('click', () => voisin(1))
function voisin(sens) {
  arreterTout()
  const g = temple.voisin(sens)
  if (!g) return
  remplirPanneau()
  if (son) setTimeout(() => { const cs = temple.champsOrdonnes(false); if (cs[0] && temple.choisi === g) temple.frapper(cs[0], 0.7, true) }, 700)
  try { history.replaceState(null, '', `?handpan=${g.userData.modele.id}`) } catch {}
}

// Le panneau : nom, prix de la configuration, réglages.
function remplirPanneau() {
  const g = temple.choisi, m = modeleChoisi()
  if (!m) return
  const n = m.n ?? m.configs[0]
  $('#p-nom').textContent = m.nom
  const v = m.variantes?.[`${n}-${prefs.hz}`]
  $('#p-prix').textContent = v ? prix(v.prix) : (m.prixMin ? `dès ${prix(m.prixMin)}` : '')
  $('#p-gamme').textContent = `${gammeDe(m, n)} · ${n} notes`
  const fiche = urlFiche(m, n, prefs.hz)
  $('#p-choisir').href = fiche; $('#p-fiche').href = fiche
  $('#p-choisir').textContent = m.handle ? 'Je le veux' : 'Voir la boutique'
  $('#p-description').textContent = m.sous
  // Nombre de notes : une case par configuration vendue, avec son prix.
  const seg = $('#p-notes')
  seg.innerHTML = ''
  for (const c of m.configs) {
    const b = document.createElement('button')
    b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', c === n ? 'true' : 'false')
    const pv = m.variantes?.[`${c}-${prefs.hz}`]
    b.innerHTML = `${c}${pv ? `<small>${prix(pv.prix).replace(/\s?€/, ' €')}</small>` : ''}`
    b.addEventListener('click', () => changerConfig(c))
    seg.appendChild(b)
  }
  $('#g-notes').classList.toggle('t-segments--prix', true)
  const bas = CONFIGS[n].bas.length
  $('#p-notes-info').textContent = m.dessous ? 'Neuf notes dessus, huit dessous : retournez-le pour jouer la seconde gamme.'
    : bas ? `Dont ${bas} sous la coque : touchez « Retourner » pour les jouer.` : n === 10 ? 'Une note aiguë de plus sur le dessus.' : 'La configuration de référence, champs larges et bien séparés.'
  for (const b of document.querySelectorAll('#p-hz button')) b.setAttribute('aria-checked', String(+b.dataset.hz === prefs.hz))
  for (const b of document.querySelectorAll('#p-noms button')) b.setAttribute('aria-checked', String(b.dataset.noms === prefs.noms))
  for (const b of document.querySelectorAll('#p-ambiance button')) b.setAttribute('aria-checked', String(b.dataset.amb === prefs.ambiance))
  const ret = $('#p-retourner')
  ret.hidden = !temple.aDessous(g)
  ret.querySelector('span').textContent = temple.retourne ? 'Remettre à l’endroit' : 'Retourner'
  $('#p-dessus').classList.toggle('is-on', temple.mode === 'dessus')
  majPanneau()
}

function changerConfig(n) {
  const g = temple.choisi, m = modeleChoisi()
  if (!m || m.n === n) return
  arreterTout()
  m.n = n
  if (temple.retourne && !CONFIGS[n].bas.length) temple.retourner()
  g.userData.configurer(CONFIGS[n].haut, CONFIGS[n].bas)
  remplirPanneau()
  // On entend tout de suite la configuration : une montée sur toutes les notes du dessus.
  if (son) temple.champsOrdonnes(false).forEach((c, k) => setTimeout(() => { if (temple.choisi === g) temple.frapper(c, 0.55, true) }, 120 + k * 85))
}

for (const b of document.querySelectorAll('#p-hz button')) b.addEventListener('click', () => { prefs.hz = +b.dataset.hz; garderPrefs(); remplirPanneau(); const cs = temple.champsOrdonnes(); if (son && cs[0]) temple.frapper(cs[0], 0.7, true) })
for (const b of document.querySelectorAll('#p-noms button')) b.addEventListener('click', () => { prefs.noms = b.dataset.noms; garderPrefs(); remplirPanneau() })
for (const b of document.querySelectorAll('#p-ambiance button')) b.addEventListener('click', () => {
  prefs.ambiance = b.dataset.amb; garderPrefs(); remplirPanneau()
  if (son) { ambiance.setAmbiance(prefs.ambiance); if (prefs.ambiance !== 'aucune') ambiance.sourdine(true) }
  else toast('Activez le son en haut à droite pour entendre l’ambiance.')
})

// Hauteur du panneau : l'instrument se cadre au-dessus, l'aide et les messages aussi.
function majPanneau() {
  if (!temple) return
  const h = panneau.hidden ? 0 : panneau.getBoundingClientRect().height
  const ecranLarge = innerWidth >= 900
  temple.panneau = ecranLarge ? 0 : Math.min(0.7, h / innerHeight)
  document.body.style.setProperty('--t-panneau', `${ecranLarge ? 24 : h}px`)
}
if ('ResizeObserver' in window) new ResizeObserver(majPanneau).observe(panneau)
poignee.addEventListener('click', () => {
  const ouvert = panneau.classList.toggle('is-ouvert')
  poignee.setAttribute('aria-expanded', String(ouvert))
  poignee.setAttribute('aria-label', ouvert ? 'Masquer les réglages' : 'Afficher les réglages')
  if (ouvert) menu.hidden = true
  majPanneau()
})

$('#p-dessus').addEventListener('click', () => {
  temple.setDessus(temple.mode !== 'dessus')
  $('#p-dessus').classList.toggle('is-on', temple.mode === 'dessus')
  if (temple.mode === 'dessus') aide('Vue de dessus : toutes les notes à plat sous les doigts')
})
$('#p-retourner').addEventListener('click', () => {
  arreterTout()
  const bas = temple.retourner()
  remplirPanneau()
  if (son) setTimeout(() => { const cs = temple.champsOrdonnes(bas); if (cs[0]) temple.frapper(cs[0], 0.7, true) }, 900)
})

// ---- Le son des notes, et ce qui en dépend (leçon, enregistrement) -----------------
let avertiSilence = false
if (temple) {
  temple.on.note = (f, vel, pan, champ, rejeu) => {
    if (son) ambiance.noteProche(f * prefs.hz / 440, vel, pan)
    else if (!rejeu && !avertiSilence) { avertiSilence = true; toast('Le son est coupé : touchez le haut-parleur en haut à droite.') }
    if (rejeu) return
    if (mobile && navigator.vibrate) { try { navigator.vibrate(6) } catch {} }
    if (enreg) enreg.evts.push({ t: performance.now() - enreg.t0, f: champ.userData.note, bas: !!champ.userData.bas, vel })
    if (lecon) suiteLecon(champ)
  }
}

// Noms des notes, posés sur les champs.
const pool = []
if (temple) {
  temple.on.etiquettes = liste => {
    const montrer = prefs.noms !== 'aucun'
    let k = 0
    for (const e of liste) {
      const guide = temple.guide === e.champ
      if (!montrer && !guide) continue
      let el = pool[k]
      if (!el) { el = document.createElement('span'); el.className = 't-note'; notesEl.appendChild(el); pool.push(el) }
      const txt = nomNote(e.champ.userData.note, prefs.noms === 'en' ? 'en' : 'fr')
      if (el.textContent !== txt) el.textContent = txt
      el.style.display = ''
      el.style.left = `${e.x}px`; el.style.top = `${e.y}px`
      el.classList.toggle('is-ding', e.champ.userData.idx === 0)
      el.classList.toggle('is-actif', e.actif)
      el.classList.toggle('is-guide', guide)
      k++
    }
    for (; k < pool.length; k++) pool[k].style.display = 'none'
  }
}

// ---- Jeu automatique ----------------------------------------------------------------
let stopMelodie = null
function menuDe(titre, items, choisir) {
  menu.innerHTML = ''
  for (const it of items) {
    const b = document.createElement('button')
    b.type = 'button'
    b.innerHTML = `<span><b>${it.nom}</b><small>${it.sous}</small></span><span class="t-menu__go" aria-hidden="true">›</span>`
    b.addEventListener('click', () => { menu.hidden = true; choisir(it) })
    menu.appendChild(b)
  }
  menu.dataset.titre = titre
  panneau.classList.remove('is-ouvert')
  menu.hidden = false
  majPanneau()
}
$('#p-melodie').addEventListener('click', () => {
  if (stopMelodie) return arreterMelodie()
  if (!menu.hidden && menu.dataset.titre === 'melodie') { menu.hidden = true; return majPanneau() }
  menuDe('melodie', MELODIES, air => {
    arreterTout()
    if (!son) toast('Le son est coupé : touchez le haut-parleur en haut à droite.')
    if (temple.retourne) { temple.retourner(); remplirPanneau() }
    const g = temple.choisi
    stopMelodie = jouerAir(air, (rang, force) => {
      if (temple.choisi !== g) return
      const cs = temple.champsOrdonnes(false)
      const c = cs[Math.min(rang, cs.length - 1)]
      if (c) temple.frapper(c, force, true)
    }, { fin: arreterMelodie })
    const b = $('#p-melodie'); b.classList.add('is-on'); b.querySelector('span').textContent = `Arrêter · ${air.nom}`
    aide(`« ${air.nom} », joué sur ce handpan`)
  })
})
function arreterMelodie() {
  stopMelodie?.(); stopMelodie = null
  const b = $('#p-melodie'); b.classList.remove('is-on'); b.querySelector('span').textContent = 'Écouter une mélodie'
}

// ---- Apprendre --------------------------------------------------------------------------
let lecon = null
$('#p-apprendre').addEventListener('click', () => {
  if (lecon) return finLecon()
  if (!menu.hidden && menu.dataset.titre === 'lecon') { menu.hidden = true; return majPanneau() }
  menuDe('lecon', LECONS, l => {
    arreterTout()
    if (temple.retourne) { temple.retourner(); remplirPanneau() }
    lecon = { l, i: 0, rates: 0 }
    leconEl.hidden = false
    leconEl.querySelector('.t-lecon__titre').textContent = l.nom
    leconEl.querySelector('.t-lecon__points').innerHTML = l.notes.map(() => '<i></i>').join('')
    $('#p-apprendre').classList.add('is-on'); $('#p-apprendre').querySelector('span').textContent = 'Arrêter la leçon'
    majLecon()
  })
})
leconEl.querySelector('.t-lecon__fin').addEventListener('click', () => finLecon())
function champDuRang(r) { const cs = temple.champsOrdonnes(false); return cs[Math.min(r, cs.length - 1)] }
function majLecon() {
  const { l, i } = lecon
  leconEl.querySelectorAll('.t-lecon__points i').forEach((p, k) => { p.classList.toggle('is-fait', k < i); p.classList.toggle('is-la', k === i) })
  if (i >= l.notes.length) {
    temple.guide = null
    const etoiles = lecon.rates === 0 ? '★★★' : lecon.rates < 4 ? '★★☆' : '★☆☆'
    leconEl.querySelector('.t-lecon__texte').textContent = `Bravo, leçon réussie ${etoiles}`
    leconEl.querySelector('.t-lecon__fin').textContent = 'Fermer'
    return
  }
  temple.guide = champDuRang(l.notes[i])
  const nom = temple.guide ? nomNote(temple.guide.userData.note, prefs.noms === 'en' ? 'en' : 'fr') : ''
  leconEl.querySelector('.t-lecon__texte').textContent = i === 0 ? `Touchez la note qui brille (${nom})` : `Maintenant : ${nom}`
  leconEl.querySelector('.t-lecon__fin').textContent = 'Arrêter'
}
function suiteLecon(champ) {
  if (!lecon || lecon.i >= lecon.l.notes.length) return
  if (champ === temple.guide) { lecon.i++; majLecon() }
  else { lecon.rates++; leconEl.classList.remove('is-raté'); void leconEl.offsetWidth; leconEl.classList.add('is-raté') }
}
function finLecon() {
  lecon = null
  if (temple) temple.guide = null
  leconEl.hidden = true
  const b = $('#p-apprendre'); b.classList.remove('is-on'); b.querySelector('span').textContent = 'Apprendre'
}

// ---- Enregistrer, réécouter ---------------------------------------------------------------
let enreg = null, dernier = null, enregTimer = null, stopRejeu = null
const reecouter = $('#p-reecouter')
$('#p-enreg').addEventListener('click', () => {
  const b = $('#p-enreg')
  if (enreg) {
    clearInterval(enregTimer)
    dernier = enreg.evts.length ? enreg.evts : dernier
    enreg = null
    b.classList.remove('is-rec'); b.querySelector('span').textContent = 'Enregistrer'
    reecouter.hidden = !dernier
    if (dernier) toast('Enregistré. Touchez « Réécouter ».')
    return
  }
  arreterMelodie(); arreterRejeu()
  enreg = { t0: performance.now(), evts: [] }
  b.classList.add('is-rec')
  const maj = () => { const s = Math.floor((performance.now() - enreg.t0) / 1000); b.querySelector('span').textContent = `Arrêter · ${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }
  maj(); enregTimer = setInterval(() => enreg && maj(), 500)
  aide('Jouez : tout est enregistré, jusqu’à ce que vous arrêtiez')
})
reecouter.addEventListener('click', () => {
  if (stopRejeu) return arreterRejeu()
  if (!dernier?.length) return
  arreterMelodie()
  const g = temple.choisi
  const timers = dernier.map(e => setTimeout(() => {
    if (temple.choisi !== g) return
    const c = g.userData.champs.find(c => c.userData.note === e.f && !!c.userData.bas === e.bas) ?? g.userData.champs[0]
    if (!!c.userData.bas !== temple.retourne) temple.retourner()
    temple.frapper(c, e.vel, true)
  }, e.t - dernier[0].t + 200))
  timers.push(setTimeout(arreterRejeu, dernier[dernier.length - 1].t - dernier[0].t + 2400))
  stopRejeu = () => timers.forEach(clearTimeout)
  reecouter.classList.add('is-on'); reecouter.querySelector('span').textContent = 'Arrêter'
})
function arreterRejeu() {
  stopRejeu?.(); stopRejeu = null
  reecouter.classList.remove('is-on'); reecouter.querySelector('span').textContent = 'Réécouter'
}

function arreterTout() {
  arreterMelodie(); arreterRejeu(); finLecon()
  if (enreg) $('#p-enreg').click()
  menu.hidden = true
}

// ---- Catalogue des modèles -------------------------------------------------------------
const feuilleModeles = $('#feuille-modeles'), feuilleGuide = $('#feuille-guide')
let filtre = 'tous'
function remplirCatalogue() {
  const f = $('#filtres'), c = $('#cartes')
  f.innerHTML = ''
  for (const fam of FAMILLES) {
    const n = fam.id === 'tous' ? MODELES.length : MODELES.filter(m => m.famille === fam.id).length
    if (!n) continue
    const b = document.createElement('button')
    b.type = 'button'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(fam.id === filtre))
    b.textContent = `${fam.nom} (${n})`
    b.addEventListener('click', () => { filtre = fam.id; remplirCatalogue() })
    f.appendChild(b)
  }
  c.innerHTML = ''
  const choisi = modeleChoisi()
  let n = 0
  for (const m of MODELES) {
    if (filtre !== 'tous' && m.famille !== filtre) continue
    const carte = document.createElement('article')
    carte.className = 't-carte' + (m === choisi ? ' is-choisi' : '')
    carte.innerHTML = `
      <button class="t-carte__photo" type="button" aria-label="Jouer ${m.nom}"><img src="./atelier/handpans/hp-${m.id}.jpg" alt="" ${n++ < 6 ? '' : 'loading="lazy"'} decoding="async" width="300" height="300"></button>
      <div class="t-carte__corps">
        <span class="t-carte__nom">${m.nom}</span>
        <span class="t-carte__det">${m.couleur} · ré mineur Kurd · ${plageNotes(m)}</span>
        ${m.prixMin ? `<span class="t-carte__prix">dès ${prix(m.prixMin)}</span>` : '<span class="t-carte__prix"></span>'}
        <div class="t-carte__boutons">
          <button class="t-btn t-btn--or" type="button">Jouer</button>
          ${m.handle ? `<a href="${urlFiche(m, m.n ?? m.configs[0], prefs.hz)}" target="_top">Voir la fiche</a>` : ''}
        </div>
      </div>`
    const jouer = () => { fermerFeuilles(); const g = temple.handpans.find(h => h.userData.modele === m); if (g) ouvrir(g) }
    carte.querySelector('.t-carte__photo').addEventListener('click', jouer)
    carte.querySelector('.t-btn').addEventListener('click', jouer)
    c.appendChild(carte)
  }
}
$('#btn-modeles').addEventListener('click', () => { $('#t-astuce').hidden = true; remplirCatalogue(); feuilleModeles.hidden = false; temple && (temple.bloque = true) })
$('#btn-guide').addEventListener('click', () => { feuilleGuide.hidden = false; temple && (temple.bloque = true) })
$('#guide-feuilleter').addEventListener('click', () => { fermerFeuilles(); if (livre) ouvrirLivre(); else location.href = './livre/' })
for (const f of [feuilleModeles, feuilleGuide]) {
  f.addEventListener('click', e => { if (e.target === f || e.target.closest('[data-fermer]')) fermerFeuilles() })
}
function fermerFeuilles() {
  feuilleModeles.hidden = true; feuilleGuide.hidden = true
  if (temple && !livre?.ouvert) temple.bloque = false
}

// ---- Son ---------------------------------------------------------------------------------
toggle.addEventListener('click', () => {
  if (son) {
    son = false
    ambiance.setAmbiance('aucune')
    toggle.setAttribute('aria-pressed', 'false')
    arreterMelodie()
    return
  }
  if (!ambiance.unlock()) return toast('Le son n’est pas disponible sur ce navigateur.')
  son = true
  toggle.setAttribute('aria-pressed', 'true')
  ambiance.setAmbiance(prefs.ambiance)
  if (temple?.mode !== 'libre') ambiance.sourdine(true)
})
document.addEventListener('visibilitychange', () => {
  if (!ambiance.ctx) return
  if (document.hidden) ambiance.ctx.suspend(); else if (son) ambiance.ctx.resume()
})

// ---- Clavier -------------------------------------------------------------------------------
const TOUCHES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0', 'Minus', 'Equal']
addEventListener('keydown', e => {
  if (!temple || hud.hidden || livre?.ouvert || e.metaKey || e.ctrlKey) return
  if (e.key === 'Escape') { if (!feuilleModeles.hidden || !feuilleGuide.hidden) fermerFeuilles(); else fermer(); return }
  if (temple.mode === 'libre') {
    if (e.key === 'Enter' && temple.focus) ouvrir(temple.focus)
    return
  }
  if (e.key === 'ArrowLeft') return voisin(-1)
  if (e.key === 'ArrowRight') return voisin(1)
  let k = TOUCHES.indexOf(e.code)
  if (k < 0 && /^Numpad\d$/.test(e.code)) k = (+e.code.slice(6) + 9) % 10
  if (k < 0 || e.repeat) return
  const c = temple.champsOrdonnes()[k]
  if (c) { temple.frapper(c, 0.85); e.preventDefault() }
})

// ---- Petits outils -------------------------------------------------------------------------
let toastEl, toastTimer
function toast(msg) {
  if (!toastEl) { toastEl = document.createElement('p'); toastEl.className = 'toast'; document.body.appendChild(toastEl) }
  toastEl.textContent = msg
  requestAnimationFrame(() => toastEl.classList.add('is-on'))
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => toastEl.classList.remove('is-on'), 3200)
}
const attendre = ms => new Promise(r => setTimeout(r, ms))
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))

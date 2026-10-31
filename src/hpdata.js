// Les handpans du temple : modèles, gammes, configurations (9 à 14 notes),
// noms des notes, et ce que la boutique en dit (nom, prix, variantes), lu
// dans temple/catalogue.json (scripts/catalogue.py).

// Fréquences en La 440. L'accordage 432 Hz multiplie tout par 432/440.
const F = {
  la2: 110.0, do3: 130.81, re3: 146.83, mi3: 164.81, fa3: 174.61, sol3: 196.0, la3: 220.0, sib3: 233.08, si3: 246.94,
  do4: 261.63, re4: 293.66, mi4: 329.63, fa4: 349.23, fad4: 369.99, sol4: 392.0, la4: 440.0, si4: 493.88,
  do5: 523.25, re5: 587.33, mi5: 659.25
}

// Ré mineur Kurd, la gamme de la maison : le ding, puis la couronne qui monte.
const KURD = [F.re3, F.la3, F.sib3, F.do4, F.re4, F.mi4, F.fa4, F.sol4, F.la4, F.do5, F.re5]
// Ré Gong : les huit notes sous la coque du 17 notes.
const GONG = [F.la3, F.si3, F.re4, F.mi4, F.fad4, F.la4, F.si4, F.re5]

// Les configurations vendues. Au-delà de 10 notes, les notes en plus sont sous
// la coque (on retourne l'instrument pour les jouer), comme sur les vrais.
export const CONFIGS = {
  9: { haut: KURD.slice(0, 9), bas: [] },
  10: { haut: KURD.slice(0, 10), bas: [] },
  12: { haut: KURD.slice(0, 10), bas: [F.fa3, F.sol3] },
  14: { haut: KURD.slice(0, 10), bas: [F.fa3, F.sol3, F.re5, F.mi5] },
  17: { haut: KURD.slice(0, 9), bas: GONG }
}

// Nom d'une note à partir de sa fréquence (La 440), en français ou en anglais.
const FR = ['Do', 'Do♯', 'Ré', 'Mi♭', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'Si♭', 'Si']
const EN = ['C', 'C♯', 'D', 'E♭', 'E', 'F', 'F♯', 'G', 'G♯', 'A', 'B♭', 'B']
export function nomNote(f, notation = 'fr') {
  const midi = Math.round(69 + 12 * Math.log2(f / 440))
  const n = ((midi % 12) + 12) % 12, oct = Math.floor(midi / 12) - 1
  return (notation === 'en' ? EN : FR)[n] + oct
}

// Les dix-sept handpans, dans l'ordre où on les croise en tournant dans le
// temple : les unis devant, les motifs, puis la pièce maîtresse au fond.
// famille : filtre du catalogue. Le reste (rugosité, corde) règle le rendu.
export const MODELES = [
  { id: '103', famille: 'unis', couleur: 'Doré', sous: 'Le doré chaud du nitrurage, obtenu par la température et non par une peinture.', rough: 0.3 },
  { id: '104', famille: 'unis', couleur: 'Argenté', sous: 'Une finition sobre, qui laisse voir le relief du martelage sans le maquiller.', rough: 0.28 },
  { id: '105', famille: 'unis', couleur: 'Bronze', sous: 'Un bronze mat aux reflets cuivrés, le plus proche des premiers handpans suisses.', rough: 0.36 },
  { id: '101', famille: 'unis', couleur: 'Noir mat', sous: 'Sans reflet, sans artifice. L’acier nitruré laisse toute la place au son.', rough: 0.5, metal: 0.45 },
  { id: '102', famille: 'unis', couleur: 'Bleu nuit', sous: 'Presque noir sous une lumière faible, il se révèle dès qu’on l’approche d’une fenêtre.', rough: 0.32 },
  { id: '110', famille: 'unis', couleur: 'Violet profond', sous: 'Un violet sombre, très saturé, qui vire au prune sous une lampe chaude.', rough: 0.3 },
  { id: '109', famille: 'irises', couleur: 'Irisé', sous: 'Des reflets qui passent du violet au vert selon l’angle. À la chaleur, pas au vernis.', rough: 0.22 },
  { id: '114', famille: 'unis', couleur: 'Argenté brossé', sous: 'Un acier brossé aux champs cuivrés, corde tressée au rebord.', rough: 0.4, corde: true },
  { id: '1026', famille: 'unis', couleur: 'Blanc', nom: 'Blanc', sous: 'Un blanc mat, le seul de la maison, avec un joint noir au rebord.', rough: 0.62, metal: 0.12 },
  { id: '125', famille: 'grandes', couleur: 'Doré, 17 notes', sous: 'Neuf notes dessus en ré Kurd, huit dessous en ré Gong : on le retourne pour changer de gamme.', rough: 0.32, corde: true, dessous: true, configs: [17] },
  { id: '121', famille: 'motifs', couleur: 'Mandala argenté', sous: 'Un argent clair, mandala au centre, corde tressée au rebord.', rough: 0.3, corde: true },
  { id: '119', famille: 'motifs', couleur: 'Mandala doré', sous: 'Un mandala fin gravé autour du ding, sur un doré clair.', rough: 0.3 },
  { id: '112', famille: 'motifs', couleur: 'Mandala noir et argent', sous: 'Un mandala gravé sur toute la coque, qui suit les cercles du martelage.', rough: 0.38, metal: 0.45 },
  { id: '108', famille: 'motifs', couleur: 'Motif bleu', sous: 'Un motif gravé sur fond bleu, dessiné autour des champs de notes.', rough: 0.34 },
  { id: '117', famille: 'motifs', couleur: 'Spirale or clair', sous: 'Un or pâle, presque champagne, et des champs à peine creusés.', rough: 0.3 },
  { id: '115', famille: 'motifs', couleur: 'Spirale noire', sous: 'Des cercles concentriques sur un acier bleu-noir, comme des ondes.', rough: 0.24 },
  { id: '106', famille: 'motifs', couleur: 'Vortex noir', sous: 'Une spirale gravée autour du ding, qui tourne avec le regard.', rough: 0.26 }
].map(m => ({ configs: [9, 10, 12, 14], ...m }))

export const FAMILLES = [
  { id: 'tous', nom: 'Tous' },
  { id: 'unis', nom: 'Unis' },
  { id: 'motifs', nom: 'Motifs' },
  { id: 'irises', nom: 'Irisés' },
  { id: 'grandes', nom: '17 notes' }
]

// Ce que la boutique sait de chaque modèle : nom commercial, prix et
// identifiant de chaque variante. Sans catalogue, le temple reste jouable.
export async function chargerCatalogue(url) {
  let cat = {}
  try { cat = await (await fetch(url)).json() } catch (e) { console.warn('catalogue', e) }
  for (const m of MODELES) {
    const c = cat[m.id]
    m.nom = c?.nom ?? m.nom ?? m.couleur
    m.handle = c?.handle ?? null
    m.variantes = c?.variantes ?? {}
    const prix = Object.values(m.variantes).map(v => v.prix)
    m.prixMin = prix.length ? Math.min(...prix) : null
  }
  return MODELES
}

export const gammeDe = (m, n) => n === 17 ? 'Ré Kurd dessus · ré Gong dessous' : 'Ré mineur Kurd'
export const plageNotes = m => m.configs.length > 1 ? `${m.configs[0]} à ${m.configs[m.configs.length - 1]} notes` : `${m.configs[0]} notes`

const EUR = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' })
export const prix = v => v == null ? '' : EUR.format(v)

// La fiche produit, sur la bonne variante quand on la connaît.
export function urlFiche(m, n, hz) {
  if (!m.handle) return 'https://zensea.fr/'
  const v = m.variantes[`${n}-${hz}`]
  return `https://zensea.fr/products/${m.handle}${v ? `?variant=${v.id}` : ''}`
}

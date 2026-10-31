// Ce que le temple sait jouer tout seul (jeu automatique) et ce qu'il apprend
// (leçons). Les notes sont des rangs sur l'instrument, du plus grave au plus
// aigu : 0 = le ding (ré3), 1 la3, 2 si♭3, 3 do4, 4 ré4, 5 mi4, 6 fa4, 7 sol4,
// 8 la4. Tout tient sur un 9 notes : chaque modèle peut tout jouer.
// Un évènement : [temps en temps, rang, force].

const air = (tempo, evts) => ({ tempo, evts })

// Lever du jour : des arpèges lents qui montent depuis le ding.
const LEVER = [
  [0, 0, 1], [0.5, 1, 0.7], [1, 4, 0.8], [1.5, 6, 0.75], [2, 5, 0.7], [2.5, 4, 0.65], [3, 1, 0.7],
  [4, 0, 1], [4.5, 2, 0.7], [5, 4, 0.8], [5.5, 7, 0.75], [6, 6, 0.7], [6.5, 5, 0.65], [7, 4, 0.7],
  [8, 0, 1], [8.5, 1, 0.7], [9, 4, 0.8], [9.5, 8, 0.8], [10, 7, 0.7], [10.5, 6, 0.65], [11, 5, 0.65], [11.5, 4, 0.6],
  [12, 0, 1], [12.5, 3, 0.7], [13, 5, 0.75], [13.5, 4, 0.7], [14, 1, 0.75], [15, 0, 0.9],
  [16, 0, 1], [16.5, 4, 0.7], [17, 6, 0.8], [17.5, 8, 0.85], [18, 7, 0.75], [18.5, 6, 0.7], [19, 5, 0.7],
  [20, 0, 1], [20.5, 3, 0.7], [21, 5, 0.8], [21.5, 7, 0.8], [22, 6, 0.7], [22.5, 5, 0.65], [23, 4, 0.7],
  [24, 0, 1], [24.5, 1, 0.7], [25, 4, 0.8], [25.5, 6, 0.8], [26, 5, 0.7], [26.5, 4, 0.65], [27, 2, 0.7],
  [28, 1, 0.8], [28.5, 4, 0.6], [29, 0, 1]
]

// Rivière : un groove, le ding sur les temps forts, la couronne qui répond.
const RIVIERE = []
const reponses = [[4, 5, 6, 5, 4], [4, 7, 6, 5, 4], [5, 8, 7, 6, 5], [4, 6, 5, 4, 1]]
for (let m = 0; m < 8; m++) {
  const r = reponses[m % 4], t = m * 4
  RIVIERE.push([t, 0, 1], [t + 0.75, r[0], 0.6], [t + 1.5, r[1], 0.75], [t + 2, 0, 0.9], [t + 2.5, r[2], 0.7], [t + 3, r[3], 0.6], [t + 3.5, r[4], 0.6])
}
RIVIERE.push([32, 0, 1], [32.5, 4, 0.7], [33, 1, 0.8])

// Brume d'or : une vraie mélodie, posée sur le ding aux temps forts.
const BRUME = [
  [0, 0, 0.9], [0, 1, 0.75], [1, 4, 0.8], [1.5, 5, 0.75], [2, 6, 0.85], [3, 5, 0.75], [3.5, 4, 0.7],
  [4, 0, 0.9], [4, 3, 0.75], [5, 1, 0.75], [6, 2, 0.8], [6.5, 3, 0.75], [7, 4, 0.8],
  [8, 0, 0.9], [8, 6, 0.8], [9, 5, 0.75], [9.5, 3, 0.7], [10, 1, 0.8],
  [12, 0, 0.9], [12, 4, 0.8], [13, 6, 0.8], [13.5, 7, 0.8], [14, 8, 0.9], [15, 7, 0.75], [15.5, 6, 0.7],
  [16, 0, 0.9], [16, 5, 0.8], [17, 4, 0.75], [18, 3, 0.75], [18.5, 5, 0.75], [19, 4, 0.75],
  [20, 0, 0.9], [20, 1, 0.8], [21, 2, 0.75], [21.5, 1, 0.7], [22, 0, 1], [23, 4, 0.6]
]

export const MELODIES = [
  { id: 'lever', nom: 'Lever du jour', sous: 'Arpèges lents et lumineux', ...air(72, LEVER) },
  { id: 'riviere', nom: 'Rivière', sous: 'Un groove qui coule', ...air(100, RIVIERE) },
  { id: 'brume', nom: 'Brume d’or', sous: 'Une mélodie, posée sur le ding', ...air(80, BRUME) }
]

// Les leçons : les notes à toucher, dans l'ordre. La suivante s'allume.
export const LECONS = [
  { id: 'pas', nom: 'Premiers pas', sous: 'Le ding, puis une note, puis le ding', notes: [0, 1, 0, 4, 0, 6, 0, 5] },
  { id: 'gamme', nom: 'La gamme', sous: 'Du plus grave au plus aigu, et retour', notes: [0, 1, 2, 3, 4, 5, 6, 7, 8, 7, 6, 5, 4, 3, 2, 1, 0] },
  { id: 'air', nom: 'Petit air', sous: 'Le début de « Brume d’or »', notes: [1, 4, 5, 6, 5, 4, 3, 1, 2, 3, 4, 0] }
]

// Joue un air sur l'instrument : à chaque évènement, frapper(rang, force).
// Rend une fonction qui l'arrête.
export function jouerAir(airJoue, frapper, { fin } = {}) {
  const spb = 60 / airJoue.tempo * 1000
  const timers = []
  const t0 = performance.now() + 250
  let dernier = 0
  for (const [beat, rang, force] of airJoue.evts) {
    const at = beat * spb
    dernier = Math.max(dernier, at)
    timers.push(setTimeout(() => frapper(rang, force), Math.max(0, t0 + at - performance.now())))
  }
  timers.push(setTimeout(() => fin?.(), t0 + dernier + 2200 - performance.now()))
  return () => { for (const id of timers) clearTimeout(id) }
}

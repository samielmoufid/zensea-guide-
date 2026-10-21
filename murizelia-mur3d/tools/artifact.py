"""Page d'essai (Artifact) : la carte de la fiche produit + le visualiseur, hors boutique."""
import json, re, sys
BASE = sys.argv[1]
liq = open(BASE + '/theme/snippets/mm-mur-3d.liquid', encoding='utf-8').read()
css_carte = re.search(r'<style>(.*?)</style>', liq, re.S).group(1)
prods = json.load(open(BASE + '/data/produits.json', encoding='utf-8'))
data = [{'h': p['handle'], 't': p['title'], 'u': 'https://murizelia.fr/products/' + p['handle'],
         'prix': int(round(float(p['variants'][0]['price']) * 100)),
         'v': [{'id': int(v['id'].split('/')[-1]), 't': v['title'], 'p': int(round(float(v['price']) * 100)), 'ok': True} for v in p['variants']]}
        for p in prods]
html = r'''<title>Essai Murizelia sur mon mur</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Instrument+Sans:wght@400;500;600&family=Playfair+Display:ital@1&display=swap">
<style>
/* Page d'essai : une colonne façon fiche produit mobile, la carte « Voir en 3D » au centre */
:root{
  --bg:#fbf9f6; --surface:#ffffff; --fg:#1a1715; --muted:#6b625b; --line:rgba(26,23,21,.12); --accent:#7a2632; --ring:#7a2632;
  --mm-head:'Instrument Sans','Inter',system-ui,sans-serif; --mm-body:'Inter',system-ui,-apple-system,'Segoe UI',sans-serif; --mm-accent-font:'Playfair Display',Georgia,serif;
  --mm-bdx:#7a2632; --mm-bdx-dark:#45111c; --mm-cream:#f4efe8; --mm-ink:#1a1715;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){ --bg:#161211; --surface:#211b19; --fg:#f2ece6; --muted:#b5aaa0; --line:rgba(242,236,230,.14); --accent:#e09aa4; --ring:#e09aa4; color-scheme:dark; } }
:root[data-theme="dark"]{ --bg:#161211; --surface:#211b19; --fg:#f2ece6; --muted:#b5aaa0; --line:rgba(242,236,230,.14); --accent:#e09aa4; --ring:#e09aa4; color-scheme:dark; }
body{ background:var(--bg); color:var(--fg); font-family:var(--mm-body); font-size:15px; line-height:1.5; }
.wrap{ max-width:560px; margin:0 auto; padding-left:max(16px, env(safe-area-inset-left, 0px)); padding-right:max(16px, env(safe-area-inset-right, 0px)); padding-block:20px 40px; display:grid; gap:22px; }
.k{ margin:0; font-size:11px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--accent); }
h1{ margin:6px 0 8px; font:500 clamp(24px, 6vw, 30px)/1.15 var(--mm-head); letter-spacing:-.01em; text-wrap:balance; }
h1 em{ font-family:var(--mm-accent-font); font-style:italic; font-weight:400; color:var(--accent); }
.intro p{ margin:0; color:var(--muted); max-width:60ch; }
.etapes{ margin:0; padding:0; list-style:none; display:grid; gap:8px; counter-reset:e; }
.etapes li{ display:flex; gap:10px; align-items:baseline; color:var(--fg); font-size:14px; }
.etapes li::before{ counter-increment:e; content:counter(e); flex:0 0 22px; height:22px; border-radius:50%; display:grid; place-items:center; font-size:12px; font-weight:700; background:var(--accent); color:var(--bg); }
.bloc h2{ margin:0 0 10px; font:600 15px/1.3 var(--mm-head); }
.grille{ display:grid; grid-template-columns:repeat(auto-fill, minmax(72px, 1fr)); gap:10px; }
.t{ padding:0; border:0; background:none; color:var(--fg); cursor:pointer; text-align:center; font:inherit; }
.t img{ display:block; width:100%; height:auto; aspect-ratio:1; object-fit:cover; border-radius:10px; box-shadow:inset 0 0 0 1px var(--line); }
.t span{ display:block; margin-top:4px; font-size:11px; line-height:1.25; color:var(--muted); }
.t[aria-pressed="true"] img{ outline:2.5px solid var(--ring); outline-offset:2px; }
.t:focus-visible img{ outline:2.5px solid var(--ring); outline-offset:2px; }
.fiche{ display:grid; gap:12px; padding:16px; border-radius:18px; background:var(--surface); border:1px solid var(--line); }
.fiche .nom{ margin:0; font:500 19px/1.25 var(--mm-head); }
.fiche .prix{ margin:0; font-variant-numeric:tabular-nums; color:var(--muted); font-size:14px; }
.note{ margin:0; font-size:13px; color:var(--muted); border-top:1px solid var(--line); padding-top:14px; }
.note b{ color:var(--fg); font-weight:600; }
@media (prefers-reduced-motion:reduce){ *{ scroll-behavior:auto; } }
@@CSS_CARTE@@
</style>

<main class="wrap">
  <header class="intro">
    <p class="k">Version d’essai · pas encore sur la boutique</p>
    <h1>Le carrelage Murizelia, <em>sur votre mur</em></h1>
    <p>La même carte et le même visualiseur que sur la fiche produit. Choisissez un carreau, puis photographiez votre mur.</p>
  </header>

  <ol class="etapes">
    <li>Touchez « Voir en 3D sur mon mur », puis « Prendre une photo ».</li>
    <li>Touchez votre mur sur la photo : le carrelage s’y pose en taille réelle.</li>
    <li>Changez de carrelage en bas de l’écran, sans reprendre la photo.</li>
  </ol>

  <section class="fiche" aria-label="Aperçu de la fiche produit">
    <p class="nom" id="nom"></p>
    <p class="prix" id="prix"></p>
    <div class="mm-m3" data-mm-m3>
      <div class="mm-m3__in">
        <div class="mm-m3__mur" aria-hidden="true"><span id="vign"></span></div>
        <div class="mm-m3__txt">
          <p class="mm-m3__k">Essai virtuel</p>
          <p class="mm-m3__t">Voyez-le sur <em>votre</em> mur</p>
          <p class="mm-m3__d">Photo de votre mur ou pièce 3D</p>
        </div>
      </div>
      <button type="button" class="mm-m3__b" id="ouvrir">
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M12 12l8-4.5M12 12v9M12 12L4 7.5"/></svg>
        <span>Voir en 3D sur mon mur</span>
        <svg class="mm-m3__fl" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </div>
  </section>

  <section class="bloc" aria-labelledby="t-choix">
    <h2 id="t-choix">Simuler une autre fiche produit</h2>
    <div class="grille" id="grille"></div>
  </section>

  <p class="note"><b>Dans cette version d’essai</b>, la vidéo en direct est désactivée : passez par « Prendre une photo ». Elle fonctionne sur la boutique. Les boutons de commande ouvrent la vraie boutique Murizelia.</p>
</main>

<script type="module">
const PRODUITS = @@DATA@@;
const nomCourt = (t) => { const [m, r = ''] = t.split(/\s+[–—-]\s+/); let c = r.replace(/^.*?adh[ée]sif\s+/i, '').replace(/^(effet marbre|3D)\s+/i, '').trim(); return { marque: m.trim(), couleur: c.charAt(0).toUpperCase() + c.slice(1) }; };
const eur = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
let courant = 'mosaela-carrelage-adhesif-3d-bleu-azur-25-4x25-4-cm';
try { courant = localStorage.getItem('mm-essai-carreau') || courant; } catch (e) {}
if (!PRODUITS.some((p) => p.h === courant)) courant = PRODUITS[0].h;
const grille = document.getElementById('grille');
grille.innerHTML = PRODUITS.map((p) => { const n = nomCourt(p.t); return `<button type="button" class="t" data-h="${p.h}" aria-pressed="false" aria-label="${n.marque} ${n.couleur}"><img src="assets/mm-mur-${p.h}-t.jpg" alt="" width="120" height="120" loading="lazy"><span>${n.marque}<br>${n.couleur}</span></button>`; }).join('');
function choisir(h) {
  courant = h;
  try { localStorage.setItem('mm-essai-carreau', h); } catch (e) {}
  const p = PRODUITS.find((x) => x.h === h);
  document.getElementById('nom').textContent = p.t;
  document.getElementById('prix').textContent = 'à partir de ' + eur.format(p.prix / 100) + ' · ' + p.v.map((v) => v.t).join(' · ');
  document.getElementById('vign').style.backgroundImage = `url("assets/mm-mur-${h}-t.jpg")`;
  grille.querySelectorAll('.t').forEach((b) => b.setAttribute('aria-pressed', b.dataset.h === h ? 'true' : 'false'));
}
grille.addEventListener('click', (e) => {
  const b = e.target.closest('.t');
  if (!b) return;
  choisir(b.dataset.h);
  document.querySelector('.fiche').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
});
choisir(courant);

async function enregistrer(blob, nom) {
  const d = window.claude && window.claude.use ? await window.claude.use('downloads') : null;
  if (!d) throw { code: 'unavailable' };
  return d.save({ filename: nom, data: blob });
}
let module = null;
const carte = document.querySelector('[data-mm-m3]');
document.getElementById('ouvrir').addEventListener('click', async () => {
  carte.classList.add('is-load');
  try {
    module = module || await import('./assets/mm-mur-3d.js');
    module.ouvrir({ courant, devise: 'EUR', produits: PRODUITS, boutique: 'https://murizelia.fr', video: false, enregistrer, mode: 'photo' });
  } catch (e) {
    console.error(e);
  } finally {
    carte.classList.remove('is-load');
  }
});
</script>
'''
html = html.replace('@@CSS_CARTE@@', css_carte).replace('@@DATA@@', json.dumps(data, ensure_ascii=False))
open(BASE + '/artifact/essai-mur.html', 'w', encoding='utf-8').write(html)
print(len(html))

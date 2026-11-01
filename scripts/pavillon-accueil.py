# Visuel « Jouez-le » : un handpan Zensea vu de dessus, posé dans un anneau de bois,
# sur le fond vert-noir de la marque. Le disque du handpan occupe 78 % du carré.
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance, ImageChops
import math
HP = 'public/atelier/handpans/'
BOIS = 'public/temple/bois-sombre-diff.jpg'
S = 1200; C = S / 2
R_ext, R_int, R_hp = S * .49, S * .405, S * .39
fond = Image.new('RGB', (S, S), (7, 17, 12))
# halo vert derrière
h = Image.new('L', (S, S), 0); dh = ImageDraw.Draw(h)
for r in range(int(S * .62), 0, -6): dh.ellipse((C - r, C - r * .95 - 30, C + r, C + r * .95 - 30), fill=int(255 * (1 - r / (S * .62)) ** 1.4))
fond = Image.composite(Image.new('RGB', (S, S), (30, 66, 48)), fond, h.filter(ImageFilter.GaussianBlur(60)))
# ombre portée de l'anneau
om = Image.new('L', (S, S), 0); ImageDraw.Draw(om).ellipse((C - R_ext + 10, C - R_ext + 30, C + R_ext + 20, C + R_ext + 44), fill=230)
fond = Image.composite(Image.new('RGB', (S, S), (0, 0, 0)), fond, om.filter(ImageFilter.GaussianBlur(34)))
# anneau de bois : texture tournée, biseau clair en haut à gauche, sombre en bas à droite
b = Image.open(BOIS).convert('RGB').resize((S, S)).rotate(30)
b = ImageEnhance.Color(ImageEnhance.Brightness(b).enhance(1.05)).enhance(.7)
teinte = Image.new('RGB', (S, S), (118, 84, 56)); b = ImageChops.multiply(b, teinte.point(lambda x: min(255, int(x * 1.9))))
lum = Image.new('L', (S, S), 0); dl = ImageDraw.Draw(lum)
for k in range(60):
    a = k / 60; dl.ellipse((C - R_ext * (1 - a * .2) - 140 * (1 - a), C - R_ext * (1 - a * .2) - 160 * (1 - a), C + R_ext * (1 - a * .2) - 140 * (1 - a), C + R_ext * (1 - a * .2) - 160 * (1 - a)), fill=int(4 * k))
lum = lum.filter(ImageFilter.GaussianBlur(50))
b = Image.composite(ImageEnhance.Brightness(b).enhance(1.35), ImageEnhance.Brightness(b).enhance(.55), lum)
anneau = Image.new('L', (S, S), 0); da = ImageDraw.Draw(anneau)
da.ellipse((C - R_ext, C - R_ext, C + R_ext, C + R_ext), fill=255); da.ellipse((C - R_int, C - R_int, C + R_int, C + R_int), fill=0)
fond.paste(b, (0, 0), anneau.filter(ImageFilter.GaussianBlur(1.2)))
# filets de biseau
f = Image.new('RGBA', (S, S), (0, 0, 0, 0)); df = ImageDraw.Draw(f)
df.ellipse((C - R_ext + 3, C - R_ext + 3, C + R_ext - 3, C + R_ext - 3), outline=(255, 226, 180, 60), width=3)
df.ellipse((C - R_ext * .965, C - R_ext * .965, C + R_ext * .965, C + R_ext * .965), outline=(255, 235, 200, 45), width=2)
df.ellipse((C - R_int - 4, C - R_int - 4, C + R_int + 4, C + R_int + 4), outline=(20, 10, 4, 170), width=9)
fond = Image.alpha_composite(fond.convert('RGBA'), f.filter(ImageFilter.GaussianBlur(1))).convert('RGB')
# creux sombre sous le handpan
cr = Image.new('L', (S, S), 0); ImageDraw.Draw(cr).ellipse((C - R_int, C - R_int, C + R_int, C + R_int), fill=255)
fond = Image.composite(Image.new('RGB', (S, S), (14, 10, 7)), fond, cr)
oh = Image.new('L', (S, S), 0); ImageDraw.Draw(oh).ellipse((C - R_hp + 6, C - R_hp + 22, C + R_hp + 12, C + R_hp + 30), fill=255)
fond = Image.composite(Image.new('RGB', (S, S), (0, 0, 0)), fond, ImageChops.multiply(oh.filter(ImageFilter.GaussianBlur(22)), cr))
# le handpan
D = int(2 * R_hp); hp = Image.open(HP + 'hp-108.jpg').convert('RGB').resize((D, D), Image.LANCZOS)
m = Image.new('L', (D, D), 0); ImageDraw.Draw(m).ellipse((1, 1, D - 1, D - 1), fill=255)
fond.paste(hp, (int(C - R_hp), int(C - R_hp)), m.filter(ImageFilter.GaussianBlur(1.2)))
# reflet doux venu du haut
rf = Image.new('L', (S, S), 0); ImageDraw.Draw(rf).ellipse((C - R_hp * .9, C - R_hp * 1.05, C + R_hp * .5, C - R_hp * .1), fill=60)
fond = Image.composite(Image.new('RGB', (S, S), (255, 250, 240)), fond, ImageChops.multiply(rf.filter(ImageFilter.GaussianBlur(70)), m.resize((D, D)).crop((0, 0, D, D)).resize((S, S)) if False else rf.filter(ImageFilter.GaussianBlur(70))))
fond.save('medias/accueil/zensea-pavillon-handpan.jpg', quality=88, optimize=True, progressive=True)
fond.resize((600, 600)).save('apercu-pavillon.jpg')
print('ok', R_hp / S)

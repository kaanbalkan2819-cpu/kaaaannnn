#!/usr/bin/env python3
"""V120 - Madalya kalitesinde arayüz plakaları (panel / modal / buton / chip).
Madalyalarla AYNI yöntem: yükseklik haritası (kabartma) -> normal -> ışık + metal yansıma -> aşınma/çizik.
Renkler doğrudan www/medals/*.png dosyalarından örneklenir, yani madalyayla birebir aynı metal.
Çalıştır:  python3 scripts/ui_plates.py   (numpy + pillow gerekir; internet gerekmez)
Çıktı: www/ui/*.png  (9-dilim 'border-image' için tasarlandı, @2x)"""
import os, sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MED = os.path.join(ROOT, 'www', 'medals')
OUT = os.path.join(ROOT, 'www', 'ui')
os.makedirs(OUT, exist_ok=True)


# ---------- yardımcılar ----------
def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def hashn(shape, seed):
    r = np.random.RandomState(seed)
    return r.rand(*shape)


def vnoise(h, w, cell, seed):
    gh, gw = h // cell + 2, w // cell + 2
    g = hashn((gh, gw), seed)
    ys = np.linspace(0, gh - 1.001, h)
    xs = np.linspace(0, gw - 1.001, w)
    yi, xi = ys.astype(int), xs.astype(int)
    yf, xf = ys - yi, xs - xi
    yf = (yf * yf * (3 - 2 * yf))[:, None]
    xf = (xf * xf * (3 - 2 * xf))[None, :]
    a = g[yi][:, xi]; b = g[yi][:, xi + 1]; c = g[yi + 1][:, xi]; d = g[yi + 1][:, xi + 1]
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf


def fbm(h, w, seed, base=24):
    return (vnoise(h, w, base, seed) * .5 + vnoise(h, w, base // 2, seed + 7) * .27 +
            vnoise(h, w, max(base // 4, 2), seed + 13) * .15 + vnoise(h, w, 2, seed + 29) * .08)


def sample_ramp(fname, n=5):
    """Madalya PNG'sinden parlaklığa göre metal rampası çıkarır (koyu -> parlak)."""
    im = np.asarray(Image.open(os.path.join(MED, fname)).convert('RGBA')).astype(np.float32)
    px = im[im[..., 3] > 240][:, :3]
    lum = px @ np.array([.299, .587, .114])
    px = px[np.argsort(lum)]
    N = len(px)
    out = []
    for p in (.03, .25, .55, .85, .995):
        i = int(p * (N - 1)); k = max(N // 100, 1)
        out.append(px[max(i - k, 0):i + k].mean(0))
    return np.array(out) / 255.0


def apply_ramp(t, ramp):
    t = np.clip(t, 0, 1) * (len(ramp) - 1)
    i = np.clip(t.astype(int), 0, len(ramp) - 2)
    f = (t - i)[..., None]
    return ramp[i] * (1 - f) + ramp[i + 1] * f


def rr_dist(w, h, r):
    """Yuvarlatılmış dikdörtgende kenara iç mesafe (px)."""
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    x += .5; y += .5
    px = np.minimum(x, w - x); py = np.minimum(y, h - y)
    d = np.minimum(px, py)
    cor = (px < r) & (py < r)
    d = np.where(cor, r - np.hypot(r - px, r - py), d)
    return d, x, y, px, py


# ---------- ana çizici ----------
def plate(name, w, h, rim, ramp, radius=22, face='field', pressed=False, beads=0, gems=None,
          seed=1, fillet=True, light=(-.55, -.75, .62), field_rgb=((16, 31, 70), (8, 15, 40)),
          field_alpha=.95, scratches=14, dome=0.0):
    d, x, y, px, py = rr_dist(w, h, radius)
    H = np.zeros((h, w), np.float32)

    # kenar yuvarlama + yükselmiş halka (yarım silindir kesit)
    c = np.clip((d - rim * .5) / (rim * .5), -1, 1)
    ring = np.sqrt(np.clip(1 - c * c, 0, 1)) * (rim * .30)
    ring *= smooth(0, 1.6, d)
    # ortadaki boncuk sırası (kenar boyunca periyodik)
    if beads:
        horiz = py < px
        u = np.where(horiz, x, y)
        bump = (.5 + .5 * np.cos(2 * np.pi * u / beads)) ** 1.6
        bm = np.exp(-((d - rim * .5) / (rim * .20)) ** 2)
        ring += bump * bm * (rim * .16)
    H += ring
    # iç ince kordon (madalyadaki iç daire gibi)
    if fillet:
        fd = rim + max(rim * .16, 3)
        H += np.exp(-((d - fd) / max(rim * .045, 1.1)) ** 2) * (rim * .06)
    # düz yüzlü (metal) butonlar için hafif kubbe
    if face == 'metal' and dome:
        H += smooth(rim, rim + 6, d) * dome * (1 - np.clip((np.minimum(px, py) - rim) / 40, 0, 1) * .0)
    # mücevherler
    gem_mask = np.zeros((h, w), bool); gem_dist = np.full((h, w), 99, np.float32); gem_r = 0
    if gems:
        gx, gy, gem_r = gems
        for (cx, cy) in ((gx, gy), (w - gx, gy), (gx, h - gy), (w - gx, h - gy)):
            rho = np.hypot(x - cx, y - cy)
            H += np.exp(-((rho - gem_r * 1.45) / (gem_r * .3)) ** 2) * gem_r * .55     # yuva halkası
            dome_g = np.sqrt(np.clip(1 - (rho / gem_r) ** 2, 0, 1)) * gem_r * .8
            H = np.where(rho < gem_r, dome_g + rim * .12, H)
            gem_mask |= rho < gem_r
            gem_dist = np.minimum(gem_dist, rho)
    if pressed:
        H = -H * .8

    # doku (hafif çukur/pürüz) - madalyadaki dövme metal hissi
    H += (fbm(h, w, seed, 10) - .5) * rim * .035 + (vnoise(h, w, 2, seed + 5) - .5) * .25

    # ---- aydınlatma ----
    gy_, gx_ = np.gradient(H)
    K = 1.25
    nx, ny, nz = -gx_ * K, -gy_ * K, np.ones_like(H)
    nl = np.sqrt(nx * nx + ny * ny + nz * nz); nx /= nl; ny /= nl; nz /= nl
    L = np.array(light, np.float32); L /= np.linalg.norm(L)
    if pressed:
        L = np.array([.35, .5, .78], np.float32); L /= np.linalg.norm(L)
    diff = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    rx, ry, rz = 2 * nz * nx, 2 * nz * ny, 2 * nz * nz - 1
    env = .5 + .5 * np.sin((rx * .55 + ry * 1.15) * 2.3 + .7)
    shade = .50 * diff + .42 * env
    shade += (fbm(h, w, seed + 3, 6) - .5) * .05
    # fırça izi
    br = vnoise(h, w, 3, seed + 41)
    br = np.repeat(vnoise(1, w, 2, seed + 9)[:, :], h, axis=0) * 0 + br
    shade += (br - .5) * .03
    shade = apply_ramp(shade, ramp)
    spec = np.clip(rx * L[0] + ry * L[1] + rz * L[2], 0, 1) ** 28 * .85
    metal = np.clip(shade + spec[..., None] * np.array([1, .97, .88]), 0, 1)

    # çizikler
    rs = np.random.RandomState(seed + 77)
    sc = np.zeros((h, w), np.float32)
    for _ in range(scratches):
        x0, y0 = rs.rand() * w, rs.rand() * h
        a = rs.rand() * np.pi; ln = 10 + rs.rand() * 30
        for t in np.linspace(0, ln, int(ln * 2)):
            xi, yi = int(x0 + np.cos(a) * t), int(y0 + np.sin(a) * t)
            if 0 <= xi < w and 0 <= yi < h:
                sc[yi, xi] = max(sc[yi, xi], .5 + rs.rand() * .5)
    sc = np.clip(sc * (.2 + .0), 0, 1)
    metal = metal * (1 - sc[..., None] * .35) + sc[..., None] * .10

    # ---- yüzey seçimi ----
    inside = d
    edge_a = np.clip(inside + .5, 0, 1)
    if face == 'field':
        t = np.clip(y / h, 0, 1)[..., None]
        top = np.array(field_rgb[0]) / 255.0; bot = np.array(field_rgb[1]) / 255.0
        fcol = top * (1 - t) + bot * t
        fcol = fcol * (.9 + (fbm(h, w, seed + 5, 8) - .5) * .35)[..., None]
        ao = 1 - .55 * np.exp(-np.clip(d - rim, 0, None) / 7.0)       # halkanın iç gölgesi
        fcol = fcol * ao[..., None]
        m = smooth(rim + 1.0, rim - 1.0, d)[..., None]                  # 1 = metal
        # iç kordon da metal
        if fillet:
            fd = rim + max(rim * .16, 3)
            m = np.maximum(m, (np.exp(-((d - fd) / max(rim * .05, 1.2)) ** 2))[..., None] * .95)
        rgb = fcol * (1 - m) + metal * m
        alpha = (field_alpha * (1 - m[..., 0]) + m[..., 0]) * edge_a
    else:
        rgb = metal
        alpha = edge_a
    # mücevher rengi
    if gems:
        ruby = np.array([[.20, .01, .03], [.55, .04, .07], [.86, .12, .14], [.98, .42, .38], [1., .86, .80]])
        rs_ = np.clip(.18 + .5 * diff + .32 * env, 0, 1)
        rc = apply_ramp(rs_, ruby)
        rc = np.clip(rc + (np.clip(rx * L[0] + ry * L[1] + rz * L[2], 0, 1) ** 20)[..., None] * .8, 0, 1)
        gm = smooth(gem_r, gem_r - 1.2, gem_dist)[..., None]
        rgb = rgb * (1 - gm) + rc * gm
        alpha = np.maximum(alpha, gm[..., 0])
    out = np.dstack([np.clip(rgb, 0, 1), alpha])
    img = Image.fromarray((out * 255 + .5).astype(np.uint8), 'RGBA')
    img.save(os.path.join(OUT, name))
    return img


def nine_slice_preview(img, slc, size):
    """Önizleme için 9-dilim uygular."""
    w, h = img.size
    W, Hh = size
    out = Image.new('RGBA', size, (0, 0, 0, 0))
    xs = [0, slc, w - slc, w]; ys = [0, slc, h - slc, h]
    xd = [0, slc, W - slc, W]; yd = [0, slc, Hh - slc, Hh]
    for i in range(3):
        for j in range(3):
            tile = img.crop((xs[i], ys[j], xs[i + 1], ys[j + 1]))
            tw, th = xd[i + 1] - xd[i], yd[j + 1] - yd[j]
            if tw > 0 and th > 0:
                out.alpha_composite(tile.resize((tw, th), Image.BICUBIC), (xd[i], yd[j]))
    return out


if __name__ == '__main__':
    gold = sample_ramp('m_2_1.png')
    silver = sample_ramp('m_1_1.png')
    copper = sample_ramp('m_5_0.png')

    SL, P = 44, 12                      # panel dilimi ve boncuk periyodu (@2x)
    PW = SL * 2 + P * 6
    # Altın çerçeveli panel (modal, alt panel, savaş sayfası)
    plate('panel_gold.png', PW, PW, rim=30, ramp=gold, radius=24, beads=P, gems=(17, 17, 6.5), seed=11)
    # Gümüş çerçeveli (ikincil) panel
    plate('panel_silver.png', PW, PW, rim=30, ramp=silver, radius=24, beads=P, gems=(17, 17, 6.5), seed=12)

    # Butonlar (@2x): 96x64, dilim 20
    BW, BH = 96, 64
    plate('btn_dark.png', BW, BH, rim=9, ramp=silver, radius=14, face='field', seed=21, scratches=3,
          field_rgb=((22, 38, 84), (10, 18, 46)), field_alpha=.97)
    plate('btn_dark_down.png', BW, BH, rim=9, ramp=silver, radius=14, face='field', seed=21, scratches=3,
          pressed=True, field_rgb=((8, 14, 34), (16, 28, 62)), field_alpha=.97)
    plate('btn_gold.png', BW, BH, rim=10, ramp=gold, radius=14, face='metal', dome=3.2, seed=22, scratches=4, fillet=True)
    plate('btn_gold_down.png', BW, BH, rim=10, ramp=gold, radius=14, face='metal', dome=3.2, seed=22, scratches=4,
          pressed=True)
    # HUD chip (ince, koyu cam + altın kenar)
    plate('chip.png', BW, BH, rim=7, ramp=gold, radius=14, face='field', seed=31, scratches=2,
          field_rgb=((20, 34, 78), (9, 16, 42)), field_alpha=.90)
    print('tamam ->', OUT)

    # tek önizleme (test): hepsi bir arada
    bg = Image.new('RGBA', (900, 520), (11, 20, 40, 255))
    pg = Image.open(os.path.join(OUT, 'panel_gold.png'))
    ps = Image.open(os.path.join(OUT, 'panel_silver.png'))
    bg.alpha_composite(nine_slice_preview(pg, SL, (420, 300)), (20, 20))
    bg.alpha_composite(nine_slice_preview(ps, SL, (420, 300)), (460, 20))
    x = 20
    for n in ('btn_dark', 'btn_dark_down', 'btn_gold', 'btn_gold_down', 'chip'):
        im = Image.open(os.path.join(OUT, n + '.png'))
        bg.alpha_composite(nine_slice_preview(im, 20, (160, 64)), (x, 360)); x += 175
    bg.convert('RGB').save('/home/claude/ui_preview.png')

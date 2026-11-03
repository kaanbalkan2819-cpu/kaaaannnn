#!/usr/bin/env python3
"""V160 — zar + savaş ses örneklerini KENDİMİZ üretir (telifsiz: hiçbir üçüncü taraf kaydı/örnek kullanılmaz).
Fiziksel modelleme: sert zar masaya çarpınca (tok gövde + tiz çınlama + tık), top/patlama (çatlama + gövde + alçak gümbürtü + yankı),
tüfek salvosu, davul, boru, kuvvetli rüzgâr (füze).  Çıktı: www/wc_sfx_data.js  (base64 MP3; wc_audio.js bunu AudioBuffer'a çevirir).
Çalıştırma:  python3 scripts/gen_sfx.py      (gerekenler: numpy, scipy, ffmpeg)"""
import numpy as np, subprocess, base64, os, tempfile, sys
from scipy import signal
from scipy.io import wavfile

SR = 32000
rng = np.random.default_rng(160)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'www', 'wc_sfx_data.js')

def tt(d): return np.arange(int(d * SR)) / SR
def noise(d): return rng.standard_normal(int(d * SR))
def _f(x, kind, f, order=2):
    sos = signal.butter(order, f, kind, fs=SR, output='sos'); return signal.sosfilt(sos, x)
def bp(x, lo, hi): return _f(x, 'bandpass', [lo, hi])
def lp(x, f): return _f(x, 'lowpass', f)
def hp(x, f): return _f(x, 'highpass', f)
def place(out, x, t0, g=1.0):
    i = int(t0 * SR)
    if i < 0 or i >= len(out): return
    n = min(len(x), len(out) - i); out[i:i + n] += x[:n] * g
def ir(rt60, lpf):
    d = rt60 * 1.3; t = tt(d); h = noise(d) * 10 ** (-3 * t / rt60)
    h = lp(h, lpf); h[:int(.004 * SR)] *= np.linspace(0, 1, int(.004 * SR))
    return h / np.sqrt(np.sum(h ** 2))
def reverb(x, rt60, wet, lpf=2500):
    h = ir(rt60, lpf); y = signal.fftconvolve(x, h)
    n = len(y); xx = np.pad(x, (0, n - len(x)))
    ex = np.sqrt(np.mean(x ** 2) + 1e-12); ey = np.sqrt(np.mean(y[:len(x)] ** 2) + 1e-12)
    return xx * (1 - wet * .5) + y * wet * (ex / ey) * .9
def fin(x, peak=.88, fade=.08, drive=1.0):
    x = np.tanh(x * drive) if drive != 1.0 else x
    x = x - np.mean(x); x = hp(x, 25)
    n = int(fade * SR); x[-n:] *= np.linspace(1, 0, n) ** 2
    m = np.max(np.abs(x)) + 1e-9; return x / m * peak
def sweep_phase(f0, f1, tau, t): return 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t / tau)) / SR

# ---------------------------------------------------------------- ZAR
def die_hit(g=1.0, hi=False):
    d = .1; t = tt(d)
    f0 = rng.uniform(3000, 4600) if hi else rng.uniform(1900, 2900)
    click = bp(noise(d), 1400, 7500) * np.exp(-t / .0022)
    modes = [(f0, .45, .006), (f0 * 1.52, .28, .004), (f0 * 2.31, .14, .003),
             (rng.uniform(620, 900), .55, .013), (rng.uniform(210, 310), .75, .022)]
    ring = sum(a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-t / tau) for f, a, tau in modes)
    return (click * .9 + ring) * g

def dice_roll():
    d = 1.75; out = np.zeros(int(d * SR))
    # elde sallama: zarlar birbirine/avuca çarpar (tiz, kısa, düzensiz)
    n = int(rng.integers(11, 16)); ts = np.sort(rng.uniform(0, .36, n))
    for k, t0 in enumerate(ts): place(out, die_hit(rng.uniform(.12, .34), hi=True)[:int(.05 * SR)], t0)
    # atış: sekmeler (aralık kısalır, ses sönümlenir)
    t0 = .40; gap = rng.uniform(.12, .15); g = 1.0
    for k in range(int(rng.integers(5, 8))):
        place(out, die_hit(g), t0)
        if rng.random() < .7: place(out, die_hit(g * rng.uniform(.35, .6)), t0 + rng.uniform(.008, .03))   # ikinci zar
        t0 += gap; gap *= rng.uniform(.6, .7); g *= rng.uniform(.5, .66)
    # yuvarlanma sürtünmesi
    tr = tt(.6); roll = bp(noise(.6), 700, 3200) * (rng.random(len(tr)) > .55) * np.exp(-((tr - .12) / .22) ** 2) * .05
    place(out, lp(roll, 3000), .45)
    # yerleşme tıkları
    for k in range(int(rng.integers(2, 4))): place(out, die_hit(rng.uniform(.06, .12)), t0 + .02 + k * rng.uniform(.04, .09))
    out = reverb(out, .22, .10, 4000)
    return fin(out[:int(d * SR)], .85, .12)

# ---------------------------------------------------------------- TOP / PATLAMA / TÜFEK
def cannon(deep=1.0, long=1.0):
    d = 2.2 * long; t = tt(d)
    crack = hp(noise(d), 700) * np.exp(-t / .011)
    body = sum(lp(noise(d), fc) * np.exp(-t / (tau * long)) * a for fc, tau, a in [(4000, .03, .6), (1500, .10, 1.0), (500, .24, 1.1), (170, .45, .9)])
    thump = np.sin(sweep_phase(36 * deep + 55, 32 * deep, .07, t)) * np.exp(-t / (.26 * long)) * 1.7
    x = crack * .55 + body * .8 + thump
    x = reverb(np.tanh(x * 1.1), 1.5 * long, .42, 1800)
    return fin(x[:int(d * SR)], .9, .15, 1.15)

def boom():
    d = 3.2; t = tt(d)
    crack = hp(noise(d), 500) * np.exp(-t / .016)
    body = sum(lp(noise(d), fc) * np.exp(-t / tau) * a for fc, tau, a in [(3000, .05, .5), (1000, .18, 1.0), (350, .45, 1.1), (120, .9, 1.0)])
    thump = np.sin(sweep_phase(95, 26, .12, t)) * np.exp(-t / .55) * 2.0
    rumble = lp(noise(d), 80) * np.exp(-t / 1.0) * 1.4
    deb = np.zeros_like(t)                                                  # savrulan moloz çıtırtıları
    for k in range(int(rng.integers(14, 24))):
        t0 = rng.uniform(.12, 1.6); place(deb, bp(noise(.05), 900, 5000) * np.exp(-tt(.05) / .008), t0, rng.uniform(.1, .35))
    x = np.tanh((crack * .6 + body * .9 + thump + rumble + deb) * 1.0)
    x = reverb(x, 2.0, .45, 1500)
    return fin(x[:int(d * SR)], .92, .25, 1.2)

def rifle():
    d = 1.4; out = np.zeros(int(d * SR)); n = int(rng.integers(6, 10)); t0 = 0
    for k in range(n):
        tc = tt(.12); c = bp(noise(.12), 1100, 6500) * np.exp(-tc / .005) + lp(noise(.12), 450) * np.exp(-tc / .03) * .5
        place(out, c, t0 + rng.uniform(0, .02), rng.uniform(.5, 1.0)); t0 += rng.uniform(.045, .13)
    out = reverb(out, .9, .5, 3000)
    return fin(out[:int(d * SR)], .8, .15)

def whoosh():
    d = 1.9; t = tt(d); x = np.zeros_like(t)
    for fc in np.geomspace(250, 3800, 11):
        tp = .15 + 1.2 * np.log(fc / 250) / np.log(15.2)
        x += bp(noise(d), fc * .72, fc * 1.4) * np.exp(-((t - tp) / .3) ** 2) * (1.0 - .04 * np.log(fc))
    x += lp(noise(d), 200) * np.exp(-((t - .5) / .6) ** 2) * .8
    return fin(reverb(x, .8, .2, 3000)[:int(d * SR)], .78, .2)

# ---------------------------------------------------------------- DAVUL + BORU
def drum(pitch=1.0):
    d = 1.6; t = tt(d)
    body = np.sin(sweep_phase(150 * pitch, 52 * pitch, .045, t)) * np.exp(-t / .38) * 1.3
    skin = np.sin(2 * np.pi * 185 * pitch * t) * np.exp(-t / .11) * .3
    slap = bp(noise(d), 700, 2600) * np.exp(-t / .018) * .7
    return fin(reverb(np.tanh(body + skin + slap), 1.2, .32, 2200)[:int(d * SR)], .85, .15)

def horn():
    d = 2.3; t = tt(d); x = np.zeros_like(t)
    env = np.clip(t / .2, 0, 1) ** 1.4 * np.clip((d - .4 - t) / .35 + 1, 0, 1) * np.clip((d - t) / .35, 0, 1)
    for f0, a in [(196.0, 1.0), (293.66, .75), (98.0, .5)]:
        vib = 1 + .0045 * np.sin(2 * np.pi * 5.1 * t + rng.uniform(0, 6)) * np.clip(t / .5, 0, 1)
        for det in (-.0035, .0035):
            ph = 2 * np.pi * np.cumsum(f0 * (1 + det) * vib) / SR
            x += a * sum(np.sin(k * ph) / k ** 1.15 for k in range(1, 14))
    x = lp(x, 1900) * env + bp(noise(d), 1200, 4200) * np.exp(-t / .12) * .08
    return fin(reverb(x, 1.7, .35, 2600)[:int(d * SR)], .8, .2)

# ---------------------------------------------------------------- DOSYALAR
LIB = {
    'dice':   [dice_roll() for _ in range(4)],
    'cannon': [cannon(1.0, 1.0), cannon(1.15, .9), cannon(.9, 1.1), cannon(1.05, 1.0)],
    'boom':   [boom(), boom()],
    'rifle':  [rifle() for _ in range(3)],
    'whoosh': [whoosh()],
    'drum':   [drum(1.0), drum(.88)],
    'horn':   [horn()],
}

def mp3_b64(x):
    with tempfile.TemporaryDirectory() as td:
        w = os.path.join(td, 'a.wav'); m = os.path.join(td, 'a.mp3')
        wavfile.write(w, SR, (np.clip(x, -1, 1) * 32767).astype(np.int16))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', w, '-ac', '1', '-ar', str(SR), '-codec:a', 'libmp3lame', '-b:a', '56k', m], check=True)
        return base64.b64encode(open(m, 'rb').read()).decode()

if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--wav':     # denetim: wav'ları klasöre yaz
        os.makedirs(sys.argv[2], exist_ok=True)
        for k, v in LIB.items():
            for i, x in enumerate(v): wavfile.write(os.path.join(sys.argv[2], '%s%d.wav' % (k, i)), SR, (x * 32767).astype(np.int16))
        sys.exit(0)
    parts = []
    for k, v in LIB.items(): parts.append('"%s":[%s]' % (k, ','.join('"%s"' % mp3_b64(x) for x in v)))
    js = ('/* V160 — otomatik üretildi (scripts/gen_sfx.py). Özgün, kodla sentezlenmiş zar/savaş sesleri; üçüncü taraf kaydı YOKTUR (MP3, base64). */\n'
          'window.WC_SFX={%s};\n' % ','.join(parts))
    open(OUT, 'w').write(js); print('yazıldı', OUT, len(js) // 1024, 'KB')

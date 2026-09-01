#!/usr/bin/env python3
"""Mede a ancora dos olhos e a tabela do olhar do BLINK a partir de frames/.

Uso: python3 scripts/medir-olhar-blink.py     (precisa de numpy e Pillow)

O LIMIAR IMPORTA. Um filtro amarelo largo (r>150) pega tambem as antenas, no
alto, e os frisos amarelos do corpo, embaixo: o centroide sai numa media sem
significado, e foi assim que uma medicao anterior concluiu que os olhos estavam
em 0,53 da altura da imagem quando estao em 0,38. Os olhos sao EMISSIVOS, e por
isso brilham mais que qualquer outro amarelo: exigir (R+G)/2 >= 230 confina a
deteccao a eles.
"""
import glob, sys, numpy as np
from PIL import Image

fs = sorted(glob.glob('frames/f*.webp'))
if not fs:
    sys.exit("nenhum quadro em frames/ — rode a extracao primeiro")

# O video termina com uma REACAO (o BLINK fica feliz e pula), que nao e olhar e
# nao pode entrar na medicao: bracos no alto mudam a caixa da cabeca e esticam o
# percentil que normaliza a amplitude. Medimos so a parte de rastreamento.
TRACK_END = int(sys.argv[1]) if len(sys.argv) > 1 else 212
fs = fs[:TRACK_END + 1]
N = len(fs)
print(f"medindo os quadros 0..{TRACK_END} (a reacao final fica fora)")

def medir(caminho):
    a = np.asarray(Image.open(caminho).convert('RGB'), dtype=np.int16)
    H, W = a.shape[:2]
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    # olhos: amarelo E brilhante
    olho = (R > 150) & (G > 120) & (B < 130) & ((R - B) > 70) & (((R + G) // 2) >= 230)
    if olho.sum() < 200:
        return None
    ys, xs = np.nonzero(olho)
    # cabeca: objeto contra o fundo azul liso, isolada pelo estreitamento do pescoco
    obj = ~(((B - R) > 25) & (B > 110))
    larg = obj.sum(axis=1)
    meia = int(H * 0.62)
    pico = int(np.argmax(larg[:meia]))
    pesc = None
    for y in range(pico + 10, meia):
        j = larg[max(0, y - 6):y + 7]
        if larg[y] == j.min() and larg[y] < larg[pico] * 0.72:
            pesc = y
            break
    if pesc is None:
        pesc = int(H * 0.55)
    lim = larg[pico] * 0.45
    linhas = [y for y in range(int(np.argmax(larg > 0)), pesc) if larg[y] >= lim]
    if not linhas:
        return None
    hy0, hy1 = linhas[0], linhas[-1]
    cols = np.nonzero(obj[hy0:hy1 + 1].sum(axis=0) > 0)[0]
    hx0, hx1 = int(cols[0]), int(cols[-1])
    return (xs.mean(), ys.mean(), int(olho.sum()), W, H, hx0, hx1, hy0, hy1)

raw = [medir(f) for f in fs]
bons = sum(1 for v in raw if v)
print(f"{bons}/{N} quadros medidos")
idx = np.arange(N)
col = lambda k: np.array([raw[i][k] if raw[i] else np.nan for i in range(N)], float)
cx, cy, area = col(0), col(1), col(2)
Wv, Hv = col(3), col(4)
hx0, hx1, hy0, hy1 = col(5), col(6), col(7), col(8)

# ancora: posicao dos olhos na imagem
ax, ay = cx / Wv, cy / Hv
print(f"ANCORA DOS OLHOS  x {np.nanmin(ax):.3f}..{np.nanmax(ax):.3f} (media {np.nanmean(ax):.3f})")
print(f"                  y {np.nanmin(ay):.3f}..{np.nanmax(ay):.3f} (media {np.nanmean(ay):.3f})")
rep = np.arange(0, 28)
print(f"  no repouso: x {np.nanmean(ax[rep]):.3f}  y {np.nanmean(ay[rep]):.3f}")

# olhar: centroide dos olhos contra o centro e a altura da CABECA
alt = hy1 - hy0
x = (cx - (hx0 + hx1) / 2) / alt
y = (cy - (hy0 + hy1) / 2) / alt
med = np.array([np.nanmedian(area[max(0, i - 10):i + 11]) for i in range(N)])
pisc = area < med * 0.72
print(f"piscadas: {list(np.nonzero(pisc)[0])}")
for v in (x, y):
    ruim = pisc | np.isnan(v)
    v[ruim] = np.interp(idx[ruim], idx[~ruim], v[~ruim])
def suave(v, k=7):
    p = np.pad(v, (k // 2, k // 2), mode='edge')
    return np.convolve(p, np.ones(k) / k, mode='valid')
x, y = suave(x), suave(y)
x -= x[:20].mean(); y -= y[:20].mean()
x = np.clip(x / (np.percentile(np.abs(x), 99) or 1), -1.1, 1.1)
y = np.clip(y / (np.percentile(np.abs(y), 99) or 1), -1.1, 1.1)
print(f"AMPLITUDE  x {x.min():+.2f}..{x.max():+.2f}   y {y.min():+.2f}..{y.max():+.2f}")
print("\nVALIDACAO visual:")
for f, esp in [(78,"esquerda x<0"),(96,"direita x>0"),(113,"cima y<0"),(10,"neutro ~0"),(42,"esquerda x<0"),(162,"direita x>0"),(180,"baixo y>0")]:
    print(f"  q{f:3d}  ({x[f]:+.2f},{y[f]:+.2f})   esperado {esp}")
np.save('/tmp/gx.npy', x); np.save('/tmp/gy.npy', y)
np.save('/tmp/ax.npy', ax); np.save('/tmp/ay.npy', ay)

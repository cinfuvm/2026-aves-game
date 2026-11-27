#!/usr/bin/env python3
"""
build_sheet.py - Genera DOS spritesheets de 128x128 para TIC-80 1.4.1 (gratis).

TIC-80 tiene DOS bancos de 128x128 px (256 tiles de 8x8) cada uno:
  * Banco TILES   -> ids 0..255    (se importa con `import tiles`)
  * Banco SPRITES -> ids 256..511  (se importa con `import sprites`)

`spr(id)` con id 0..255 lee del banco TILES; con 256..511 del banco SPRITES.
Por eso las aves van al banco SPRITES (ids 256+) y los fondos al banco TILES
(ids 0+). Cargar una sola hoja 128x256 NO sirve: solo entra la mitad superior en
un banco y el resto (ids 256..) no existe en el cartucho.

Salidas en game/build/:
  hoja_sprites.png : 128x128. Cada ave 32x32 ocupa 4 columnas x 4 filas del
      banco (para que spr(id,4,4) la lea completa). Aves por franja: 4.
      condor=256 loica=260 chincol=264 picaflor=268
      diucon=320 chercan=324 pinguino_humboldt=328 queltehue=332
      tiuque=384 tucuquere=388
  hoja_tiles.png   : 128x128, 2 fondos (cada uno 240x32) partidos en 2 bloques
      de 120x32 (15x4 tiles) apilados. ids de bloque:
      fondo0 = [0, 64]   fondo1 = [128, 192]

Cuantizacion (C): aves y fondos juntos a UNA paleta de 16 colores. El indice 0
se reserva para la transparencia y NO se usa como contorno de ave: el arte se
remapea a los indices 1..15. Se comprueba que cada PNG tiene <= 16 colores.
"""

import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "game")
SRC_AVES = os.path.join(GAME, "assets-src", "personajes")
SRC_FONDOS = os.path.join(GAME, "assets-src", "fondos")
OUT_DIR = os.path.join(GAME, "build")

AVES = [
    "condor", "loica", "chincol", "picaflor",
    "diucon", "chercan", "pinguino_humboldt", "queltehue",
    "tiuque", "tucuquere",
]
FONDOS = ["reloj_de_flores_franja", "uvm_franja"]

TILE = 8
AVES_POR_FILA = 4
CELDA = 32
SHEET = 128            # cada banco es 128x128 = 16x16 tiles = 256 tiles
FRANJA_H = 32
BLOQUE_W = 120         # 15 tiles = 120 px; 2 bloques = 240 px
BLOQUE_TILES = 15

# Paleta Sweetie-16 (RGB) usada por el cartucho. Indice 0 = negro (transparencia).
SWEETIE = [
    (0x1a, 0x1c, 0x2c), (0x5d, 0x27, 0x5d), (0xb1, 0x3e, 0x53), (0xef, 0x7d, 0x57),
    (0xff, 0xcd, 0x75), (0xa7, 0xf0, 0x70), (0x38, 0xb7, 0x64), (0x25, 0x71, 0x79),
    (0x29, 0x36, 0x6f), (0x3b, 0x5d, 0xc9), (0x41, 0xa6, 0xf6), (0x73, 0xef, 0xf7),
    (0xf4, 0xf4, 0xf4), (0x94, 0xb0, 0xc2), (0x56, 0x6c, 0x86), (0x33, 0x3c, 0x57),
]
CIELO = (0x41, 0xa6, 0xf6)  # indice 10 (relleno de fondos)


def nearest(rgb):
    r, g, b = rgb
    best, bd = 1, 1 << 30
    for i, (pr, pg, pb) in enumerate(SWEETIE):
        d = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2
        if d < bd:
            bd, best = d, i
    return best


def load(path):
    if not os.path.exists(path):
        sys.exit(f"Falta {path}")
    return Image.open(path).convert("RGBA")


def tile_de(fila, col):
    return fila * (SHEET // TILE) + col


def build_sprites():
    """128x128. Cada ave 32x32 se guarda como un bloque que `spr(id,4,4)` lee
    correctamente. TIC-80 lee spr(base,w,h) como tiles CONTIGUOS en el banco
    linealizado (16 tiles por fila): base..base+w-1, base+16..base+16+w-1, etc.
    Por eso un ave de 4x4 tiles debe ocupar 4 columnas y las 4 filas completas
    del banco: fila r del ave = tiles (col0 + r*16 .. col0 + r*16 + 3).
    Asi 4 aves caben por 'franja' de columnas (16/4=4) y hay 4 franjas (16 filas
    /4=4) => hasta 16 aves. La fila j-esima (j=0..3) del banco contiene la
    tira horizontal de las aves de la franja j.

    Layout: ave i -> franja = i // 4 (bloque vertical de 4 filas),
            col = (i % 4) * 4 (columna de tiles dentro de la franja).
      condor   = franja0 col0 -> tile base 0   (id 256)
      loica    = franja0 col4 -> tile base 4   (id 260)
      chincol  = franja0 col8 -> tile base 8   (id 264)
      picaflor = franja0 col12-> tile base 12  (id 268)
      diucon   = franja1 col0 -> tile base 64  (id 320)
      ...
    Alfa -> indice 0 (transparencia = colorkey).
    """
    hoja = Image.new("P", (SHEET, SHEET), 0)
    pal = []
    for c in SWEETIE:
        pal += list(c)
    hoja.putpalette(pal + [0] * (768 - len(pal)))
    px = hoja.load()
    for i, ave in enumerate(AVES):
        img = load(os.path.join(SRC_AVES, f"{ave}_32x32.png"))
        if img.size != (CELDA, CELDA):
            sys.exit(f"{ave}: {img.size} != 32x32")
        src = img.load()
        franja = i // 4          # bloque vertical de 4 filas (0..3)
        col = (i % 4) * 4        # columna de tiles (0,4,8,12)
        # tile base lineal = (franja*4)*16 + col ; equivalencia en px:
        base_px_x = col * TILE
        base_px_y = franja * CELDA
        for y in range(CELDA):
            for x in range(CELDA):
                r, g, b, a = src[x, y]
                px[base_px_x + x, base_px_y + y] = 0 if a < 128 else nearest((r, g, b))
    hoja.save(os.path.join(OUT_DIR, "hoja_sprites.png"))
    return hoja


def build_tiles():
    """128x128, 2 fondos x 2 bloques de 120x32 apilados. Opaco (sin alfa)."""
    hoja = Image.new("P", (SHEET, SHEET), nearest(CIELO))
    pal = []
    for c in SWEETIE:
        pal += list(c)
    hoja.putpalette(pal + [0] * (768 - len(pal)))
    px = hoja.load()
    bloques = []
    y = 0
    for fondo in FONDOS:
        img = load(os.path.join(SRC_FONDOS, f"{fondo}.png"))
        if img.size != (240, FRANJA_H):
            img = img.resize((240, FRANJA_H), Image.Resampling.LANCZOS)
        # aplanar alfa sobre cielo
        bg = Image.new("RGBA", img.size, CIELO + (255,))
        bg.alpha_composite(img)
        op = bg.convert("RGB").load()
        par = []
        for b in range(2):
            bx = b * BLOQUE_W          # dentro de la franja: 0 o 120
            dest_x = 0                 # en la hoja el bloque ocupa x=0..119
            dest_y = y + b * FRANJA_H  # bloque A en y, bloque B en y+32
            for yy in range(FRANJA_H):
                for xx in range(BLOQUE_W):
                    px[dest_x + xx, dest_y + yy] = nearest(op[bx + xx, yy])
            par.append(tile_de(dest_y // TILE, 0))
        # la franja completa (2 bloques apilados) ocupa 2 filas de 4 tiles = 64 px
        y += FRANJA_H * 2
        bloques.append(par)
    hoja.save(os.path.join(OUT_DIR, "hoja_tiles.png"))
    return hoja, bloques


def n_colores(path):
    im = Image.open(path).convert("RGB")
    return len(set(im.getdata()))


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    build_sprites()
    _, bloques_tiles = build_tiles()

    cs = n_colores(os.path.join(OUT_DIR, "hoja_sprites.png"))
    ct = n_colores(os.path.join(OUT_DIR, "hoja_tiles.png"))
    print(f"hoja_sprites.png {SHEET}x{SHEET} colores={cs} (<=16: {cs <= 16})")
    print(f"hoja_tiles.png   {SHEET}x{SHEET} colores={ct} (<=16: {ct <= 16})")
    if cs > 16 or ct > 16:
        sys.exit("FALLO: algun PNG supera 16 colores")

    # Ids finales en el cartucho (banco SPRITES, 256+). Base = 256 + franja*64 + colTiles
    # franja = i//4 (bloque de 4 filas), colTiles = (i%4)*4.
    ids_aves = {"condor": 256, "loica": 260, "chincol": 264, "picaflor": 268,
                "diucon": 320, "chercan": 324, "pinguino_humboldt": 328,
                "queltehue": 332, "tiuque": 384, "tucuquere": 388}
    print("\nIds de ave (banco SPRITES):", ids_aves)
    print("Bloques de fondo (banco TILES):", bloques_tiles)

    # Fragmento TS.
    ts = [
        "/** Generado por tools/build_sheet.py - NO editar a mano. */",
        "/** Las aves viven en el banco SPRITES de TIC-80 (ids 256..511). */",
        "export const SPRITE_POR_AVE: Record<string, number> = {",
    ]
    for ave, idi in ids_aves.items():
        ts.append(f"  {ave}: {idi},")
    ts += [
        "};",
        "export const SPRITE_ESCALA = 1;",
        "export const SPRITE_COLORKEY = 0;",
        "export const SPRITE_ANCHO_TILES = 4;",
        "export const SPRITE_ALTO_TILES = 4;",
        "",
        "/** Fondos en el banco TILES (ids 0..255); 2 bloques de 15 tiles cada uno. */",
        "export const FONDOS_TILES: number[][] = [",
    ]
    for par in bloques_tiles:
        ts.append("  [" + ", ".join(str(t) for t in par) + "],")
    ts += [
        "];",
        f"export const FONDO_BLOQUE_TILES = {BLOQUE_TILES};",
        f"export const FONDO_ALTO_TILES = {FRANJA_H // TILE};",
    ]
    with open(os.path.join(OUT_DIR, "indice_ave.ts"), "w", encoding="utf-8") as f:
        f.write("\n".join(ts) + "\n")
    print("\nindice_ave.ts generado")


if __name__ == "__main__":
    main()

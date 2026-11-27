#!/usr/bin/env python3
"""
empaquetar_tic.py - Empaqueta los graficos en game/build/juego.tic.

Usa DOS bancos de TIC-80:
  import tiles   build/hoja_tiles.png 0 0 0   -> banco TILES (ids 0..255)   fondos
  import sprites build/hoja_sprites.png 0 0 0 -> banco SPRITES (ids 256..511) aves

`spr(id<256)` lee del banco TILES; `spr(id>=256)` del banco SPRITES. Por eso las
aves van a sprites (256+) y los fondos a tiles (0+).

TIC-80 1.4.1: `new js & import ... & save` en UNA sola sesion NO persiste los
bitmaps (save corre antes de que el import se materialice). Solucion: (1) crear
un cartucho base vacio y guardarlo; (2) cargar ese base, hacer los imports y
guardar como juego.tic.

Uso: python tools/empaquetar_tic.py
Requiere: python tools/build_sheet.py
"""

import json
import os
import re
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GAME = os.path.join(ROOT, "game")
HOJA_TILES = os.path.join(GAME, "build", "hoja_tiles.png")
HOJA_SPRITES = os.path.join(GAME, "build", "hoja_sprites.png")
TIC = os.path.join(GAME, "build", "juego.tic")
BASE = os.path.join(GAME, "build", "_base.tic")


def tic_executable():
    env = os.environ.get("TIC80_PATH")
    if env and os.path.exists(env):
        return env
    cfg_path = os.path.join(GAME, "tsc80-config.json")
    txt = re.sub(r"//.*", "", open(cfg_path, encoding="utf-8").read())
    exe = json.loads(txt).get("ticExecutable", "")
    if exe and not os.path.isabs(exe):
        exe = os.path.normpath(os.path.join(GAME, exe))
    return exe


def run(tic, cmd):
    proc = subprocess.Popen(
        [tic, "--skip", "--keepcmd", f"--fs={GAME}", "--cmd", cmd],
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    for _ in range(150):
        if proc.poll() is not None:
            break
        time.sleep(0.1)
    if proc.poll() is None:
        proc.kill()


def main():
    for f in (HOJA_TILES, HOJA_SPRITES):
        if not os.path.exists(f):
            sys.exit(f"Falta {f}. Ejecuta primero: python tools/build_sheet.py")
    tic = tic_executable()
    if not (tic and os.path.exists(tic)):
        sys.exit(f"TIC-80 no encontrado: {tic}")

    for f in (TIC, BASE):
        if os.path.exists(f):
            os.remove(f)

    run(tic, "new js & save build/_base.tic & exit")
    if not os.path.exists(BASE):
        sys.exit("FALLO: no se pudo crear el cartucho base")

    cmd = (
        "load build/_base.tic"
        " & import tiles build/hoja_tiles.png 0 0 0"
        " & import sprites build/hoja_sprites.png 0 0 0"
        " & save build/juego.tic & exit"
    )
    run(tic, cmd)
    if not os.path.exists(TIC):
        sys.exit("FALLO: no se creo juego.tic")

    if os.path.exists(BASE):
        os.remove(BASE)

    print(f"OK: {TIC} ({os.path.getsize(TIC)} bytes)")


if __name__ == "__main__":
    main()

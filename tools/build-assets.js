#!/usr/bin/env node
/**
 * Genera el cartucho de assets (game/build/assets.tic) a partir de los PNGs de
 * game/assets-src. Usa `import sprites` (cuantiza a la paleta) y `save`.
 *
 * Los sprites SE PERSISTEN en el .tic (verificado: save + load recupera el
 * spriteset). El lanzador (bin/tsc80.js) hace `load assets.tic & import code
 * <out> & run`, de modo que los sprites estan en VRAM al dibujar.
 *
 * Layout de la spritesheet (256x256 px = 32 tiles de 8px por fila):
 *   ave i -> x = (i % 8) * 32, y = floor(i / 8) * 32 (10 aves = 2 filas, 32x32).
 *   franja de fondo -> 240 x FRANJA_H en filas fijas (y=64 y y=96).
 *
 * Uso: node tools/build-assets.js
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GAME_DIR = path.join(ROOT, 'game');
const SRC_DIR = path.join(GAME_DIR, 'assets-src', 'personajes');
const OUT_REL = 'build/assets.tic';
const OUT_ABS = path.join(GAME_DIR, OUT_REL);

// Orden fijo de aves -> define las constantes que genera sprites.ts.
const AVES = [
  'condor',
  'loica',
  'chincol',
  'picaflor',
  'diucon',
  'chercan',
  'pinguino_humboldt',
  'queltehue',
  'tiuque',
  'tucuquere',
];

// Fondos: franja superior (240 x FRANJA_H) de cada PNG full-screen.
// Presupuesto de tiles: aves 160 (y=0..63) + fondo0 120 (y=64) + fondo1 120 (y=96).
const FONDOS = ['reloj_de_flores', 'uvm'];
const FRANJA_H = 32; // 4 tiles de alto
const FONDO_Y0 = 64; // px (aves ocupan 0..63)
const FONDO_Y1 = 96; // px

function ticExecutable() {
  const cfgPath = path.join(GAME_DIR, 'tsc80-config.json');
  const cfg = JSON.parse(
    fs.readFileSync(cfgPath, 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, ''),
  );
  return process.env.TIC80_PATH || cfg.ticExecutable;
}

/** Tile base en la spritesheet para el ave en la posicion i. */
function tileBase(i) {
  const x = (i % 8) * 32;
  const y = Math.floor(i / 8) * 32;
  return (y / 8) * 32 + x / 8;
}

function main() {
  const tic = ticExecutable();
  if (!fs.existsSync(tic)) {
    console.error(`TIC-80 executable not found: ${tic}`);
    process.exit(1);
  }
  for (const ave of AVES) {
    const file = path.join(SRC_DIR, `${ave}_32x32.png`);
    if (!fs.existsSync(file)) {
      console.error(`Missing sprite: ${file}`);
      process.exit(1);
    }
  }
  for (const fondo of FONDOS) {
    const file = path.join(GAME_DIR, 'assets-src', 'fondos', `${fondo}_franja.png`);
    if (!fs.existsSync(file)) {
      console.error(`Missing fondo franja: ${file}`);
      process.exit(1);
    }
  }

  // Comandos de consola (rutas relativas a --fs = game/).
  const imports = [];
  AVES.forEach((ave, i) => {
    const x = (i % 8) * 32;
    const y = Math.floor(i / 8) * 32;
    imports.push(`import sprites assets-src/personajes/${ave}_32x32.png 0 ${x} ${y}`);
  });
  const fondosY = [FONDO_Y0, FONDO_Y1];
  FONDOS.forEach((fondo, k) => {
    imports.push(`import sprites assets-src/fondos/${fondo}_franja.png 0 0 ${fondosY[k]}`);
  });
  const cmds = ['new js', ...imports, `save ${OUT_REL}`, 'exit'].join(' & ');

  if (fs.existsSync(OUT_ABS)) fs.unlinkSync(OUT_ABS);

  execFileSync(
    tic,
    ['--cli', '--skip', '--keepcmd', `--fs=${GAME_DIR}`, '--cmd', cmds],
    { stdio: 'inherit' },
  );

  if (!fs.existsSync(OUT_ABS)) {
    console.error('ERROR: assets.tic was not created');
    process.exit(1);
  }

  // Genera/actualiza game/src/data/sprites.ts con las constantes de tile.
  const lineas = AVES.map((ave, i) => {
    const constName = `SPRITE_${ave.toUpperCase()}`;
    return `export const ${constName} = ${tileBase(i)}; // ${ave} (32x32, 4x4 tiles)`;
  });
  const contenido = [
    '/**',
    ' * Constantes de sprite generadas por tools/build-assets.js.',
    ' * NO editar a mano: regenerar con `node tools/build-assets.js`.',
    ' * Cada sprite es 32x32 (4x4 tiles). Dibujar con spr(id, x, y, key, esc, flip, 0, 4, 4).',
    ' * Los sprites viven en build/assets.tic (se cargan con `load` al arrancar).',
    ' */',
    '',
    ...lineas,
    '',
    '/** Indice de tile base por id de ave. */',
    'export const SPRITE_POR_AVE: Record<string, number> = {',
    ...AVES.map((ave) => `  ${ave}: ${tileBase(AVES.indexOf(ave))},`),
    '};',
    '',
    '/** Escala de dibujo de los sprites 32x32 (1 = 32x32 px en pantalla). */',
    'export const SPRITE_ESCALA = 1;',
    '',
    '/** Franjas de fondo (240x32, 30x4 tiles) importadas. */',
    ...FONDOS.map((f, k) => {
      const y = [FONDO_Y0, FONDO_Y1][k];
      const tile = (y / 8) * 32;
      return `export const FONDO_${f.toUpperCase()} = ${tile}; // ${f} (30x4 tiles desde tile ${tile})`;
    }),
    '',
    '/** Indice de franja de fondo por indice de escenario (alterna). */',
    `export const FONDOS_TILES: number[] = [${FONDOS.map((_f, k) => (([FONDO_Y0, FONDO_Y1][k]) / 8) * 32).join(', ')}];`,
    '',
    '/** Alto en tiles de cada franja de fondo. */',
    `export const FONDO_ALTO_TILES = ${FRANJA_H / 8};`,
    '',
  ].join('\n');
  fs.writeFileSync(path.join(GAME_DIR, 'src', 'data', 'sprites.ts'), contenido);
  console.log(`assets.tic generado (${fs.statSync(OUT_ABS).size} bytes) y sprites.ts actualizado.`);
}

main();

/**
 * Reproductor de música (TIC-80). Escribe las ondas y los sonidos (sfx) de la
 * pista en el banco de sonido y, en cada tick que corresponde a la velocidad,
 * toca las notas del paso actual, en el mismo orden que la pista Lua original.
 *
 * La API de sonido (`poke`, `sfx` de TIC-80) se recibe por parámetro, así el
 * reproductor se puede probar sin el runtime de TIC-80.
 */

import { PISTAS, type Pista } from './pistas';

/** Lo que el reproductor necesita de TIC-80. */
export interface ApiSonido {
  poke(direccion: number, valor: number): void;
  sfx(indice: number, nota: number, duracion: number, canal: number, volumen: number, velocidad: number): void;
}

/** Direcciones de memoria de TIC-80 para las ondas y los sonidos (sfx). */
const DIR_ONDAS = 0x0ffe4;
const DIR_SFX = 0x100e4;
const TAM_SFX = 66;
const PASOS_SFX = 30;

/** Escribe ondas y sonidos de la pista en la memoria de sonido de TIC-80. */
export function escribirBanco(api: ApiSonido, pista: Pista): void {
  pista.ondas.forEach((hex, w) => {
    for (let i = 0; i < 16; i++) {
      const hi = parseInt(hex[i * 2], 16);
      const lo = parseInt(hex[i * 2 + 1], 16);
      api.poke(DIR_ONDAS + w * 16 + i, (lo << 4) | hi);
    }
  });

  for (const s of pista.sfx) {
    const base = DIR_SFX + s.indice * TAM_SFX;
    for (let t = 0; t < PASOS_SFX; t++) {
      const v = (15 - (s.volumenes[t] ?? 0)) & 0xf;
      const wNib = s.onda & 0xf;
      let p = s.alturas[t] ?? 0;
      if (p < 0) p = 16 + p;
      api.poke(base + t * 2, (wNib << 4) | v);
      api.poke(base + t * 2 + 1, (p & 0xf) << 4);
    }
    api.poke(base + 60, (s.velocidad & 0x7) << 5);
    api.poke(base + 61, (s.longitudBucle << 4) | (s.inicioBucle & 0xf));
    api.poke(base + 62, 0);
    api.poke(base + 63, 0);
  }
}

let actual: Pista | null = null;
let tick = 0;
let paso = 0;
let terminada = false;

/** Carga una pista: escribe el banco y reinicia desde el primer paso. */
export function iniciarPista(api: ApiSonido, pista: Pista): void {
  escribirBanco(api, pista);
  actual = pista;
  tick = 0;
  paso = 0;
  terminada = false;
}

/** Deja de tocar música (las notas en curso terminan solas). */
export function detenerPista(): void {
  actual = null;
}

/** Nombre de la pista que está sonando, o null. */
export function pistaActual(): string | null {
  return actual && !terminada ? actual.nombre : null;
}

/** Avanza la música un tick. Llamar una vez por frame. */
export function tickMusica(api: ApiSonido): void {
  if (!actual || terminada) return;
  if (tick % actual.velocidad === 0) {
    tocarPaso(api, actual, paso);
    avanzar(actual);
  }
  tick++;
}

function tocarPaso(api: ApiSonido, p: Pista, i: number): void {
  for (const c of p.canales) {
    const nota = c.pasos[i];
    if (nota !== null) api.sfx(c.sfx, nota, c.duracion, c.canal, c.volumen, 0);
  }
  const codigo = p.percusion.pasos[i];
  if (codigo) {
    const s = p.percusion.sonidos[codigo];
    if (s) api.sfx(s.sfx, s.nota, s.duracion, s.canal, s.volumen, 0);
  }
}

function avanzar(p: Pista): void {
  const n = p.canales[0].pasos.length;
  const siguiente = paso + 1;
  switch (p.bucle.modo) {
    case 'todo':
      paso = siguiente % n;
      break;
    case 'desde':
      paso = siguiente >= n ? p.bucle.inicio : siguiente;
      break;
    case 'una-vez':
      if (siguiente >= n) terminada = true;
      else paso = siguiente;
      break;
  }
}

/** Pista que corresponde a cada pantalla (ver game/src/juego/flujo.ts). */
export function pistaParaPantalla(
  pantalla: string,
  resultado: 'jugador' | 'cpu' | 'empate' | null,
): Pista | null {
  switch (pantalla) {
    case 'titulo':
    case 'menu_torre':
      return PISTAS.melodia1;
    case 'seleccion':
      return PISTAS.encuentroEnemigo;
    case 'batalla':
    case 'revelacion':
      return PISTAS.pelea;
    case 'resultado':
      return resultado === 'jugador' ? PISTAS.victoriaPelea : null;
    default:
      return null;
  }
}

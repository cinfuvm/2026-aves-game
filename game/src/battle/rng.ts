/**
 * Fuente de aleatoriedad inyectable (ADR-04, arquitectura.adoc).
 * En producción la Parte B puede usar `Math.random`; en pruebas, `crearRng(seed)`.
 */

import type { Rng } from './types';

/** RNG determinista (LCG) para pruebas y modo de depuración. */
export function crearRng(seed: number): Rng {
  let estado = seed >>> 0;
  return function rng() {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 0x100000000;
  };
}

/** Entero aleatorio en [min, max], inclusive, usando el rng dado. */
export function enteroAleatorio(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

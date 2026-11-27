/**
 * Constantes de layout de la interfaz (TIC-80).
 *
 * Resolución fija de TIC-80: 240 x 136 px. Todo el dibujo debe caber en esta
 * grilla; no hay "responsive" dentro del cartucho (RF-028/RNF-009 aplican a la
 * capa HTML/PWA, no al canvas de TIC-80).
 *
 * Módulo puro: no usa la API de TIC-80, para poder probarse con vitest.
 */

/** Ancho del canvas de TIC-80 en píxeles. */
export const ANCHO_PANTALLA = 240

/** Alto del canvas de TIC-80 en píxeles. */
export const ALTO_PANTALLA = 136

/** Ancho de un carácter de la fuente del sistema (print), en píxeles. */
export const ANCHO_CARACTER = 6

/** Alto de línea de la fuente del sistema (print), en píxeles. */
export const ALTO_LINEA = 8

/** Margen lateral estándar de las pantallas. */
export const MARGEN = 8

/** Ancho útil de contenido (descontando márgenes laterales). */
export const ANCHO_UTIL = ANCHO_PANTALLA - MARGEN * 2

/**
 * Ancho útil para texto a una escala dada.
 * @param escala factor de escala de la fuente (1 = normal, 2 = doble).
 */
export function anchoUtil(escala = 1): number {
  return ANCHO_PANTALLA - MARGEN * 2 * escala
}

/**
 * Cantidad máxima de caracteres que caben en una línea de ancho útil.
 * @param escala factor de escala de la fuente.
 */
export function caracteresPorLinea(escala = 1): number {
  return Math.floor(anchoUtil(escala) / (ANCHO_CARACTER * escala))
}

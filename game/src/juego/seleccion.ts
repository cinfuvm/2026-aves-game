/**
 * Selección de equipo (fase P2): lógica pura de la pantalla de selección.
 *
 * El jugador elige 3 aves de su equipo (sin repetir, respetando el orden de
 * elección). El equipo enemigo se muestra como «vistazo» (solo lectura).
 *
 * Módulo puro: no usa la API de TIC-80, se prueba con vitest. La batalla 3v3
 * real se conecta en fases posteriores; aquí solo se construye la selección.
 */

import type { AveFicha } from '../battle/types';

/** Tamaño del equipo del jugador (D-06: 3v3). */
export const TAMANO_EQUIPO = 3;

/** Estado de la pantalla de selección de equipo. */
export interface SeleccionEquipo {
  /** Índice del ave resaltada en el catálogo visible. */
  cursorAve: number;
  /** Ids de las aves elegidas, en orden de elección. */
  elegidas: string[];
}

/** Crea una selección vacía. */
export function seleccionVacia(): SeleccionEquipo {
  return { cursorAve: 0, elegidas: [] };
}

/**
 * Mueve el cursor por el catálogo de aves disponibles, con vuelta.
 * @param total cantidad de aves visibles en el catálogo.
 */
export function moverCursor(seleccion: SeleccionEquipo, delta: number, total: number): SeleccionEquipo {
  if (total <= 0) return seleccion;
  return { ...seleccion, cursorAve: (((seleccion.cursorAve + delta) % total) + total) % total };
}

/** Indica si un ave (por id) ya está en el equipo. */
export function estaElegida(seleccion: SeleccionEquipo, id: string): boolean {
  return seleccion.elegidas.includes(id);
}

/** Indica si el equipo ya está completo. */
export function equipoCompleto(seleccion: SeleccionEquipo): boolean {
  return seleccion.elegidas.length >= TAMANO_EQUIPO;
}

/**
 * Alterna un ave en el equipo: la añade si cabe y no está; la quita si ya está.
 * Si el equipo está completo y el ave no está, no se añade (devuelve igual).
 */
export function alternarAve(seleccion: SeleccionEquipo, id: string): SeleccionEquipo {
  if (estaElegida(seleccion, id)) {
    return { ...seleccion, elegidas: seleccion.elegidas.filter((x) => x !== id) };
  }
  if (equipoCompleto(seleccion)) return seleccion;
  return { ...seleccion, elegidas: [...seleccion.elegidas, id] };
}

/** Aves elegidas del catálogo, en el orden de elección. */
export function fichasElegidas(catalogo: AveFicha[], seleccion: SeleccionEquipo): AveFicha[] {
  return seleccion.elegidas
    .map((id) => catalogo.find((ficha) => ficha.id === id))
    .filter((ficha): ficha is AveFicha => ficha !== undefined);
}

/** Indica si se puede confirmar la selección (equipo completo con aves válidas). */
export function puedeConfirmar(catalogo: AveFicha[], seleccion: SeleccionEquipo): boolean {
  return fichasElegidas(catalogo, seleccion).length === TAMANO_EQUIPO;
}

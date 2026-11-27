/**
 * Equipo enemigo por bot de la torre (vista previa, fase P2).
 *
 * TEMPORAL: los equipos reales de los 8 bots los define Lógica (aves
 * características, niveles, mecánicas 6–8). Mientras no existan, este módulo
 * genera un equipo determinista a partir de `FICHAS_MVP`, para poder mostrar el
 * «vistazo del enemigo» en la selección. Al conectar los datos reales solo hay
 * que sustituir `equipoEnemigo()`.
 */

import type { AveFicha } from '../battle/types';
import { FICHAS_MVP } from '../data/birds';
import { TAMANO_EQUIPO } from './seleccion';

/**
 * Devuelve el equipo (3 fichas) del bot indicado (0-based).
 * Determinista: rota el catálogo según el índice del bot. Si faltan aves en el
 * catálogo (hoy solo hay 3), completa repitiendo el último disponible para no
 * romper el dibujo del vistazo.
 */
export function equipoEnemigo(indiceBot: number): AveFicha[] {
  const n = FICHAS_MVP.length;
  if (n === 0) return [];
  const equipo: AveFicha[] = [];
  for (let i = 0; i < TAMANO_EQUIPO; i++) {
    equipo.push(FICHAS_MVP[(((indiceBot + i) % n) + n) % n]);
  }
  return equipo;
}

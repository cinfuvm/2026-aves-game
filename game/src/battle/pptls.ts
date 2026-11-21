/**
 * Matriz PPTLS (Piedra–Papel–Tijera–Lagarto–Spock).
 * Fuente: docs/modules/prd/pages/reglas-batalla.adoc y pelea.md.
 *
 * `compararPPTLS(movJugador, movCpu)` devuelve quién gana el intercambio
 * desde la perspectiva del jugador.
 */

import type { ResultadoPPTLS, TipoPPTLS } from './types';

export const PPTLS_TIPOS: readonly TipoPPTLS[] = [
  'piedra',
  'papel',
  'tijera',
  'lagarto',
  'spock',
];

/** Tipos a los que vence cada tipo. */
const VENTAJAS: Record<TipoPPTLS, readonly TipoPPTLS[]> = {
  piedra: ['tijera', 'lagarto'], // Piedra aplasta Tijera y aplasta Lagarto
  papel: ['piedra', 'spock'], // Papel cubre Piedra y refuta Spock
  tijera: ['papel', 'lagarto'], // Tijera corta Papel y decapita Lagarto
  lagarto: ['papel', 'spock'], // Lagarto come Papel y envenena Spock
  spock: ['tijera', 'piedra'], // Spock rompe Tijera y vaporiza Piedra
};

/** Mensaje mnemotécnico para cada pareja en la que gana el primer tipo. */
const MENSAJES: Record<string, string> = {
  'piedra>tijera': 'Piedra aplasta Tijera',
  'piedra>lagarto': 'Piedra aplasta Lagarto',
  'papel>piedra': 'Papel cubre Piedra',
  'papel>spock': 'Papel refuta Spock',
  'tijera>papel': 'Tijera corta Papel',
  'tijera>lagarto': 'Tijera decapita Lagarto',
  'lagarto>papel': 'Lagarto come Papel',
  'lagarto>spock': 'Lagarto envenena Spock',
  'spock>tijera': 'Spock rompe Tijera',
  'spock>piedra': 'Spock vaporiza Piedra',
};

const PLURAL: Record<TipoPPTLS, string> = {
  piedra: 'piedras',
  papel: 'papeles',
  tijera: 'tijeras',
  lagarto: 'lagartos',
  spock: 'spocks',
};

/**
 * Compara dos tipos PPTLS.
 * - `'jugador'`: el tipo del jugador gana el intercambio.
 * - `'cpu'`: el tipo del CPU gana el intercambio.
 * - `'empate'`: tipos iguales.
 */
export function compararPPTLS(
  tipoJugador: TipoPPTLS,
  tipoCpu: TipoPPTLS,
): ResultadoPPTLS {
  if (tipoJugador === tipoCpu) return 'empate';
  if (VENTAJAS[tipoJugador].includes(tipoCpu)) return 'jugador';
  return 'cpu';
}

/**
 * Mensaje del intercambio: la regla mnemotécnica si hay ganador,
 * o «Choque de {plural}» si empatan (p. ej. «Choque de piedras»).
 */
export function mensajePPTLS(tipoJugador: TipoPPTLS, tipoCpu: TipoPPTLS): string {
  if (tipoJugador === tipoCpu) return `Choque de ${PLURAL[tipoJugador]}`;
  if (VENTAJAS[tipoJugador].includes(tipoCpu)) {
    return MENSAJES[`${tipoJugador}>${tipoCpu}`];
  }
  return MENSAJES[`${tipoCpu}>${tipoJugador}`];
}

/** Indica si el primer tipo vence al segundo (sin considerar empates). */
export function ganaPPTLS(tipoA: TipoPPTLS, tipoB: TipoPPTLS): boolean {
  return tipoA !== tipoB && VENTAJAS[tipoA].includes(tipoB);
}

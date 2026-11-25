/**
 * Elección de movimiento del CPU (frontera con la Parte C).
 * Fuente: plan_desarrollo.md (Área B) y docs/modules/prd/pages/reglas-batalla.adoc («IA del CPU»).
 *
 * Nivel base (MVP, BR del PRD): elección **uniformemente aleatoria** entre los
 * movimientos del ave activa del CPU que tengan MP suficiente. No hace trampa:
 * solo puede elegir entre movimientos no bloqueados.
 *
 * La Parte C reemplazará la implementación interna por perfiles con preferencias
 * e IA por jefe, sin tocar el motor ni `resolverTurno`. La firma ya queda fija.
 */

import { aveActiva, movimientosUsables } from './state';
import type { EstadoBatalla, MovimientoActivo, Rng } from './types';

/**
 * Perfil de elección del CPU.
 * El nivel base usa 'aleatorio'; la Parte C añadirá tipos propios
 * (preferencias por ventaja, conservar MP, relevar, estrategia por jefe)
 * con parámetros libres en `datos`.
 */
export interface PerfilCpu {
  tipo: 'aleatorio';
  /** Parámetros libres del perfil (los define la Parte C). */
  datos?: Record<string, unknown>;
}

/** Perfil base por defecto. */
export const PERFIL_BASE: PerfilCpu = { tipo: 'aleatorio' };

/**
 * Elige el movimiento del CPU para el turno actual.
 * - Devuelve el movimiento elegido (entre los usables del ave activa del CPU).
 * - Devuelve `null` si ningún movimiento es usable por MP insuficiente
 *   (señal para la Parte B de que el CPU no puede jugar; el relevo/rendición
 *   ya lo maneja el motor).
 */
export function elegirMovimientoCpu(
  estado: EstadoBatalla,
  rng: Rng,
  perfil: PerfilCpu = PERFIL_BASE,
): MovimientoActivo | null {
  const usables = movimientosUsables(aveActiva(estado.cpu));

  if (usables.length === 0) return null;

  switch (perfil.tipo) {
    case 'aleatorio':
    default:
      // Elección uniforme: cada movimiento usable tiene la misma probabilidad.
      return usables[Math.floor(rng() * usables.length)];
  }
}

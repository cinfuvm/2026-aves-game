/**
 * Elección del CPU (Parte C): movimientos y equipo de los bots.
 * Fuente: plan_desarrollo.md (Área B, §5) y docs/modules/prd/pages/reglas-batalla.adoc («IA del CPU»).
 *
 * Perfiles:
 * - 'aleatorio' (nivel base del PRD): elección uniforme entre los movimientos usables.
 * - 'estrategico' (bots de la torre): predice el próximo tipo del jugador con el
 *   historial (`ia/prediccion.ts`), calcula el valor esperado de cada movimiento
 *   con las reglas del motor (`ia/evaluacion.ts`) y elige con una softmax más un
 *   piso de exploración. Así el bot juega con criterio, pero siempre con azar.
 *
 * Reglas de juego limpio (todos los perfiles):
 * - Solo elige entre movimientos no bloqueados por MP.
 * - Nunca ve la elección actual del jugador (D-J).
 * - No se rinde manualmente (reglas-batalla.adoc, «Rendición»).
 * La firma de `elegirMovimientoCpu` no cambió respecto al nivel base.
 */

import { ganaPPTLS } from './pptls';
import { aveActiva, movimientosUsables } from './state';
import type { AveFicha, EstadoBatalla, MovimientoActivo, Rng, TipoPPTLS } from './types';
import {
  evaluarMovimientos,
  predecirJugador,
  valoresAProbabilidades,
  type EvaluacionMovimiento,
  type ParametrosIA,
} from './ia/evaluacion';
import type { Distribucion } from './ia/prediccion';

export type { ParametrosIA } from './ia/evaluacion';
export type { Distribucion, NombrePredictor } from './ia/prediccion';

/**
 * Perfil de elección del CPU.
 * - 'aleatorio': nivel base, sin parámetros.
 * - 'estrategico': IA de los bots, con sus parámetros de personalidad (`ia`).
 */
export type PerfilCpu =
  | { tipo: 'aleatorio'; datos?: Record<string, unknown> }
  | { tipo: 'estrategico'; ia: ParametrosIA; datos?: Record<string, unknown> };

/** Perfil de un bot: la variante 'estrategico' de `PerfilCpu`. */
export type PerfilEstrategico = Extract<PerfilCpu, { tipo: 'estrategico' }>;

/** Perfil base por defecto. */
export const PERFIL_BASE: PerfilCpu = { tipo: 'aleatorio' };

/** Probabilidad con la que el CPU elegiría cada movimiento usable, con su desglose. */
export interface DecisionCpu {
  /** Movimientos usables del ave activa del CPU, en el orden de su ficha. */
  movimientos: MovimientoActivo[];
  /** Probabilidad de elegir cada movimiento (mismo orden; suma 1). */
  probabilidades: number[];
  /** Predicción del próximo tipo del jugador (uniforme en el perfil aleatorio). */
  prediccion: Distribucion | null;
  /** Evaluación de cada movimiento (solo en el perfil estratégico). */
  evaluaciones: EvaluacionMovimiento[] | null;
}

/**
 * Calcula, sin consumir aleatoriedad, con qué probabilidad el CPU elegiría cada
 * movimiento usable. Sirve para pruebas y para un modo de depuración en la UI.
 */
export function decisionCpu(estado: EstadoBatalla, perfil: PerfilCpu = PERFIL_BASE): DecisionCpu {
  const usables = movimientosUsables(aveActiva(estado.cpu));
  const n = usables.length;

  if (perfil.tipo !== 'estrategico' || n <= 1) {
    return {
      movimientos: usables,
      probabilidades: usables.map(() => 1 / Math.max(1, n)),
      prediccion: null,
      evaluaciones: null,
    };
  }

  const prediccion = predecirJugador(estado, perfil.ia);
  const evaluaciones = evaluarMovimientos(estado, perfil.ia, prediccion);
  const probabilidades = valoresAProbabilidades(
    evaluaciones.map((e) => e.valor),
    perfil.ia.temperatura,
    perfil.ia.exploracion,
  );
  return { movimientos: usables, probabilidades, prediccion, evaluaciones };
}

/**
 * Elige el movimiento del CPU para el turno actual.
 * - Devuelve el movimiento elegido (entre los usables del ave activa del CPU).
 * - Devuelve `null` si ningún movimiento es usable por MP insuficiente
 *   (señal de estado inconsistente: el motor hace el relevo antes).
 *
 * Consumo del `rng`: una sola tirada si hay 2 o más movimientos usables;
 * ninguna si hay 0 o 1.
 */
export function elegirMovimientoCpu(
  estado: EstadoBatalla,
  rng: Rng,
  perfil: PerfilCpu = PERFIL_BASE,
): MovimientoActivo | null {
  const usables = movimientosUsables(aveActiva(estado.cpu));

  if (usables.length === 0) return null;

  switch (perfil.tipo) {
    case 'estrategico': {
      if (usables.length === 1) return usables[0];
      const { probabilidades } = decisionCpu(estado, perfil);
      return usables[muestrear(probabilidades, rng())];
    }
    case 'aleatorio':
    default:
      // Elección uniforme: cada movimiento usable tiene la misma probabilidad.
      return usables[Math.floor(rng() * usables.length)];
  }
}

/** Índice elegido al recorrer las probabilidades acumuladas con `tirada` en [0, 1). */
function muestrear(probabilidades: readonly number[], tirada: number): number {
  let acumulada = 0;
  for (let i = 0; i < probabilidades.length; i++) {
    acumulada += probabilidades[i];
    if (tirada < acumulada) return i;
  }
  return probabilidades.length - 1;
}

/** Preferencias de un bot al armar su equipo. */
export interface OpcionesEquipoCpu {
  /** Tipo favorito: el equipo incluye al menos un ave de ese tipo si hay alguna. */
  afinidad: TipoPPTLS | null;
  /** Id del ave característica del bot: si está disponible, entra última (su «as»). */
  aveCaracteristica: string | null;
  /**
   * Elige aves que venzan a los tipos del equipo del jugador. Solo el Enemigo 8
   * lo usa («algo injusto»): los demás no miran el equipo del jugador.
   */
  contraEquipo: boolean;
}

/**
 * Arma el equipo del CPU con `cantidad` aves de `fichas`, en orden de salida.
 * - El ave característica (si está en `fichas`) va al final, como en Pokémon.
 * - Con afinidad, la primera ave es de ese tipo si existe alguna.
 * - El resto se sortea con preferencia por tipos distintos (cobertura) y, si el
 *   bot tiene afinidad, por su tipo favorito.
 * - Con `contraEquipo` y `equipoJugador`, prefiere tipos que vencen a los del jugador.
 *
 * Lanza un error si no hay suficientes fichas. No repite aves.
 */
export function armarEquipoCpu(
  fichas: readonly AveFicha[],
  cantidad: number,
  rng: Rng,
  opciones: OpcionesEquipoCpu,
  equipoJugador: readonly AveFicha[] = [],
): AveFicha[] {
  if (fichas.length < cantidad) {
    throw new Error(
      `No hay aves suficientes para el CPU: se piden ${cantidad} y hay ${fichas.length}`,
    );
  }

  let restantes = [...fichas];
  let as: AveFicha | null = null;
  if (opciones.aveCaracteristica !== null && cantidad > 1) {
    as = restantes.find((f) => f.id === opciones.aveCaracteristica) ?? null;
    if (as) restantes = restantes.filter((f) => f !== as);
  }

  const elegidas: AveFicha[] = [];
  const huecos = cantidad - (as ? 1 : 0);
  const tipos = (): TipoPPTLS[] => [...elegidas, ...(as ? [as] : [])].map((f) => f.tipo);

  for (let k = 0; k < huecos; k++) {
    let candidatas = restantes;
    const faltaAfinidad =
      k === 0 && opciones.afinidad !== null && !tipos().includes(opciones.afinidad);
    if (faltaAfinidad) {
      const delTipo = restantes.filter((f) => f.tipo === opciones.afinidad);
      if (delTipo.length > 0) candidatas = delTipo;
    }

    const pesos = candidatas.map((f) => {
      let peso = 1;
      if (opciones.afinidad !== null && f.tipo === opciones.afinidad) peso += 1.5;
      if (tipos().includes(f.tipo)) peso *= 0.35;
      if (opciones.contraEquipo) {
        for (const rival of equipoJugador) {
          if (ganaPPTLS(f.tipo, rival.tipo)) peso += 1;
          if (ganaPPTLS(rival.tipo, f.tipo)) peso *= 0.7;
        }
      }
      return peso;
    });
    const total = pesos.reduce((a, b) => a + b, 0);
    const elegida = candidatas[muestrear(pesos.map((p) => p / total), rng())];
    elegidas.push(elegida);
    restantes = restantes.filter((f) => f !== elegida);
  }

  return as ? [...elegidas, as] : elegidas;
}

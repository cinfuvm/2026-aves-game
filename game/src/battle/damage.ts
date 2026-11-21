/**
 * Cálculo de daño (Parte A).
 * Fuente: plan_logica.md (reglas de pelea.md) + pasivas por tipo (D-04, changes.md).
 *
 * Orden de aplicación:
 *   1. Daño base aleatorio en [0, HP máx del rival].
 *   2. Multiplicador de esfuerzo: ×(1 + coste_MP × factorEsfuerzo).
 *   3. STAB ×factorStab si el tipo del movimiento coincide con el tipo del ave.
 *   4. Pasiva Tijera: +bonusTijera de daño fijo si el ave gana el intercambio.
 *   5. Pasiva Spock: daño mínimo de minimoSpock × HP máx rival si el ave gana
 *      y el daño es mayor que 0 (solo con `pasivaSpockActiva`; decisión D3 del plan MVP).
 *   6. Redondeo hacia abajo (entero ≥ 0).
 *
 * El daño solo se calcula para el bando que inflige: ganador del intercambio,
 * o ambos en empate PPTLS (D-02). Las pasivas de Tijera y Spock exigen ganar
 * el intercambio, por lo que no aplican en empate.
 */

import { enteroAleatorio } from './rng';
import {
  CONFIG_BASE,
  type ClasificacionEfectividad,
  type ConfigBatalla,
  type MovimientoActivo,
  type Rng,
  type TipoPPTLS,
} from './types';

/** Desglose del cálculo de daño, útil para el historial y el modo de depuración. */
export interface DetalleDano {
  /** Daño base aleatorio antes de multiplicadores. */
  danoBase: number;
  multiplicadorEsfuerzo: number;
  aplicaStab: boolean;
  /** Daño tras esfuerzo y STAB, antes de pasivas. */
  danoAntesDePasivas: number;
  /** Suma aplicada por la pasiva Tijera (0 si no aplica). */
  bonusTijera: number;
  /** Verdadero si el mínimo de Spock elevó el daño. */
  aplicaMinimoSpock: boolean;
  /** Daño final, entero ≥ 0, que se resta del HP del rival. */
  dano: number;
  clasificacion: ClasificacionEfectividad;
}

/** Daño base aleatorio entero en [0, hpMaxRival], inclusive (BR-006). */
export function calcularDanoBase(hpMaxRival: number, rng: Rng): number {
  return enteroAleatorio(rng, 0, hpMaxRival);
}

/**
 * Clasifica el daño final (BR-007, BR-008):
 * - 0 → «sin-efecto».
 * - Mayor al 50 % del HP máx del rival → «muy-efectivo».
 * - En otro caso → «efectivo».
 */
export function clasificarEfectividad(
  dano: number,
  hpMaxRival: number,
): ClasificacionEfectividad {
  if (dano <= 0) return 'sin-efecto';
  if (dano > hpMaxRival * 0.5) return 'muy-efectivo';
  return 'efectivo';
}

/** Mensajes de efectividad sugeridos por reglas-batalla.adoc. */
export const MENSAJE_EFECTIVIDAD: Record<ClasificacionEfectividad, string> = {
  'sin-efecto': 'El ataque no tuvo efecto',
  efectivo: 'El ataque fue efectivo',
  'muy-efectivo': '¡Es muy efectivo!',
};

/**
 * Calcula el daño infligido por el movimiento `movAtacante` de un ave de tipo
 * `tipoAveAtacante` sobre un rival con HP máximo `hpMaxRival`.
 *
 * `ganaIntercambio` indica si el atacante ganó el intercambio PPTLS
 * (`false` en empate): condiciona las pasivas de Tijera y Spock.
 */
export function calcularDano(
  hpMaxRival: number,
  movAtacante: MovimientoActivo,
  tipoAveAtacante: TipoPPTLS,
  ganaIntercambio: boolean,
  rng: Rng,
  config: ConfigBatalla = CONFIG_BASE,
): DetalleDano {
  const danoBase = calcularDanoBase(hpMaxRival, rng);

  const multiplicadorEsfuerzo = 1 + movAtacante.costeMp * config.factorEsfuerzo;
  const aplicaStab = movAtacante.tipo === tipoAveAtacante;
  const danoAntesDePasivas =
    danoBase * multiplicadorEsfuerzo * (aplicaStab ? config.factorStab : 1);
  let dano = danoAntesDePasivas;

  let bonusTijera = 0;
  if (ganaIntercambio && tipoAveAtacante === 'tijera') {
    bonusTijera = config.bonusTijera;
    dano += bonusTijera;
  }

  let aplicaMinimoSpock = false;
  // D3: la pasiva solo se aplica si hay daño base; con daño 0 el resultado es «Sin efecto».
  if (ganaIntercambio && tipoAveAtacante === 'spock' && config.pasivaSpockActiva && dano > 0) {
    const minimo = hpMaxRival * config.minimoSpock;
    if (dano < minimo) {
      dano = minimo;
      aplicaMinimoSpock = true;
    }
  }

  const danoFinal = Math.max(0, Math.floor(dano));

  return {
    danoBase,
    multiplicadorEsfuerzo,
    aplicaStab,
    danoAntesDePasivas,
    bonusTijera,
    aplicaMinimoSpock,
    dano: danoFinal,
    clasificacion: clasificarEfectividad(danoFinal, hpMaxRival),
  };
}

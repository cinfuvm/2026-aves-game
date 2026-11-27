/**
 * Cálculo de daño (Parte A, ajustado en la Parte C).
 * Fuente: plan_motor_c.md (paso 2) y plan_desarrollo.md (D-H, D-K).
 *
 * Orden de aplicación:
 *   1. Daño base aleatorio entero entre danoBaseMinFrac y danoBaseMaxFrac del
 *      HP máx rival (por defecto 10 % a 50 %).
 *   2. Multiplicador de esfuerzo: ×(1 + coste_MP × factorEsfuerzo).
 *   3. STAB ×factorStab si el tipo del movimiento coincide con el tipo del ave.
 *   4. Pasiva Tijera: +bonusTijera de daño fijo si el ave gana el intercambio.
 *   5. Redondeo hacia abajo (entero ≥ 0).
 *
 * La pasiva de Spock ya no eleva el daño (D-K): su efecto es que su movimiento
 * no puede fallar cuando gana, y eso lo resuelve `turn.ts`.
 *
 * El daño solo se calcula para el bando que inflige: ganador del intercambio,
 * o ambos en empate PPTLS (D-02). La pasiva de Tijera exige ganar el intercambio.
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
  /** Daño final, entero ≥ 0, que se resta del HP del rival. */
  dano: number;
  clasificacion: ClasificacionEfectividad;
}

/**
 * Daño base aleatorio entero en [floor(min × HP), floor(max × HP)], inclusive.
 * Por defecto min = 10 % y max = 50 % del HP máximo del rival (plan_motor_c.md, C1).
 */
export function calcularDanoBase(
  hpMaxRival: number,
  rng: Rng,
  config: ConfigBatalla = CONFIG_BASE,
): number {
  const minimo = Math.floor(hpMaxRival * config.danoBaseMinFrac);
  const maximo = Math.floor(hpMaxRival * config.danoBaseMaxFrac);
  return enteroAleatorio(rng, minimo, maximo);
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
 * (`false` en empate): condiciona la pasiva de Tijera.
 */
export function calcularDano(
  hpMaxRival: number,
  movAtacante: MovimientoActivo,
  tipoAveAtacante: TipoPPTLS,
  ganaIntercambio: boolean,
  rng: Rng,
  config: ConfigBatalla = CONFIG_BASE,
): DetalleDano {
  const danoBase = calcularDanoBase(hpMaxRival, rng, config);

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

  const danoFinal = Math.max(0, Math.floor(dano));

  return {
    danoBase,
    multiplicadorEsfuerzo,
    aplicaStab,
    danoAntesDePasivas,
    bonusTijera,
    dano: danoFinal,
    clasificacion: clasificarEfectividad(danoFinal, hpMaxRival),
  };
}

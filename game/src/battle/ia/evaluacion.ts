/**
 * Evaluación de los movimientos del CPU (IA de los bots, Parte C).
 *
 * Para cada movimiento usable del ave activa del CPU calcula un **valor
 * esperado** contra la predicción del próximo tipo del jugador:
 *   - Si el CPU gana el intercambio: daño esperado al rival (como fracción de su
 *     HP actual) y probabilidad de debilitarlo.
 *   - Si pierde: daño esperado que recibe y probabilidad de caer.
 *   - Si empata: ambas cosas (en este motor, en empate los dos se dañan, D-02).
 * Usa las mismas reglas del motor (daño base, esfuerzo, STAB, Tijera, fallo,
 * Spock que no falla, coste de MP y rendición por MP) leídas de `estado.config`.
 *
 * Después suma los rasgos de personalidad del bot (afinidad por un tipo,
 * ahorro de MP, terquedad, evitar repetirse) y convierte los valores en
 * probabilidades con una softmax más un piso de exploración: el bot prefiere
 * las mejores jugadas, pero nunca es 100 % predecible.
 *
 * Módulo puro: no usa la API de TIC-80 ni aleatoriedad.
 */

import { compararPPTLS, PPTLS_TIPOS } from '../pptls';
import { aveActiva, movimientosUsables } from '../state';
import type {
  AveCombate,
  ConfigBatalla,
  EstadoBatalla,
  MovimientoActivo,
  TipoPPTLS,
} from '../types';
import {
  distribucionUniforme,
  mezclar,
  normalizar,
  predecirConjunto,
  type Distribucion,
  type NombrePredictor,
} from './prediccion';

/** Parámetros de personalidad y dificultad de un bot. */
export interface ParametrosIA {
  /** Tipo favorito del bot (Enemigos 1 a 5) o null si no tiene. */
  afinidad: TipoPPTLS | null;
  /** Bono de valor para los movimientos del tipo favorito. */
  pesoAfinidad: number;
  /** Temperatura de la softmax: alta = más azar, baja = más «racional». */
  temperatura: number;
  /** Probabilidad mínima repartida entre todos los movimientos usables (0–1). */
  exploracion: number;
  /** Predictores del jugador que usa. Lista vacía = no predice (uniforme). */
  predictores: NombrePredictor[];
  /** Cuánto confía en la predicción (0 = uniforme, 1 = predicción completa). */
  confianza: number;
  /** Decaimiento del historial (0–1]: más bajo = olvida más rápido. */
  memoria: number;
  /** Peso del daño infligido. */
  agresividad: number;
  /** Peso del daño recibido. */
  aversionRiesgo: number;
  /** Bono por la probabilidad de debilitar al ave rival en este turno. */
  rematador: number;
  /** Penalización por gastar MP (proporcional al coste y a la vida que le queda). */
  ahorroMp: number;
  /** Penalización por repetir el tipo de su último movimiento. */
  evitaRepetir: number;
  /** Bono por repetir el último tipo si con él ganó el intercambio. */
  terco: number;
  /**
   * Información completa (Enemigo 8, «algo injusto»): conoce los movimientos
   * usables del ave del jugador y sus costes. Nunca ve la elección actual.
   */
  informacionCompleta: boolean;
}

/** Penalización base por un movimiento que deja al ave sin MP para moverse (D-07). */
const PENALIZACION_RENDICION = 0.45;

/** Resumen del daño de un golpe: media (con tope en el HP actual) y probabilidad de debilitar. */
export interface ResumenDano {
  /** Daño medio, sin pasar del HP actual del rival. */
  media: number;
  /** Probabilidad de que el golpe deje al rival en 0 HP. */
  probDebilitar: number;
}

/**
 * Distribución exacta del daño de un golpe según `damage.ts`: el daño base es un
 * entero uniforme entre `danoBaseMinFrac` y `danoBaseMaxFrac` del HP máx del
 * rival; luego esfuerzo, STAB, bono fijo y `floor`.
 */
export function resumirDano(
  hpMaxRival: number,
  hpActualRival: number,
  costeMp: number,
  aplicaStab: boolean,
  bonus: number,
  config: ConfigBatalla,
): ResumenDano {
  const minimo = Math.floor(hpMaxRival * config.danoBaseMinFrac);
  const maximo = Math.floor(hpMaxRival * config.danoBaseMaxFrac);
  const multiplicador =
    (1 + costeMp * config.factorEsfuerzo) * (aplicaStab ? config.factorStab : 1);
  const vida = Math.max(1, hpActualRival);

  let suma = 0;
  let debilita = 0;
  for (let base = minimo; base <= maximo; base++) {
    const dano = Math.max(0, Math.floor(base * multiplicador + bonus));
    suma += Math.min(dano, vida);
    if (dano >= vida) debilita++;
  }
  const casos = maximo - minimo + 1;
  return { media: suma / casos, probDebilitar: debilita / casos };
}

/** Costes posibles de un movimiento del jugador de cierto tipo, según lo que sabe el bot. */
function costesDelJugador(
  aveJugador: AveCombate,
  tipo: TipoPPTLS,
  config: ConfigBatalla,
  informacionCompleta: boolean,
): number[] {
  if (informacionCompleta) {
    const costes = movimientosUsables(aveJugador)
      .filter((mov) => mov.tipo === tipo)
      .map((mov) => mov.costeMp);
    if (costes.length > 0) return costes;
  }
  // Sin información: cualquier coste del rango es igual de probable.
  const costes: number[] = [];
  for (let c = config.costeMpRango[0]; c <= config.costeMpRango[1]; c++) costes.push(c);
  return costes;
}

/** Daño que el jugador haría con un movimiento de `tipo` (promedio sobre los costes posibles). */
function danoDelJugador(
  aveJugador: AveCombate,
  aveCpu: AveCombate,
  tipo: TipoPPTLS,
  ganaJugador: boolean,
  config: ConfigBatalla,
  informacionCompleta: boolean,
): ResumenDano {
  const costes = costesDelJugador(aveJugador, tipo, config, informacionCompleta);
  const bonus = ganaJugador && aveJugador.tipo === 'tijera' ? config.bonusTijera : 0;
  let media = 0;
  let prob = 0;
  for (const coste of costes) {
    const r = resumirDano(
      aveCpu.hpMax,
      aveCpu.hpActual,
      coste,
      tipo === aveJugador.tipo,
      bonus,
      config,
    );
    media += r.media;
    prob += r.probDebilitar;
  }
  return { media: media / costes.length, probDebilitar: prob / costes.length };
}

/**
 * Predicción del próximo tipo del jugador según los parámetros del bot.
 * Con información completa (Enemigo 8) descarta los tipos que el ave del
 * jugador no puede usar en este turno.
 */
export function predecirJugador(estado: EstadoBatalla, ia: ParametrosIA): Distribucion {
  const aveJugador = aveActiva(estado.jugador);
  let prediccion =
    ia.predictores.length === 0
      ? distribucionUniforme()
      : predecirConjunto(estado.historial, ia.predictores, ia.memoria, aveJugador.tipo)
          .distribucion;
  prediccion = mezclar(distribucionUniforme(), prediccion, ia.confianza);

  if (ia.informacionCompleta) {
    const posibles = new Set(movimientosUsables(aveJugador).map((mov) => mov.tipo));
    if (posibles.size > 0) {
      const filtrada = { ...prediccion };
      for (const tipo of PPTLS_TIPOS) if (!posibles.has(tipo)) filtrada[tipo] = 0;
      prediccion = normalizar(filtrada);
    }
  }
  return prediccion;
}

/** Valor de un movimiento del CPU, con su desglose para depuración y pruebas. */
export interface EvaluacionMovimiento {
  movimiento: MovimientoActivo;
  /** Valor total (más alto = mejor jugada para el bot). */
  valor: number;
  /** Parte del valor que viene del intercambio PPTLS esperado. */
  valorCombate: number;
  /** Probabilidad (según la predicción) de ganar el intercambio con este movimiento. */
  probGanar: number;
  /** Probabilidad (según la predicción) de perder el intercambio con este movimiento. */
  probPerder: number;
}

/**
 * Evalúa todos los movimientos usables del ave activa del CPU contra la
 * predicción `prediccion` del próximo tipo del jugador.
 */
export function evaluarMovimientos(
  estado: EstadoBatalla,
  ia: ParametrosIA,
  prediccion: Distribucion,
): EvaluacionMovimiento[] {
  const config = estado.config;
  const aveCpu = aveActiva(estado.cpu);
  const aveJugador = aveActiva(estado.jugador);
  const usables = movimientosUsables(aveCpu);
  const ultima = estado.historial.length > 0 ? estado.historial[estado.historial.length - 1] : null;
  const fraccionVidaCpu = aveCpu.hpActual / aveCpu.hpMax;
  const costeMinimo = Math.min(...aveCpu.movimientos.map((mov) => mov.costeMp));
  const vidaJugador = Math.max(1, aveJugador.hpActual);
  const vidaCpu = Math.max(1, aveCpu.hpActual);

  return usables.map((mov) => {
    let valorCombate = 0;
    let probGanar = 0;
    let probPerder = 0;
    const stabCpu = mov.tipo === aveCpu.tipo;

    for (const tipoJugador of PPTLS_TIPOS) {
      const p = prediccion[tipoJugador];
      if (p <= 0) continue;
      const resultado = compararPPTLS(tipoJugador, mov.tipo);
      let valor = 0;

      if (resultado === 'cpu') {
        probGanar += p;
        const falloCpu = aveCpu.tipo === 'spock' ? 0 : config.probFallo;
        const bonus = aveCpu.tipo === 'tijera' ? config.bonusTijera : 0;
        const golpe = resumirDano(
          aveJugador.hpMax,
          aveJugador.hpActual,
          mov.costeMp,
          stabCpu,
          bonus,
          config,
        );
        valor =
          (1 - falloCpu) *
          (ia.agresividad * (golpe.media / vidaJugador) + ia.rematador * golpe.probDebilitar);
      } else if (resultado === 'jugador') {
        probPerder += p;
        const falloJugador = aveJugador.tipo === 'spock' ? 0 : config.probFallo;
        const golpe = danoDelJugador(
          aveJugador,
          aveCpu,
          tipoJugador,
          true,
          config,
          ia.informacionCompleta,
        );
        valor =
          -(1 - falloJugador) *
          ia.aversionRiesgo *
          (golpe.media / vidaCpu + 0.5 * golpe.probDebilitar);
      } else {
        // Empate: en este motor ambos bandos se dañan (D-02) y ambos pueden fallar.
        const golpeCpu = resumirDano(
          aveJugador.hpMax,
          aveJugador.hpActual,
          mov.costeMp,
          stabCpu,
          0,
          config,
        );
        const golpeJugador = danoDelJugador(
          aveJugador,
          aveCpu,
          tipoJugador,
          false,
          config,
          ia.informacionCompleta,
        );
        const acierto = 1 - config.probFallo;
        valor =
          acierto *
            (ia.agresividad * (golpeCpu.media / vidaJugador) +
              ia.rematador * golpeCpu.probDebilitar) -
          acierto *
            ia.aversionRiesgo *
            (golpeJugador.media / vidaCpu + 0.5 * golpeJugador.probDebilitar);
      }
      valorCombate += p * valor;
    }

    let valor = valorCombate;

    // Economía de MP: gastar importa menos cuando al ave le queda poca vida.
    const costeEsperado =
      aveCpu.tipo === 'papel' ? mov.costeMp * (1 - config.probCosteCeroPapel) : mov.costeMp;
    valor -= ia.ahorroMp * (costeEsperado / aveCpu.mpMax) * fraccionVidaCpu;

    // Un movimiento que deja al ave sin MP para ningún otro la saca del combate (D-07).
    if (aveCpu.mpActual - mov.costeMp < costeMinimo) {
      valor -= PENALIZACION_RENDICION * fraccionVidaCpu;
    }

    // Personalidad.
    if (ia.afinidad !== null && mov.tipo === ia.afinidad) valor += ia.pesoAfinidad;
    if (ultima !== null && mov.tipo === ultima.movCpu.tipo) {
      valor -= ia.evitaRepetir;
      if (ultima.resultado === 'cpu') valor += ia.terco;
    }

    return { movimiento: mov, valor, valorCombate, probGanar, probPerder };
  });
}

/**
 * Convierte valores en probabilidades: softmax con `temperatura` y un piso de
 * `exploracion` repartido entre todos. Ningún movimiento queda con
 * probabilidad 0 si `exploracion` es mayor que 0.
 */
export function valoresAProbabilidades(
  valores: readonly number[],
  temperatura: number,
  exploracion: number,
): number[] {
  const n = valores.length;
  if (n === 0) return [];
  const t = Math.max(1e-3, temperatura);
  const maximo = Math.max(...valores);
  const exps = valores.map((v) => Math.exp((v - maximo) / t));
  const suma = exps.reduce((a, b) => a + b, 0);
  const e = Math.min(1, Math.max(0, exploracion));
  return exps.map((x) => (1 - e) * (x / suma) + e / n);
}

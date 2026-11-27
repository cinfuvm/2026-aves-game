/**
 * Predicción del próximo tipo PPTLS del jugador (IA de los bots, Parte C).
 *
 * Todos los predictores usan **solo información pública**: el historial de turnos
 * (los movimientos se revelan al resolver cada turno) y el tipo del ave activa
 * del jugador, que se ve en pantalla. Ninguno ve la elección actual del jugador
 * (decisión D-J de plan_desarrollo.md).
 *
 * Cada predictor devuelve una distribución de probabilidad sobre los 5 tipos.
 * `predecirConjunto` combina varios predictores y les da más peso a los que
 * acertaron más en los turnos anteriores de la misma batalla.
 *
 * Módulo puro: no usa la API de TIC-80 ni aleatoriedad.
 */

import { ganaPPTLS, PPTLS_TIPOS } from '../pptls';
import type { EntradaHistorial, TipoPPTLS } from '../types';

/** Probabilidad de cada tipo PPTLS. Siempre suma 1. */
export type Distribucion = Record<TipoPPTLS, number>;

/** Nombre de cada predictor disponible. */
export type NombrePredictor =
  | 'frecuencia'
  | 'reaccion'
  | 'transicion'
  | 'anti-cpu';

/** Distribución uniforme (1/5 a cada tipo). */
export function distribucionUniforme(): Distribucion {
  return { piedra: 0.2, papel: 0.2, tijera: 0.2, lagarto: 0.2, spock: 0.2 };
}

/** Distribución con todos los pesos en 0, para acumular. */
function distribucionVacia(): Distribucion {
  return { piedra: 0, papel: 0, tijera: 0, lagarto: 0, spock: 0 };
}

/** Normaliza los pesos para que sumen 1. Si todos son 0, devuelve la uniforme. */
export function normalizar(pesos: Distribucion): Distribucion {
  let total = 0;
  for (const tipo of PPTLS_TIPOS) total += Math.max(0, pesos[tipo]);
  if (total <= 0) return distribucionUniforme();
  const salida = distribucionVacia();
  for (const tipo of PPTLS_TIPOS) salida[tipo] = Math.max(0, pesos[tipo]) / total;
  return salida;
}

/** Mezcla dos distribuciones: (1 − peso) × a + peso × b. */
export function mezclar(a: Distribucion, b: Distribucion, peso: number): Distribucion {
  const salida = distribucionVacia();
  for (const tipo of PPTLS_TIPOS) salida[tipo] = (1 - peso) * a[tipo] + peso * b[tipo];
  return normalizar(salida);
}

/** Tipos que vencen al tipo dado (siempre son 2 en PPTLS). */
export function tiposQueVencenA(tipo: TipoPPTLS): TipoPPTLS[] {
  return PPTLS_TIPOS.filter((otro) => ganaPPTLS(otro, tipo));
}

/** Tipo más probable de una distribución (en empate, el primero de PPTLS_TIPOS). */
export function tipoMasProbable(dist: Distribucion): TipoPPTLS {
  let mejor: TipoPPTLS = PPTLS_TIPOS[0];
  for (const tipo of PPTLS_TIPOS) if (dist[tipo] > dist[mejor]) mejor = tipo;
  return mejor;
}

/**
 * Frecuencia con memoria: cuenta los tipos que usó el jugador. Los turnos
 * recientes pesan más (`memoria` en (0, 1]: 1 = todos pesan igual).
 *
 * `tipoAveJugador` agrega un sesgo inicial hacia el tipo del ave del jugador:
 * su movimiento de ese tipo tiene STAB, así que es más probable que lo use.
 */
export function predecirFrecuencia(
  historial: readonly EntradaHistorial[],
  memoria = 0.85,
  tipoAveJugador: TipoPPTLS | null = null,
): Distribucion {
  const pesos = distribucionVacia();
  for (const tipo of PPTLS_TIPOS) pesos[tipo] = 1; // prior de Laplace
  if (tipoAveJugador) pesos[tipoAveJugador] += 0.75;

  let factor = 1;
  for (let i = historial.length - 1; i >= 0; i--) {
    pesos[historial[i].movJugador.tipo] += factor * 2;
    factor *= memoria;
  }
  return normalizar(pesos);
}

/**
 * Reacción al último turno, según patrones típicos de jugadores humanos:
 * - Si el jugador **ganó**, tiende a repetir el mismo tipo («ganar y quedarse»).
 * - Si **perdió**, tiende a cambiar a un tipo que venza al último del CPU.
 * - Si **empató**, tiende a cambiar a un tipo que venza al que empató.
 * Sin historial devuelve la uniforme.
 */
export function predecirReaccion(historial: readonly EntradaHistorial[]): Distribucion {
  if (historial.length === 0) return distribucionUniforme();
  const ultima = historial[historial.length - 1];
  const tipoJugador = ultima.movJugador.tipo;
  const tipoCpu = ultima.movCpu.tipo;

  const pesos = distribucionVacia();
  for (const tipo of PPTLS_TIPOS) pesos[tipo] = 0.35; // resto del azar

  if (ultima.resultado === 'jugador') {
    pesos[tipoJugador] += 2.2;
    for (const tipo of tiposQueVencenA(tipoCpu)) pesos[tipo] += 0.4;
  } else if (ultima.resultado === 'cpu') {
    for (const tipo of tiposQueVencenA(tipoCpu)) pesos[tipo] += 1.3;
    pesos[tipoJugador] += 0.2;
  } else {
    for (const tipo of tiposQueVencenA(tipoCpu)) pesos[tipo] += 1.0;
    pesos[tipoJugador] += 0.6;
  }
  return normalizar(pesos);
}

/**
 * Transiciones (cadena de Markov de orden 1): qué tipo usó el jugador después
 * de usar el mismo tipo que en su último turno. Detecta rotaciones y secuencias
 * fijas, como recorrer los movimientos siempre en el mismo orden.
 */
export function predecirTransicion(
  historial: readonly EntradaHistorial[],
  memoria = 0.9,
): Distribucion {
  if (historial.length < 2) return distribucionUniforme();
  const ultimo = historial[historial.length - 1].movJugador.tipo;

  const pesos = distribucionVacia();
  for (const tipo of PPTLS_TIPOS) pesos[tipo] = 0.4;

  let factor = 1;
  for (let i = historial.length - 1; i >= 1; i--) {
    if (historial[i - 1].movJugador.tipo === ultimo) {
      pesos[historial[i].movJugador.tipo] += factor * 2;
    }
    factor *= memoria;
  }
  return normalizar(pesos);
}

/**
 * Jugador que estudia al CPU: supone que el jugador espera que el CPU repita su
 * tipo más frecuente y elige un tipo que lo venza. Sirve contra jugadores que
 * intentan «leer» al bot.
 */
export function predecirAntiCpu(
  historial: readonly EntradaHistorial[],
  memoria = 0.8,
): Distribucion {
  if (historial.length === 0) return distribucionUniforme();
  const usoCpu = distribucionVacia();
  let factor = 1;
  for (let i = historial.length - 1; i >= 0; i--) {
    usoCpu[historial[i].movCpu.tipo] += factor;
    factor *= memoria;
  }
  const favoritoCpu = tipoMasProbable(usoCpu);

  const pesos = distribucionVacia();
  for (const tipo of PPTLS_TIPOS) pesos[tipo] = 0.3;
  for (const tipo of tiposQueVencenA(favoritoCpu)) pesos[tipo] += 1.2;
  return normalizar(pesos);
}

/** Predice con un predictor concreto. */
export function predecirCon(
  nombre: NombrePredictor,
  historial: readonly EntradaHistorial[],
  memoria: number,
  tipoAveJugador: TipoPPTLS | null,
): Distribucion {
  switch (nombre) {
    case 'frecuencia':
      return predecirFrecuencia(historial, memoria, tipoAveJugador);
    case 'reaccion':
      return predecirReaccion(historial);
    case 'transicion':
      return predecirTransicion(historial, memoria);
    case 'anti-cpu':
      return predecirAntiCpu(historial, memoria);
  }
}

/** Resultado de `predecirConjunto`: la predicción y el peso de cada predictor. */
export interface PrediccionConjunto {
  distribucion: Distribucion;
  pesos: Record<NombrePredictor, number>;
}

/** Límite del puntaje acumulado de un predictor (evita pesos extremos). */
const PUNTAJE_MAX = 12;

/**
 * Conjunto de predictores con pesos por acierto. Para cada turno pasado, cada
 * predictor «predice» ese turno usando solo los turnos anteriores; su puntaje
 * suma el logaritmo de la probabilidad que le dio al tipo que el jugador usó
 * de verdad, comparado con la uniforme (los turnos recientes pesan más).
 * El peso de cada predictor es proporcional a exp(puntaje).
 *
 * Al principio de la batalla todos pesan igual. Si el jugador cambia de
 * estilo, el decaimiento (`memoria`) deja que el conjunto se adapte.
 */
export function predecirConjunto(
  historial: readonly EntradaHistorial[],
  predictores: readonly NombrePredictor[],
  memoria = 0.85,
  tipoAveJugador: TipoPPTLS | null = null,
): PrediccionConjunto {
  const puntajes = {} as Record<NombrePredictor, number>;
  for (const nombre of predictores) puntajes[nombre] = 0;

  for (let i = 1; i < historial.length; i++) {
    const previo = historial.slice(0, i);
    const real = historial[i].movJugador.tipo;
    const antiguedad = historial.length - 1 - i;
    const factor = Math.pow(memoria, antiguedad);
    for (const nombre of predictores) {
      const p = predecirCon(nombre, previo, memoria, tipoAveJugador)[real];
      puntajes[nombre] += factor * Math.log(Math.max(p, 1e-6) / 0.2);
    }
  }

  const pesos = {} as Record<NombrePredictor, number>;
  let total = 0;
  for (const nombre of predictores) {
    const puntaje = Math.max(-PUNTAJE_MAX, Math.min(PUNTAJE_MAX, puntajes[nombre]));
    pesos[nombre] = Math.exp(puntaje);
    total += pesos[nombre];
  }

  const acumulada = distribucionVacia();
  for (const nombre of predictores) {
    pesos[nombre] /= total;
    const dist = predecirCon(nombre, historial, memoria, tipoAveJugador);
    for (const tipo of PPTLS_TIPOS) acumulada[tipo] += pesos[nombre] * dist[tipo];
  }

  return { distribucion: normalizar(acumulada), pesos };
}

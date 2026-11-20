/**
 * Flujo del juego (paso 3 del plan MVP): máquina de estados
 *   seleccion → batalla → resultado → (reiniciar) → seleccion
 *
 * Módulo puro: no usa la API de TIC-80. `main.ts` dibuja este estado y
 * traduce los botones a estas funciones. Todas devuelven un juego nuevo.
 *
 * Batalla 1v1 (decisión D1 del plan MVP). El jugador elige una de las aves de
 * FICHAS_MVP; la CPU recibe otra al azar.
 */

import { FICHAS_MVP } from '../data/birds';
import { aveActiva, estaBloqueado, inicializarBatalla } from '../battle/state';
import { resolverTurno } from '../battle/turn';
import { elegirMovimientoCpu } from '../battle/cpu';
import {
  CONFIG_BASE,
  type AveFicha,
  type ConfigBatalla,
  type EstadoBatalla,
  type Rng,
} from '../battle/types';

export type Pantalla = 'seleccion' | 'batalla' | 'resultado';

export interface Juego {
  pantalla: Pantalla;
  /** Índice del ave resaltada en la pantalla de selección. */
  cursorAve: number;
  /** Índice del movimiento resaltado en la batalla (0–3). */
  cursorMov: number;
  fichaJugador: AveFicha | null;
  estado: EstadoBatalla | null;
  /** Mensaje principal del último turno o aviso. */
  mensaje: string;
  /** Eventos del último turno (pasivas, debilitamientos, fin). */
  eventos: string[];
  /** Ganador de la batalla, cuando la pantalla es 'resultado'. */
  resultado: 'jugador' | 'cpu' | 'empate' | null;
}

/** Configuración del ejecutable mínimo: 1v1 (D1). */
export const CONFIG_1V1: ConfigBatalla = { ...CONFIG_BASE, modo: '1v1' };

export function nuevoJuego(): Juego {
  return {
    pantalla: 'seleccion',
    cursorAve: 0,
    cursorMov: 0,
    fichaJugador: null,
    estado: null,
    mensaje: '',
    eventos: [],
    resultado: null,
  };
}

/** Mueve el cursor de la selección de aves, con vuelta al final o al inicio. */
export function moverSeleccion(j: Juego, delta: number): Juego {
  if (j.pantalla !== 'seleccion') return j;
  const n = FICHAS_MVP.length;
  return { ...j, cursorAve: (((j.cursorAve + delta) % n) + n) % n };
}

/** Confirma el ave elegida: crea la batalla 1v1 con la CPU. */
export function confirmarAve(j: Juego, rng: Rng): Juego {
  if (j.pantalla !== 'seleccion') return j;
  const ficha = FICHAS_MVP[j.cursorAve];
  const fichaCpu = FICHAS_MVP[Math.floor(rng() * FICHAS_MVP.length)];
  const estado = inicializarBatalla([ficha], [fichaCpu], rng, CONFIG_1V1);
  return {
    ...j,
    pantalla: 'batalla',
    fichaJugador: ficha,
    estado,
    cursorMov: 0,
    mensaje: 'Elige un movimiento',
    eventos: [],
    resultado: null,
  };
}

/** Mueve el cursor entre los 4 movimientos activos del ave del jugador. */
export function moverMovimiento(j: Juego, delta: number): Juego {
  if (j.pantalla !== 'batalla' || !j.estado) return j;
  const n = aveActiva(j.estado.jugador).movimientos.length;
  return { ...j, cursorMov: (((j.cursorMov + delta) % n) + n) % n };
}

/**
 * Usa el movimiento resaltado. Si está bloqueado por MP, no hay turno y se avisa.
 * Si no, la CPU elige, se resuelve el turno y la batalla puede terminar.
 */
export function usarMovimiento(j: Juego, rng: Rng): Juego {
  if (j.pantalla !== 'batalla' || !j.estado) return j;
  const ave = aveActiva(j.estado.jugador);
  const mov = ave.movimientos[j.cursorMov];
  if (estaBloqueado(mov, ave)) {
    return {
      ...j,
      mensaje: `MP insuficiente para ${mov.nombre} (coste ${mov.costeMp}, MP ${ave.mpActual})`,
      eventos: [],
    };
  }
  const movCpu = elegirMovimientoCpu(j.estado, rng);
  if (movCpu === null) {
    // No debería pasar: tras cada turno el motor deja al ave activa con algún movimiento usable.
    return { ...j, mensaje: 'Error: la CPU no tiene movimientos usables', eventos: [] };
  }
  const { estado, entrada } = resolverTurno(j.estado, mov, movCpu, rng);
  const terminada = estado.terminada;
  return {
    ...j,
    estado,
    mensaje: entrada.mensaje,
    eventos: entrada.eventos,
    pantalla: terminada ? 'resultado' : 'batalla',
    resultado: terminada ? estado.ganador : null,
  };
}

/**
 * Rendición manual (RF-015). El motor no tiene una función de rendición, así que
 * la batalla termina aquí con victoria de la CPU. Pendiente de mover al motor en el paso 6.
 */
export function rendirse(j: Juego): Juego {
  if (j.pantalla !== 'batalla') return j;
  return {
    ...j,
    pantalla: 'resultado',
    resultado: 'cpu',
    mensaje: 'Te rindes. Gana la CPU.',
    eventos: [],
  };
}

/** Vuelve a la selección, conservando el ave resaltada. */
export function reiniciar(j: Juego): Juego {
  if (j.pantalla !== 'resultado') return j;
  return { ...nuevoJuego(), cursorAve: j.cursorAve };
}

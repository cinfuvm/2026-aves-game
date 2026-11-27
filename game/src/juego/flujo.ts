/**
 * Flujo del juego (paso 3 del plan MVP): máquina de estados
 *   seleccion → batalla → revelacion → (confirmar) → batalla | resultado
 *   resultado → (reiniciar) → seleccion
 *
 * En «revelacion» se muestran los movimientos de ambas aves antes de resolver
 * el turno (daño incluido). La CPU elige al pasar a «revelacion»; el turno no
 * se resuelve hasta confirmar, así que no se paga MP antes.
 *
 * Módulo puro: no usa la API de TIC-80. `main.ts` dibuja este estado y
 * traduce los botones a estas funciones. Todas devuelven un juego nuevo.
 *
 * Batalla 1v1 (decisión D1 del plan MVP). El jugador elige una de las aves de
 * FICHAS_MVP; la CPU recibe otra al azar. Mientras no exista la torre, la CPU
 * juega con el bot cuyo tipo favorito coincide con el tipo de su ave
 * (Enemigos 3 a 5 para las aves del MVP; ver game/src/data/bots.ts).
 */

import { FICHAS_MVP } from '../data/birds';
import { botPorTipo, type BotCpu } from '../data/bots';
import { aveActiva, estaBloqueado, inicializarBatalla } from '../battle/state';
import { resolverTurno } from '../battle/turn';
import { elegirMovimientoCpu } from '../battle/cpu';
import { rendirAveActiva } from '../battle/rendicion';
import {
  CONFIG_BASE,
  type AveFicha,
  type ConfigBatalla,
  type EntradaHistorial,
  type EstadoBatalla,
  type MovimientoActivo,
  type Rng,
} from '../battle/types';

export type Pantalla = 'seleccion' | 'batalla' | 'revelacion' | 'resultado';

export interface Juego {
  pantalla: Pantalla;
  /** Índice del ave resaltada en la pantalla de selección. */
  cursorAve: number;
  /** Índice del movimiento resaltado en la batalla (0–3). */
  cursorMov: number;
  fichaJugador: AveFicha | null;
  /** Bot que controla a la CPU en la batalla actual (null fuera de batalla). */
  bot: BotCpu | null;
  estado: EstadoBatalla | null;
  /** Mensaje principal del último turno o aviso. */
  mensaje: string;
  /** Eventos del último turno (pasivas, debilitamientos, fin). */
  eventos: string[];
  /** Ganador de la batalla, cuando la pantalla es 'resultado'. */
  resultado: 'jugador' | 'cpu' | 'empate' | null;
  /** Movimiento elegido por el jugador, mientras la pantalla es 'revelacion'. */
  movJugador: MovimientoActivo | null;
  /** Movimiento elegido por la CPU, mientras la pantalla es 'revelacion'. */
  movCpu: MovimientoActivo | null;
  /**
   * Resultado del turno revelado (daño y mensaje). Es null hasta la primera
   * confirmación; después se muestra en la misma pantalla de revelación.
   */
  entradaTurno: EntradaHistorial | null;
}

/** Configuración del ejecutable mínimo: 1v1 (D1). */
export const CONFIG_1V1: ConfigBatalla = { ...CONFIG_BASE, modo: '1v1' };

export function nuevoJuego(): Juego {
  return {
    pantalla: 'seleccion',
    cursorAve: 0,
    cursorMov: 0,
    fichaJugador: null,
    bot: null,
    estado: null,
    mensaje: '',
    eventos: [],
    resultado: null,
    movJugador: null,
    movCpu: null,
    entradaTurno: null,
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
    bot: botPorTipo(fichaCpu.tipo),
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
  const movCpu = elegirMovimientoCpu(j.estado, rng, j.bot?.perfil);
  if (movCpu === null) {
    // No debería pasar: tras cada turno el motor deja al ave activa con algún movimiento usable.
    return { ...j, mensaje: 'Error: la CPU no tiene movimientos usables', eventos: [] };
  }
  // Solo se muestran las elecciones; el daño se calcula al confirmar.
  return {
    ...j,
    pantalla: 'revelacion',
    movJugador: mov,
    movCpu,
    entradaTurno: null,
    mensaje: '',
    eventos: [],
  };
}

/**
 * Confirmación de la pantalla de revelación, en dos pasos:
 * 1. Resuelve el turno con el motor y muestra el daño en la misma pantalla.
 * 2. Al confirmar de nuevo, pasa a batalla o a resultado si la batalla terminó.
 */
export function confirmarTurno(j: Juego, rng: Rng): Juego {
  if (j.pantalla !== 'revelacion' || !j.estado || !j.movJugador || !j.movCpu) return j;

  if (j.entradaTurno) {
    const terminada = j.estado.terminada;
    return {
      ...j,
      pantalla: terminada ? 'resultado' : 'batalla',
      resultado: terminada ? j.estado.ganador : null,
      movJugador: null,
      movCpu: null,
      entradaTurno: null,
    };
  }

  const { estado, entrada } = resolverTurno(j.estado, j.movJugador, j.movCpu, rng);
  return {
    ...j,
    estado,
    mensaje: entrada.mensaje,
    eventos: entrada.eventos,
    entradaTurno: entrada,
  };
}

/**
 * Rendición manual del ave del jugador (RF-015). La resuelve el motor
 * (`rendirAveActiva`). Con una sola ave por equipo (1v1), la batalla termina.
 */
export function rendirse(j: Juego): Juego {
  if (j.pantalla !== 'batalla' || !j.estado) return j;
  const { estado, evento } = rendirAveActiva(j.estado, 'jugador');
  const terminada = estado.terminada;
  return {
    ...j,
    estado,
    pantalla: terminada ? 'resultado' : 'batalla',
    resultado: terminada ? estado.ganador : null,
    mensaje: terminada
      ? `Te rindes. Gana ${estado.ganador === 'cpu' ? 'la CPU' : 'el jugador'}.`
      : `${evento}. Entra ${aveActiva(estado.jugador).nombre}.`,
    eventos: [evento],
  };
}

/** Vuelve a la selección, conservando el ave resaltada. */
export function reiniciar(j: Juego): Juego {
  if (j.pantalla !== 'resultado') return j;
  return { ...nuevoJuego(), cursorAve: j.cursorAve };
}

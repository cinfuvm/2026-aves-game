/**
 * Flujo del juego: máquina de estados
 *   titulo → menu_torre → seleccion → batalla → revelacion → batalla | resultado
 *   resultado → (reiniciar) → seleccion
 *
 * Desde la fase P1 de la beta, el juego arranca en «titulo» (Continuar / Nuevo
 * / Borrar guardado con confirmación, D-B). El título, el menú de torre y el
 * modal de borrado son solo navegación de interfaz: la persistencia vive en
 * `guardado.ts`; los bots y sus datos dependen de Lógica, así que aquí se
 * modela el progreso mínimo (los equipos y niveles de bot se conectan luego).
 *
 * En «revelacion» se muestran los movimientos de ambas aves antes de resolver
 * el turno (daño incluido). La CPU elige al pasar a «revelacion»; el turno no
 * se resuelve hasta confirmar, así que no se paga MP antes.
 *
 * Módulo puro: no usa la API de TIC-80. `main.ts` dibuja este estado y
 * traduce los botones a estas funciones. Todas devuelven un juego nuevo.
 *
 * Batalla 1v1 (decisión D1 del plan MVP). El jugador elige una de las aves de
 * FICHAS_MVP; la CPU recibe otra al azar. El 3v3 llega en fases posteriores.
 */

import { CATALOGO_AVES, FICHAS_MVP } from '../data/birds';
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
import { type Progreso, progresoVacio, registrarVictoria, TOTAL_BOTS } from './guardado';
import {
  alternarAve as alternarAveSeleccion,
  puedeConfirmar,
  seleccionVacia,
  fichasElegidas,
  TAMANO_EQUIPO,
  type SeleccionEquipo,
} from './seleccion';
import { equipoEnemigo } from './enemigos';

export type Pantalla =
  | 'titulo'
  | 'menu_torre'
  | 'confirmar_borrado'
  | 'seleccion'
  | 'batalla'
  | 'revelacion'
  | 'resultado';

export interface Juego {
  pantalla: Pantalla;
  /** Opción resaltada en el título (0 continuar, 1 nuevo, 2 borrar). */
  opcionTitulo: number;
  /** Progreso persistido (torre, aves, silencio). */
  progreso: Progreso;
    /** Bot resaltado en el menú de torre. */
  cursorTorre: number;
  /** Bot (0-based) que se está enfrentando; null fuera de la torre. */
  botActual: number | null;
  /** Opción resaltada en el modal de borrado (0 = sí, 1 = no). */
  opcionBorrado: number;
  /** Índice del ave resaltada en la pantalla de selección. */
  cursorAve: number;
  /** Selección de equipo 3v3 en curso (aves elegidas y orden). */
  seleccion: SeleccionEquipo;
  /** Vistazo del equipo enemigo del bot actual (solo lectura). */
  equipoEnemigo: AveFicha[];
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

/** Configuración del ejecutable: batalla 3v3 real con relevos (CONFIG_BASE.modo = '3v3'). */
export const CONFIG_3V3: ConfigBatalla = { ...CONFIG_BASE, modo: '3v3' };

/**
 * Crea el estado inicial del juego.
 * @param progreso progreso leído del guardado (o vacío si no hay guardado).
 */
export function nuevoJuego(progreso: Progreso = progresoVacio()): Juego {
  return {
    pantalla: 'titulo',
    opcionTitulo: progreso.combatesGanados.length > 0 ? 0 : 1,
        progreso,
    cursorTorre: 0,
    botActual: null,
    opcionBorrado: 1,
    cursorAve: 0,
    seleccion: seleccionVacia(),
    equipoEnemigo: [],
    cursorMov: 0,
    fichaJugador: null,
    estado: null,
    mensaje: '',
    eventos: [],
    resultado: null,
    movJugador: null,
    movCpu: null,
    entradaTurno: null,
  };
}

/** Indica si el progreso permite «Continuar» (hay algún combate ganado). */
export function puedeContinuar(progreso: Progreso): boolean {
  return progreso.combatesGanados.length > 0;
}

// ---------- Título ----------

/** Mueve la opción resaltada del título, con vuelta. */
export function moverOpcionTitulo(j: Juego, delta: number): Juego {
  if (j.pantalla !== 'titulo') return j;
  const total = 3;
  return { ...j, opcionTitulo: (((j.opcionTitulo + delta) % total) + total) % total };
}

/**
 * Confirma la opción resaltada del título.
 * - continuar (0): solo si hay guardado; va al menú de torre.
 * - nuevo (1): reinicia el progreso y va al menú de torre.
 * - borrar (2): abre el modal de confirmación.
 */
export function confirmarOpcionTitulo(j: Juego): Juego {
  if (j.pantalla !== 'titulo') return j;
  if (j.opcionTitulo === 0) {
    if (!puedeContinuar(j.progreso)) return j;
    return { ...j, pantalla: 'menu_torre', cursorTorre: 0, mensaje: '' };
  }
  if (j.opcionTitulo === 1) {
    return {
      ...j,
      progreso: progresoVacio(),
      pantalla: 'menu_torre',
      cursorTorre: 0,
      mensaje: '',
    };
  }
  return { ...j, pantalla: 'confirmar_borrado', opcionBorrado: 1 };
}

// ---------- Confirmación de borrado ----------

/** Alterna sí/no del modal de borrado. */
export function moverOpcionBorrado(j: Juego, delta: number): Juego {
  if (j.pantalla !== 'confirmar_borrado') return j;
  return { ...j, opcionBorrado: (((j.opcionBorrado + delta) % 2) + 2) % 2 };
}

/**
 * Confirma el borrado del guardado.
 * @param almacenBorrar efecto lateral inyectado (borra el almacén persistente).
 * Con la opción «no» (1) vuelve al título sin borrar.
 */
export function confirmarBorrado(j: Juego, almacenBorrar?: () => void): Juego {
  if (j.pantalla !== 'confirmar_borrado') return j;
  if (j.opcionBorrado !== 0) {
    return { ...j, pantalla: 'titulo' };
  }
  if (almacenBorrar) almacenBorrar();
  return { ...j, progreso: progresoVacio(), pantalla: 'titulo', opcionTitulo: 1 };
}

/** Cancela el modal de borrado. */
export function cancelarBorrado(j: Juego): Juego {
  if (j.pantalla !== 'confirmar_borrado') return j;
  return { ...j, pantalla: 'titulo' };
}

// ---------- Menú de torre ----------

/** Cantidad de bots visibles: el 8 aparece al vencer al 7 (D-E). */
export function botsVisibles(progreso: Progreso): number {
  return progreso.combatesGanados.includes(TOTAL_BOTS - 2) ? TOTAL_BOTS : TOTAL_BOTS - 1;
}

/** Indica si un bot (0-based) está disponible: ya ganado, o es el siguiente. */
export function botDisponible(progreso: Progreso, indice: number): boolean {
  if (progreso.combatesGanados.includes(indice)) return true;
  return indice === progreso.combatesGanados.length;
}

/** Mueve el cursor del menú de torre entre los bots visibles. */
export function moverTorre(j: Juego, delta: number): Juego {
  if (j.pantalla !== 'menu_torre') return j;
  const n = botsVisibles(j.progreso);
  return { ...j, cursorTorre: (((j.cursorTorre + delta) % n) + n) % n };
}

/** Entra a la selección de equipo desde la torre, si el bot está disponible. */
export function entrarCombate(j: Juego): Juego {
  if (j.pantalla !== 'menu_torre') return j;
  if (!botDisponible(j.progreso, j.cursorTorre)) return j;
    return {
    ...j,
    pantalla: 'seleccion',
    botActual: j.cursorTorre,
    cursorAve: 0,
    seleccion: seleccionVacia(),
    equipoEnemigo: equipoEnemigo(j.cursorTorre),
    mensaje: '',
  };
}

/** Vuelve al título desde el menú de torre. */
export function volverAlTitulo(j: Juego): Juego {
  if (j.pantalla !== 'menu_torre') return j;
  return {
    ...j,
    pantalla: 'titulo',
    opcionTitulo: puedeContinuar(j.progreso) ? 0 : 1,
  };
}

/** Mueve el cursor de la selección de aves, con vuelta al final o al inicio. */
export function moverSeleccion(j: Juego, delta: number): Juego {
  if (j.pantalla !== 'seleccion') return j;
  const n = CATALOGO_AVES.length;
  return { ...j, cursorAve: (((j.cursorAve + delta) % n) + n) % n };
}

/** Ancho de la rejilla del catálogo de selección (5 columnas). */
const COLUMNAS_CATALOGO = 5;

/**
 * Mueve el cursor del catálogo en rejilla (5x2). `dFila` ±1 sube/baja dentro
 * de la misma columna; `dCol` ±1 mueve a izquierda/derecha sin salir de la fila.
 */
export function moverSeleccionCuadricula(j: Juego, dFila: number, dCol: number): Juego {
  if (j.pantalla !== 'seleccion') return j;
  const n = CATALOGO_AVES.length;
  let idx = j.cursorAve;
  if (dFila !== 0) {
    const destino = idx + dFila * COLUMNAS_CATALOGO;
    if (destino >= 0 && destino < n) idx = destino;
  }
  if (dCol !== 0) {
    const filaBase = idx - (idx % COLUMNAS_CATALOGO);
    const destino = idx + dCol;
    if (Math.floor(destino / COLUMNAS_CATALOGO) === Math.floor(filaBase / COLUMNAS_CATALOGO)) {
      idx = destino;
    }
  }
  return { ...j, cursorAve: idx };
}

/** Alterna (añade/quita) el ave resaltada del equipo, respetando el límite de 3. */
export function alternarAveDelCursor(j: Juego): Juego {
  if (j.pantalla !== 'seleccion') return j;
    const ficha = CATALOGO_AVES[j.cursorAve];
  const seleccion = alternarAveSeleccion(j.seleccion, ficha.id);
  return { ...j, seleccion };
}

/** Indica si el equipo seleccionado ya se puede confirmar (3 aves). */
export function puedeConfirmarEquipo(j: Juego): boolean {
  return j.pantalla === 'seleccion' && puedeConfirmar(CATALOGO_AVES, j.seleccion);
}

/** Vuelve a la torre desde la selección (descarta la selección en curso). */
export function volverATorre(j: Juego): Juego {
  if (j.pantalla !== 'seleccion') return j;
  return { ...j, pantalla: 'menu_torre', seleccion: seleccionVacia(), equipoEnemigo: [] };
}

/**
 * Confirma el equipo 3v3 y crea la batalla 3v3 real (relevos incluidos).
 *
 * El equipo del jugador son las 3 aves elegidas (en orden). El rival es el
 * equipo enemigo del bot actual (`equipoEnemigo`, 3 aves). El motor resuelve
 * relevos, salidas y fin de batalla por equipo.
 */
export function confirmarEquipo(j: Juego, rng: Rng): Juego {
  if (j.pantalla !== 'seleccion') return j;
    const elegidas = fichasElegidas(CATALOGO_AVES, j.seleccion);
  if (elegidas.length !== TAMANO_EQUIPO) return j;
  const rivales =
    j.equipoEnemigo.length === TAMANO_EQUIPO
      ? j.equipoEnemigo
      : FICHAS_MVP.slice(0, TAMANO_EQUIPO);
  const estado = inicializarBatalla(elegidas, rivales, rng, CONFIG_3V3);
  return {
    ...j,
    pantalla: 'batalla',
    fichaJugador: elegidas[0],
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
 * Mueve el cursor de movimientos en una cuadrícula 2x2 (diseño de batalla).
 * `dFila`/`dCol` en {-1, 0, 1}: fila ±1 salta entre 0<->2 y 1<->3 (2 posiciones);
 * columna ±1 alterna dentro de la fila (0<->1 y 2<->3). No sale de rango.
 */
export function moverMovimientoCuadricula(j: Juego, dFila: number, dCol: number): Juego {
  if (j.pantalla !== 'batalla' || !j.estado) return j;
  const n = Math.min(4, aveActiva(j.estado.jugador).movimientos.length);
  let idx = j.cursorMov;
  if (dFila !== 0) {
    const destino = idx + dFila * 2;
    if (destino >= 0 && destino < n) idx = destino;
  }
  if (dCol !== 0) {
    const filaBase = idx - (idx % 2);
    const destino = idx + dCol;
    if (Math.floor(destino / 2) === Math.floor(filaBase / 2) && destino >= 0 && destino < n) {
      idx = destino;
    }
  }
  return { ...j, cursorMov: idx };
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
 * Construye el estado al terminar una batalla: pantalla 'resultado', ganador y,
 * si gana el jugador, registra el bot vencido en el progreso (P3, idempotente).
 * No cobra nada si el bot no está en juego (partida fuera de la torre).
 */
function irAResultado(j: Juego, estado: EstadoBatalla): Juego {
  const ganoJugador = estado.ganador === 'jugador';
  const progreso =
    ganoJugador && j.botActual !== null
      ? registrarVictoria(j.progreso, j.botActual)
      : j.progreso;
  return {
    ...j,
    estado,
    progreso,
    pantalla: 'resultado',
    resultado: estado.ganador,
    movJugador: null,
    movCpu: null,
    entradaTurno: null,
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
    if (j.estado.terminada) return irAResultado(j, j.estado);
    return {
      ...j,
      pantalla: 'batalla',
      resultado: null,
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
  if (estado.terminada) {
    return {
      ...irAResultado(j, estado),
      mensaje: `Te rindes. Gana ${estado.ganador === 'cpu' ? 'la CPU' : 'el jugador'}.`,
      eventos: [evento],
    };
  }
  return {
    ...j,
    estado,
    pantalla: 'batalla',
    resultado: null,
    mensaje: `${evento}. Entra ${aveActiva(estado.jugador).nombre}.`,
    eventos: [evento],
  };
}

/**
 * Vuelve al menú de torre tras un resultado, conservando el progreso acumulado
 * (torre, aves, silencio). El jugador elige de nuevo el combate y su equipo.
 */
export function reiniciar(j: Juego): Juego {
  if (j.pantalla !== 'resultado') return j;
  return { ...nuevoJuego(j.progreso), pantalla: 'menu_torre' };
}

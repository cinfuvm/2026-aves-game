/**
 * Estado de batalla: fichas, inicialización, equipos, relevo y fin.
 * Fuente: plan_motor_c.md (pasos 5 y 6) y plan_desarrollo.md (D-C, D-D).
 *
 * Responsabilidades:
 * - Validar fichas: 4 movimientos fijos, uno de ellos característico y del tipo del ave.
 * - Dar a cada movimiento un coste de MP aleatorio dentro de `costeMpRango`.
 * - Inicializar HP y MP al entrar en combate. La vida depende del nivel del combate:
 *   HP = rango base + vidaPorNivel × nivel (C9).
 * - Manejar el relevo de aves y evaluar el fin de la batalla.
 *
 * Ninguna función muta sus argumentos; las estructuras se construyen nuevas.
 */

import { enteroAleatorio } from './rng';
import {
  CONFIG_BASE,
  type AveCombate,
  type AveFicha,
  type ConfigBatalla,
  type Equipo,
  type EstadoBatalla,
  type MovimientoActivo,
  type Rng,
} from './types';

/** Movimientos activos de cada ave: 1 característico + 3 predeterminados (D-C). */
export const MOVIMIENTOS_POR_AVE = 4;

/** Errores de validación de una ficha (lista vacía = ficha válida). */
export function validarFicha(ficha: AveFicha): string[] {
  const errores: string[] = [];

  if (ficha.movimientos.length !== MOVIMIENTOS_POR_AVE) {
    errores.push(
      `debe tener exactamente ${MOVIMIENTOS_POR_AVE} movimientos y tiene ${ficha.movimientos.length}`,
    );
  }

  const caracteristicos = ficha.movimientos.filter((mov) => mov.caracteristico === true);
  if (caracteristicos.length !== 1) {
    errores.push(
      `debe tener exactamente 1 movimiento característico y tiene ${caracteristicos.length}`,
    );
  } else if (caracteristicos[0].tipo !== ficha.tipo) {
    errores.push(
      `el movimiento característico debe ser del tipo propio del ave (${ficha.tipo})`,
    );
  }

  const ids = new Set<string>();
  for (const mov of ficha.movimientos) {
    if (ids.has(mov.id)) {
      errores.push(`id de movimiento duplicado: ${mov.id}`);
      break;
    }
    ids.add(mov.id);
  }

  return errores;
}

/**
 * Movimientos activos de un ave al entrar en combate. Son fijos (los de la ficha):
 * cada uno recibe un coste de MP aleatorio dentro de `costeMpRango`.
 *
 * Lanza un error si la ficha no supera `validarFicha`.
 */
export function seleccionarMovimientos(
  ficha: AveFicha,
  rng: Rng,
  config: ConfigBatalla = CONFIG_BASE,
): MovimientoActivo[] {
  const errores = validarFicha(ficha);
  if (errores.length > 0) {
    throw new Error(`Ficha rechazada (${ficha.id}): ${errores.join('; ')}`);
  }

  return ficha.movimientos.map((mov) => ({
    id: mov.id,
    nombre: mov.nombre,
    tipo: mov.tipo,
    costeMp: enteroAleatorio(rng, config.costeMpRango[0], config.costeMpRango[1]),
  }));
}

/**
 * Inicializa un ave al entrar en combate:
 * - HP máx aleatorio en el rango base (pasiva Piedra: `hpMaxRangoPiedra`),
 *   más `vidaPorNivel × nivel` (C9).
 * - HP actual igual al HP máx.
 * - MP compartido igual a `mpInicial`.
 * - 4 movimientos activos con coste de MP aleatorio.
 */
export function inicializarAve(
  ficha: AveFicha,
  rng: Rng,
  config: ConfigBatalla = CONFIG_BASE,
  nivel = 0,
): AveCombate {
  const [min, max] =
    ficha.tipo === 'piedra' ? config.hpMaxRangoPiedra : config.hpMaxRango;
  const hpMax = enteroAleatorio(rng, min, max) + config.vidaPorNivel * nivel;

  return {
    id: ficha.id,
    nombre: ficha.nombre,
    tipo: ficha.tipo,
    hpMax,
    hpActual: hpMax,
    mpMax: config.mpInicial,
    mpActual: config.mpInicial,
    movimientos: seleccionarMovimientos(ficha, rng, config),
    estado: 'activa',
  };
}

/** Cantidad de aves por equipo según el modo. */
export function avesPorModo(modo: '1v1' | '3v3'): number {
  return modo === '1v1' ? 1 : 3;
}

/**
 * Inicializa un equipo a partir de fichas, con el nivel del combate de ese bando.
 * Valida la cantidad según el modo. Lanza un error si alguna ficha es inválida
 * o la cantidad no coincide.
 */
export function inicializarEquipo(
  fichas: AveFicha[],
  rng: Rng,
  config: ConfigBatalla = CONFIG_BASE,
  nivel = 0,
): Equipo {
  const esperado = avesPorModo(config.modo);
  if (fichas.length !== esperado) {
    throw new Error(
      `El equipo necesita ${esperado} aves en modo ${config.modo} y recibió ${fichas.length}`,
    );
  }
  return {
    aves: fichas.map((ficha) => inicializarAve(ficha, rng, config, nivel)),
    indiceActiva: 0,
  };
}

/**
 * Crea el estado inicial de una batalla (turno 0, sin historial).
 * El jugador usa `config.nivelJugador` y la CPU `config.nivelCpu` (C9).
 * Valida fichas y tamaños de ambos equipos.
 */
export function inicializarBatalla(
  fichasJugador: AveFicha[],
  fichasCpu: AveFicha[],
  rng: Rng,
  config: ConfigBatalla = CONFIG_BASE,
): EstadoBatalla {
  return {
    jugador: inicializarEquipo(fichasJugador, rng, config, config.nivelJugador),
    cpu: inicializarEquipo(fichasCpu, rng, config, config.nivelCpu),
    config,
    turno: 0,
    historial: [],
    terminada: false,
    ganador: null,
  };
}

/** Ave activa de un equipo. Precondición: el equipo tiene un ave activa. */
export function aveActiva(equipo: Equipo): AveCombate {
  return equipo.aves[equipo.indiceActiva];
}

/** Un movimiento está bloqueado si su coste supera el MP restante del ave. */
export function estaBloqueado(mov: MovimientoActivo, ave: AveCombate): boolean {
  return mov.costeMp > ave.mpActual;
}

/** Movimientos del ave con MP suficiente. */
export function movimientosUsables(ave: AveCombate): MovimientoActivo[] {
  return ave.movimientos.filter((mov) => !estaBloqueado(mov, ave));
}

/** Indica si el ave tiene algún movimiento usable (si no, debe salir del combate). */
export function tieneMovimientoUsable(ave: AveCombate): boolean {
  return movimientosUsables(ave).length > 0;
}

/**
 * Índice de la primera ave en estado 'activa' del equipo, o -1 si no hay.
 * Está pensada para llamarse tras marcar la salida del ave activa anterior:
 * devuelve la siguiente ave del equipo en el orden de selección.
 */
export function siguienteAve(equipo: Equipo): number {
  for (let i = 0; i < equipo.aves.length; i++) {
    if (equipo.aves[i].estado === 'activa') return i;
  }
  return -1;
}

/** Cantidad de aves aún en condiciones de pelear en un equipo. */
export function avesDisponibles(equipo: Equipo): number {
  return equipo.aves.filter((ave) => ave.estado === 'activa').length;
}

/**
 * Evalúa el fin de la batalla según los equipos disponibles:
 * - CPU sin aves y jugador con aves → 'jugador'.
 * - Jugador sin aves y CPU con aves → 'cpu'.
 * - Ambos sin aves → 'empate'.
 * - En otro caso → null (la batalla continúa).
 */
export function evaluarFin(
  estado: EstadoBatalla,
): 'jugador' | 'cpu' | 'empate' | null {
  const jugadorVivo = avesDisponibles(estado.jugador) > 0;
  const cpuVivo = avesDisponibles(estado.cpu) > 0;

  if (jugadorVivo && !cpuVivo) return 'jugador';
  if (!jugadorVivo && cpuVivo) return 'cpu';
  if (!jugadorVivo && !cpuVivo) return 'empate';
  return null;
}

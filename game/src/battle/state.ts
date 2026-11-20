/**
 * Estado de batalla (Parte A): fichas, inicialización, equipos, relevo y fin.
 * Fuente: plan_logica.md (reglas de pelea.md) + docs/modules/prd/pages/arquitectura.adoc.
 *
 * Responsabilidades:
 * - Validar fichas (5 movimientos, al menos uno del tipo propio del ave).
 * - Seleccionar los 4 movimientos activos: 1 garantizado del tipo propio + 3 al azar.
 * - Inicializar HP y MP aleatorios al entrar en combate (MP compartido por ave).
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

/** Errores de validación de una ficha (lista vacía = ficha válida). */
export function validarFicha(ficha: AveFicha): string[] {
  const errores: string[] = [];

  if (ficha.movimientos.length !== 5) {
    errores.push(
      `debe tener exactamente 5 movimientos y tiene ${ficha.movimientos.length}`,
    );
  }

  const tieneMovimientoPropio = ficha.movimientos.some(
    (mov) => mov.tipo === ficha.tipo,
  );
  if (!tieneMovimientoPropio) {
    errores.push(
      `ningún movimiento es del tipo propio del ave (${ficha.tipo})`,
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

/** Mezcla de Fisher–Yates con el rng dado, sin mutar la lista original. */
function mezclar<T>(lista: readonly T[], rng: Rng): T[] {
  const copia = [...lista];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/**
 * Selecciona los 4 movimientos activos de un ave al entrar en combate:
 * - 1 garantizado del tipo propio del ave (al azar entre los propios, si hay varios).
 * - 3 al azar, sin repetición, de los movimientos restantes.
 * - El orden de los 4 se mezcla para variar la interfaz.
 * Cada movimiento recibe un coste de MP aleatorio dentro de `costeMpRango`.
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

  const propios = ficha.movimientos.filter((mov) => mov.tipo === ficha.tipo);
  const garantizado = propios[Math.floor(rng() * propios.length)];

  const resto = ficha.movimientos.filter((mov) => mov !== garantizado);
  const elegidos = mezclar(resto, rng).slice(0, 3);

  const activos = mezclar([garantizado, ...elegidos], rng);

  return activos.map((mov) => ({
    id: mov.id,
    nombre: mov.nombre,
    tipo: mov.tipo,
    costeMp: enteroAleatorio(rng, config.costeMpRango[0], config.costeMpRango[1]),
  }));
}

/**
 * Inicializa un ave al entrar en combate:
 * - HP máx aleatorio (pasiva Piedra: usa `hpMaxRangoPiedra`).
 * - HP actual igual al HP máx.
 * - MP compartido igual a `mpInicial`.
 * - 4 movimientos activos con coste de MP aleatorio.
 */
export function inicializarAve(
  ficha: AveFicha,
  rng: Rng,
  config: ConfigBatalla = CONFIG_BASE,
): AveCombate {
  const [min, max] =
    ficha.tipo === 'piedra' ? config.hpMaxRangoPiedra : config.hpMaxRango;
  const hpMax = enteroAleatorio(rng, min, max);

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
 * Inicializa un equipo a partir de fichas. Valida la cantidad según el modo.
 * Lanza un error si alguna ficha es inválida o la cantidad no coincide.
 */
export function inicializarEquipo(
  fichas: AveFicha[],
  rng: Rng,
  config: ConfigBatalla = CONFIG_BASE,
): Equipo {
  const esperado = avesPorModo(config.modo);
  if (fichas.length !== esperado) {
    throw new Error(
      `El equipo necesita ${esperado} aves en modo ${config.modo} y recibió ${fichas.length}`,
    );
  }
  return {
    aves: fichas.map((ficha) => inicializarAve(ficha, rng, config)),
    indiceActiva: 0,
  };
}

/**
 * Crea el estado inicial de una batalla (turno 0, sin historial).
 * Valida fichas y tamaños de ambos equipos.
 */
export function inicializarBatalla(
  fichasJugador: AveFicha[],
  fichasCpu: AveFicha[],
  rng: Rng,
  config: ConfigBatalla = CONFIG_BASE,
): EstadoBatalla {
  return {
    jugador: inicializarEquipo(fichasJugador, rng, config),
    cpu: inicializarEquipo(fichasCpu, rng, config),
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

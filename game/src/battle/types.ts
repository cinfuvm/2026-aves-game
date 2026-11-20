/**
 * Contrato del motor de batalla (Parte A) — equipo de lógica.
 * Fuente: plan_logica.md (reglas de pelea.md) y docs/modules/prd/pages/arquitectura.adoc.
 *
 * Reglas del contrato:
 * - Ninguna función de este módulo usa la API de TIC-80 (cls, spr, btn, ...).
 * - Todas las funciones de combate reciben un `rng` inyectable (ADR-04)
 *   para pruebas deterministas y modo de depuración.
 * - Las desviaciones respecto al PRD se registran en changes.md (raíz del repo).
 */

/** Tipos PPTLS (provisionales según pelea.md). */
export type TipoPPTLS = 'piedra' | 'papel' | 'tijera' | 'lagarto' | 'spock';

/** Fuente de aleatoriedad inyectable: devuelve un número en [0, 1). */
export type Rng = () => number;

/** Ganador de un intercambio PPTLS entre el movimiento del jugador y el del CPU. */
export type ResultadoPPTLS = 'jugador' | 'cpu' | 'empate';

/** Ficha estática de un movimiento (vive en data/birds). El coste de MP se asigna al entrar en combate. */
export interface MovimientoFicha {
  id: string;
  nombre: string;
  tipo: TipoPPTLS;
}

/**
 * Ficha estática de un ave.
 * Validación (plan_logica.md, parte A): debe existir al menos un movimiento
 * de `movimientos` cuyo tipo sea el tipo propio del ave; si no, la ficha se rechaza.
 */
export interface AveFicha {
  id: string;
  nombre: string;
  /** Tipo propio del ave: define STAB, el movimiento garantizado y la pasiva. */
  tipo: TipoPPTLS;
  /** Exactamente 5 movimientos posibles. */
  movimientos: MovimientoFicha[];
}

/** Movimiento activo en combate: tipo fijo de la ficha y coste de MP aleatorio al entrar en combate. */
export interface MovimientoActivo {
  id: string;
  nombre: string;
  tipo: TipoPPTLS;
  costeMp: number;
}

/**
 * Estado de un ave en combate.
 * El MP es un fondo compartido por el ave (no hay PP por movimiento).
 */
export interface AveCombate {
  id: string;
  nombre: string;
  tipo: TipoPPTLS;
  hpMax: number;
  hpActual: number;
  mpMax: number;
  mpActual: number;
  /** 4 movimientos activos: 1 garantizado del tipo propio + 3 al azar de los 4 restantes. */
  movimientos: MovimientoActivo[];
  estado: 'activa' | 'debilitada' | 'rendida';
}

/** Equipo de aves con índice del ave activa. */
export interface Equipo {
  aves: AveCombate[];
  indiceActiva: number;
}

/**
 * Pasivas por tipo (plan_logica.md):
 * - piedra:  HP máx aleatorio en `hpMaxRangoPiedra` (40–50) en vez del rango base.
 * - tijera:  si gana el intercambio, daño fijo adicional de +5.
 * - papel:   `probCosteCeroPapel` (25 %) de que su movimiento no consuma MP.
 * - lagarto: recupera +3 HP al final del turno, sin superar su HP máx.
 * - spock:   si gana, daño mínimo de 30 % del HP máx del rival.
 *            (Pendiente de resolución el conflicto con "Sin efecto" — ver changes.md D-09.)
 */
export const NOMBRE_PASIVA: Record<TipoPPTLS, string> = {
  piedra: 'HP inicial 40–50',
  tijera: '+5 de daño al ganar',
  papel: '25 % de coste 0',
  lagarto: '+3 HP por turno',
  spock: 'daño mínimo 30 %',
};

/** Configuración de una batalla. */
export interface ConfigBatalla {
  /** 1v1 para la entrega parcial; 3v3 para la entrega final. */
  modo: '1v1' | '3v3';
  /** MP compartido inicial del ave (15 provisional, plan_logica.md). */
  mpInicial: number;
  /** Rango del HP máx aleatorio al entrar en combate. */
  hpMaxRango: [number, number];
  /** Rango del HP máx para aves de tipo piedra (pasiva). */
  hpMaxRangoPiedra: [number, number];
  /** Rango del coste de MP de cada movimiento al entrar en combate. */
  costeMpRango: [number, number];
  /** Probabilidad de que un movimiento de tipo papel no consuma MP (pasiva). */
  probCosteCeroPapel: number;
}

/** Valores base acordados en plan_logica.md. */
export const CONFIG_BASE: ConfigBatalla = {
  modo: '3v3',
  mpInicial: 15,
  hpMaxRango: [20, 50],
  hpMaxRangoPiedra: [40, 50],
  costeMpRango: [1, 5],
  probCosteCeroPapel: 0.25,
};

/** Registro de un turno resuelto, para el historial visual de la Parte B. */
export interface EntradaHistorial {
  /** Número de turno, base 1. */
  turno: number;
  movJugador: MovimientoActivo;
  movCpu: MovimientoActivo;
  resultado: ResultadoPPTLS;
  /** Daño infligido al ave activa del CPU. */
  danoAlCpu: number;
  /** Daño infligido al ave activa del jugador. */
  danoAlJugador: number;
  /** MP realmente consumido por cada bando (tras pasivas como la de Papel). */
  mpGastadoJugador: number;
  mpGastadoCpu: number;
  /** Mensaje principal del turno (PPTLS + efectividad). */
  mensaje: string;
  /** Eventos extra: pasivas, debilitamientos, relevos, fin de batalla. */
  eventos: string[];
}

/** Estado completo de una batalla en curso. */
export interface EstadoBatalla {
  jugador: Equipo;
  cpu: Equipo;
  /** Turno actual, base 1; 0 antes del primer turno. */
  turno: number;
  historial: EntradaHistorial[];
  terminada: boolean;
  ganador: 'jugador' | 'cpu' | 'empate' | null;
}

/** Resultado de resolver un turno: estado nuevo (sin mutar el original) + entrada de historial. */
export interface ResultadoTurno {
  estado: EstadoBatalla;
  entrada: EntradaHistorial;
}

/**
 * Contrato del motor de batalla (Parte A) — equipo de lógica.
 * Fuente: plan_motor_c.md y plan_desarrollo.md (decisiones D-H a D-18), y docs/modules/prd/pages/arquitectura.adoc.
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

/** Clasificación del daño infligido según su magnitud (reglas-batalla.adoc). */
export type ClasificacionEfectividad = 'sin-efecto' | 'efectivo' | 'muy-efectivo';

/**
 * Ficha estática de un movimiento (vive en data/). El coste de MP se asigna al entrar en combate.
 * `caracteristico`: movimiento propio de un ave (no se comparte). Los predeterminados
 * vienen de una pool compartida entre aves (D-C, plan_desarrollo.md).
 */
export interface MovimientoFicha {
  id: string;
  nombre: string;
  tipo: TipoPPTLS;
  caracteristico?: boolean;
}

/**
 * Ficha estática de un ave.
 * Validación (plan_motor_c.md, paso 5): exactamente 4 movimientos fijos, uno de ellos
 * característico y del tipo propio del ave.
 */
export interface AveFicha {
  id: string;
  nombre: string;
  /** Tipo propio del ave: define STAB y el movimiento característico. */
  tipo: TipoPPTLS;
  /** Exactamente 4 movimientos activos: 1 característico + 3 predeterminados. */
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
  /** 4 movimientos activos fijos de la ficha: 1 característico + 3 predeterminados (plan_motor_c.md, paso 5). */
  movimientos: MovimientoActivo[];
  estado: 'activa' | 'debilitada' | 'rendida';
}

/** Equipo de aves con índice del ave activa. */
export interface Equipo {
  aves: AveCombate[];
  indiceActiva: number;
}

/**
 * Pasivas por tipo:
 * - piedra:  HP máx aleatorio en `hpMaxRangoPiedra` (40–50) en vez del rango base.
 * - tijera:  si gana el intercambio, daño fijo adicional de +5.
 * - papel:   `probCosteCeroPapel` (25 %) de que su movimiento no consuma MP.
 * - lagarto: recupera +3 HP al final del turno, sin superar su HP máx.
 * - spock:   sin mínimo de daño (D-K). Si gana, su movimiento no puede fallar (C7).
 */
export const NOMBRE_PASIVA: Record<TipoPPTLS, string> = {
  piedra: 'HP inicial 40–50',
  tijera: '+5 de daño al ganar',
  papel: '25 % de coste 0',
  lagarto: '+3 HP por turno',
  spock: 'no falla si gana',
};

/** Configuración de una batalla. */
export interface ConfigBatalla {
  /** 1v1 para la entrega parcial; 3v3 para la entrega final. */
  modo: '1v1' | '3v3';
  /** MP compartido inicial del ave (20, D-H; antes 15). */
  mpInicial: number;
  /** Rango del HP máx aleatorio al entrar en combate. */
  hpMaxRango: [number, number];
  /** Rango del HP máx para aves de tipo piedra (pasiva). */
  hpMaxRangoPiedra: [number, number];
  /** Rango del coste de MP de cada movimiento al entrar en combate. */
  costeMpRango: [number, number];
  /** Probabilidad de que un movimiento de tipo papel no consuma MP (pasiva). */
  probCosteCeroPapel: number;
  /** HP que recupera un ave de tipo lagarto al final de cada turno (pasiva, con tope en hpMax). */
  regeneracionLagarto: number;
  /** Multiplicador de esfuerzo por punto de coste MP: daño ×(1 + coste × factor). */
  factorEsfuerzo: number;
  /** Multiplicador STAB cuando el tipo del movimiento coincide con el tipo del ave. */
  factorStab: number;
  /** Daño fijo adicional de la pasiva Tijera cuando el ave gana el intercambio. */
  bonusTijera: number;
  /** Fracción mínima del HP máx rival que puede hacer el daño base (C1, plan_motor_c.md). */
  danoBaseMinFrac: number;
  /** Fracción máxima del HP máx rival que puede hacer el daño base (C1, plan_motor_c.md). */
  danoBaseMaxFrac: number;
  /** Probabilidad de que un movimiento que ataca falle: gasta MP y turno, no hace daño (C5). */
  probFallo: number;
  /** Vida extra por nivel del combate: HP máx = rango base + vidaPorNivel × nivel (C9). */
  vidaPorNivel: number;
  /** Nivel del combate para el equipo del jugador (0 = sin bono de vida). */
  nivelJugador: number;
  /** Nivel del combate para el equipo de la CPU (0 = sin bono de vida). */
  nivelCpu: number;
}

/** Valores base de la configuración vigente (plan_motor_c.md). */
export const CONFIG_BASE: ConfigBatalla = {
  modo: '3v3',
  mpInicial: 20,
  hpMaxRango: [30, 50],
  hpMaxRangoPiedra: [40, 50],
  costeMpRango: [1, 3],
  probCosteCeroPapel: 0.25,
  regeneracionLagarto: 3,
  factorEsfuerzo: 0.1,
  factorStab: 1.5,
  bonusTijera: 5,
  danoBaseMinFrac: 0.1,
  danoBaseMaxFrac: 0.5,
  probFallo: 0.1,
  vidaPorNivel: 10,
  nivelJugador: 0,
  nivelCpu: 0,
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
  /** Configuración con la que se creó la batalla (reglas usadas por resolverTurno). */
  config: ConfigBatalla;
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

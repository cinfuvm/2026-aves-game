/**
 * Guardado local del progreso (D-B: `pmem`).
 *
 * La persistencia de TIC-80 se expone con `pmem(index, val)` / `pmem(index)`
 * (ver `game/tic.d.ts`): 256 posiciones de memoria persistente por cartucho,
 * cada una con un valor entero. Este módulo NO llama a `pmem` directamente:
 * recibe una interfaz `Almacen` inyectable, para poder probarse con vitest y
 * mantener la lógica pura (regla de separación del proyecto).
 *
 * Formato serializado (versión 1), repartido en slots de `pmem`:
 *   [0] = mágico (ver MAGICO_OK)
 *   [1] = versión del formato
 *   [2] = cantidad de combates ganados
 *   [3..10] = bitmask de combates ganados (8 bots, 1 bit por bot)
 *   [11] = cantidad de aves desbloqueadas
 *   [12..21] = bitmask de aves desbloqueadas (10 aves)
 *   [22] = cantidad de aves vistas
 *   [23..32] = bitmask de aves vistas (10 aves)
 *   [33] = silenciado (0/1)
 *
 * Nota: los ids concretos de aves/bots los define Lógica (fichas y torre);
 * aquí solo se guardan índices/bitmasks, no nombres.
 */

/** Almacén persistente de enteros con índices acotados. Lo implementa `pmem` en producción. */
export interface Almacen {
  leer(indice: number): number
  escribir(indice: number, valor: number): void
}

/** Valor mágico que marca un guardado inicializado. */
export const MAGICO_OK = 0xa5

/** Versión actual del formato de guardado. */
export const VERSION_FORMATO = 1

/** Cantidad de aves del juego (RF-003). */
export const TOTAL_AVES = 10

/** Cantidad de bots de la torre (plan_desarrollo §5.1). */
export const TOTAL_BOTS = 8

/** Cantidad de aves que desbloquea el juego (D-L, D-M). */
export const TOTAL_AVES_DESBLOQUEABLES = 7

/** Progreso persistido del jugador. */
export interface Progreso {
  /** Índice (0-based) de cada bot vencido. */
  combatesGanados: number[]
  /** Índice (0-based) de cada ave desbloqueada. */
  avesDesbloqueadas: number[]
  /** Índice (0-based) de cada ave vista en combate (D-F). */
  avesVistas: number[]
  /** Si el audio está silenciado. */
  silenciado: boolean
}

/** Progreso vacío (partida nueva). */
export function progresoVacio(): Progreso {
  return {
    combatesGanados: [],
    avesDesbloqueadas: [],
    avesVistas: [],
    silenciado: false,
  }
}

/**
 * Devuelve un progreso nuevo con el bot indicado añadido a `combatesGanados`.
 * Idempotente: si el bot ya estaba vencido, devuelve el mismo progreso.
 * Mantiene la lista ordenada por índice de bot. No muta la entrada.
 */
export function registrarVictoria(progreso: Progreso, indiceBot: number): Progreso {
  if (indiceBot < 0 || indiceBot >= TOTAL_BOTS) return progreso
  if (progreso.combatesGanados.includes(indiceBot)) return progreso
  const combatesGanados = [...progreso.combatesGanados, indiceBot].sort((a, b) => a - b)
  return { ...progreso, combatesGanados }
}

/** Codifica una lista de índices como una lista de posiciones de bit encendidas. */
function indicesABits(indices: number[], total: number): number[] {
  const bits: number[] = []
  for (let i = 0; i < total; i++) {
    bits.push(indices.includes(i) ? 1 : 0)
  }
  return bits
}

/** Decodifica un bitmask a la lista de índices encendidos. */
function bitsAIndices(bits: number[]): number[] {
  const indices: number[] = []
  for (let i = 0; i < bits.length; i++) {
    if (bits[i] === 1) indices.push(i)
  }
  return indices
}

/**
 * Escribe el progreso completo en el almacén.
 * Acepta un `Almacen` con la misma interfaz que `pmem`.
 */
export function guardarProgreso(almacen: Almacen, progreso: Progreso): void {
  almacen.escribir(0, MAGICO_OK)
  almacen.escribir(1, VERSION_FORMATO)

  const bitsGanados = indicesABits(progreso.combatesGanados, TOTAL_BOTS)
  almacen.escribir(2, bitsGanados.filter((b) => b === 1).length)
  for (let i = 0; i < TOTAL_BOTS; i++) almacen.escribir(3 + i, bitsGanados[i])

  const bitsAves = indicesABits(progreso.avesDesbloqueadas, TOTAL_AVES)
  almacen.escribir(11, bitsAves.filter((b) => b === 1).length)
  for (let i = 0; i < TOTAL_AVES; i++) almacen.escribir(12 + i, bitsAves[i])

  const bitsVistas = indicesABits(progreso.avesVistas, TOTAL_AVES)
  almacen.escribir(22, bitsVistas.filter((b) => b === 1).length)
  for (let i = 0; i < TOTAL_AVES; i++) almacen.escribir(23 + i, bitsVistas[i])

  almacen.escribir(33, progreso.silenciado ? 1 : 0)
}

/**
 * Lee el progreso. Si el guardado no existe, está dañado o es de otra versión,
 * devuelve `null` (el llamador decide si arranca una partida nueva).
 */
export function leerProgreso(almacen: Almacen): Progreso | null {
  if (almacen.leer(0) !== MAGICO_OK) return null
  if (almacen.leer(1) !== VERSION_FORMATO) return null

  const bitsGanados: number[] = []
  for (let i = 0; i < TOTAL_BOTS; i++) bitsGanados.push(almacen.leer(3 + i) === 1 ? 1 : 0)

  const bitsAves: number[] = []
  for (let i = 0; i < TOTAL_AVES; i++) bitsAves.push(almacen.leer(12 + i) === 1 ? 1 : 0)

  const bitsVistas: number[] = []
  for (let i = 0; i < TOTAL_AVES; i++) bitsVistas.push(almacen.leer(23 + i) === 1 ? 1 : 0)

  return {
    combatesGanados: bitsAIndices(bitsGanados),
    avesDesbloqueadas: bitsAIndices(bitsAves),
    avesVistas: bitsAIndices(bitsVistas),
    silenciado: almacen.leer(33) === 1,
  }
}

/** Indica si hay un guardado válido. */
export function hayGuardado(almacen: Almacen): boolean {
  return almacen.leer(0) === MAGICO_OK && almacen.leer(1) === VERSION_FORMATO
}

/** Borra el guardado: restablece el mágico a un valor distinto de `MAGICO_OK`. */
export function borrarGuardado(almacen: Almacen): void {
  for (let i = 0; i <= 33; i++) almacen.escribir(i, 0)
}

/**
 * Crea un `Almacen` en memoria (para pruebas o para un runtime sin `pmem`).
 * `valores` permite precargar slots.
 */
export function almacenEnMemoria(valores: Record<number, number> = {}): Almacen {
  const datos = new Map<number, number>(Object.entries(valores).map(([k, v]) => [Number(k), v]))
  return {
    leer(indice: number): number {
      return datos.get(indice) ?? 0
    },
    escribir(indice: number, valor: number): void {
      datos.set(indice, valor)
    },
  }
}

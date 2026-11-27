/**
 * Pool de movimientos predeterminados (plan_motor_c.md, paso 5; D-C).
 * 3 movimientos por cada tipo PPTLS. Cualquier ave puede usarlos: se comparten entre
 * aves, excepto el movimiento característico (que es único de cada ave).
 *
 * Nombres tomados del PRD (`contenido-aves.adoc`). Propuesta: revisar antes de la beta.
 */

import type { MovimientoFicha } from '../battle/types';

export const POOL_MOVIMIENTOS: MovimientoFicha[] = [
  { id: 'aterrizaje-firme', nombre: 'Aterrizaje Firme', tipo: 'piedra' },
  { id: 'salto-pradera', nombre: 'Salto de Pradera', tipo: 'piedra' },
  { id: 'empuje-terrestre', nombre: 'Empuje Terrestre', tipo: 'piedra' },

  { id: 'abrigo-plumas', nombre: 'Abrigo de Plumas', tipo: 'papel' },
  { id: 'nido-musgo', nombre: 'Nido de Musgo', tipo: 'papel' },
  { id: 'suspension', nombre: 'Suspensión', tipo: 'papel' },

  { id: 'picotazo', nombre: 'Picotazo', tipo: 'tijera' },
  { id: 'trino-veloz', nombre: 'Trino Veloz', tipo: 'tijera' },
  { id: 'aleteo-vertiginoso', nombre: 'Aleteo Vertiginoso', tipo: 'tijera' },

  { id: 'caza-insectos', nombre: 'Caza de Insectos', tipo: 'lagarto' },
  { id: 'nectar-vivificador', nombre: 'Néctar Vivificador', tipo: 'lagarto' },
  { id: 'salto-matorral', nombre: 'Salto de Matorral', tipo: 'lagarto' },

  { id: 'mirada-fuego', nombre: 'Mirada de Fuego', tipo: 'spock' },
  { id: 'pico-aguja', nombre: 'Pico de Aguja', tipo: 'spock' },
  { id: 'canto-alba', nombre: 'Canto de Alba', tipo: 'spock' },
];

/**
 * Devuelve copias de los movimientos de la pool con los ids dados.
 * Lanza un error si algún id no existe en la pool.
 */
export function desdePool(...ids: string[]): MovimientoFicha[] {
  return ids.map((id) => {
    const mov = POOL_MOVIMIENTOS.find((m) => m.id === id);
    if (!mov) throw new Error(`Movimiento de la pool no encontrado: ${id}`);
    return { ...mov };
  });
}

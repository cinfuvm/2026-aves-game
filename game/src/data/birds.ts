/**
 * Fichas de aves del MVP: Cóndor, Loica y Chincol.
 * Fuente: docs/modules/prd/pages/contenido-aves.adoc y plan_motor_c.md (pasos 5 y 6).
 *
 * Cada ave tiene 4 movimientos fijos: 1 característico (único del ave, del tipo propio)
 * y 3 predeterminados tomados de la pool compartida (`movimientos.ts`).
 *
 * Tipo propio: el tipo del movimiento distintivo del PRD (supuesto S-01, D-14).
 * Pendiente de confirmar con el Product Owner (T8).
 */

import type { AveFicha, MovimientoFicha } from '../battle/types';
import { desdePool } from './movimientos';

export const CONDOR: AveFicha = {
  id: 'condor',
  nombre: 'Cóndor',
  tipo: 'spock',
  movimientos: [
    { id: 'vuelo-sagrado', nombre: 'Vuelo Sagrado', tipo: 'spock', caracteristico: true },
    ...desdePool('aterrizaje-firme', 'abrigo-plumas', 'picotazo'),
  ],
};

export const LOICA: AveFicha = {
  id: 'loica',
  nombre: 'Loica',
  tipo: 'lagarto',
  movimientos: [
    { id: 'lengua-nectar', nombre: 'Lengua de Néctar', tipo: 'lagarto', caracteristico: true },
    ...desdePool('empuje-terrestre', 'suspension', 'trino-veloz'),
  ],
};

export const CHINCOL: AveFicha = {
  id: 'chincol',
  nombre: 'Chincol',
  tipo: 'papel',
  movimientos: [
    { id: 'plumaje-camuflado', nombre: 'Plumaje Camuflado', tipo: 'papel', caracteristico: true },
    ...desdePool('caza-insectos', 'mirada-fuego', 'pico-aguja'),
  ],
};

/** Fichas de las aves disponibles en el ejecutable mínimo. */
export const FICHAS_MVP: AveFicha[] = [CONDOR, LOICA, CHINCOL];

/** Movimientos característicos de las aves del MVP (deben ser únicos entre aves). */
export const CARACTERISTICOS_MVP: MovimientoFicha[] = FICHAS_MVP.map(
  (ficha) => ficha.movimientos.find((m) => m.caracteristico === true) as MovimientoFicha,
);

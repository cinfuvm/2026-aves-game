/**
 * Fichas de aves del MVP (plan_mvp.md, paso 2): Cóndor, Loica y Chincol.
 * Fuente: docs/modules/prd/pages/contenido-aves.adoc («Fichas de aves»).
 *
 * Tipo propio: el PRD no lo define por separado. Se toma el tipo del movimiento
 * distintivo de cada ave (supuesto S-01 en changes.md). Coincide con los tipos
 * que usan las pruebas del motor.
 *
 * Cada ficha debe pasar `validarFicha` (5 movimientos, uno de tipo propio).
 */

import type { AveFicha } from '../battle/types';

export const CONDOR: AveFicha = {
  id: 'condor',
  nombre: 'Cóndor',
  tipo: 'spock',
  movimientos: [
    { id: 'planeo-pesado', nombre: 'Planeo Pesado', tipo: 'piedra' },
    { id: 'corriente-montana', nombre: 'Corriente de Montaña', tipo: 'papel' },
    { id: 'garra-cortante', nombre: 'Garra Cortante', tipo: 'tijera' },
    { id: 'carroneo', nombre: 'Carroñeo', tipo: 'lagarto' },
    { id: 'vuelo-sagrado', nombre: 'Vuelo Sagrado', tipo: 'spock' },
  ],
};

export const LOICA: AveFicha = {
  id: 'loica',
  nombre: 'Loica',
  tipo: 'lagarto',
  movimientos: [
    { id: 'salto-pradera', nombre: 'Salto de Pradera', tipo: 'piedra' },
    { id: 'nido-oculto', nombre: 'Nido Oculto', tipo: 'papel' },
    { id: 'picotazo', nombre: 'Picotazo', tipo: 'tijera' },
    { id: 'lengua-nectar', nombre: 'Lengua de Néctar', tipo: 'lagarto' },
    { id: 'canto-alba', nombre: 'Canto de Alba', tipo: 'spock' },
  ],
};

export const CHINCOL: AveFicha = {
  id: 'chincol',
  nombre: 'Chincol',
  tipo: 'papel',
  movimientos: [
    { id: 'saltito', nombre: 'Saltito', tipo: 'piedra' },
    { id: 'plumaje-camuflado', nombre: 'Plumaje Camuflado', tipo: 'papel' },
    { id: 'trino-veloz', nombre: 'Trino Veloz', tipo: 'tijera' },
    { id: 'picoteo-constante', nombre: 'Picoteo Constante', tipo: 'lagarto' },
    { id: 'canto-lluvia', nombre: 'Canto de Lluvia', tipo: 'spock' },
  ],
};

/** Fichas de las aves disponibles en el ejecutable mínimo. */
export const FICHAS_MVP: AveFicha[] = [CONDOR, LOICA, CHINCOL];

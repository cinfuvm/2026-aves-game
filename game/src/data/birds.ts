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

// ---------------------------------------------------------------------------
// Resto del catálogo (7 aves adicionales para el catálogo de selección).
// Misma estructura que las del MVP: 1 característico del tipo propio + 3
// predeterminados de la pool compartida. Los característicos son únicos.
// ---------------------------------------------------------------------------

export const PICAFLOR: AveFicha = {
  id: 'picaflor',
  nombre: 'Picaflor',
  tipo: 'tijera',
  movimientos: [
    { id: 'pico-zumbador', nombre: 'Pico Zumbador', tipo: 'tijera', caracteristico: true },
    ...desdePool('aleteo-vertiginoso', 'nectar-vivificador', 'picotazo'),
  ],
};

export const DIUCON: AveFicha = {
  id: 'diucon',
  nombre: 'Diucón',
  tipo: 'papel',
  movimientos: [
    { id: 'vuelo-acrobatico', nombre: 'Vuelo Acrobático', tipo: 'papel', caracteristico: true },
    ...desdePool('suspension', 'abrigo-plumas', 'mirada-fuego'),
  ],
};

export const CHERCAN: AveFicha = {
  id: 'chercan',
  nombre: 'Chercán',
  tipo: 'tijera',
  movimientos: [
    { id: 'trino-escondido', nombre: 'Trino Escondido', tipo: 'tijera', caracteristico: true },
    ...desdePool('trino-veloz', 'caza-insectos', 'salto-matorral'),
  ],
};

export const PINGUINO_HUMBOLDT: AveFicha = {
  id: 'pinguino_humboldt',
  nombre: 'Pingüino de Humboldt',
  tipo: 'piedra',
  movimientos: [
    { id: 'embestida-antartica', nombre: 'Embestida Antártica', tipo: 'piedra', caracteristico: true },
    ...desdePool('aterrizaje-firme', 'empuje-terrestre', 'salto-pradera'),
  ],
};

export const QUELTEHUE: AveFicha = {
  id: 'queltehue',
  nombre: 'Queltehue',
  tipo: 'spock',
  movimientos: [
    { id: 'alarma-estridente', nombre: 'Alarma Estridente', tipo: 'spock', caracteristico: true },
    ...desdePool('canto-alba', 'pico-aguja', 'mirada-fuego'),
  ],
};

export const TIUQUE: AveFicha = {
  id: 'tiuque',
  nombre: 'Tiuque',
  tipo: 'lagarto',
  movimientos: [
    { id: 'carroñeo-oportuno', nombre: 'Carroñeo Oportuno', tipo: 'lagarto', caracteristico: true },
    ...desdePool('caza-insectos', 'salto-matorral', 'empuje-terrestre'),
  ],
};

export const TUCUQUERE: AveFicha = {
  id: 'tucuquere',
  nombre: 'Tucúquere',
  tipo: 'spock',
  movimientos: [
    { id: 'mirada-nocturna', nombre: 'Mirada Nocturna', tipo: 'spock', caracteristico: true },
    ...desdePool('mirada-fuego', 'pico-aguja', 'canto-alba'),
  ],
};

/**
 * Catálogo completo de aves seleccionables (10). El orden coincide con los
 * sprites importados (`game/src/data/sprites.ts`).
 */
export const CATALOGO_AVES: AveFicha[] = [
  CONDOR,
  LOICA,
  CHINCOL,
  PICAFLOR,
  DIUCON,
  CHERCAN,
  PINGUINO_HUMBOLDT,
  QUELTEHUE,
  TIUQUE,
  TUCUQUERE,
];

/** Movimientos característicos de las aves del MVP (deben ser únicos entre aves). */
export const CARACTERISTICOS_MVP: MovimientoFicha[] = FICHAS_MVP.map(
  (ficha) => ficha.movimientos.find((m) => m.caracteristico === true) as MovimientoFicha,
);

/** Movimientos característicos de todo el catálogo (deben ser únicos entre aves). */
export const CARACTERISTICOS: MovimientoFicha[] = CATALOGO_AVES.map(
  (ficha) => ficha.movimientos.find((m) => m.caracteristico === true) as MovimientoFicha,
);

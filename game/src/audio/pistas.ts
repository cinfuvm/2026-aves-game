/**
 * Pistas de música de Pokeaves PPTLS. GENERADO desde la rama `musica`
 * (Musica Proyecto 3/*.lua) por el generador de scratch; no editar a mano.
 * Cada pista define sus ondas, sus sonidos (sfx) y las notas por canal.
 * Los datos son los mismos que las pistas Lua originales; la reproducción
 * está en musica.ts.
 */

/** Definición de un sonido (sfx) de TIC-80: forma de onda, volumen y tono por tick. */
export interface SfxDef {
  indice: number;
  onda: number;
  velocidad: number;
  inicioBucle: number;
  longitudBucle: number;
  volumenes: number[];
  alturas: number[];
}

/** Canal de notas: en cada paso toca el sfx con la nota del paso (null = silencio). */
export interface Canal {
  nombre: string;
  sfx: number;
  duracion: number;
  canal: number;
  volumen: number;
  pasos: (number | null)[];
}

/** Llamada de percusión por paso (0 = silencio). */
export interface Percusion {
  pasos: number[];
  sonidos: Record<number, { sfx: number; nota: number; duracion: number; canal: number; volumen: number }>;
}

/** Cómo avanza la pista: en bucle completo, desde un paso, o una sola vez. */
export type Bucle = { modo: 'todo' } | { modo: 'desde'; inicio: number } | { modo: 'una-vez' };

export interface Pista {
  nombre: string;
  velocidad: number;
  ondas: string[];
  sfx: SfxDef[];
  canales: Canal[];
  percusion: Percusion;
  bucle: Bucle;
}

export const MELODIA1: Pista = {
  nombre: 'melodia1',
  velocidad: 10,
  ondas: [
    '8abdeffedc975310124689abcdba8765',
    '89bcdeffedcba9876543210012345678',
    '8acdeffedcba8642013579bdfedca987',
    'f1c3a82e59d0b476e29c1f4a83d60b57',
  ],
  sfx: [
    { indice: 0, onda: 0, velocidad: 3, inicioBucle: 10, longitudBucle: 4, volumenes: [7, 10, 11, 10, 9, 8, 7, 6, 6, 5, 5, 4, 4, 3, 3, 2, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
    { indice: 1, onda: 1, velocidad: 3, inicioBucle: 6, longitudBucle: 4, volumenes: [13, 13, 12, 11, 10, 9, 8, 8, 7, 7, 6, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
    { indice: 2, onda: 2, velocidad: 3, inicioBucle: 8, longitudBucle: 8, volumenes: [5, 9, 12, 13, 13, 12, 12, 11, 11, 10, 10, 10, 9, 9, 8, 8, 7, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0], alturas: [0, 0, 0, 0, 0, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { indice: 3, onda: 1, velocidad: 0, inicioBucle: 0, longitudBucle: 0, volumenes: [14, 13, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [6, 4, 1, -1, -3, -5, -6, -7, -8, -8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { indice: 4, onda: 3, velocidad: 0, inicioBucle: 0, longitudBucle: 0, volumenes: [10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
    { indice: 5, onda: 3, velocidad: 0, inicioBucle: 0, longitudBucle: 0, volumenes: [4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
  ],
  canales: [
    { nombre: 'keys', sfx: 0, duracion: 36, canal: 0, volumen: 9, pasos: [50, null, 53, 57, 60, null, 64, null, 60, null, 57, null, 53, null, 50, null, 43, null, 53, 57, 59, null, 64, null, 62, null, 59, null, 57, null, 53, null, 48, null, 52, 55, 59, null, 62, null, 59, null, 55, null, 52, null, 48, null, 45, null, 52, 55, 59, null, 60, null, 64, null, 60, null, 59, null, 55, null, 50, null, 53, 57, 60, null, 64, null, 67, null, 64, null, 60, null, 57, null, 43, null, 53, 57, 59, null, 64, null, 62, null, 59, null, 57, null, 53, null, 48, null, 52, 55, 59, null, 62, null, 64, null, 62, null, 59, null, 55, null, 45, null, 55, 61, 64, null, 65, null, 64, null, 61, null, 55, null, 52, null] },
    { nombre: 'bass', sfx: 1, duracion: 36, canal: 1, volumen: 13, pasos: [26, null, null, null, null, null, 29, null, 33, null, null, null, 31, null, null, null, 31, null, null, null, null, null, 35, null, 38, null, null, null, 36, null, 35, null, 24, null, null, null, null, null, 28, null, 31, null, null, null, 29, null, null, null, 33, null, null, null, null, null, 31, null, 28, null, null, null, 26, null, null, null, 26, null, null, null, null, null, 29, null, 33, null, null, null, 31, null, null, null, 31, null, null, null, null, null, 35, null, 38, null, null, null, 36, null, 35, null, 24, null, null, null, null, null, 28, null, 31, null, null, null, 28, null, null, null, 33, null, null, null, null, null, 31, null, 28, null, null, null, 26, null, 24, null] },
    { nombre: 'lead', sfx: 2, duracion: 52, canal: 2, volumen: 12, pasos: [null, null, 69, null, 72, null, 71, null, 69, null, null, null, 67, null, 64, null, 62, null, null, null, 64, null, 67, null, 64, null, null, null, null, null, null, null, null, null, 67, null, 71, null, 74, null, 72, null, null, null, 71, null, 67, null, 64, null, null, null, null, null, 62, null, 64, null, null, null, null, null, null, null, null, null, 72, null, 76, null, 74, null, 72, null, null, null, 69, null, 67, null, 64, null, null, null, 67, null, 69, null, 67, null, null, null, 64, null, null, null, null, null, 62, null, 64, null, 67, null, 71, null, null, null, 69, null, 67, null, 64, null, null, null, 61, null, 62, null, 64, null, null, null, null, null, null, null] },
  ],
  percusion: {
    pasos: [1, 0, 3, 0, 2, 0, 3, 0, 0, 0, 1, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0, 0, 1, 0, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0, 0, 0, 1, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 0, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0, 0, 0, 1, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0, 0, 1, 0, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0, 0, 0, 1, 0, 2, 0, 3, 0, 1, 0, 3, 0, 2, 0, 3, 0, 1, 0, 1, 0, 2, 0, 3, 0],
    sonidos: {
      1: { sfx: 3, nota: 34, duracion: 14, canal: 3, volumen: 13 },
      2: { sfx: 4, nota: 58, duracion: 12, canal: 3, volumen: 9 },
      3: { sfx: 5, nota: 82, duracion: 6, canal: 3, volumen: 4 },
    },
  },
  bucle: { modo: 'todo' },
};

export const PELEA: Pista = {
  nombre: 'pelea',
  velocidad: 6,
  ondas: [
    '02479bceffecb9742002479bceffecb9',
    '00001111ffff111100001111ffff1111',
    '00000000ffffffff00000000ffffffff',
    'f1c3a82e59d0b476e29c1f4a83d60b57',
  ],
  sfx: [
    { indice: 0, onda: 0, velocidad: 1, inicioBucle: 4, longitudBucle: 4, volumenes: [15, 15, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
    { indice: 1, onda: 1, velocidad: 1, inicioBucle: 6, longitudBucle: 4, volumenes: [14, 14, 13, 13, 12, 12, 11, 11, 10, 10, 9, 9, 8, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [0, 0, 0, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { indice: 2, onda: 2, velocidad: 0, inicioBucle: 0, longitudBucle: 0, volumenes: [10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
    { indice: 3, onda: 0, velocidad: 0, inicioBucle: 0, longitudBucle: 0, volumenes: [15, 15, 13, 10, 7, 4, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [7, 4, 1, -2, -5, -7, -8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { indice: 4, onda: 3, velocidad: 0, inicioBucle: 0, longitudBucle: 0, volumenes: [15, 13, 10, 8, 5, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [3, 1, -1, -3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { indice: 5, onda: 3, velocidad: 0, inicioBucle: 0, longitudBucle: 0, volumenes: [8, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
    { indice: 6, onda: 3, velocidad: 1, inicioBucle: 0, longitudBucle: 0, volumenes: [12, 10, 8, 6, 5, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
  ],
  canales: [
    { nombre: 'bass', sfx: 0, duracion: 12, canal: 0, volumen: 15, pasos: [38, 37, 36, 35, 34, 33, 32, 31, 30, 29, 28, 27, 26, null, 26, null, 26, 26, 38, 26, 26, 38, 26, 26, 33, 33, 45, 33, 33, 45, 33, 33, 26, 26, 38, 26, 29, 29, 41, 29, 33, 33, 45, 33, 38, 36, 33, 29, 24, 24, 36, 24, 28, 28, 40, 28, 31, 31, 43, 31, 36, 35, 31, 28, 22, 22, 34, 22, 26, 26, 38, 26, 29, 29, 41, 29, 34, 33, 31, 29, 21, 21, 33, 21, 25, 25, 37, 25, 28, 28, 40, 28, 33, 31, 28, 25, 26, 38, 26, 38, 29, 41, 29, 41, 33, 45, 33, 45, 38, 36, 33, 29, 31, 43, 31, 43, 29, 41, 26, 38, 24, 36, 24, 36, 28, 40, 31, 43, 29, 41, 29, 41, 24, 36, 29, 41, 34, 46, 34, 46, 29, 41, 34, 46, 33, 45, 31, 43, 28, 40, 25, 37, 21, 33, 25, 37, 28, 28, 27, 27] },
    { nombre: 'lead', sfx: 1, duracion: 22, canal: 1, volumen: 13, pasos: [86, 85, 84, 83, 82, 81, 80, 79, 78, 77, 76, 75, 74, null, 62, null, 69, null, null, null, 70, null, null, null, 73, null, null, null, 76, null, null, null, 74, null, 74, 76, 77, null, 76, 74, 73, null, 74, null, 69, null, null, null, 72, null, 72, 74, 76, null, 74, 72, 71, null, 72, null, 67, null, null, null, 70, null, 70, 72, 74, null, 72, 70, 69, null, 70, null, 74, null, 77, null, 76, null, null, null, 73, null, null, null, 69, null, 73, null, 76, null, null, null, 81, null, 79, 77, 79, null, 81, null, 86, null, 84, 81, 79, null, 77, null, 79, null, 77, 74, 77, null, 79, null, 84, null, 82, 79, 77, null, 76, null, 77, null, 79, null, 81, null, 82, null, 84, null, 86, null, 88, null, 89, null, 88, null, 85, null, 81, null, 85, null, 88, null, 91, null, 93, null, null, null] },
    { nombre: 'arp', sfx: 2, duracion: 6, canal: 2, volumen: 7, pasos: [74, 73, 72, 71, 70, 69, 68, 67, 66, 65, 64, 63, 62, null, null, null, 62, 65, 69, 74, 62, 65, 69, 74, 61, 64, 69, 73, 61, 64, 69, 73, 62, 65, 69, 74, 62, 65, 69, 74, 62, 65, 69, 74, 62, 65, 69, 74, 60, 64, 67, 72, 60, 64, 67, 72, 60, 64, 67, 72, 60, 64, 67, 72, 58, 62, 65, 70, 58, 62, 65, 70, 58, 62, 65, 70, 58, 62, 65, 70, 57, 61, 64, 69, 57, 61, 64, 69, 61, 64, 69, 73, 64, 69, 73, 76, 62, 65, 69, 74, 62, 65, 69, 74, 62, 65, 69, 74, 62, 65, 69, 74, 55, 58, 62, 67, 55, 58, 62, 67, 60, 64, 67, 72, 60, 64, 67, 72, 53, 57, 60, 65, 53, 57, 60, 65, 58, 62, 65, 70, 58, 62, 65, 70, 57, 61, 64, 69, 61, 64, 69, 73, 64, 69, 73, 76, 69, 73, 76, 81] },
  ],
  percusion: {
    pasos: [4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 2, 2, 1, 3, 2, 3, 1, 3, 2, 3, 2, 2, 2, 2, 2, 2, 2, 4, 4, 3, 3, 3, 2, 3, 3, 1, 3, 1, 1, 3, 2, 3, 4, 3, 1, 3, 3, 3, 2, 3, 3, 1, 3, 3, 1, 3, 2, 3, 2, 3, 1, 3, 3, 3, 2, 3, 3, 1, 3, 1, 1, 3, 2, 3, 4, 3, 1, 3, 1, 3, 2, 3, 2, 3, 1, 1, 2, 2, 2, 2, 2, 2, 4, 3, 1, 3, 2, 3, 3, 1, 3, 1, 1, 3, 2, 3, 1, 3, 1, 3, 1, 3, 2, 3, 3, 1, 3, 1, 1, 3, 2, 3, 4, 3, 1, 3, 1, 3, 2, 3, 1, 3, 1, 3, 1, 3, 2, 3, 2, 3, 1, 1, 2, 2, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 4],
    sonidos: {
      1: { sfx: 3, nota: 30, duracion: 6, canal: 3, volumen: 14 },
      2: { sfx: 4, nota: 56, duracion: 8, canal: 3, volumen: 14 },
      3: { sfx: 5, nota: 86, duracion: 4, canal: 3, volumen: 6 },
      4: { sfx: 6, nota: 78, duracion: 10, canal: 3, volumen: 11 },
    },
  },
  bucle: { modo: 'desde', inicio: 32 },
};

export const ENCUENTRO_ENEMIGO: Pista = {
  nombre: 'encuentroEnemigo',
  velocidad: 4,
  ondas: [
    '02479bceffecb9742002479bceffecb9',
    '00001111ffff111100001111ffff1111',
    '00000000ffffffff00000000ffffffff',
    'f1c3a82e59d0b476e29c1f4a83d60b57',
  ],
  sfx: [
    { indice: 0, onda: 0, velocidad: 1, inicioBucle: 0, longitudBucle: 0, volumenes: [15, 15, 14, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
    { indice: 1, onda: 1, velocidad: 1, inicioBucle: 6, longitudBucle: 4, volumenes: [15, 15, 15, 14, 14, 13, 13, 12, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [0, 0, 0, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { indice: 2, onda: 2, velocidad: 1, inicioBucle: 0, longitudBucle: 0, volumenes: [12, 11, 10, 8, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
    { indice: 3, onda: 3, velocidad: 0, inicioBucle: 0, longitudBucle: 0, volumenes: [14, 12, 9, 6, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [3, 1, -1, -3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { indice: 4, onda: 3, velocidad: 1, inicioBucle: 0, longitudBucle: 0, volumenes: [14, 12, 10, 8, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
  ],
  canales: [
    { nombre: 'bass', sfx: 0, duracion: 14, canal: 0, volumen: 15, pasos: [38, null, 37, null, 36, null, 35, null, 34, null, null, null, 33, null, null, null, 26, null, 26, 26, 32, null, 33, null, 26, null, null, null, null, null, null, null] },
    { nombre: 'lead', sfx: 1, duracion: 24, canal: 1, volumen: 15, pasos: [86, null, null, null, 74, 75, 76, 77, 78, 79, 80, 81, 82, null, null, null, 74, null, 77, null, 80, null, 83, null, 86, null, null, null, null, null, null, null] },
    { nombre: 'harm', sfx: 2, duracion: 18, canal: 2, volumen: 11, pasos: [80, null, null, null, 68, 69, 70, 71, 72, 73, 74, 75, 76, null, null, null, 69, null, 72, null, 75, null, 78, null, 81, null, null, null, null, null, null, null] },
  ],
  percusion: {
    pasos: [2, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 2, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    sonidos: {
      1: { sfx: 3, nota: 56, duracion: 6, canal: 3, volumen: 14 },
      2: { sfx: 4, nota: 78, duracion: 18, canal: 3, volumen: 13 },
    },
  },
  bucle: { modo: 'una-vez' },
};

export const VICTORIA_PELEA: Pista = {
  nombre: 'victoriaPelea',
  velocidad: 6,
  ondas: [
    '02479bceffecb9742002479bceffecb9',
    '00001111ffff111100001111ffff1111',
    '00000000ffffffff00000000ffffffff',
    'f1c3a82e59d0b476e29c1f4a83d60b57',
  ],
  sfx: [
    { indice: 0, onda: 0, velocidad: 1, inicioBucle: 0, longitudBucle: 0, volumenes: [15, 15, 14, 12, 10, 8, 6, 4, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
    { indice: 1, onda: 1, velocidad: 2, inicioBucle: 6, longitudBucle: 4, volumenes: [15, 15, 15, 14, 14, 13, 13, 12, 12, 11, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [0, 0, 0, 0, 0, 0, 1, 0, -1, 0, 1, 0, -1, 0, 1, 0, -1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { indice: 2, onda: 2, velocidad: 1, inicioBucle: 0, longitudBucle: 0, volumenes: [12, 11, 10, 8, 6, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
    { indice: 3, onda: 3, velocidad: 0, inicioBucle: 0, longitudBucle: 0, volumenes: [14, 12, 9, 6, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [3, 1, -1, -3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
    { indice: 4, onda: 3, velocidad: 2, inicioBucle: 0, longitudBucle: 0, volumenes: [13, 12, 11, 9, 8, 7, 5, 4, 3, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], alturas: [] },
  ],
  canales: [
    { nombre: 'bass', sfx: 0, duracion: 16, canal: 0, volumen: 14, pasos: [38, null, 38, 38, 38, null, 33, null, 35, null, 37, null, 38, null, null, null, 42, null, 45, null, 47, null, 49, null, 50, null, null, null, null, null, null, null] },
    { nombre: 'lead', sfx: 1, duracion: 28, canal: 1, volumen: 15, pasos: [74, null, 74, 74, 74, null, 69, null, 71, null, 73, null, 74, null, null, null, 78, null, 81, null, 83, null, 85, null, 86, null, null, null, null, null, null, null] },
    { nombre: 'harm', sfx: 2, duracion: 20, canal: 2, volumen: 11, pasos: [66, null, 66, 66, 66, null, 61, null, 62, null, 64, null, 66, null, null, null, 69, null, 74, null, 78, null, 81, null, 86, 81, 78, 81, 86, null, null, null] },
  ],
  percusion: {
    pasos: [2, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 2, 0, 0, 0, 1, 0, 1, 0, 1, 1, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0],
    sonidos: {
      1: { sfx: 3, nota: 56, duracion: 8, canal: 3, volumen: 13 },
      2: { sfx: 4, nota: 78, duracion: 24, canal: 3, volumen: 12 },
    },
  },
  bucle: { modo: 'una-vez' },
};

/** Todas las pistas por nombre, para elegir la de cada pantalla. */
export const PISTAS: Record<string, Pista> = {
  melodia1: MELODIA1,
  pelea: PELEA,
  encuentroEnemigo: ENCUENTRO_ENEMIGO,
  victoriaPelea: VICTORIA_PELEA,
};

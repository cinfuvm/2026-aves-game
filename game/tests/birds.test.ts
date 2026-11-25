import { describe, expect, it } from 'vitest';
import { CARACTERISTICOS_MVP, CHINCOL, CONDOR, FICHAS_MVP, LOICA } from '../src/data/birds';
import { POOL_MOVIMIENTOS, desdePool } from '../src/data/movimientos';
import { seleccionarMovimientos, validarFicha } from '../src/battle/state';
import { crearRng } from '../src/battle/rng';

describe('fichas de aves del MVP (game/src/data/birds.ts)', () => {
  it('incluye 3 aves: Cóndor, Loica y Chincol', () => {
    expect(FICHAS_MVP.map((f) => f.nombre)).toEqual(['Cóndor', 'Loica', 'Chincol']);
  });

  it.each(FICHAS_MVP.map((f) => [f.nombre, f] as const))(
    '%s pasa validarFicha (4 movimientos y un característico de su tipo)',
    (_nombre, ficha) => {
      expect(validarFicha(ficha)).toEqual([]);
    },
  );

  it.each(FICHAS_MVP.map((f) => [f.nombre, f] as const))(
    '%s tiene ids de movimiento únicos',
    (_nombre, ficha) => {
      const ids = ficha.movimientos.map((m) => m.id);
      expect(new Set(ids).size).toBe(ids.length);
    },
  );

  it('el tipo propio de cada ave coincide con el de su movimiento característico (S-01)', () => {
    expect(CONDOR.tipo).toBe('spock');
    expect(LOICA.tipo).toBe('lagarto');
    expect(CHINCOL.tipo).toBe('papel');
  });

  it('los característicos son únicos entre aves (no se comparten)', () => {
    const ids = CARACTERISTICOS_MVP.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('los predeterminados salen de la pool compartida', () => {
    const idsPool = new Set(POOL_MOVIMIENTOS.map((m) => m.id));
    for (const ficha of FICHAS_MVP) {
      for (const mov of ficha.movimientos.filter((m) => !m.caracteristico)) {
        expect(idsPool.has(mov.id), `${ficha.nombre}: ${mov.id}`).toBe(true);
      }
    }
  });

  it('la pool tiene 3 movimientos de cada tipo (15 en total)', () => {
    expect(POOL_MOVIMIENTOS).toHaveLength(15);
    for (const tipo of ['piedra', 'papel', 'tijera', 'lagarto', 'spock'] as const) {
      expect(POOL_MOVIMIENTOS.filter((m) => m.tipo === tipo)).toHaveLength(3);
    }
  });

  it('desdePool lanza error con un id que no existe', () => {
    expect(() => desdePool('no-existe')).toThrow(/no encontrado/);
  });

  it.each(FICHAS_MVP.map((f) => [f.nombre, f] as const))(
    '%s activa siempre sus 4 movimientos fijos, con el característico incluido',
    (_nombre, ficha) => {
      for (let seed = 1; seed <= 50; seed++) {
        const activos = seleccionarMovimientos(ficha, crearRng(seed));
        expect(activos.map((m) => m.id)).toEqual(ficha.movimientos.map((m) => m.id));
        expect(activos.some((m) => m.tipo === ficha.tipo)).toBe(true);
      }
    },
  );
});

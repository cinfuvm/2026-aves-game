import { describe, expect, it } from 'vitest';
import { FICHAS_MVP, CHINCOL, CONDOR, LOICA } from '../src/data/birds';
import { seleccionarMovimientos, validarFicha } from '../src/battle/state';
import { crearRng } from '../src/battle/rng';

describe('fichas de aves del MVP (game/src/data/birds.ts)', () => {
  it('incluye 3 aves: Cóndor, Loica y Chincol', () => {
    expect(FICHAS_MVP.map((f) => f.nombre)).toEqual(['Cóndor', 'Loica', 'Chincol']);
  });

  it.each(FICHAS_MVP.map((f) => [f.nombre, f] as const))(
    '%s pasa validarFicha (5 movimientos y uno de su tipo)',
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

  it('el tipo propio de cada ave coincide con el de su movimiento distintivo (S-01)', () => {
    expect(CONDOR.tipo).toBe('spock');
    expect(LOICA.tipo).toBe('lagarto');
    expect(CHINCOL.tipo).toBe('papel');
  });

  it.each(FICHAS_MVP.map((f) => [f.nombre, f] as const))(
    '%s siempre activa 4 movimientos, con uno de su tipo',
    (_nombre, ficha) => {
      for (let seed = 1; seed <= 50; seed++) {
        const activos = seleccionarMovimientos(ficha, crearRng(seed));
        expect(activos).toHaveLength(4);
        expect(activos.some((m) => m.tipo === ficha.tipo)).toBe(true);
      }
    },
  );
});

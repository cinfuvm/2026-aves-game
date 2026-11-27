import { describe, expect, it } from 'vitest';
import {
  alternarAve,
  equipoCompleto,
  estaElegida,
  fichasElegidas,
  moverCursor,
  puedeConfirmar,
  seleccionVacia,
  TAMANO_EQUIPO,
} from '../src/juego/seleccion';
import { BOTS, equipoDeBot } from '../src/data/bots';
import { CATALOGO_AVES, FICHAS_MVP } from '../src/data/birds';
import { crearRng } from '../src/battle/rng';

describe('selección de equipo 3v3 (game/src/juego/seleccion.ts)', () => {
  it('empieza vacía', () => {
    const s = seleccionVacia();
    expect(s.elegidas).toEqual([]);
    expect(s.cursorAve).toBe(0);
    expect(equipoCompleto(s)).toBe(false);
  });

  it('el cursor da la vuelta', () => {
    let s = seleccionVacia();
    s = moverCursor(s, -1, 3);
    expect(s.cursorAve).toBe(2);
    s = moverCursor(s, 1, 3);
    expect(s.cursorAve).toBe(0);
    s = moverCursor(s, 5, 3);
    expect(s.cursorAve).toBe(2);
  });

  it('con catálogo vacío el cursor no cambia', () => {
    const s = seleccionVacia();
    expect(moverCursor(s, 1, 0)).toEqual(s);
  });

  it('alternar añade y quita un ave', () => {
    let s = seleccionVacia();
    s = alternarAve(s, 'condor');
    expect(s.elegidas).toEqual(['condor']);
    expect(estaElegida(s, 'condor')).toBe(true);
    s = alternarAve(s, 'condor');
    expect(s.elegidas).toEqual([]);
    expect(estaElegida(s, 'condor')).toBe(false);
  });

  it('no añade un cuarto ave con el equipo completo', () => {
    let s = seleccionVacia();
    s = alternarAve(s, 'a');
    s = alternarAve(s, 'b');
    s = alternarAve(s, 'c');
    expect(equipoCompleto(s)).toBe(true);
    s = alternarAve(s, 'd');
    expect(s.elegidas).toEqual(['a', 'b', 'c']);
  });

  it('fichasElegidas respeta el orden de elección', () => {
    let s = seleccionVacia();
    s = alternarAve(s, 'chincol');
    s = alternarAve(s, 'condor');
    const fichas = fichasElegidas(FICHAS_MVP, s);
    expect(fichas.map((f) => f.id)).toEqual(['chincol', 'condor']);
  });

  it('puedeConfirmar solo con las 3 aves elegidas', () => {
    let s = seleccionVacia();
    expect(puedeConfirmar(FICHAS_MVP, s)).toBe(false);
    s = alternarAve(s, 'condor');
    s = alternarAve(s, 'loica');
    s = alternarAve(s, 'chincol');
    expect(puedeConfirmar(FICHAS_MVP, s)).toBe(true);
    expect(s.elegidas).toHaveLength(TAMANO_EQUIPO);
  });
});

describe('equipo enemigo de la torre (equipoDeBot, game/src/data/bots.ts)', () => {
  it('devuelve 3 fichas del catálogo', () => {
    const equipo = equipoDeBot(BOTS[0], CATALOGO_AVES, 3, crearRng(1));
    expect(equipo).toHaveLength(3);
    for (const f of equipo) expect(CATALOGO_AVES).toContain(f);
  });

  it('es determinista para la misma semilla y el mismo bot', () => {
    const a = equipoDeBot(BOTS[2], CATALOGO_AVES, 3, crearRng(7)).map((f) => f.id);
    const b = equipoDeBot(BOTS[2], CATALOGO_AVES, 3, crearRng(7)).map((f) => f.id);
    expect(a).toEqual(b);
  });

  it('no repite aves dentro de un equipo', () => {
    const ids = equipoDeBot(BOTS[5], CATALOGO_AVES, 3, crearRng(3)).map((f) => f.id);
    expect(new Set(ids).size).toBe(3);
  });
});

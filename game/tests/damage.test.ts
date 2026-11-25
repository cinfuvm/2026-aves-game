import { describe, expect, it } from 'vitest';

import {
  calcularDano,
  calcularDanoBase,
  clasificarEfectividad,
  MENSAJE_EFECTIVIDAD,
} from '../src/battle/damage';
import { crearRng } from '../src/battle/rng';
import { CONFIG_BASE, type MovimientoActivo, type Rng, type TipoPPTLS } from '../src/battle/types';

/** Límites del daño base para un HP máximo rival (C1: 10 % a 50 %). */
function limitesBase(hpMaxRival: number): [number, number] {
  return [
    Math.floor(hpMaxRival * CONFIG_BASE.danoBaseMinFrac),
    Math.floor(hpMaxRival * CONFIG_BASE.danoBaseMaxFrac),
  ];
}

/**
 * RNG fijo para forzar un daño base exacto.
 * calcularDanoBase usa enteroAleatorio(rng, min, max) = min + floor(rng × (max − min + 1)),
 * así que un valor en el centro del sub-intervalo de `base` lo fuerza con seguridad.
 */
function rngConBase(base: number, hpMaxRival: number): Rng {
  const [min, max] = limitesBase(hpMaxRival);
  return () => (base - min + 0.5) / (max - min + 1);
}

function mov(tipo: TipoPPTLS, costeMp = 1): MovimientoActivo {
  return { id: 'mov-test', nombre: 'Movimiento', tipo, costeMp };
}

describe('calcularDanoBase', () => {
  it('devuelve enteros en [10 %, 50 %] del HP máximo del rival', () => {
    const rng = crearRng(12345);
    const [min, max] = limitesBase(42);
    for (let i = 0; i < 1000; i++) {
      const dano = calcularDanoBase(42, rng);
      expect(dano).toBeGreaterThanOrEqual(min);
      expect(dano).toBeLessThanOrEqual(max);
      expect(Number.isInteger(dano)).toBe(true);
    }
  });

  it('usa siempre el HP máximo del rival, no el HP actual', () => {
    const rng = crearRng(777);
    const [, max] = limitesBase(50);
    for (let i = 0; i < 500; i++) {
      expect(calcularDanoBase(50, rng)).toBeLessThanOrEqual(max);
    }
  });

  it('nunca produce 0: el mínimo es el 10 % del HP máximo', () => {
    const rng = crearRng(31);
    for (let i = 0; i < 500; i++) {
      expect(calcularDanoBase(20, rng)).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('calcularDano — daño base y multiplicador de esfuerzo', () => {
  it('aplica ×(1 + coste × 0.15) sin STAB ni pasivas', () => {
    // Base 10, coste 2 → 10 × 1.3 = 13. Ave lagarto con movimiento piedra (sin STAB, sin pasiva de daño).
    const detalle = calcularDano(40, mov('piedra', 2), 'lagarto', false, rngConBase(10, 40));
    expect(detalle.danoBase).toBe(10);
    expect(detalle.multiplicadorEsfuerzo).toBe(1.3);
    expect(detalle.aplicaStab).toBe(false);
    expect(detalle.dano).toBe(13);
  });

  it('el daño se redondea hacia abajo a un entero', () => {
    // Base 10, coste 1 → 10 × 1.15 = 11.5 → 11.
    const detalle = calcularDano(40, mov('piedra', 1), 'lagarto', false, rngConBase(10, 40));
    expect(detalle.dano).toBe(11);
  });

  it('con el daño base mínimo (10 % de 40 = 4) el golpe nunca queda en 0', () => {
    // Base 4, coste 3 → 4 × 1.45 = 5.8 → 5.
    const detalle = calcularDano(40, mov('piedra', 3), 'lagarto', false, rngConBase(4, 40));
    expect(detalle.danoBase).toBe(4);
    expect(detalle.dano).toBe(5);
    expect(detalle.clasificacion).toBe('efectivo');
  });

  it('nunca devuelve daño negativo', () => {
    const rng = crearRng(999);
    for (let i = 0; i < 500; i++) {
      const detalle = calcularDano(30, mov('tijera', 5), 'papel', false, rng);
      expect(detalle.dano).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('calcularDano — STAB', () => {
  it('multiplica ×1.5 cuando el tipo del movimiento coincide con el tipo del ave', () => {
    // Base 10, coste 2, STAB → 10 × 1.3 × 1.5 = 19.5 → 19.
    const detalle = calcularDano(40, mov('papel', 2), 'papel', false, rngConBase(10, 40));
    expect(detalle.aplicaStab).toBe(true);
    expect(detalle.dano).toBe(19);
  });

  it('no aplica STAB con tipos distintos', () => {
    const detalle = calcularDano(40, mov('papel', 2), 'piedra', false, rngConBase(10, 40));
    expect(detalle.aplicaStab).toBe(false);
    expect(detalle.dano).toBe(13);
  });
});

describe('calcularDano — pasiva Tijera (+5 al ganar, D-11)', () => {
  it('suma el bonus fijo al ganar, con STAB', () => {
    // Base 10, coste 1, STAB → 10 × 1.15 × 1.5 = 17.25; +5 = 22.25 → 22.
    const detalle = calcularDano(40, mov('tijera', 1), 'tijera', true, rngConBase(10, 40));
    expect(detalle.bonusTijera).toBe(5);
    expect(detalle.dano).toBe(22);
  });

  it('suma el bonus al ganar incluso sin STAB', () => {
    // Base 10, coste 2, sin STAB → 13; +5 = 18.
    const detalle = calcularDano(40, mov('piedra', 2), 'tijera', true, rngConBase(10, 40));
    expect(detalle.bonusTijera).toBe(5);
    expect(detalle.dano).toBe(18);
  });

  it('no aplica el bonus en empate ni al perder el intercambio', () => {
    const perdiendo = calcularDano(40, mov('tijera', 1), 'tijera', false, rngConBase(10, 40));
    expect(perdiendo.bonusTijera).toBe(0);
    // El STAB depende solo de los tipos, no de ganar: 10 × 1.15 × 1.5 = 17.25 → 17.
    expect(perdiendo.dano).toBe(17);
  });
});

describe('calcularDano — pasiva Spock (D-K: sin mínimo de daño)', () => {
  it('no eleva el daño: con base mínima y STAB, el daño es el calculado', () => {
    // Base 4, coste 1, STAB → 4 × 1.15 × 1.5 = 6.9 → 6. Antes había un mínimo del 30 %.
    const detalle = calcularDano(40, mov('spock', 1), 'spock', true, rngConBase(4, 40));
    expect(detalle.aplicaStab).toBe(true);
    expect(detalle.dano).toBe(6);
  });

  it('sin STAB y con base mínima, el daño sigue siendo el calculado', () => {
    // Base 4, coste 1, sin STAB → 4 × 1.15 = 4.6 → 4.
    const detalle = calcularDano(40, mov('piedra', 1), 'spock', true, rngConBase(4, 40));
    expect(detalle.dano).toBe(4);
  });
});

describe('clasificarEfectividad', () => {
  it('clasifica según los límites del PRD (HP máx 40)', () => {
    expect(clasificarEfectividad(0, 40)).toBe('sin-efecto');
    expect(clasificarEfectividad(1, 40)).toBe('efectivo');
    expect(clasificarEfectividad(20, 40)).toBe('efectivo'); // 20 = 50 %, no lo supera
    expect(clasificarEfectividad(21, 40)).toBe('muy-efectivo');
    expect(clasificarEfectividad(40, 40)).toBe('muy-efectivo');
  });

  it('expone los mensajes sugeridos por el PRD', () => {
    expect(MENSAJE_EFECTIVIDAD['sin-efecto']).toBe('El ataque no tuvo efecto');
    expect(MENSAJE_EFECTIVIDAD.efectivo).toBe('El ataque fue efectivo');
    expect(MENSAJE_EFECTIVIDAD['muy-efectivo']).toBe('¡Es muy efectivo!');
  });
});

describe('calcularDano — propiedades generales', () => {
  it('un coste de MP mayor nunca produce menos daño con el mismo base', () => {
    for (const tipoAve of ['piedra', 'papel', 'tijera', 'lagarto', 'spock'] as const) {
      let previo = -1;
      for (let coste = 1; coste <= 5; coste++) {
        const detalle = calcularDano(40, mov(tipoAve, coste), tipoAve, true, rngConBase(10, 40));
        expect(detalle.dano).toBeGreaterThanOrEqual(previo);
        previo = detalle.dano;
      }
    }
  });

  it('el daño nunca supera 50 % del HP máx × esfuerzo máximo × STAB (+ Tijera)', () => {
    const rng = crearRng(4242);
    // HP 30: base máx 15; coste 5 → ×1.75; STAB ×1.5 → 39.375 → 39.
    for (let i = 0; i < 500; i++) {
      const detalle = calcularDano(30, mov('spock', 5), 'spock', true, rng);
      expect(detalle.dano).toBeLessThanOrEqual(39);
    }
  });
});

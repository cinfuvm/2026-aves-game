import { describe, expect, it } from 'vitest';

import {
  calcularDano,
  calcularDanoBase,
  clasificarEfectividad,
  MENSAJE_EFECTIVIDAD,
} from '../src/battle/damage';
import { crearRng } from '../src/battle/rng';
import { CONFIG_BASE, type MovimientoActivo, type Rng, type TipoPPTLS } from '../src/battle/types';

/**
 * RNG fijo para forzar un daño base exacto.
 * calcularDanoBase usa enteroAleatorio(rng, 0, hpMaxRival) = floor(rng × (hpMax + 1)),
 * por lo que un valor en el centro del "sub-intervalo" de `base` lo fuerza con seguridad.
 */
function rngConBase(base: number, hpMaxRival: number): Rng {
  return () => (base + 0.5) / (hpMaxRival + 1);
}

function mov(tipo: TipoPPTLS, costeMp = 1): MovimientoActivo {
  return { id: 'mov-test', nombre: 'Movimiento', tipo, costeMp };
}

describe('calcularDanoBase', () => {
  it('devuelve enteros en [0, hpMaxRival] con un rng determinista', () => {
    const rng = crearRng(12345);
    for (let i = 0; i < 1000; i++) {
      const dano = calcularDanoBase(42, rng);
      expect(dano).toBeGreaterThanOrEqual(0);
      expect(dano).toBeLessThanOrEqual(42);
      expect(Number.isInteger(dano)).toBe(true);
    }
  });

  it('usa siempre el HP máximo del rival, no el HP actual', () => {
    // Con hpMaxRival 50 el rango supera al HP actual de un rival debilitado.
    const rng = crearRng(777);
    for (let i = 0; i < 500; i++) {
      expect(calcularDanoBase(50, rng)).toBeLessThanOrEqual(50);
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

  it('un daño base 0 con un ave sin pasiva de daño queda en 0', () => {
    const detalle = calcularDano(40, mov('piedra', 3), 'lagarto', false, rngConBase(0, 40));
    expect(detalle.dano).toBe(0);
    expect(detalle.clasificacion).toBe('sin-efecto');
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

describe('calcularDano — pasiva Spock (mínimo 30 %, D-09)', () => {
  it('eleva el daño al 30 % del HP máx rival cuando gana con daño base 0', () => {
    // Base 0: sin la pasiva sería «Sin efecto»; la pasiva prevalece (decisión por defecto, D-09).
    const detalle = calcularDano(40, mov('spock', 1), 'spock', true, rngConBase(0, 40));
    expect(detalle.aplicaMinimoSpock).toBe(true);
    expect(detalle.dano).toBe(12); // 40 × 0.3
    expect(detalle.clasificacion).toBe('efectivo');
  });

  it('eleva el daño al mínimo cuando el daño calculado queda debajo', () => {
    // Base 5, coste 1, STAB → 5 × 1.15 × 1.5 = 8.625 < 12 → 12.
    const detalle = calcularDano(40, mov('spock', 1), 'spock', true, rngConBase(5, 40));
    expect(detalle.aplicaMinimoSpock).toBe(true);
    expect(detalle.dano).toBe(12);
  });

  it('no altera un daño que ya supera el mínimo', () => {
    // Base 20, coste 1, STAB → 34.5 ≥ 12 → 34.
    const detalle = calcularDano(40, mov('spock', 1), 'spock', true, rngConBase(20, 40));
    expect(detalle.aplicaMinimoSpock).toBe(false);
    expect(detalle.dano).toBe(34);
  });

  it('no aplica en empate ni al perder el intercambio', () => {
    const empate = calcularDano(40, mov('spock', 1), 'spock', false, rngConBase(0, 40));
    expect(empate.dano).toBe(0);
    expect(empate.clasificacion).toBe('sin-efecto');
  });

  it('se puede desactivar con pasivaSpockActiva (mientras se decide D-09)', () => {
    const config = { ...CONFIG_BASE, pasivaSpockActiva: false };
    const detalle = calcularDano(40, mov('spock', 1), 'spock', true, rngConBase(0, 40), config);
    expect(detalle.aplicaMinimoSpock).toBe(false);
    expect(detalle.dano).toBe(0);
    expect(detalle.clasificacion).toBe('sin-efecto');
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

  it('el daño nunca supera el HP máx del rival + bonus de pasivas', () => {
    const rng = crearRng(4242);
    for (let i = 0; i < 500; i++) {
      const detalle = calcularDano(30, mov('spock', 5), 'spock', true, rng);
      // Sin Spock el máximo sería 30 × 1.75 × 1.5; con el mínimo 30 % acotado, nunca pasa de ese techo.
      expect(detalle.dano).toBeLessThanOrEqual(Math.floor(30 * 1.75 * 1.5));
    }
  });
});

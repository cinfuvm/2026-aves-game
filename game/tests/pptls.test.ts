import { describe, expect, it } from 'vitest';

import { compararPPTLS, ganaPPTLS, mensajePPTLS, PPTLS_TIPOS } from '../src/battle/pptls';
import type { ResultadoPPTLS, TipoPPTLS } from '../src/battle/types';

/**
 * Matriz completa de reglas-batalla.adoc.
 * Filas: tipo del jugador. Columnas: tipo del CPU.
 * 'jugador' = gana el jugador, 'cpu' = gana el CPU, 'empate' = empate.
 */
const MATRIZ_PRD: Record<TipoPPTLS, Record<TipoPPTLS, ResultadoPPTLS>> = {
  piedra: { piedra: 'empate', papel: 'cpu', tijera: 'jugador', lagarto: 'jugador', spock: 'cpu' },
  papel: { piedra: 'jugador', papel: 'empate', tijera: 'cpu', lagarto: 'cpu', spock: 'jugador' },
  tijera: { piedra: 'cpu', papel: 'jugador', tijera: 'empate', lagarto: 'jugador', spock: 'cpu' },
  lagarto: { piedra: 'cpu', papel: 'jugador', tijera: 'cpu', lagarto: 'empate', spock: 'jugador' },
  spock: { piedra: 'jugador', papel: 'cpu', tijera: 'jugador', lagarto: 'cpu', spock: 'empate' },
};

describe('compararPPTLS', () => {
  it('coincide con la matriz completa del PRD (25 combinaciones)', () => {
    for (const tipoJugador of PPTLS_TIPOS) {
      for (const tipoCpu of PPTLS_TIPOS) {
        const esperado = MATRIZ_PRD[tipoJugador][tipoCpu];
        expect(compararPPTLS(tipoJugador, tipoCpu), `${tipoJugador} vs ${tipoCpu}`).toBe(esperado);
      }
    }
  });

  it('cada tipo vence exactamente a 2 tipos y pierde con 2', () => {
    for (const tipo of PPTLS_TIPOS) {
      let gana = 0;
      let pierde = 0;
      let empata = 0;
      for (const otro of PPTLS_TIPOS) {
        const r = compararPPTLS(tipo, otro);
        if (r === 'jugador') gana++;
        else if (r === 'cpu') pierde++;
        else empata++;
      }
      expect(gana, `victorias de ${tipo}`).toBe(2);
      expect(pierde, `derrotas de ${tipo}`).toBe(2);
      expect(empata, `empates de ${tipo}`).toBe(1);
    }
  });

  it('es simétrica: si A vence a B, B pierde con A', () => {
    for (const a of PPTLS_TIPOS) {
      for (const b of PPTLS_TIPOS) {
        const ab = compararPPTLS(a, b);
        const ba = compararPPTLS(b, a);
        if (ab === 'jugador') expect(ba, `${a} vs ${b}`).toBe('cpu');
        if (ab === 'cpu') expect(ba, `${a} vs ${b}`).toBe('jugador');
        if (ab === 'empate') expect(ba, `${a} vs ${b}`).toBe('empate');
      }
    }
  });

  it('los tipos iguales siempre empatan', () => {
    for (const tipo of PPTLS_TIPOS) {
      expect(compararPPTLS(tipo, tipo)).toBe('empate');
    }
  });
});

describe('ganaPPTLS', () => {
  it('es falso en empates y verdadero solo en las 10 ventajas', () => {
    let verdaderos = 0;
    for (const a of PPTLS_TIPOS) {
      for (const b of PPTLS_TIPOS) {
        const esperado = MATRIZ_PRD[a][b] === 'jugador';
        expect(ganaPPTLS(a, b), `${a} > ${b}`).toBe(esperado);
        if (esperado) verdaderos++;
      }
    }
    expect(verdaderos).toBe(10);
  });
});

describe('mensajePPTLS', () => {
  it('usa la regla mnemotécnica del PRD cuando hay ganador', () => {
    const esperados: Array<[TipoPPTLS, TipoPPTLS, string]> = [
      ['piedra', 'tijera', 'Piedra aplasta Tijera'],
      ['papel', 'piedra', 'Papel cubre Piedra'],
      ['tijera', 'lagarto', 'Tijera decapita Lagarto'],
      ['lagarto', 'spock', 'Lagarto envenena Spock'],
      ['spock', 'piedra', 'Spock vaporiza Piedra'],
    ];
    for (const [jugador, cpu, mensaje] of esperados) {
      expect(mensajePPTLS(jugador, cpu)).toBe(mensaje);
      // La misma pareja invertida produce el mismo mensaje (el mensaje no depende
      // de quién ganó, solo de la pareja).
      expect(mensajePPTLS(cpu, jugador)).toBe(mensaje);
    }
  });

  it('todos los pares con ganador tienen mensaje propio', () => {
    for (const a of PPTLS_TIPOS) {
      for (const b of PPTLS_TIPOS) {
        if (a !== b) {
          expect(mensajePPTLS(a, b).length, `${a} vs ${b}`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('los empates usan el plural del tipo ("Choque de piedras")', () => {
    expect(mensajePPTLS('piedra', 'piedra')).toBe('Choque de piedras');
    expect(mensajePPTLS('papel', 'papel')).toBe('Choque de papeles');
    expect(mensajePPTLS('tijera', 'tijera')).toBe('Choque de tijeras');
    expect(mensajePPTLS('lagarto', 'lagarto')).toBe('Choque de lagartos');
    expect(mensajePPTLS('spock', 'spock')).toBe('Choque de spocks');
  });
});

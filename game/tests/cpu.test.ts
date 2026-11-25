import { describe, expect, it } from 'vitest';

import { elegirMovimientoCpu, PERFIL_BASE } from '../src/battle/cpu';
import { aveActiva, inicializarBatalla } from '../src/battle/state';
import { crearRng } from '../src/battle/rng';
import {
  CONFIG_BASE,
  type AveFicha,
  type EstadoBatalla,
  type MovimientoActivo,
  type Rng,
  type TipoPPTLS,
} from '../src/battle/types';

function rngSecuencia(valores: number[]): Rng {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)];
}

function fichaPrueba(id: string, nombre: string, tipo: TipoPPTLS): AveFicha {
  const otros = (['piedra', 'papel', 'tijera', 'lagarto', 'spock'] as TipoPPTLS[]).filter(
    (t) => t !== tipo,
  );
  return {
    id,
    nombre,
    tipo,
    movimientos: [
      { id: `${id}-car`, nombre: `Característico ${tipo}`, tipo, caracteristico: true },
      ...otros.slice(0, 3).map((t) => ({ id: `${id}-${t}`, nombre: `Otro ${t}`, tipo: t })),
    ],
  };
}

const CONDOR = fichaPrueba('condor', 'Cóndor', 'spock');
const LOICA = fichaPrueba('loica', 'Loica', 'lagarto');
const CHINCOL = fichaPrueba('chincol', 'Chincol', 'papel');
const PIKAFLOR = fichaPrueba('picaflor', 'Picaflor', 'piedra');
const DIUCON = fichaPrueba('diucon', 'Diucón', 'tijera');
const CHERCAN = fichaPrueba('chercan', 'Chercán', 'spock');

function mov(tipo: TipoPPTLS, costeMp = 1): MovimientoActivo {
  return { id: `m-${tipo}-${costeMp}`, nombre: `${tipo} ${costeMp}`, tipo, costeMp };
}

/** Batalla 3v3 con movimientos y MP controlados para el primer ave del CPU. */
function estado3v3(movsCpu: MovimientoActivo[], mpCpu = 15): EstadoBatalla {
  const estado = inicializarBatalla(
    [CONDOR, LOICA, CHINCOL],
    [PIKAFLOR, DIUCON, CHERCAN],
    crearRng(2),
  );
  estado.cpu.aves[0].movimientos = movsCpu.map((m) => ({ ...m }));
  estado.cpu.aves[0].mpActual = mpCpu;
  return estado;
}

describe('elegirMovimientoCpu — nivel base (aleatorio uniforme)', () => {
  it('nunca elige un movimiento bloqueado por MP insuficiente', () => {
    const estado = estado3v3(
      [mov('piedra', 2), mov('tijera', 4), mov('papel', 1), mov('spock', 3)],
      3, // tijera (coste 4 > 3) queda bloqueada; los demás son usables
    );
    const rng = crearRng(42);
    for (let i = 0; i < 500; i++) {
      const eleccion = elegirMovimientoCpu(estado, rng);
      expect(eleccion).not.toBeNull();
      expect(eleccion!.costeMp).toBeLessThanOrEqual(3);
      expect(eleccion!.id).not.toBe('m-tijera-4');
    }
  });

  it('puede elegir entre todos los movimientos usables a lo largo de turnos', () => {
    const estado = estado3v3(
      [mov('piedra', 2), mov('tijera', 4), mov('papel', 1), mov('spock', 3)],
      15, // todos los movimientos son usables
    );
    const ids = new Set<string>();
    const rng = crearRng(42);
    for (let i = 0; i < 500; i++) {
      const eleccion = elegirMovimientoCpu(estado, rng);
      expect(eleccion).not.toBeNull();
      ids.add(eleccion!.id);
    }
    expect(ids.size).toBe(4);
  });

  it('respeta el MP: con MP 0 devuelve null (CPU no puede jugar)', () => {
    const estado = estado3v3([mov('piedra', 1), mov('tijera', 2)], 0);
    expect(elegirMovimientoCpu(estado, crearRng(1))).toBeNull();
  });

  it('devuelve un movimiento que pertenece al ave activa del CPU', () => {
    const estado = estado3v3([mov('piedra', 2), mov('tijera', 1)]);
    for (let seed = 1; seed <= 50; seed++) {
      const eleccion = elegirMovimientoCpu(estado, crearRng(seed));
      expect(
        estado.cpu.aves[estado.cpu.indiceActiva].movimientos.some((m) => m.id === eleccion!.id),
      ).toBe(true);
    }
  });

  it('usa el ave activa actual (tras un relevo elige del nuevo ave)', () => {
    const estado = estado3v3([mov('piedra', 2), mov('tijera', 1)]);
    estado.cpu.indiceActiva = 1; // Diucón
    estado.cpu.aves[1].mpActual = 2;
    estado.cpu.aves[1].movimientos = [mov('spock', 3), mov('papel', 1)];

    for (let seed = 1; seed <= 50; seed++) {
      const eleccion = elegirMovimientoCpu(estado, crearRng(seed));
      // El spock (3) excede el MP del Diucón (2): nunca debe salir.
      expect(eleccion!.id).not.toBe('m-spock-3');
      expect(
        estado.cpu.aves[1].movimientos.some((m) => m.id === eleccion!.id),
      ).toBe(true);
    }
  });

  it('es determinista con la misma semilla', () => {
    const estado = estado3v3([mov('piedra', 2), mov('tijera', 1), mov('papel', 1), mov('spock', 3)]);
    const a = elegirMovimientoCpu(estado, crearRng(77));
    const b = elegirMovimientoCpu(estado, crearRng(77));
    expect(a!.id).toBe(b!.id);
  });
});

describe('elegirMovimientoCpu — interfaz del perfil (extensión Parte C)', () => {
  it('funciona sin pasar perfil (usa PERFIL_BASE)', () => {
    const estado = estado3v3([mov('piedra', 2), mov('tijera', 1)]);
    expect(elegirMovimientoCpu(estado, rngSecuencia([0.99]))!.id).toBe('m-tijera-1');
  });

  it('acepta el perfil base explícito con el mismo resultado', () => {
    const estado = estado3v3([mov('piedra', 2), mov('tijera', 1)]);
    const a = elegirMovimientoCpu(estado, crearRng(42));
    const b = elegirMovimientoCpu(estado, crearRng(42), PERFIL_BASE);
    expect(a!.id).toBe(b!.id);
  });

  it('con un solo movimiento usable lo devuelve siempre, sin importar el rng', () => {
    const estado = estado3v3([mov('papel', 1)], 3);
    for (const valor of [0, 0.5, 0.999]) {
      expect(elegirMovimientoCpu(estado, rngSecuencia([valor]))!.id).toBe('m-papel-1');
    }
  });

  it('un movimiento bloqueado a medio combate deja de ser elegible', () => {
    // MP 2: piedra (2) y tijera (1) usables; papel... solo 3 movimientos con costes 2/1/3.
    const estado = estado3v3(
      [mov('piedra', 2), mov('tijera', 1), mov('spock', 3)],
      2,
    );
    for (let seed = 1; seed <= 100; seed++) {
      const eleccion = elegirMovimientoCpu(estado, crearRng(seed));
      expect(eleccion!.id).not.toBe('m-spock-3');
    }
  });
});

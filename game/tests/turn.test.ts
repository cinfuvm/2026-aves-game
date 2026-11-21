import { describe, expect, it } from 'vitest';

import { resolverTurno } from '../src/battle/turn';
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

/** RNG de secuencia fija: devuelve los valores en orden (repite el último). */
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
      { id: `${id}-propio`, nombre: `Propio ${tipo}`, tipo },
      ...otros.map((t) => ({ id: `${id}-${t}`, nombre: `Otro ${t}`, tipo: t })),
    ],
  };
}

const CONDOR = fichaPrueba('condor', 'Cóndor', 'spock');
const LOICA = fichaPrueba('loica', 'Loica', 'lagarto');
const CHINCOL = fichaPrueba('chincol', 'Chincol', 'papel');
const PIKAFLOR = fichaPrueba('picaflor', 'Picaflor', 'piedra');
const DIUCON = fichaPrueba('diucon', 'Diucón', 'tijera');
const CHERCAN = fichaPrueba('chercan', 'Chercán', 'spock');
const GAVILAN = fichaPrueba('gavilan', 'Gavilán', 'piedra');

const config1v1 = { ...CONFIG_BASE, modo: '1v1' as const };

function mov(tipo: TipoPPTLS, costeMp = 1): MovimientoActivo {
  return { id: `m-${tipo}-${costeMp}`, nombre: `${tipo} ${costeMp}`, tipo, costeMp };
}

/**
 * Batalla 1v1 con fichas, movimientos y estadísticas controladas
 * (HP 40, MP 15 en ambos lados) para poder verificar números exactos.
 */
function armar1v1(
  fichaJugador: AveFicha,
  fichaCpu: AveFicha,
  movsJugador: MovimientoActivo[],
  movsCpu: MovimientoActivo[],
): EstadoBatalla {
  const estado = inicializarBatalla([fichaJugador], [fichaCpu], crearRng(1), config1v1);
  for (const lado of [estado.jugador, estado.cpu]) {
    lado.aves[0].hpMax = 40;
    lado.aves[0].hpActual = 40;
    lado.aves[0].mpActual = 15;
  }
  estado.jugador.aves[0].movimientos = movsJugador.map((m) => ({ ...m }));
  estado.cpu.aves[0].movimientos = movsCpu.map((m) => ({ ...m }));
  return estado;
}

/**
 * Batalla 3v3 con movimientos y MP controlados para el primer ave de cada equipo
 * (HP máx y actual fijados a 40). Permite elegir las fichas para controlar pasivas.
 */
function preparar3v3(
  movsJugador: MovimientoActivo[],
  movsCpu: MovimientoActivo[],
  mpJugador = 15,
  mpCpu = 15,
  fichasJugador: AveFicha[] = [CONDOR, LOICA, CHINCOL],
  fichasCpu: AveFicha[] = [PIKAFLOR, DIUCON, CHERCAN],
): EstadoBatalla {
  const estado = inicializarBatalla(fichasJugador, fichasCpu, crearRng(2));
  for (const lado of [estado.jugador, estado.cpu]) {
    lado.aves[0].hpMax = 40;
    lado.aves[0].hpActual = 40;
  }
  estado.jugador.aves[0].movimientos = movsJugador.map((m) => ({ ...m }));
  estado.cpu.aves[0].movimientos = movsCpu.map((m) => ({ ...m }));
  estado.jugador.aves[0].mpActual = mpJugador;
  estado.cpu.aves[0].mpActual = mpCpu;
  return estado;
}

describe('validaciones de resolverTurno', () => {
  it('rechaza un movimiento que no pertenece al ave activa', () => {
    const estado = armar1v1(CONDOR, GAVILAN, [mov('piedra', 2)], [mov('tijera', 1)]);
    expect(() =>
      resolverTurno(estado, mov('lagarto', 1), estado.cpu.aves[0].movimientos[0], crearRng(1)),
    ).toThrow(/no pertenece/i);
  });

  it('rechaza un movimiento bloqueado por MP insuficiente', () => {
    const estado = armar1v1(CONDOR, GAVILAN, [mov('piedra', 2)], [mov('tijera', 1)]);
    estado.jugador.aves[0].mpActual = 1; // piedra cuesta 2
    expect(() =>
      resolverTurno(
        estado,
        estado.jugador.aves[0].movimientos[0],
        estado.cpu.aves[0].movimientos[0],
        crearRng(1),
      ),
    ).toThrow(/bloqueado/i);
  });

  it('rechaza turnos sobre una batalla terminada', () => {
    const estado = armar1v1(CONDOR, GAVILAN, [mov('piedra', 2)], [mov('tijera', 1)]);
    estado.terminada = true;
    estado.ganador = 'jugador';
    expect(() =>
      resolverTurno(
        estado,
        estado.jugador.aves[0].movimientos[0],
        estado.cpu.aves[0].movimientos[0],
        crearRng(1),
      ),
    ).toThrow(/terminó/i);
  });
});

describe('resolución básica del intercambio', () => {
  it('gana el jugador: solo el CPU recibe daño, con números exactos', () => {
    // Jugador Loica (lagarto, sin pasiva de daño) usa Piedra (coste 2) vs Tijera.
    // Base 10 → 10 × 1.3 = 13. Sin STAB (lagarto ≠ piedra).
    const estado = armar1v1(LOICA, GAVILAN, [mov('piedra', 2)], [mov('tijera', 1)]);
    const { estado: nuevo, entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.25]), // base = floor(0.25 × 41) = 10
    );

    expect(entrada.resultado).toBe('jugador');
    expect(entrada.danoAlCpu).toBe(13);
    expect(entrada.danoAlJugador).toBe(0);
    expect(aveActiva(nuevo.cpu).hpActual).toBe(27);
    expect(aveActiva(nuevo.jugador).hpActual).toBe(40);
    expect(aveActiva(nuevo.jugador).mpActual).toBe(13); // 15 − 2
    expect(aveActiva(nuevo.cpu).mpActual).toBe(14); // 15 − 1
    expect(entrada.mensaje).toContain('Piedra aplasta Tijera');
    expect(entrada.mensaje).toContain('El ataque fue efectivo');
    expect(entrada.turno).toBe(1);
    expect(nuevo.turno).toBe(1);
    expect(nuevo.historial).toHaveLength(1);
    expect(nuevo.terminada).toBe(false);
  });

  it('gana el CPU: solo el jugador recibe daño', () => {
    // Jugador Cóndor (spock; pierde el intercambio, su pasiva no aplica).
    // CPU Chincol (papel) usa Piedra (sin STAB, sin pasivas de daño). Base 4 → 4 × 1.15 = 4.6 → 4.
    // La tirada de la pasiva papel del CPU (0.9 ≥ 0.25) paga el coste completo.
    const estado = armar1v1(CONDOR, CHINCOL, [mov('tijera', 1)], [mov('piedra', 1)]);
    const { estado: nuevo, entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.9, 0.1]), // 1: tirada papel CPU; 2: daño base = floor(0.1 × 41) = 4
    );

    expect(entrada.resultado).toBe('cpu');
    expect(entrada.danoAlJugador).toBe(4);
    expect(entrada.danoAlCpu).toBe(0);
    expect(aveActiva(nuevo.jugador).hpActual).toBe(36);
    expect(aveActiva(nuevo.cpu).hpActual).toBe(40);
    expect(entrada.mensaje).toContain('El ataque fue efectivo');
  });

  it('empate PPTLS: ambos bandos se dañan (D-02)', () => {
    // Ambos usan Piedra con aves no piedra (sin STAB).
    // Jugador base 20 (×1.15 = 23), CPU base 4 (×1.15 = 4).
    const estado = armar1v1(CONDOR, DIUCON, [mov('piedra', 1)], [mov('piedra', 1)]);
    const { estado: nuevo, entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.5, 0.1]), // jugador: floor(0.5×41)=20; cpu: floor(0.1×41)=4
    );

    expect(entrada.resultado).toBe('empate');
    expect(entrada.danoAlCpu).toBe(23);
    expect(entrada.danoAlJugador).toBe(4);
    expect(aveActiva(nuevo.cpu).hpActual).toBe(17);
    expect(aveActiva(nuevo.jugador).hpActual).toBe(36);
    expect(entrada.mensaje).toContain('Choque de piedras');
    expect(entrada.mpGastadoJugador).toBe(1);
    expect(entrada.mpGastadoCpu).toBe(1);
  });
});

describe('pasiva Papel (25 % de coste 0)', () => {
  it('con tirada baja el movimiento no consume MP', () => {
    // Jugador Chincol (papel, coste 3), tirada 0.1 < 0.25 → coste 0.
    // El CPU Gavilán (piedra, sin pasiva de daño) gana con Tijera: base 10 → 11.
    const estado = armar1v1(CHINCOL, GAVILAN, [mov('papel', 3)], [mov('tijera', 1)]);
    const { estado: nuevo, entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.1, 0.25]), // 1: tirada papel jugador; 2: daño CPU base 10 → 11
    );

    expect(entrada.mpGastadoJugador).toBe(0);
    expect(aveActiva(nuevo.jugador).mpActual).toBe(15);
    expect(entrada.mpGastadoCpu).toBe(1);
    expect(entrada.danoAlJugador).toBe(11);
    expect(entrada.eventos.some((e) => e.includes('pasiva de papel'))).toBe(true);
  });

  it('con tirada alta paga el coste completo', () => {
    const estado = armar1v1(CHINCOL, GAVILAN, [mov('papel', 3)], [mov('tijera', 1)]);
    const { entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.9, 0.25]),
    );
    expect(entrada.mpGastadoJugador).toBe(3);
  });

  it('la pasiva es del ave (tipo papel), no del movimiento: con movimiento de otro tipo también tira', () => {
    // Chincol (papel) usa Piedra (coste 2) y gana: sin STAB, sin pasivas de daño.
    // Tirada 0.1 → coste 0; daño base 20 × 1.3 = 26.
    const estado = armar1v1(CHINCOL, GAVILAN, [mov('piedra', 2)], [mov('tijera', 1)]);
    const { estado: nuevo, entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.1, 0.5]),
    );

    expect(entrada.mpGastadoJugador).toBe(0);
    expect(aveActiva(nuevo.jugador).mpActual).toBe(15);
    expect(entrada.danoAlCpu).toBe(26);
  });

  it('un ave de tipo no papel no tira (no consume la primera tirada del rng)', () => {
    // Jugador Loica (lagarto) gana con Piedra: base 2 × 1.3 = 2.6 → 2.
    // Si un ave no papel consumiera una tirada, el daño sería otro número.
    const estado = preparar3v3(
      [mov('piedra', 2)],
      [mov('tijera', 1)],
      15,
      15,
      [LOICA, CONDOR, CHINCOL],
    );
    const { entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.05]), // daño base floor(0.05 × 41) = 2
    );
    expect(entrada.resultado).toBe('jugador');
    expect(entrada.danoAlCpu).toBe(2);
  });
});

describe('pasiva Lagarto (+3 HP al final del turno)', () => {
  it('regenera con tope en el HP máx y registra el evento', () => {
    // CPU Loica (lagarto) con HP 39: +3 quedaría en 42 → tope 40 (recupera 1).
    const estado = armar1v1(PIKAFLOR, LOICA, [mov('piedra', 1)], [mov('tijera', 1)]);
    estado.cpu.aves[0].hpActual = 39;

    const { estado: nuevo, entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.0001]), // base 0 → daño 0 (sin efecto)
    );

    expect(aveActiva(nuevo.cpu).hpActual).toBe(40);
    expect(
      entrada.eventos.some((e) => e.includes('pasiva lagarto') && e.includes('recupera 1')),
    ).toBe(true);
  });

  it('regenera 3 HP si hay espacio', () => {
    const estado = armar1v1(PIKAFLOR, LOICA, [mov('piedra', 1)], [mov('tijera', 1)]);
    estado.cpu.aves[0].hpActual = 30;

    const { estado: nuevo } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.0001]),
    );
    expect(aveActiva(nuevo.cpu).hpActual).toBe(33);
  });

  it('no revive a un ave debilitada en ese turno', () => {
    const estado = armar1v1(PIKAFLOR, LOICA, [mov('piedra', 1)], [mov('tijera', 1)]);
    estado.cpu.aves[0].hpActual = 1;

    const { estado: nuevo, entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.5]), // base 20 × 1.15 × 1.5 (STAB) = 34.5 → 34 → hp 0
    );

    expect(entrada.danoAlCpu).toBe(34);
    expect(nuevo.cpu.aves[0].estado).toBe('debilitada');
    expect(nuevo.cpu.aves[0].hpActual).toBe(0);
    expect(entrada.eventos.some((e) => e.includes('pasiva lagarto'))).toBe(false);
  });

  it('un ave de otro tipo no regenera', () => {
    // Jugador Picaflor (piedra) recibe 0 de daño y no regenera.
    const estado = armar1v1(PIKAFLOR, GAVILAN, [mov('piedra', 1)], [mov('tijera', 1)]);
    estado.jugador.aves[0].hpActual = 30;

    const { estado: nuevo, entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.0001]),
    );
    expect(aveActiva(nuevo.jugador).hpActual).toBe(30);
    expect(entrada.eventos.some((e) => e.includes('pasiva lagarto'))).toBe(false);
  });
});

describe('salidas, relevo y fin de batalla', () => {
  it('CB-03: el daño supera el HP actual → HP 0, debilitada y fin en 1v1', () => {
    const estado = armar1v1(PIKAFLOR, LOICA, [mov('piedra', 1)], [mov('tijera', 1)]);
    estado.cpu.aves[0].hpActual = 5;

    const { estado: nuevo, entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.9]), // base 36 × 1.15 × 1.5 (STAB) = 62.1 → 62
    );

    expect(entrada.danoAlCpu).toBe(62);
    expect(nuevo.cpu.aves[0].hpActual).toBe(0);
    expect(nuevo.cpu.aves[0].estado).toBe('debilitada');
    expect(nuevo.terminada).toBe(true);
    expect(nuevo.ganador).toBe('jugador');
    expect(entrada.eventos).toContain('Fin de la batalla: gana el jugador');
  });

  it('CB-05: HP 0 y sin movimientos usables → prioriza debilitamiento', () => {
    // Tras pagar el MP el jugador queda con 0 y su único movimiento no es usable,
    // pero el ave cayó por HP: debe marcarse 'debilitada', no 'rendida'.
    const estado = armar1v1(CONDOR, GAVILAN, [mov('tijera', 2)], [mov('piedra', 1)]);
    estado.jugador.aves[0].mpActual = 2; // paga 2 → MP 0 → sin movimientos usables
    estado.jugador.aves[0].hpActual = 5;

    const { estado: nuevo } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.1341]), // base 5 → 5.75 → 5 → hp 0
    );

    expect(nuevo.jugador.aves[0].estado).toBe('debilitada');
    expect(nuevo.jugador.aves[0].mpActual).toBe(0);
    expect(nuevo.terminada).toBe(true);
    expect(nuevo.ganador).toBe('cpu');
  });

  it('D-07: sin movimientos usables por MP → rendida y relevo en 3v3', () => {
    // El jugador gana el intercambio con daño 0 pero agota su MP.
    const estado = preparar3v3(
      [mov('piedra', 2)],
      [mov('tijera', 1)],
      2,
      15,
      [PIKAFLOR, LOICA, CHINCOL],
    );

    const { estado: nuevo, entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.0001]), // base 0 → sin efecto
    );

    expect(entrada.danoAlCpu).toBe(0);
    expect(nuevo.jugador.aves[0].estado).toBe('rendida');
    expect(entrada.eventos.some((e) => e.includes('se rinde'))).toBe(true);
    expect(nuevo.jugador.indiceActiva).toBe(1);
    expect(entrada.eventos.some((e) => e.startsWith('Entra Loica'))).toBe(true);
    expect(nuevo.terminada).toBe(false);
  });

  it('CB-08: ambos equipos sin aves en el mismo turno → empate técnico', () => {
    // Jugador con HP 1 cae con el daño del CPU; el CPU queda sin MP y se rinde.
    const estado = armar1v1(CONDOR, GAVILAN, [mov('tijera', 1)], [mov('piedra', 1)]);
    estado.jugador.aves[0].hpActual = 1;
    estado.cpu.aves[0].mpActual = 1;

    const { estado: nuevo } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.05]), // base 2 → 2.3 → 2 → jugador hp 0
    );

    expect(nuevo.jugador.aves[0].estado).toBe('debilitada');
    expect(nuevo.cpu.aves[0].estado).toBe('rendida'); // MP 0, sin movimientos usables
    expect(nuevo.terminada).toBe(true);
    expect(nuevo.ganador).toBe('empate');
  });

  it('el CPU debilitado dispara el relevo del siguiente ave del equipo', () => {
    const estado = preparar3v3([mov('piedra', 1)], [mov('tijera', 1)]);
    estado.cpu.aves[0].hpActual = 3;

    const { estado: nuevo, entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.3]), // base 12 × 1.15 = 13.8 → 13 (≥ 12: no aplica el mínimo de Spock)
    );

    expect(entrada.danoAlCpu).toBe(13);
    expect(nuevo.cpu.aves[0].estado).toBe('debilitada');
    expect(nuevo.cpu.indiceActiva).toBe(1);
    expect(aveActiva(nuevo.cpu).id).toBe('diucon');
    expect(nuevo.terminada).toBe(false);
  });
});

describe('historial e inmutabilidad', () => {
  it('acumula entradas y avanza el turno', () => {
    const estado = armar1v1(LOICA, GAVILAN, [mov('piedra', 2)], [mov('tijera', 1)]);
    const { estado: trasTurno1 } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.25]),
    );
    const { estado: trasTurno2, entrada } = resolverTurno(
      trasTurno1,
      trasTurno1.jugador.aves[0].movimientos[0],
      trasTurno1.cpu.aves[0].movimientos[0],
      rngSecuencia([0.25]),
    );

    expect(trasTurno2.turno).toBe(2);
    expect(entrada.turno).toBe(2);
    expect(trasTurno2.historial).toHaveLength(2);
    expect(trasTurno1.historial[0].mpGastadoJugador).toBe(2);
    expect(trasTurno1.historial[0].mpGastadoCpu).toBe(1);
  });

  it('la entrada de historial incluye los movimientos usados', () => {
    const estado = armar1v1(LOICA, GAVILAN, [mov('piedra', 2)], [mov('tijera', 1)]);
    const { entrada } = resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.25]),
    );
    expect(entrada.movJugador.tipo).toBe('piedra');
    expect(entrada.movCpu.tipo).toBe('tijera');
    expect(entrada.mensaje.length).toBeGreaterThan(0);
    expect(Array.isArray(entrada.eventos)).toBe(true);
  });

  it('no muta el estado original (copia profunda)', () => {
    const estado = armar1v1(LOICA, GAVILAN, [mov('piedra', 2)], [mov('tijera', 1)]);
    const antes = JSON.stringify(estado);
    resolverTurno(
      estado,
      estado.jugador.aves[0].movimientos[0],
      estado.cpu.aves[0].movimientos[0],
      rngSecuencia([0.9]),
    );
    expect(JSON.stringify(estado)).toBe(antes);
  });
});

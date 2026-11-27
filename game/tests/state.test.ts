import { describe, expect, it } from 'vitest';

import {
  avesDisponibles,
  aveActiva,
  estaBloqueado,
  evaluarFin,
  inicializarAve,
  inicializarBatalla,
  inicializarEquipo,
  movimientosUsables,
  seleccionarMovimientos,
  siguienteAve,
  tieneMovimientoUsable,
  validarFicha,
} from '../src/battle/state';
import { crearRng } from '../src/battle/rng';
import {
  CONFIG_BASE,
  type AveFicha,
  type EstadoBatalla,
  type MovimientoActivo,
  type TipoPPTLS,
} from '../src/battle/types';

/** Ficha de prueba: 1 movimiento característico del tipo propio + 3 predeterminados de otros tipos. */
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

describe('validarFicha', () => {
  it('acepta una ficha con 4 movimientos y un característico del tipo propio', () => {
    expect(validarFicha(CONDOR)).toEqual([]);
  });

  it('rechaza fichas con menos (o más) de 4 movimientos', () => {
    const corta: AveFicha = { ...CONDOR, movimientos: CONDOR.movimientos.slice(0, 3) };
    expect(validarFicha(corta).some((e) => e.includes('4 movimientos'))).toBe(true);

    const larga: AveFicha = {
      ...CONDOR,
      movimientos: [...CONDOR.movimientos, { id: 'extra', nombre: 'Extra', tipo: 'piedra' }],
    };
    expect(validarFicha(larga).some((e) => e.includes('4 movimientos'))).toBe(true);
  });

  it('rechaza fichas sin movimiento característico', () => {
    const sinCaracteristico: AveFicha = {
      ...CONDOR,
      movimientos: CONDOR.movimientos.map((m) => ({ ...m, caracteristico: false })),
    };
    expect(validarFicha(sinCaracteristico).some((e) => e.includes('característico'))).toBe(true);
  });

  it('rechaza fichas cuyo característico no es del tipo propio', () => {
    const malTipo: AveFicha = {
      ...CONDOR,
      movimientos: CONDOR.movimientos.map((m) =>
        m.caracteristico ? { ...m, tipo: 'piedra' as const } : m,
      ),
    };
    const errores = validarFicha(malTipo);
    expect(errores.some((e) => e.includes('tipo propio'))).toBe(true);
  });

  it('rechaza ids de movimiento duplicados', () => {
    const duplicada: AveFicha = {
      ...CONDOR,
      movimientos: [...CONDOR.movimientos.slice(0, 3), CONDOR.movimientos[0]],
    };
    const errores = validarFicha(duplicada);
    expect(errores.some((e) => e.includes('duplicado'))).toBe(true);
  });
});

describe('seleccionarMovimientos', () => {
  it('devuelve los 4 movimientos de la ficha, en el mismo orden, sin sortear', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const activos = seleccionarMovimientos(CONDOR, crearRng(seed));
      expect(activos.map((m) => m.id)).toEqual(CONDOR.movimientos.map((m) => m.id));
    }
  });

  it('el movimiento característico siempre está activo', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const activos = seleccionarMovimientos(LOICA, crearRng(seed));
      expect(activos[0].id).toBe('loica-car');
      expect(activos.filter((m) => m.tipo === LOICA.tipo)).toHaveLength(1);
    }
  });

  it('asigna un coste de MP dentro del rango configurado (1 a 3)', () => {
    const rng = crearRng(7);
    for (let i = 0; i < 100; i++) {
      for (const activo of seleccionarMovimientos(CHINCOL, rng)) {
        expect(activo.costeMp).toBeGreaterThanOrEqual(CONFIG_BASE.costeMpRango[0]);
        expect(activo.costeMp).toBeLessThanOrEqual(CONFIG_BASE.costeMpRango[1]);
        expect(Number.isInteger(activo.costeMp)).toBe(true);
      }
    }
  });

  it('rechaza fichas inválidas al seleccionar', () => {
    const invalida: AveFicha = { ...CONDOR, movimientos: CONDOR.movimientos.slice(0, 3) };
    expect(() => seleccionarMovimientos(invalida, crearRng(1))).toThrow(/rechazada/i);
  });

  it('mantiene el nombre y el tipo de la ficha', () => {
    const activos: MovimientoActivo[] = seleccionarMovimientos(PIKAFLOR, crearRng(3));
    for (const activo of activos) {
      const fichaMov = PIKAFLOR.movimientos.find((m) => m.id === activo.id)!;
      expect(activo.nombre).toBe(fichaMov.nombre);
      expect(activo.tipo).toBe(fichaMov.tipo);
    }
  });
});

describe('inicializarAve (vida por nivel, C9)', () => {
  it('HP máx entre 30 y 50 en nivel 0; HP actual igual al HP máx', () => {
    const rng = crearRng(2026);
    for (let i = 0; i < 100; i++) {
      const ave = inicializarAve(LOICA, rng);
      expect(ave.hpMax).toBeGreaterThanOrEqual(30);
      expect(ave.hpMax).toBeLessThanOrEqual(50);
      expect(ave.hpActual).toBe(ave.hpMax);
      expect(ave.estado).toBe('activa');
    }
  });

  it('suma 10 × nivel al rango: nivel 3 da entre 60 y 80', () => {
    const rng = crearRng(99);
    for (let i = 0; i < 100; i++) {
      const ave = inicializarAve(LOICA, rng, CONFIG_BASE, 3);
      expect(ave.hpMax).toBeGreaterThanOrEqual(60);
      expect(ave.hpMax).toBeLessThanOrEqual(80);
    }
  });

  it('la pasiva Piedra usa el rango 40–50, y el nivel se suma encima', () => {
    const rng = crearRng(2026);
    for (let i = 0; i < 100; i++) {
      expect(inicializarAve(PIKAFLOR, rng).hpMax).toBeGreaterThanOrEqual(40);
      expect(inicializarAve(PIKAFLOR, rng).hpMax).toBeLessThanOrEqual(50);
    }
    const conNivel = inicializarAve(PIKAFLOR, crearRng(5), CONFIG_BASE, 2);
    expect(conNivel.hpMax).toBeGreaterThanOrEqual(60);
    expect(conNivel.hpMax).toBeLessThanOrEqual(70);
  });

  it('MP compartido inicial igual a mpInicial (20)', () => {
    const ave = inicializarAve(CHINCOL, crearRng(9));
    expect(ave.mpMax).toBe(20);
    expect(ave.mpActual).toBe(20);
    expect(ave.movimientos).toHaveLength(4);
  });

  it('es determinista con la misma semilla', () => {
    const a = inicializarAve(DIUCON, crearRng(314));
    const b = inicializarAve(DIUCON, crearRng(314));
    expect(a).toEqual(b);
  });
});

describe('inicializarEquipo / inicializarBatalla', () => {
  it('valida la cantidad de aves según el modo', () => {
    expect(() => inicializarEquipo([CONDOR, LOICA], crearRng(1), CONFIG_BASE)).toThrow(/3 aves/);

    const config1v1 = { ...CONFIG_BASE, modo: '1v1' as const };
    expect(() => inicializarEquipo([CONDOR, LOICA], crearRng(1), config1v1)).toThrow(/1 aves/);
  });

  it('crea el estado inicial completo (3v3)', () => {
    const rng = crearRng(100);
    const estado = inicializarBatalla([CONDOR, LOICA, CHINCOL], [PIKAFLOR, DIUCON, LOICA], rng);

    expect(estado.jugador.aves).toHaveLength(3);
    expect(estado.cpu.aves).toHaveLength(3);
    expect(estado.jugador.indiceActiva).toBe(0);
    expect(estado.cpu.indiceActiva).toBe(0);
    expect(estado.turno).toBe(0);
    expect(estado.historial).toEqual([]);
    expect(estado.terminada).toBe(false);
    expect(estado.ganador).toBeNull();
    expect(estado.config).toEqual(CONFIG_BASE);
    expect(aveActiva(estado.jugador).id).toBe('condor');
    expect(aveActiva(estado.cpu).id).toBe('picaflor');
  });

  it('aplica el nivel de cada bando: el del jugador y el de la CPU', () => {
    const config = { ...CONFIG_BASE, modo: '1v1' as const, nivelJugador: 2, nivelCpu: 5 };
    const estado = inicializarBatalla([CONDOR], [LOICA], crearRng(5), config);
    expect(aveActiva(estado.jugador).hpMax).toBeGreaterThanOrEqual(50);
    expect(aveActiva(estado.jugador).hpMax).toBeLessThanOrEqual(70);
    expect(aveActiva(estado.cpu).hpMax).toBeGreaterThanOrEqual(80);
    expect(aveActiva(estado.cpu).hpMax).toBeLessThanOrEqual(100);
  });

  it('funciona en modo 1v1 (ejecutable mínimo)', () => {
    const config1v1 = { ...CONFIG_BASE, modo: '1v1' as const };
    const estado = inicializarBatalla([CONDOR], [LOICA], crearRng(5), config1v1);
    expect(estado.jugador.aves).toHaveLength(1);
    expect(estado.cpu.aves).toHaveLength(1);
  });

  it('propaga el rechazo de fichas inválidas', () => {
    const invalida: AveFicha = { ...CONDOR, movimientos: CONDOR.movimientos.slice(0, 3) };
    expect(() =>
      inicializarBatalla([invalida, LOICA, CHINCOL], [PIKAFLOR, DIUCON, LOICA], crearRng(1)),
    ).toThrow(/rechazada/i);
  });
});

describe('bloqueo por MP insuficiente', () => {
  const aveConMp = (mp: number): ReturnType<typeof inicializarAve> => ({
    ...inicializarAve(CONDOR, crearRng(1)),
    mpActual: mp,
  });

  it('bloquea movimientos cuyo coste supera el MP restante', () => {
    const ave = aveConMp(2);
    for (const mov of ave.movimientos) {
      expect(estaBloqueado(mov, ave)).toBe(mov.costeMp > 2);
    }
    expect(movimientosUsables(ave).every((m) => m.costeMp <= 2)).toBe(true);
  });

  it('detecta cuando ningún movimiento es usable', () => {
    const ave = aveConMp(0);
    expect(tieneMovimientoUsable(ave)).toBe(false);
  });

  it('con MP suficiente (coste máximo 3) ningún movimiento está bloqueado', () => {
    const ave = aveConMp(20);
    expect(movimientosUsables(ave)).toHaveLength(4);
  });
});

describe('siguienteAve / avesDisponibles', () => {
  it('devuelve la primera ave activa del equipo (relevo en orden)', () => {
    const rng = crearRng(11);
    const equipo = inicializarEquipo([CONDOR, LOICA, CHINCOL], rng);
    equipo.aves[0].estado = 'debilitada';
    expect(siguienteAve(equipo)).toBe(1);
    expect(avesDisponibles(equipo)).toBe(2);
  });

  it('devuelve -1 cuando no quedan aves activas', () => {
    const rng = crearRng(12);
    const equipo = inicializarEquipo([CONDOR, LOICA, CHINCOL], rng);
    for (const ave of equipo.aves) ave.estado = 'debilitada';
    expect(siguienteAve(equipo)).toBe(-1);
    expect(avesDisponibles(equipo)).toBe(0);
  });
});

describe('evaluarFin', () => {
  function estadoCon(
    estadosJugador: Array<'activa' | 'debilitada' | 'rendida'>,
    estadosCpu: Array<'activa' | 'debilitada' | 'rendida'>,
  ): EstadoBatalla {
    const estado = inicializarBatalla(
      [CONDOR, LOICA, CHINCOL],
      [PIKAFLOR, DIUCON, fichaPrueba('chercan', 'Chercán', 'spock')],
      crearRng(13),
    );
    estado.jugador.aves.forEach((ave, i) => (ave.estado = estadosJugador[i]));
    estado.cpu.aves.forEach((ave, i) => (ave.estado = estadosCpu[i]));
    return estado;
  }

  it('devuelve null mientras ambos equipos tienen aves', () => {
    expect(
      evaluarFin(estadoCon(['activa', 'debilitada', 'rendida'], ['activa', 'activa', 'debilitada'])),
    ).toBeNull();
  });

  it('gana el jugador cuando el CPU se queda sin aves', () => {
    expect(
      evaluarFin(estadoCon(['activa', 'activa', 'activa'], ['debilitada', 'rendida', 'debilitada'])),
    ).toBe('jugador');
  });

  it('gana el CPU cuando el jugador se queda sin aves', () => {
    expect(
      evaluarFin(estadoCon(['rendida', 'debilitada', 'debilitada'], ['activa', 'debilitada', 'activa'])),
    ).toBe('cpu');
  });

  it('empate técnico cuando ambos se quedan sin aves', () => {
    expect(
      evaluarFin(estadoCon(['debilitada', 'rendida', 'debilitada'], ['rendida', 'debilitada', 'debilitada'])),
    ).toBe('empate');
  });
});

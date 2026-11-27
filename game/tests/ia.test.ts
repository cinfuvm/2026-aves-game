import { describe, expect, it } from 'vitest';

import {
  decisionCpu,
  elegirMovimientoCpu,
  type ParametrosIA,
  type PerfilCpu,
} from '../src/battle/cpu';
import { calcularDano } from '../src/battle/damage';
import {
  evaluarMovimientos,
  predecirJugador,
  resumirDano,
  valoresAProbabilidades,
} from '../src/battle/ia/evaluacion';
import {
  distribucionUniforme,
  normalizar,
  predecirAntiCpu,
  predecirConjunto,
  predecirFrecuencia,
  predecirReaccion,
  predecirTransicion,
  tipoMasProbable,
  tiposQueVencenA,
  type Distribucion,
} from '../src/battle/ia/prediccion';
import { compararPPTLS, PPTLS_TIPOS } from '../src/battle/pptls';
import { crearRng } from '../src/battle/rng';
import { inicializarBatalla } from '../src/battle/state';
import {
  CONFIG_BASE,
  type AveFicha,
  type EntradaHistorial,
  type EstadoBatalla,
  type MovimientoActivo,
  type Rng,
  type TipoPPTLS,
} from '../src/battle/types';
import { ENEMIGO_1, ENEMIGO_6, ENEMIGO_7, ENEMIGO_8 } from '../src/data/bots';

// ---------------------------------------------------------------- utilidades

function fichaPrueba(id: string, tipo: TipoPPTLS): AveFicha {
  const otros = PPTLS_TIPOS.filter((t) => t !== tipo);
  return {
    id,
    nombre: id,
    tipo,
    movimientos: [
      { id: `${id}-car`, nombre: `Característico ${tipo}`, tipo, caracteristico: true },
      ...otros.slice(0, 3).map((t) => ({ id: `${id}-${t}`, nombre: `Otro ${t}`, tipo: t })),
    ],
  };
}

function mov(tipo: TipoPPTLS, costeMp = 2, id = `m-${tipo}-${costeMp}`): MovimientoActivo {
  return { id, nombre: id, tipo, costeMp };
}

/** Entrada de historial mínima: tipos usados y resultado PPTLS. */
function entrada(tipoJugador: TipoPPTLS, tipoCpu: TipoPPTLS, turno = 1): EntradaHistorial {
  return {
    turno,
    movJugador: mov(tipoJugador),
    movCpu: mov(tipoCpu),
    resultado: compararPPTLS(tipoJugador, tipoCpu),
    danoAlCpu: 0,
    danoAlJugador: 0,
    mpGastadoJugador: 0,
    mpGastadoCpu: 0,
    mensaje: '',
    eventos: [],
  };
}

function historial(pares: [TipoPPTLS, TipoPPTLS][]): EntradaHistorial[] {
  return pares.map(([j, c], i) => entrada(j, c, i + 1));
}

/**
 * Batalla 1v1 controlada: el ave del CPU es de tipo `tipoCpu` con los
 * movimientos `movsCpu`; el jugador es de tipo `tipoJugador`.
 */
function estado1v1(
  movsCpu: MovimientoActivo[],
  opciones: {
    tipoCpu?: TipoPPTLS;
    tipoJugador?: TipoPPTLS;
    mpCpu?: number;
    hist?: EntradaHistorial[];
    movsJugador?: MovimientoActivo[];
  } = {},
): EstadoBatalla {
  const config = { ...CONFIG_BASE, modo: '1v1' as const };
  const estado = inicializarBatalla(
    [fichaPrueba('jug', opciones.tipoJugador ?? 'spock')],
    [fichaPrueba('cpu', opciones.tipoCpu ?? 'lagarto')],
    crearRng(5),
    config,
  );
  const cpu = estado.cpu.aves[0];
  cpu.movimientos = movsCpu.map((m) => ({ ...m }));
  cpu.hpMax = 40;
  cpu.hpActual = 40;
  cpu.mpActual = opciones.mpCpu ?? 20;
  const jug = estado.jugador.aves[0];
  jug.hpMax = 40;
  jug.hpActual = 40;
  if (opciones.movsJugador) jug.movimientos = opciones.movsJugador.map((m) => ({ ...m }));
  estado.historial = opciones.hist ?? [];
  estado.turno = estado.historial.length;
  return estado;
}

function suma(d: Distribucion): number {
  return PPTLS_TIPOS.reduce((a, t) => a + d[t], 0);
}

function perfilCon(ia: Partial<ParametrosIA>, base: PerfilCpu = ENEMIGO_7.perfil): PerfilCpu {
  if (base.tipo !== 'estrategico') throw new Error('perfil no estratégico');
  return { tipo: 'estrategico', ia: { ...base.ia, ...ia } };
}

/** rng que cuenta cuántas veces se llamó. */
function rngContador(): { rng: Rng; llamadas: () => number } {
  let n = 0;
  const interno = crearRng(9);
  return {
    rng: () => {
      n++;
      return interno();
    },
    llamadas: () => n,
  };
}

const CUATRO_TIPOS = [mov('piedra'), mov('papel'), mov('tijera'), mov('spock')];

// ---------------------------------------------------------------- predicción

describe('predicción del jugador (ia/prediccion.ts)', () => {
  it('la uniforme y normalizar suman 1; normalizar sin pesos devuelve la uniforme', () => {
    expect(suma(distribucionUniforme())).toBeCloseTo(1);
    const vacia = normalizar({ piedra: 0, papel: 0, tijera: 0, lagarto: 0, spock: 0 });
    expect(vacia).toEqual(distribucionUniforme());
    expect(suma(normalizar({ piedra: 3, papel: 1, tijera: 0, lagarto: 0, spock: 0 }))).toBeCloseTo(1);
  });

  it('tiposQueVencenA respeta la matriz PPTLS', () => {
    expect(tiposQueVencenA('piedra').sort()).toEqual(['papel', 'spock']);
    expect(tiposQueVencenA('spock').sort()).toEqual(['lagarto', 'papel']);
    for (const tipo of PPTLS_TIPOS) {
      for (const otro of tiposQueVencenA(tipo)) expect(compararPPTLS(otro, tipo)).toBe('jugador');
    }
  });

  it('frecuencia: el tipo más usado es el más probable', () => {
    const h = historial([
      ['piedra', 'papel'],
      ['piedra', 'tijera'],
      ['papel', 'piedra'],
      ['piedra', 'spock'],
    ]);
    const d = predecirFrecuencia(h);
    expect(tipoMasProbable(d)).toBe('piedra');
    expect(suma(d)).toBeCloseTo(1);
  });

  it('frecuencia: con memoria baja pesan más los turnos recientes', () => {
    const h = historial([
      ['piedra', 'papel'],
      ['piedra', 'papel'],
      ['piedra', 'papel'],
      ['tijera', 'papel'],
      ['tijera', 'papel'],
    ]);
    expect(tipoMasProbable(predecirFrecuencia(h, 1))).toBe('piedra');
    expect(tipoMasProbable(predecirFrecuencia(h, 0.4))).toBe('tijera');
  });

  it('frecuencia: sin historial favorece el tipo del ave del jugador (STAB)', () => {
    const d = predecirFrecuencia([], 0.85, 'lagarto');
    expect(tipoMasProbable(d)).toBe('lagarto');
    expect(d.lagarto).toBeLessThan(0.4);
  });

  it('reacción: si el jugador ganó, espera que repita su tipo', () => {
    const d = predecirReaccion(historial([['papel', 'piedra']]));
    expect(tipoMasProbable(d)).toBe('papel');
  });

  it('reacción: si el jugador perdió, espera un tipo que venza al último del CPU', () => {
    const d = predecirReaccion(historial([['papel', 'tijera']]));
    const vencedores = tiposQueVencenA('tijera');
    expect(vencedores).toContain(tipoMasProbable(d));
    expect(d.papel).toBeLessThan(d[vencedores[0]]);
  });

  it('transición: detecta una rotación fija de tipos', () => {
    const ciclo: TipoPPTLS[] = ['piedra', 'papel', 'tijera'];
    const pares = Array.from({ length: 8 }, (_, i) => [ciclo[i % 3], 'spock'] as [TipoPPTLS, TipoPPTLS]);
    // El último tipo del jugador es ciclo[7 % 3] = papel → sigue tijera.
    expect(tipoMasProbable(predecirTransicion(historial(pares)))).toBe('tijera');
  });

  it('anti-CPU: si el CPU repite un tipo, espera que el jugador lo contrarreste', () => {
    const h = historial([
      ['spock', 'piedra'],
      ['lagarto', 'piedra'],
      ['tijera', 'piedra'],
    ]);
    const d = predecirAntiCpu(h);
    expect(d.papel + d.spock).toBeGreaterThan(0.6);
  });

  it('conjunto: da más peso al predictor que acierta (rotación → transición)', () => {
    const ciclo: TipoPPTLS[] = ['lagarto', 'spock', 'piedra', 'tijera'];
    const pares = Array.from({ length: 12 }, (_, i) => [ciclo[i % 4], 'papel'] as [TipoPPTLS, TipoPPTLS]);
    const { distribucion, pesos } = predecirConjunto(historial(pares), [
      'frecuencia',
      'reaccion',
      'transicion',
      'anti-cpu',
    ]);
    expect(pesos.transicion).toBeGreaterThan(pesos.frecuencia);
    expect(pesos.transicion).toBeGreaterThan(pesos.reaccion);
    expect(suma(distribucion)).toBeCloseTo(1);
    // Último: ciclo[11 % 4] = tijera → sigue lagarto.
    expect(tipoMasProbable(distribucion)).toBe('lagarto');
  });

  it('conjunto: sin historial todos los predictores pesan igual', () => {
    const { pesos } = predecirConjunto([], ['frecuencia', 'reaccion']);
    expect(pesos.frecuencia).toBeCloseTo(0.5);
    expect(pesos.reaccion).toBeCloseTo(0.5);
  });
});

// ---------------------------------------------------------------- evaluación

describe('evaluación de movimientos (ia/evaluacion.ts)', () => {
  it('resumirDano coincide con calcularDano de damage.ts para cada daño base posible', () => {
    const hpMax = 46;
    const hpActual = 19;
    const movimiento = mov('tijera', 3);
    const minimo = Math.floor(hpMax * CONFIG_BASE.danoBaseMinFrac);
    const maximo = Math.floor(hpMax * CONFIG_BASE.danoBaseMaxFrac);
    const casos = maximo - minimo + 1;
    let suma = 0;
    let debilita = 0;
    for (let base = minimo; base <= maximo; base++) {
      const forzar: Rng = () => (base - minimo + 0.5) / casos;
      const { dano } = calcularDano(hpMax, movimiento, 'tijera', true, forzar, CONFIG_BASE);
      suma += Math.min(dano, hpActual);
      if (dano >= hpActual) debilita++;
    }
    const resumen = resumirDano(hpMax, hpActual, 3, true, CONFIG_BASE.bonusTijera, CONFIG_BASE);
    expect(resumen.media).toBeCloseTo(suma / casos);
    expect(resumen.probDebilitar).toBeCloseTo(debilita / casos);
  });

  it('resumirDano: rival con 1 HP siempre cae; rival sano casi nunca', () => {
    expect(resumirDano(40, 1, 1, false, 0, CONFIG_BASE).probDebilitar).toBe(1);
    expect(resumirDano(40, 40, 1, false, 0, CONFIG_BASE).probDebilitar).toBe(0);
  });

  it('contra una predicción segura de piedra, lo mejor es un tipo que vence a piedra', () => {
    const estado = estado1v1(CUATRO_TIPOS, { tipoCpu: 'lagarto' });
    const seguro: Distribucion = { piedra: 1, papel: 0, tijera: 0, lagarto: 0, spock: 0 };
    const ia = ENEMIGO_7.perfil.ia;
    const evals = evaluarMovimientos(estado, ia, seguro);
    const mejor = evals.reduce((a, b) => (b.valor > a.valor ? b : a));
    expect(['papel', 'spock']).toContain(mejor.movimiento.tipo);
    const tijera = evals.find((e) => e.movimiento.tipo === 'tijera')!;
    expect(tijera.probPerder).toBeCloseTo(1);
    expect(tijera.valor).toBeLessThan(mejor.valor);
  });

  it('penaliza el movimiento que dejaría al ave sin MP para seguir (rendición, D-07)', () => {
    const movs = [mov('piedra', 3), mov('papel', 1)];
    const ia = ENEMIGO_7.perfil.ia;
    const pred = distribucionUniforme();
    const conMp = evaluarMovimientos(estado1v1(movs, { mpCpu: 10 }), ia, pred);
    const sinMp = evaluarMovimientos(estado1v1(movs, { mpCpu: 3 }), ia, pred);
    const valor = (e: typeof conMp, tipo: TipoPPTLS) => e.find((x) => x.movimiento.tipo === tipo)!.valor;
    // Con MP 3, pagar 3 deja 0 MP (< coste mínimo 1): el ave se rendiría.
    expect(valor(sinMp, 'piedra')).toBeLessThan(valor(conMp, 'piedra') - 0.3);
    // Pagar 1 deja 2 MP: sin penalización.
    expect(valor(sinMp, 'papel')).toBeCloseTo(valor(conMp, 'papel'));
  });

  it('valoresAProbabilidades: suma 1, respeta el piso de exploración y la temperatura', () => {
    const valores = [0.9, 0.1, -0.4, 0.2];
    for (const [t, e] of [
      [0.1, 0.05],
      [0.3, 0.15],
    ]) {
      const p = valoresAProbabilidades(valores, t, e);
      expect(p.reduce((a, b) => a + b, 0)).toBeCloseTo(1);
      for (const x of p) expect(x).toBeGreaterThanOrEqual(e / valores.length - 1e-12);
    }
    const fria = Math.max(...valoresAProbabilidades(valores, 0.05, 0));
    const tibia = Math.max(...valoresAProbabilidades(valores, 0.5, 0));
    expect(fria).toBeGreaterThan(tibia);
  });

  it('información completa (Enemigo 8) descarta los tipos que el jugador no puede usar', () => {
    const movsJugador = [mov('papel', 1, 'j1'), mov('tijera', 1, 'j2'), mov('spock', 1, 'j3'), mov('lagarto', 1, 'j4')];
    const estado = estado1v1(CUATRO_TIPOS, { movsJugador });
    const iaJefe = ENEMIGO_7.perfil.ia;
    const iaSombra = ENEMIGO_8.perfil.ia;
    expect(predecirJugador(estado, iaJefe).piedra).toBeGreaterThan(0);
    expect(predecirJugador(estado, iaSombra).piedra).toBe(0);
  });
});

// ---------------------------------------------------------------- elección

describe('elegirMovimientoCpu — perfil estratégico', () => {
  it('nunca elige un movimiento bloqueado por MP', () => {
    const movs = [mov('piedra', 3), mov('papel', 1), mov('tijera', 2), mov('spock', 3)];
    const estado = estado1v1(movs, { mpCpu: 2 });
    const rng = crearRng(11);
    for (const perfil of [ENEMIGO_1.perfil, ENEMIGO_7.perfil, ENEMIGO_8.perfil]) {
      for (let i = 0; i < 300; i++) {
        const eleccion = elegirMovimientoCpu(estado, rng, perfil)!;
        expect(eleccion.costeMp).toBeLessThanOrEqual(2);
      }
    }
  });

  it('con MP 0 devuelve null y con un solo movimiento usable lo devuelve sin tirar el rng', () => {
    expect(elegirMovimientoCpu(estado1v1([mov('piedra', 1)], { mpCpu: 0 }), crearRng(1), ENEMIGO_7.perfil)).toBeNull();
    const { rng, llamadas } = rngContador();
    const unico = elegirMovimientoCpu(estado1v1([mov('piedra', 1), mov('papel', 3)], { mpCpu: 1 }), rng, ENEMIGO_7.perfil);
    expect(unico!.tipo).toBe('piedra');
    expect(llamadas()).toBe(0);
  });

  it('consume una sola tirada del rng por decisión', () => {
    const { rng, llamadas } = rngContador();
    elegirMovimientoCpu(estado1v1(CUATRO_TIPOS), rng, ENEMIGO_7.perfil);
    expect(llamadas()).toBe(1);
  });

  it('es determinista con la misma semilla', () => {
    const estado = estado1v1(CUATRO_TIPOS, { hist: historial([['piedra', 'papel'], ['tijera', 'spock']]) });
    for (let seed = 1; seed <= 20; seed++) {
      const a = elegirMovimientoCpu(estado, crearRng(seed), ENEMIGO_7.perfil);
      const b = elegirMovimientoCpu(estado, crearRng(seed), ENEMIGO_7.perfil);
      expect(a!.id).toBe(b!.id);
    }
  });

  it('las probabilidades de decisionCpu coinciden con la frecuencia real de elección', () => {
    const estado = estado1v1(CUATRO_TIPOS, { hist: historial([['lagarto', 'piedra']]) });
    const { movimientos, probabilidades } = decisionCpu(estado, ENEMIGO_6.perfil);
    const rng = crearRng(3);
    const cuenta = new Map<string, number>();
    const n = 6000;
    for (let i = 0; i < n; i++) {
      const id = elegirMovimientoCpu(estado, rng, ENEMIGO_6.perfil)!.id;
      cuenta.set(id, (cuenta.get(id) ?? 0) + 1);
    }
    movimientos.forEach((m, i) => {
      expect((cuenta.get(m.id) ?? 0) / n).toBeCloseTo(probabilidades[i], 1);
    });
  });

  it('el Jefe castiga a un jugador repetitivo, pero sin dejar de tener azar', () => {
    const pares = Array.from({ length: 8 }, () => ['piedra', 'lagarto'] as [TipoPPTLS, TipoPPTLS]);
    const estado = estado1v1(CUATRO_TIPOS, { hist: historial(pares), tipoCpu: 'lagarto' });
    const { movimientos, probabilidades } = decisionCpu(estado, ENEMIGO_7.perfil);
    const contraPiedra = movimientos.reduce(
      (acc, m, i) => acc + (['papel', 'spock'].includes(m.tipo) ? probabilidades[i] : 0),
      0,
    );
    expect(contraPiedra).toBeGreaterThan(0.75);
    for (const p of probabilidades) expect(p).toBeGreaterThan(0);
    expect(Math.max(...probabilidades)).toBeLessThan(1);
  });

  it('juego limpio: el Jefe decide igual sin importar los movimientos ocultos del jugador', () => {
    const hist = historial([['spock', 'papel'], ['papel', 'piedra']]);
    const a = estado1v1(CUATRO_TIPOS, { hist, movsJugador: [mov('papel', 1, 'x1'), mov('spock', 1, 'x2')] });
    const b = estado1v1(CUATRO_TIPOS, { hist, movsJugador: [mov('piedra', 3, 'y1'), mov('tijera', 3, 'y2')] });
    expect(decisionCpu(a, ENEMIGO_7.perfil).probabilidades).toEqual(decisionCpu(b, ENEMIGO_7.perfil).probabilidades);
    // La Sombra sí usa esa información («algo injusta»).
    expect(decisionCpu(a, ENEMIGO_8.perfil).probabilidades).not.toEqual(
      decisionCpu(b, ENEMIGO_8.perfil).probabilidades,
    );
  });

  it('la afinidad sube la probabilidad del tipo favorito', () => {
    const estado = estado1v1(CUATRO_TIPOS, { tipoCpu: 'lagarto' });
    const prob = (perfil: PerfilCpu) => {
      const d = decisionCpu(estado, perfil);
      return d.probabilidades[d.movimientos.findIndex((m) => m.tipo === 'piedra')];
    };
    expect(prob(ENEMIGO_1.perfil)).toBeGreaterThan(prob(perfilCon({ pesoAfinidad: 0 }, ENEMIGO_1.perfil)));
  });

  it('el perfil aleatorio sigue igual: decisionCpu da probabilidades uniformes', () => {
    const d = decisionCpu(estado1v1(CUATRO_TIPOS));
    expect(d.probabilidades).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(d.prediccion).toBeNull();
  });
});


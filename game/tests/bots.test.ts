import { describe, expect, it } from 'vitest';

import { armarEquipoCpu, elegirMovimientoCpu } from '../src/battle/cpu';
import { ganaPPTLS, PPTLS_TIPOS } from '../src/battle/pptls';
import { crearRng } from '../src/battle/rng';
import { aveActiva, inicializarBatalla, movimientosUsables } from '../src/battle/state';
import { resolverTurno } from '../src/battle/turn';
import { CONFIG_BASE, type AveFicha, type TipoPPTLS } from '../src/battle/types';
import { FICHAS_MVP } from '../src/data/birds';
import {
  BOTS,
  botPorId,
  botPorTipo,
  ENEMIGO_1,
  ENEMIGO_6,
  ENEMIGO_8,
  equipoDeBot,
} from '../src/data/bots';
import { confirmarAve, nuevoJuego, usarMovimiento } from '../src/juego/flujo';

/** 10 fichas de prueba: 2 por tipo. Los ids imitan a las aves del PRD donde sirve. */
function fichasDePrueba(): AveFicha[] {
  const ids: Record<TipoPPTLS, [string, string]> = {
    piedra: ['picaflor', 'piedra-2'],
    papel: ['queltehue', 'chincol'],
    tijera: ['diucon', 'pinguino'],
    lagarto: ['tiuque', 'loica'],
    spock: ['chercan', 'tucuquere'],
  };
  return PPTLS_TIPOS.flatMap((tipo) =>
    ids[tipo].map((id) => ({
      id,
      nombre: id,
      tipo,
      movimientos: [
        { id: `${id}-car`, nombre: `car ${tipo}`, tipo, caracteristico: true },
        ...PPTLS_TIPOS.filter((t) => t !== tipo)
          .slice(0, 3)
          .map((t) => ({ id: `pool-${t}`, nombre: `pool ${t}`, tipo: t })),
      ],
    })),
  );
}

const FICHAS = fichasDePrueba();

describe('los 8 bots (data/bots.ts)', () => {
  it('son 8, en orden de torre y con ids únicos', () => {
    expect(BOTS.map((b) => b.nombre)).toEqual([
      'Enemigo 1',
      'Enemigo 2',
      'Enemigo 3',
      'Enemigo 4',
      'Enemigo 5',
      'Enemigo 6',
      'Enemigo 7',
      'Enemigo 8',
    ]);
    expect(new Set(BOTS.map((b) => b.id)).size).toBe(8);
  });

  it('los Enemigos 1 a 5 cubren un tipo cada uno; 6 a 8 no tienen tipo favorito', () => {
    const tipos = BOTS.slice(0, 5).map((b) => b.afinidad);
    expect(tipos).toEqual(['piedra', 'tijera', 'papel', 'lagarto', 'spock']);
    for (const bot of BOTS.slice(5)) expect(bot.afinidad).toBeNull();
  });

  it('cada bot tiene el ave característica del plan (§5.2); el 8 no desbloquea ninguna', () => {
    expect(BOTS.map((b) => b.aveCaracteristica)).toEqual([
      'picaflor',
      'diucon',
      'queltehue',
      'tiuque',
      'chercan',
      'pinguino',
      'tucuquere',
      null,
    ]);
  });

  it('todos son estratégicos y conservan azar (exploración y temperatura > 0)', () => {
    for (const bot of BOTS) {
      expect(bot.perfil.tipo).toBe('estrategico');
      if (bot.perfil.tipo !== 'estrategico') continue;
      expect(bot.perfil.ia.exploracion).toBeGreaterThan(0);
      expect(bot.perfil.ia.temperatura).toBeGreaterThan(0);
      expect(bot.perfil.ia.afinidad).toBe(bot.afinidad);
    }
  });

  it('solo el Enemigo 8 usa información del jugador más allá del historial', () => {
    for (const bot of BOTS) {
      if (bot.perfil.tipo !== 'estrategico') continue;
      const esSombra = bot.id === 'enemigo-8';
      expect(bot.perfil.ia.informacionCompleta).toBe(esSombra);
      expect(bot.contraEquipo).toBe(esSombra);
    }
  });

  it('los jefes son menos aleatorios que los bots de media dificultad', () => {
    const temp = (i: number) => {
      const p = BOTS[i].perfil;
      return p.tipo === 'estrategico' ? p.ia.temperatura : Infinity;
    };
    for (let i = 0; i < 5; i++) expect(temp(i)).toBeGreaterThan(temp(5));
    expect(temp(5)).toBeGreaterThan(temp(6));
  });

  it('botPorId y botPorTipo encuentran el bot correcto', () => {
    expect(botPorId('enemigo-7').apodo).toBe('El Jefe');
    expect(() => botPorId('enemigo-9')).toThrow();
    for (const tipo of PPTLS_TIPOS) expect(botPorTipo(tipo).afinidad).toBe(tipo);
  });
});

describe('armarEquipoCpu / equipoDeBot', () => {
  it('devuelve la cantidad pedida sin repetir aves', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const equipo = equipoDeBot(ENEMIGO_6, FICHAS, 3, crearRng(seed));
      expect(equipo).toHaveLength(3);
      expect(new Set(equipo.map((f) => f.id)).size).toBe(3);
    }
  });

  it('lanza un error si no hay aves suficientes', () => {
    expect(() => equipoDeBot(ENEMIGO_6, FICHAS.slice(0, 2), 3, crearRng(1))).toThrow();
  });

  it('el ave característica entra última y siempre hay un ave del tipo favorito', () => {
    for (const bot of BOTS.slice(0, 7)) {
      for (let seed = 1; seed <= 20; seed++) {
        const equipo = equipoDeBot(bot, FICHAS, 3, crearRng(seed));
        expect(equipo[2].id).toBe(bot.aveCaracteristica);
        if (bot.afinidad) expect(equipo.some((f) => f.tipo === bot.afinidad)).toBe(true);
      }
    }
  });

  it('sin su ave característica, la primera ave es del tipo favorito', () => {
    const sinAses = FICHAS.map((f) => ({ ...f, id: `${f.id}-otra` }));
    for (const bot of BOTS.slice(0, 5)) {
      for (let seed = 1; seed <= 20; seed++) {
        expect(equipoDeBot(bot, sinAses, 3, crearRng(seed))[0].tipo).toBe(bot.afinidad);
      }
    }
  });

  it('en 1v1 no reserva el ave característica (no hay «as» con una sola ave)', () => {
    const equipo = equipoDeBot(ENEMIGO_1, FICHAS, 1, crearRng(4));
    expect(equipo).toHaveLength(1);
    expect(equipo[0].tipo).toBe('piedra');
  });

  it('el Enemigo 8 elige más tipos que vencen al equipo del jugador que el Enemigo 6', () => {
    const jugador = FICHAS.filter((f) => f.tipo === 'piedra');
    const ventaja = (bot: typeof ENEMIGO_6) => {
      let total = 0;
      for (let seed = 1; seed <= 200; seed++) {
        for (const f of equipoDeBot(bot, FICHAS, 3, crearRng(seed), jugador)) {
          if (ganaPPTLS(f.tipo, 'piedra')) total++;
        }
      }
      return total;
    };
    expect(ventaja(ENEMIGO_8)).toBeGreaterThan(ventaja(ENEMIGO_6) * 1.3);
  });

  it('es determinista con la misma semilla', () => {
    const a = armarEquipoCpu(FICHAS, 3, crearRng(8), { afinidad: 'papel', aveCaracteristica: null, contraEquipo: false });
    const b = armarEquipoCpu(FICHAS, 3, crearRng(8), { afinidad: 'papel', aveCaracteristica: null, contraEquipo: false });
    expect(a.map((f) => f.id)).toEqual(b.map((f) => f.id));
  });
});

describe('batallas completas con cada bot', () => {
  it('cada bot juega batallas 3v3 enteras sin quedarse sin jugada', () => {
    for (const bot of BOTS) {
      const rng = crearRng(100 + BOTS.indexOf(bot));
      for (let b = 0; b < 15; b++) {
        const equipoJugador = armarEquipoCpu(FICHAS, 3, rng, { afinidad: null, aveCaracteristica: null, contraEquipo: false });
        const equipoCpu = equipoDeBot(bot, FICHAS, 3, rng, equipoJugador);
        let estado = inicializarBatalla(equipoJugador, equipoCpu, rng, CONFIG_BASE);
        let turnos = 0;
        while (!estado.terminada) {
          const movCpu = elegirMovimientoCpu(estado, rng, bot.perfil);
          expect(movCpu).not.toBeNull();
          const usables = movimientosUsables(aveActiva(estado.jugador));
          const movJugador = usables[Math.floor(rng() * usables.length)];
          estado = resolverTurno(estado, movJugador, movCpu!, rng).estado;
          expect(++turnos).toBeLessThan(200);
        }
        expect(['jugador', 'cpu', 'empate']).toContain(estado.ganador);
      }
    }
  });
});

describe('integración con el flujo del MVP (juego/flujo.ts)', () => {
  it('nuevoJuego no tiene bot; al confirmar, la CPU usa el bot del tipo de su ave', () => {
    expect(nuevoJuego().bot).toBeNull();
    for (let seed = 1; seed <= 10; seed++) {
      const j = confirmarAve(nuevoJuego(), crearRng(seed));
      const tipoAveCpu = j.estado!.cpu.aves[0].tipo;
      expect(j.bot!.afinidad).toBe(tipoAveCpu);
      expect(FICHAS_MVP.some((f) => f.tipo === tipoAveCpu)).toBe(true);
    }
  });

  it('usarMovimiento obtiene la jugada de la CPU con el perfil del bot', () => {
    const rng = crearRng(21);
    const j = usarMovimiento(confirmarAve(nuevoJuego(), rng), rng);
    expect(j.pantalla).toBe('revelacion');
    const ave = j.estado!.cpu.aves[0];
    expect(ave.movimientos.some((m) => m.id === j.movCpu!.id)).toBe(true);
  });
});

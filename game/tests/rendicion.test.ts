import { describe, expect, it } from 'vitest';
import { FICHAS_MVP } from '../src/data/birds';
import { inicializarBatalla } from '../src/battle/state';
import { rendirAveActiva } from '../src/battle/rendicion';
import { crearRng } from '../src/battle/rng';
import { CONFIG_BASE, type EstadoBatalla } from '../src/battle/types';

const CONFIG_1V1 = { ...CONFIG_BASE, modo: '1v1' as const };

function batalla1v1(seed = 1): EstadoBatalla {
  return inicializarBatalla([FICHAS_MVP[0]], [FICHAS_MVP[1]], crearRng(seed), CONFIG_1V1);
}

function batalla3v3(seed = 1): EstadoBatalla {
  return inicializarBatalla([...FICHAS_MVP], [...FICHAS_MVP], crearRng(seed), CONFIG_BASE);
}

describe('rendición del ave activa (game/src/battle/rendicion.ts)', () => {
  it('en 1v1, rendirse termina la batalla con victoria de la CPU', () => {
    const { estado, evento } = rendirAveActiva(batalla1v1(), 'jugador');
    expect(estado.terminada).toBe(true);
    expect(estado.ganador).toBe('cpu');
    expect(estado.jugador.aves[0].estado).toBe('rendida');
    expect(evento).toContain('se rinde');
  });

  it('en 1v1, que se rinda la CPU da la victoria al jugador', () => {
    const { estado } = rendirAveActiva(batalla1v1(), 'cpu');
    expect(estado.terminada).toBe(true);
    expect(estado.ganador).toBe('jugador');
  });

  it('no consume turno, MP ni historial', () => {
    const inicial = batalla1v1();
    const { estado } = rendirAveActiva(inicial, 'jugador');
    expect(estado.turno).toBe(inicial.turno);
    expect(estado.historial).toHaveLength(0);
    expect(estado.jugador.aves[0].mpActual).toBe(inicial.jugador.aves[0].mpActual);
    expect(estado.cpu.aves[0].mpActual).toBe(inicial.cpu.aves[0].mpActual);
  });

  it('no muta el estado recibido', () => {
    const inicial = batalla1v1();
    rendirAveActiva(inicial, 'jugador');
    expect(inicial.jugador.aves[0].estado).toBe('activa');
    expect(inicial.terminada).toBe(false);
    expect(inicial.ganador).toBeNull();
  });

  it('en 3v3, rendirse hace entrar la siguiente ave y la batalla sigue', () => {
    const { estado } = rendirAveActiva(batalla3v3(), 'jugador');
    expect(estado.terminada).toBe(false);
    expect(estado.jugador.aves[0].estado).toBe('rendida');
    expect(estado.jugador.indiceActiva).toBe(1);
    expect(estado.jugador.aves[1].estado).toBe('activa');
  });

  it('en 3v3, rendir las tres aves del jugador termina con victoria de la CPU', () => {
    let estado = batalla3v3();
    for (let i = 0; i < 3; i++) {
      estado = rendirAveActiva(estado, 'jugador').estado;
    }
    expect(estado.terminada).toBe(true);
    expect(estado.ganador).toBe('cpu');
  });

  it('rendir una batalla terminada lanza un error', () => {
    const { estado } = rendirAveActiva(batalla1v1(), 'jugador');
    expect(() => rendirAveActiva(estado, 'cpu')).toThrow(/ya terminó/);
  });
});

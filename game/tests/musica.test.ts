import { describe, expect, it } from 'vitest';
import {
  detenerPista,
  escribirBanco,
  iniciarPista,
  pistaActual,
  pistaParaPantalla,
  tickMusica,
  type ApiSonido,
} from '../src/audio/musica';
import { ENCUENTRO_ENEMIGO, MELODIA1, PELEA, PISTAS, VICTORIA_PELEA } from '../src/audio/pistas';

/** API de sonido falsa: registra cada poke y cada sfx. */
function apiFalsa() {
  const pokes: Array<[number, number]> = [];
  const sfxs: Array<[number, number, number, number, number, number]> = [];
  const api: ApiSonido = {
    poke: (d, v) => pokes.push([d, v]),
    sfx: (...args) => sfxs.push(args),
  };
  return { api, pokes, sfxs };
}

/** Avanza `n` ticks y devuelve cuántos sfx se tocaron. */
function avanzar(api: ApiSonido, n: number): void {
  for (let i = 0; i < n; i++) tickMusica(api);
}

describe('datos de las pistas (generadas desde la rama musica)', () => {
  it('cada pista tiene 4 ondas y sus canales tienen la misma longitud que la percusión', () => {
    for (const p of Object.values(PISTAS)) {
      expect(p.ondas).toHaveLength(4);
      const n = p.canales[0].pasos.length;
      for (const c of p.canales) expect(c.pasos).toHaveLength(n);
      expect(p.percusion.pasos).toHaveLength(n);
    }
  });

  it('longitudes originales: melodia1 y pelea 128 y 160 pasos, encuentro y victoria 32', () => {
    expect(MELODIA1.canales[0].pasos).toHaveLength(128);
    expect(PELEA.canales[0].pasos).toHaveLength(160);
    expect(ENCUENTRO_ENEMIGO.canales[0].pasos).toHaveLength(32);
    expect(VICTORIA_PELEA.canales[0].pasos).toHaveLength(32);
  });

  it('velocidades originales: melodia1 10, pelea 6, encuentro 4, victoria 6', () => {
    expect(MELODIA1.velocidad).toBe(10);
    expect(PELEA.velocidad).toBe(6);
    expect(ENCUENTRO_ENEMIGO.velocidad).toBe(4);
    expect(VICTORIA_PELEA.velocidad).toBe(6);
  });
});

describe('escribirBanco', () => {
  it('escribe las ondas desde 0x0FFE4 y los sfx desde 0x100E4', () => {
    const { api, pokes } = apiFalsa();
    escribirBanco(api, ENCUENTRO_ENEMIGO);
    expect(pokes[0][0]).toBe(0x0ffe4);
    const esperadoOndas = 4 * 16;
    const esperadoSfx = ENCUENTRO_ENEMIGO.sfx.length * (30 * 2 + 4);
    expect(pokes).toHaveLength(esperadoOndas + esperadoSfx);
    expect(pokes.some(([d]) => d === 0x100e4)).toBe(true);
  });

  it('cada byte cabe en 8 bits', () => {
    const { api, pokes } = apiFalsa();
    escribirBanco(api, PELEA);
    for (const [, v] of pokes) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(255);
    }
  });
});

describe('reproducción', () => {
  it('encuentro-enemigo toca sus 32 pasos y luego se detiene', () => {
    const { api, sfxs } = apiFalsa();
    iniciarPista(api, ENCUENTRO_ENEMIGO);
    expect(pistaActual()).toBe('encuentroEnemigo');
    avanzar(api, ENCUENTRO_ENEMIGO.velocidad * 32);
    const alFinal = sfxs.length;
    expect(alFinal).toBeGreaterThan(0);
    expect(pistaActual()).toBeNull();
    avanzar(api, 200);
    expect(sfxs.length).toBe(alFinal);
  });

  it('victoria-pelea también toca una sola vez y se detiene', () => {
    const { api, sfxs } = apiFalsa();
    iniciarPista(api, VICTORIA_PELEA);
    avanzar(api, VICTORIA_PELEA.velocidad * 32 + 10);
    const alFinal = sfxs.length;
    avanzar(api, 200);
    expect(sfxs.length).toBe(alFinal);
    expect(pistaActual()).toBeNull();
  });

  it('melodia1 vuelve a empezar al terminar sus 128 pasos (bucle completo)', () => {
    const { api, sfxs } = apiFalsa();
    iniciarPista(api, MELODIA1);
    // Primer paso: el primer sfx de la pista es el de la primera nota del canal keys.
    avanzar(api, 1);
    const primerTick = sfxs.slice(0);
    sfxs.length = 0;
    avanzar(api, MELODIA1.velocidad * 128 - 1);
    sfxs.length = 0;
    avanzar(api, 1);
    expect(sfxs).toEqual(primerTick);
    expect(pistaActual()).toBe('melodia1');
  });

  it('pelea repite desde el paso 33 (índice 32), no desde el principio', () => {
    const { api, sfxs } = apiFalsa();
    iniciarPista(api, PELEA);
    // Tras 160 pasos la pista vuelve al paso 33; el paso 1 no se repite.
    avanzar(api, PELEA.velocidad * 160);
    sfxs.length = 0;
    avanzar(api, PELEA.velocidad);
    const paso33 = PELEA.canales[0].pasos[32];
    expect(pistaActual()).toBe('pelea');
    if (paso33 !== null) expect(sfxs.some((s) => s[1] === paso33)).toBe(true);
  });

  it('detenerPista hace que ya no se toquen notas', () => {
    const { api, sfxs } = apiFalsa();
    iniciarPista(api, MELODIA1);
    avanzar(api, 5);
    detenerPista();
    const antes = sfxs.length;
    avanzar(api, 50);
    expect(sfxs.length).toBe(antes);
    expect(pistaActual()).toBeNull();
  });
});

describe('pistaParaPantalla', () => {
  it('título y selección de combate: melodia1', () => {
    expect(pistaParaPantalla('titulo', null)).toBe(MELODIA1);
    expect(pistaParaPantalla('menu_torre', null)).toBe(MELODIA1);
  });

  it('selección de equipo: encuentro enemigo', () => {
    expect(pistaParaPantalla('seleccion', null)).toBe(ENCUENTRO_ENEMIGO);
  });

  it('batalla y revelación: pelea', () => {
    expect(pistaParaPantalla('batalla', null)).toBe(PELEA);
    expect(pistaParaPantalla('revelacion', null)).toBe(PELEA);
  });

  it('pantalla de victoria: victoria-pelea; derrota o empate: silencio', () => {
    expect(pistaParaPantalla('resultado', 'jugador')).toBe(VICTORIA_PELEA);
    expect(pistaParaPantalla('resultado', 'cpu')).toBeNull();
    expect(pistaParaPantalla('resultado', 'empate')).toBeNull();
  });
});

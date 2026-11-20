import { describe, expect, it } from 'vitest';
import {
  confirmarAve,
  confirmarTurno,
  moverMovimiento,
  moverSeleccion,
  nuevoJuego,
  rendirse,
  reiniciar,
  usarMovimiento,
} from '../src/juego/flujo';
import { crearRng } from '../src/battle/rng';

describe('flujo del juego (game/src/juego/flujo.ts)', () => {
  it('empieza en la selección de aves', () => {
    const j = nuevoJuego();
    expect(j.pantalla).toBe('seleccion');
    expect(j.cursorAve).toBe(0);
    expect(j.estado).toBeNull();
  });

  it('el cursor de selección da la vuelta en ambos sentidos', () => {
    let j = nuevoJuego();
    j = moverSeleccion(j, -1);
    expect(j.cursorAve).toBe(2);
    j = moverSeleccion(j, 1);
    expect(j.cursorAve).toBe(0);
    j = moverSeleccion(j, 4);
    expect(j.cursorAve).toBe(1);
  });

  it('confirmar un ave crea una batalla 1v1 y pasa a batalla', () => {
    const j = confirmarAve(moverSeleccion(nuevoJuego(), 1), crearRng(1));
    expect(j.pantalla).toBe('batalla');
    expect(j.fichaJugador?.nombre).toBe('Loica');
    expect(j.estado?.config.modo).toBe('1v1');
    expect(j.estado?.jugador.aves).toHaveLength(1);
    expect(j.estado?.cpu.aves).toHaveLength(1);
    expect(j.estado?.turno).toBe(0);
  });

  it('el cursor de movimientos recorre los 4 activos', () => {
    let j = confirmarAve(nuevoJuego(), crearRng(2));
    j = moverMovimiento(j, -1);
    expect(j.cursorMov).toBe(3);
    j = moverMovimiento(j, 1);
    expect(j.cursorMov).toBe(0);
  });

  it('un movimiento bloqueado por MP no resuelve turno y avisa', () => {
    let j = confirmarAve(nuevoJuego(), crearRng(3));
    const ave = j.estado!.jugador.aves[0];
    // Se deja al ave sin MP: todos los movimientos quedan bloqueados.
    j = {
      ...j,
      estado: {
        ...j.estado!,
        jugador: { ...j.estado!.jugador, aves: [{ ...ave, mpActual: 0 }] },
      },
    };
    const despues = usarMovimiento(j, crearRng(4));
    expect(despues.estado!.turno).toBe(0);
    expect(despues.pantalla).toBe('batalla');
    expect(despues.mensaje).toMatch(/MP insuficiente/);
  });

  it('usar un movimiento muestra la revelación de ambas aves sin resolver el turno', () => {
    const j = confirmarAve(nuevoJuego(), crearRng(5));
    const mp = j.estado!.jugador.aves[0].mpActual;
    const revelado = usarMovimiento(j, crearRng(6));
    expect(revelado.pantalla).toBe('revelacion');
    expect(revelado.movJugador).not.toBeNull();
    expect(revelado.movCpu).not.toBeNull();
    // Antes de confirmar no hay turno ni MP gastado.
    expect(revelado.estado!.turno).toBe(0);
    expect(revelado.estado!.jugador.aves[0].mpActual).toBe(mp);
  });

  it('el movimiento revelado es el elegido por el jugador y uno activo de cada ave', () => {
    const j = confirmarAve(moverMovimiento(nuevoJuego(), 0), crearRng(5));
    const revelado = usarMovimiento(j, crearRng(6));
    const activosJugador = j.estado!.jugador.aves[0].movimientos;
    expect(activosJugador[j.cursorMov]).toEqual(revelado.movJugador);
    expect(revelado.estado!.cpu.aves[0].movimientos).toContainEqual(revelado.movCpu);
  });

  it('la primera confirmación resuelve el turno y deja el daño visible en la revelación', () => {
    const j = confirmarAve(nuevoJuego(), crearRng(5));
    const resuelto = confirmarTurno(usarMovimiento(j, crearRng(6)), crearRng(7));
    expect(resuelto.pantalla).toBe('revelacion');
    expect(resuelto.estado!.turno).toBe(1);
    expect(resuelto.estado!.historial).toHaveLength(1);
    expect(resuelto.entradaTurno).not.toBeNull();
    expect(resuelto.entradaTurno!.danoAlCpu).toBeGreaterThanOrEqual(0);
    expect(resuelto.entradaTurno!.danoAlJugador).toBeGreaterThanOrEqual(0);
    expect(resuelto.mensaje.length).toBeGreaterThan(0);
    expect(resuelto.movJugador).not.toBeNull();
    expect(resuelto.movCpu).not.toBeNull();
  });

  it('la segunda confirmación continúa a batalla y limpia la revelación', () => {
    const j = confirmarAve(nuevoJuego(), crearRng(5));
    const resuelto = confirmarTurno(usarMovimiento(j, crearRng(6)), crearRng(7));
    const continuado = confirmarTurno(resuelto, crearRng(8));
    expect(continuado.pantalla).toMatch(/batalla|resultado/);
    expect(continuado.entradaTurno).toBeNull();
    expect(continuado.movJugador).toBeNull();
    expect(continuado.movCpu).toBeNull();
    // La segunda confirmación no vuelve a resolver el turno.
    expect(continuado.estado!.turno).toBe(1);
  });

  it('confirmar fuera de la revelación no cambia el juego', () => {
    const j = confirmarAve(nuevoJuego(), crearRng(5));
    expect(confirmarTurno(j, crearRng(1))).toBe(j);
  });

  it('la batalla termina en la pantalla de resultado con el ganador del motor', () => {
    let j = confirmarAve(nuevoJuego(), crearRng(7));
    let guard = 0;
    while (j.pantalla !== 'resultado' && guard++ < 500) {
      j = j.pantalla === 'batalla'
        ? usarMovimiento(j, crearRng(1000 + guard))
        : confirmarTurno(j, crearRng(2000 + guard));
    }
    expect(j.pantalla).toBe('resultado');
    expect(j.estado!.terminada).toBe(true);
    expect(j.resultado).toBe(j.estado!.ganador);
    expect(['jugador', 'cpu', 'empate']).toContain(j.resultado);
  });

  it('rendirse en batalla termina con victoria de la CPU', () => {
    const j = rendirse(confirmarAve(nuevoJuego(), crearRng(8)));
    expect(j.pantalla).toBe('resultado');
    expect(j.resultado).toBe('cpu');
    expect(j.mensaje).toMatch(/rindes/);
  });

  it('reiniciar vuelve a la selección y conserva el ave resaltada', () => {
    let j = confirmarAve(moverSeleccion(nuevoJuego(), 2), crearRng(9));
    j = rendirse(j);
    const otra = reiniciar(j);
    expect(otra.pantalla).toBe('seleccion');
    expect(otra.cursorAve).toBe(2);
    expect(otra.estado).toBeNull();
  });

  it('las acciones fuera de su pantalla no cambian el juego', () => {
    const seleccion = nuevoJuego();
    expect(usarMovimiento(seleccion, crearRng(1))).toBe(seleccion);
    expect(rendirse(seleccion)).toBe(seleccion);
    expect(reiniciar(seleccion)).toBe(seleccion);
  });
});

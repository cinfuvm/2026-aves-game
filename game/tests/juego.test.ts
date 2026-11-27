import { describe, expect, it } from 'vitest';
import {
  botDisponible,
  botsVisibles,
  cancelarBorrado,
  alternarAveDelCursor,
  confirmarBorrado,
  confirmarEquipo,
  confirmarOpcionTitulo,
  confirmarTurno,
  entrarCombate,
  moverOpcionBorrado,
  moverOpcionTitulo,
  moverMovimiento,
  moverMovimientoCuadricula,
  moverSeleccion,
  moverSeleccionCuadricula,
  moverTorre,
  nuevoJuego,
  puedeConfirmarEquipo,
  rendirse,
  reiniciar,
  usarMovimiento,
  volverATorre,
  volverAlTitulo,
  type Juego,
} from '../src/juego/flujo';
import { progresoVacio, type Progreso } from '../src/juego/guardado';
import { crearRng } from '../src/battle/rng';

/** Progreso con los primeros n bots vencidos. */
function progresoCon(n: number): Progreso {
  return { ...progresoVacio(), combatesGanados: Array.from({ length: n }, (_, i) => i) };
}

/** Lleva el juego a la selección con las 3 aves del catálogo ya elegidas. */
function enSeleccionCompleta(progreso: Progreso = progresoVacio()): Juego {
  return {
    ...nuevoJuego(progreso),
    pantalla: 'seleccion',
    seleccion: { cursorAve: 0, elegidas: ['condor', 'loica', 'chincol'] },
  };
}

/** Repone el MP del ave activa del jugador (evita bloqueos en simulaciones largas). */
function reponerMpActiva(j: Juego): Juego {
  if (j.pantalla !== 'batalla' || !j.estado) return j;
  const eq = j.estado.jugador;
  const aves = eq.aves.map((a, i) => (i === eq.indiceActiva ? { ...a, mpActual: a.mpMax } : a));
  return { ...j, estado: { ...j.estado, jugador: { ...eq, aves } } };
}

describe('flujo del juego — título y torre (game/src/juego/flujo.ts)', () => {
  it('empieza en el título', () => {
    const j = nuevoJuego();
    expect(j.pantalla).toBe('titulo');
    expect(j.progreso).toEqual(progresoVacio());
  });

  it('sin guardado, el título resalta «Nuevo juego» (no Continuar)', () => {
    expect(nuevoJuego().opcionTitulo).toBe(1);
  });

  it('con guardado, el título resalta «Continuar»', () => {
    expect(nuevoJuego(progresoCon(1)).opcionTitulo).toBe(0);
  });

  it('el cursor del título da la vuelta en ambos sentidos', () => {
    let j: Juego = { ...nuevoJuego(), opcionTitulo: 1 };
    j = moverOpcionTitulo(j, -1);
    expect(j.opcionTitulo).toBe(0);
    j = moverOpcionTitulo(j, -1);
    expect(j.opcionTitulo).toBe(2);
    j = moverOpcionTitulo(j, 1);
    expect(j.opcionTitulo).toBe(0);
  });

  it('«Continuar» sin guardado no avanza', () => {
    const j: Juego = { ...nuevoJuego(), opcionTitulo: 0 };
    expect(confirmarOpcionTitulo(j).pantalla).toBe('titulo');
  });

  it('«Continuar» con guardado entra al menú de torre', () => {
    const j: Juego = { ...nuevoJuego(progresoCon(2)), opcionTitulo: 0 };
    expect(confirmarOpcionTitulo(j).pantalla).toBe('menu_torre');
  });

  it('«Nuevo juego» reinicia el progreso y entra al menú de torre', () => {
    const j: Juego = { ...nuevoJuego(progresoCon(2)), opcionTitulo: 1 };
    const despues = confirmarOpcionTitulo(j);
    expect(despues.pantalla).toBe('menu_torre');
    expect(despues.progreso).toEqual(progresoVacio());
  });

  it('«Borrar guardado» abre el modal de confirmación', () => {
    const j: Juego = { ...nuevoJuego(progresoCon(1)), opcionTitulo: 2 };
    expect(confirmarOpcionTitulo(j).pantalla).toBe('confirmar_borrado');
  });

  it('el modal de borrado alterna sí/no', () => {
    let j: Juego = { ...nuevoJuego(), pantalla: 'confirmar_borrado', opcionBorrado: 1 };
    j = moverOpcionBorrado(j, 1);
    expect(j.opcionBorrado).toBe(0);
    j = moverOpcionBorrado(j, 1);
    expect(j.opcionBorrado).toBe(1);
  });

  it('confirmar «no» no borra y vuelve al título', () => {
    let llamado = false;
    const j: Juego = { ...nuevoJuego(progresoCon(1)), pantalla: 'confirmar_borrado', opcionBorrado: 1 };
    const despues = confirmarBorrado(j, () => (llamado = true));
    expect(despues.pantalla).toBe('titulo');
    expect(llamado).toBe(false);
    expect(despues.progreso.combatesGanados).toEqual([0]);
  });

  it('confirmar «sí» invoca el borrado y vacía el progreso', () => {
    let llamado = false;
    const j: Juego = { ...nuevoJuego(progresoCon(1)), pantalla: 'confirmar_borrado', opcionBorrado: 0 };
    const despues = confirmarBorrado(j, () => (llamado = true));
    expect(llamado).toBe(true);
    expect(despues.pantalla).toBe('titulo');
    expect(despues.progreso).toEqual(progresoVacio());
  });

  it('cancelar el borrado vuelve al título sin tocar el progreso', () => {
    const j: Juego = { ...nuevoJuego(progresoCon(1)), pantalla: 'confirmar_borrado' };
    expect(cancelarBorrado(j).pantalla).toBe('titulo');
  });

  it('la torre muestra 7 enemigos hasta vencer al 7.º', () => {
    expect(botsVisibles(progresoVacio())).toBe(7);
    expect(botsVisibles(progresoCon(6))).toBe(7);
    expect(botsVisibles(progresoCon(7))).toBe(8);
  });

  it('solo el siguiente enemigo y los ya ganados están disponibles', () => {
    const p = progresoCon(2);
    expect(botDisponible(p, 0)).toBe(true);
    expect(botDisponible(p, 1)).toBe(true);
    expect(botDisponible(p, 2)).toBe(true);
    expect(botDisponible(p, 3)).toBe(false);
  });

  it('el cursor de la torre da la vuelta entre los visibles', () => {
    let j: Juego = { ...nuevoJuego(), pantalla: 'menu_torre' };
    j = moverTorre(j, -1);
    expect(j.cursorTorre).toBe(6);
    j = moverTorre(j, 1);
    expect(j.cursorTorre).toBe(0);
  });

  it('entrar a un combate no disponible no cambia de pantalla', () => {
    const j: Juego = { ...nuevoJuego(), pantalla: 'menu_torre', cursorTorre: 3 };
    expect(entrarCombate(j).pantalla).toBe('menu_torre');
  });

  it('entrar al siguiente combate pasa a la selección', () => {
    const j: Juego = { ...nuevoJuego(), pantalla: 'menu_torre', cursorTorre: 0 };
    expect(entrarCombate(j).pantalla).toBe('seleccion');
  });

  it('volver al título conserva el progreso', () => {
    const j: Juego = { ...nuevoJuego(progresoCon(3)), pantalla: 'menu_torre' };
    const titulo = volverAlTitulo(j);
    expect(titulo.pantalla).toBe('titulo');
    expect(titulo.progreso.combatesGanados).toEqual([0, 1, 2]);
    expect(titulo.opcionTitulo).toBe(0);
  });
});

describe('flujo del juego — selección 3v3 y batalla (game/src/juego/flujo.ts)', () => {
  it('el cursor de selección recorre el catálogo de 10 aves con vuelta', () => {
    let j = nuevoJuego();
    j = { ...j, pantalla: 'seleccion' };
    j = moverSeleccion(j, -1);
    expect(j.cursorAve).toBe(9);
    j = moverSeleccion(j, 1);
    expect(j.cursorAve).toBe(0);
    j = moverSeleccion(j, 4);
    expect(j.cursorAve).toBe(4);
  });

  it('el cursor de selección se mueve en rejilla 5x2 sin salir de la fila', () => {
    // Índices: 0 1 2 3 4 / 5 6 7 8 9
    let j = nuevoJuego();
    j = { ...j, pantalla: 'seleccion', cursorAve: 0 };
    j = moverSeleccionCuadricula(j, 0, 1); // 0 -> 1
    expect(j.cursorAve).toBe(1);
    j = moverSeleccionCuadricula(j, 1, 0); // 1 -> 6
    expect(j.cursorAve).toBe(6);
    j = moverSeleccionCuadricula(j, -1, 0); // 6 -> 1
    expect(j.cursorAve).toBe(1);
    expect(moverSeleccionCuadricula(j, 0, -1).cursorAve).toBe(0); // izquierda desde 0 (borde col 0)
    expect(moverSeleccionCuadricula(j, 0, -2).cursorAve).toBe(1); // no sale de la fila
    expect(moverSeleccionCuadricula(j, 1, 0).cursorAve).toBe(6); // baja dentro de columna 1
    const enUltimaFila: Juego = { ...j, cursorAve: 6 };
    expect(moverSeleccionCuadricula(enUltimaFila, 1, 0).cursorAve).toBe(6); // abajo en borde
  });

  it('alternar un ave la añade y quitarla la elimina', () => {
    let j: Juego = { ...nuevoJuego(), pantalla: 'seleccion' };
    j = alternarAveDelCursor(j); // añade el ave del cursor (índice 0)
    expect(j.seleccion.elegidas).toEqual(['condor']);
    j = alternarAveDelCursor(j); // la vuelve a quitar
    expect(j.seleccion.elegidas).toEqual([]);
  });

  it('no se pueden elegir más de 3 aves', () => {
    const j = enSeleccionCompleta();
    // cursor en condor (ya elegido); moverlo a loica y alternar no añade nada
    const conCursor = { ...j, cursorAve: 1 };
    const alternado = alternarAveDelCursor(conCursor); // quita loica (ya estaba)
    expect(alternado.seleccion.elegidas).toHaveLength(2);
  });

  it('entrar a combate prepara selección vacía y vistazo del rival', () => {
    const j: Juego = { ...nuevoJuego(), pantalla: 'menu_torre', cursorTorre: 0 };
    const sel = entrarCombate(j);
    expect(sel.pantalla).toBe('seleccion');
    expect(sel.seleccion.elegidas).toEqual([]);
    expect(sel.equipoEnemigo.length).toBe(3);
  });

  it('no se puede confirmar el equipo sin las 3 aves', () => {
    const j: Juego = { ...nuevoJuego(), pantalla: 'seleccion' };
    expect(puedeConfirmarEquipo(j)).toBe(false);
    expect(confirmarEquipo(j, crearRng(1)).pantalla).toBe('seleccion');
  });

  it('confirmar un equipo completo crea una batalla 3v3 con los equipos elegidos', () => {
    const j = confirmarEquipo(enSeleccionCompleta(), crearRng(1));
    expect(j.pantalla).toBe('batalla');
    expect(j.fichaJugador?.id).toBe('condor');
    expect(j.estado?.config.modo).toBe('3v3');
    expect(j.estado?.jugador.aves).toHaveLength(3);
    expect(j.estado?.cpu.aves).toHaveLength(3);
    expect(j.estado?.turno).toBe(0);
  });

  it('el cursor de movimientos recorre los 4 activos', () => {
    let j = confirmarEquipo(enSeleccionCompleta(), crearRng(2));
    j = moverMovimiento(j, -1);
    expect(j.cursorMov).toBe(3);
    j = moverMovimiento(j, 1);
    expect(j.cursorMov).toBe(0);
  });

  it('el cursor de movimientos se mueve en cuadrícula 2x2', () => {
    // Índices: 0 1 / 2 3
    let j = confirmarEquipo(enSeleccionCompleta(), crearRng(2));
    expect(j.cursorMov).toBe(0);
    j = moverMovimientoCuadricula(j, 0, 1); // 0 -> 1 (derecha)
    expect(j.cursorMov).toBe(1);
    j = moverMovimientoCuadricula(j, 1, 0); // 1 -> 3 (abajo)
    expect(j.cursorMov).toBe(3);
    j = moverMovimientoCuadricula(j, 0, -1); // 3 -> 2 (izquierda)
    expect(j.cursorMov).toBe(2);
    j = moverMovimientoCuadricula(j, -1, 0); // 2 -> 0 (arriba)
    expect(j.cursorMov).toBe(0);
  });

  it('el cursor no sale de la cuadrícula en los bordes', () => {
    const j = confirmarEquipo(enSeleccionCompleta(), crearRng(2));
    expect(moverMovimientoCuadricula(j, -1, 0).cursorMov).toBe(0); // arriba desde 0
    expect(moverMovimientoCuadricula(j, 0, -1).cursorMov).toBe(0); // izquierda desde 0
    const enFila2 = { ...j, cursorMov: 2 };
    expect(moverMovimientoCuadricula(enFila2, 1, 0).cursorMov).toBe(2); // abajo desde 2
    const enEsquina = { ...j, cursorMov: 1 };
    expect(moverMovimientoCuadricula(enEsquina, 0, 1).cursorMov).toBe(1); // derecha desde 1
  });

  it('un movimiento bloqueado por MP no resuelve turno y avisa', () => {
    let j = confirmarEquipo(enSeleccionCompleta(), crearRng(3));
    const ave = j.estado!.jugador.aves[0];
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
    const j = confirmarEquipo(enSeleccionCompleta(), crearRng(5));
    const mp = j.estado!.jugador.aves[0].mpActual;
    const revelado = usarMovimiento(j, crearRng(6));
    expect(revelado.pantalla).toBe('revelacion');
    expect(revelado.movJugador).not.toBeNull();
    expect(revelado.movCpu).not.toBeNull();
    expect(revelado.estado!.turno).toBe(0);
    expect(revelado.estado!.jugador.aves[0].mpActual).toBe(mp);
  });

  it('el movimiento revelado es el elegido por el jugador y uno activo de cada ave', () => {
    const j = confirmarEquipo(moverMovimiento(enSeleccionCompleta(), 0), crearRng(5));
    const revelado = usarMovimiento(j, crearRng(6));
    const activosJugador = j.estado!.jugador.aves[0].movimientos;
    expect(activosJugador[j.cursorMov]).toEqual(revelado.movJugador);
    expect(revelado.estado!.cpu.aves[0].movimientos).toContainEqual(revelado.movCpu);
  });

  it('la primera confirmación resuelve el turno y deja el daño visible en la revelación', () => {
    const j = confirmarEquipo(enSeleccionCompleta(), crearRng(5));
    const resuelto = confirmarTurno(usarMovimiento(j, crearRng(6)), crearRng(7));
    expect(resuelto.pantalla).toBe('revelacion');
    expect(resuelto.estado!.turno).toBe(1);
    expect(resuelto.estado!.historial).toHaveLength(1);
    expect(resuelto.entradaTurno).not.toBeNull();
    expect(resuelto.entradaTurno!.danoAlCpu).toBeGreaterThanOrEqual(0);
    expect(resuelto.entradaTurno!.danoAlJugador).toBeGreaterThanOrEqual(0);
    expect(resuelto.mensaje.length).toBeGreaterThan(0);
  });

  it('la segunda confirmación continúa a batalla y limpia la revelación', () => {
    const j = confirmarEquipo(enSeleccionCompleta(), crearRng(5));
    const resuelto = confirmarTurno(usarMovimiento(j, crearRng(6)), crearRng(7));
    const continuado = confirmarTurno(resuelto, crearRng(8));
    expect(continuado.pantalla).toMatch(/batalla|resultado/);
    expect(continuado.entradaTurno).toBeNull();
    expect(continuado.movJugador).toBeNull();
    expect(continuado.movCpu).toBeNull();
    expect(continuado.estado!.turno).toBe(1);
  });

  it('confirmar fuera de la revelación no cambia el juego', () => {
    const j = confirmarEquipo(enSeleccionCompleta(), crearRng(5));
    expect(confirmarTurno(j, crearRng(1))).toBe(j);
  });

  it('la batalla 3v3 termina en la pantalla de resultado con el ganador del motor', () => {
    let j = confirmarEquipo(enSeleccionCompleta(), crearRng(7));
    let guard = 0;
    while (j.pantalla !== 'resultado' && guard++ < 3000) {
      if (j.pantalla === 'batalla') {
        j = reponerMpActiva(j);
        j = usarMovimiento(j, crearRng(1000 + guard));
      } else {
        j = confirmarTurno(j, crearRng(2000 + guard));
      }
    }
    expect(j.pantalla).toBe('resultado');
    expect(j.estado!.terminada).toBe(true);
    expect(j.resultado).toBe(j.estado!.ganador);
  });

  it('rendirse tres veces deja al jugador sin aves y gana la CPU', () => {
    let j = confirmarEquipo(enSeleccionCompleta(), crearRng(8));
    let guard = 0;
    while (j.pantalla !== 'resultado' && guard++ < 10) {
      j = rendirse(j);
    }
    expect(j.pantalla).toBe('resultado');
    expect(j.resultado).toBe('cpu');
  });

  it('rendir el ave activa en 3v3 hace relevo sin terminar la batalla', () => {
    const j = confirmarEquipo(enSeleccionCompleta(), crearRng(8));
    const tras = rendirse(j);
    expect(tras.pantalla).toBe('batalla');
    expect(tras.estado!.jugador.indiceActiva).toBe(1);
    expect(tras.estado!.jugador.aves[0].estado).toBe('rendida');
  });

  it('volver a torre desde selección descarta la selección', () => {
    const j = volverATorre(enSeleccionCompleta());
    expect(j.pantalla).toBe('menu_torre');
    expect(j.seleccion.elegidas).toEqual([]);
    expect(j.equipoEnemigo).toEqual([]);
  });

  it('reiniciar vuelve a la torre y conserva el progreso', () => {
    let j = confirmarEquipo(enSeleccionCompleta(progresoCon(2)), crearRng(9));
    let guard = 0;
    while (j.pantalla !== 'resultado' && guard++ < 10) j = rendirse(j);
    const otra = reiniciar(j);
    expect(otra.pantalla).toBe('menu_torre');
    expect(otra.estado).toBeNull();
    expect(otra.progreso.combatesGanados).toEqual([0, 1]);
  });

  it('las acciones fuera de su pantalla no cambian el juego', () => {
    const titulo = nuevoJuego();
    expect(usarMovimiento(titulo, crearRng(1))).toBe(titulo);
    expect(rendirse(titulo)).toBe(titulo);
    expect(reiniciar(titulo)).toBe(titulo);
  });
});

describe('flujo del juego — victoria en la torre (P3)', () => {
  /** Entra a un combate de la torre, elige el equipo 3v3 y crea la batalla. */
  function entrarYJugar(indiceBot: number, progreso: Progreso = progresoVacio()): Juego {
    let j: Juego = { ...nuevoJuego(progreso), pantalla: 'menu_torre', cursorTorre: indiceBot };
    j = entrarCombate(j);
    j = { ...j, seleccion: { cursorAve: 0, elegidas: ['condor', 'loica', 'chincol'] } };
    return confirmarEquipo(j, crearRng(1));
  }

  /** Deja a TODAS las aves del CPU con 1 HP y las del jugador al máximo (gana seguro). */
  function prepararVictoria(j: Juego): Juego {
    const jugador = j.estado!.jugador
    const cpu = j.estado!.cpu
    return {
      ...j,
      estado: {
        ...j.estado!,
        jugador: {
          ...jugador,
          aves: jugador.aves.map((a) => ({ ...a, hpActual: a.hpMax, mpActual: a.mpMax })),
        },
        cpu: { ...cpu, aves: cpu.aves.map((a) => ({ ...a, hpActual: 1 })) },
      },
    }
  }

  /** Juega turnos hasta llegar a resultado (la CPU cae en pocos turnos). */
  function jugarHastaResultado(j: Juego): Juego {
    let actual = j;
    let guard = 0;
    while (actual.pantalla !== 'resultado' && guard++ < 300) {
      if (actual.pantalla === 'batalla') {
        actual = usarMovimiento(reponerMpActiva(actual), crearRng(100 + guard));
      } else if (actual.pantalla === 'revelacion') {
        actual = confirmarTurno(actual, crearRng(200 + guard));
      }
    }
    return actual;
  }

  it('entrar a un combate de la torre fija el bot actual', () => {
    const j: Juego = { ...nuevoJuego(progresoCon(2)), pantalla: 'menu_torre', cursorTorre: 2 };
    expect(entrarCombate(j).botActual).toBe(2);
  });

  it('crear la batalla desde la torre conserva el bot actual', () => {
    const j = entrarYJugar(0);
    expect(j.pantalla).toBe('batalla');
    expect(j.botActual).toBe(0);
  });

  it('ganar al bot actual lo registra en el progreso y desbloquea el siguiente', () => {
    let j = entrarYJugar(0, progresoVacio());
    j = prepararVictoria(j);
    j = jugarHastaResultado(j);
    expect(j.pantalla).toBe('resultado');
    expect(j.resultado).toBe('jugador');
    expect(j.progreso.combatesGanados).toContain(0);
    expect(botDisponible(j.progreso, 1)).toBe(true);
  });

  it('perder o rendirse no registra la victoria', () => {
    let j = entrarYJugar(0, progresoVacio());
    let guard = 0;
    while (j.pantalla !== 'resultado' && guard++ < 10) j = rendirse(j);
    expect(j.pantalla).toBe('resultado');
    expect(j.resultado).toBe('cpu');
    expect(j.progreso.combatesGanados).toEqual([]);
  });

  it('rejugar un bot ya vencido no duplica su entrada', () => {
    let j = entrarYJugar(1, progresoCon(3));
    j = prepararVictoria(j);
    j = jugarHastaResultado(j);
    expect(j.resultado).toBe('jugador');
    expect(j.progreso.combatesGanados.filter((b) => b === 1)).toHaveLength(1);
    expect(j.progreso.combatesGanados).toEqual([0, 1, 2]);
  });

  it('una batalla fuera de la torre (sin botActual) no altera el progreso', () => {
    let j = confirmarEquipo(enSeleccionCompleta(progresoCon(2)), crearRng(5));
    // enSeleccionCompleta no pasa por entrarCombate: botActual es null.
    expect(j.botActual).toBeNull();
    j = prepararVictoria(j);
    j = jugarHastaResultado(j);
    expect(j.resultado).toBe('jugador');
    expect(j.progreso.combatesGanados).toEqual([0, 1]);
  });
});


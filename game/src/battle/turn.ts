/**
 * Resolución de turnos (Parte A).
 * Fuente: plan_logica.md (reglas de pelea.md) + docs/modules/prd/pages/reglas-batalla.adoc,
 * con las desviaciones D-01, D-02, D-04, D-07, D-09 y D-11 de changes.md.
 *
 * Flujo de `resolverTurno`:
 *   1. Validar el estado y que ambos movimientos pertenezcan a las aves activas
 *      y tengan MP suficiente (si no, se lanza un error; la UI debe prevenirlo).
 *   2. Descontar el coste de MP de cada bando (pasiva Papel: probabilidad de coste 0).
 *   3. Comparar los tipos con la matriz PPTLS.
 *   4. Calcular el daño:
 *      - si gana un bando, solo él inflige daño (BR-005);
 *      - en empate, ambos bandos calculan y reciben daño (D-02).
 *   5. Aplicar el daño (nunca por debajo de 0).
 *   6. Procesar salidas: HP 0 → debilitada (CB-05: prioridad sobre la rendición);
 *      sin movimientos usables por MP → rendida (D-07). Relevo en orden (siguienteAve).
 *   7. Pasiva Lagarto: regenera `regeneracionLagarto` HP al final del turno
 *      (solo aves activas en pie, con tope en hpMax; no revive a las debilitadas).
 *   8. Evaluar fin de batalla (BR-013, empate técnico incluido).
 *   9. Devolver el estado nuevo (el original no se muta) + la entrada de historial.
 *
 * Orden de consumo del `rng` (documentado para tests deterministas):
 *   1) tirada de pasiva Papel del jugador (solo si su ave es de tipo papel),
 *   2) tirada de pasiva Papel del CPU (solo si su ave es de tipo papel),
 *   3) daño jugador → CPU (si el jugador gana o hay empate),
 *   4) daño CPU → jugador (si el CPU gana o hay empate).
 * Relevos y regeneraciones no consumen aleatoriedad.
 */

import { calcularDano, MENSAJE_EFECTIVIDAD } from './damage';
import { compararPPTLS, mensajePPTLS } from './pptls';
import { crearRng } from './rng'; // reexportado por conveniencia para la Parte B
import {
  aveActiva,
  estaBloqueado,
  evaluarFin,
  siguienteAve,
  tieneMovimientoUsable,
} from './state';
import {
  type AveCombate,
  type EntradaHistorial,
  type Equipo,
  type EstadoBatalla,
  type MovimientoActivo,
  type ResultadoTurno,
  type Rng,
} from './types';

export { crearRng };

/** Copia profunda de un ave (sus movimientos incluidos). */
function clonarAve(ave: AveCombate): AveCombate {
  return { ...ave, movimientos: ave.movimientos.map((mov) => ({ ...mov })) };
}

/** Copia profunda de un equipo. */
function clonarEquipo(equipo: Equipo): Equipo {
  return { indiceActiva: equipo.indiceActiva, aves: equipo.aves.map(clonarAve) };
}

/** Copia profunda del estado de batalla: resolverTurno no muta el original. */
export function clonarEstado(estado: EstadoBatalla): EstadoBatalla {
  return {
    jugador: clonarEquipo(estado.jugador),
    cpu: clonarEquipo(estado.cpu),
    config: { ...estado.config },
    turno: estado.turno,
    historial: estado.historial.map((entrada) => ({ ...entrada })),
    terminada: estado.terminada,
    ganador: estado.ganador,
  };
}

/**
 * Valida que el movimiento pertenezca al ave activa y no esté bloqueado por MP.
 * Devuelve el movimiento de la ficha del ave (el objeto pasado puede ser una copia de la UI).
 */
function validarMovimiento(
  ave: AveCombate,
  movimiento: MovimientoActivo,
  lado: string,
): MovimientoActivo {
  const encontrado = ave.movimientos.find((mov) => mov.id === movimiento.id);
  if (!encontrado) {
    throw new Error(
      `El movimiento "${movimiento.id}" no pertenece al ave activa del ${lado}`,
    );
  }
  if (estaBloqueado(encontrado, ave)) {
    throw new Error(
      `Movimiento bloqueado por MP insuficiente: ${encontrado.nombre} (coste ${encontrado.costeMp}, MP ${ave.mpActual})`,
    );
  }
  return encontrado;
}

/**
 * Descuenta el coste del movimiento del MP del ave.
 * Pasiva Papel: si el ave es de tipo papel, tira el rng; bajo `probCosteCeroPapel`
 * el movimiento no consume MP. Devuelve el MP realmente gastado.
 */
function pagarMp(
  ave: AveCombate,
  movimiento: MovimientoActivo,
  lado: string,
  eventos: string[],
  rng: Rng,
  probCosteCeroPapel: number,
): number {
  if (ave.tipo === 'papel' && rng() < probCosteCeroPapel) {
    eventos.push(
      `${ave.nombre} activa su pasiva de papel: el movimiento no consumió MP`,
    );
    return 0;
  }
  ave.mpActual -= movimiento.costeMp;
  return movimiento.costeMp;
}

/** Pasiva Lagarto: regenera HP al final del turno sin superar el HP máx. */
function regenerarLagarto(
  ave: AveCombate,
  cantidad: number,
  eventos: string[],
): void {
  if (ave.tipo !== 'lagarto' || ave.estado !== 'activa') return;
  if (ave.hpActual <= 0 || ave.hpActual >= ave.hpMax) return;
  const antes = ave.hpActual;
  ave.hpActual = Math.min(ave.hpMax, ave.hpActual + cantidad);
  eventos.push(`${ave.nombre} recupera ${ave.hpActual - antes} HP (pasiva lagarto)`);
}

/**
 * Procesa la salida del ave activa de un equipo tras el daño:
 * - HP 0 → 'debilitada' (prioridad sobre la rendición, CB-05).
 * - Sin movimientos usables por MP → 'rendida' (D-07).
 * En ambos casos hace el relevo con `siguienteAve` si hay aves disponibles.
 */
function procesarSalida(equipo: Equipo, lado: string, eventos: string[]): void {
  const ave = aveActiva(equipo);

  if (ave.hpActual <= 0) {
    ave.estado = 'debilitada';
    eventos.push(`${ave.nombre} se debilita`);
  } else if (!tieneMovimientoUsable(ave)) {
    ave.estado = 'rendida';
    eventos.push(`${ave.nombre} se rinde: sin movimientos usables por MP`);
  } else {
    return; // el ave sigue en combate
  }

  const relevo = siguienteAve(equipo);
  if (relevo >= 0) {
    equipo.indiceActiva = relevo;
    eventos.push(`Entra ${aveActiva(equipo).nombre} (${lado})`);
  }
  // Sin relevo disponible: evaluarFin marcará el resultado de la batalla.
}

/**
 * Resuelve un turno completo y devuelve el estado nuevo + la entrada de historial.
 * El estado original no se muta.
 *
 * Precondiciones (lanza error si no se cumplen):
 * - La batalla no terminó.
 * - Ambos movimientos pertenecen a las aves activas y tienen MP suficiente.
 */
export function resolverTurno(
  estado: EstadoBatalla,
  movJugador: MovimientoActivo,
  movCpu: MovimientoActivo,
  rng: Rng,
): ResultadoTurno {
  if (estado.terminada) {
    throw new Error('La batalla ya terminó: no se pueden resolver más turnos');
  }

  const aveJugador = aveActiva(estado.jugador);
  const aveCpu = aveActiva(estado.cpu);

  const jugadorReal = validarMovimiento(aveJugador, movJugador, 'jugador');
  const cpuReal = validarMovimiento(aveCpu, movCpu, 'cpu');

  const nuevo = clonarEstado(estado);
  const nJugador = aveActiva(nuevo.jugador);
  const nCpu = aveActiva(nuevo.cpu);
  const eventos: string[] = [];

  // 2) Pago de MP (orden documentado: jugador, luego CPU).
  const mpGastadoJugador = pagarMp(
    nJugador,
    jugadorReal,
    'jugador',
    eventos,
    rng,
    nuevo.config.probCosteCeroPapel,
  );
  const mpGastadoCpu = pagarMp(
    nCpu,
    cpuReal,
    'cpu',
    eventos,
    rng,
    nuevo.config.probCosteCeroPapel,
  );

  // 3) Intercambio PPTLS.
  const resultado = compararPPTLS(jugadorReal.tipo, cpuReal.tipo);
  const pptls = mensajePPTLS(jugadorReal.tipo, cpuReal.tipo);

  // 4) Daño (D-02: en empate ambos bandos infligen y reciben).
  let danoAlCpu = 0;
  let danoAlJugador = 0;
  let clasifCpu: string | undefined;
  let clasifJugador: string | undefined;

  if (resultado === 'jugador' || resultado === 'empate') {
    const detalleCpu = calcularDano(
      nCpu.hpMax,
      jugadorReal,
      nJugador.tipo,
      resultado === 'jugador',
      rng,
      nuevo.config,
    );
    danoAlCpu = detalleCpu.dano;
    clasifCpu = MENSAJE_EFECTIVIDAD[detalleCpu.clasificacion];
  }
  if (resultado === 'cpu' || resultado === 'empate') {
    const detalleJugador = calcularDano(
      nJugador.hpMax,
      cpuReal,
      nCpu.tipo,
      resultado === 'cpu',
      rng,
      nuevo.config,
    );
    danoAlJugador = detalleJugador.dano;
    clasifJugador = MENSAJE_EFECTIVIDAD[detalleJugador.clasificacion];
  }

  // 5) Aplicar daño (nunca por debajo de 0).
  nCpu.hpActual = Math.max(0, nCpu.hpActual - danoAlCpu);
  nJugador.hpActual = Math.max(0, nJugador.hpActual - danoAlJugador);

  // Mensaje del turno.
  let mensaje: string;
  if (resultado === 'jugador') {
    mensaje = `${pptls}. ${clasifCpu}`;
  } else if (resultado === 'cpu') {
    mensaje = `${pptls}. ${clasifJugador}`;
  } else {
    mensaje = `${pptls}. Ambos bandos se dañan (jugador -${danoAlJugador}, CPU -${danoAlCpu})`;
  }

  // 6) Salidas y relevos.
  procesarSalida(nuevo.jugador, 'jugador', eventos);
  procesarSalida(nuevo.cpu, 'cpu', eventos);

  // 7) Pasiva Lagarto al final del turno (solo aves activas en pie).
  regenerarLagarto(nJugador, nuevo.config.regeneracionLagarto, eventos);
  regenerarLagarto(nCpu, nuevo.config.regeneracionLagarto, eventos);

  // 8) Fin de batalla.
  nuevo.turno = estado.turno + 1;
  const ganador = evaluarFin(nuevo);
  if (ganador !== null) {
    nuevo.terminada = true;
    nuevo.ganador = ganador;
    eventos.push(
      ganador === 'empate'
        ? 'Empate técnico: ambos equipos se quedaron sin aves'
        : `Fin de la batalla: gana ${ganador === 'jugador' ? 'el jugador' : 'el CPU'}`,
    );
  }

  // 9) Historial.
  const entrada: EntradaHistorial = {
    turno: nuevo.turno,
    movJugador: { ...jugadorReal },
    movCpu: { ...cpuReal },
    resultado,
    danoAlCpu,
    danoAlJugador,
    mpGastadoJugador,
    mpGastadoCpu,
    mensaje,
    eventos,
  };
  nuevo.historial = [...nuevo.historial, entrada];

  return { estado: nuevo, entrada };
}

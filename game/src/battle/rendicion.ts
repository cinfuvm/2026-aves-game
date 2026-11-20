/**
 * Rendición manual del ave activa (RF-015, BR-012).
 * Fuente: docs/modules/prd/pages/reglas-batalla.adoc (BR-012, BR-013).
 *
 * Rendirse no consume turno ni MP: el ave activa sale del combate con estado
 * 'rendida', entra la siguiente ave del equipo (si hay) y se evalúa el fin de
 * la batalla. Como resolverTurno, no muta el estado recibido.
 */

import { clonarEstado } from './turn';
import { aveActiva, evaluarFin, siguienteAve } from './state';
import type { EstadoBatalla, Equipo } from './types';

export type LadoBatalla = 'jugador' | 'cpu';

export interface ResultadoRendicion {
  estado: EstadoBatalla;
  /** Texto para mostrar, p. ej. «Piedra se rinde». */
  evento: string;
}

/**
 * Hace que el ave activa del `lado` se rinda.
 * Lanza un error si la batalla ya terminó.
 */
export function rendirAveActiva(estado: EstadoBatalla, lado: LadoBatalla): ResultadoRendicion {
  if (estado.terminada) {
    throw new Error('La batalla ya terminó: no se puede rendir un ave');
  }

  const nuevo = clonarEstado(estado);
  const equipo: Equipo = lado === 'jugador' ? nuevo.jugador : nuevo.cpu;
  const ave = aveActiva(equipo);
  ave.estado = 'rendida';

  const relevo = siguienteAve(equipo);
  if (relevo >= 0) equipo.indiceActiva = relevo;

  const ganador = evaluarFin(nuevo);
  if (ganador !== null) {
    nuevo.terminada = true;
    nuevo.ganador = ganador;
  }

  return { estado: nuevo, evento: `${ave.nombre} se rinde` };
}

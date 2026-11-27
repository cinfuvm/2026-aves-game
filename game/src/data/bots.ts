/**
 * Los 8 bots de la torre (plan_desarrollo.md, Área B, §5.1 y §5.2).
 *
 * Cada bot es un perfil 'estrategico' de `battle/cpu.ts` con su personalidad:
 * - Enemigos 1 a 5 (media): uno por tipo PPTLS. Usan sobre todo su tipo, sin
 *   usar solo ese, y cada uno «piensa» distinto.
 * - Enemigo 6 (media/alta): general, sin tipo fijo, equilibrado.
 * - Enemigo 7 (alta, jefe): predice al jugador **solo con el historial** (D-J)
 *   combinando varios predictores según cuánto acierta cada uno.
 * - Enemigo 8 (muy alta, secreto): como el 7, pero «algo injusto»: conoce los
 *   movimientos usables del jugador y arma su equipo contra el del jugador.
 *   Tampoco ve la elección actual del jugador.
 *
 * Todos tienen azar: `temperatura` (softmax) y `exploracion` (piso de
 * probabilidad para cualquier movimiento). Los valores se midieron con
 * `npm run bots:sim` (ver `scripts/simular-bots.ts` y changes.md).
 */

import type { AveFicha, Rng, TipoPPTLS } from '../battle/types';
import { armarEquipoCpu, type ParametrosIA, type PerfilEstrategico } from '../battle/cpu';

export type DificultadBot = 'media' | 'media-alta' | 'alta' | 'muy-alta';

export interface BotCpu {
  /** Identificador estable (para guardado y registro de combates). */
  id: string;
  /** Nombre en la torre: «Enemigo 1» a «Enemigo 8». */
  nombre: string;
  /** Apodo que resume su personalidad. */
  apodo: string;
  dificultad: DificultadBot;
  /** Tipo favorito (Enemigos 1 a 5) o null (6 a 8). */
  afinidad: TipoPPTLS | null;
  /** Id del ave característica (se desbloquea al vencerlo, D-E). Null en el Enemigo 8. */
  aveCaracteristica: string | null;
  /** Texto corto para el menú de la torre y el manual. */
  descripcion: string;
  /** Arma su equipo mirando el del jugador (solo el Enemigo 8). */
  contraEquipo: boolean;
  /** Perfil que se pasa a `elegirMovimientoCpu`. */
  perfil: PerfilEstrategico;
}

/** Valores comunes de la IA; cada bot cambia solo lo que lo distingue. */
const IA_BASE: ParametrosIA = {
  afinidad: null,
  pesoAfinidad: 0,
  temperatura: 0.25,
  exploracion: 0.12,
  predictores: [],
  confianza: 0,
  memoria: 0.85,
  agresividad: 1,
  aversionRiesgo: 0.8,
  rematador: 0.5,
  ahorroMp: 0.15,
  evitaRepetir: 0,
  terco: 0,
  informacionCompleta: false,
};

function crearBot(
  datos: Omit<BotCpu, 'perfil' | 'contraEquipo'> & { contraEquipo?: boolean },
  ia: Partial<ParametrosIA>,
): BotCpu {
  return {
    ...datos,
    contraEquipo: datos.contraEquipo ?? false,
    perfil: { tipo: 'estrategico', ia: { ...IA_BASE, afinidad: datos.afinidad, ...ia } },
  };
}

export const ENEMIGO_1 = crearBot(
  {
    id: 'enemigo-1',
    nombre: 'Enemigo 1',
    apodo: 'El Porfiado',
    dificultad: 'media',
    afinidad: 'piedra',
    aveCaracteristica: 'picaflor',
    descripcion:
      'Terco como piedra: si un movimiento le funcionó, lo repite. No intenta adivinar tu jugada.',
  },
  {
    pesoAfinidad: 0.3,
    terco: 0.15,
    temperatura: 0.3,
    exploracion: 0.15,
    predictores: [],
    confianza: 0,
  },
);

export const ENEMIGO_2 = crearBot(
  {
    id: 'enemigo-2',
    nombre: 'Enemigo 2',
    apodo: 'La Filosa',
    dificultad: 'media',
    afinidad: 'tijera',
    aveCaracteristica: 'diucon',
    descripcion:
      'Ataca sin miedo y gasta MP en golpes caros. Se fija en cómo reaccionas después de ganar o perder.',
  },
  {
    pesoAfinidad: 0.25,
    agresividad: 1.5,
    aversionRiesgo: 0.4,
    rematador: 0.9,
    ahorroMp: 0,
    temperatura: 0.3,
    exploracion: 0.12,
    predictores: ['reaccion'],
    confianza: 0.3,
  },
);

export const ENEMIGO_3 = crearBot(
  {
    id: 'enemigo-3',
    nombre: 'Enemigo 3',
    apodo: 'El Centinela',
    dificultad: 'media',
    afinidad: 'papel',
    aveCaracteristica: 'queltehue',
    descripcion:
      'Vigila tus costumbres: recuerda qué tipos usas más. Juega a la defensiva y cuida su MP.',
  },
  {
    pesoAfinidad: 0.25,
    agresividad: 0.8,
    aversionRiesgo: 1.3,
    rematador: 0.4,
    ahorroMp: 0.4,
    temperatura: 0.2,
    exploracion: 0.12,
    predictores: ['frecuencia'],
    confianza: 0.8,
  },
);

export const ENEMIGO_4 = crearBot(
  {
    id: 'enemigo-4',
    nombre: 'Enemigo 4',
    apodo: 'El Oportunista',
    dificultad: 'media',
    afinidad: 'lagarto',
    aveCaracteristica: 'tiuque',
    descripcion:
      'Carroñero: espera tu error y remata cuando tu ave está débil. Lee tus reacciones y tus costumbres.',
  },
  {
    pesoAfinidad: 0.25,
    agresividad: 1,
    aversionRiesgo: 0.8,
    rematador: 1.2,
    temperatura: 0.26,
    exploracion: 0.12,
    predictores: ['reaccion', 'frecuencia'],
    confianza: 0.35,
  },
);

export const ENEMIGO_5 = crearBot(
  {
    id: 'enemigo-5',
    nombre: 'Enemigo 5',
    apodo: 'El Escurridizo',
    dificultad: 'media',
    afinidad: 'spock',
    aveCaracteristica: 'chercan',
    descripcion:
      'Detecta secuencias en tus jugadas y casi nunca repite la suya, así que cuesta leerlo.',
  },
  {
    pesoAfinidad: 0.25,
    evitaRepetir: 0.25,
    temperatura: 0.22,
    exploracion: 0.12,
    predictores: ['frecuencia', 'transicion'],
    confianza: 0.65,
  },
);

export const ENEMIGO_6 = crearBot(
  {
    id: 'enemigo-6',
    nombre: 'Enemigo 6',
    apodo: 'La Estratega',
    dificultad: 'media-alta',
    afinidad: null,
    aveCaracteristica: 'pinguino',
    descripcion:
      'Sin tipo favorito. Combina tus costumbres, tus reacciones y tus secuencias, y administra bien su MP.',
  },
  {
    temperatura: 0.18,
    exploracion: 0.1,
    evitaRepetir: 0.05,
    predictores: ['frecuencia', 'reaccion', 'transicion'],
    confianza: 0.6,
  },
);

export const ENEMIGO_7 = crearBot(
  {
    id: 'enemigo-7',
    nombre: 'Enemigo 7',
    apodo: 'El Jefe',
    dificultad: 'alta',
    afinidad: null,
    aveCaracteristica: 'tucuquere',
    descripcion:
      'Jefe final. Aprende de tu historial con varios métodos y confía en el que más acierta. Juega limpio.',
  },
  {
    agresividad: 1.1,
    aversionRiesgo: 1,
    rematador: 1,
    ahorroMp: 0.1,
    evitaRepetir: 0.05,
    temperatura: 0.12,
    exploracion: 0.06,
    predictores: ['frecuencia', 'reaccion', 'transicion', 'anti-cpu'],
    confianza: 0.85,
  },
);

export const ENEMIGO_8 = crearBot(
  {
    id: 'enemigo-8',
    nombre: 'Enemigo 8',
    apodo: 'La Sombra',
    dificultad: 'muy-alta',
    afinidad: null,
    aveCaracteristica: null,
    contraEquipo: true,
    descripcion:
      'Jefe secreto. Piensa como el Jefe, pero sabe qué movimientos te quedan y arma su equipo contra el tuyo.',
  },
  {
    agresividad: 1.1,
    aversionRiesgo: 1,
    rematador: 1.1,
    ahorroMp: 0.1,
    evitaRepetir: 0.05,
    temperatura: 0.13,
    exploracion: 0.07,
    predictores: ['frecuencia', 'reaccion', 'transicion', 'anti-cpu'],
    confianza: 0.9,
    informacionCompleta: true,
  },
);

/** Los 8 bots en el orden de la torre. */
export const BOTS: readonly BotCpu[] = [
  ENEMIGO_1,
  ENEMIGO_2,
  ENEMIGO_3,
  ENEMIGO_4,
  ENEMIGO_5,
  ENEMIGO_6,
  ENEMIGO_7,
  ENEMIGO_8,
];

/** Busca un bot por id. Lanza un error si no existe. */
export function botPorId(id: string): BotCpu {
  const bot = BOTS.find((b) => b.id === id);
  if (!bot) throw new Error(`Bot no encontrado: ${id}`);
  return bot;
}

/** Bot de los Enemigos 1 a 5 cuyo tipo favorito es `tipo`. */
export function botPorTipo(tipo: TipoPPTLS): BotCpu {
  return BOTS.find((b) => b.afinidad === tipo) as BotCpu;
}

/**
 * Equipo del bot con `cantidad` aves tomadas de `fichas` (las aves que existan
 * en el juego). El orden es el de salida al combate.
 */
export function equipoDeBot(
  bot: BotCpu,
  fichas: readonly AveFicha[],
  cantidad: number,
  rng: Rng,
  equipoJugador: readonly AveFicha[] = [],
): AveFicha[] {
  return armarEquipoCpu(
    fichas,
    cantidad,
    rng,
    {
      afinidad: bot.afinidad,
      aveCaracteristica: bot.aveCaracteristica,
      contraEquipo: bot.contraEquipo,
    },
    equipoJugador,
  );
}

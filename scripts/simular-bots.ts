/**
 * Simulación de los bots contra jugadores de distintos estilos.
 *
 * Uso: `npm run bots:sim` (opcional: `-- 400` para cambiar las batallas por celda).
 *
 * Mide, para cada bot, el porcentaje de victorias del CPU en batallas 3v3 con
 * `CONFIG_BASE` contra 7 estilos de jugador. Las aves son 10 fichas de prueba
 * (2 por tipo) porque el juego aún tiene solo 3 fichas reales; el equipo del
 * jugador se sortea y el del bot se arma con `equipoDeBot`.
 *
 * Lectura rápida:
 * - Contra «azar» ningún bot debería pasar mucho del 50 %: un jugador al azar no
 *   se puede leer en PPTLS. La ventaja que quede viene de usar mejor el daño y el MP.
 * - Contra estilos con patrón, los bots deben ganar más a medida que sube la
 *   dificultad. El «lector» intenta explotar el tipo favorito del bot.
 * - «afinidad»: porcentaje de jugadas del tipo favorito (Enemigos 1 a 5).
 * - «p.máx»: probabilidad media de la jugada favorita del bot en cada turno.
 *   Mide el azar: 100 % sería un bot totalmente predecible.
 */

import { CONFIG_BASE, type AveFicha, type EstadoBatalla, type MovimientoActivo, type Rng, type TipoPPTLS } from '../game/src/battle/types';
import { inicializarBatalla, aveActiva, movimientosUsables } from '../game/src/battle/state';
import { resolverTurno } from '../game/src/battle/turn';
import { decisionCpu, elegirMovimientoCpu, PERFIL_BASE, armarEquipoCpu, type PerfilCpu } from '../game/src/battle/cpu';
import { crearRng } from '../game/src/battle/rng';
import { ganaPPTLS, PPTLS_TIPOS } from '../game/src/battle/pptls';
import { BOTS, equipoDeBot, type BotCpu } from '../game/src/data/bots';

const TIPOS = PPTLS_TIPOS as TipoPPTLS[];

/** 10 fichas de prueba: 2 por tipo, cada una sin un tipo distinto. */
function fichasDePrueba(): AveFicha[] {
  const fichas: AveFicha[] = [];
  TIPOS.forEach((tipo, i) => {
    for (let variante = 0; variante < 2; variante++) {
      const otros = TIPOS.filter((t) => t !== tipo);
      const falta = otros[(i + variante * 2) % otros.length];
      const usados = otros.filter((t) => t !== falta);
      const id = `${tipo}-${variante}`;
      fichas.push({
        id,
        nombre: id,
        tipo,
        movimientos: [
          { id: `${id}-car`, nombre: `car ${tipo}`, tipo, caracteristico: true },
          ...usados.map((t) => ({ id: `pool-${t}`, nombre: `pool ${t}`, tipo: t })),
        ],
      });
    }
  });
  return fichas;
}

/** Estilo de jugador: elige un movimiento usable del ave activa del jugador. */
type Jugador = (estado: EstadoBatalla, rng: Rng) => MovimientoActivo;

function usables(estado: EstadoBatalla): MovimientoActivo[] {
  return movimientosUsables(aveActiva(estado.jugador));
}

function alAzar(lista: MovimientoActivo[], rng: Rng): MovimientoActivo {
  return lista[Math.floor(rng() * lista.length)];
}

function delTipo(lista: MovimientoActivo[], tipos: TipoPPTLS[], rng: Rng): MovimientoActivo {
  const opciones = lista.filter((m) => tipos.includes(m.tipo));
  return alAzar(opciones.length > 0 ? opciones : lista, rng);
}

const JUGADORES: Record<string, Jugador> = {
  azar: (e, rng) => alAzar(usables(e), rng),

  // Siempre su movimiento más fuerte (STAB y coste alto), como quien aprieta el «mejor botón».
  repetitivo: (e) => {
    const ave = aveActiva(e.jugador);
    return [...usables(e)].sort(
      (a, b) =>
        (b.tipo === ave.tipo ? 10 : 0) + b.costeMp - ((a.tipo === ave.tipo ? 10 : 0) + a.costeMp),
    )[0];
  },

  // Recorre sus movimientos en orden, saltando los bloqueados.
  rotativo: (e) => {
    const ave = aveActiva(e.jugador);
    for (let k = 0; k < ave.movimientos.length; k++) {
      const mov = ave.movimientos[(e.turno + k) % ave.movimientos.length];
      if (mov.costeMp <= ave.mpActual) return mov;
    }
    return usables(e)[0];
  },

  // Gana y se queda; pierde y cambia a lo que vence al último del CPU.
  'ganar-quedarse': (e, rng) => {
    const ultima = e.historial[e.historial.length - 1];
    if (!ultima) return alAzar(usables(e), rng);
    if (ultima.resultado === 'jugador') return delTipo(usables(e), [ultima.movJugador.tipo], rng);
    return delTipo(usables(e), TIPOS.filter((t) => ganaPPTLS(t, ultima.movCpu.tipo)), rng);
  },

  // Siempre contra el último movimiento del CPU.
  'contra-ultimo': (e, rng) => {
    const ultima = e.historial[e.historial.length - 1];
    if (!ultima) return alAzar(usables(e), rng);
    return delTipo(usables(e), TIPOS.filter((t) => ganaPPTLS(t, ultima.movCpu.tipo)), rng);
  },

  // Cuenta los tipos del CPU y juega contra su favorito (explota la afinidad).
  lector: (e, rng) => {
    if (e.historial.length === 0) return alAzar(usables(e), rng);
    const cuenta: Record<string, number> = {};
    for (const h of e.historial) cuenta[h.movCpu.tipo] = (cuenta[h.movCpu.tipo] ?? 0) + 1;
    const favorito = TIPOS.reduce((a, b) => ((cuenta[b] ?? 0) > (cuenta[a] ?? 0) ? b : a));
    return delTipo(usables(e), TIPOS.filter((t) => ganaPPTLS(t, favorito)), rng);
  },

  // Mezcla de los anteriores: cambia de estilo cada pocos turnos, como una persona.
  humano: (e, rng) => {
    const estilos = ['azar', 'ganar-quedarse', 'repetitivo', 'contra-ultimo'];
    const estilo = estilos[Math.floor(e.turno / 4 + e.cpu.indiceActiva) % estilos.length];
    return JUGADORES[estilo](e, rng);
  },
};

interface ResultadoCelda {
  victoriasCpu: number;
  turnos: number;
  jugadasAfinidad: number;
  jugadasCpu: number;
  /** Suma de la probabilidad de la jugada favorita del bot en cada decisión. */
  sumaProbMax: number;
}

function simular(
  bot: BotCpu | null,
  jugador: Jugador,
  batallas: number,
  semilla: number,
  fichas: AveFicha[],
): ResultadoCelda {
  const rng = crearRng(semilla);
  const perfil: PerfilCpu = bot ? bot.perfil : PERFIL_BASE;
  const r: ResultadoCelda = { victoriasCpu: 0, turnos: 0, jugadasAfinidad: 0, jugadasCpu: 0, sumaProbMax: 0 };

  for (let b = 0; b < batallas; b++) {
    const equipoJugador = armarEquipoCpu(fichas, 3, rng, {
      afinidad: null,
      aveCaracteristica: null,
      contraEquipo: false,
    });
    const equipoCpu = bot
      ? equipoDeBot(bot, fichas, 3, rng, equipoJugador)
      : armarEquipoCpu(fichas, 3, rng, { afinidad: null, aveCaracteristica: null, contraEquipo: false });

    let estado = inicializarBatalla(equipoJugador, equipoCpu, rng, CONFIG_BASE);
    let guardia = 0;
    while (!estado.terminada && guardia++ < 500) {
      r.sumaProbMax += Math.max(...decisionCpu(estado, perfil).probabilidades);
      const movCpu = elegirMovimientoCpu(estado, rng, perfil);
      if (!movCpu) throw new Error('CPU sin movimientos en batalla en curso');
      const movJugador = jugador(estado, rng);
      r.jugadasCpu++;
      if (bot?.afinidad && movCpu.tipo === bot.afinidad) r.jugadasAfinidad++;
      estado = resolverTurno(estado, movJugador, movCpu, rng).estado;
    }
    if (estado.ganador === 'cpu') r.victoriasCpu += 1;
    else if (estado.ganador === 'empate') r.victoriasCpu += 0.5;
    r.turnos += estado.turno;
  }
  return r;
}

function main(): void {
  const batallas = Number(process.argv[2] ?? 300);
  const fichas = fichasDePrueba();
  const nombresJugadores = Object.keys(JUGADORES);
  const filas: (BotCpu | null)[] = [null, ...BOTS];

  const pct = (x: number) => `${(100 * x).toFixed(0).padStart(3)} %`;
  console.log(`Victorias del CPU (%), ${batallas} batallas 3v3 por celda\n`);
  console.log(
    'Bot'.padEnd(26) +
      nombresJugadores.map((n) => n.padStart(15)).join('') +
      '   media   turnos  afinidad  p.máx',
  );

  for (const bot of filas) {
    const etiqueta = bot ? `${bot.nombre} (${bot.apodo})` : 'Base (aleatorio)';
    let total = 0;
    let turnos = 0;
    let afinidad = 0;
    let jugadas = 0;
    let probMax = 0;
    const celdas = nombresJugadores.map((nombre, j) => {
      const r = simular(bot, JUGADORES[nombre], batallas, 1000 + 97 * j, fichas);
      total += r.victoriasCpu / batallas;
      turnos += r.turnos / batallas;
      afinidad += r.jugadasAfinidad;
      jugadas += r.jugadasCpu;
      probMax += r.sumaProbMax;
      return pct(r.victoriasCpu / batallas).padStart(15);
    });
    const n = nombresJugadores.length;
    console.log(
      etiqueta.padEnd(26) +
        celdas.join('') +
        pct(total / n).padStart(8) +
        (turnos / n).toFixed(1).padStart(9) +
        (bot?.afinidad ? pct(afinidad / jugadas) : '     -').padStart(10) +
        pct(probMax / jugadas).padStart(7),
    );
  }
}

main();

# Motor de batalla — índice de la API (Parte A)

Documentación para los equipos **B (interfaces)** y **C (CPU/torre)**: qué expone el motor, cómo usarlo y qué reglas respeta.

> Fuentes: `plan_motor_c.md` y `plan_desarrollo.md` (decisiones vigentes), `docs/modules/prd/pages/reglas-batalla.adoc`.
> Las desviaciones respecto al PRD están numeradas (D-01…D-12) en `changes.md` (raíz del repo).

---

## Reglas del contrato

1. **Ningún módulo toca TIC-80** (no hay `cls`, `spr`, `btn`, …). Todo es JavaScript/TypeScript puro.
2. **`rng` inyectable** en todas las funciones de azar (ADR-04): en producción `Math.random`; en pruebas `crearRng(seed)`.
3. **Inmutabilidad:** `resolverTurno` no muta el estado que recibe; devuelve una copia profunda nueva.
4. **El motor no elige por el jugador:** B pasa el movimiento del jugador; C provee la elección del CPU.
5. El estado de batalla lleva su propia `config` con los valores de reglas.

## Estructura

```
game/src/battle/
├── types.ts   Contrato: tipos, fichas, estado, config, historial
├── rng.ts     RNG determinista LCG
├── pptls.ts   Matriz Piedra–Papel–Tijera–Lagarto–Spock
├── damage.ts  Cálculo de daño (base, esfuerzo, STAB, pasivas)
├── state.ts   Fichas, inicialización, bloqueo, relevo, fin
├── turn.ts    Resolución del turno
├── rendicion.ts  Rendición manual del ave activa
├── cpu.ts     Elección del CPU: perfil base (aleatorio) y perfil estratégico (bots)
└── ia/
    ├── prediccion.ts  Predicción del próximo tipo del jugador (solo historial público)
    └── evaluacion.ts  Valor esperado de cada movimiento del CPU y probabilidades
```

Los 8 bots de la torre (sus parámetros) viven en `game/src/data/bots.ts`.

---

## `types.ts` — contrato

| Export | Uso |
|---|---|
| `TipoPPTLS` | `'piedra' \| 'papel' \| 'tijera' \| 'lagarto' \| 'spock'` |
| `Rng` | `() => number`, número en `[0, 1)` |
| `ResultadoPPTLS` | `'jugador' \| 'cpu' \| 'empate'` (quién gana el intercambio) |
| `MovimientoFicha` / `AveFicha` | Datos estáticos: 4 movimientos fijos por ave (1 característico + 3 predeterminados de la pool) |
| `MovimientoActivo` | Movimiento en combate: `id`, `nombre`, `tipo`, `costeMp` |
| `AveCombate` | Ave en combate: `hpMax`, `hpActual`, `mpMax`, `mpActual`, 4 `movimientos`, `estado` (`'activa' \| 'debilitada' \| 'rendida'`) |
| `Equipo` | `aves[]` + `indiceActiva` |
| `EstadoBatalla` | `jugador`, `cpu`, `config`, `turno` (base 1; 0 antes del primer turno), `historial[]`, `terminada`, `ganador` |
| `EntradaHistorial` | Registro de un turno para la UI: movimientos, daños, MP gastado, `mensaje`, `eventos[]` |
| `ResultadoTurno` | Lo que devuelve `resolverTurno`: `{ estado, entrada }` |
| `ConfigBatalla` / `CONFIG_BASE` | Parámetros de reglas (ver tabla abajo) |
| `NOMBRE_PASIVA` | Texto de cada pasiva por tipo, para HUD/fichas |

### Valores de `CONFIG_BASE`

| Parámetro | Valor | Regla |
|---|---|---|
| `modo` | `'3v3'` (regla final). El ejecutable mínimo pasa `'1v1'` al crear la batalla (D1) | Aves por equipo |
| `mpInicial` | 20 | MP compartido por ave (D-01, plan_motor_c.md C6) |
| `hpMaxRango` | `[30, 50]` | HP máx aleatorio al entrar (C9) |
| `hpMaxRangoPiedra` | `[40, 50]` | Pasiva Piedra |
| `vidaPorNivel` | `10` | HP máx = rango + 10 × nivel del combate (C9) |
| `nivelJugador` / `nivelCpu` | `0` / `0` | Nivel del combate de cada bando |
| `costeMpRango` | `[1, 3]` | Coste aleatorio de cada movimiento (C6) |
| `probCosteCeroPapel` | `0.25` | Pasiva Papel |
| `regeneracionLagarto` | `3` | Pasiva Lagarto |
| `factorEsfuerzo` | `0.1` | Daño ×(1 + coste×0.1) (C3) |
| `probFallo` | `0.1` | Probabilidad de que un movimiento que ataca falle: gasta MP y turno, no hace daño (C5) |
| `factorStab` | `1.5` | STAB |
| `bonusTijera` | `5` | Pasiva Tijera al ganar |
| `danoBaseMinFrac` | `0.1` | Daño base mínimo: 10 % del HP máx del rival (D-15) |
| `danoBaseMaxFrac` | `0.5` | Daño base máximo: 50 % del HP máx del rival (D-15) |

---

## `rng.ts` — aleatoriedad

```ts
crearRng(seed: number): Rng          // LCG determinista (tests, debug)
enteroAleatorio(rng, min, max): number // entero en [min, max] inclusive
```

## `pptls.ts` — matriz de tipos

```ts
compararPPTLS(tipoJugador, tipoCpu): ResultadoPPTLS  // 'jugador' | 'cpu' | 'empate'
mensajePPTLS(tipoJugador, tipoCpu): string           // «Piedra aplasta Tijera», «Choque de piedras»…
ganaPPTLS(tipoA, tipoB): boolean                     // sin considerar empates
PPTLS_TIPOS: readonly TipoPPTLS[]
```

## `damage.ts` — daño

```ts
calcularDanoBase(hpMaxRival, rng, config?): number  // entero en [10 %, 50 %] del HP máx del rival (D-15)
calcularDano(hpMaxRival, movAtacante, tipoAveAtacante, ganaIntercambio, rng, config?): DetalleDano
clasificarEfectividad(dano, hpMaxRival): ClasificacionEfectividad  // 'sin-efecto' | 'efectivo' | 'muy-efectivo'
MENSAJE_EFECTIVIDAD  // «El ataque no tuvo efecto», «El ataque fue efectivo», «¡Es muy efectivo!»
```

Orden de aplicación: base (10–50 % del HP máx del rival) → esfuerzo `×(1 + coste×0.1)` → STAB ×1.5 → Tijera +5 al ganar → `floor` ≥ 0. No hay techo por golpe (C2).
El STAB depende solo de los tipos (aplica también en empate); la pasiva de Tijera exige ganar el intercambio.
Spock no tiene mínimo de daño (D-16). Si gana, su movimiento no puede fallar (C7).

## `state.ts` — estado y equipos

```ts
validarFicha(ficha): string[]                        // [] = válida (4 movimientos, 1 característico del tipo propio, ids únicos)
seleccionarMovimientos(ficha, rng, config?): MovimientoActivo[]  // los 4 movimientos fijos de la ficha, con coste aleatorio (1–3); lanza si la ficha es inválida
inicializarAve(ficha, rng, config?, nivel?): AveCombate  // HP (rango + vidaPorNivel × nivel) y MP al entrar en combate
inicializarEquipo(fichas, rng, config?, nivel?): Equipo  // valida cantidad según modo
inicializarBatalla(fichasJugador, fichasCpu, rng, config?): EstadoBatalla  // usa nivelJugador y nivelCpu
aveActiva(equipo): AveCombate
estaBloqueado(mov, ave): boolean                     // coste > MP restante
movimientosUsables(ave): MovimientoActivo[]
tieneMovimientoUsable(ave): boolean
siguienteAve(equipo): number                         // índice de la 1.ª ave 'activa' (relevo en orden); -1 si no hay
avesDisponibles(equipo): number
evaluarFin(estado): 'jugador' | 'cpu' | 'empate' | null
avesPorModo(modo): number                            // 1v1 → 1; 3v3 → 3
```

## `turn.ts` — resolución del turno

```ts
resolverTurno(estado, movJugador, movCpu, rng): ResultadoTurno
clonarEstado(estado): EstadoBatalla  // copia profunda
```

**Lanza un error** si la batalla terminó, el movimiento no pertenece al ave activa o está bloqueado por MP — la UI debe prevenir esas selecciones (CB-01, CB-09).

Flujo interno: pago de MP (pasiva Papel) → PPTLS → fallo (movimiento que ataca; Spock que gana no falla) → daño (empate = ambos se dañan, D-02; un movimiento que falla no hace daño) → salidas (HP 0 → debilitada; sin MP usable → rendida) y relevo → regeneración Lagarto → fin → historial.

Orden de consumo del `rng`: papel jugador → papel CPU → fallo jugador → fallo CPU → daño jugador → daño CPU. Sin fallo (`probFallo` 0) no se consume aleatoriedad para el fallo.

## `rendicion.ts` — rendición manual (RF-015, BR-012)

```ts
rendirAveActiva(estado, lado: 'jugador' | 'cpu'): { estado, evento }
```

El ave activa del `lado` pasa a `'rendida'`, entra la siguiente ave (si hay) y se evalúa el fin de la batalla. No consume turno, MP ni historial. No muta el estado recibido. Lanza un error si la batalla ya terminó. En 1v1 la batalla termina; en 3v3 entra la siguiente ave o la batalla termina cuando no quedan aves.

## `cpu.ts` — elección del CPU (Parte C)

```ts
elegirMovimientoCpu(estado, rng, perfil?): MovimientoActivo | null   // firma sin cambios
decisionCpu(estado, perfil?): DecisionCpu      // probabilidades de cada movimiento, sin tirar el rng
armarEquipoCpu(fichas, cantidad, rng, opciones, equipoJugador?): AveFicha[]
PerfilCpu = { tipo: 'aleatorio' } | { tipo: 'estrategico', ia: ParametrosIA }
PERFIL_BASE                                    // { tipo: 'aleatorio' }
```

- **Perfil `aleatorio`** (nivel base del PRD): uniforme entre los movimientos usables. Es el valor por defecto y no cambió.
- **Perfil `estrategico`** (bots): en cada turno
  1. predice el próximo tipo del jugador con el historial (`ia/prediccion.ts`);
  2. calcula el valor esperado de cada movimiento usable con las reglas del motor (`ia/evaluacion.ts`): daño esperado que hace o recibe según gane, pierda o empate, probabilidad de debilitar, fallo, Spock que no falla, coste de MP y rendición por quedarse sin MP;
  3. suma su personalidad (tipo favorito, terquedad, evitar repetirse, ahorro de MP);
  4. elige con una **softmax** (`temperatura`) más un **piso de exploración** que deja a todos los movimientos con probabilidad mayor que 0.
- Consume **una** tirada de `rng` por decisión (ninguna si hay 0 o 1 movimientos usables).
- **Juego limpio:** ningún perfil ve la elección actual del jugador (D-J). Los Enemigos 1 a 7 usan solo el historial y el tipo del ave del jugador (visible en pantalla). Solo el Enemigo 8 conoce además los movimientos usables del jugador y sus costes («algo injusto»).
- El CPU no se rinde manualmente (reglas-batalla.adoc).

`null` solo ocurre si el ave activa del CPU no tiene ningún movimiento usable. En una batalla en curso no debería pasar: tras cada turno, `resolverTurno` marca como `rendida` al ave sin movimientos usables y hace el relevo, así que el ave activa siempre tiene al menos un movimiento. `resolverTurno` **no acepta `null`**: si la UI o el perfil de la CPU lo reciben, deben tratarlo como error de estado, no como una rendición.

### Parámetros de un bot (`ParametrosIA`)

| Parámetro | Qué hace |
|---|---|
| `afinidad`, `pesoAfinidad` | Tipo favorito y cuánto lo prefiere (Enemigos 1 a 5). |
| `predictores`, `confianza`, `memoria` | Qué predictores usa (`frecuencia`, `reaccion`, `transicion`, `anti-cpu`), cuánto confía en ellos frente a la uniforme y cuán rápido olvida. Con varios, pesan según cuánto acertaron en esta batalla. |
| `agresividad`, `aversionRiesgo`, `rematador` | Peso del daño que hace, del daño que recibe y de la probabilidad de debilitar al rival. |
| `ahorroMp` | Penaliza gastar MP (menos cuando le queda poca vida). |
| `terco`, `evitaRepetir` | Repetir el tipo con el que ganó / evitar repetir su último tipo. |
| `temperatura`, `exploracion` | Cuánto azar tiene: softmax y piso de probabilidad. |
| `informacionCompleta` | Solo Enemigo 8: conoce los movimientos usables del jugador. |

### Los 8 bots (`game/src/data/bots.ts`)

| Bot | Apodo | Dificultad | Tipo | Ave característica | Cómo piensa |
|---|---|---|---|---|---|
| Enemigo 1 | El Porfiado | Media | Piedra | Picaflor | No predice. Repite el tipo con el que ganó. |
| Enemigo 2 | La Filosa | Media | Tijera | Diucón | Agresiva, gasta MP en golpes caros. Lee tu reacción tras ganar o perder. |
| Enemigo 3 | El Centinela | Media | Papel | Queltehue | Defensivo, cuida su MP. Recuerda qué tipos usas más. |
| Enemigo 4 | El Oportunista | Media | Lagarto | Tiuque | Remata a aves débiles. Combina reacción y frecuencia. |
| Enemigo 5 | El Escurridizo | Media | Spock | Chercán | Detecta secuencias y evita repetirse. |
| Enemigo 6 | La Estratega | Media/alta | — | Pingüino de Humboldt | Tres predictores, equilibrado. |
| Enemigo 7 | El Jefe | Alta | — | Tucúquere | Cuatro predictores con pesos por acierto. Solo historial. |
| Enemigo 8 | La Sombra | Muy alta | — | — | Como el Jefe, más información de tus movimientos usables y equipo armado contra el tuyo. |

`equipoDeBot(bot, fichas, cantidad, rng, equipoJugador?)` arma el equipo del bot con las fichas que existan: el ave característica entra última, hay al menos un ave del tipo favorito y se prefieren tipos distintos. Solo el Enemigo 8 mira el equipo del jugador.

### Medir el balance

```bash
npm run bots:sim          # 300 batallas 3v3 por celda (opcional: npm run bots:sim -- 600)
```

`scripts/simular-bots.ts` enfrenta a cada bot contra 7 estilos de jugador (azar, repetitivo, rotativo, ganar-quedarse, contra-último, lector y humano) y muestra el porcentaje de victorias del CPU, los turnos, el uso del tipo favorito y la probabilidad media de su jugada favorita (cuánto azar le queda). Resultados vigentes en `changes.md` (paso 13).

---

## Flujo típico para la Parte B

```ts
import { inicializarBatalla, aveActiva, movimientosUsables } from './battle/state';
import { resolverTurno } from './battle/turn';
import { elegirMovimientoCpu } from './battle/cpu';
import { crearRng } from './battle/rng';

// 1. Crear la batalla (las fichas vienen de game/src/data/birds.ts)
const rng = Math.random;                       // producción
let estado = inicializarBatalla(fichasJugador, fichasCpu, rng);

// 2. Pantalla de selección: movimientos del ave activa del jugador
const activa = aveActiva(estado.jugador);
const bloqueados = activa.movimientos.filter((m) => m.costeMp > activa.mpActual);

// 3. Cada turno (con el perfil del bot del combate, p. ej. ENEMIGO_3 de data/bots.ts):
const movCpu = elegirMovimientoCpu(estado, rng, bot.perfil); // MovimientoActivo | null
if (movCpu === null) {
  throw new Error('El CPU no tiene movimientos usables: estado inconsistente');
}
const movJugador = /* elegido por el jugador en la UI */;
const { estado: nuevo, entrada } = resolverTurno(estado, movJugador, movCpu, rng);
//  → renderizar `entrada.mensaje`, `entrada.eventos`, HP/MP actualizados
//  → `nuevo.terminada` es true cuando hay ganador; `nuevo.ganador` vale 'jugador', 'cpu' o 'empate' (WIN / LOSE / empate técnico)

estado = nuevo; // el estado original no se muta: reemplazar la referencia
```

## Cómo extender la Parte C

```ts
// Un bot nuevo es un perfil 'estrategico' con otros parámetros (data/bots.ts):
const MI_BOT = { tipo: 'estrategico', ia: { ...ENEMIGO_6.perfil.ia, temperatura: 0.3 } };
elegirMovimientoCpu(estado, rng, MI_BOT);

// Un predictor nuevo se agrega en ia/prediccion.ts (NombrePredictor + predecirCon)
// y queda disponible para el conjunto sin tocar damage/state/turn.
```

## Movimientos y pool (D-17)

Cada ave tiene **4 movimientos fijos**: 1 **característico** (`caracteristico: true`, único del ave y del tipo propio) y 3 **predeterminados** tomados de la pool compartida.

- `game/src/data/movimientos.ts`: pool de 15 movimientos, 3 por tipo PPTLS. `desdePool(...ids)` devuelve copias de los movimientos de la pool.
- `game/src/data/birds.ts`: fichas de Cóndor, Loica y Chincol. Cada una combina su característico con 3 predeterminados de la pool. Los predeterminados pueden repetirse entre aves; el característico no.
- Los nombres de la pool son propuesta, tomada del PRD.

## Vida por nivel (D-18)

HP máx = rango base (30–50, o 40–50 para Piedra) + `vidaPorNivel` × nivel del combate. `nivelJugador` y `nivelCpu` fijan el nivel de cada bando; ambos son 0 por defecto. La torre definirá los niveles.

## Datos pendientes

- Fichas de `game/src/data/birds.ts`: solo Cóndor, Loica y Chincol (`FICHAS_MVP`). Faltan las otras 7 aves del PRD, con su característico y sus predeterminados (el motor es TypeScript, D-08).
- El tipo propio de cada ave es el de su movimiento característico (supuesto S-01, D-14 en `changes.md`). Pendiente de confirmar con el Product Owner (T8).
- Los tests usan fichas de prueba generadas (`fichaPrueba`); ver `game/tests/README.md`.

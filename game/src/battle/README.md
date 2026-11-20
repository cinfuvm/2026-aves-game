# Motor de batalla — índice de la API (Parte A)

Documentación para los equipos **B (interfaces)** y **C (CPU/torre)**: qué expone el motor, cómo usarlo y qué reglas respeta.

> Fuentes: `plan_logica.md` (reglas de `pelea.md`), `docs/modules/prd/pages/reglas-batalla.adoc`.
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
└── cpu.ts     Elección del CPU (nivel base)
```

---

## `types.ts` — contrato

| Export | Uso |
|---|---|
| `TipoPPTLS` | `'piedra' \| 'papel' \| 'tijera' \| 'lagarto' \| 'spock'` |
| `Rng` | `() => number`, número en `[0, 1)` |
| `ResultadoPPTLS` | `'jugador' \| 'cpu' \| 'empate'` (quién gana el intercambio) |
| `MovimientoFicha` / `AveFicha` | Datos estáticos (5 movimientos por ave) |
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
| `modo` | `'3v3'` (o `'1v1'` para la entrega parcial) | Avances por equipo |
| `mpInicial` | 15 | MP compartido por ave (D-01) |
| `hpMaxRango` | `[20, 50]` | HP máx aleatorio al entrar |
| `hpMaxRangoPiedra` | `[40, 50]` | Pasiva Piedra |
| `costeMpRango` | `[1, 5]` | Coste aleatorio de cada movimiento |
| `probCosteCeroPapel` | `0.25` | Pasiva Papel |
| `regeneracionLagarto` | `3` | Pasiva Lagarto |
| `factorEsfuerzo` | `0.15` | Daño ×(1 + coste×0.15) |
| `factorStab` | `1.5` | STAB |
| `bonusTijera` | `5` | Pasiva Tijera al ganar |
| `minimoSpock` | `0.3` | Pasiva Spock al ganar |
| `pasivaSpockActiva` | `true` | D-09: desactivable hasta decisión del PO |

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
calcularDanoBase(hpMaxRival, rng): number  // entero en [0, HP máx del rival]
calcularDano(hpMaxRival, movAtacante, tipoAveAtacante, ganaIntercambio, rng, config?): DetalleDano
clasificarEfectividad(dano, hpMaxRival): ClasificacionEfectividad  // 'sin-efecto' | 'efectivo' | 'muy-efectivo'
MENSAJE_EFECTIVIDAD  // «El ataque no tuvo efecto», «El ataque fue efectivo», «¡Es muy efectivo!»
```

Orden de aplicación: base → esfuerzo `×(1 + coste×0.15)` → STAB ×1.5 → Tijera +5 al ganar → Spock mín. 30 % al ganar → `floor` ≥ 0.
El STAB depende solo de los tipos (aplica también en empate); las pasivas de Tijera/Spock exigen ganar el intercambio.

## `state.ts` — estado y equipos

```ts
validarFicha(ficha): string[]                        // [] = válida (5 movimientos, 1 del tipo propio)
seleccionarMovimientos(ficha, rng, config?): MovimientoActivo[]  // 4 activos: 1 propio + 3 al azar; lanza si la ficha es inválida
inicializarAve(ficha, rng, config?): AveCombate      // HP y MP aleatorios al entrar en combate
inicializarEquipo(fichas, rng, config?): Equipo      // valida cantidad según modo
inicializarBatalla(fichasJugador, fichasCpu, rng, config?): EstadoBatalla
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

Flujo interno: pago de MP (pasiva Papel) → PPTLS → daño (empate = ambos se dañan, D-02) → salidas (HP 0 → debilitada; sin MP usable → rendida) y relevo → regeneración Lagarto → fin → historial.

## `cpu.ts` — elección del CPU (Parte C)

```ts
elegirMovimientoCpu(estado, rng, perfil?): MovimientoActivo | null
PerfilCpu { tipo: 'aleatorio', datos?: Record<string, unknown> }
PERFIL_BASE
```

Nivel base: aleatorio uniforme entre los movimientos usables del ave activa del CPU. `null` = no puede jugar (el motor procesa la rendición). La Parte C añade perfiles **sin cambiar la firma**.

---

## Flujo típico para la Parte B

```ts
import { inicializarBatalla, aveActiva, movimientosUsables } from './battle/state';
import { resolverTurno } from './battle/turn';
import { elegirMovimientoCpu } from './battle/cpu';
import { crearRng } from './battle/rng';

// 1. Crear la batalla (los datos de aves vienen de data/birds)
const rng = Math.random;                       // producción
const estado = inicializarBatalla(fichasJugador, fichasCpu, rng);

// 2. Pantalla de selección: movimientos del ave activa del jugador
const activa = aveActiva(estado.jugador);
const bloqueados = activa.movimientos.filter((m) => m.costeMp > activa.mpActual);

// 3. Cada turno:
const movCpu = elegirMovimientoCpu(estado, rng);          // puede ser null
const movJugador = /* elegido por el jugador en la UI */;
const { estado: nuevo, entrada } = resolverTurno(estado, movJugador, movCpu, rng);
//  → renderizar `entrada.mensaje`, `entrada.eventos`, HP/MP actualizados
//  → `nuevo.terminado`/`nuevo.ganador` deciden la transición a WIN / LOSE / DRAW

estado = nuevo; // el estado original no se muta: reemplazar la referencia
```

## Cómo extender la Parte C

```ts
// cpu.ts es el único punto de entrada: añadir un tipo de perfil y su lógica
// dentro de elegirMovimientoCpu, sin tocar damage/state/turn.
PerfilCpu → { tipo: 'jefe-agresivo', datos: { prioridad: 'tipo-ganador' } }
```

## Datos que faltan (pendientes del equipo de contenido)

- Fichas reales de las 10 aves en `game/src/data/birds.js` con el formato `AveFicha`.
- Los tests usan fichas de prueba generadas (`fichaPrueba`); ver `game/tests/README.md`.

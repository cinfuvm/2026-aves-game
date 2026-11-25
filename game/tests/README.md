# Tests del motor de batalla (Parte A)

Cómo ejecutar la suite y en qué consiste cada archivo.

---

## Cómo ejecutar los tests

```bash
npm test                 # ejecuta la suite una vez (vitest run)
npm run test:watch       # modo observación: re-ejecuta al guardar cambios
npx vitest run game/tests/turn.test.ts   # un solo archivo
```

La configuración vive en `vitest.config.mts` (raíz del repo): incluye solo `game/tests/**/*.test.ts`.
Los tests están **excluidos del build del cartucho** (`game/tsconfig.json` excluye `tests/`), así que no inflan el juego de TIC-80.

---

## Qué se prueba (8 archivos, 119 casos)

| Archivo | Módulo probado | Casos | En qué consiste |
|---|---|---|---|
| `pptls.test.ts` | `pptls.ts` | 8 | Las 25 combinaciones de la matriz contra `reglas-batalla.adoc`; cada tipo gana 2 / pierde 2 / empata 1; simetría; mensajes mnemotécnicos y de empate |
| `damage.test.ts` | `damage.ts` | 18 | Daño base entre 10 % y 50 % del HP máx (nunca 0); multiplicador de esfuerzo `×(1+coste×0.1)`; STAB ×1.5; pasiva Tijera (+5 al ganar, con/sin STAB); pasiva Spock sin mínimo de daño (D-16); límites de efectividad; monotonía por coste; cotas superiores |
| `state.test.ts` | `state.ts` | 26 | Validación de fichas (5 movimientos, tipo propio, ids únicos); selección de 4 activos con el garantizado presente (50 semillas); costes de MP en rango; HP 20–50 y Piedra 40–50; MP 15 compartido; determinismo por semilla; tamaños 1v1/3v3; bloqueo por MP; relevo; los 4 resultados de `evaluarFin` |
| `turn.test.ts` | `turn.ts` | 25 | Fallo (paga MP, sin daño, en empate ambos pueden fallar) y Spock que gana no falla (C5, C7); validaciones (batalla terminada, movimiento ajeno, MP insuficiente); números exactos de los 3 resultados PPTLS; pasiva Papel (tirada baja/alta, ave vs movimiento, no-tirada de aves no papel); pasiva Lagarto (tope, espacio, no revive, otros tipos); CB-03 (HP 0), CB-05 (prioridad debilitamiento), CB-08 (empate técnico); rendición por MP con relevo; historial acumulativo; inmutabilidad del estado |
| `cpu.test.ts` | `cpu.ts` | 10 | Nunca elige movimientos bloqueados; cubre todos los usables; respeta el ave activa tras relevo; determinismo por semilla; `null` sin MP; perfil base explícito e implícito |
| `juego.test.ts` | `src/juego/flujo.ts` | 14 | Estados seleccion → batalla → revelación → resultado; cursores con vuelta; batalla 1v1; movimiento bloqueado por MP sin turno; revelación sin gastar MP antes de confirmar; confirmación que resuelve el turno; fin de batalla con el ganador del motor; rendición; reinicio; acciones fuera de pantalla |
| `rendicion.test.ts` | `rendicion.ts` | 7 | Rendir en 1v1 termina con victoria del rival (y viceversa); sin turno, MP ni historial; no muta el estado; en 3v3 entra la siguiente ave; rendir las 3 termina la batalla; error si la batalla ya terminó |
| `birds.test.ts` | `src/data/birds.ts` | 11 | Las 3 fichas del MVP (Cóndor, Loica, Chincol) pasan `validarFicha`; ids de movimiento únicos; tipo propio según S-01; cada selección de 4 movimientos incluye uno de su tipo (50 semillas) |

---

## Técnicas usadas (para escribir tests nuevos)

### 1. RNG determinista

Todo el motor recibe un `rng` inyectable. En tests se usan dos estilos:

```ts
import { crearRng } from '../src/battle/rng';

// a) Semilla fija: misma secuencia siempre (tests de rango, distribución, determinismo)
const rng = crearRng(42);

// b) Secuencia fija: controla exactamente qué sale en cada tirada
function rngSecuencia(valores: number[]): Rng {
  let i = 0;
  return () => valores[Math.min(i++, valores.length - 1)]; // repite el último
}
```

⚠️ **Cuidado con el LCG y semillas consecutivas:** `crearRng(1)`, `crearRng(2)`, … producen primeras salidas casi idénticas (~0.236, ~0.237…). Para probar distribución, usa **un solo rng con muchas iteraciones**, no muchas semillas pequeñas.

### 2. Forzar un daño base exacto

`calcularDanoBase` hace `floor(rng() × (hpMaxRival + 1))`. Para forzar un base `B` sobre `hpMax`:

```ts
const rng = () => (B + 0.5) / (hpMaxRival + 1);
```

El `+0.5` evita errores de coma flotante en el borde del sub-intervalo.

### 3. Fichas y estados de prueba

```ts
// Ficha válida: 1 movimiento del tipo propio + 1 de cada otro tipo (5 en total)
function fichaPrueba(id: string, nombre: string, tipo: TipoPPTLS): AveFicha

// Batalla 1v1 con fichas, movimientos, HP (40) y MP (15) controlados
// → permite verificar números exactos de daño sin interferencias
function armar1v1(fichaJ, fichaC, movsJ, movsC): EstadoBatalla

// Batalla 3v3 con movimientos/MP controlados para el primer ave de cada equipo
// (y HP fijado a 40; acepta fichas personalizadas para controlar pasivas)
function preparar3v3(movsJ, movsC, mpJ?, mpC?, fichasJ?, fichasC?): EstadoBatalla
```

**Truco importante al elegir aves de prueba:** cada tipo trae pasivas que cambian los números —
piedra (HP inicial), papel (tirada de MP, consume la 1.ª tirada del rng), tijera (+5 si gana),
lagarto (+3 HP al final del turno), spock (daño mín. 30 % si gana y hay daño base; con base 0 es «Sin efecto»).
Para un caso de "números limpios" elige tipos **sin la pasiva que interferiría**
(p. ej. para probar daño sin pasivas: atacante lagarto o piedra; el defensor piedra/tijera según quién gane).

### 4. Orden de consumo del rng en `resolverTurno`

Documentado en `turn.ts` (los tests de números exactos dependen de él):

1. Tirada de pasiva Papel del **jugador** (solo si su ave es de tipo papel)
2. Tirada de pasiva Papel del **CPU** (solo si su ave es de tipo papel)
3. Daño jugador → CPU (si gana el jugador o hay empate)
4. Daño CPU → jugador (si gana el CPU o hay empate)

Relevos y regeneraciones no consumen aleatoriedad.

### 5. Convenciones

- Un `describe` por función o tema; el nombre del caso menciona la regla o el caso borde (CB-xx) cuando aplica.
- Los tests no mutan el estado de fábrica: `resolverTurno` ya devuelve copia, pero los helpers que precargan estadísticas mutan **antes** de llamar al motor, y eso está bien porque el motor clona.
- Si un test de "números exactos" falla, revisa primero si una pasiva está interviniendo (STAB, Lagarto) antes de asumir un bug del motor.
- Las pruebas de `turn.test.ts` usan `probFallo: 0` para no depender del fallo. El fallo se prueba aparte en el bloque «fallo (C5) y Spock que gana no falla (C7)».
- `rngBase(base)` (en `turn.test.ts`) devuelve el valor del rng que produce un daño base exacto para HP 40, con los límites de C1.

## Qué queda fuera de la suite

- **Integración con la escena de batalla de TIC-80** (Parte B): se probará con la lógica + pruebas manuales según `arquitectura.adoc`.
- **UAT**: cubierta por el módulo `docs/modules/uat/`, no por estos tests unitarios.

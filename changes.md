# Registro de cambios respecto al PRD

Este archivo documenta, conforme se implementan, **todos los cambios que difieren de lo especificado en el PRD** (`docs/modules/prd/`). Fuente de las decisiones: `plan_logica.md` (basado en `pelea.md`) y acuerdos del equipo.

Cada desviación indica el requisito o regla del PRD afectado para poder actualizar la documentación después.

---

## Desviaciones activas

| ID | Tema | El PRD dice | Se implementa | Referencia PRD |
|----|------|-------------|---------------|----------------|
| D-01 | Recurso de movimientos | PP por movimiento, aleatorio 1–5, se consume 1 por uso (BR-003, BR-010). | **MP compartido por ave** (fondo único), inicial **15** (provisional). Si el MP restante es menor que el coste, el movimiento queda **bloqueado**. | BR-003, BR-010, sección «Puntos de poder (PP)» de `reglas-batalla.adoc` |
| D-02 | Empate PPTLS | El empate no inflige daño, pero consume PP (BR-009). | **Ambas aves calculan y reciben daño** (`pelea.md`). | BR-009 |
| D-03 | Cálculo de daño | Daño base aleatorio 0–HP máx del rival (BR-006). | Daño base + **multiplicador de esfuerzo** `×(1 + coste_MP × 0.15)` + **STAB ×1.5** si el tipo del movimiento coincide con el tipo del ave. | BR-006, sección «Cálculo de daño» |
| D-04 | Pasivas por tipo | No existen. | Piedra: HP inicial 40–50. Tijera: +5 de daño si gana. Papel: 25 % de coste 0. Lagarto: +3 HP al fin del turno (sin pasar el máx). Spock: daño mínimo de 30 % del HP máx rival si gana. | `reglas-batalla.adoc` (capítulo nuevo) |
| D-05 | Movimientos por ave | 4 activos fijos + 1 distintivo no usable. | **5 movimientos posibles**; al entrar en combate se activan **4 al azar**: 1 garantizado del tipo propio del ave + 3 de los 4 restantes. El coste de MP de cada movimiento es aleatorio. | `reglas-batalla.adoc` (estado de un ave), `contenido-aves.adoc` |
| D-06 | Tamaño del equipo | Cada equipo tiene 4 aves (BR-001). | **3 contra 3** en la versión final; `CONFIG_BASE` usa `modo: '3v3'`. El **ejecutable mínimo** (plan_mvp.md, decisión D1) usa `modo: '1v1'`, pasado al crear la batalla. | BR-001 |
| D-07 | Salida de un ave | Rendición automática cuando todos los PP llegan a cero (BR-010). | Un ave sale cuando su HP llega a 0 **o** cuando ningún movimiento es usable por MP insuficiente. | BR-010, BR-011, casos CB-05/CB-06 |
| D-08 | Lenguaje de los módulos de batalla | `game/src/battle/*.js` (JavaScript). | **TypeScript** (`game/src/battle/*.ts`), coherente con el pipeline tsc80/esbuild del repo. | `arquitectura.adoc` (estructura del repositorio) |
| D-09 | Pasiva Spock vs «Sin efecto» | Daño 0 se clasifica «Sin efecto» (BR-007). | **Resuelto (decisión D3 del plan MVP):** la pasiva de Spock solo se aplica si el daño base es mayor que 0. Con daño 0, el resultado es «Sin efecto». Sigue siendo desactivable con `pasivaSpockActiva`. | BR-007 |
| D-13 | Versión de TIC-80 y sprites | Sprites e imagen de cada ave (RF-004, `contenido-aves.adoc`); cartucho exportado a HTML (`arquitectura.adoc`). | **Ejecutable mínimo sin sprites**, con TIC-80 **gratuito** (decisión D4 del plan MVP). Todo se dibuja con formas y texto. El cargador usa `import code` en lugar de `load game.js`, porque la versión gratuita no carga texto con `load`. Los sprites quedan para una versión futura. | RF-004, `arquitectura.adoc` |
| D-14 | Tipo propio del ave | El PRD no define el tipo propio de cada ave; sí indica el tipo de su movimiento distintivo. | **Supuesto S-01:** el tipo propio de cada ave es el tipo de su movimiento distintivo (Cóndor: Spock; Loica: Lagarto; Chincol: Papel). Así el movimiento garantizado (regla del equipo) coincide con el distintivo. Pendiente de confirmar por el Product Owner. | `contenido-aves.adoc` («Fichas de aves», «Cobertura de tipos») |
| D-10 | Rango del coste de MP | PP 1–5 (BR-003). | Coste de MP por movimiento aleatorio en **[1, 5]** (provisional, decisión propia al no fijarlo `pelea.md`). | BR-003 |
| D-11 | Pasiva Tijera «+5» | No aplica. | Interpretación: **+5 de daño fijo adicional** al daño calculado cuando el ave de tipo tijera gana el intercambio. | — |
| D-12 | Redondeo del daño final | No se especifica. | El daño final se **redondea hacia abajo** (`floor`) a un entero ≥ 0, coherente con el estilo del PRD. | BR-006 |

## Pendientes de decisión (bloquean cambios futuros)

1. **D-09 (Spock vs Sin efecto):** resuelto en el código (D3). Falta que el Product Owner lo confirme en `reglas-batalla.adoc`.
2. **D-14 (tipo propio de las aves):** supuesto S-01. Falta que el Product Owner lo confirme; si cambia, solo hay que editar `game/src/data/birds.ts`.
3. **Pokédex** (plan_logica.md §4.1): sin definir.
4. **Torre de desafíos** (plan_logica.md §4.2): sin definir.
5. **Actualización del PRD:** pendiente incorporar D-01 a D-14 en `reglas-batalla.adoc`, `requisitos-funcionales.adoc`, `contenido-aves.adoc` y `arquitectura.adoc`, con aprobación del Product Owner.

---

## Bitácora de implementación

### Paso 0 — Setup y contrato (19 nov 2026)

- Creado `game/src/battle/types.ts`: contrato completo del motor (tipos, fichas, estado de batalla, config, historial).
- Creado `game/src/battle/rng.ts`: RNG determinista LCG (`crearRng(seed)`) según `arquitectura.adoc` (ADR-04), no es desviación.
- Añadido **Vitest** como devDependency; scripts `test` y `test:watch` en `package.json`; configuración en `vitest.config.mts` (tests en `game/tests/`; extensión `.mts` porque el `package.json` es CommonJS).
- `game/tsconfig.json`: excluye `tests/` del build del cartucho.
- ⚠️ Recordatorio técnico: con el tree shaking de esbuild, mientras `main.ts` no use los módulos de batalla no aparecerán en el cartucho; se ejecutan por los tests.

### Paso 1 — Matriz PPTLS (19 nov 2026)

- Creado `game/src/battle/pptls.ts`: `compararPPTLS(a, b)`, `mensajePPTLS(a, b)` y lista `PPTLS_TIPOS`.
- Matriz idéntica a `reglas-batalla.adoc` (sin desviaciones): Piedra aplasta Tijera/Lagarto, Papel cubre Piedra/refuta Spock, Tijera corta Papel/decapita Lagarto, Lagarto come Papel/envenena Spock, Spock rompe Tijera/vaporiza Piedra.
- Mensajes de empate: «Choque de {tipo en plural}» (p. ej. «Choque de piedras», como el ejemplo del PRD).
- Tests en `game/tests/pptls.test.ts`: las 25 combinaciones contra la matriz del PRD, simetría, empates y mensajes.

### Paso 2 — Cálculo de daño (19 nov 2026)

- Creado `game/src/battle/damage.ts`: `calcularDanoBase`, `calcularDano`, `clasificarEfectividad` y `MENSAJE_EFECTIVIDAD`, con desglose completo (`DetalleDano`) para historial y modo de depuración.
- Orden de aplicación: daño base (0–HP máx rival, inclusive) → esfuerzo `×(1 + coste×0.15)` → STAB ×1.5 → pasiva Tijera +5 al ganar → pasiva Spock mínimo 30 % del HP máx rival al ganar → `floor`.
- STAB depende solo de los tipos (aplica también en empate); las pasivas de Tijera y Spock exigen ganar el intercambio (no aplican en empate).
- `ConfigBatalla` ampliado con parámetros de daño: `factorEsfuerzo`, `factorStab`, `bonusTijera`, `minimoSpock`, `pasivaSpockActiva`.
- **D-09 (decisión por defecto implementada):** la pasiva Spock prevalecía sobre «Sin efecto». **Superado por D3 (paso 6):** ahora solo se aplica con daño base mayor que 0; desactivable con `pasivaSpockActiva: false`.
- **D-12 nueva:** daño final con redondeo hacia abajo a entero ≥ 0.
- Tests en `game/tests/damage.test.ts` (20 casos): rangos del daño base, fórmula de esfuerzo, STAB con y sin, pasiva Tijera (con/sin STAB, en empate), pasiva Spock (base 0, bajo el mínimo, sobre el mínimo, empate, desactivada), límites de efectividad (20/21 sobre HP 40), mensajes del PRD, monotonía por coste MP y cotas superiores.

### Paso 3 — Estado de batalla (19 nov 2026)

- Creado `game/src/battle/state.ts`: `validarFicha`, `seleccionarMovimientos`, `inicializarAve`, `inicializarEquipo`, `inicializarBatalla`, `aveActiva`, `estaBloqueado`, `movimientosUsables`, `tieneMovimientoUsable`, `siguienteAve`, `avesDisponibles`, `evaluarFin`, `avesPorModo`.
- `EstadoBatalla` ahora incluye su `config: ConfigBatalla` (enriquecimiento del contrato, no desviación): `resolverTurno` usará las reglas configuradas por batalla.
- Decisiones de diseño:
  - El movimiento garantizado se elige **al azar entre los movimientos del tipo propio** de la ficha (con 1 propio es directo; con varios, cualquiera de ellos). La validación exige al menos uno.
  - Los 4 activos se devuelven en **orden mezclado** (Fisher–Yates con el rng) para que la UI no repita siempre la misma secuencia.
  - `siguienteAve(equipo)` devuelve la primera ave en estado 'activa' del equipo: pensada para llamarse tras marcar la salida de la anterior, implementa el relevo en orden de selección.
  - La rendición ('rendida') y el debilitamiento ('debilitada') cuentan igual como aves no disponibles para `evaluarFin` (BR-013, empate técnico incluido).
  - Los tamaños de equipo se validan contra `config.modo` (1v1 = 1 ave, 3v3 = 3 aves).
- Tests en `game/tests/state.test.ts` (26 casos): validación de fichas (cantidad, tipo propio, ids duplicados), 4 activos sin repetición y con el garantizado siempre presente (50 semillas), costes de MP en rango, HP base 20–50 y Piedra 40–50, MP 15 compartido, determinismo por semilla, tamaños por modo 1v1/3v3, estado inicial completo, bloqueo por MP, relevo en orden y los 4 resultados de `evaluarFin`.

### Paso 4 — Resolución de turnos (19 nov 2026)

- Creado `game/src/battle/turn.ts`: `resolverTurno(estado, movJugador, movCpu, rng)` → `ResultadoTurno` (estado nuevo + entrada de historial), con `clonarEstado` exportado (copia profunda; el estado original nunca se muta).
- Flujo: validaciones (batalla terminada, movimiento ajeno al ave activa, MP insuficiente → error; la UI debe prevenirlo, CB-01/CB-09) → pago de MP → PPTLS → daño → aplicación → salidas y relevo → regeneración Lagarto → fin → historial.
- `ConfigBatalla.regeneracionLagarto = 3` añadido (parámetro de la pasiva, no desviación).
- Decisiones de diseño (interpretaciones de D-04):
  - **Las pasivas se asocian al TIPO DEL AVE, no al del movimiento:** un ave de tipo papel tira su 25 % aunque su movimiento no sea de papel; Tijera +5 y Spock 30 % aplican según el tipo del ave atacante.
  - **La regeneración de Lagarto no revive:** se aplica al final del turno solo a aves activas en pie (hp > 0), con tope en hpMax. Un ave debilitada en ese turno no se recupera.
  - **CB-05:** si el ave cayó por HP, 'debilitada' tiene prioridad sobre 'rendida' aunque también se haya quedado sin movimientos usables.
  - **Orden de consumo del rng documentado** en el código (tiradas de papel jugador/CPU, luego daño jugador→CPU, luego daño CPU→jugador) para tests deterministas.
- Casos borde del PRD cubiertos: CB-03 (HP 0), CB-05 (prioridad debilitamiento), CB-08 (empate técnico), CB-02 (sin efecto), más el relevo en orden y el fin de batalla 1v1/3v3.
- Tests en `game/tests/turn.test.ts` (22 casos): validaciones, números exactos de los 3 resultados PPTLS, pasiva Papel (tirada baja/alta, ave-vs-movimiento, no-tirada de no papel), pasiva Lagarto (tope, espacio, no revivir, otros tipos), CB-03/CB-05/CB-08, rendición por MP con relevo (D-07), relevo del CPU, historial acumulativo e inmutabilidad del estado original.

### Paso 5 — CPU nivel base (19 nov 2026)

- Creado `game/src/battle/cpu.ts` (frontera con la Parte C): `elegirMovimientoCpu(estado, rng, perfil?)` → movimiento usable elegido **uniformemente al azar**, o `null` si ningún movimiento es usable por MP (señal para la Parte B; el motor ya procesa la rendición).
- Interfaz de extensión: `PerfilCpu { tipo: 'aleatorio', datos? }` — la Parte C añadirá tipos de perfil (preferencias, IA por jefe) sin cambiar la firma ni tocar el motor.
- **Parte A del motor de combate: completa.** Con estos 6 módulos (`types`, `rng`, `pptls`, `damage`, `state`, `turn`, `cpu`), la Parte B puede armar la pantalla de batalla completa (cada turno: `elegirMovimientoCpu` + `resolverTurno`) y la Parte C puede reemplazar el stub por perfiles reales.
- Tests en `game/tests/cpu.test.ts` (10 casos): nunca elige movimientos bloqueados, cubre todos los usables, respeta el ave activa tras relevo, determinismo por semilla, `null` sin MP, y el perfil base explícito/implícito. Nota de test: el LCG con semillas consecutivas produce primeras salidas muy correlacionadas; para distribución se usa un solo rng con muchas iteraciones.

### Documentación de la Parte A (19 nov 2026)

- Creado `game/src/battle/README.md`: índice de la API del motor para los equipos B y C — reglas del contrato, export de cada módulo con firmas, valores de `CONFIG_BASE`, flujo típico de integración para la Parte B y punto de extensión para la Parte C.
- Creado `game/tests/README.md`: guía de la suite — cómo ejecutarla (`npm test`, `test:watch`, archivo individual), qué consiste cada uno de los 5 archivos (86 casos), técnicas para escribir tests nuevos (rng por secuencia/semilla, forzar daño base exacto, fichas y estados de prueba, orden de consumo del rng, advertencia sobre el LCG con semillas consecutivas).

### Paso 6 — Ajustes del ejecutable mínimo (20 nov 2026)

Decisiones del plan MVP (`plan_mvp.md`, sección 2): D1 formato 1v1, D2 balance actual sin cambios, D3 pasiva de Spock solo con daño mayor que 0, D4 TIC-80 gratuito sin sprites.

- **D3:** `game/src/battle/damage.ts` exige `dano > 0` para la pasiva Spock. `game/tests/damage.test.ts` actualizado: con daño base 0 el resultado es «Sin efecto» (D-09 resuelto).
- **D4:** `src/tsc80.ts` lanza TIC-80 con `import code <salida> & run` en lugar de `load game.js & load <salida> code & run`. Se recompiló `bin/tsc80.js`. Verificado: TIC-80 gratuito abre, importa el código y ejecuta `Module import works!`.
- **D1:** el formato 1v1 se pasa al crear la batalla en `game/main.ts`. Todavía no hay batalla en `main.ts`; se aplica con la integración del paso 4 del plan.
- **Fichas (paso 2 del plan):** creado `game/src/data/birds.ts` con Cóndor, Loica y Chincol (5 movimientos cada una, datos de `contenido-aves.adoc`). Tipo propio según S-01 (D-14).
- Tests: `game/tests/birds.test.ts` (11 casos): validación de las fichas, ids únicos, tipo propio y que cada selección de 4 movimientos incluye uno de su tipo. Total: 97 pruebas pasan.

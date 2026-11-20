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
| D-06 | Tamaño del equipo | Cada equipo tiene 4 aves (BR-001). | **3 contra 3** en todas las batallas (entrega final). Config `modo: '1v1'` para la entrega parcial de la semana 23–27. | BR-001 |
| D-07 | Salida de un ave | Rendición automática cuando todos los PP llegan a cero (BR-010). | Un ave sale cuando su HP llega a 0 **o** cuando ningún movimiento es usable por MP insuficiente. | BR-010, BR-011, casos CB-05/CB-06 |
| D-08 | Lenguaje de los módulos de batalla | `game/src/battle/*.js` (JavaScript). | **TypeScript** (`game/src/battle/*.ts`), coherente con el pipeline tsc80/esbuild del repo. | `arquitectura.adoc` (estructura del repositorio) |
| D-09 | Pasiva Spock vs «Sin efecto» | Daño 0 se clasifica «Sin efecto» (BR-007). | **Conflicto abierto:** con la pasiva de Spock el daño nunca es 0 si gana. Pendiente de decisión del Product Owner. La pasiva se implementa como parámetro del cálculo, activable/desactivable. | BR-007 |
| D-10 | Rango del coste de MP | PP 1–5 (BR-003). | Coste de MP por movimiento aleatorio en **[1, 5]** (provisional, decisión propia al no fijarlo `pelea.md`). | BR-003 |
| D-11 | Pasiva Tijera «+5» | No aplica. | Interpretación: **+5 de daño fijo adicional** al daño calculado cuando el ave de tipo tijera gana el intercambio. | — |
| D-12 | Redondeo del daño final | No se especifica. | El daño final se **redondea hacia abajo** (`floor`) a un entero ≥ 0, coherente con el estilo del PRD. | BR-006 |

## Pendientes de decisión (bloquean cambios futuros)

1. **D-09 (Spock vs Sin efecto):** ¿se mantiene BR-007 (empate/daño 0) o prevalece la pasiva? **Decisión por defecto mientras no se resuelva:** la pasiva prevalece (daño mínimo 30 % al ganar, incluso si el base es 0); se puede desactivar con `ConfigBatalla.pasivaSpockActiva`.
2. **Pokédex** (plan_logica.md §4.1): sin definir.
3. **Torre de desafíos** (plan_logica.md §4.2): sin definir.
4. **Actualización del PRD:** pendiente incorporar D-01 a D-11 en `reglas-batalla.adoc`, `requisitos-funcionales.adoc`, `contenido-aves.adoc` y `arquitectura.adoc`, con aprobación del Product Owner.

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
- **D-09 (decisión por defecto implementada):** la pasiva Spock prevalece sobre «Sin efecto» (BR-007) mientras el PO decide; desactivable con `pasivaSpockActiva: false`.
- **D-12 nueva:** daño final con redondeo hacia abajo a entero ≥ 0.
- Tests en `game/tests/damage.test.ts` (20 casos): rangos del daño base, fórmula de esfuerzo, STAB con y sin, pasiva Tijera (con/sin STAB, en empate), pasiva Spock (base 0, bajo el mínimo, sobre el mínimo, empate, desactivada), límites de efectividad (20/21 sobre HP 40), mensajes del PRD, monotonía por coste MP y cotas superiores.

# Plan de implementación — Parte C (motor de combate)

Documento de trabajo de la Parte C de `plan_desarrollo.md` (sección 6). Lo que está decidido viene de `plan_desarrollo.md`, sección 3.1. Lo que falta está marcado como **pendiente**.

---

## 1. Alcance

La Parte C cambia el motor para la beta. No incluye interfaces ni bots, salvo la IA del motor (`cpu.ts`).

| # | Cambio | Decisión |
|---|---|---|
| C1 | Daño base por porcentaje: 10–50 % del HP máximo del rival, con mínimo de 10 %. | D-H |
| C2 | Sin techo por golpe. | D-H |
| C3 | Esfuerzo ×(1 + coste × 0.1). | D-H |
| C4 | STAB ×1.5. | D-H |
| C5 | Fallo de 10 % por movimiento. Gasta MP y turno, no hace daño. | D-H |
| C6 | MP inicial 20. Coste de movimiento de 1 a 3. | D-H |
| C7 | Spock: si gana, su movimiento no falla. Se elimina el mínimo de 30 %. | D-K |
| C8 | Movimiento característico por ave y pool compartida de movimientos predeterminados. | D-C, reemplaza D-05 |
| C9 | Nivel de combate: sube la vida de las aves. | D-D (fórmula pendiente) |
| C10 | Nuevas pruebas y actualización de `changes.md`, README y `pruebas_balance_dano.md`. | — |

---

## 2. Configuración objetivo

Valores de `CONFIG_BASE` para la beta:

| Parámetro | Valor actual | Valor objetivo |
|---|---|---|
| Daño base | 0 a HP máximo | 10 % a 50 % del HP máximo del rival |
| Techo | No existe | Ninguno |
| `factorEsfuerzo` | 0.15 | **0.1** |
| `factorStab` | 1.5 | 1.5 (sin cambio) |
| Fallo | No existe | **10 %** |
| `mpInicial` | 15 | **20** |
| `costeMpRango` | [1, 5] | **[1, 3]** |
| `minimoSpock` / `pasivaSpockActiva` | 0.3 / true | **Eliminar** |

Resultado medido con esta configuración (base 10–50 %, sin techo, MP 20, coste 1–3, fallo 10 %, esfuerzo 0.1): 14 turnos de mediana, 6 % de salidas por MP, 0.2 % de golpes que eliminan a un ave con vida completa (aceptado en D-H).

---

## 3. Cambios por archivo

### 3.1 `game/src/battle/damage.ts`
- **`calcularDanoBase`** (hoy `enteroAleatorio(rng, 0, hpMaxRival)`): pasa a `enteroAleatorio(rng, floor(0.1·HP), floor(0.5·HP))`. Los porcentajes deben ir en `ConfigBatalla` (nuevos campos `danoBaseMinFrac` y `danoBaseMaxFrac`), no fijos en el código.
- **`calcularDano`**: quitar la rama del mínimo de Spock (`minimoSpock`, `pasivaSpockActiva`). El resto del orden de cálculo no cambia: base → esfuerzo → STAB → Tijera (+5 si gana) → `floor`.
- **Fallo:** no va aquí. Va en `turn.ts`, porque depende de si el movimiento cuenta como acierto. Ver 3.3.
- Actualizar el comentario de cabecera (orden de aplicación).

### 3.2 `game/src/battle/types.ts`
- `ConfigBatalla`: agregar `danoBaseMinFrac`, `danoBaseMaxFrac`, `probFallo`. Quitar `minimoSpock` y `pasivaSpockActiva`.
- `CONFIG_BASE`: aplicar la tabla de la sección 2.
- `NOMBRE_PASIVA.spock`: cambiar el texto. Ya no es «daño mínimo 30 %».
- Agregar tipos para el movimiento característico y la pool (ver 3.4).

### 3.3 `game/src/battle/turn.ts`
- **Fallo (C5):** antes de calcular el daño, cada movimiento se tira contra `probFallo`. Si falla: se paga el MP y el turno, y el daño es 0. Clasificación «Sin efecto».
- **Spock (C7):** si el movimiento es de un ave de tipo spock que **gana** el intercambio, no se tira el fallo.
- **Orden del rng (crítico):** hay que documentar el nuevo orden de consumo en el encabezado de `turn.ts` y en los tests. Hoy: papel jugador → papel CPU → daño jugador → daño CPU. Con fallo, se agregan dos tiradas más por bando. Esto cambia todas las pruebas deterministas de `turn.test.ts`.
- Actualizar el flujo interno en `turn.ts` y en `game/src/battle/README.md`.

### 3.4 `game/src/battle/state.ts` y `types.ts` (movimientos)
Hoy: cada ave tiene 5 movimientos, 4 activos al azar con uno de su tipo garantizado (`seleccionarMovimientos`).

Nuevo (C8):
- Cada ave tiene **un movimiento característico** (fijo, del ave).
- Los demás movimientos activos son **predeterminados**, tomados de una **pool compartida**.
- La selección deja de ser aleatoria: el set de 4 activos es fijo por ave, o se define en la ficha.
- `validarFicha`: exigir el movimiento característico, y que los predeterminados vengan de la pool.
- `seleccionarMovimientos`: deja de sortear. Hay que decidir si el set es fijo (siempre los mismos) o si el set por ave se define en la ficha. **Pendiente (ver 5.1).**
- `inicializarAve`: el HP sale de la fórmula de nivel (C9).

### 3.5 `game/src/battle/state.ts` (nivel, C9)
- `inicializarAve` recibe el nivel del combate.
- HP máximo = rango base × factor de nivel. **La fórmula es pendiente (5.2).**
- El nivel del combate es el mismo para todas las aves del equipo rival y del jugador, salvo lo que se decida para el Enemigo 8 (jugador en nivel 7, enemigo en nivel 8).

### 3.6 `game/src/battle/rendicion.ts`, `cpu.ts`
- Sin cambios de regla. `cpu.ts` no cambia en la Parte C; la IA de bots (Parte B) es posterior.

### 3.7 `game/src/data/birds.ts`
- Agregar el movimiento característico de cada ave y dejar los predeterminados en la pool compartida.
- Esto depende de T8 (ver 5.1).

---

## 4. Pruebas

| Archivo | Qué cambia |
|---|---|
| `damage.test.ts` | Daño base 10–50 %; quitar pruebas del mínimo de Spock; agregar pruebas de esfuerzo 0.1. |
| `turn.test.ts` | Nuevo orden del rng; fallo (paga MP, sin daño); Spock que gana no falla; Spock base 0 = «Sin efecto». |
| `state.test.ts` | Validación del movimiento característico; movimientos fijos o de pool; MP 20; coste 1–3; nivel. |
| `cpu.test.ts` | Sin cambio de regla. Revisar que los usables sigan bien. |
| `birds.test.ts` | Cada ave tiene su característico y sus predeterminados de la pool. |
| `juego.test.ts`, `rendicion.test.ts` | Revisar, sin cambio de regla. |

Verificación de balance: volver a correr `pruebas_balance_dano.md` con el motor nuevo. Las cifras de la sección 2 deben reproducirse (±1 turno, ±1 punto de porcentaje).

---

## 5. Pendientes que bloquean la Parte C

### 5.1 Movimientos (bloquea C8)
- **T8 (tipo propio):** confirmar que el tipo propio es el del movimiento distintivo. Del tipo propio depende el STAB (×1.5) y la validación.
- **Movimiento característico:** ¿es el distintivo del PRD (que hoy no se usa en combate), o es un movimiento nuevo?
- **Set activo:** ¿el set de 4 de cada ave es fijo, o se define por ave en la ficha?
- **Pool:** ¿cuántos movimientos tiene, y qué movimientos son?

### 5.2 Nivel (bloquea C9)
- **Fórmula:** cuánta vida suma cada nivel. Con HP base 20–50 y nivel 1 a 8, hay que elegir el factor.
- **Nivel del jugador:** ¿el nivel de las aves del jugador es el del combate, o es fijo?

### 5.3 Fallo (C5)
- ¿El fallo gasta MP completo o solo el coste? Propuesta del plan: gasta MP y turno.

---

## 6. Orden de implementación

1. **Pendientes de 5.1 a 5.3** resueltos (T8 con el Product Owner).
2. **Daño** (3.1, 3.2): daño base por porcentaje, esfuerzo 0.1, quitar Spock mínimo. Pruebas de `damage.test.ts`.
3. **Config** (3.2): valores de la sección 2. Verificar que las pruebas de la capa anterior siguen pasando.
4. **Fallo y Spock** (3.3): tiradas de fallo, Spock sin fallo, nuevo orden del rng. Pruebas de `turn.test.ts`.
5. **Movimientos** (3.4, 3.7): característico y pool. Pruebas de `state.test.ts` y `birds.test.ts`.
6. **Nivel** (3.5): fórmula de vida. Pruebas de inicialización.
7. **Balance**: volver a medir con `pruebas_balance_dano.md`.
8. **Documentación**: `changes.md` (D-09 sustituido, D-05 sustituido, nuevos D), `game/src/battle/README.md`, `game/tests/README.md`, `plan_desarrollo.md`.

Cada paso debe dejar la suite en verde antes de pasar al siguiente.

---

## 6b. Riesgos específicos de la Parte C

| Riesgo | Mitigación |
|---|---|
| Cambiar el orden del rng rompe todas las pruebas deterministas. | Hacerlo en un paso aislado (paso 4) y documentar el orden. |
| El nuevo daño base cambia el balance medido. | Re-medir al final (paso 7). |
| Quitar el mínimo de Spock deja a Spock con daño base 0 con frecuencia. | Medir la proporción de «Sin efecto» de Spock en el paso 7. |
| Pool y característico sin definir frenan el paso 5. | Resolver 5.1 antes de empezar. |

---

## 7. Próximo paso inmediato

Resolver con el Product Owner **T8** y definir en equipo **5.1** (característico, set, pool) y **5.2** (fórmula de nivel). Con eso, la Parte C puede empezar por el paso 2 (daño), que no depende de ninguno de los pendientes.

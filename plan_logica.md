# Plan de trabajo: equipo de lógica

Proyecto: **Pokeaves PPTLS** (Aves de Chile: Duelo Alado), juego TIC-80 en JavaScript.
Fecha límite: juego completo el **5 de diciembre**. Entregable tangible la **semana del 23 al 27 de noviembre** (fecha exacta por confirmar).

Fuentes: `pelea.md` (reglas de combate), `redaccion.md` (requisitos del profesor), `comentarios_profe.md` (retroalimentación), y el PRD en `2026-aves-game/docs/modules/prd/`.

---

## 1. Decisiones tomadas

| Tema | Decisión |
|---|---|
| Entrega de la próxima semana | **Batalla 1 contra 1** jugable con navegación completa entre pantallas. Sin importar la cantidad de aves. |
| Entrega final (5 dic) | **Mínimo 10 aves**, con imagen, sonido, descripción y movimientos únicos. |
| Movimientos por ave | **5 movimientos posibles**. En combate se usan **4**, elegidos **al azar** al entrar en combate. |
| Movimiento de tipo del ave | **Siempre incluido** de forma fija: cada ave tiene un movimiento de su propio tipo PPTLS entre sus 4 activos. Los otros 3 se eligen al azar de sus 4 restantes. |
| Tipos PPTLS | Los 5 de `pelea.md` (Piedra, Papel, Tijera, Lagarto, Spock). **Provisionales.** |
| Formato de batalla (final) | **3 contra 3** en todas las batallas. |
| Recurso de movimientos | **MP compartido** por ave (fondo de MP), según `pelea.md`. No hay PP por movimiento. |
| MP inicial | **15** (valor provisional). |
| Movimiento sin MP suficiente | Si el coste del movimiento supera el MP restante del ave, **el movimiento queda bloqueado**. |
| Pasivas por tipo | **Entran en el MVP.** |
| Pokédex | **Pendiente.** |
| Torre de desafíos | **Pendiente.** |

### Reglas de combate (base: `pelea.md`)

- **Tipo del ave:** cada ave tiene un tipo PPTLS fijo. Se usa para la regla STAB y para el movimiento garantizado.
- **Inicio de combate:**
  - HP máximo y MP máximo (15) aleatorios.
  - Se toman sus 5 movimientos posibles. Se fija el movimiento de su tipo y se eligen 3 de los 4 restantes al azar, para un total de 4 activos.
  - Cada movimiento tiene un tipo PPTLS y un coste de MP aleatorios.
- **Turno:** ambos jugadores eligen un movimiento de sus 4 activos. Si el MP restante del ave es menor que el coste, el movimiento está bloqueado. Si no, se descuenta su coste del fondo de MP.
- **Daño base:** aleatorio entre 0 y el HP máximo del rival.
- **Multiplicador de esfuerzo:** `Daño = Base × (1 + Coste_MP × 0.15)`.
- **STAB:** si el tipo del movimiento coincide con el tipo del ave, el daño se multiplica por **×1.5**.
- **Empate PPTLS:** ambas aves calculan y reciben daño.
- **Pasivas:** Piedra (HP inicial 40–50), Tijera (+5 si gana), Papel (25 % de coste 0), Lagarto (+3 HP al final del turno, sin pasar el máximo), Spock (daño mínimo de 30 % del HP máximo rival si gana).
- **Salida de un ave:** cuando su HP llega a 0, o cuando no le queda ningún movimiento usable por MP. Entra la siguiente ave del equipo.

---

## 2. División del trabajo

Tres personas, una por parte. Los nombres se asignan en la reunión.

### A. Lógica de combate (motor)

- **Módulos:** `pptls.js`, `damage.js`, `turn.js`, `state.js` (nombres del PRD en `arquitectura.adoc`).
- **Responsabilidades:**
  - HP y MP al entrar en combate.
  - Selección de 4 movimientos activos: uno fijo de tipo del ave y 3 al azar.
  - Bloqueo de movimientos por MP insuficiente.
  - Resolver el turno, daño con multiplicadores, STAB, pasivas.
  - Salida y relevo de aves, fin de batalla.
- **Validación de datos:** cada ave debe tener al menos un movimiento de su propio tipo entre sus 5 posibles. Si no, el sistema debe rechazar la ficha.
- **Restricción:** independiente de TIC-80. Las funciones reciben un `rng` inyectable para poder probarlas.
- **Prioridad:** es la primera parte en ejecutarse porque B y C dependen de ella.

### B. Lógica de interfaces

- **Máquina de estados:** `TITLE → TEAM_SELECT → BATTLE → WIN / LOSE`, con botón para volver a jugar.
- **Pantallas:**
  - Inicio.
  - Selección de equipo: aves de un catálogo, con orden de selección. Para la entrega de la próxima semana, basta con un 1v1.
  - Batalla: HUD con HP, MP, los 4 movimientos activos (con los bloqueados marcados) y el resultado del turno.
  - Ganador y perdedor.
- **Controles:** teclado, mouse y táctil.
- **Otros:** cambio de música por pantalla, historial visual de turnos, modo de depuración (RF-027).

### C. Lógica de CPU y torre de desafíos

- **Selección de movimientos del CPU:** nivel base, aleatorio con preferencias.
- **IA por jefe:** cada jefe tiene una estrategia distinta. Ejemplos: priorizar el tipo que gana, conservar MP, cambiar de ave antes de que caiga.
- **Torre de desafíos:** pendiente de definir. Los jefes pelean 3v3.

---

## 3. Contrato entre partes (día 1)

A define primero la firma de las funciones principales, para que B y C avancen con datos de prueba:

```js
// Estado de batalla: equipos de aves con HP, MP y 4 movimientos activos
resolverTurno(estado, movJugador, movCpu, rng) // devuelve estado nuevo + historial
compararPPTLS(tipoA, tipoB)                    // 'jugador' | 'cpu' | 'empate'
elegirMovimientoCpu(estado, rng, perfil)       // C: devuelve índice de movimiento
seleccionarMovimientos(ave, rng)               // A: fijo de tipo + 3 al azar de 4
```

- **B** usa `estado` y `resolverTurno` para la pantalla de batalla.
- **C** implementa `elegirMovimientoCpu` sin tocar el cálculo de daño. Solo puede elegir entre movimientos no bloqueados.

---

## 4. Pendientes y preguntas abiertas

1. **Pokédex:** pendiente. Falta definir qué información muestra por ave y si también aplica a los jefes.
2. **Torre de desafíos:** pendiente. Falta definir cuántos jefes, cómo se avanza de uno a otro y si hay límite de vidas.
3. **Mínimo de daño de Spock (30 %) vs. "Sin efecto":** la regla del PRD dice que un daño de 0 es "Sin efecto". Con la pasiva de Spock, el daño nunca es 0 si gana. ¿Cuál regla se mantiene?
4. **PRD:** el alcance está congelado en la semana 2 del cronograma. Los cambios de este plan (10 aves, 3v3, MP compartido, pasivas, torre, Pokédex) requieren actualizar el PRD y la aprobación del Product Owner. El PRD dice 4v4 y 4 movimientos con PP por movimiento; hay que actualizarlo.
5. **Contenido:** 10 aves con 5 movimientos cada una son 50 movimientos que diseñar y balancear. Hay que definir quién los diseña y en qué fecha.

---

## 5. Próximos pasos

- [ ] Acordar el contrato de funciones (sección 3).
- [ ] Crear los datos de prueba de 3 aves con 5 movimientos cada una, y validar que cada una tenga un movimiento de su tipo.
- [ ] Definir la batalla 1v1 de la entrega de la próxima semana.
- [ ] Resolver las preguntas 1 a 3 de la sección 4.
- [ ] Actualizar el PRD para reflejar las decisiones de este plan.

# Plan del MVP mínimo — Pokeaves PPTLS

## Objetivo

Tener **un ejecutable** del juego (cartucho TIC-80 generado con `npm run game:build`) donde se pueda jugar un combate completo: elegir un ave, pelear contra la CPU y ver el resultado.

Alcance: lo mínimo para mostrar avance y que la mecánica funcione. Quedan fuera las funciones de la versión final.

---

## 1. Estado actual

| Parte | Estado | Dónde |
|---|---|---|
| Motor de batalla | Hecho (86 pruebas pasan) | `game/src/battle/` |
| CPU base aleatoria | Hecho | `game/src/battle/cpu.ts` |
| Herramienta de build y ejecución | Hecho, pero carga el cartucho con `load` (requiere PRO) | `npm run game:build`, `npm run game:run` |
| Cartucho con el motor | Pendiente | `game/main.ts` es la plantilla de prueba |
| Datos de aves | Pendiente | No existe `game/src/data/` |
| Pantallas y bucle de juego | Pendiente | — |

---

## 2. Decisiones tomadas

| # | Tema | Decisión |
|---|---|---|
| D1 | Formato del ejecutable | **1v1.** `CONFIG_BASE` sigue en `3v3` (regla final); el `main.ts` del ejecutable pasa `modo: '1v1'` al crear la batalla. |
| D2 | Balance del daño base | **Se mantiene el actual** (0 a HP máximo del rival). Se revisa después de la versión mínima. |
| D3 | Pasiva de Spock frente a "Sin efecto" | **La pasiva solo se aplica si el daño base es mayor que 0.** Un Spock que gana con daño base 0 produce "Sin efecto". |
| D4 | Versión de TIC-80 | **Gratuita, sin sprites.** Todo se dibuja con rectángulos y texto. Los sprites quedan para una versión futura. |

---

## 3. Cambios de código que implican las decisiones

Estado: los puntos 1, 2, 3 y 4 están hechos y verificados (86 pruebas pasan, el cartucho se genera e importa en TIC-80 gratuito). El punto 5 se aplica cuando `main.ts` cree la batalla (paso 4 de la sección 6).

1. **D3 (`game/src/battle/damage.ts`):** la condición de la pasiva Spock pasa a exigir `dano > 0`. Hoy solo verifica `ganaIntercambio` y `pasivaSpockActiva`.
2. **D3 (`game/tests/damage.test.ts`):** los casos de la pasiva Spock con daño base 0 esperan que el mínimo se aplique. Hay que cambiarlos para que esperen "sin efecto". Revisar también el caso de `pasivaSpockActiva: false`.
3. **D4 (`src/tsc80.ts`):** `launchTIC` usa `load game.js & load <salida> code & run`. Para la versión gratuita debe usar `import code <salida> & run`, sin `game.js`. La ruta de TIC-80 sigue viniendo de `TIC80_PATH` o de `ticExecutable`.
4. **D4 (`game/tsc80-config.json`):** sin cambios de formato; solo se deja de usar `game.js` como cartucho base.
5. **D1 (`game/main.ts`):** al crear la batalla se pasa `{ ...CONFIG_BASE, modo: '1v1' }`.

Después de estos cambios, `npm test` debe seguir pasando.

---

## 4. Qué incluye el ejecutable

### Combate

- Un combate **1v1** completo.
- Relevo y rendición, según las reglas que ya implementa el motor.
- Fin de batalla con ganador o empate técnico.

### Pantallas mínimas

- **Selección:** elegir el ave del jugador de una lista corta.
- **Batalla:** HP, MP, los 4 movimientos (los bloqueados marcados), el último resultado del turno y la opción de rendirse.
- **Resultado:** ganador o perdedor, con opción de jugar de nuevo.

Todo se dibuja con formas y texto, sin sprites.

### Datos

- Fichas de 3 aves con sus 5 movimientos (`AveFicha`), en `game/src/data/birds.ts`.
- Las 10 aves del PRD se agregan después, sin cambiar el código.

---

## 5. Qué queda fuera

- Sprites, íconos y animaciones.
- Título con música y pantallas de inicio elaboradas.
- Audio, efectos de sonido y sonidos de aves.
- 3v3, Pokédex, torre de desafíos e IA por jefe.
- PWA, CI/CD, manual web, tráiler y documentación actualizada.

---

## 6. Trabajo pendiente en orden

Cada paso depende del anterior.

1. **Cambios de código de la sección 3** (D1 a D4), con sus pruebas. *Hecho.*
2. **Fichas de datos.** *Hecho: `game/src/data/birds.ts` con Cóndor, Loica y Chincol (tests en `game/tests/birds.test.ts`).* Crear `game/src/data/birds.ts` con 3 aves y sus 5 movimientos cada una. Validar cada ficha con `validarFicha`.
3. **Máquina de estados mínima.** En `game/main.ts`: `SELECT → BATTLE → RESULT`, con un bucle `TIC()` que lea la entrada, llame al motor y dibuje la pantalla.
4. **Conexión con el motor.** Crear la batalla con `inicializarBatalla` (modo 1v1), elegir la CPU con `elegirMovimientoCpu` y resolver cada turno con `resolverTurno`. Mostrar `entrada.mensaje` y `entrada.eventos`.
5. **HUD de batalla.** Dibujar HP y MP del ave activa de cada lado, los movimientos con los bloqueados marcados y el resultado del turno.
6. **Rendición y relevo.** Botón para rendirse y transición cuando un ave sale.
7. **Pantalla de resultado.** Mostrar `ganador` y permitir volver a jugar.
8. **Verificación de tree-shaking.** Confirmar que el cartucho incluye los módulos de batalla (nota de `changes.md`).

---

## 7. Verificación del ejecutable

1. `npm test` pasa (motor, con las pruebas de D3 actualizadas).
2. `npm run game:build` termina sin errores y genera `game/build/output.js`.
3. `npm run game:run` abre TIC-80 gratuito y carga el cartucho con `import code`. La consola muestra la importación y el código corre.
4. En TIC-80 se puede completar un combate 1v1 de principio a fin, con:
   - selección de ave,
   - turnos con movimientos bloqueados por MP,
   - relevo o rendición,
   - pantalla de resultado con opción de volver a jugar.
5. Un Spock que gana con daño base 0 muestra "Sin efecto".
6. Las fichas de las 3 aves pasan `validarFicha`.

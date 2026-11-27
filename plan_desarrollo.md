# Plan de desarrollo — Pokeaves PPTLS (beta)

**Estado:** plan en revisión. Lo marcado como *Decidido* viene de tus respuestas. Lo marcado como *Decisión requerida* no se implementa hasta resolverse.

---

## 1. Objetivo

Tener una **versión beta** con casi todas las funcionalidades: una torre de combates 3v3 contra 8 bots, selección de equipo con aves desbloqueables, Pokédex, registro de combates, pausa y silencio, con guardado local.

El ejecutable mínimo (1v1) ya funciona y sirve de base.

---

## 2. Resumen de funcionalidades beta

| Área | Funcionalidades |
|---|---|
| **A. Interfaces** | Título (continuar / nuevo / borrar guardado), menú de torre, selección de equipo, batalla 3v3, pausa, ganador, perdedor, campeón, felicitación secreta, Pokédex, registro de combates, silencio. |
| **B. Bots** | 8 bots (Enemigos 1 a 8), cada uno con IA propia. |
| **C. Motor** | 3v3 con relevo, nivel por combate, daño con esfuerzo y STAB, fallo, movimiento característico por ave, pasiva de Spock ajustada. |
| **Transversal** | Guardado local, sprites (con PRO), audio, PWA, CI/CD, manual, tráiler. Ver plan aparte. |

---

## 3. Decisiones

### 3.1 Decididas

| # | Tema | Decisión |
|---|---|---|
| D-A | TIC-80 y sprites | Se usa **TIC-80 PRO** con sprites. El audiovisual hace las imágenes. El cargador vuelve a cargar `game/game.js`. |
| D-B | Persistencia | **Guardado local con `pmem`**. El título tiene **Continuar** y **Nuevo**, y una opción para **borrar el guardado local** (con confirmación). |
| D-C | Movimientos | Cada ave tiene **un movimiento característico**, relacionado con su comportamiento (no solo con su tipo). Los demás movimientos son de una **pool compartida** entre aves, como en Pokémon. |
| D-D | Nivel | Cada combate tiene un **nivel**. Las aves del jugador están en nivel 7 en el combate del Enemigo 8; el Enemigo 8 está en nivel 8. El nivel aumenta la vida. La fórmula se refina al implementar. |
| D-E | Desbloqueo de aves | Cada bot tiene un **ave característica**. Al derrotarlo, esa ave queda desbloqueada. El Enemigo 8 aparece en el menú al vencer al 7. |
| D-F | Pokédex «vista» | Un ave está **vista** si la viste en un combate (por ejemplo, al perder o empatar, cuando aparece el ave característica del bot) sin haberla desbloqueado. |
| D-G | Registro de combates | Se registra si el combate termina en victoria, derrota o empate. **Salir desde el menú de pausa** cuenta como rendición y **sí** se registra. Cerrar el juego **no** registra el combate. |
| D-H | Anti-letal (T4) | Daño base de **10 % a 50 %** del HP máximo del rival (mínimo de 10 %), **sin techo**, esfuerzo **0.1**, STAB **1.5**, fallo **10 %**, MP inicial **20**, coste de movimientos de **1 a 3**. **Aceptado con el 0.2 % de golpes que eliminan a un ave con vida completa** (ver 6.2d). Esos golpes dependen también de la estrategia del jugador. |
| D-I | Campeón | La pantalla de **campeón** aparece al vencer al **Enemigo 7**. Al vencer al **Enemigo 8** aparece una **pantalla de felicitación** (easter egg). |
| D-J | Predicción del Enemigo 7 (T6) | El bot usa **solo el historial** de movimientos del jugador. No ve la elección actual. |
| D-K | Pasiva de Spock (T7) | **Opción A, que reemplaza el mínimo de 30 %:** si Spock gana el intercambio, su movimiento **no puede fallar**. Ya no hay daño mínimo garantizado: si el daño base es 0, el resultado es «Sin efecto» (BR-007). |
| D-L | Aves iniciales | **Cóndor, Loica y Chincol**. |
| D-M | Aves de bots 1 a 5 | Enemigos 1 y 2 de los tipos que las aves iniciales no tienen (piedra y tijera). Las aves características de los Enemigos 3 a 5 son distintas de las iniciales (ver 5.2). |

### 3.2 Decisiones requeridas

| # | Tema | Lo que pide la beta | Decisión requerida |
|---|---|---|---|
| T8 | Tipo propio del ave (S-01) | Tipo del movimiento distintivo. | Confirmar con el Product Owner (D-14). **No respondido aún.** |

---

## 4. Área A — Interfaces

### 4.1 Pantallas

| Pantalla | Propósito | Navegación |
|---|---|---|
| **Título** | Continuar (si hay guardado), Nuevo, o borrar el guardado (con confirmación). | → Menú de torre. |
| **Menú de torre** | Elegir el combate (Enemigo 1 a 8) en secuencia. Están disponibles el siguiente combate no ganado y los ya ganados. El Enemigo 8 aparece al vencer al 7. | → Selección de equipo. → Pokédex. ← Título. |
| **Selección de equipo** | Elegir 3 aves de las desbloqueadas. Se muestra un vistazo de las aves del enemigo. | → Batalla. ← Menú de torre. |
| **Batalla 3v3** | Combate completo, con relevo. Muestra el nivel del combate. Pausa disponible. | → Ganador, Perdedor o Pausa. |
| **Pausa** | Continuar o salir. Salir cuenta como rendición. | → Batalla o → Perdedor. |
| **Ganador** | Victoria. | → Menú de torre. |
| **Perdedor** | Derrota. | → Menú de torre. |
| **Campeón** | Al vencer al Enemigo 7: trofeo y créditos cortos. | → Menú de torre. |
| **Felicitación secreta** | Al vencer al Enemigo 8: felicitación por vencer al jefe secreto. | → Menú de torre. |
| **Pokédex** | Aves en tres estados: *vistas*, *desconocidas* y *desbloqueadas*. | → Registro de combates. ← Menú de torre. |
| **Registro de combates** | Combates terminados: rival, aves usadas y resultado. | ← Pokédex. |

### 4.2 Controles y ajustes
- Botón de **silencio** en todas las pantallas.
- Botón de **pausa** en batalla.
- Teclado y ratón/táctil según RF-028. Pendiente confirmar el alcance táctil.

### 4.3 Pendientes de interfaz
- [ ] Textos de los créditos del campeón (Enemigo 7).
- [ ] Texto de la felicitación secreta (Enemigo 8).

### 4.4 Estado actual
- Pantallas mínimas 1v1 implementadas (selección de ave, batalla, revelación, resultado).
- Sin ratón ni táctil. Sin sprites (se restaura con D-A).
- Mensajes largos pueden cortarse en pantalla.

---

## 5. Área B — Bots (CPU)

### 5.1 Los 8 bots

| Bot | Dificultad | Rol | Características |
|---|---|---|---|
| Enemigo 1 a 5 | Media | Un bot por tipo PPTLS. | Usan sobre todo movimientos de su tipo, sin usar solo ese. Al menos un ave de su tipo. IA propia. |
| Enemigo 6 | Media/alta | General, antes del jefe. | IA propia (pendiente). |
| Enemigo 7 | Alta | Jefe final. Su victoria da el **campeón**. | Predice el movimiento del jugador usando **solo el historial** (D-J) y usa su contrario. Sin ser injusto. |
| Enemigo 8 | Muy alta | Secreto, aparece al vencer al 7. | Similar al 7, pero algo injusto. Nivel 8 contra aves del jugador en nivel 7. |

### 5.2 Orden y aves de los bots

**Propuesta de desbloqueos** (D-L y D-M):

| Bot | Tipo | Ave característica | Desbloquea |
|---|---|---|---|
| Enemigo 1 | Piedra | Picaflor | Picaflor |
| Enemigo 2 | Tijera | Diucón | Diucón |
| Enemigo 3 | Papel | Queltehue | Queltehue |
| Enemigo 4 | Lagarto | Tiuque | Tiuque |
| Enemigo 5 | Spock | Chercán | Chercán |
| Enemigo 6 | (general) | Pingüino de Humboldt | Pingüino |
| Enemigo 7 | (jefe) | Tucúquere | Tucúquere |
| Enemigo 8 | (secreto) | — | **Ninguna** (propuesta) |

Cuentas: 10 aves = 3 iniciales (Cóndor, Loica, Chincol) + 7 desbloqueables. Los Enemigos 1 a 7 cubren esas 7 aves. **El Enemigo 8 no desbloquea ninguna ave** (confirmado).

**Pendiente:** el Enemigo 6 es general y no tiene un tipo fijo definido. La propuesta asume que tiene el ave que queda.

**Ideas de mecánica para los Enemigos 6 a 8** (no decididas; las elige quien implemente):

| Bot | Ave | Idea |
|---|---|---|
| Enemigo 6 | Pingüino de Humboldt | **Resistente:** el primer golpe que recibe cada turno baja 20 %. |
| Enemigo 7 | Tucúquere | **Oportunista:** gana +5 de daño cuando el rival tiene menos de la mitad de su MP. |
| Enemigo 8 | — | **Sigiloso:** su primer movimiento de cada combate no puede fallar. |

### 5.3 Pendientes de bots
- [ ] Elegir las mecánicas de los Enemigos 6 a 8 (son reglas del motor, no de la IA).
- [x] IA del Enemigo 6: La Estratega, tres predictores y juego equilibrado.
- [x] IA de los Enemigos 1 a 5: una personalidad por tipo (ver 5.4).
- [x] Equipo de cada bot: `equipoDeBot` lo arma con las fichas que existan. Falta fijar equipos cuando estén las 10 fichas.

### 5.4 Estado actual
- Los 8 bots están en `game/src/data/bots.ts` y usan el perfil `estrategico` de `cpu.ts` (paso 13 de `changes.md`).
- Cada bot predice tu próximo tipo con el historial, calcula el valor esperado de cada movimiento y elige con azar controlado.
- Personalidades: 1 El Porfiado (piedra, repite lo que le funciona), 2 La Filosa (tijera, agresiva), 3 El Centinela (papel, defensivo), 4 El Oportunista (lagarto, remata), 5 El Escurridizo (spock, evita repetirse), 6 La Estratega (general), 7 El Jefe (solo historial, D-J), 8 La Sombra (conoce tus movimientos usables).
- Victorias del CPU en simulación (media de 7 estilos de jugador): 40 %, 56 %, 55 %, 61 %, 63 %, 75 %, 83 % y 89 %. El perfil aleatorio base queda en 45 %.
- El perfil aleatorio base sigue disponible (`PERFIL_BASE`).

---

## 6. Área C — Motor de combate

### 6.1 Cambios previstos
1. **Anti-letal** por la regla de D-H (ver 6.2d).
2. **Probabilidad de fallo** de 10 %.
3. **Daño base por porcentaje** del HP máximo del rival (10–50 %).
4. **Nivel de combate** que aumenta la vida (D-D).
5. **Movimiento característico** y pool compartida de movimientos (D-C). Reemplaza la selección aleatoria de 4 de 5 (D-05).

### 6.2 Medidas anteriores (3v3, 20 000 batallas, jugadores al azar)

| Opción | Letal desde HP completo | Salidas por MP | Turnos (mediana) |
|---|---|---|---|
| Actual (0 a HP) | 26 % | 8 % | 7 |
| Base 0–40 % + techo 40 % + fallo 10 % | 0 % | 65 % | 14 |
| Base 0–60 % + techo 60 % + fallo 10 %, MP 20, coste 1–3 | 0 % | 8 % | 14 |

### 6.2b Búsqueda con MP y coste

| MP inicial | Coste | Turnos | Salidas por MP | One-shot desde HP completo |
|---|---|---|---|---|
| 20 | 1–3 | 14 | 8 % | 0 % |
| 25 | 1–3 | 14 | 3 % | 0 % |
| 20 | 1–5 | 13 | 21 % | 0 % |

### 6.2c Base 10–50 %

| Opción | Letal desde HP completo | Salidas por MP | Turnos |
|---|---|---|---|
| Base 10–50 %, sin techo | 0.8 % | 5 % | 13 |
| Base 10–50 %, techo 60 % | 0 % | 6 % | 14 |

### 6.2d Configuración elegida (D-H)

Configuración: base **10–50 %**, **sin techo**, esfuerzo **0.1**, STAB **1.5**, fallo **10 %**, MP **20**, coste **1–3**.

| Métrica | Valor |
|---|---|
| Golpes que superan 60 % del HP máximo | 19 % |
| Golpes que superan 100 % del HP máximo | 0.4 % |
| **Golpes que eliminan a un ave con vida completa** | **0.2 %** (aceptado) |
| Turnos (mediana) | 14 |
| Salidas por MP | 6 % |
| Daño medio por golpe | 15.7 |

**Decisión:** se acepta el 0.2 %. Esos golpes también dependen de la estrategia del jugador (exponer un ave con poca vida). Si más adelante se quiere eliminarlos, las opciones son el techo de 60 % o bajar el STAB a 1.25 (ver el registro de cifras).

### 6.3 Pendientes del motor
- [ ] Fórmula del nivel: cuánta vida suma cada nivel.
- [ ] Revisar la pasiva de Spock (6.4).
- [ ] Pool de movimientos compartidos y lista de movimientos por ave.

### 6.4 Pasiva de Spock (T7)

**Pasiva actual:** si Spock gana el intercambio PPTLS y el daño base es mayor que 0, el daño se eleva a **al menos 30 % del HP máximo del rival**. Con daño base 0, el resultado es «Sin efecto». Está en `damage.ts` (`minimoSpock`, `pasivaSpockActiva`).

**Decidido: opción A, que reemplaza el mínimo de 30 %.** Si Spock gana, su movimiento no puede fallar. El daño de Spock ya no tiene mínimo garantizado: con daño base 0, el resultado es «Sin efecto».

**Implicaciones en el código (pendientes de implementar):**
- Quitar el mínimo de 30 % (`minimoSpock`, `pasivaSpockActiva` y su aplicación en `damage.ts`).
- Actualizar las pruebas de la pasiva Spock en `damage.test.ts` y `turn.test.ts`.
- Registrar el cambio en `changes.md`: D-09 queda sustituido por esta regla.

### 6.5 Estado actual
- Batalla 1v1 completa. Motor preparado para 3v3 (relevo y fin probados).
- Rendición en el motor (RF-015), con 7 pruebas.
- 118 pruebas automáticas pasan.

---

## 7. Persistencia

Datos que se guardan localmente con `pmem` (D-B):

| Dato | Uso |
|---|---|
| Aves desbloqueadas | Selección de equipo y Pokédex. |
| Aves vistas | Pokédex. |
| Combates ganados | Menú de torre. |
| Registro de combates | Pantalla de registro. |
| Progreso de la torre | Qué combate sigue. |

- [ ] Qué pasa si el guardado está dañado (¿se reinicia o se avisa?).

**Desviación del PRD:** el PRD excluye «cuentas y persistencia» del MVP. Esta es una beta, así que hay que registrar la desviación en `changes.md` cuando se implemente.

---

## 8. Bloque transversal

Audio, PWA, CI/CD, manual y tráiler se planean en un documento aparte. Aquí solo se registran las dependencias:

- **Sprites:** el audiovisual hace las imágenes. Dependen del cargador con PRO (D-A).
- **Audio:** silencio (sección 4.2) depende de tener audio.
- **Contenido:** 7 de las 10 aves faltan. Cada una necesita 5 movimientos con nombre y tipo, y uno característico.
- **PWA y despliegue:** dependen de que el juego esté estable.
- **PRD:** actualizar con las desviaciones de `changes.md`.

---

## 9. Fases propuestas

Las fases son un orden de trabajo, no fechas.

| Fase | Contenido | Depende de |
|---|---|---|
| **0. Decisiones** | Resolver T8. | — |
| **1. Motor** | Daño por porcentaje, fallo, esfuerzo y STAB, nivel, movimientos característicos y pool, pasiva de Spock, 3v3 completo. | Fase 0 |
| **2. Persistencia** | `pmem`: continuar, nuevo, borrar guardado. | Fase 0 |
| **3. Interfaces base** | Título, menú de torre, selección de equipo, batalla 3v3, pausa, ganador/perdedor. | Fases 1 y 2 |
| **4. Bots** | Enemigos 1 a 8 con sus IA y mecánicas; torre con orden y desbloqueos. | Fases 1 y 3 |
| **5. Pokédex y registro** | Estados vista/desconocida/desbloqueada; registro; campeón (Enemigo 7) y felicitación (Enemigo 8). | Fases 2 y 4 |
| **6. Pulido** | Silencio, textos, sprites, pruebas de la beta. | Todas |

---

## 10. Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El cambio de daño altera el balance medido. | Repetir las simulaciones. | Usar `pruebas_balance_dano.md` y repetir tras cada cambio. |
| Persistencia contradice el PRD. | Desviación que hay que aprobar. | Registrarla en `changes.md` al implementar. |
| 0.2 % de golpes eliminan a un ave sana. | Desviación de la regla. | Aceptado en D-H; reevaluar con jugadores reales. |
| 8 bots para 7 aves desbloqueables. | Un bot no desbloquea nada. | Resuelto: el Enemigo 8 no desbloquea ave (5.2). |
| La versión PRO es de pago. | El equipo debe tenerla para ejecutar con sprites. | Confirmar que todo el equipo tiene la licencia. |

---

## 11. Respuestas

### 11.1 Respondidas
- **T4 (anti-letal):** configuración D-H. Aceptado el 0.2 % de golpes que eliminan a un ave con vida completa.
- **Aves iniciales:** Cóndor, Loica y Chincol (D-L).
- **Aves de bots 1 a 5:** las características de los Enemigos 3 a 5 son distintas de las iniciales, aunque pueden repetir tipo (D-M).
- **Spock (T7):** opción A (ver 6.4).
- **Aves de los Enemigos 6 a 8:** el tema visual decide la ave. Las mecánicas son ideas para quien implemente.
- **Enemigo 8:** nivel 8 contra aves del jugador en nivel 7. Felicitación secreta (D-I).
- **Campeón:** al vencer al Enemigo 7 (D-I).
- **Movimientos predeterminados:** un movimiento característico relacionado con el comportamiento del ave, y los demás de una pool compartida (D-C).
- **T6:** el bot usa solo el historial (D-J).
- **Guardado:** `pmem` (D-B).

- **Enemigo 8 y desbloqueos:** no desbloquea ave (confirmado).
- **Spock:** opción A, que reemplaza el mínimo de 30 % (confirmado).

### 11.2 Preguntas abiertas
1. **T8 (tipo propio):** sigue pendiente de confirmar con el Product Owner.

---

## 12. Próximos pasos

1. Resolver T8 (sección 11.2).
2. Dividir cada fase en tareas con dependencias.
3. Crear el plan transversal aparte (audio, PWA, CI/CD, manual, tráiler).

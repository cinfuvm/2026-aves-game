# Parte C (motor de combate): pendientes a futuro

La Parte C está implementada (pasos 1 a 7 del plan anterior). Las decisiones vigentes están en `changes.md` (D-15 a D-18 y D-H) y en `plan_desarrollo.md`. Este documento solo lista lo que queda pendiente.

---

## 1. Decisiones pendientes

| # | Tema | Qué falta |
|---|---|---|
| P1 | T8: tipo propio del ave | Confirmar con el Product Owner que el tipo propio es el del movimiento característico (supuesto S-01, D-14). Si cambia, solo se edita `game/src/data/birds.ts`. |
| P2 | Nombres de la pool | Los 15 movimientos son propuesta tomada del PRD. Revisarlos antes de la beta. |
| P3 | Rango de Piedra | Hoy conserva 40–50 de HP base, más el nivel. Confirmar si debe usar el rango general (30–50). |
| P4 | Niveles de la torre | `nivelJugador` y `nivelCpu` están en 0. La torre debe fijar el nivel de cada combate. Confirmar si el jugador queda fijo en nivel 7 en el Enemigo 8. |
| P5 | Golpe que elimina a un ave sana | Medido en 0.13 % con fichas aleatorias y 0 % con las aves reales. Se aceptó en D-H. Reevaluar con jugadores reales. |
| P6 | Duración de la batalla | La mediana está en 13–15 turnos. El objetivo era 9–10. Si se quiere acortar, habría que ajustar MP, coste o daño. |
| P7 | Fórmula de la vida por nivel | Hoy es +10 × nivel. Revisar al implementar la torre si el efecto es el esperado. |

---

## 2. Trabajo futuro que depende de la Parte C

- **Aves restantes:** las otras 7 aves del PRD necesitan su característico y tres predeterminados de la pool (ver `game/src/battle/README.md`).
- **Bots (Parte B):** los perfiles de la CPU se añaden en `cpu.ts` sin cambiar la firma (`PerfilCpu`). Enemigo 7 solo usa historial del jugador (D-J).
- **Torre de desafíos:** define el nivel de cada combate y el orden de los bots.

---

## 3. Verificación futura

Cuando cambien los valores de `CONFIG_BASE` o las fichas, volver a correr las mediciones de `pruebas_balance_dano.md` (sección 8) y actualizar esa sección.

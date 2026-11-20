// title:  Pokeaves PPTLS
// author: equipo de lógica
// desc:   Combate 1v1 por turnos contra la CPU (ejecutable mínimo)
// script: js

import { printh } from "./helpers"
import {
  confirmarAve,
  moverMovimiento,
  moverSeleccion,
  nuevoJuego,
  rendirse,
  reiniciar,
  usarMovimiento,
  type Juego,
} from "./src/juego/flujo"
import { FICHAS_MVP } from "./src/data/birds"
import { aveActiva } from "./src/battle/state"
import type { AveCombate, Rng, TipoPPTLS } from "./src/battle/types"

// Botones de TIC-80
const ARRIBA = 0
const ABAJO = 1
const IZQUIERDA = 2
const DERECHA = 3
const A = 4
const B = 5

// Colores de la paleta por defecto de TIC-80
const NEGRO = 0
const ROJO = 2
const NARANJA = 4
const VERDE = 5
const AZUL = 10
const BLANCO = 12
const GRIS = 13
const GRIS_OSCURO = 14

const NOMBRE_TIPO: Record<TipoPPTLS, string> = {
  piedra: "Piedra",
  papel: "Papel",
  tijera: "Tijera",
  lagarto: "Lagarto",
  spock: "Spock",
}

// Producción: Math.random. El motor recibe el rng por parámetro.
const rng: Rng = Math.random

let juego: Juego = nuevoJuego()

function BOOT() {
  printh("Module import works!")
}

function TIC() {
  leerEntrada()
  dibujar()
}

// ---------- Entrada ----------

function leerEntrada() {
  switch (juego.pantalla) {
    case "seleccion":
      if (btnp(IZQUIERDA)) juego = moverSeleccion(juego, -1)
      if (btnp(DERECHA)) juego = moverSeleccion(juego, 1)
      if (btnp(A)) juego = confirmarAve(juego, rng)
      break
    case "batalla":
      if (btnp(ARRIBA)) juego = moverMovimiento(juego, -1)
      if (btnp(ABAJO)) juego = moverMovimiento(juego, 1)
      if (btnp(A)) juego = usarMovimiento(juego, rng)
      if (btnp(B)) juego = rendirse(juego)
      break
    case "resultado":
      if (btnp(A)) juego = reiniciar(juego)
      break
  }
}

// ---------- Dibujo ----------

function dibujar() {
  cls(NEGRO)
  switch (juego.pantalla) {
    case "seleccion":
      dibujarSeleccion()
      break
    case "batalla":
      dibujarBatalla()
      break
    case "resultado":
      dibujarResultado()
      break
  }
}

function dibujarSeleccion() {
  print("POKEAVES PPTLS", 62, 6, NARANJA)
  print("Elige tu ave", 84, 18, BLANCO, false, 1, true)

  FICHAS_MVP.forEach((ficha, i) => {
    const seleccionada = i === juego.cursorAve
    const x = 12 + i * 76
    rect(x - 3, 28, 66, 14, seleccionada ? AZUL : NEGRO)
    print(ficha.nombre, x, 33, seleccionada ? BLANCO : GRIS)
  })

  const ficha = FICHAS_MVP[juego.cursorAve]
  print(`Tipo propio: ${NOMBRE_TIPO[ficha.tipo]}`, 12, 52, BLANCO, false, 1, true)
  ficha.movimientos.forEach((mov, i) => {
    print(
      `${mov.nombre} (${NOMBRE_TIPO[mov.tipo]})`,
      12,
      62 + i * 9,
      GRIS,
      false,
      1,
      true
    )
  })

  print("IZQ/DER: cambiar   A: elegir", 30, 124, GRIS, false, 1, true)
}

function dibujarBatalla() {
  const estado = juego.estado
  if (!estado) return
  const cpu = aveActiva(estado.cpu)
  const jugador = aveActiva(estado.jugador)

  // CPU, arriba
  print(`CPU: ${cpu.nombre}`, 8, 6, ROJO)
  barra(8, 16, 130, cpu.hpActual, cpu.hpMax, ROJO)
  print(`HP ${cpu.hpActual}/${cpu.hpMax}`, 146, 14, BLANCO, false, 1, true)

  // Jugador, centro
  print(`Tú: ${jugador.nombre}`, 8, 32, VERDE)
  barra(8, 42, 130, jugador.hpActual, jugador.hpMax, VERDE)
  barra(8, 49, 130, jugador.mpActual, jugador.mpMax, AZUL)
  print(`HP ${jugador.hpActual}/${jugador.hpMax}`, 146, 40, BLANCO, false, 1, true)
  print(`MP ${jugador.mpActual}/${jugador.mpMax}`, 146, 47, BLANCO, false, 1, true)

  // Movimientos del jugador
  dibujarMovimientos(jugador)

  // Mensaje del último turno
  print(juego.mensaje, 8, 106, NARANJA, false, 1, true)
  if (juego.eventos.length > 0) {
    print(juego.eventos[0], 8, 114, BLANCO, false, 1, true)
  }

  print("ARR/ABJ: mover  A: usar  B: rendirse", 14, 128, GRIS, false, 1, true)
}

function dibujarMovimientos(ave: AveCombate) {
  ave.movimientos.forEach((mov, i) => {
    const y = 62 + i * 9
    const bloqueado = mov.costeMp > ave.mpActual
    const seleccionado = i === juego.cursorMov
    const color = bloqueado ? GRIS_OSCURO : seleccionado ? BLANCO : GRIS
    const marca = seleccionado ? ">" : " "
    const texto = `${marca} ${mov.nombre} (${NOMBRE_TIPO[mov.tipo]}) coste ${mov.costeMp}${bloqueado ? " sin MP" : ""}`
    print(texto, 8, y, color, false, 1, true)
  })
}

function dibujarResultado() {
  const texto =
    juego.resultado === "jugador"
      ? "GANASTE"
      : juego.resultado === "cpu"
        ? "PERDISTE"
        : "EMPATE TECNICO"
  print(texto, 36, 40, NARANJA, false, 2)
  print(juego.mensaje, 8, 76, BLANCO, false, 1, true)
  print("A: jugar de nuevo", 72, 110, GRIS, false, 1, true)
}

function barra(x: number, y: number, ancho: number, valor: number, max: number, color: number) {
  rect(x, y, ancho, 4, GRIS_OSCURO)
  const relleno = max > 0 ? Math.max(0, Math.floor((ancho * valor) / max)) : 0
  if (relleno > 0) rect(x, y, relleno, 4, color)
}

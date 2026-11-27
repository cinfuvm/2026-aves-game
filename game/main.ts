4// title:  Pokeaves PPTLS
// author: equipo de lógica
// desc:   Combate 1v1 por turnos contra la CPU (ejecutable mínimo)
// script: js

import { printh } from "./helpers"
import {
  cancelarBorrado,
  alternarAveDelCursor,
  confirmarBorrado,
  confirmarEquipo,
  confirmarOpcionTitulo,
  confirmarTurno,
  entrarCombate,
  botDisponible,
  botsVisibles,
  moverOpcionBorrado,
  moverOpcionTitulo,
  moverMovimientoCuadricula,
  moverSeleccionCuadricula,
  moverTorre,
  nuevoJuego,
  puedeConfirmarEquipo,
  rendirse,
  reiniciar,
  usarMovimiento,
  volverATorre,
  volverAlTitulo,
  puedeContinuar,
  type Juego,
} from "./src/juego/flujo"
import {
  fichasElegidas,
  TAMANO_EQUIPO,
} from "./src/juego/seleccion"
import {
  borrarGuardado,
  guardarProgreso,
  leerProgreso,
  type Almacen,
} from "./src/juego/guardado"
import { envolverTexto, recortarTexto } from "./src/juego/ui/texto"
import { ALTO_PANTALLA, MARGEN } from "./src/juego/ui/layout"
import { CATALOGO_AVES } from "./src/data/birds"
import { aveActiva } from "./src/battle/state"
import {
  SPRITE_POR_AVE,
  SPRITE_ESCALA,
  SPRITE_COLORKEY,
  SPRITE_ANCHO_TILES,
  SPRITE_ALTO_TILES,
    FONDOS_TILES,
  FONDO_ALTO_TILES,
  FONDO_BLOQUE_TILES,
} from "./src/data/sprites"
import type { AveCombate, Equipo, Rng, TipoPPTLS } from "./src/battle/types"

// Botones de TIC-80
const ARRIBA = 0
const ABAJO = 1
const IZQUIERDA = 2
const DERECHA = 3
const A = 4
const B = 5

// Colores de la paleta por defecto de TIC-80 (Sweetie-16)
const C = {
  negro: 0,
  panel: 1,
  rojo: 2,
  amarillo: 4,
  gris: 5,
  verde: 6,
  azul: 8,
  cielo: 10,
  blanco: 12,
  montana: 13,
  grisOscuro: 14,
} as const
const NEGRO = C.negro
const ROJO = C.rojo
const NARANJA = C.amarillo
const VERDE = C.verde
const AZUL = C.azul
const BLANCO = C.blanco
const GRIS = C.gris
const GRIS_OSCURO = C.grisOscuro

const NOMBRE_TIPO: Record<TipoPPTLS, string> = {
  piedra: "Piedra",
  papel: "Papel",
  tijera: "Tijera",
  lagarto: "Lagarto",
  spock: "Spock",
}

// Producción: Math.random. El motor recibe el rng por parámetro.
const rng: Rng = Math.random

// Adaptador de persistencia sobre `pmem` de TIC-80 (D-B).
const almacenPmem: Almacen = {
  leer: (indice: number) => pmem(indice),
  escribir: (indice: number, valor: number) => pmem(indice, valor),
}

// Persiste el progreso actual y devuelve el juego sin cambios (efecto lateral).
function persistir(j: Juego): Juego {
  guardarProgreso(almacenPmem, j.progreso)
  return j
}

// Estado inicial: se lee el guardado de `pmem` al arrancar.
let juego: Juego = nuevoJuego(leerProgreso(almacenPmem) ?? undefined)

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
    case "titulo":
      if (btnp(ARRIBA)) juego = moverOpcionTitulo(juego, -1)
      if (btnp(ABAJO)) juego = moverOpcionTitulo(juego, 1)
      if (btnp(A)) juego = confirmarOpcionTitulo(juego)
      break
    case "confirmar_borrado":
      if (btnp(IZQUIERDA) || btnp(DERECHA)) juego = moverOpcionBorrado(juego, 1)
      if (btnp(A)) {
        juego = persistir(confirmarBorrado(juego, () => borrarGuardado(almacenPmem)))
      }
      if (btnp(B)) juego = cancelarBorrado(juego)
      break
    case "menu_torre":
      if (btnp(ARRIBA)) juego = moverTorre(juego, -1)
      if (btnp(ABAJO)) juego = moverTorre(juego, 1)
      if (btnp(A)) juego = entrarCombate(juego)
      if (btnp(B)) juego = volverAlTitulo(juego)
      break
        case "seleccion":
          if (btnp(ARRIBA)) juego = moverSeleccionCuadricula(juego, -1, 0)
          if (btnp(ABAJO)) juego = moverSeleccionCuadricula(juego, 1, 0)
          if (btnp(IZQUIERDA)) juego = moverSeleccionCuadricula(juego, 0, -1)
          if (btnp(DERECHA)) juego = moverSeleccionCuadricula(juego, 0, 1)
          if (btnp(A)) juego = alternarAveDelCursor(juego)
          if (btnp(B)) juego = volverATorre(juego)
          // ESPACIO confirma el equipo (A alterna aves; se necesitan dos acciones).
          if (keyp(48) && puedeConfirmarEquipo(juego)) {
            juego = persistir(confirmarEquipo(juego, rng))
          }
          break
        case "batalla":
      if (btnp(ARRIBA)) juego = moverMovimientoCuadricula(juego, -1, 0)
      if (btnp(ABAJO)) juego = moverMovimientoCuadricula(juego, 1, 0)
      if (btnp(IZQUIERDA)) juego = moverMovimientoCuadricula(juego, 0, -1)
      if (btnp(DERECHA)) juego = moverMovimientoCuadricula(juego, 0, 1)
      if (btnp(A)) juego = usarMovimiento(juego, rng)
      if (btnp(B)) juego = persistir(rendirse(juego))
      break
    case "revelacion":
      if (btnp(A)) juego = persistir(confirmarTurno(juego, rng))
      break
    case "resultado":
      if (btnp(A)) juego = reiniciar(juego)
      if (btnp(B)) juego = volverAlTitulo({ ...juego, pantalla: "menu_torre" })
      break
  }
}

// ---------- Dibujo ----------

function dibujar() {
  cls(NEGRO)
  switch (juego.pantalla) {
    case "titulo":
      dibujarTitulo()
      break
    case "confirmar_borrado":
      dibujarTitulo()
      dibujarConfirmarBorrado()
      break
    case "menu_torre":
      dibujarTorre()
      break
    case "seleccion":
      dibujarSeleccion()
      break
    case "batalla":
      dibujarBatalla()
      break
    case "revelacion":
      dibujarRevelacion()
      break
    case "resultado":
      dibujarResultado()
      break
  }
}

// Imprime un texto envuelto por ancho útil, sin cortar en el borde de 240 px.
function imprimirEnvuelto(texto: string, y: number, color: number, maxLineas = 3) {
  const lineas = envolverTexto(ascii(texto), 240 - MARGEN * 2, 6, 1).slice(0, maxLineas)
  lineas.forEach((linea, i) => print(linea, MARGEN, y + i * 8, color, false, 1, true))
}

// Ancho en píxeles de un texto con la fuente normal de print (6 px por carácter).
function anchoTexto(texto: string, escala = 1): number {
  return texto.length * 6 * escala
}

// Normaliza a ASCII imprimible: la fuente por defecto de TIC-80 no tiene
// acentos ni 'ñ/ü', y los muestra como huecos ("Cóndor" -> "C NDOR").
// Se mantiene el dato con tilde en el dominio y se aplana solo al dibujar.
const ACENTOS: Record<string, string> = {
  á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n",
  Á: "A", É: "E", Í: "I", Ó: "O", Ú: "U", Ü: "U", Ñ: "N",
  "¿": "", "¡": "", "…": "...",
}
function ascii(texto: string): string {
  let salida = ""
  for (const ch of texto) salida += ACENTOS[ch] ?? ch
  return salida
}

// Texto centrado horizontalmente en la pantalla (cálculo manual, print no centra).
function imprimirCentrado(texto: string, y: number, color: number, escala = 1) {
  const t = ascii(texto)
  const x = Math.floor((240 - anchoTexto(t, escala)) / 2)
  print(t, x, y, color, false, escala, true)
}

// Barra inferior de ayuda con las teclas, en fuente pequeña y centrada.
function ayuda(texto: string, y = 128) {
  const t = ascii(texto)
  const x = Math.floor((240 - t.length * 6) / 2)
  print(t, x, y, GRIS, false, 1, true)
}

// Marco de pantalla con título superior (look consistente entre pantallas).
function marcoTitulo(texto: string) {
  imprimirCentrado(texto, 6, NARANJA)
  line(MARGEN, 16, 240 - MARGEN, 16, GRIS_OSCURO)
}

function dibujarTitulo() {
  // Decoración superior: franja de cielo y sol.
  rect(0, 0, 240, 40, C.cielo)
  circ(208, 18, 10, NARANJA)
  imprimirCentrado("POKEAVES PPTLS", 14, BLANCO, 2)
  imprimirCentrado("Duelo Alado", 34, NARANJA, 1)

  const opciones = ["Continuar", "Nuevo juego", "Borrar guardado"]
  const yBase = 60
  opciones.forEach((texto, i) => {
    const activa = i === juego.opcionTitulo
    const habilitada = i !== 0 || puedeContinuar(juego.progreso)
    const color = !habilitada ? GRIS_OSCURO : activa ? BLANCO : GRIS
    const y = yBase + i * 16
    if (activa) {
      // Resalte de la opción seleccionada.
      rect(70, y - 3, 100, 13, habilitada ? AZUL : GRIS_OSCURO)
      print(">", 62, y, habilitada ? NARANJA : GRIS_OSCURO, false, 1, true)
    }
    imprimirCentrado(texto, y, color)
  })

  ayuda("ARRIBA/ABAJO: mover   Z: elegir", 122)
}

function dibujarConfirmarBorrado() {
  // Panel modal sobre el título.
  rect(30, 44, 180, 48, GRIS_OSCURO)
  rectb(30, 44, 180, 48, BLANCO)
    imprimirCentrado("Borrar guardado?", 52, BLANCO)
  imprimirCentrado("No se puede deshacer", 64, GRIS)

  const siActivo = juego.opcionBorrado === 0
  const noActivo = juego.opcionBorrado === 1
  rect(60, 76, 44, 12, siActivo ? ROJO : NEGRO)
  rect(140, 76, 44, 12, noActivo ? AZUL : NEGRO)
  print("Si", 80, 78, siActivo ? BLANCO : GRIS, false, 1, true)
  print("No", 160, 78, noActivo ? BLANCO : GRIS, false, 1, true)
  ayuda("IZQ/DER: elegir   Z: confirmar   X: cancelar", 104)
}

function dibujarTorre() {

  marcoTitulo("TORRE DE DESAFIOS")
  const total = botsVisibles(juego.progreso)
  for (let i = 0; i < total; i++) {
    const y = 22 + i * 12
    const activo = i === juego.cursorTorre
    const disponible = botDisponible(juego.progreso, i)
    const ganado = juego.progreso.combatesGanados.includes(i)
    const color = activo ? BLANCO : disponible ? GRIS : GRIS_OSCURO
    if (activo) rect(16, y - 2, 208, 11, disponible ? AZUL : GRIS_OSCURO)
    const marca = activo ? ">" : " "
    const icono = ganado ? "[OK]" : disponible ? "[Jugar]" : "[Bloq]"
    print(`${marca} Enemigo ${i + 1}`, 20, y, color, false, 1, true)
    print(icono, 176, y, ganado ? VERDE : disponible ? NARANJA : GRIS_OSCURO, false, 1, true)
  }
  ayuda("ARRIBA/ABAJO: mover   Z: entrar   X: título")
}

function dibujarSeleccion() {
  marcoTitulo("ELIGE TU EQUIPO 3v3")

  // Catálogo en rejilla 5x2 (10 aves). Cada celda = sprite + nombre + tipo.
  const COLUMNAS = 5
  const CELDA_W = 44
  const CELDA_H = 30
  const RENGLONES = Math.ceil(CATALOGO_AVES.length / COLUMNAS)
  const gridX = 6
  const gridY = 20
  CATALOGO_AVES.forEach((ficha, i) => {
    const col = i % COLUMNAS
    const fila = Math.floor(i / COLUMNAS)
    const x = gridX + col * CELDA_W
    const y = gridY + fila * CELDA_H
    const resaltada = i === juego.cursorAve
    const enEquipo = juego.seleccion.elegidas.includes(ficha.id)
    rect(x, y, CELDA_W - 2, CELDA_H - 2, resaltada ? AZUL : enEquipo ? VERDE : GRIS_OSCURO)
        if (resaltada) rectb(x, y, CELDA_W - 2, CELDA_H - 2, BLANCO)
    // Sprite del ave (32x32). La escala debe ser entero: se dibuja a escala 1
    // centrado horizontalmente en la celda; el sobrante vertical se solapa con
    // el texto de abajo (la celda mide 30 px de alto y el sprite 32).
    const sprId = SPRITE_POR_AVE[ficha.id]
    if (sprId !== undefined) {
      spr(sprId, x + 6, y - 1, SPRITE_COLORKEY, 1, 0, 0, SPRITE_ANCHO_TILES, SPRITE_ALTO_TILES)
    } else {
      print("?", x + 14, y + 4, GRIS, false, 1, true)
    }
        const color = resaltada || enEquipo ? BLANCO : GRIS
    print(recortarTexto(ascii(ficha.nombre), 7), x + 1, y + 17, color, false, 1, true)
    print(recortarTexto(ascii(NOMBRE_TIPO[ficha.tipo]), 7), x + 1, y + 23, resaltada ? BLANCO : GRIS_OSCURO, false, 1, true)
    if (enEquipo) print("*", x + CELDA_W - 7, y + 1, VERDE, false, 1, true)
  })

  // Panel de detalle del ave resaltada.
  const ficha = CATALOGO_AVES[juego.cursorAve]
  const detY = gridY + RENGLONES * CELDA_H + 2
    panel(6, detY, 228, 16)
  print(`${ascii(ficha.nombre)} - ${NOMBRE_TIPO[ficha.tipo]}`, 10, detY + 4, NARANJA, false, 1, true)
  const movs = ficha.movimientos.map((m) => recortarTexto(ascii(m.nombre), 12)).join(", ")
  print(recortarTexto(movs, 36), 10, detY + 9, GRIS, false, 1, true)

  // Slots del equipo elegido (3) con orden.
  const elegidas = fichasElegidas(CATALOGO_AVES, juego.seleccion)
  const slotsY = detY + 20
  print(`Equipo ${elegidas.length}/${TAMANO_EQUIPO}:`, 6, slotsY, elegidas.length === TAMANO_EQUIPO ? VERDE : NARANJA, false, 1, true)
  for (let i = 0; i < TAMANO_EQUIPO; i++) {
    const x = 92 + i * 46
    const fichaSlot = elegidas[i]
    rect(x, slotsY - 1, 44, 9, fichaSlot ? VERDE : GRIS_OSCURO)

    const texto = fichaSlot ? `${i + 1}.${recortarTexto(ascii(fichaSlot.nombre), 5)}` : `${i + 1}. -`
    print(texto, x + 2, slotsY, fichaSlot ? NEGRO : GRIS, false, 1, true)
  }

  // Pie de ayuda.
  const completo = puedeConfirmarEquipo(juego)
  ayuda(completo ? "Z: elegir/quitar  ESPACIO: confirmar  X: volver" : "Z: elegir/quitar  IZQ/DER/FILA: mover  X: volver")
}

// ---------- Dibujo de batalla (diseño portado de la rama ui) ----------

// Fondo de escena: franja superior real del PNG de escenario + cielo/suelo
// procedurales. Sin banks (versión gratuita) solo cabe una franja (240x32) por
// fondo en la spritesheet, así que se usa el tercio superior del arte (cielo y
// montañas, y=0..31) y el resto se completa con primitivas. Alterna por bot.
function dibujarFondoBatalla() {
  cls(C.cielo)
    // Fondo real: cada franja (240x32 = 30 tiles) se guarda en 2 bloques de 15
  // tiles (120 px cada uno) porque una fila de la hoja solo tiene 16 tiles.
  // Se dibuja con dos spr de 15x4 tiles: bloque A en x=0, bloque B en x=120.
  const escenario = juegosEscenario()
  const bloques = FONDOS_TILES[escenario % FONDOS_TILES.length]
  spr(bloques[0], 0, 0, 0, 1, 0, 0, FONDO_BLOQUE_TILES, FONDO_ALTO_TILES)
  spr(bloques[1], 120, 0, 0, 1, 0, 0, FONDO_BLOQUE_TILES, FONDO_ALTO_TILES)

  // Resto de la escena con primitivas, debajo de la franja.
  const base = FONDO_ALTO_TILES * 8
  rect(0, 80, 240, 56, C.verde)
  line(0, base, 239, base, BLANCO)
  line(0, 80, 239, 80, BLANCO)
}

// Escenario usado en el combate actual (alterna por bot; 0 si no hay torre).
function juegosEscenario(): number {
  return juego.botActual ?? 0
}

// Aves: usa sprite 32x32 si la especie tiene arte; si no, dibuja con primitivas.
// lado: 'cpu' arriba-derecha | 'jugador' abajo-izquierda.
function dibujarAve(lado: 'cpu' | 'jugador', id: string, tipo: TipoPPTLS) {
  const esCpu = lado === 'cpu'
  const bx = esCpu ? 173 : 58
  const by = esCpu ? 45 : 67
    const sprite = SPRITE_POR_AVE[id]
  if (sprite !== undefined) {
    // spr(id, x, y, colorkey, scale, flip, rotate, w, h): composite 4x4 tiles.
    // colorkey=0 transparenta el indice 0 (fondo de la hoja). CPU con flip h.
    const sx = bx - 16
    const sy = by - 16
    spr(sprite, sx, sy, SPRITE_COLORKEY, SPRITE_ESCALA, esCpu ? 1 : 0, 0, SPRITE_ANCHO_TILES, SPRITE_ALTO_TILES)
    return
  }
  const cuerpo = esCpu ? GRIS : ROJO
  elli(bx, by, 15, 11, NEGRO)
  elli(bx + 6, by + 1, 9, 10, cuerpo)
  circ(bx + 14, by - 9, 6, NEGRO)
  tri(bx + 20, by - 9, bx + 30, by - 6, bx + 20, by - 3, NARANJA)
  pix(bx + 16, by - 10, BLANCO)
  pix(bx - 2, by + 3, colorTipo(tipo))
}

function colorTipo(tipo: TipoPPTLS): number {
  switch (tipo) {
    case 'piedra':
      return GRIS
    case 'papel':
      return BLANCO
    case 'tijera':
      return ROJO
    case 'lagarto':
      return VERDE
    case 'spock':
      return AZUL
  }
}

// Barra de HP con color dinámico según el porcentaje (diseño ui).
function barraHP(x: number, y: number, hp: number, max: number) {
  const ancho = 76
  rect(x, y, ancho, 6, GRIS_OSCURO)
  const relleno = max > 0 ? Math.max(0, Math.floor((ancho * hp) / max)) : 0
  const pct = max > 0 ? (hp / max) * 100 : 0
  const color = pct > 50 ? VERDE : pct > 20 ? NARANJA : ROJO
  if (relleno > 0) rect(x, y, relleno, 6, color)
  rectb(x, y, ancho, 6, BLANCO)
}

// Panel con borde.
function panel(x: number, y: number, w: number, h: number) {
  rect(x, y, w, h, C.panel)
  rectb(x, y, w, h, BLANCO)
}

function dibujarBatalla() {
  const estado = juego.estado
  if (!estado) return
  const cpu = aveActiva(estado.cpu)
  const jugador = aveActiva(estado.jugador)

    dibujarFondoBatalla()
  dibujarAve('cpu', cpu.id, cpu.tipo)
  dibujarAve('jugador', jugador.id, jugador.tipo)

  // Panel de estado del CPU (arriba-izquierda)


    panel(4, 6, 116, 31)
  print(ascii(cpu.nombre.toUpperCase()), 8, 10, BLANCO, false, 1, true)
  print('HP', 8, 22, NARANJA, false, 1, true)
  barraHP(24, 21, cpu.hpActual, cpu.hpMax)
  dibujarEquipo(estado.cpu, 8, 30)
    panel(120, 56, 116, 30)
  print(ascii(jugador.nombre.toUpperCase()), 124, 60, BLANCO, false, 1, true)
  print('HP', 124, 70, NARANJA, false, 1, true)
  barraHP(140, 69, jugador.hpActual, jugador.hpMax)
  print(`MP ${jugador.mpActual}/${jugador.mpMax}`, 178, 77, BLANCO, false, 1, true)
  dibujarEquipo(estado.jugador, 124, 79)

  // Mensaje (abajo-izquierda)
  panel(3, 96, 116, 37)
  imprimirEnvuelto(juego.mensaje || 'Elige un movimiento', 101, BLANCO, 3)
  if (juego.eventos.length > 0) {
    imprimirEnvuelto(juego.eventos[0], 120, GRIS, 1)
  }

  // Menú de movimientos 2x2 (abajo-derecha)
  panel(121, 96, 116, 37)
  dibujarMovimientos(jugador)

  print('ARR/ABJ/IZQ/DER: mover  Z: usar  X: rendirse', 6, 132, GRIS, false, 1, true)
}

// Indicadores del equipo: 3 marcas, la activa resaltada; caídas/rrendidas en gris.
function dibujarEquipo(equipo: Equipo, x: number, y: number) {
  equipo.aves.forEach((ave, i) => {
    const activa = i === equipo.indiceActiva && ave.estado === 'activa'
    const fuera = ave.estado !== 'activa'
    const color = fuera ? GRIS_OSCURO : activa ? NARANJA : GRIS
    const marca = activa ? '*' : fuera ? 'x' : '.'
    print(marca, x + i * 6, y, color, false, 1, true)
  })
}

// Menú de 4 movimientos en cuadrícula 2x2 con recuadro del seleccionado.
function dibujarMovimientos(ave: AveCombate) {
  const activos = ave.movimientos.slice(0, 4)
  activos.forEach((mov, i) => {
    const x = 125 + (i % 2) * 56
    const y = 100 + Math.floor(i / 2) * 15
    const bloqueado = mov.costeMp > ave.mpActual
    const seleccionado = i === juego.cursorMov
    rect(x - 2, y - 2, 54, 13, seleccionado ? NARANJA : GRIS)
    rect(x - 1, y - 1, 52, 11, bloqueado ? GRIS_OSCURO : C.panel)
        const color = bloqueado ? GRIS : BLANCO
    // Icono de coste a la derecha; nombre a la izquierda con espacio para 8 chars
    // (la celda útil son 54 px -> 9 chars, se deja 1 de holgura).
    print(recortarTexto(ascii(mov.nombre), 8), x, y, color, false, 1, true)
    print(`${mov.costeMp}`, x + 44, y, bloqueado ? ROJO : NARANJA, false, 1, true)
  })
}

function dibujarRevelacion() {
  const estado = juego.estado
  const movJugador = juego.movJugador
  const movCpu = juego.movCpu
  if (!estado || !movJugador || !movCpu) return
  const cpu = aveActiva(estado.cpu)
  const jugador = aveActiva(estado.jugador)


    marcoTitulo("REVELACION")

  // Elección de la CPU (panel superior)
  panel(6, 22, 228, 26)
  print(`CPU (${ascii(cpu.nombre)}):`, 10, 26, ROJO, false, 1, true)
  print(recortarTexto(ascii(movCpu.nombre), 18), 10, 36, BLANCO, false, 1, true)
  print(NOMBRE_TIPO[movCpu.tipo], 180, 36, GRIS, false, 1, true)

  // Elección del jugador (panel inferior)
  panel(6, 52, 228, 26)
  print(`Tu (${ascii(jugador.nombre)}):`, 10, 56, VERDE, false, 1, true)
  print(recortarTexto(ascii(movJugador.nombre), 18), 10, 66, BLANCO, false, 1, true)
  print(NOMBRE_TIPO[movJugador.tipo], 180, 66, GRIS, false, 1, true)

  const entrada = juego.entradaTurno
  if (!entrada) {
    // Antes de resolver: solo las elecciones.
    imprimirCentrado(`${NOMBRE_TIPO[movJugador.tipo]} vs ${NOMBRE_TIPO[movCpu.tipo]}`, 86, NARANJA)
    ayuda("Z: resolver turno", 122)
    return
  }

  // Después de resolver: daño de cada ave y mensaje del turno.


    print(`Dano a ${ascii(cpu.nombre)}: -${entrada.danoAlCpu} HP`, 10, 86, VERDE, false, 1, true)
  print(`Dano a ${ascii(jugador.nombre)}: -${entrada.danoAlJugador} HP`, 10, 96, ROJO, false, 1, true)
  imprimirEnvuelto(juego.mensaje, 108, NARANJA, 2)
  ayuda("Z: continuar", 128)
}

function dibujarResultado() {
  const texto =
    juego.resultado === "jugador"
      ? "GANASTE"
      : juego.resultado === "cpu"
        ? "PERDISTE"
        : "EMPATE TECNICO"
  const color = juego.resultado === "jugador" ? VERDE : juego.resultado === "cpu" ? ROJO : NARANJA
  imprimirCentrado(texto, 44, color, 2)
  imprimirEnvuelto(juego.mensaje, 78, BLANCO, 3)
  ayuda("Z: jugar de nuevo   X: titulo", 124)
}

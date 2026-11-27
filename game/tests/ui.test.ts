import { describe, expect, it } from 'vitest'
import { envolverTexto, recortarTexto } from '../src/juego/ui/texto'
import {
  ANCHO_PANTALLA,
  ANCHO_UTIL,
  MARGEN,
  caracteresPorLinea,
} from '../src/juego/ui/layout'

describe('layout (game/src/juego/ui/layout.ts)', () => {
  it('la pantalla de TIC-80 mide 240 x 136', () => {
    expect(ANCHO_PANTALLA).toBe(240)
  })

  it('el ancho útil respeta los márgenes', () => {
    expect(ANCHO_UTIL).toBe(ANCHO_PANTALLA - MARGEN * 2)
  })

  it('caracteres por línea con fuente normal (240 - 16) / 6', () => {
    expect(caracteresPorLinea(1)).toBe(Math.floor((240 - 16) / 6))
  })
})

describe('envolverTexto (game/src/juego/ui/texto.ts)', () => {
  it('deja en una línea un texto que cabe', () => {
    expect(envolverTexto('Hola', 240)).toEqual(['Hola'])
  })

  it('parte por palabras y no excede el ancho en píxeles', () => {
    // 240 px / 6 = 40 caracteres por línea.
    const texto = 'El rápido murciélago hindú comía feliz cardillo y kiwi'
    const lineas = envolverTexto(texto, 240)
    for (const linea of lineas) {
      expect(linea.length * 6).toBeLessThanOrEqual(240)
    }
    // Reconstruye el texto original respetando los espacios entre líneas.
    expect(lineas.join(' ')).toBe(texto)
  })

  it('respeta la escala de la fuente', () => {
    const texto = 'uno dos tres cuatro cinco seis siete'
    const normal = envolverTexto(texto, 240, 6, 1)
    const doble = envolverTexto(texto, 240, 6, 2)
    expect(doble.length).toBeGreaterThanOrEqual(normal.length)
    for (const linea of doble) {
      // Escala 2: cada carácter ocupa 12 px.
      expect(linea.length * 12).toBeLessThanOrEqual(240)
    }
  })

  it('no parte palabras aunque sean más largas que el ancho', () => {
    const largo = 'x'.repeat(60)
    const lineas = envolverTexto(`a ${largo} b`, 240)
    expect(lineas).toContain(largo)
  })

  it('devuelve una línea vacía con texto vacío', () => {
    expect(envolverTexto('   ', 240)).toEqual([''])
  })

  it('respeta la fuente pequeña (4 px)', () => {
    const lineas = envolverTexto('uno dos tres cuatro cinco', 240, 4, 1)
    for (const linea of lineas) {
      expect(linea.length * 4).toBeLessThanOrEqual(240)
    }
  })
})

describe('recortarTexto (game/src/juego/ui/texto.ts)', () => {
  it('no recorta un texto que cabe', () => {
    expect(recortarTexto('Cóndor', 10)).toBe('Cóndor')
  })

  it('recorta con «…» al exceder el máximo', () => {
    expect(recortarTexto('Pingüino de Humboldt', 8)).toBe('Pingüin…')
    expect(recortarTexto('Pingüino de Humboldt', 8).length).toBe(8)
  })

  it('maneja máximos triviales', () => {
    expect(recortarTexto('Hola', 0)).toBe('')
    expect(recortarTexto('Hola', 1)).toBe('…')
  })
})

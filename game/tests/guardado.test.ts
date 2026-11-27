import { describe, expect, it } from 'vitest'
import {
  almacenEnMemoria,
  borrarGuardado,
  guardarProgreso,
  hayGuardado,
  leerProgreso,
  progresoVacio,
  registrarVictoria,
  TOTAL_BOTS,
} from '../src/juego/guardado'

describe('guardado local (game/src/juego/guardado.ts)', () => {
  it('un almacén vacío no tiene guardado', () => {
    const almacen = almacenEnMemoria()
    expect(hayGuardado(almacen)).toBe(false)
    expect(leerProgreso(almacen)).toBeNull()
  })

  it('guardar y leer el progreso devuelve lo mismo', () => {
    const almacen = almacenEnMemoria()
    const progreso = {
      combatesGanados: [0, 2],
      avesDesbloqueadas: [3, 4, 5],
      avesVistas: [0, 3, 9],
      silenciado: true,
    }
    guardarProgreso(almacen, progreso)
    expect(hayGuardado(almacen)).toBe(true)
    const leido = leerProgreso(almacen)
    expect(leido).not.toBeNull()
    expect(leido!.combatesGanados).toEqual([0, 2])
    expect(leido!.avesDesbloqueadas).toEqual([3, 4, 5])
    expect(leido!.avesVistas).toEqual([0, 3, 9])
    expect(leido!.silenciado).toBe(true)
  })

  it('el progreso vacío sobrevive un ciclo de guardado', () => {
    const almacen = almacenEnMemoria()
    guardarProgreso(almacen, progresoVacio())
    expect(leerProgreso(almacen)).toEqual(progresoVacio())
  })

  it('borrar el guardado lo deja inexistente', () => {
    const almacen = almacenEnMemoria()
    guardarProgreso(almacen, { ...progresoVacio(), combatesGanados: [1] })
    borrarGuardado(almacen)
    expect(hayGuardado(almacen)).toBe(false)
    expect(leerProgreso(almacen)).toBeNull()
  })

  it('un guardado con versión distinta se rechaza', () => {
    const almacen = almacenEnMemoria({ 0: 0xa5, 1: 99 })
    expect(hayGuardado(almacen)).toBe(false)
    expect(leerProgreso(almacen)).toBeNull()
  })

  it('un guardado dañado (sin mágico) se rechaza', () => {
    const almacen = almacenEnMemoria({ 0: 0x00, 1: 1 })
    expect(leerProgreso(almacen)).toBeNull()
  })

  it('ignora índices fuera de rango al guardar', () => {
    const almacen = almacenEnMemoria()
    guardarProgreso(almacen, {
      combatesGanados: [7],
      avesDesbloqueadas: [9],
      avesVistas: [],
      silenciado: false,
    })
    const leido = leerProgreso(almacen)!
    expect(leido.combatesGanados).toEqual([7])
    expect(leido.avesDesbloqueadas).toEqual([9])
  })
})

describe('registrarVictoria (game/src/juego/guardado.ts)', () => {
  it('añade el bot vencido al progreso', () => {
    const p = registrarVictoria(progresoVacio(), 0)
    expect(p.combatesGanados).toEqual([0])
  })

  it('es idempotente: no duplica un bot ya vencido', () => {
    const p = registrarVictoria(progresoVacio(), 2)
    const otra = registrarVictoria(p, 2)
    expect(otra.combatesGanados).toEqual([2])
    expect(otra).toBe(p) // devuelve el mismo objeto si no cambia
  })

  it('mantiene la lista ordenada por índice de bot', () => {
    let p = progresoVacio()
    p = registrarVictoria(p, 3)
    p = registrarVictoria(p, 1)
    p = registrarVictoria(p, 2)
    expect(p.combatesGanados).toEqual([1, 2, 3])
  })

  it('no muta el progreso original', () => {
    const original = progresoVacio()
    registrarVictoria(original, 0)
    expect(original.combatesGanados).toEqual([])
  })

  it('ignora índices fuera de rango', () => {
    const p = progresoVacio()
    expect(registrarVictoria(p, -1)).toBe(p)
    expect(registrarVictoria(p, TOTAL_BOTS)).toBe(p)
  })

  it('conserva el resto del progreso', () => {
    const base = { ...progresoVacio(), avesDesbloqueadas: [1, 2], silenciado: true }
    const p = registrarVictoria(base, 0)
    expect(p.avesDesbloqueadas).toEqual([1, 2])
    expect(p.silenciado).toBe(true)
  })
})

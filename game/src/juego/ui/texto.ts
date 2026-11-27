/**
 * Utilidades de texto para la interfaz (TIC-80, 240 x 136).
 *
 * En TIC-80 el ancho de un carácter de la fuente del sistema es de 6 px
 * (smallfont) o 4 px. Para evitar textos que se corten en el borde de 240 px
 * (deuda detectada en el plan §4.4), se divide el texto en líneas por palabras
 * según un ancho máximo en píxeles.
 *
 * Módulo puro: no usa la API de TIC-80, para poder probarse con vitest.
 */

/** Ancho de un carácter de la fuente normal de print(), en píxeles. */
export const ANCHO_CARACTER_NORMAL = 6

/** Ancho de un carácter de la fuente pequeña (smallfont), en píxeles. */
export const ANCHO_CARACTER_PEQUENA = 4

/**
 * Parte un texto en líneas que caben en `anchoMax` píxeles, sin partir
 * palabras. Las palabras más largas que el ancho máximo se dejan enteras en su
 * propia línea (no se pueden dividir sin guiones).
 *
 * @param texto texto a dividir.
 * @param anchoMax ancho máximo en píxeles.
 * @param anchoCaracter ancho de un carácter en píxeles (6 normal, 4 pequeña).
 * @param escala factor de escala de la fuente.
 * @returns lista de líneas.
 */
export function envolverTexto(
  texto: string,
  anchoMax: number,
  anchoCaracter = ANCHO_CARACTER_NORMAL,
  escala = 1,
): string[] {
  const porCaracter = anchoCaracter * escala
  if (porCaracter <= 0) return [texto]

  const maxCaracteres = Math.floor(anchoMax / porCaracter)
  if (maxCaracteres <= 0) return [texto]

  const palabras = texto.split(/\s+/).filter((p) => p.length > 0)
  if (palabras.length === 0) return ['']

  const lineas: string[] = []
  let actual = ''
  for (const palabra of palabras) {
    const candidata = actual.length === 0 ? palabra : `${actual} ${palabra}`
    if (candidata.length <= maxCaracteres || actual.length === 0) {
      actual = candidata
    } else {
      lineas.push(actual)
      actual = palabra
    }
  }
  if (actual.length > 0) lineas.push(actual)
  return lineas
}

/**
 * Recorta un texto a un máximo de caracteres, añadiendo «…» si se corta.
 * Útil para nombres que deben caber en una celda fija.
 *
 * @param texto texto a recortar.
 * @param maxCaracteres máximo de caracteres incluyendo el «…».
 */
export function recortarTexto(texto: string, maxCaracteres: number): string {
  if (maxCaracteres <= 0) return ''
  if (texto.length <= maxCaracteres) return texto
  if (maxCaracteres === 1) return '…'
  return texto.slice(0, maxCaracteres - 1) + '…'
}

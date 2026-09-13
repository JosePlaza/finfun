import { formatCents, formatPct } from './money'
import type { DiaryEntry } from './types'

/** Texto del diario de Doña Tortuga para un cierre de año. Frases cortas, sin juicio. */
export function diaryParagraphs(e: DiaryEntry): string[] {
  const out: string[] = []
  const inf = formatPct(e.inflationBps)
  const before = formatCents(e.example.beforeCents)
  const after = formatCents(e.example.afterCents)

  if (e.firstTime) {
    out.push(
      `Ven, mira la ${e.example.name.toLowerCase()} de la tienda. Ayer costaba ${before} y hoy cuesta ${after}. ` +
        `Tú tienes los mismos euroLukys que ayer, pero compras un poco menos con ellos.`,
    )
    out.push(
      `Eso se llama inflación. Casi todos los años los precios suben un poco, este año un ${inf}. ` +
        `Por eso el dinero que se queda quieto en la hucha compra cada vez menos.`,
    )
  } else {
    out.push(`Inflación de este año: ${inf}. La ${e.example.name.toLowerCase()} pasa de ${before} a ${after}.`)
  }

  if (e.huchaCents > 0) {
    const diff = e.bankIfAllCents - e.huchaCents
    if (diff > 0) {
      out.push(
        `Terminas el año con ${formatCents(e.huchaCents)} guardados sin colocar, entre la hucha y el buzón. ` +
          `Si ese dinero hubiera estado todo el año en el banco, ahora tendrías ${formatCents(e.bankIfAllCents)}: ` +
          `${formatCents(diff)} más por no hacer nada.`,
      )
    }
  }

  if (e.bankInterestYearCents > 0) {
    out.push(`El banco te ha dado ${formatCents(e.bankInterestYearCents)} este año solo por guardar tu dinero allí.`)
  }

  if (e.spentYearCents > 0) {
    out.push(`Has gastado ${formatCents(e.spentYearCents)} en la tienda. Gastar también está bien: para eso es el dinero.`)
  }

  if (e.earnedTasksYearCents > 0) {
    out.push(`Con las bellotas has ganado ${formatCents(e.earnedTasksYearCents)}. El trabajo también cuenta.`)
  }

  out.push('Espera y verás.')
  return out
}

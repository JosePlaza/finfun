/** Redondeo "a la mitad hacia arriba" para céntimos, estable entre plataformas. */
export function roundCents(x: number): number {
  return Math.floor(x + 0.5)
}

/** Aplica puntos básicos a una cantidad en céntimos. */
export function applyBps(cents: number, bps: number): number {
  return roundCents((cents * bps) / 10_000)
}

/** Formatea céntimos como texto en español: 30 → "30", 3041 → "30,41". */
export function formatCents(cents: number, opts: { alwaysDecimals?: boolean } = {}): string {
  const negative = cents < 0
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const frac = abs % 100
  const wholeText = whole.toLocaleString('es-ES')
  const text = frac === 0 && !opts.alwaysDecimals ? wholeText : `${wholeText},${String(frac).padStart(2, '0')}`
  return negative ? `−${text}` : text
}

export function formatPct(bps: number): string {
  return `${(bps / 100).toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`
}

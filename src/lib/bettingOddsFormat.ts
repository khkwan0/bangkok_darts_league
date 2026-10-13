export type BettingOddsFormat = 'european' | 'american'

/** Decimal (European) odds → American moneyline string. */
export function decimalToAmerican(decimal: number): string {
  const d = Number(decimal)
  if (!Number.isFinite(d) || d <= 1) return '—'
  if (d >= 2) {
    const plus = Math.round((d - 1) * 100)
    return `+${plus}`
  }
  const minus = Math.round(-100 / (d - 1))
  return String(minus)
}

export function formatBettingOdds(
  decimal: number,
  format: BettingOddsFormat = 'european',
): string {
  const d = Number(decimal)
  if (!Number.isFinite(d) || d <= 1) return '—'
  if (format === 'american') return decimalToAmerican(d)
  return d.toFixed(2)
}

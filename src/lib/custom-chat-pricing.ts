export function formatMilliyuanAmount(amount: number | undefined, symbol = '¥'): string {
  if (!amount || !Number.isFinite(amount) || amount <= 0) return ''
  const yuan = amount / 1000
  if (yuan < 1) return `${symbol}${(Math.round(yuan * 10) / 10).toFixed(1)}`
  const rounded = Math.round(yuan * 10) / 10
  return Number.isInteger(rounded) ? `${symbol}${rounded}` : `${symbol}${rounded.toFixed(1)}`
}

export function formatMilliyuanBadgeAmount(amount: number | undefined): string {
  const formatted = formatMilliyuanAmount(amount, '')
  return formatted ? `${formatted}元` : ''
}

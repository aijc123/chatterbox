export interface TrendEvent {
  text: string
  ts: number
  uid?: string | null
}

interface TrendCandidate {
  text: string
  totalCount: number
  uniqueUsers: number
}

export interface TrendResult {
  shouldSend: boolean
  text: string | null
  candidates: TrendCandidate[]
}

export function detectTrend(events: TrendEvent[], windowMs: number, threshold: number): TrendResult {
  const now = events.reduce((latest, event) => Math.max(latest, event.ts), 0)
  const windowStart = now - Math.max(0, windowMs)
  const entries = new Map<string, { totalCount: number; uids: Set<string> }>()

  for (const event of events) {
    const text = event.text.trim()
    if (!text || event.ts < windowStart) continue

    let entry = entries.get(text)
    if (!entry) {
      entry = { totalCount: 0, uids: new Set() }
      entries.set(text, entry)
    }
    entry.totalCount += 1
    if (event.uid) entry.uids.add(event.uid)
  }

  const candidates = Array.from(entries, ([text, entry]) => ({
    text,
    totalCount: entry.totalCount,
    uniqueUsers: entry.uids.size,
  })).sort((a, b) => b.totalCount - a.totalCount)

  const winner = candidates.find(candidate => candidate.totalCount >= threshold) ?? null
  return {
    shouldSend: winner !== null,
    text: winner?.text ?? null,
    candidates,
  }
}

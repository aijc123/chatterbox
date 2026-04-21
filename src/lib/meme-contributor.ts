import { appendLog } from './log'
import {
  enableMemeContribution,
  memeContributorCandidates,
  memeContributorSeenTexts,
} from './store'

const MAX_PER_HOUR = 5
const MAX_CANDIDATES = 15
const MAX_SEEN = 200

const nominationTimestamps: number[] = []

function passesQualityFilter(text: string): boolean {
  const len = text.length
  if (len < 4 || len > 30) return false
  if (/^\d+$/.test(text)) return false
  // All characters identical (e.g. 哈哈哈哈哈, hhhh)
  if ([...text].every(c => c === text[0])) return false
  // Pure punctuation / symbols / whitespace
  if (/^[\p{P}\p{S}\s]+$/u.test(text)) return false
  return true
}

export function tryNominateMeme(text: string, triggerCount: number, durationMs: number): void {
  if (!enableMemeContribution.value) return
  if (triggerCount < 5) return
  if (durationMs < 120_000) return
  if (!passesQualityFilter(text)) return
  if (memeContributorSeenTexts.value.includes(text)) return
  if (memeContributorCandidates.value.includes(text)) return

  // Hourly rate limit
  const now = Date.now()
  const oneHourAgo = now - 3_600_000
  const recentCount = nominationTimestamps.filter(t => t >= oneHourAgo).length
  if (recentCount >= MAX_PER_HOUR) return

  // Add to candidates (drop oldest if over limit)
  const candidates = [...memeContributorCandidates.value, text]
  memeContributorCandidates.value = candidates.length > MAX_CANDIDATES ? candidates.slice(-MAX_CANDIDATES) : candidates

  // Track seen texts to avoid re-nominating
  const seen = [...memeContributorSeenTexts.value, text]
  memeContributorSeenTexts.value = seen.length > MAX_SEEN ? seen.slice(-MAX_SEEN) : seen

  nominationTimestamps.push(now)

  appendLog(`[贡献者] 检测到高质量烂梗 "${text}"，已加入待贡献池`)
}

export function ignoreMemeCandidate(text: string): void {
  memeContributorCandidates.value = memeContributorCandidates.value.filter(c => c !== text)

  // Mark as seen so it won't be re-nominated
  if (!memeContributorSeenTexts.value.includes(text)) {
    const seen = [...memeContributorSeenTexts.value, text]
    memeContributorSeenTexts.value = seen.length > MAX_SEEN ? seen.slice(-MAX_SEEN) : seen
  }
}

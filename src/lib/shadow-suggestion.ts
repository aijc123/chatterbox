/**
 * Heuristic rewrite candidates for messages that look shadow-banned.
 *
 * When `verifyBroadcast` detects an API-success-but-no-broadcast situation,
 * we surface a small set of bypass variants the user can copy or click into
 * their input box. This is intentionally "suggest, don't send" — the user
 * stays in control. (Auto-resend is opt-in via `shadowBanMode = 'auto-resend'`.)
 *
 * Strategies:
 *   - `invisible` — splice U+00AD (soft hyphen) between graphemes. Same trick
 *     `processText` uses; visually identical, breaks naive regex matchers.
 *   - `kou` — splice the literal character `口` between graphemes. Heavier
 *     visual change but reliably breaks B站 keyword filters that rely on
 *     contiguous substring match.
 *   - `space` — splice a full-width space `　` between graphemes. Visible but
 *     subtle; works the same way as `kou`.
 *   - `ai` — Laplace-detected sensitive words rewritten with U+00AD. Only
 *     produced when the user has the AI evasion toggle on (each suggestion
 *     costs one Laplace call). Returned out-of-band by `requestAiSuggestion`
 *     in `ai-evasion.ts`.
 *
 * The generators are all pure / synchronous; the AI variant is async and
 * lives in `ai-evasion.ts` so this module stays free of network I/O.
 */

import { processText } from './ai-evasion'
import { getGraphemes } from './utils'

type ShadowBypassStrategy = 'invisible' | 'kou' | 'space' | 'ai'

export interface ShadowBypassCandidate {
  /** Strategy id — stable, used for dedup and telemetry. */
  strategy: ShadowBypassStrategy
  /** Short human label shown in the log / UI (Chinese). */
  label: string
  /** The rewritten text. May equal `text` only for trivial inputs. */
  text: string
}

const KOU_SEPARATOR = '口'
const FULLWIDTH_SPACE = '　'

function joinWith(text: string, separator: string): string {
  const graphemes = getGraphemes(text)
  return graphemes.join(separator)
}

/**
 * Returns the local (no-network) rewrite candidates for `text`.
 *
 * Candidates are filtered to drop variants that didn't actually change the
 * input (e.g. one-character text where joining produces no separator) so the
 * UI never shows duplicates.
 */
export function generateHeuristicCandidates(text: string): ShadowBypassCandidate[] {
  const trimmed = text.trim()
  if (!trimmed) return []
  const candidates: ShadowBypassCandidate[] = [
    { strategy: 'invisible', label: '隐形字符', text: processText(trimmed) },
    { strategy: 'kou', label: '口分隔', text: joinWith(trimmed, KOU_SEPARATOR) },
    { strategy: 'space', label: '全角空格', text: joinWith(trimmed, FULLWIDTH_SPACE) },
  ]
  // Drop no-ops: short inputs where joining produced the original text.
  const seen = new Set<string>([trimmed])
  return candidates.filter(c => {
    if (c.text === trimmed) return false
    if (seen.has(c.text)) return false
    seen.add(c.text)
    return true
  })
}

/**
 * Format a candidate list as a single readable log line.
 *
 * Returns null when there are no candidates (caller should skip logging).
 */
export function formatCandidatesForLog(candidates: ShadowBypassCandidate[]): string | null {
  if (candidates.length === 0) return null
  const lines = candidates.map(c => `   • ${c.label}: ${c.text}`)
  return ['🛠 改写候选（不自动发送，可复制粘贴）：', ...lines].join('\n')
}

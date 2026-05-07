/**
 * Optional cross-room heat boost for auto-follow.
 *
 * Boost-only / passive: emits a single confirmation log when radar reports the
 * same meme is trending in other rooms, otherwise no-op. Never blocks, skips,
 * or alters the local send — this module exists separately from auto-blend.ts
 * so its tests can import it without dragging in the full auto-blend import
 * tree (live-ws, danmaku-stream, custom-chat-events, etc).
 */

import { logAutoBlend } from './auto-blend-events'
import { shortAutoBlendText } from './auto-blend-status'
import { queryClusterRank } from './radar-client'
import { radarConsultEnabled } from './store-radar'

/**
 * Consults the live-meme-radar cluster-rank endpoint when the user opted in.
 *
 * Behavior contract:
 *   - radarConsultEnabled === false → returns immediately, no network.
 *   - rank.isTrending === true → emits a positive confirmation log.
 *   - any other rank shape (matched but not trending, null, thrown) → no-op.
 *
 * Always resolves to void. The caller MUST treat the call as a passive side
 * effect: the local send proceeds regardless of what radar said. queryClusterRank
 * already swallows all errors and returns null; the try/catch is defense-in-depth.
 */
export async function consultRadarBoost(triggeredText: string): Promise<void> {
  if (!radarConsultEnabled.value) return
  try {
    const rank = await queryClusterRank(triggeredText)
    if (rank?.isTrending) {
      const rankLabel = rank.currentRankToday !== null ? `今日第 ${rank.currentRankToday} 位` : 'trending'
      logAutoBlend(
        `自动跟车：📡 radar 确认跨房间热度（簇 #${rank.clusterId}，${rankLabel}）：${shortAutoBlendText(triggeredText)}`
      )
    }
    // matched-but-not-trending / no match / network error / timeout → no-op.
    // Behavior must stay byte-identical to the radar-disabled path on every
    // negative branch.
  } catch {
    // Defense-in-depth fail-open.
  }
}

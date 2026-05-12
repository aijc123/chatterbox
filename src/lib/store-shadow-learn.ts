import type { ShadowBypassCandidate } from './shadow-suggestion'

import { gmSignal } from './gm-signal'

/** Whether to auto-promote AI-evaded sensitive words to local room rules. */
export const autoLearnShadowRules = gmSignal('autoLearnShadowRules', true)

/**
 * What `verifyBroadcast` should do when it detects a shadow-ban.
 *
 * - `'suggest'` (default): generate rewrite candidates and surface them in
 *   the log + observation panel. Do NOT send anything on the user's behalf.
 *   Recommended — the user explicitly asked for this behavior.
 * - `'auto-resend'`: when AI evasion is also enabled, automatically send the
 *   rewritten variant. Higher convenience but can surprise users when the
 *   resend itself gets shadow-banned.
 */
export type ShadowBanMode = 'suggest' | 'auto-resend'
export const shadowBanMode = gmSignal<ShadowBanMode>('shadowBanMode', 'suggest')

export interface ShadowObservation {
  /** Original sent text (post-replacement, pre-AI-evasion) — trimmed. */
  text: string
  /** Room where the shadow-ban happened. May be undefined if room id was not resolvable. */
  roomId?: number
  /** Last time this text was observed being shadow-banned. */
  ts: number
  /** How many times the same (text, roomId) has been observed. */
  count: number
  /** True when AI evasion already replaced sensitive words but the rewritten message ALSO failed to broadcast. */
  evadedAlready: boolean
  /**
   * Heuristic / AI rewrite candidates generated when this entry was first
   * recorded. Stored so the observation panel can surface a "复制" / "填入
   * 输入框" button without re-running the generator.
   */
  candidates?: ShadowBypassCandidate[]
}

/** Persisted list of shadow-banned messages that AI evasion couldn't (or didn't try to) save. */
export const shadowBanObservations = gmSignal<ShadowObservation[]>('shadowBanObservations', [])

/**
 * Keys (`${roomId}\x00${text}`) the user has explicitly dismissed via the
 * floating chip's × button. Persisted so reopening the panel doesn't bring
 * back a chip the user has already deliberately closed. Capped to the most
 * recent ~256 entries so a long-running session doesn't unboundedly grow.
 */
export const shadowChipDismissedKeys = gmSignal<string[]>('shadowChipDismissedKeys', [])

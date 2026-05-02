import { gmSignal } from './gm-signal'

/** Whether to auto-promote AI-evaded sensitive words to local room rules. */
export const autoLearnShadowRules = gmSignal('autoLearnShadowRules', true)

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
}

/** Persisted list of shadow-banned messages that AI evasion couldn't (or didn't try to) save. */
export const shadowBanObservations = gmSignal<ShadowObservation[]>('shadowBanObservations', [])

// Pure decision helpers for the 自动跟车 (auto-blend) on/off button.
//
// The UI also calls a confirm() prompt and writes signals; those side effects
// stay in the component. This module owns the predicate and a higher-level
// orchestrator that takes a confirm callback so the whole flow is testable
// without a DOM.

export interface AutoBlendToggleState {
  /** Whether auto-blend is currently enabled (i.e. the user is about to flip it). */
  currentlyEnabled: boolean
  /** Whether dry-run / 试运行 is currently on. */
  dryRun: boolean
  /** Whether the user has previously acknowledged the real-fire confirm at least once. */
  hasConfirmedRealFire: boolean
}

/**
 * Returns true when flipping the toggle would *start* real-fire auto-blend
 * for the first time and we should show a confirm prompt before proceeding.
 *
 * The conditions that all must hold:
 *  - The user is enabling (current state is off).
 *  - Dry-run is off, so this would actually send danmaku.
 *  - The user has never accepted the real-fire confirm before.
 */
export function shouldRequireAutoBlendRealFireConfirm(state: AutoBlendToggleState): boolean {
  return !state.currentlyEnabled && !state.dryRun && !state.hasConfirmedRealFire
}

export interface AutoBlendToggleDecision {
  /** Whether to actually flip the auto-blend signal. */
  proceed: boolean
  /** Whether to set hasConfirmedRealFire = true after this toggle. */
  markConfirmed: boolean
}

/**
 * Decide what to do when the user clicks the auto-blend toggle.
 * `onConfirm` is invoked at most once; it should return true if the user
 * accepted the confirm prompt, false if they cancelled.
 */
export function decideAutoBlendToggle(state: AutoBlendToggleState, onConfirm: () => boolean): AutoBlendToggleDecision {
  if (!shouldRequireAutoBlendRealFireConfirm(state)) {
    return { proceed: true, markConfirmed: false }
  }
  const accepted = onConfirm()
  if (!accepted) return { proceed: false, markConfirmed: false }
  return { proceed: true, markConfirmed: true }
}

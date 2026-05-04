/**
 * Pure helpers for the auto-send loop.
 *
 * Kept in a separate file so unit tests can import them without dragging in
 * the full `loop.ts` graph (which transitively loads api.ts, send-queue.ts,
 * wbi.ts, etc., and installs the WBI XHR hijack at module load).
 */

/**
 * Compute the per-iteration sleep in ms, with optional 0–500ms random
 * subtraction.
 *
 * Defensive against:
 * - non-finite or non-positive `intervalSec` (corrupted GM storage / bad
 *   backup): falls back to a 1s floor.
 * - jitter > base interval: clamped at 0 so `setTimeout` never receives a
 *   negative number (which would fire on the next tick instead of waiting,
 *   turning the loop into a tight spin at small intervals like 0.1s).
 */
export function computeJitteredSleepMs(intervalSec: number, withJitter: boolean): number {
  const safeInterval = Number.isFinite(intervalSec) && intervalSec > 0 ? intervalSec : 1
  const baseMs = safeInterval * 1000
  const jitterMs = withJitter ? Math.floor(Math.random() * 500) : 0
  return Math.max(0, baseMs - jitterMs)
}

// Pure helpers for the Bilibili LiveWS adapter. Lives in its own module
// (separate from `live-ws-source.ts`) so unit tests can import them without
// pulling in `live-ws-source`'s heavy import graph (which transitively loads
// `api.ts`, the WBI XHR hijack, etc.). That import graph fights with other
// test files' module-cache state on Linux's bun-test ordering.

// Use a NUL separator that can't appear in `uid` (digits) or chat `text`
// (Bilibili strips control chars). Avoids `${uid}:${text}` collisions like
// `uid="1", text="2:hi"` matching `uid="1:2", text="hi"`.
export const RECENT_DANMAKU_KEY_SEP = '\x00'

export function recentKey(text: string, uid: string | null): string {
  return `${uid ?? ''}${RECENT_DANMAKU_KEY_SEP}${text}`
}

/**
 * Parses the value of the DedeUserID cookie into a numeric Bilibili LiveWS
 * `uid` field. Bilibili expects a number. We fall back to anonymous (`0`) if:
 *  - the cookie is missing/empty
 *  - the value is not a finite integer
 *  - the value is negative
 *  - the value exceeds `Number.MAX_SAFE_INTEGER` (forward-compat against
 *    future UID growth — sending a precision-lost number would be silently
 *    wrong)
 */
export function parseAuthUid(uidCookie: string | null | undefined): number {
  if (!uidCookie) return 0
  const parsed = Number(uidCookie)
  if (!Number.isSafeInteger(parsed) || parsed < 0) return 0
  return parsed
}

const RECONNECT_BASE_MS = 3000
const RECONNECT_STEP_MS = 2000
const RECONNECT_CAP_MS = 30_000
const RECONNECT_JITTER_RATIO = 0.25

/**
 * Computes the next reconnect delay with capped linear backoff plus 0–25%
 * jitter. The jitter prevents multiple Chatterbox tabs from reconnecting in
 * lockstep against Bilibili's WS endpoints.
 */
export function computeReconnectDelay(attempt: number, random: () => number = Math.random): number {
  const baseDelay = Math.min(RECONNECT_CAP_MS, RECONNECT_BASE_MS + attempt * RECONNECT_STEP_MS)
  const jitter = Math.floor(random() * baseDelay * RECONNECT_JITTER_RATIO)
  return baseDelay + jitter
}

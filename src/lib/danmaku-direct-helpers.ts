/**
 * Pure helpers used by `danmaku-direct.ts`. Extracted into a side-effect-free
 * module so unit tests can exercise them without loading the full
 * `danmaku-direct` runtime (which subscribes to live WS events, mounts
 * DOM listeners, and pulls in store/log).
 */

import type { DanmakuEvent } from './danmaku-stream'

/**
 * Convert a `DanmakuEvent` into the text that the +1 / steal buttons would
 * actually send.
 *
 * - Non-reply events: send the danmaku text verbatim.
 * - Reply events with a known username: prepend `@uname ` so the recipient
 *   gets the reply context (matches Bilibili's own `@xxx` convention).
 * - Reply events without a username: return `null`. Sending only the reply
 *   body would lose the reply target and read as a non-sequitur in chat;
 *   the caller should skip the action.
 */
export function eventToSendableMessage(ev: Pick<DanmakuEvent, 'isReply' | 'text' | 'uname'>): string | null {
  if (!ev.isReply) return ev.text
  return ev.uname ? `@${ev.uname} ${ev.text}` : null
}

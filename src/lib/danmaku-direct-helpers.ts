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
 * - 大表情(`hasLargeEmote`): return `null`。`data-danmaku` 是显示名("应援"
 *   /"干杯"…),不是 emoticon_unique;+1 出去会变成纯文本"应援"两个字,
 *   而不是别人看到的图。让按钮直接不注入,避免一键发出乱码。
 * - Non-reply events: send the danmaku text verbatim.
 * - Reply events with a known username: prepend `@uname ` so the recipient
 *   gets the reply context (matches Bilibili's own `@xxx` convention).
 * - Reply events without a username: return `null`. Sending only the reply
 *   body would lose the reply target and read as a non-sequitur in chat;
 *   the caller should skip the action.
 */
export function eventToSendableMessage(
  ev: Pick<DanmakuEvent, 'isReply' | 'text' | 'uname' | 'hasLargeEmote'>
): string | null {
  if (ev.hasLargeEmote) return null
  if (!ev.isReply) return ev.text
  return ev.uname ? `@${ev.uname} ${ev.text}` : null
}

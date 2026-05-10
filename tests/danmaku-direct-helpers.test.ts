/**
 * C4: coverage for the +1 / steal target-text resolution in
 * `danmaku-direct.ts`. The helper is the seam that decides what string
 * actually gets sent / copied; getting it wrong means a "+1" button
 * silently skips reply danmaku, or sends the reply body without context.
 */

import { describe, expect, test } from 'bun:test'

import { eventToSendableMessage } from '../src/lib/danmaku-direct-helpers'

function ev(partial: { isReply?: boolean; text: string; uname?: string | null; hasLargeEmote?: boolean }) {
  return {
    isReply: partial.isReply ?? false,
    text: partial.text,
    uname: partial.uname ?? null,
    hasLargeEmote: partial.hasLargeEmote ?? false,
  }
}

describe('eventToSendableMessage', () => {
  test('non-reply danmaku: passes the text through verbatim', () => {
    expect(eventToSendableMessage(ev({ text: 'hello world', isReply: false }))).toBe('hello world')
  })

  test('reply with a known uname: prepends `@uname ` so the sent message keeps reply context', () => {
    expect(eventToSendableMessage(ev({ text: 'thanks!', isReply: true, uname: '阿茶' }))).toBe('@阿茶 thanks!')
  })

  test('reply WITHOUT a uname: returns null so the caller skips the action (audit-driven contract)', () => {
    // Pre-fix, the implementation sent the bare text — a "+1" of a reply
    // dropped the reply target and read as a non-sequitur in chat. Now we
    // return null so the caller skips the action.
    expect(eventToSendableMessage(ev({ text: 'reply body', isReply: true, uname: null }))).toBe(null)
    expect(eventToSendableMessage(ev({ text: 'reply body', isReply: true, uname: '' }))).toBe(null)
  })

  test('non-reply with a uname: still returns just the text (uname is reply-only metadata)', () => {
    expect(eventToSendableMessage(ev({ text: 'hi', isReply: false, uname: '某人' }))).toBe('hi')
  })

  test('preserves emoji / unicode in both text and uname slots', () => {
    expect(eventToSendableMessage(ev({ text: 'hi 🌸', isReply: true, uname: '🐱猫猫' }))).toBe('@🐱猫猫 hi 🌸')
  })

  test('large emote (hasLargeEmote=true): returns null so the +1 / steal button is suppressed', () => {
    // `data-danmaku` for a 大表情 is the display name ("应援"/"干杯"...),
    // not the emoticon_unique. Sending it as plain text would drop "应援"
    // into chat instead of the actual emote — so the caller must skip the
    // action by getting null from this helper.
    expect(eventToSendableMessage(ev({ text: '应援', hasLargeEmote: true }))).toBe(null)
    // Also for a reply form of large emote (rare, but defensive).
    expect(eventToSendableMessage(ev({ text: '干杯', hasLargeEmote: true, isReply: true, uname: '某人' }))).toBe(null)
  })

  test('large emote check is checked before reply-context handling', () => {
    // hasLargeEmote=true overrides every other consideration, including the
    // normal "reply with uname" prepend — those would still produce broken
    // output ("@某人 应援") so the suppression must win unconditionally.
    expect(eventToSendableMessage(ev({ text: '应援', hasLargeEmote: true, isReply: true, uname: '某人' }))).toBe(null)
  })
})

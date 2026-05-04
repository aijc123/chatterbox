/**
 * C4: coverage for the +1 / steal target-text resolution in
 * `danmaku-direct.ts`. The helper is the seam that decides what string
 * actually gets sent / copied; getting it wrong means a "+1" button
 * silently skips reply danmaku, or sends the reply body without context.
 */

import { describe, expect, test } from 'bun:test'

import { eventToSendableMessage } from '../src/lib/danmaku-direct-helpers'

function ev(partial: { isReply?: boolean; text: string; uname?: string | null }) {
  return { isReply: partial.isReply ?? false, text: partial.text, uname: partial.uname ?? null }
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
})

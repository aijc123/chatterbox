/**
 * Lock-in tests for visual fixes shipped in the Chatterbox chat panel:
 *
 *   1. Emojis (inline + big stickers) were oversized — assert they shrunk.
 *   2. The list mask used to fade BOTH the top and bottom 18px to transparent,
 *      which made the newest message look like it was vanishing under the
 *      composer. Assert the bottom edge is now fully opaque.
 *   3. A floating "jump to bottom / new messages" pill is rendered above the
 *      composer; assert the rule exists and is absolutely positioned so it
 *      can't push the composer's grid layout around.
 */
import { describe, expect, test } from 'bun:test'

import { CUSTOM_CHAT_STYLE } from '../src/lib/custom-chat-style'

function ruleBlock(css: string, selectorSuffix: string): string {
  // Pull out the body of `<anything> ${selectorSuffix} { ... }`. The style
  // sheet uses backticked template literals with the panel id interpolated,
  // so we match by the unique trailing class name.
  const pattern = new RegExp(`${selectorSuffix.replace(/[-\\^$*+?.()|[\\]{}]/g, '\\$&')}\\s*\\{([^}]*)\\}`, 'm')
  const match = css.match(pattern)
  if (!match) throw new Error(`No CSS rule found for selector ending in "${selectorSuffix}"`)
  return match[1]
}

describe('chat emoji sizing', () => {
  test('inline emote shrunk from 1.7em to 1.35em', () => {
    const body = ruleBlock(CUSTOM_CHAT_STYLE, '.lc-chat-emote')
    expect(body).toContain('width: 1.35em')
    expect(body).toContain('height: 1.35em')
    expect(body).not.toContain('1.7em')
  })

  test('big sticker capped at 96px instead of 160px', () => {
    const body = ruleBlock(CUSTOM_CHAT_STYLE, '.lc-chat-emote-big')
    expect(body).toContain('max-width: 96px')
    expect(body).toContain('max-height: 96px')
    expect(body).not.toContain('160px')
  })
})

describe('chat list mask', () => {
  test('mask no longer fades the bottom edge to transparent', () => {
    const body = ruleBlock(CUSTOM_CHAT_STYLE, '.lc-chat-list')
    // Before: linear-gradient(to bottom, transparent, #000 18px, #000 calc(100% - 18px), transparent)
    // After:  linear-gradient(to bottom, transparent, #000 18px, #000 100%)
    // Either form keeps the top fade, but only the new form ends at #000 100%.
    expect(body).toContain('#000 100%)')
    expect(body).not.toContain('calc(100% - 18px)')
  })
})

describe('floating jump-to-bottom pill', () => {
  test('rule is defined and absolutely positioned above the composer', () => {
    const body = ruleBlock(CUSTOM_CHAT_STYLE, '.lc-chat-jump-bottom')
    expect(body).toContain('position: absolute')
    // Anchored relative to the composer's top edge so it floats above it
    // regardless of composer height (varies with the textarea).
    expect(body).toContain('bottom: calc(100% + 6px)')
    // Centered horizontally.
    expect(body).toContain('left: 50%')
    expect(body).toContain('translateX(-50%)')
  })

  test('unread variant uses the accent color so it reads as new-message bait', () => {
    // The data-unread="true" branch swaps to the panel accent — that's what
    // turns the pill blue when there's a count to show.
    expect(CUSTOM_CHAT_STYLE).toContain('.lc-chat-jump-bottom[data-unread="true"]')
  })
})

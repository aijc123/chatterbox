/**
 * Tests for `setChatText` — the emoticon-aware text renderer that turns raw
 * danmaku text into a mix of text nodes and `<img>` tags. Two regressions
 * we guard against:
 *
 *   1. Plain repeated text (e.g. `晚安晚安晚安`) must NOT be rewritten into
 *      emoticon images, even when an emoticon in the cache has a `descript`
 *      that exactly matches a repeating substring. Earlier, the matcher
 *      registered the bare `descript` as a token, so any plain text containing
 *      `晚安` got chopped into emote images.
 *   2. Both ASCII `[xxx]` and Chinese `【xxx】` bracket forms must match a
 *      cached emoticon, regardless of which form the cache entry uses.
 */

import { Window } from 'happy-dom'

const happyWindow = new Window()
;(happyWindow as unknown as { SyntaxError: SyntaxErrorConstructor }).SyntaxError = SyntaxError
Object.assign(globalThis, {
  document: happyWindow.document,
  HTMLElement: happyWindow.HTMLElement,
  HTMLImageElement: happyWindow.HTMLImageElement,
  window: happyWindow,
})

import { beforeEach, describe, expect, test } from 'bun:test'

const { cachedEmoticonPackages } = await import('../src/lib/store')
const { setChatText } = await import('../src/lib/custom-chat-emoticons')

function makeContainer(): HTMLElement {
  return document.createElement('div')
}

function imageCount(el: HTMLElement): number {
  return el.querySelectorAll('img').length
}

describe('setChatText — emoticon recognition', () => {
  beforeEach(() => {
    cachedEmoticonPackages.value = [
      {
        pkg_id: 1,
        pkg_name: 'test',
        pkg_type: 1,
        pkg_descript: '',
        emoticons: [
          {
            emoji: '[doge]',
            descript: 'doge',
            url: 'https://example.test/doge.png',
            emoticon_unique: '[doge]',
            emoticon_id: 1,
            perm: 1,
          },
          {
            // The smoking-gun case: a real Bilibili package can carry a
            // `descript` field that exactly equals a common Chinese phrase.
            // Earlier the matcher would happily replace every occurrence in
            // plain text.
            emoji: '[晚安]',
            descript: '晚安',
            url: 'https://example.test/wanan.png',
            emoticon_unique: '[晚安]',
            emoticon_id: 2,
            perm: 1,
          },
        ],
      },
    ]
  })

  test('does NOT rewrite repeated plain text that happens to match a descript', () => {
    const el = makeContainer()
    setChatText(el, '晚安晚安晚安晚安晚安晚安晚安')
    expect(imageCount(el)).toBe(0)
    expect(el.textContent).toBe('晚安晚安晚安晚安晚安晚安晚安')
  })

  test('matches `[doge]` mid-sentence and preserves surrounding text', () => {
    const el = makeContainer()
    setChatText(el, '你好[doge]世界')
    const img = el.querySelector('img')
    expect(img).not.toBeNull()
    expect(img?.getAttribute('src')).toBe('https://example.test/doge.png')
    expect(el.textContent).toBe('你好世界')
  })

  test('matches the Chinese bracket variant `【doge】` even when cache stores `[doge]`', () => {
    const el = makeContainer()
    setChatText(el, '你好【doge】世界')
    expect(imageCount(el)).toBe(1)
    expect(el.textContent).toBe('你好世界')
  })

  test('handles single-character input without crashing', () => {
    const el = makeContainer()
    setChatText(el, 'a')
    expect(el.textContent).toBe('a')
  })

  test('clears children when given empty text', () => {
    const el = makeContainer()
    el.appendChild(document.createElement('span'))
    setChatText(el, '')
    expect(el.children.length).toBe(0)
    expect(el.textContent).toBe('')
  })
})

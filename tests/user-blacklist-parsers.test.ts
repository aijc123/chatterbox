/**
 * C4: coverage for the DOM parsers behind the auto-follow blacklist
 * context-menu hijack.
 *
 * Bilibili's chat DOM has shipped multiple incompatible shapes — the parsers
 * try several selector / attribute fallbacks. These tests lock the fallback
 * order in place and verify the noise filter (装扮 / 粉丝牌 / etc.) doesn't
 * accept text from sibling decoration elements as a username.
 *
 * Pure DOM parsers — happy-dom is enough, no signals or message bus needed.
 */

import { Window } from 'happy-dom'

const happyWindow = new Window()
// happy-dom calls `new window.SyntaxError(...)` from inside its CSS selector
// parser; if we don't graft the real constructor onto the Window, every
// querySelector call throws "undefined is not a constructor" the first time
// the parser hits a selector with attribute syntax (e.g. `[data-uname]`).
;(happyWindow as unknown as { SyntaxError: SyntaxErrorConstructor }).SyntaxError = SyntaxError
Object.assign(globalThis, {
  document: happyWindow.document,
  HTMLElement: happyWindow.HTMLElement,
  HTMLAnchorElement: happyWindow.HTMLAnchorElement,
  window: happyWindow,
})

import { afterEach, describe, expect, test } from 'bun:test'

import { extractUidFromDanmakuItem, extractUnameFromDanmakuItem } from '../src/lib/user-blacklist-parsers'

function makeItem(html: string): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.innerHTML = html
  document.body.append(wrapper)
  // The first child is the danmaku item itself.
  return wrapper.firstElementChild as HTMLElement
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('extractUidFromDanmakuItem', () => {
  test('prefers `data-uid` when present (modern desktop layout)', () => {
    const item = makeItem('<div class="chat-item danmaku-item" data-uid="42"></div>')
    expect(extractUidFromDanmakuItem(item)).toBe('42')
  })

  test('falls back to space.bilibili.com link when `data-uid` is missing', () => {
    const item = makeItem(
      '<div class="chat-item danmaku-item"><a href="https://space.bilibili.com/12345?spm_id_from=…">u</a></div>'
    )
    expect(extractUidFromDanmakuItem(item)).toBe('12345')
  })

  test('falls back to `?uid=` query param on legacy layouts', () => {
    const item = makeItem(
      '<div class="chat-item danmaku-item"><a href="https://example.bilibili.com/page?foo=1&uid=987">u</a></div>'
    )
    expect(extractUidFromDanmakuItem(item)).toBe('987')
  })

  test('returns null when no extractor matches (signals "skip blacklist action")', () => {
    expect(extractUidFromDanmakuItem(makeItem('<div class="chat-item danmaku-item"></div>'))).toBe(null)
    expect(
      extractUidFromDanmakuItem(
        makeItem('<div class="chat-item danmaku-item"><a href="https://other.com/foo">u</a></div>')
      )
    ).toBe(null)
  })

  test('prefers data-uid even when an anchor is also present', () => {
    const item = makeItem(
      '<div class="chat-item danmaku-item" data-uid="111"><a href="https://space.bilibili.com/222">u</a></div>'
    )
    expect(extractUidFromDanmakuItem(item)).toBe('111')
  })
})

describe('extractUnameFromDanmakuItem', () => {
  test('prefers data-uname over text content', () => {
    const item = makeItem(
      '<div class="chat-item danmaku-item"><span class="user-name" data-uname="阿茶" title="ignored">junk-text</span></div>'
    )
    expect(extractUnameFromDanmakuItem(item)).toBe('阿茶')
  })

  test('falls back to title attribute when no data-uname', () => {
    const item = makeItem(
      '<div class="chat-item danmaku-item"><span class="user-name" title="桃李">leaked-noise</span></div>'
    )
    expect(extractUnameFromDanmakuItem(item)).toBe('桃李')
  })

  test('falls back to textContent when no attributes available', () => {
    const item = makeItem('<div class="chat-item danmaku-item"><span class="user-name">柠檬</span></div>')
    expect(extractUnameFromDanmakuItem(item)).toBe('柠檬')
  })

  test('rejects values containing decoration noise (粉丝牌 / 装扮 / 复制 / 举报 / etc.)', () => {
    const noisy = [
      '<span class="user-name">茶茶 装扮</span>',
      '<span class="user-name">茶茶 粉丝牌</span>',
      '<span class="user-name">复制</span>',
      '<span class="user-name">举报</span>',
      '<span class="user-name">回复</span>',
      '<span class="user-name">关闭</span>',
      '<span class="user-name">通过活动加入</span>',
      '<span class="user-name">用户等级 30</span>',
    ]
    for (const html of noisy) {
      const item = makeItem(`<div class="chat-item danmaku-item">${html}</div>`)
      expect(extractUnameFromDanmakuItem(item)).toBe(null)
    }
  })

  test('rejects implausibly long values (>32 chars; likely concatenated child text)', () => {
    const item = makeItem(`<div class="chat-item danmaku-item"><span class="user-name">${'a'.repeat(50)}</span></div>`)
    expect(extractUnameFromDanmakuItem(item)).toBe(null)
  })

  test('normalizes consecutive whitespace to a single space', () => {
    const item = makeItem('<div class="chat-item danmaku-item"><span class="user-name">  阿\t\n茶  </span></div>')
    expect(extractUnameFromDanmakuItem(item)).toBe('阿 茶')
  })

  test('returns null on an empty / missing username node', () => {
    expect(extractUnameFromDanmakuItem(makeItem('<div class="chat-item danmaku-item"></div>'))).toBe(null)
    expect(
      extractUnameFromDanmakuItem(makeItem('<div class="chat-item danmaku-item"><span class="user-name"></span></div>'))
    ).toBe(null)
  })

  test('selector fallback order: tries data-uname → user-name → username → danmaku-item-user → user-name-like', () => {
    // data-uname takes priority even when later selectors match.
    const item = makeItem(`
      <div class="chat-item danmaku-item">
        <span data-uname="from-data">A</span>
        <span class="user-name">from-user-name</span>
      </div>
    `)
    expect(extractUnameFromDanmakuItem(item)).toBe('from-data')
  })
})

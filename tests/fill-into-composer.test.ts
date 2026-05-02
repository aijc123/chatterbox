/**
 * Unit tests for `fillIntoComposer` — the "drop a candidate into whatever
 * input the user is currently using, but never auto-send" helper.
 *
 * It walks a fallback chain:
 *   Chatterbox custom-chat → B站 native → Send-tab (panel pop-open)
 *
 * We test the chain by stubbing `document.querySelector` to return / not
 * return fake textarea handles and then asserting:
 *   - the returned source enum
 *   - the side-effects on `fasongText`, `activeTab`, `dialogOpen` signals
 *   - that the matching textarea actually got `.value` set + `input` event fired
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  unsafeWindow: globalThis,
}))

// `fillIntoComposer` only touches `document.querySelector` + a handful of
// signals — it never calls the network paths that danmaku-actions imports
// transitively. Mock at the smallest possible boundary; partial module mocks
// would leak undefined exports into later test files. Best to leave the real
// modules loaded — they're side-effect-free at import time.
mock.module('../src/components/ui/alert-dialog', () => ({
  showConfirm: async () => false,
}))

interface FakeTextarea {
  value: string
  events: string[]
  selectionStart: number
  selectionEnd: number
  dispatchEvent: (e: Event) => boolean
  focus: () => void
  setSelectionRange: (s: number, e: number) => void
}
function makeFakeTextarea(): FakeTextarea {
  const ta: FakeTextarea = {
    value: '',
    events: [],
    selectionStart: 0,
    selectionEnd: 0,
    dispatchEvent(e: Event) {
      this.events.push(e.type)
      return true
    },
    focus() {},
    setSelectionRange(s: number, e: number) {
      this.selectionStart = s
      this.selectionEnd = e
    },
  }
  return ta
}

const dom: Record<string, FakeTextarea | null> = {}
;(globalThis as unknown as { document: { querySelector: (sel: string) => unknown } }).document = {
  querySelector: (sel: string) => {
    for (const [k, v] of Object.entries(dom)) {
      if (sel.includes(k)) return v
    }
    return null
  },
}

const { fillIntoComposer } = await import('../src/lib/danmaku-actions')
const { activeTab, customChatEnabled, dialogOpen, fasongText } = await import('../src/lib/store')

beforeEach(() => {
  for (const k of Object.keys(dom)) delete dom[k]
  fasongText.value = ''
  activeTab.value = 'fasong'
  dialogOpen.value = false
  customChatEnabled.value = false
})

afterEach(() => {
  for (const k of Object.keys(dom)) delete dom[k]
})

describe('fillIntoComposer', () => {
  test('always sets fasongText to the candidate, regardless of which target wins', () => {
    fillIntoComposer('习­近­平')
    expect(fasongText.value).toBe('习­近­平')
  })

  test("returns 'custom-chat' when Chatterbox composer is present AND customChatEnabled", () => {
    customChatEnabled.value = true
    const ta = makeFakeTextarea()
    dom['#laplace-custom-chat textarea'] = ta

    const result = fillIntoComposer('习口近口平')
    expect(result).toBe('custom-chat')
    expect(ta.value).toBe('习口近口平')
    expect(ta.events).toContain('input')
  })

  test('does NOT use Chatterbox composer when customChatEnabled is false (falls through)', () => {
    customChatEnabled.value = false
    dom['#laplace-custom-chat textarea'] = makeFakeTextarea()
    const native = makeFakeTextarea()
    dom['.chat-control-panel-vm textarea'] = native

    const result = fillIntoComposer('foo')
    expect(result).toBe('native')
    expect(native.value).toBe('foo')
  })

  test("returns 'native' and writes to B站 textarea when Chatterbox is absent", () => {
    const native = makeFakeTextarea()
    dom['.chat-control-panel-vm textarea'] = native

    const result = fillIntoComposer('习　近　平')
    expect(result).toBe('native')
    expect(native.value).toBe('习　近　平')
    expect(native.events).toContain('input')
    expect(native.selectionStart).toBe('习　近　平'.length)
    expect(native.selectionEnd).toBe('习　近　平'.length)
  })

  test("returns 'send-tab' when no DOM target is reachable, opens the panel", () => {
    activeTab.value = 'about' // verify activeTab gets switched
    dialogOpen.value = false

    const result = fillIntoComposer('fallback')
    expect(result).toBe('send-tab')
    expect(activeTab.value).toBe('fasong')
    expect(dialogOpen.value).toBe(true)
    expect(fasongText.value).toBe('fallback')
  })

  test('survives setSelectionRange throwing on a hidden textarea', () => {
    const native = makeFakeTextarea()
    native.setSelectionRange = () => {
      throw new Error('hidden')
    }
    dom['.chat-control-panel-vm textarea'] = native

    // Must not throw — the production code wraps setSelectionRange in try/catch.
    expect(() => fillIntoComposer('x')).not.toThrow()
  })
})

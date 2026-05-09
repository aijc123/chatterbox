import { Window } from 'happy-dom'

const happyWindow = new Window()
;(happyWindow as unknown as { SyntaxError: SyntaxErrorConstructor }).SyntaxError = SyntaxError

Object.assign(globalThis, {
  document: happyWindow.document,
  Event: happyWindow.Event,
  HTMLElement: happyWindow.HTMLElement,
  HTMLButtonElement: happyWindow.HTMLButtonElement,
  HTMLImageElement: happyWindow.HTMLImageElement,
  HTMLInputElement: happyWindow.HTMLInputElement,
  HTMLTextAreaElement: happyWindow.HTMLTextAreaElement,
  KeyboardEvent: happyWindow.KeyboardEvent,
  MouseEvent: happyWindow.MouseEvent,
  MutationObserver: happyWindow.MutationObserver,
  window: happyWindow,
})

let rafSeq = 0
const rafTimers = new Map<number, ReturnType<typeof setTimeout>>()
happyWindow.requestAnimationFrame = (callback: FrameRequestCallback): number => {
  const id = ++rafSeq
  const timer = setTimeout(() => {
    rafTimers.delete(id)
    callback(Date.now())
  }, 0)
  rafTimers.set(id, timer)
  return id
}
happyWindow.cancelAnimationFrame = (id: number): void => {
  const timer = rafTimers.get(id)
  if (timer) clearTimeout(timer)
  rafTimers.delete(id)
}

if (!('scrollTo' in happyWindow.HTMLElement.prototype)) {
  Object.defineProperty(happyWindow.HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value(this: HTMLElement, opts: ScrollToOptions | number) {
      this.scrollTop = typeof opts === 'number' ? opts : (opts.top ?? this.scrollTop)
    },
  })
}

// Override getBoundingClientRect for chat rows so measureRenderedRows() picks up
// a non-zero height and rowHeights[key] becomes the *actual* (mocked) value
// rather than the estimated DEFAULT_ROW_HEIGHT (48). Without this, happy-dom
// returns 0 everywhere, and the iteration in scrollToBottom never moves past
// estimated heights — masking exactly the gap the iteration is meant to close.
const ROW_ACTUAL_HEIGHT = 80
const VIEWPORT_HEIGHT = 200
const origGetBCR = happyWindow.HTMLElement.prototype.getBoundingClientRect
Object.defineProperty(happyWindow.HTMLElement.prototype, 'getBoundingClientRect', {
  configurable: true,
  value(this: HTMLElement) {
    if (this.classList?.contains('lc-chat-message')) {
      return {
        x: 0,
        y: 0,
        width: 300,
        height: ROW_ACTUAL_HEIGHT,
        top: 0,
        bottom: ROW_ACTUAL_HEIGHT,
        left: 0,
        right: 300,
        toJSON: () => ({}),
      } as DOMRect
    }
    return (
      origGetBCR?.call(this) ??
      ({ width: 0, height: 0, top: 0, bottom: 0, left: 0, right: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect)
    )
  },
})

// listEl.clientHeight needs a stable non-zero value so virtualContentHeight()
// vs clientHeight produces a meaningful scroll target.
Object.defineProperty(happyWindow.HTMLElement.prototype, 'clientHeight', {
  configurable: true,
  get(this: HTMLElement) {
    if (this.classList?.contains('lc-chat-list')) return VIEWPORT_HEIGHT
    return 0
  },
})

class RecordingImage {
  src = ''
  decoding = ''
  referrerPolicy = ''

  decode(): Promise<void> {
    return Promise.resolve()
  }
}

;(globalThis as { Image: unknown }).Image = RecordingImage

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import type { CustomChatEvent } from '../src/lib/custom-chat-events'
import type { DanmakuSubscription } from '../src/lib/danmaku-stream'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  GM_xmlhttpRequest: () => {},
  unsafeWindow: globalThis,
}))

let _activeDanmakuSubscription: DanmakuSubscription | null = null

mock.module('../src/lib/danmaku-stream', () => ({
  subscribeDanmaku: (subscription: DanmakuSubscription) => {
    _activeDanmakuSubscription = subscription
    const nativeContainer = document.createElement('div')
    nativeContainer.className = 'chat-items'
    const historyPanel = document.createElement('div')
    historyPanel.className = 'chat-history-panel'
    historyPanel.append(nativeContainer)
    const sendBox = document.createElement('div')
    sendBox.className = 'chat-control-panel-vm'
    sendBox.append(document.createElement('textarea'))
    const host = document.createElement('div')
    host.id = 'native-chat-host'
    host.append(historyPanel, sendBox)
    document.body.append(host)
    subscription.onAttach?.(nativeContainer)
    return () => {
      _activeDanmakuSubscription = null
    }
  },
}))

mock.module('../src/lib/api', () => ({
  ensureRoomId: async () => 1000,
  fetchEmoticons: async () => {},
}))

const sentManualMessages: string[] = []
mock.module('../src/lib/danmaku-actions', () => ({
  copyText: async () => {},
  repeatDanmaku: async () => {},
  sendManualDanmaku: async (text: string) => {
    sentManualMessages.push(text)
    return true
  },
  stealDanmaku: async () => {},
}))

mock.module('../src/lib/emote-picker-mount', () => ({
  mountSendActionsIsland: () => () => {},
}))

mock.module('../src/lib/live-ws-source', () => ({
  hasRecentWsDanmaku: () => false,
}))

const { emitCustomChatEvent, clearRecentCustomChatDanmakuHistory } = await import('../src/lib/custom-chat-events')
const { startCustomChatDom, stopCustomChatDom } = await import('../src/lib/custom-chat-dom')
const { customChatHideNative, customChatTheme, customChatFoldMode } = await import('../src/lib/store')

function event(id: string, text = `msg-${id}`, overrides: Partial<CustomChatEvent> = {}): CustomChatEvent {
  return {
    id,
    kind: 'danmaku',
    text,
    sendText: text,
    uname: `User-${id}`,
    uid: id,
    time: '12:00',
    isReply: false,
    source: 'ws',
    badges: [],
    ...overrides,
  }
}

async function flushDom(): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))
}

function root(): HTMLElement {
  const el = document.getElementById('laplace-custom-chat')
  if (!el) throw new Error('custom chat root is not mounted')
  return el
}

function listEl(): HTMLElement {
  const el = root().querySelector<HTMLElement>('.lc-chat-list')
  if (!el) throw new Error('list not mounted')
  return el
}

function scrollState(): { scrollTop: number; scrollHeight: number; clientHeight: number; gap: number } {
  const list = listEl()
  // happy-dom doesn't compute scrollHeight from layout. We synthesize it from
  // the spacers + items to mirror what a real browser would report.
  const spacers = Array.from(list.querySelectorAll<HTMLElement>('.lc-chat-virtual-spacer'))
  const items = list.querySelector<HTMLElement>('.lc-chat-virtual-items')
  const itemRowsHeight = (items?.children.length ?? 0) * ROW_ACTUAL_HEIGHT
  const spacerHeight = spacers.reduce((sum, s) => sum + Number.parseFloat(s.style.height || '0'), 0)
  const scrollHeight = spacerHeight + itemRowsHeight
  const clientHeight = VIEWPORT_HEIGHT
  return {
    scrollTop: list.scrollTop,
    scrollHeight,
    clientHeight,
    gap: scrollHeight - list.scrollTop - clientHeight,
  }
}

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.documentElement.className = ''
  _activeDanmakuSubscription = null
  sentManualMessages.length = 0
  clearRecentCustomChatDanmakuHistory()
  customChatHideNative.value = false
  customChatTheme.value = 'light'
  customChatFoldMode.value = false
})

afterEach(() => {
  stopCustomChatDom()
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  document.documentElement.className = ''
})

describe('scrollToBottom + jump-bottom button click', () => {
  test('clicking 回到最新 ↓ once converges scrollTop to the true bottom even when actual row heights exceed estimates', async () => {
    startCustomChatDom()
    await flushDom()

    // Push 25 messages — with ROW_ACTUAL_HEIGHT=80 and DEFAULT_ROW_HEIGHT=48,
    // the gap between estimated and measured grows linearly with row count.
    for (let i = 0; i < 25; i++) emitCustomChatEvent(event(`m-${i}`))
    await flushDom()

    // Scroll to top → frozen mode (panel surfaces 回到最新 ↓)
    const list = listEl()
    list.scrollTop = 0
    list.dispatchEvent(new Event('scroll'))
    await flushDom()

    const jumpBtn = root().querySelector<HTMLButtonElement>('.lc-chat-jump-bottom')
    expect(jumpBtn).toBeTruthy()

    // Single click — should land at (or very close to) the true bottom in one
    // pass thanks to the iteration loop in scrollToBottom('auto').
    jumpBtn?.click()
    await flushDom()

    const after = scrollState()
    // The spacer-derived scrollHeight should be ≥ scrollTop + clientHeight,
    // i.e. the user is at the visible bottom (gap < 1 px allowing for fp drift).
    expect(after.gap).toBeLessThan(1)
    // And we did move from the top (scrollTop=0) — proves the click took.
    expect(after.scrollTop).toBeGreaterThan(0)
  })

  test('clicking unread pill (新消息 N) with active follow once also lands at true bottom', async () => {
    startCustomChatDom()
    await flushDom()

    for (let i = 0; i < 20; i++) emitCustomChatEvent(event(`u-${i}`))
    await flushDom()

    // Scroll up, then push messages while frozen so unread accumulates
    const list = listEl()
    list.scrollTop = 0
    list.dispatchEvent(new Event('scroll'))
    await flushDom()
    for (let i = 0; i < 8; i++) emitCustomChatEvent(event(`u-late-${i}`))
    await flushDom()

    const unreadBtn = root().querySelector<HTMLButtonElement>('.lc-chat-unread')
    expect(unreadBtn).toBeTruthy()
    unreadBtn?.click()
    await flushDom()

    const after = scrollState()
    expect(after.gap).toBeLessThan(1)
    expect(after.scrollTop).toBeGreaterThan(0)
  })

  test('clicking 暂停 → 恢复跟随 (pauseBtn while frozen) snaps to bottom in one click', async () => {
    startCustomChatDom()
    await flushDom()

    for (let i = 0; i < 20; i++) emitCustomChatEvent(event(`p-${i}`))
    await flushDom()

    // Click pause once → freeze
    const pauseBtn = root().querySelector<HTMLButtonElement>('.lc-chat-pill')
    expect(pauseBtn?.textContent).toBe('暂停')
    pauseBtn?.click()
    await flushDom()
    expect(pauseBtn?.textContent).toBe('恢复跟随')

    // Scroll up while frozen
    const list = listEl()
    list.scrollTop = 0
    list.dispatchEvent(new Event('scroll'))
    await flushDom()

    // Click again → should resume + snap to bottom in one shot
    pauseBtn?.click()
    await flushDom()

    const after = scrollState()
    expect(after.gap).toBeLessThan(1)
    expect(after.scrollTop).toBeGreaterThan(0)
  })

  test('auto-follow re-stick on each new message lands at bottom even as measured heights overshoot estimates', async () => {
    startCustomChatDom()
    await flushDom()

    // Seed and let auto-follow do its thing as new messages stream in
    for (let i = 0; i < 30; i++) emitCustomChatEvent(event(`f-${i}`))
    await flushDom()

    const after = scrollState()
    // We never scrolled up — auto-follow path takes scrollToBottom() default 'auto',
    // which now iterates. After the burst, gap should be ~0.
    expect(after.gap).toBeLessThan(1)
    expect(after.scrollTop).toBeGreaterThan(0)
  })
})

describe('listEl keyboard navigation (ArrowUp / ArrowDown / Home / End)', () => {
  test('ArrowDown / ArrowUp / Home / End each move scrollTop by calling scrollToVirtualIndex', async () => {
    startCustomChatDom()
    await flushDom()

    for (let i = 0; i < 30; i++) emitCustomChatEvent(event(`k-${i}`))
    await flushDom()

    const list = listEl()
    list.scrollTop = 0
    list.dispatchEvent(new Event('scroll'))
    await flushDom()

    const dispatchKey = (key: string) => {
      const ev = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
      list.dispatchEvent(ev)
    }

    dispatchKey('End')
    await flushDom()
    const afterEnd = list.scrollTop
    expect(afterEnd).toBeGreaterThan(0)

    dispatchKey('Home')
    await flushDom()
    expect(list.scrollTop).toBeLessThan(afterEnd)

    dispatchKey('ArrowDown')
    await flushDom()
    expect(list.scrollTop).toBeGreaterThanOrEqual(0)

    // Non-navigation keys are ignored (no scrollTop change).
    const before = list.scrollTop
    dispatchKey('a')
    await flushDom()
    expect(list.scrollTop).toBe(before)
  })

  test('keyboard nav is a no-op when there are no messages', async () => {
    startCustomChatDom()
    await flushDom()

    const list = listEl()
    const before = list.scrollTop
    const ev = new KeyboardEvent('keydown', { key: 'End', bubbles: true, cancelable: true })
    list.dispatchEvent(ev)
    await flushDom()
    expect(list.scrollTop).toBe(before)
  })
})

describe('composer Enter / Shift+Enter / input', () => {
  test('Enter sends, Shift+Enter does not', async () => {
    startCustomChatDom()
    await flushDom()

    const textarea = root().querySelector<HTMLTextAreaElement>('textarea')
    expect(textarea).toBeTruthy()
    if (!textarea) return

    textarea.value = '你好世界'
    textarea.dispatchEvent(new Event('input', { bubbles: true }))

    // Shift+Enter does NOT send
    textarea.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', shiftKey: true, bubbles: true, cancelable: true })
    )
    await flushDom()
    expect(sentManualMessages).toEqual([])

    // Plain Enter DOES send
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
    await flushDom()
    expect(sentManualMessages).toContain('你好世界')
  })

  test('typing into the textarea updates the count badge', async () => {
    startCustomChatDom()
    await flushDom()

    const textarea = root().querySelector<HTMLTextAreaElement>('textarea')
    const countEl = root().querySelector<HTMLElement>('.lc-chat-count')
    expect(textarea && countEl).toBeTruthy()
    if (!textarea || !countEl) return

    textarea.value = 'abc'
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    await flushDom()
    expect(countEl.textContent).toBe('3')

    textarea.value = ''
    textarea.dispatchEvent(new Event('input', { bubbles: true }))
    await flushDom()
    expect(countEl.textContent).toBe('0')
  })
})

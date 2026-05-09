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
let nativeContainer: HTMLElement | null = null

mock.module('../src/lib/danmaku-stream', () => ({
  subscribeDanmaku: (subscription: DanmakuSubscription) => {
    _activeDanmakuSubscription = subscription
    nativeContainer = document.createElement('div')
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

mock.module('../src/lib/danmaku-actions', () => ({
  copyText: async () => {},
  repeatDanmaku: async () => {},
  sendManualDanmaku: async () => true,
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
const { customChatFoldMode, customChatHideNative, customChatPerfDebug, customChatTheme } = await import(
  '../src/lib/store'
)

let evtSeq = 0
function danmakuEvent(text: string, uid: string, uname = `User-${uid}`): CustomChatEvent {
  return {
    id: `evt-${++evtSeq}`,
    kind: 'danmaku',
    text,
    sendText: text,
    uname,
    uid,
    time: '20:00',
    isReply: false,
    source: 'ws',
    badges: [],
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

function rows(): HTMLElement[] {
  return Array.from(root().querySelectorAll<HTMLElement>('.lc-chat-message'))
}

beforeEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
  document.documentElement.className = ''
  nativeContainer = null
  _activeDanmakuSubscription = null
  evtSeq = 0
  clearRecentCustomChatDanmakuHistory()
  customChatHideNative.value = false
  customChatPerfDebug.value = false
  customChatTheme.value = 'light'
  customChatFoldMode.value = false
})

afterEach(() => {
  stopCustomChatDom()
  customChatFoldMode.value = false
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  document.documentElement.className = ''
})

describe('Chatterbox fold mode', () => {
  test('without fold mode, the same text from different uids renders multiple rows and no ×N badge', async () => {
    startCustomChatDom()

    for (let i = 0; i < 5; i++) {
      emitCustomChatEvent(danmakuEvent('666666', String(100 + i)))
    }
    await flushDom()

    const list = rows()
    expect(list.length).toBe(5)
    expect(root().querySelector('.lc-chat-merge-count')).toBeNull()
  })

  test('with fold mode, cross-user duplicates fold into a single row with an ×N badge', async () => {
    customChatFoldMode.value = true
    startCustomChatDom()

    for (let i = 0; i < 5; i++) {
      emitCustomChatEvent(danmakuEvent('666666', String(200 + i)))
    }
    await flushDom()

    const list = rows()
    expect(list.length).toBe(1)
    const badge = list[0]?.querySelector<HTMLElement>('.lc-chat-merge-count')
    expect(badge?.textContent).toBe('×5')
  })

  test('with fold mode, distinct texts each get their own row and only the duplicated text shows ×N', async () => {
    customChatFoldMode.value = true
    startCustomChatDom()

    emitCustomChatEvent(danmakuEvent('666666', '300'))
    emitCustomChatEvent(danmakuEvent('你好主播', '301'))
    emitCustomChatEvent(danmakuEvent('666666', '302'))
    emitCustomChatEvent(danmakuEvent('666666', '303'))
    emitCustomChatEvent(danmakuEvent('精彩', '304'))
    await flushDom()

    const list = rows()
    expect(list.length).toBe(3)
    const badges = list.map(row => row.querySelector<HTMLElement>('.lc-chat-merge-count')?.textContent ?? null)
    expect(badges).toContain('×3')
    expect(badges.filter(Boolean).length).toBe(1)
  })

  test('with fold mode, different-length wheels of the same char ("666"/"6666"/"66666") fold to one card', async () => {
    customChatFoldMode.value = true
    startCustomChatDom()

    emitCustomChatEvent(danmakuEvent('666', '500'))
    emitCustomChatEvent(danmakuEvent('6666', '501'))
    emitCustomChatEvent(danmakuEvent('66666', '502'))
    emitCustomChatEvent(danmakuEvent('哈哈', '503'))
    emitCustomChatEvent(danmakuEvent('哈哈哈哈哈', '504'))
    await flushDom()

    const list = rows()
    // 2 cards: "6..." wheel and "哈哈" wheel
    expect(list.length).toBe(2)
    const counts = list
      .map(row => row.querySelector<HTMLElement>('.lc-chat-merge-count')?.textContent ?? null)
      .filter(Boolean)
      .sort()
    expect(counts).toEqual(['×2', '×3'])
  })

  test('toggling fold mode off mid-stream stops folding new arrivals while keeping the current ×N badge until prune', async () => {
    customChatFoldMode.value = true
    startCustomChatDom()

    emitCustomChatEvent(danmakuEvent('666666', '400'))
    emitCustomChatEvent(danmakuEvent('666666', '401'))
    await flushDom()

    expect(rows().length).toBe(1)
    expect(root().querySelector<HTMLElement>('.lc-chat-merge-count')?.textContent).toBe('×2')

    customChatFoldMode.value = false
    emitCustomChatEvent(danmakuEvent('666666', '402'))
    await flushDom()

    // Fold-mode badge stays on the original row; the new arrival becomes its own row.
    expect(rows().length).toBe(2)
    const badges = rows().map(row => row.querySelector<HTMLElement>('.lc-chat-merge-count')?.textContent ?? null)
    expect(badges).toContain('×2')
    expect(badges.filter(b => b !== null).length).toBe(1)
  })
})

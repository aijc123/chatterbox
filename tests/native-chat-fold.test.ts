// Coverage for `src/lib/native-chat-fold.ts` — collapses repeated native
// danmaku rows into a single row with an ×N badge.
//
// Test plan:
//   - off by default: starting/stopping leaves DOM untouched and adds no badges
//   - cross-user duplicates within 9s: only the first row visible, badge counts up
//   - distinct texts: each gets its own row, no badges
//   - 9s window: a duplicate after the window starts a fresh row
//   - stop(): badges are removed, hidden rows reappear, internal state is clean

import { Window } from 'happy-dom'

const happyWindow = new Window()
;(happyWindow as unknown as { SyntaxError: SyntaxErrorConstructor }).SyntaxError = SyntaxError

type TestMutationRecord = Pick<MutationRecord, 'addedNodes'>

class TestMutationObserver {
  static instances: TestMutationObserver[] = []
  private target: Node | null = null

  constructor(private readonly callback: MutationCallback) {
    TestMutationObserver.instances.push(this)
  }

  observe(target: Node): void {
    this.target = target
  }

  disconnect(): void {
    this.target = null
  }

  emit(target: Node, addedNodes: Node[]): void {
    if (this.target !== target) return
    this.callback([{ addedNodes: addedNodes as unknown as NodeList } as TestMutationRecord as MutationRecord], this)
  }
}

Object.assign(globalThis, {
  document: happyWindow.document,
  HTMLElement: happyWindow.HTMLElement,
  HTMLImageElement: happyWindow.HTMLImageElement,
  Node: happyWindow.Node,
  MutationObserver: TestMutationObserver,
  window: happyWindow,
})

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  unsafeWindow: globalThis,
}))

const { _resetNativeChatFoldStateForTests, startNativeChatFold, stopNativeChatFold } = await import(
  '../src/lib/native-chat-fold'
)

function makeRow(text: string, uid = '1'): HTMLElement {
  const node = document.createElement('div')
  node.className = 'chat-item danmaku-item'
  node.dataset.danmaku = text
  node.dataset.replymid = '0'
  node.dataset.uid = uid
  // Right-side container — the badge should be inserted before this if present.
  const right = document.createElement('div')
  right.className = 'danmaku-item-right'
  right.textContent = '12:00'
  node.append(right)
  return node
}

function setupContainer(): HTMLElement {
  const container = document.createElement('div')
  container.className = 'chat-items'
  document.body.append(container)
  return container
}

function appendObserved(container: HTMLElement, node: HTMLElement): void {
  container.append(node)
  for (const observer of TestMutationObserver.instances) {
    observer.emit(container, [node])
  }
}

async function flushDom(ms = 30): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

beforeEach(() => {
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  TestMutationObserver.instances = []
  _resetNativeChatFoldStateForTests()
})

afterEach(() => {
  stopNativeChatFold()
  document.body.innerHTML = ''
  document.head.innerHTML = ''
  TestMutationObserver.instances = []
})

describe('native-chat-fold', () => {
  test('without the module started, no badges are injected', async () => {
    const container = setupContainer()
    appendObserved(container, makeRow('666666', '1'))
    appendObserved(container, makeRow('666666', '2'))
    await flushDom()

    expect(container.querySelectorAll('.lc-native-fold-count').length).toBe(0)
    expect(container.querySelectorAll('[data-lc-native-fold-hidden="1"]').length).toBe(0)
  })

  test('cross-user duplicates collapse: first row keeps a ×N badge, later rows are hidden', async () => {
    const container = setupContainer()
    startNativeChatFold()
    await flushDom()

    const first = makeRow('666666', '101')
    const second = makeRow('666666', '102')
    const third = makeRow('666666', '103')
    appendObserved(container, first)
    appendObserved(container, second)
    appendObserved(container, third)
    await flushDom()

    expect(first.getAttribute('data-lc-native-fold-hidden')).toBeNull()
    expect(second.getAttribute('data-lc-native-fold-hidden')).toBe('1')
    expect(third.getAttribute('data-lc-native-fold-hidden')).toBe('1')

    const badge = first.querySelector<HTMLElement>('.lc-native-fold-count')
    expect(badge?.textContent).toBe('×3')
    // Badge is appended *inside* the right-side text container as its LAST
    // child, so it renders as "name：text ×N" (not "name：×N text").
    const right = first.querySelector('.danmaku-item-right')
    expect(badge?.parentElement).toBe(right)
    expect(right?.lastElementChild).toBe(badge)
  })

  test('distinct texts keep their own rows and no badges appear when nothing repeats', async () => {
    const container = setupContainer()
    startNativeChatFold()
    await flushDom()

    appendObserved(container, makeRow('你好主播', '201'))
    appendObserved(container, makeRow('精彩', '202'))
    appendObserved(container, makeRow('666666', '203'))
    await flushDom()

    expect(container.querySelectorAll('[data-lc-native-fold-hidden="1"]').length).toBe(0)
    expect(container.querySelectorAll('.lc-native-fold-count').length).toBe(0)
  })

  test('different-length wheels of the same char ("666" and "66666") fold into one row via wheelFoldKey', async () => {
    const container = setupContainer()
    startNativeChatFold()
    await flushDom()

    const first = makeRow('666', '601')
    const second = makeRow('66666', '602')
    const third = makeRow('6666', '603')
    appendObserved(container, first)
    appendObserved(container, second)
    appendObserved(container, third)
    await flushDom()

    expect(first.getAttribute('data-lc-native-fold-hidden')).toBeNull()
    expect(second.getAttribute('data-lc-native-fold-hidden')).toBe('1')
    expect(third.getAttribute('data-lc-native-fold-hidden')).toBe('1')
    expect(first.querySelector<HTMLElement>('.lc-native-fold-count')?.textContent).toBe('×3')
  })

  test('a duplicate after the 9s window starts a fresh row instead of folding', async () => {
    const container = setupContainer()
    startNativeChatFold()
    await flushDom()

    const realNow = Date.now
    let mockedNow = 1_000_000
    Date.now = () => mockedNow

    try {
      appendObserved(container, makeRow('lateblock', '301'))
      // Flush so the debounced handler reads the current mocked time *before*
      // we advance it; otherwise both rows process in one batch at the later
      // timestamp and look like an in-window duplicate.
      await flushDom()
      mockedNow += 12_000
      const second = makeRow('lateblock', '302')
      appendObserved(container, second)
      await flushDom()

      // 12s later → no merge
      expect(second.getAttribute('data-lc-native-fold-hidden')).toBeNull()
      expect(container.querySelectorAll('.lc-native-fold-count').length).toBe(0)
    } finally {
      Date.now = realNow
    }
  })

  test('stop() removes badges, un-hides hidden rows, and clears state', async () => {
    const container = setupContainer()
    startNativeChatFold()
    await flushDom()

    appendObserved(container, makeRow('折叠后停止', '401'))
    appendObserved(container, makeRow('折叠后停止', '402'))
    await flushDom()
    expect(container.querySelectorAll('.lc-native-fold-count').length).toBe(1)
    expect(container.querySelectorAll('[data-lc-native-fold-hidden="1"]').length).toBe(1)

    stopNativeChatFold()

    expect(container.querySelectorAll('.lc-native-fold-count').length).toBe(0)
    expect(container.querySelectorAll('[data-lc-native-fold-hidden="1"]').length).toBe(0)
    expect(document.getElementById('lc-native-fold-style')).toBeNull()
  })
})

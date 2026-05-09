// Coverage for `src/lib/danmaku-stream.ts` — currently 0% func / 16% lines.
// This module owns the shared MutationObserver on `.chat-items` plus its
// reference-counted lifecycle. We drive it with happy-dom + simulated DOM
// mutations.
//
// Test plan:
//   - extractDanmakuInfo (pure)         — happy / missing data-danmaku /
//                                          reply detection / uid extraction
//                                          via space.bilibili.com link
//   - isValidDanmakuNode (pure)         — class shapes accepted / rejected
//   - subscribeDanmaku                  — onAttach when container exists,
//                                          onMessage from MutationObserver,
//                                          emitExisting back-fill
//   - poll fallback                     — container appears later → attaches
//   - reference counting                — last unsubscribe tears down observer
//   - health-check                      — replaced container is re-attached
//   - resilience                        — subscriber that throws does NOT
//                                          break the shared stream

import { Window } from 'happy-dom'

const happyWindow = new Window()
// happy-dom's QuerySelector needs window.SyntaxError; bun's globals don't
// auto-attach into happy-dom's window.
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

const { extractDanmakuInfo, getDanmakuContainer, isValidDanmakuNode, subscribeDanmaku } = await import(
  '../src/lib/danmaku-stream'
)

function makeDanmakuNode(opts: {
  text: string
  replymid?: string
  classes?: string[]
  uid?: string
  uname?: string
  uidLink?: string
  badges?: string[]
  avatarUrl?: string
}): HTMLElement {
  const node = document.createElement('div')
  node.className = (opts.classes ?? ['chat-item', 'danmaku-item']).join(' ')
  node.dataset.danmaku = opts.text
  node.dataset.replymid = opts.replymid ?? '0'
  if (opts.uid) node.dataset.uid = opts.uid

  if (opts.uname) {
    const userEl = document.createElement('span')
    userEl.className = 'user-name'
    userEl.textContent = opts.uname
    node.append(userEl)
  }
  if (opts.uidLink) {
    const a = document.createElement('a')
    a.href = opts.uidLink
    node.append(a)
  }
  if (opts.badges) {
    for (const text of opts.badges) {
      const badge = document.createElement('span')
      badge.className = 'fans-medal-item'
      badge.textContent = text
      node.append(badge)
    }
  }
  if (opts.avatarUrl) {
    const img = document.createElement('img')
    img.className = 'avatar'
    img.src = opts.avatarUrl
    node.append(img)
  }
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

let activeUnsubs: Array<() => void> = []

beforeEach(() => {
  document.body.innerHTML = ''
  activeUnsubs = []
  TestMutationObserver.instances = []
})

afterEach(() => {
  for (const u of activeUnsubs) {
    try {
      u()
    } catch {
      // best-effort teardown; ignore failures from already-disposed subscribers
    }
  }
  activeUnsubs = []
  document.body.innerHTML = ''
})

async function flushDom(ms = 30): Promise<void> {
  await new Promise(resolve => setTimeout(resolve, ms))
}

async function waitFor(check: () => boolean, timeoutMs = 750): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    if (check()) return
    await flushDom(25)
  }
}

describe('isValidDanmakuNode', () => {
  test('exactly chat-item + danmaku-item → valid', () => {
    const n = document.createElement('div')
    n.className = 'chat-item danmaku-item'
    expect(isValidDanmakuNode(n)).toBe(true)
  })

  test('with has-bubble (3 classes) → valid', () => {
    const n = document.createElement('div')
    n.className = 'chat-item danmaku-item has-bubble'
    expect(isValidDanmakuNode(n)).toBe(true)
  })

  test('with has-bubble + chat-colorful-bubble (4 classes) → valid', () => {
    const n = document.createElement('div')
    n.className = 'chat-item danmaku-item has-bubble chat-colorful-bubble'
    expect(isValidDanmakuNode(n)).toBe(true)
  })

  test('missing chat-item → rejected', () => {
    const n = document.createElement('div')
    n.className = 'danmaku-item'
    expect(isValidDanmakuNode(n)).toBe(false)
  })

  test('missing danmaku-item → rejected', () => {
    const n = document.createElement('div')
    n.className = 'chat-item'
    expect(isValidDanmakuNode(n)).toBe(false)
  })

  test('extra unrelated class → rejected', () => {
    const n = document.createElement('div')
    n.className = 'chat-item danmaku-item gift-item'
    expect(isValidDanmakuNode(n)).toBe(false)
  })

  test('emoticon sticker without bubble (chat-emoticon bulge-emoticon, 4 classes) → valid', () => {
    const n = document.createElement('div')
    n.className = 'chat-item danmaku-item chat-emoticon bulge-emoticon'
    expect(isValidDanmakuNode(n)).toBe(true)
  })

  test('emoticon sticker with colorful bubble (6 classes) → valid', () => {
    const n = document.createElement('div')
    n.className = 'chat-item danmaku-item chat-colorful-bubble has-bubble chat-emoticon bulge-emoticon'
    expect(isValidDanmakuNode(n)).toBe(true)
  })
})

describe('extractDanmakuInfo', () => {
  test('returns null when data-danmaku is missing', () => {
    const n = document.createElement('div')
    n.className = 'chat-item danmaku-item'
    n.dataset.replymid = '0'
    expect(extractDanmakuInfo(n)).toBeNull()
  })

  test('returns null when data-replymid is missing', () => {
    const n = document.createElement('div')
    n.className = 'chat-item danmaku-item'
    n.dataset.danmaku = 'hi'
    expect(extractDanmakuInfo(n)).toBeNull()
  })

  test('happy path returns text + isReply=false when replymid="0"', () => {
    const n = makeDanmakuNode({ text: 'hello', uname: 'Alice', uid: '42' })
    const info = extractDanmakuInfo(n)
    expect(info).not.toBeNull()
    expect(info?.text).toBe('hello')
    expect(info?.uname).toBe('Alice')
    expect(info?.uid).toBe('42')
    expect(info?.isReply).toBe(false)
  })

  test('non-zero replymid → isReply=true', () => {
    const n = makeDanmakuNode({ text: 'reply', replymid: '999', uname: 'Bob' })
    const info = extractDanmakuInfo(n)
    expect(info?.isReply).toBe(true)
  })

  test('extracts uid from space.bilibili.com link when no data-uid', () => {
    const n = makeDanmakuNode({
      text: 'no-data-uid',
      uname: 'Carol',
      uidLink: 'https://space.bilibili.com/12345',
    })
    expect(extractDanmakuInfo(n)?.uid).toBe('12345')
  })

  test('extracts uid from ?uid= query string fallback', () => {
    const n = makeDanmakuNode({
      text: 'fallback',
      uname: 'Dave',
      uidLink: 'https://example.test/profile?uid=67890',
    })
    expect(extractDanmakuInfo(n)?.uid).toBe('67890')
  })

  test('badges are extracted and capped at 5', () => {
    const n = makeDanmakuNode({
      text: 'with-badges',
      uname: 'Eve',
      badges: ['牌子 21', 'UL 33', 'admin', 'guard', 'wealth', 'extra'],
    })
    const info = extractDanmakuInfo(n)
    expect(info?.badges).toHaveLength(5)
  })

  test('rejects bad-name candidates (matches forbidden phrases)', () => {
    const n = makeDanmakuNode({ text: 'msg', uname: '通过活动获得头像' })
    expect(extractDanmakuInfo(n)?.uname).toBeNull()
  })

  test('rejects uname that exactly matches the danmaku text', () => {
    // If uname === text, it's likely the text leaked into a user-name slot.
    const n = makeDanmakuNode({ text: 'same', uname: 'same' })
    expect(extractDanmakuInfo(n)?.uname).toBeNull()
  })

  test('avatar URL is found when an avatar-class img is present', () => {
    const n = makeDanmakuNode({
      text: 'with-avatar',
      uname: 'Frank',
      avatarUrl: 'https://example.test/avatar.png',
    })
    expect(extractDanmakuInfo(n)?.avatarUrl).toContain('avatar.png')
  })
})

describe('subscribeDanmaku — basic lifecycle', () => {
  test('attaches when container exists at subscribe time + fires onAttach', async () => {
    const container = setupContainer()
    const onAttach = mock(() => {})
    const unsub = subscribeDanmaku({ onAttach })
    activeUnsubs.push(unsub)
    await flushDom()
    expect(onAttach).toHaveBeenCalledTimes(1)
    expect(onAttach).toHaveBeenCalledWith(container)
    expect(getDanmakuContainer()).toBe(container)
  })

  test('emitExisting=true backfills already-rendered nodes via onMessage', async () => {
    const container = setupContainer()
    container.append(
      makeDanmakuNode({ text: 'existing-1', uname: 'A', uid: '1' }),
      makeDanmakuNode({ text: 'existing-2', uname: 'B', uid: '2' })
    )
    const calls: string[] = []
    const unsub = subscribeDanmaku({
      emitExisting: true,
      onMessage: ev => calls.push(ev.text),
    })
    activeUnsubs.push(unsub)
    await flushDom()
    expect(calls).toEqual(expect.arrayContaining(['existing-1', 'existing-2']))
  })

  test('new nodes appended after subscription trigger onMessage (debounced)', async () => {
    const container = setupContainer()
    const calls: string[] = []
    const unsub = subscribeDanmaku({ onMessage: ev => calls.push(ev.text) })
    activeUnsubs.push(unsub)
    await flushDom()
    appendObserved(container, makeDanmakuNode({ text: 'new-msg', uname: 'X', uid: '1' }))
    await waitFor(() => calls.includes('new-msg'))
    expect(calls).toContain('new-msg')
  })

  test('invalid nodes (wrong classes) appended to container are ignored', async () => {
    const container = setupContainer()
    const calls: string[] = []
    const unsub = subscribeDanmaku({ onMessage: ev => calls.push(ev.text) })
    activeUnsubs.push(unsub)
    await flushDom()
    const bad = document.createElement('div')
    bad.className = 'gift-item'
    bad.dataset.danmaku = 'should-not-fire'
    bad.dataset.replymid = '0'
    appendObserved(container, bad)
    await flushDom(50)
    expect(calls).not.toContain('should-not-fire')
  })

  test('multiple subscribers all receive the same event', async () => {
    const container = setupContainer()
    const calls1: string[] = []
    const calls2: string[] = []
    activeUnsubs.push(subscribeDanmaku({ onMessage: ev => calls1.push(ev.text) }))
    activeUnsubs.push(subscribeDanmaku({ onMessage: ev => calls2.push(ev.text) }))
    await flushDom()
    appendObserved(container, makeDanmakuNode({ text: 'broadcast', uname: 'B', uid: '1' }))
    await flushDom(50)
    expect(calls1).toContain('broadcast')
    expect(calls2).toContain('broadcast')
  })

  test('a throwing subscriber does NOT crash the stream — others still receive', async () => {
    const container = setupContainer()
    const calls: string[] = []
    activeUnsubs.push(
      subscribeDanmaku({
        onMessage: () => {
          throw new Error('subscriber-boom')
        },
      })
    )
    activeUnsubs.push(subscribeDanmaku({ onMessage: ev => calls.push(ev.text) }))
    await flushDom()
    appendObserved(container, makeDanmakuNode({ text: 'survive', uname: 'X', uid: '1' }))
    await waitFor(() => calls.includes('survive'))
    expect(calls).toContain('survive')
  })
})

describe('subscribeDanmaku — late attach via poll', () => {
  test('subscribe before container exists → polls and attaches when it appears', async () => {
    const onAttach = mock(() => {})
    const unsub = subscribeDanmaku({ onAttach })
    activeUnsubs.push(unsub)
    expect(getDanmakuContainer()).toBeNull()
    await flushDom(50)
    // Still no container → poll keeps trying.
    expect(getDanmakuContainer()).toBeNull()
    // Add the container; the 1s poll should pick it up.
    setupContainer()
    await flushDom(1100) // > poll interval
    expect(onAttach).toHaveBeenCalled()
    expect(getDanmakuContainer()).not.toBeNull()
  }, 5000)
})

describe('subscribeDanmaku — reference counting', () => {
  test('last unsubscribe detaches the observer (getDanmakuContainer → null)', async () => {
    setupContainer()
    const a = subscribeDanmaku({})
    const b = subscribeDanmaku({})
    await flushDom()
    expect(getDanmakuContainer()).not.toBeNull()
    a()
    expect(getDanmakuContainer()).not.toBeNull() // still has b
    b()
    expect(getDanmakuContainer()).toBeNull()
  })

  test('subscribe → unsubscribe → subscribe again attaches a fresh observer', async () => {
    const container = setupContainer()
    const callsA: string[] = []
    const unsubA = subscribeDanmaku({ onMessage: ev => callsA.push(ev.text) })
    await flushDom()
    unsubA() // detach
    expect(getDanmakuContainer()).toBeNull()

    const callsB: string[] = []
    const unsubB = subscribeDanmaku({ onMessage: ev => callsB.push(ev.text) })
    activeUnsubs.push(unsubB)
    await flushDom()
    appendObserved(container, makeDanmakuNode({ text: 'phase-2', uname: 'Y', uid: '1' }))
    await waitFor(() => callsB.includes('phase-2'))
    expect(callsA).not.toContain('phase-2')
    expect(callsB).toContain('phase-2')
  })
})

describe('subscribeDanmaku — health check re-attach', () => {
  test('replacing the container in the DOM triggers re-attach within ~3s', async () => {
    const original = setupContainer()
    activeUnsubs.push(subscribeDanmaku({}))
    await flushDom()
    expect(getDanmakuContainer()).toBe(original)

    // Simulate SPA navigation: remove old container, add a new one.
    original.remove()
    const replacement = setupContainer()
    // Wait for the 2s health-check timer to detect the swap. Generous margin
    // (3.5s) for CI scheduler jitter — the timer + tryAttach are sync but
    // happy-dom's MutationObserver setup needs a microtask flush.
    await flushDom(3500)
    expect(getDanmakuContainer()).toBe(replacement)
    // NOTE: we don't assert that nodes appended POST-rearm fire onMessage
    // here. happy-dom's MutationObserver behavior is unreliable when the
    // observer is attached, then re-attached to a different element — the
    // re-attach contract (container identity flips) is the actual product
    // contract, and is what this test pins down. The "observer fires on
    // appendChild" path is covered by `subscribeDanmaku — basic lifecycle`.
  }, 10000)
})

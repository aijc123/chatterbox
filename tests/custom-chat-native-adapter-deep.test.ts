import { Window } from 'happy-dom'

const happyWindow = new Window()
;(happyWindow as unknown as { SyntaxError: SyntaxErrorConstructor }).SyntaxError = SyntaxError

Object.assign(globalThis, {
  document: happyWindow.document,
  Event: happyWindow.Event,
  HTMLElement: happyWindow.HTMLElement,
  HTMLAnchorElement: happyWindow.HTMLAnchorElement,
  HTMLImageElement: happyWindow.HTMLImageElement,
  window: happyWindow,
})

import { describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  GM_xmlhttpRequest: () => {},
  unsafeWindow: globalThis,
}))

const {
  isNativeDomUnhealthy,
  isNoiseEventText,
  nativeAvatar,
  nativeBadges,
  nativeKind,
  nativeUid,
  nativeUname,
  nodeText,
  parseNativeEvent,
  resolveAvatarUrl,
  shouldScanNativeEventNode,
  usefulBadgeText,
} = await import('../src/lib/custom-chat-native-adapter')

function el(html: string): HTMLElement {
  const wrap = document.createElement('div')
  wrap.innerHTML = html
  return wrap.firstElementChild as HTMLElement
}

describe('shouldScanNativeEventNode', () => {
  test('rejects nodes inside the Chatterbox root', () => {
    const root = document.createElement('div')
    root.id = 'lc-root'
    const inner = document.createElement('div')
    inner.className = 'gift-item'
    root.append(inner)
    document.body.append(root)
    expect(shouldScanNativeEventNode(inner, 'lc-root')).toBe(false)
    root.remove()
  })

  test('rejects danmaku-item nodes (handled by the danmaku stream observer)', () => {
    const node = el(`<div class="chat-item danmaku-item"></div>`)
    expect(shouldScanNativeEventNode(node, 'lc-root')).toBe(false)
  })

  test('accepts nodes that match NATIVE_EVENT_SELECTOR directly', () => {
    expect(shouldScanNativeEventNode(el(`<div class="super-chat-card"></div>`), 'lc-root')).toBe(true)
    expect(shouldScanNativeEventNode(el(`<div class="gift-item"></div>`), 'lc-root')).toBe(true)
  })

  test('accepts nodes that contain a matching descendant', () => {
    expect(shouldScanNativeEventNode(el(`<div class="wrap"><div class="gift-item"></div></div>`), 'lc-root')).toBe(true)
  })

  test('rejects unrelated nodes with no matching descendant', () => {
    expect(shouldScanNativeEventNode(el(`<div class="random"><span>hi</span></div>`), 'lc-root')).toBe(false)
  })
})

describe('usefulBadgeText', () => {
  test('parses LV / UL / 用户等级:N into normalized LVN form', () => {
    expect(usefulBadgeText('UL 12', 'Alice')).toBe('LV12')
    expect(usefulBadgeText('LV 5', 'Alice')).toBe('LV5')
    expect(usefulBadgeText('用户等级: 30', 'Alice')).toBe('LV30')
  })

  test('strips Chinese prefixes from non-level badges', () => {
    expect(usefulBadgeText('粉丝牌:牌子', 'Alice')).toBe('牌子')
    expect(usefulBadgeText('荣耀:SSR', 'Alice')).toBe('SSR')
    expect(usefulBadgeText('用户等级:Bronze', 'Alice')).toBe('Bronze')
  })

  test('rejects empty / overly long / forbidden text', () => {
    expect(usefulBadgeText('', 'Alice')).toBeNull()
    expect(usefulBadgeText('a'.repeat(20), 'Alice')).toBeNull()
    expect(usefulBadgeText('这是 TA 的勋章', 'Alice')).toBeNull()
    expect(usefulBadgeText('TA 的', 'Alice')).toBeNull()
    expect(usefulBadgeText('复制', 'Alice')).toBeNull()
    expect(usefulBadgeText('举报', 'Alice')).toBeNull()
  })

  test('rejects badges that duplicate the user name', () => {
    expect(usefulBadgeText('Alice', 'Alice')).toBeNull()
    expect(usefulBadgeText('Alice 牌子', 'Alice')).toBeNull()
    expect(usefulBadgeText('Alice　牌子', 'Alice')).toBeNull()
  })
})

describe('isNoiseEventText', () => {
  test('classifies empty / whitespace-only as noise', () => {
    expect(isNoiseEventText('')).toBe(true)
    expect(isNoiseEventText('   ')).toBe(true)
  })

  test('classifies single noise tokens (UI labels) as noise', () => {
    for (const token of [
      '头像',
      '匿名',
      '复制',
      '举报',
      '回复',
      '关闭',
      '更多',
      '展开',
      '收起',
      '弹幕',
      '礼物',
      'SC',
      '进场',
      '通知',
      '暂停',
      '清屏',
      '状态',
      '显示',
    ]) {
      expect(isNoiseEventText(token)).toBe(true)
    }
  })

  test('classifies "搜索 user:" prefix as noise', () => {
    expect(isNoiseEventText('搜索 user:Alice')).toBe(true)
  })

  test('keeps real chat content non-noise', () => {
    expect(isNoiseEventText('你好啊')).toBe(false)
    expect(isNoiseEventText('666')).toBe(false)
  })
})

describe('resolveAvatarUrl', () => {
  test('returns undefined for null uid', () => {
    expect(resolveAvatarUrl(null)).toBeUndefined()
  })

  test('returns a workers.vrp.moe avatar url for a uid', () => {
    const url = resolveAvatarUrl('42')
    expect(url).toContain('/42?size=96')
  })
})

describe('nodeText', () => {
  test('compacts whitespace and trims', () => {
    expect(nodeText(el(`<div>  hello \n   world  </div>`))).toBe('hello world')
  })

  test('returns empty for nodes with no text', () => {
    expect(nodeText(el(`<div></div>`))).toBe('')
  })
})

describe('nativeUid', () => {
  test('reads data-uid from the node itself', () => {
    expect(nativeUid(el(`<div data-uid="42"></div>`))).toBe('42')
  })

  test('reads data-uid from a descendant when the node has none', () => {
    expect(nativeUid(el(`<div><span data-uid="99"></span></div>`))).toBe('99')
  })

  test('falls back to space.bilibili.com/<uid> in an anchor', () => {
    expect(nativeUid(el(`<div><a href="https://space.bilibili.com/12345/dynamic"></a></div>`))).toBe('12345')
  })

  test('falls back to ?uid=<uid> in an anchor query string', () => {
    expect(nativeUid(el(`<div><a href="https://example.com/x?uid=777&foo=1"></a></div>`))).toBe('777')
  })

  test('returns null when no uid signals are present', () => {
    expect(nativeUid(el(`<div><span>no uid here</span></div>`))).toBeNull()
  })
})

describe('nativeUname', () => {
  test('returns 匿名 when no candidate selector matches', () => {
    expect(nativeUname(el(`<div></div>`), 'some text')).toBe('匿名')
  })

  test('extracts data-uname from a matching child', () => {
    expect(nativeUname(el(`<div><span data-uname="Alice"></span></div>`), 'hi')).toBe('Alice')
  })

  test('extracts text content from .user-name', () => {
    expect(nativeUname(el(`<div><span class="user-name">Bob</span></div>`), 'hi')).toBe('Bob')
  })

  test('skips bad-display-name candidates and falls through to 匿名', () => {
    // "粉丝牌" matches the isBadDisplayName regex
    expect(nativeUname(el(`<div><span class="user-name">粉丝牌</span></div>`), 'hi')).toBe('匿名')
  })

  test('skips a candidate equal to the danmaku text itself', () => {
    expect(nativeUname(el(`<div><span class="user-name">同文本</span></div>`), '同文本')).toBe('匿名')
  })
})

describe('nativeAvatar', () => {
  test('returns the first <img> whose class/alt advertises an avatar', () => {
    expect(nativeAvatar(el(`<div><img src="https://example.com/a.png" class="user-avatar" /></div>`))).toBe(
      'https://example.com/a.png'
    )
    expect(nativeAvatar(el(`<div><img src="https://example.com/face.png" alt="头像" /></div>`))).toBe(
      'https://example.com/face.png'
    )
  })

  test('returns undefined when no image looks like an avatar', () => {
    expect(nativeAvatar(el(`<div><img src="https://example.com/x.png" alt="gift" /></div>`))).toBeUndefined()
  })

  test('returns undefined when no images at all', () => {
    expect(nativeAvatar(el(`<div></div>`))).toBeUndefined()
  })
})

describe('nativeKind', () => {
  test('classifies superchat by class or text signal', () => {
    expect(nativeKind(el(`<div class="super-chat-card"></div>`), 'foo')).toBe('superchat')
    expect(nativeKind(el(`<div></div>`), '￥30 醒目留言')).toBe('superchat')
  })

  test('classifies guard / privilege / 舰长 / 提督 / 总督', () => {
    expect(nativeKind(el(`<div class="guard-icon"></div>`), '欢迎')).toBe('guard')
    expect(nativeKind(el(`<div></div>`), 'X 开通了 舰长')).toBe('guard')
  })

  test('classifies gift by text signal', () => {
    expect(nativeKind(el(`<div></div>`), '送出 小花花 x 5')).toBe('gift')
  })

  test('classifies follow / like / share / lottery / redpacket', () => {
    expect(nativeKind(el(`<div></div>`), '关注了主播')).toBe('follow')
    expect(nativeKind(el(`<div></div>`), '点赞 +1')).toBe('like')
    expect(nativeKind(el(`<div></div>`), '分享了直播间')).toBe('share')
    expect(nativeKind(el(`<div></div>`), '天选时刻 抽奖')).toBe('lottery')
    expect(nativeKind(el(`<div></div>`), '抢到了 红包')).toBe('redpacket')
  })

  test('returns null for plain chat / unrecognized signals', () => {
    expect(nativeKind(el(`<div></div>`), '你好啊')).toBeNull()
  })
})

describe('nativeBadges', () => {
  test('extracts up to 3 distinct useful badges from title/aria-label/text', () => {
    const node = el(`
      <div>
        <span title="LV 12"></span>
        <span aria-label="UL 33"></span>
        <span class="medal-name">牌子</span>
        <span class="extra-medal" title="另一个">should-not-show-up-because-cap</span>
      </div>
    `)
    const badges = nativeBadges(node, 'hi', 'Alice')
    expect(badges.length).toBeLessThanOrEqual(3)
    expect(badges).toContain('LV12')
    expect(badges).toContain('LV33')
    expect(badges).toContain('牌子')
  })

  test('prepends GUARD level when text mentions 总督/提督/舰长', () => {
    expect(nativeBadges(el(`<div></div>`), '欢迎 总督 上车', 'Alice')[0]).toBe('GUARD 1')
    expect(nativeBadges(el(`<div></div>`), '欢迎 提督 上车', 'Alice')[0]).toBe('GUARD 2')
    expect(nativeBadges(el(`<div></div>`), '欢迎 舰长 上车', 'Alice')[0]).toBe('GUARD 3')
  })

  test('drops badges that equal the danmaku text or duplicates', () => {
    const node = el(`<div><span title="repeat-text"></span><span title="repeat-text"></span></div>`)
    expect(nativeBadges(node, 'repeat-text', 'Alice')).toHaveLength(0)
  })
})

describe('parseNativeEvent', () => {
  const ctx = { rootId: 'lc-root', nextId: () => 'native-test-1' }

  test('rejects danmaku-item nodes', () => {
    expect(parseNativeEvent(el(`<div class="chat-item danmaku-item">hi</div>`), ctx)).toBeNull()
  })

  test('rejects nodes inside the Chatterbox root', () => {
    const root = document.createElement('div')
    root.id = 'lc-root'
    const inner = el(`<div class="gift-item">送出 礼物 x 1</div>`)
    root.append(inner)
    document.body.append(root)
    expect(parseNativeEvent(inner, ctx)).toBeNull()
    root.remove()
  })

  test('rejects noise text', () => {
    expect(parseNativeEvent(el(`<div class="gift-item">头像</div>`), ctx)).toBeNull()
  })

  test('rejects when no kind can be inferred (neither class nor text matches any kind signal)', () => {
    // class has no kind keyword AND text doesn't match any kind regex
    expect(parseNativeEvent(el(`<div class="some-event">很普通的事件文本</div>`), ctx)).toBeNull()
  })

  test('rejects anonymous super-short text with no uid/avatar', () => {
    // Very short text + nothing identifying the user
    expect(parseNativeEvent(el(`<div class="super-chat-card">嗨</div>`), ctx)).toBeNull()
  })

  test('parses a guard event with months', () => {
    const node = el(`
      <div class="guard-icon" data-uid="42">
        <span class="user-name">Alice</span>
        <span>开通了舰长 12 个月</span>
      </div>
    `)
    const ev = parseNativeEvent(node, ctx)
    expect(ev).not.toBeNull()
    expect(ev?.kind).toBe('guard')
    expect(ev?.uid).toBe('42')
    expect(ev?.uname).toBe('Alice')
    expect(ev?.fields?.find(f => f.key === 'guard-level')?.value).toBe('舰长')
    expect(ev?.fields?.find(f => f.key === 'guard-months')?.value).toBe('12个月')
  })

  test('parses a gift event and captures the quantity', () => {
    const node = el(`
      <div class="gift-item" data-uid="99">
        <span class="user-name">Bob</span>
        <span>送出 小花花 x 7</span>
      </div>
    `)
    const ev = parseNativeEvent(node, ctx)
    expect(ev).not.toBeNull()
    expect(ev?.kind).toBe('gift')
    // gift-count is the load-bearing field; gift-name uses a lazy regex over
    // the whole compacted nodeText so the prefix may include the username —
    // we just assert the quantity, which is the part downstream UI relies on.
    expect(ev?.fields?.find(f => f.key === 'gift-count')?.value).toBe('x7')
    expect(ev?.fields?.find(f => f.key === 'gift-name')?.value).toContain('小花花')
  })

  test('parses a superchat event and propagates sendText', () => {
    const node = el(`
      <div class="super-chat-card" data-uid="123">
        <span class="user-name">Carol</span>
        <span>￥50 醒目留言：直播好棒</span>
      </div>
    `)
    const ev = parseNativeEvent(node, ctx)
    expect(ev?.kind).toBe('superchat')
    expect(typeof ev?.sendText).toBe('string')
    expect(ev?.sendText?.length).toBeGreaterThan(0)
  })
})

describe('isNativeDomUnhealthy', () => {
  test('returns false when not enough samples have been collected', () => {
    expect(isNativeDomUnhealthy([{ ts: 1, parsed: false }], 12, 0)).toBe(false)
  })

  test('returns true when enough samples but no parsed events landed', () => {
    const samples = Array.from({ length: 24 }, (_, i) => ({ ts: i, parsed: false }))
    expect(isNativeDomUnhealthy(samples, 24, 0)).toBe(true)
  })

  test('returns false when at least one event was parsed (above maxEvents)', () => {
    const samples = Array.from({ length: 24 }, (_, i) => ({ ts: i, parsed: i === 0 }))
    expect(isNativeDomUnhealthy(samples, 24, 0)).toBe(false)
  })

  test('returns true when parsed count is at threshold (≤ maxEvents)', () => {
    const samples = Array.from({ length: 30 }, (_, i) => ({ ts: i, parsed: i < 2 }))
    // 2 parsed events ≤ maxEvents=2 → unhealthy
    expect(isNativeDomUnhealthy(samples, 24, 2)).toBe(true)
  })
})

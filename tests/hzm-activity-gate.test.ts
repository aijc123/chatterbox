import { beforeEach, describe, expect, mock, test } from 'bun:test'

const gmStore = new Map<string, unknown>()

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: (key: string) => {
    gmStore.delete(key)
  },
  GM_getValue: <T>(key: string, defaultValue: T): T => (gmStore.has(key) ? (gmStore.get(key) as T) : defaultValue),
  GM_info: { script: { version: 'test' } },
  GM_setValue: (key: string, value: unknown) => {
    gmStore.set(key, value)
  },
  GM_xmlhttpRequest: () => {},
  unsafeWindow: globalThis,
}))

const { isActivityGateOpen } = await import('../src/lib/hzm-auto-drive')
const { hzmActivityMinDanmu, hzmActivityMinDistinctUsers, hzmActivityWindowSec } = await import('../src/lib/store-hzm')

const NOW = 1_700_000_000_000

describe('isActivityGateOpen', () => {
  beforeEach(() => {
    // 默认值与 store 一致：window=45s, minDanmu=3, minDistinctUsers=2
    hzmActivityWindowSec.value = 45
    hzmActivityMinDanmu.value = 3
    hzmActivityMinDistinctUsers.value = 2
  })

  test('空房间：闸门关', () => {
    expect(isActivityGateOpen(NOW, [])).toBe(false)
  })

  test('达到弹幕数 + 不同 uid 数 → 闸门开', () => {
    const records = [
      { ts: NOW - 10_000, text: 'a', uid: 'u1' },
      { ts: NOW - 5_000, text: 'b', uid: 'u2' },
      { ts: NOW - 1_000, text: 'c', uid: 'u3' },
    ]
    expect(isActivityGateOpen(NOW, records)).toBe(true)
  })

  test('一人独刷：弹幕数够 但 distinct uid 不够 → 闸门关', () => {
    // 同一个 uid 刷了 5 条 → uniqueUsers=1，min=2，gate=false
    const records = Array.from({ length: 5 }, (_, i) => ({
      ts: NOW - i * 1000,
      text: `刷${i}`,
      uid: 'samebot',
    }))
    expect(isActivityGateOpen(NOW, records)).toBe(false)
  })

  test('够人数但弹幕数不够 → 闸门关', () => {
    // 2 个不同 uid 但只有 2 条 → minDanmu=3 不满足
    const records = [
      { ts: NOW - 5_000, text: 'a', uid: 'u1' },
      { ts: NOW - 1_000, text: 'b', uid: 'u2' },
    ]
    expect(isActivityGateOpen(NOW, records)).toBe(false)
  })

  test('窗口外的弹幕被剔除 → 旧弹幕不算', () => {
    // 窗口 45s；都是 60s 前的，应被全部剔除
    const records = [
      { ts: NOW - 60_000, text: 'a', uid: 'u1' },
      { ts: NOW - 55_000, text: 'b', uid: 'u2' },
      { ts: NOW - 50_000, text: 'c', uid: 'u3' },
    ]
    expect(isActivityGateOpen(NOW, records)).toBe(false)
  })

  test('uid 为 null 的不算 distinct user，但仍算弹幕数', () => {
    // 3 条弹幕，2 条有 uid（u1, u2），1 条 uid=null
    // distinct uids = {u1, u2}.size = 2 ≥ 2 ✓
    // count = 3 ≥ 3 ✓
    const records = [
      { ts: NOW - 5_000, text: 'a', uid: 'u1' },
      { ts: NOW - 3_000, text: 'b', uid: 'u2' },
      { ts: NOW - 1_000, text: 'c', uid: null },
    ]
    expect(isActivityGateOpen(NOW, records)).toBe(true)
  })

  test('全 null uid：distinct=0 → 闸门关，即使弹幕数够', () => {
    const records = [
      { ts: NOW - 5_000, text: 'a', uid: null },
      { ts: NOW - 3_000, text: 'b', uid: null },
      { ts: NOW - 1_000, text: 'c', uid: null },
    ]
    expect(isActivityGateOpen(NOW, records)).toBe(false)
  })

  test('阈值跟随 store：把 minDistinctUsers 调到 1 后允许独人活跃', () => {
    hzmActivityMinDistinctUsers.value = 1
    const records = [
      { ts: NOW - 3_000, text: 'a', uid: 'u1' },
      { ts: NOW - 2_000, text: 'b', uid: 'u1' },
      { ts: NOW - 1_000, text: 'c', uid: 'u1' },
    ]
    expect(isActivityGateOpen(NOW, records)).toBe(true)
  })

  test('阈值跟随 store：把 windowSec 调小后旧弹幕不算', () => {
    hzmActivityWindowSec.value = 5 // 5s 窗口
    const records = [
      { ts: NOW - 10_000, text: 'a', uid: 'u1' },
      { ts: NOW - 8_000, text: 'b', uid: 'u2' },
      { ts: NOW - 6_000, text: 'c', uid: 'u3' },
    ]
    expect(isActivityGateOpen(NOW, records)).toBe(false)
  })
})

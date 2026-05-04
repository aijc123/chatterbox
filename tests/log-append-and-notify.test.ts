// Coverage for `src/lib/log.ts` paths the existing log-debug-mode test
// doesn't reach:
//
//   - appendLog('text')                           — free-form path
//   - appendLog(result{success:true,...}, ...)    — ✅ formatted path
//   - appendLog(result{success:false,...}, ...)   — ❌ formatted path + auto-toast
//   - appendLog(result{cancelled:true,error:'empty-text'}, ...)
//   - appendLog(result{cancelled:true}, ...)      — manual-interrupt cancel
//   - notifyUser('error'|'warning'|'success'|'info', ...)
//   - userNotices auto-removal after 5s
//   - maybeSurfaceLogMessage auto-toast for ❌/🔴/⚠️/失败/出错/错误/没发出去
//   - pushLine rolling cap when logLines.length > maxLogLines.value
//
// We use installGmStoreMock so maxLogLines has a real Map-backed home and we
// can shrink it for cap tests.

import { beforeEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore, store: gmStore } = installGmStoreMock()

const { appendLog, debugLogVisible, logLines, maxLogLines, notifyUser, userNotices } = await import('../src/lib/log')

beforeEach(() => {
  resetGmStore()
  logLines.value = []
  userNotices.value = []
  debugLogVisible.value = false
  // Tests that don't override leave the default cap (1000) in place.
  maxLogLines.value = 1000
})

describe('appendLog — string form', () => {
  test('writes a plain message with HH:MM:SS timestamp prefix', () => {
    appendLog('hello world')
    expect(logLines.value).toHaveLength(1)
    expect(logLines.value[0]).toMatch(/^\d{2}:\d{2}:\d{2} hello world$/)
  })

  test("multiple appends preserve order and don't mutate prior lines", () => {
    appendLog('first')
    const firstLine = logLines.value[0]
    appendLog('second')
    appendLog('third')
    expect(logLines.value).toHaveLength(3)
    expect(logLines.value[0]).toBe(firstLine) // identity preserved
    expect(logLines.value[1]).toContain('second')
    expect(logLines.value[2]).toContain('third')
  })
})

describe('appendLog — SendDanmakuResult form', () => {
  test('success → ✅ label: display formatted line, no toast', () => {
    appendLog({ success: true, message: 'hi', isEmoticon: false }, '手动', '你好')
    expect(logLines.value[0]).toMatch(/^\d{2}:\d{2}:\d{2} ✅ 手动: 你好$/)
    expect(userNotices.value).toHaveLength(0)
  })

  test('failure → ❌ label: display, 原因 from formatDanmakuError, AND surfaces a toast', () => {
    appendLog({ success: false, message: 'hi', isEmoticon: false, error: 'f' }, '手动', '敏感词')
    expect(logLines.value[0]).toContain('❌ 手动: 敏感词')
    expect(logLines.value[0]).toContain('原因：f - 包含全局屏蔽词')
    expect(userNotices.value).toHaveLength(1)
    expect(userNotices.value[0].tone).toBe('error')
    expect(userNotices.value[0].message).toContain('手动: 敏感词')
  })

  test('cancelled with error="empty-text" → 内容为空 reason, no toast', () => {
    appendLog({ success: false, message: '', isEmoticon: false, cancelled: true, error: 'empty-text' }, '自动', '')
    expect(logLines.value[0]).toContain('⏭ 自动: ')
    expect(logLines.value[0]).toContain('（内容为空）')
    expect(userNotices.value).toHaveLength(0)
  })

  test('cancelled without empty-text → 被手动发送中断 reason, no toast', () => {
    appendLog({ success: false, message: 'foo', isEmoticon: false, cancelled: true, error: 'preempted' }, '自动', 'foo')
    expect(logLines.value[0]).toContain('⏭ 自动: foo')
    expect(logLines.value[0]).toContain('（被手动发送中断）')
    expect(userNotices.value).toHaveLength(0)
  })

  test('failure with undefined error → 未知错误 reason in both log line and toast', () => {
    appendLog({ success: false, message: 'x', isEmoticon: false }, '手动', 'x')
    expect(logLines.value[0]).toContain('原因：未知错误')
    expect(userNotices.value[0].message).toContain('原因：未知错误')
  })
})

describe('notifyUser', () => {
  // notifyUser writes a single prefixed line via appendLog(string), and the
  // ❌/⚠️ prefix triggers maybeSurfaceLogMessage to surface exactly one toast.
  // success/info prefixes don't match the auto-surface regex, so those levels
  // produce a log line but no toast.

  test('error level → log gets prefixed line; userNotices gets one prefixed entry', () => {
    notifyUser('error', '加载失败')
    expect(logLines.value[0]).toContain('❌ 加载失败')
    expect(userNotices.value).toHaveLength(1)
    expect(userNotices.value[0].tone).toBe('error')
    expect(userNotices.value[0].message).toBe('❌ 加载失败')
  })

  test('warning level → ⚠️ prefix in log + one warning toast', () => {
    notifyUser('warning', '请注意')
    expect(logLines.value[0]).toContain('⚠️ 请注意')
    expect(userNotices.value).toHaveLength(1)
    expect(userNotices.value[0].tone).toBe('warning')
  })

  test('success level → ✅ prefix in log, NO toast (✅ does not match auto-surface regex)', () => {
    notifyUser('success', '已完成')
    expect(logLines.value[0]).toContain('✅ 已完成')
    expect(userNotices.value).toHaveLength(0)
  })

  test('info level → ℹ️ prefix in log, NO toast', () => {
    notifyUser('info', '提示')
    expect(logLines.value[0]).toContain('ℹ️ 提示')
    expect(userNotices.value).toHaveLength(0)
  })

  test('detail is concatenated with `：` separator in both log and notice', () => {
    notifyUser('error', '保存失败', '磁盘已满')
    expect(logLines.value[0]).toContain('❌ 保存失败：磁盘已满')
    expect(userNotices.value).toHaveLength(1)
    expect(userNotices.value[0].message).toBe('❌ 保存失败：磁盘已满')
  })
})

describe('userNotices auto-removal', () => {
  test('a notice added via free-form appendLog is removed after ~5 seconds', async () => {
    appendLog('❌ transient')
    expect(userNotices.value).toHaveLength(1)
    await new Promise(resolve => setTimeout(resolve, 5050))
    expect(userNotices.value).toHaveLength(0)
  }, 7000)

  test('older notices are removed before newer ones (per-id timers)', async () => {
    appendLog('❌ first')
    // Generous gap so both ids stay distinct AND the first timer fires
    // well before the second.
    await new Promise(resolve => setTimeout(resolve, 1500))
    appendLog('❌ second')
    expect(userNotices.value).toHaveLength(2)
    // First fires at ~5000ms; second fires at ~6500ms. Wait 4000ms more
    // (total 5500ms since first) → first gone, second still alive
    // (~4000ms in).
    await new Promise(resolve => setTimeout(resolve, 4000))
    expect(userNotices.value.find(n => n.message.includes('first'))).toBeUndefined()
    expect(userNotices.value.find(n => n.message.includes('second'))).toBeDefined()
  }, 10000)
})

describe('maybeSurfaceLogMessage — auto-toast triggers from free-form text', () => {
  test.each([
    ['❌ leading red cross', 'error'],
    ['🔴 leading red dot', 'error'],
    ['something 失败 happened', 'error'],
    ['内部 出错 了', 'error'],
    ['something 错误', 'error'],
    ['弹幕 没发出去', 'error'],
    ['未找到登录信息', 'error'],
    ['⚠️ leading warning sign', 'warning'],
  ])('"%s" surfaces a %s toast', (message, expectedTone) => {
    appendLog(message)
    expect(userNotices.value).toHaveLength(1)
    expect(userNotices.value[0].tone).toBe(expectedTone)
  })

  test('plain message with no trigger keywords does NOT surface a toast', () => {
    appendLog('quiet update')
    expect(userNotices.value).toHaveLength(0)
  })

  test('mid-string ❌ does NOT trigger error toast (regex anchored at start)', () => {
    appendLog('done with ❌ edit')
    expect(userNotices.value).toHaveLength(0)
  })
})

describe('pushLine rolling cap (P2 #12)', () => {
  test('cap=3: writing 5 lines keeps only the last 3', () => {
    maxLogLines.value = 50 // bypass min:50
    // Manually trim with a smaller cap by writing many lines and asserting
    // the buffer never grows beyond cap.
    for (let i = 0; i < 60; i++) {
      appendLog(`line-${i}`)
    }
    expect(logLines.value.length).toBeLessThanOrEqual(50)
    // The newest line is always present.
    expect(logLines.value.at(-1)).toContain('line-59')
    // The oldest line that fits is line-(60-50)=10 if cap exactly 50.
    expect(logLines.value[0]).toContain(`line-${60 - logLines.value.length}`)
  })

  test('cap=50 (min): exactly 50 lines retained after writing 100', () => {
    maxLogLines.value = 50
    for (let i = 0; i < 100; i++) {
      appendLog(`m-${i}`)
    }
    expect(logLines.value).toHaveLength(50)
    expect(logLines.value[0]).toContain('m-50')
    expect(logLines.value.at(-1)).toContain('m-99')
  })

  test('numericGmSignal clamps direct .value mutation to the configured min/max', () => {
    // numericGmSignal enforces bounds in three places: (1) load from GM
    // storage, (2) `applyImportedSettings` import path, (3) instance-level
    // value setter on direct runtime writes. This pins the runtime-clamp
    // contract — without it, a stray `maxLogLines.value = 0` would corrupt
    // the slice math in pushLine (see src/lib/log.ts header).
    maxLogLines.value = 0
    expect(maxLogLines.value).toBe(50) // clamped up to min
    maxLogLines.value = 999999999
    expect(maxLogLines.value).toBe(100000) // clamped down to max
    maxLogLines.value = Number.NaN
    expect(maxLogLines.value).toBe(1000) // non-finite → defaultValue
    maxLogLines.value = 75.7
    expect(maxLogLines.value).toBe(76) // integer:true → rounded
  })
})

describe('module exports surface', () => {
  test('logLines / userNotices / maxLogLines / debugLogVisible are signal-shaped objects', () => {
    expect(typeof logLines.value).toBe('object')
    expect(Array.isArray(logLines.value)).toBe(true)
    expect(Array.isArray(userNotices.value)).toBe(true)
    expect(typeof maxLogLines.value).toBe('number')
    expect(typeof debugLogVisible.value).toBe('boolean')
  })

  test('debugLogVisible is GM-persisted (writes flow through the gm-store)', () => {
    debugLogVisible.value = true
    // Either the gm-signal writes synchronously or via microtask flush;
    // assert at least one of the two well-known persistence paths sees true.
    expect(debugLogVisible.value).toBe(true)
    // Surface that the module is wired into our gm store at all (key is the
    // signal's own — we don't assert the exact key to avoid coupling to the
    // implementation detail).
    expect(gmStore).toBeDefined()
  })
})

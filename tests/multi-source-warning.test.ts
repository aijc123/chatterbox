// Coverage for `src/lib/multi-source-warning.ts`. The helper is wired into
// 3 toggle-on paths (auto-send-controls, auto-blend-controls, hzm-drive-panel)
// and exists to keep "I forgot 独轮车 was still running" from silently turning
// into "I have 3 auto-senders fighting over my account".
//
// Tests verify:
//   - no other active → no toast
//   - exactly one other active → one warning toast with both names listed
//   - two others active → toast lists all three sources + count of 3
//   - dedup window suppresses repeat warnings for the same combination
//   - _resetMultiSourceWarningForTests clears the dedup state

import { beforeEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

const { logLines, userNotices } = await import('../src/lib/log')
const { autoBlendEnabled } = await import('../src/lib/store-auto-blend')
const { hzmDriveEnabled } = await import('../src/lib/store-hzm')
const { sendMsg } = await import('../src/lib/store-send')
const { _resetMultiSourceWarningForTests, warnIfOtherSourcesActive } = await import('../src/lib/multi-source-warning')

beforeEach(() => {
  resetGmStore()
  logLines.value = []
  userNotices.value = []
  sendMsg.value = false
  autoBlendEnabled.value = false
  hzmDriveEnabled.value = false
  _resetMultiSourceWarningForTests()
})

describe('warnIfOtherSourcesActive', () => {
  test('no other sources active → no toast', () => {
    warnIfOtherSourcesActive('loop')
    expect(userNotices.value).toHaveLength(0)
  })

  test('one other active (sendMsg on, starting blend) → single warning toast', () => {
    sendMsg.value = true
    warnIfOtherSourcesActive('blend')
    expect(userNotices.value).toHaveLength(1)
    expect(userNotices.value[0].tone).toBe('warning')
    expect(userNotices.value[0].message).toContain('独轮车')
    expect(userNotices.value[0].message).toContain('自动跟车')
    expect(userNotices.value[0].message).toContain('2 个自动发送')
  })

  test('starting source is listed alongside other(s) in stable order', () => {
    autoBlendEnabled.value = true
    warnIfOtherSourcesActive('hzm')
    expect(userNotices.value[0].message).toContain('自动跟车')
    expect(userNotices.value[0].message).toContain('智驾')
  })

  test('two others active → toast says 3 个自动发送 and lists all three', () => {
    sendMsg.value = true
    autoBlendEnabled.value = true
    warnIfOtherSourcesActive('hzm')
    const msg = userNotices.value[0].message
    expect(msg).toContain('3 个自动发送')
    expect(msg).toContain('独轮车')
    expect(msg).toContain('自动跟车')
    expect(msg).toContain('智驾')
  })

  test('dedup: same combination within 30s does NOT fire a second toast', () => {
    sendMsg.value = true
    warnIfOtherSourcesActive('blend')
    expect(userNotices.value).toHaveLength(1)
    // Second call with identical active-set should be suppressed.
    warnIfOtherSourcesActive('blend')
    expect(userNotices.value).toHaveLength(1)
  })

  test('different combination after first toast bypasses dedup', () => {
    sendMsg.value = true
    warnIfOtherSourcesActive('blend')
    expect(userNotices.value).toHaveLength(1)
    // Now blend is on too — different combo (loop+blend+hzm starts hzm).
    autoBlendEnabled.value = true
    warnIfOtherSourcesActive('hzm')
    expect(userNotices.value).toHaveLength(2)
  })

  test('_resetMultiSourceWarningForTests clears the dedup window', () => {
    sendMsg.value = true
    warnIfOtherSourcesActive('blend')
    expect(userNotices.value).toHaveLength(1)
    _resetMultiSourceWarningForTests()
    warnIfOtherSourcesActive('blend')
    expect(userNotices.value).toHaveLength(2)
  })

  test('starting itself is one of the actives → not counted twice', () => {
    // Edge case: user has flipped the signal on, then called the helper.
    // The function explicitly filters `starting` out of the "others" list, so
    // the toast should still say "2 个" not "3 个" when one other is active.
    sendMsg.value = true
    autoBlendEnabled.value = true // starting source already in true state
    warnIfOtherSourcesActive('blend')
    expect(userNotices.value[0].message).toContain('2 个自动发送')
    expect(userNotices.value[0].message).not.toContain('3 个')
  })
})

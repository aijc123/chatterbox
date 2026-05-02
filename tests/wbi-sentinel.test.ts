// Regression test for the H-sec audit fix: the WBI hijack patches
// XMLHttpRequest.prototype globally and previously had no double-install
// guard, so re-running the install IIFE (e.g. in nested iframes that also
// load the userscript) double-wrapped open/send.
//
// We verify the GUARD LOGIC — that an install IIFE shaped like the one in
// `wbi.ts` short-circuits when the sentinel is already set. We don't test the
// module-load side effect directly because other tests in this suite swap
// `globalThis.XMLHttpRequest` for stubs and the prototype identity gets lost.

import { describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  unsafeWindow: globalThis,
}))

type SentinelTarget = { __chatterboxWbiHijackInstalled?: boolean; open: unknown; send: unknown }

function fakeWbiInstall(proto: SentinelTarget): { installed: boolean } {
  // Mirrors the IIFE in src/lib/wbi.ts.
  const sentinel = '__chatterboxWbiHijackInstalled' as const
  if (proto[sentinel]) return { installed: false }
  proto[sentinel] = true
  const originalOpen = proto.open
  const originalSend = proto.send
  proto.open = function (...args: unknown[]) {
    return (originalOpen as (...a: unknown[]) => unknown).apply(this, args)
  }
  proto.send = function (...args: unknown[]) {
    return (originalSend as (...a: unknown[]) => unknown).apply(this, args)
  }
  return { installed: true }
}

describe('WBI hijack sentinel guard', () => {
  test('first install wraps the prototype and sets the sentinel', () => {
    const proto: SentinelTarget = { open: () => 'orig-open', send: () => 'orig-send' }
    const result = fakeWbiInstall(proto)
    expect(result.installed).toBe(true)
    expect(proto.__chatterboxWbiHijackInstalled).toBe(true)
    // Wrapped function is a different reference but still callable.
    expect(typeof proto.open).toBe('function')
    expect(typeof proto.send).toBe('function')
  })

  test('second install bails out (no double-wrap, sentinel preserved)', () => {
    const proto: SentinelTarget = { open: () => null, send: () => null }
    fakeWbiInstall(proto)
    const wrappedOpen = proto.open
    const wrappedSend = proto.send

    const second = fakeWbiInstall(proto)
    expect(second.installed).toBe(false)
    expect(proto.open).toBe(wrappedOpen)
    expect(proto.send).toBe(wrappedSend)
  })

  test('the production wbi.ts module exposes the same sentinel name', async () => {
    // Lock in the exact sentinel string so a refactor renaming it would fail
    // here and prompt updating both sides.
    const src = await Bun.file(`${import.meta.dir}/../src/lib/wbi.ts`).text()
    expect(src.includes('__chatterboxWbiHijackInstalled')).toBe(true)
  })
})

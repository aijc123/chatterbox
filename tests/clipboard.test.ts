/**
 * Defends the cross-browser clipboard helper introduced for B1 (Firefox-safe
 * clipboard fallback).
 *
 * Three paths to verify:
 *   1. Modern path — `navigator.clipboard.writeText` resolves ⇒ helper returns
 *      true and never touches the DOM.
 *   2. Permission-denied path — `navigator.clipboard.writeText` rejects
 *      (NotAllowedError, common on Firefox + Violentmonkey when the call isn't
 *      tied to a user gesture). Helper must fall back to execCommand and
 *      report success based on its return value.
 *   3. Both-fail path — helper returns false so the caller can show a
 *      "复制失败" toast (this is the contract that backup-section /
 *      medal-check / emote-ids rely on).
 */

import { Window } from 'happy-dom'

const happyWindow = new Window()
Object.assign(globalThis, {
  document: happyWindow.document,
  window: happyWindow,
})

import { afterEach, beforeEach, describe, expect, test } from 'bun:test'

import { copyTextToClipboard } from '../src/lib/clipboard'

interface FakeClipboard {
  writeText: (text: string) => Promise<void>
  lastWritten: string | null
  callCount: number
}

let fakeClipboard: FakeClipboard | null = null
let execCommandReturn: boolean = true
let execCommandCalls: number = 0
let originalExec: typeof document.execCommand | undefined

beforeEach(() => {
  execCommandReturn = true
  execCommandCalls = 0
  originalExec = document.execCommand
  document.execCommand = ((cmd: string) => {
    execCommandCalls++
    if (cmd === 'copy') return execCommandReturn
    return false
  }) as typeof document.execCommand
})

afterEach(() => {
  if (originalExec) document.execCommand = originalExec
  delete (globalThis as { navigator?: unknown }).navigator
  fakeClipboard = null
})

function installNavigatorClipboard(impl: 'success' | 'reject' | 'missing'): FakeClipboard | null {
  if (impl === 'missing') {
    ;(globalThis as { navigator?: unknown }).navigator = {}
    return null
  }
  const c: FakeClipboard = {
    lastWritten: null,
    callCount: 0,
    writeText:
      impl === 'success'
        ? async (text: string) => {
            c.callCount++
            c.lastWritten = text
          }
        : async () => {
            c.callCount++
            throw new Error('NotAllowedError: clipboard write rejected')
          },
  }
  ;(globalThis as { navigator?: unknown }).navigator = { clipboard: c }
  return c
}

describe('copyTextToClipboard', () => {
  test('uses navigator.clipboard.writeText when available and resolving', async () => {
    fakeClipboard = installNavigatorClipboard('success')
    const ok = await copyTextToClipboard('hello-world')
    expect(ok).toBe(true)
    expect(fakeClipboard?.callCount).toBe(1)
    expect(fakeClipboard?.lastWritten).toBe('hello-world')
    // No DOM fallback should have run.
    expect(execCommandCalls).toBe(0)
  })

  test('falls back to execCommand when navigator.clipboard rejects (Firefox path)', async () => {
    fakeClipboard = installNavigatorClipboard('reject')
    execCommandReturn = true
    const ok = await copyTextToClipboard('fallback-text')
    expect(ok).toBe(true)
    expect(fakeClipboard?.callCount).toBe(1)
    expect(execCommandCalls).toBe(1)
  })

  test('falls back to execCommand when navigator.clipboard is missing entirely', async () => {
    installNavigatorClipboard('missing')
    execCommandReturn = true
    const ok = await copyTextToClipboard('legacy-browser')
    expect(ok).toBe(true)
    expect(execCommandCalls).toBe(1)
  })

  test('returns false when both paths fail (caller-visible failure mode)', async () => {
    fakeClipboard = installNavigatorClipboard('reject')
    execCommandReturn = false
    const ok = await copyTextToClipboard('all-paths-fail')
    expect(ok).toBe(false)
    expect(fakeClipboard?.callCount).toBe(1)
    expect(execCommandCalls).toBe(1)
  })

  test('cleans up the fallback textarea even on the success path', async () => {
    installNavigatorClipboard('missing')
    execCommandReturn = true
    const before = document.body.children.length
    await copyTextToClipboard('cleanup-check')
    expect(document.body.children.length).toBe(before)
  })
})

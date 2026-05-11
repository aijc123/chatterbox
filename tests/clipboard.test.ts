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

  // Mutation-testing fortifications below: the previous tests cover the
  // three behavioral paths but never assert on the textarea's setup, so all
  // the StringLiteral mutants on the hidden-textarea CSS / readonly attr
  // survive. We tap createElement to capture the textarea and pin every
  // field after the helper finishes.
  describe('textarea-fallback configuration (StringLiteral kill-zone)', () => {
    let captured: HTMLTextAreaElement | null = null
    let originalCreateElement: typeof document.createElement | undefined

    beforeEach(() => {
      captured = null
      originalCreateElement = document.createElement.bind(document)
      // We snapshot the textarea's properties INSIDE the execCommand stub
      // because the helper removes the element from the DOM immediately
      // after `execCommand` returns — by the time the test resumes the
      // textarea is detached.
      document.execCommand = ((cmd: string) => {
        execCommandCalls++
        // At this moment the textarea is the most recently created child of
        // document.body. The previous beforeEach replaced execCommand
        // already; this version layers on top.
        const body = document.body
        const last = body.lastElementChild
        if (last && last.tagName === 'TEXTAREA') {
          captured = last as HTMLTextAreaElement
        }
        if (cmd === 'copy') return execCommandReturn
        return false
      }) as typeof document.execCommand
    })

    afterEach(() => {
      // restore createElement just in case a later test replaces document
      if (originalCreateElement) document.createElement = originalCreateElement
    })

    test('textarea.value is the EXACT text passed in (locks `textarea.value = text`)', async () => {
      installNavigatorClipboard('missing')
      execCommandReturn = true
      await copyTextToClipboard('hello-fallback-payload')
      expect(captured).not.toBeNull()
      expect(captured?.value).toBe('hello-fallback-payload')
    })

    test('textarea has readonly attribute set to empty string', async () => {
      installNavigatorClipboard('missing')
      execCommandReturn = true
      await copyTextToClipboard('x')
      expect(captured?.hasAttribute('readonly')).toBe(true)
      // The setAttribute call passes '' — pinning this kills the
      // StringLiteral mutant on line 37.
      expect(captured?.getAttribute('readonly')).toBe('')
    })

    test('textarea position is "fixed" (locks the StringLiteral)', async () => {
      installNavigatorClipboard('missing')
      execCommandReturn = true
      await copyTextToClipboard('x')
      expect(captured?.style.position).toBe('fixed')
    })

    test('textarea top is "0" (read back as "0px" — happy-dom normalizes dimension props)', async () => {
      installNavigatorClipboard('missing')
      execCommandReturn = true
      await copyTextToClipboard('x')
      // happy-dom stores `style.top = '0'` as '0px'. The mutation we care
      // about is `'0'` → `''` or `'Stryker was here!'`. Either of those
      // would read back differently than '0px'.
      expect(captured?.style.top).toBe('0px')
    })

    test('textarea left is "0" (read back as "0px")', async () => {
      installNavigatorClipboard('missing')
      execCommandReturn = true
      await copyTextToClipboard('x')
      expect(captured?.style.left).toBe('0px')
    })

    test('textarea opacity is "0" (locks the StringLiteral)', async () => {
      installNavigatorClipboard('missing')
      execCommandReturn = true
      await copyTextToClipboard('x')
      expect(captured?.style.opacity).toBe('0')
    })

    test('textarea pointerEvents is "none" (locks the StringLiteral)', async () => {
      installNavigatorClipboard('missing')
      execCommandReturn = true
      await copyTextToClipboard('x')
      expect(captured?.style.pointerEvents).toBe('none')
    })

    test('textarea is appended to document.body (not somewhere else)', async () => {
      installNavigatorClipboard('missing')
      execCommandReturn = true
      await copyTextToClipboard('x')
      expect(captured?.parentNode).toBeNull() // already removed by now
      // But it was appended before being removed — the execCommand stub
      // wouldn't have captured it otherwise.
      expect(captured).not.toBeNull()
    })
  })
})

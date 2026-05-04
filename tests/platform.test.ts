/**
 * Defends `detectPlatform` (audit B6).
 *
 * The script's main support matrix is desktop Chrome/Firefox/Edge with
 * Tampermonkey/Violentmonkey. Mobile UAs run a userscript-manager sandbox
 * that drops parts of our dependency surface (clipboard, AbortSignal listener
 * options, MutationObserver flags). We don't want to block the script — some
 * sideloaded mobile managers expose enough — but we DO want a single
 * console warning so issue reports include the platform mismatch.
 *
 * `detectPlatform` is the pure detector; `warnIfDegraded` is the side-effect
 * wrapper. Test the pure piece exhaustively; spot-check the wrapper's
 * idempotency.
 */

import { describe, expect, test } from 'bun:test'

import { detectPlatform } from '../src/lib/platform'

describe('detectPlatform', () => {
  test('flags common mobile user-agent strings', () => {
    const mobileUas = [
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0',
      'Mozilla/5.0 (Linux; Android 12; SM-G991U) AppleWebKit/537.36 Mobile Safari/537.36',
      'Mozilla/5.0 (BlackBerry; U; BlackBerry 9900)',
      'Opera/9.80 (Android; Opera Mini/7.5.33361/28.2555; U; ru) Presto/2.5.25',
    ]
    for (const ua of mobileUas) {
      const r = detectPlatform(ua)
      expect(r.isMobileUA).toBe(true)
      expect(r.warning).toContain('chatterbox')
    }
  })

  test('does not flag common desktop user-agent strings', () => {
    const desktopUas = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.124 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.6045.124 Safari/537.36',
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    ]
    for (const ua of desktopUas) {
      const r = detectPlatform(ua)
      expect(r.isMobileUA).toBe(false)
      expect(r.warning).toBe(null)
    }
  })

  test('handles empty / undefined user agents safely (no false positives)', () => {
    expect(detectPlatform(undefined)).toEqual({ isMobileUA: false, warning: null })
    expect(detectPlatform('')).toEqual({ isMobileUA: false, warning: null })
  })

  test('warning text mentions both the trigger and the impact', () => {
    const r = detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')
    expect(r.warning).toMatch(/移动端/)
    expect(r.warning).toMatch(/Tampermonkey|Violentmonkey/)
  })
})

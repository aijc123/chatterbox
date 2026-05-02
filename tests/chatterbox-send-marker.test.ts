/**
 * Regression tests for the CORS-preflight fix.
 *
 * The original Phase 3 implementation marked Chatterbox-initiated `/msg/send`
 * requests with a custom `X-Chatterbox-Send` header so the fetch hijack could
 * skip them. That header triggered a CORS preflight on
 * `api.live.bilibili.com`, which B站's CORS policy rejects, breaking every
 * Chatterbox send (manual / +1 / loop / cloud-test) with `Failed to fetch`.
 *
 * The fix: use a CORS-safelisted **query parameter** marker instead. Unknown
 * query params are ignored by the API and don't trigger a preflight.
 *
 * If anyone reintroduces a custom request header, these tests fail and the
 * commit message points at the right fix.
 */

import { describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  unsafeWindow: globalThis,
}))

const { BASE_URL, CHATTERBOX_SEND_MARKER, CHATTERBOX_SEND_PARAM, CHATTERBOX_SEND_VALUE } = await import(
  '../src/lib/const'
)

describe('CHATTERBOX_SEND_MARKER (CORS-safe URL marker)', () => {
  test('marker is a query-string fragment, not a header name', () => {
    expect(CHATTERBOX_SEND_MARKER).toBe(`${CHATTERBOX_SEND_PARAM}=${CHATTERBOX_SEND_VALUE}`)
    expect(CHATTERBOX_SEND_MARKER).toBe('cb_send=1')
    // Header-style markers (anything starting with `X-` or containing
    // ASCII whitespace) trigger CORS preflight on api.live.bilibili.com.
    expect(CHATTERBOX_SEND_MARKER.startsWith('X-')).toBe(false)
    expect(CHATTERBOX_SEND_MARKER).not.toMatch(/\s/)
  })

  test('the URL Chatterbox builds for /msg/send always carries the marker', () => {
    const wbiQuery = 'web_location=444.8&w_rid=deadbeef&wts=1700000000'
    const url = `${BASE_URL.BILIBILI_MSG_SEND}?${wbiQuery ? `${wbiQuery}&` : ''}${CHATTERBOX_SEND_MARKER}`
    expect(url.includes(CHATTERBOX_SEND_MARKER)).toBe(true)
    expect(url.startsWith(BASE_URL.BILIBILI_MSG_SEND)).toBe(true)
  })

  test('a native B站 /msg/send URL (no marker) is recognizable as foreign', () => {
    const nativeUrl = `${BASE_URL.BILIBILI_MSG_SEND}?web_location=444.8&w_rid=deadbeef&wts=1700000000`
    expect(nativeUrl.includes(CHATTERBOX_SEND_MARKER)).toBe(false)
  })
})

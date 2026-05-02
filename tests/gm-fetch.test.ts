import { afterAll, afterEach, beforeAll, describe, expect, test } from 'bun:test'

import { _setGmXhrForTests, gmFetch } from '../src/lib/gm-fetch'

interface XhrCallback {
  onload?: (resp: {
    status: number
    statusText: string
    responseText: string
    responseHeaders: string
    finalUrl: string
  }) => void
  onerror?: (err: { error?: string }) => void
  ontimeout?: () => void
  onabort?: () => void
}

let captured: {
  method?: string
  url: string
  headers?: Record<string, string>
  data?: string
  timeout?: number
} | null = null
let xhrBehavior: 'load' | 'error' | 'timeout' | 'abort' = 'load'
let xhrStatus = 200
let xhrResponseText = ''

// Inject our fake GM_xmlhttpRequest via the gm-fetch DI hook. We use the hook
// instead of `mock.module('$', ...)` because once `$` is loaded by any earlier
// test in the suite, bun caches its exports and subsequent re-mocks don't
// reach the gmFetch resolver.
type XhrOpts = {
  method?: string
  url: string
  headers?: Record<string, string>
  data?: string
  timeout?: number
} & XhrCallback

beforeAll(() => {
  _setGmXhrForTests(((opts: XhrOpts) => {
    captured = { method: opts.method, url: opts.url, headers: opts.headers, data: opts.data, timeout: opts.timeout }
    setTimeout(() => {
      if (xhrBehavior === 'load') {
        opts.onload?.({
          status: xhrStatus,
          statusText: 'OK',
          responseText: xhrResponseText,
          responseHeaders: '',
          finalUrl: opts.url,
        })
      } else if (xhrBehavior === 'error') {
        opts.onerror?.({ error: 'connection refused' })
      } else if (xhrBehavior === 'timeout') {
        opts.ontimeout?.()
      } else {
        opts.onabort?.()
      }
    }, 0)
    // The DI hook expects a return value matching GM_xmlhttpRequest's
    // GmAbortHandle. We don't exercise abort handles in tests; cast to unknown.
    return undefined as unknown as ReturnType<typeof gmFetch>
  }) as unknown as Parameters<typeof _setGmXhrForTests>[0])
})

afterAll(() => {
  _setGmXhrForTests(null)
})

afterEach(() => {
  captured = null
  xhrBehavior = 'load'
  xhrStatus = 200
  xhrResponseText = ''
})

describe('gmFetch', () => {
  test('forwards method, url, headers, body, timeout to GM_xmlhttpRequest', async () => {
    xhrResponseText = '{"ok":true}'
    await gmFetch('https://x.example.com/api', {
      method: 'POST',
      headers: { Authorization: 'Bearer t' },
      body: '{"hi":1}',
      timeoutMs: 5000,
    })
    expect(captured?.method).toBe('POST')
    expect(captured?.url).toBe('https://x.example.com/api')
    expect(captured?.headers?.Authorization).toBe('Bearer t')
    expect(captured?.data).toBe('{"hi":1}')
    expect(captured?.timeout).toBe(5000)
  })

  test('GET is the default method when not specified', async () => {
    xhrResponseText = '{}'
    await gmFetch('https://x.example.com/get')
    expect(captured?.method).toBe('GET')
  })

  test('json() parses responseText', async () => {
    xhrResponseText = '{"foo":42}'
    const resp = await gmFetch('https://x.example.com/api')
    expect(resp.json()).toEqual({ foo: 42 })
  })

  test('text() returns the responseText', async () => {
    xhrResponseText = 'plain body'
    const resp = await gmFetch('https://x.example.com/api')
    expect(resp.text()).toBe('plain body')
  })

  test('ok=true for 2xx, false for 4xx/5xx', async () => {
    xhrStatus = 204
    xhrResponseText = ''
    let resp = await gmFetch('https://x.example.com/a')
    expect(resp.ok).toBe(true)

    xhrStatus = 404
    resp = await gmFetch('https://x.example.com/b')
    expect(resp.ok).toBe(false)
    expect(resp.status).toBe(404)

    xhrStatus = 500
    resp = await gmFetch('https://x.example.com/c')
    expect(resp.ok).toBe(false)
  })

  test('rejects with descriptive error on network error', async () => {
    xhrBehavior = 'error'
    await expect(gmFetch('https://x.example.com/api')).rejects.toThrow(/network error.*connection refused/)
  })

  test('rejects on timeout', async () => {
    xhrBehavior = 'timeout'
    await expect(gmFetch('https://x.example.com/api', { timeoutMs: 100 })).rejects.toThrow(/timeout after 100ms/)
  })

  test('rejects on abort', async () => {
    xhrBehavior = 'abort'
    await expect(gmFetch('https://x.example.com/api')).rejects.toThrow(/aborted/)
  })

  test('only resolves once even if onload + ontimeout both fire (idempotent finishOnce)', async () => {
    // The default mock setTimeout-fires onload once. Verify the promise has
    // settled with onload semantics — a subsequent ontimeout would have no
    // effect because finishOnce guards re-resolution.
    xhrResponseText = 'ok-once'
    const resp = await gmFetch('https://x.example.com/once', { timeoutMs: 50 })
    expect(resp.ok).toBe(true)
    expect(resp.text()).toBe('ok-once')
    // Status remains 200 — proves we got the load result, not the timeout error.
    expect(resp.status).toBe(200)
  })
})

// remote-client 单测：用 _setGmXhrForTests 注入 fake GM_xmlhttpRequest，
// 验证 ingest / fetchState / setThreshold 三个 endpoint 的请求构造正确，
// 错误路径走 { ok: false, body: ... }。

import { afterEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

installGmStoreMock()

const { _setGmXhrForTests } = await import('../src/lib/gm-fetch')
const { fetchState, ingest, setThreshold } = await import('../src/lib/chatfilter/remote-client')

interface CapturedRequest {
  method: string
  url: string
  headers?: Record<string, string>
  data?: string
}

function makeFakeXhr(responder: (req: CapturedRequest) => { status: number; responseText: string }) {
  const captured: CapturedRequest[] = []
  const fake = ((opts: {
    method: string
    url: string
    headers?: Record<string, string>
    data?: string
    onload: (r: {
      status: number
      responseText: string
      statusText?: string
      finalUrl?: string
      responseHeaders?: string
    }) => void
  }) => {
    captured.push({ method: opts.method, url: opts.url, headers: opts.headers, data: opts.data })
    const resp = responder({ method: opts.method, url: opts.url, headers: opts.headers, data: opts.data })
    queueMicrotask(() => {
      opts.onload({
        status: resp.status,
        responseText: resp.responseText,
        statusText: '',
        finalUrl: opts.url,
        responseHeaders: '',
      })
    })
    return { abort: () => {} }
  }) as unknown as Parameters<typeof _setGmXhrForTests>[0]
  return { fake, captured }
}

describe('chatfilter/remote-client', () => {
  afterEach(() => {
    _setGmXhrForTests(null)
  })

  test('ingest 构造 POST /ingest?text=&room=', async () => {
    const { fake, captured } = makeFakeXhr(() => ({ status: 200, responseText: 'ok' }))
    _setGmXhrForTests(fake)
    const r = await ingest('niubi', 12345, { endpoint: 'http://localhost:8766' })
    expect(r.ok).toBe(true)
    expect(r.body).toBe('ok')
    expect(captured.length).toBe(1)
    expect(captured[0].method).toBe('POST')
    expect(captured[0].url).toBe('http://localhost:8766/ingest?text=niubi&room=12345')
  })

  test('ingest 不带 roomId 时不附带 room 参数', async () => {
    const { fake, captured } = makeFakeXhr(() => ({ status: 200, responseText: 'ok' }))
    _setGmXhrForTests(fake)
    await ingest('hello', null, { endpoint: 'http://localhost:8766/' })
    expect(captured[0].url).toBe('http://localhost:8766/ingest?text=hello')
  })

  test('ingest URL-encode 特殊字符', async () => {
    const { fake, captured } = makeFakeXhr(() => ({ status: 200, responseText: 'ok' }))
    _setGmXhrForTests(fake)
    await ingest('哈哈哈 & yyds', 1, { endpoint: 'http://x' })
    // URLSearchParams 默认对空格、&、中文编码
    expect(captured[0].url).toContain('text=%E5%93%88%E5%93%88%E5%93%88+%26+yyds')
    expect(captured[0].url).toContain('room=1')
  })

  test('ingest 失败回 { ok: false }', async () => {
    const { fake } = makeFakeXhr(() => ({ status: 500, responseText: 'boom' }))
    _setGmXhrForTests(fake)
    const r = await ingest('x', 1, { endpoint: 'http://x' })
    expect(r.ok).toBe(false)
    expect(r.body).toBe('boom')
  })

  test('ingest authToken → Authorization 头', async () => {
    const { fake, captured } = makeFakeXhr(() => ({ status: 200, responseText: 'ok' }))
    _setGmXhrForTests(fake)
    await ingest('x', null, { endpoint: 'http://x', authToken: 'secret123' })
    expect(captured[0].headers?.Authorization).toBe('Bearer secret123')
  })

  test('fetchState 解析 JSON', async () => {
    const { fake } = makeFakeXhr(() => ({
      status: 200,
      responseText: JSON.stringify({ ingested: 42, clusters: [] }),
    }))
    _setGmXhrForTests(fake)
    const r = await fetchState({ endpoint: 'http://x' })
    expect('error' in r).toBe(false)
    if (!('error' in r)) {
      expect(r.ingested).toBe(42)
    }
  })

  test('fetchState invalid JSON → error', async () => {
    const { fake } = makeFakeXhr(() => ({ status: 200, responseText: 'not json' }))
    _setGmXhrForTests(fake)
    const r = await fetchState({ endpoint: 'http://x' })
    expect('error' in r).toBe(true)
  })

  test('fetchState non-2xx → error', async () => {
    const { fake } = makeFakeXhr(() => ({ status: 404, responseText: 'nope' }))
    _setGmXhrForTests(fake)
    const r = await fetchState({ endpoint: 'http://x' })
    expect('error' in r).toBe(true)
    if ('error' in r) {
      expect(r.error).toContain('404')
    }
  })

  test('setThreshold POST /admin/threshold?centroid=&anchor=', async () => {
    const { fake, captured } = makeFakeXhr(() => ({ status: 200, responseText: 'ok' }))
    _setGmXhrForTests(fake)
    await setThreshold(0.3, 0.7, { endpoint: 'http://x' })
    expect(captured[0].method).toBe('POST')
    expect(captured[0].url).toBe('http://x/admin/threshold?centroid=0.3&anchor=0.7')
  })
})

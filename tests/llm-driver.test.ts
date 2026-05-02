import { afterEach, describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  GM_xmlhttpRequest: () => {},
  unsafeWindow: globalThis,
}))

interface Captured {
  url: string
  method?: string
  headers?: Record<string, string>
  body?: string
}

let captured: Captured[] = []
let mockResponseFactory: (url: string) => unknown = () => ({})
let mockHttpStatus = 200

function installGmFetchMock(): void {
  mock.module('../src/lib/gm-fetch', () => ({
    gmFetch: async (url: string, init: { method?: string; headers?: Record<string, string>; body?: string }) => {
      captured.push({ url, method: init?.method, headers: init?.headers, body: init?.body })
      const json = mockResponseFactory(url)
      const text = JSON.stringify(json)
      return {
        ok: mockHttpStatus >= 200 && mockHttpStatus < 300,
        status: mockHttpStatus,
        statusText: 'OK',
        url,
        headers: '',
        text: () => text,
        json: <T>() => json as T,
      }
    },
  }))
}

installGmFetchMock()

const { chooseMemeWithLLM } = await import('../src/lib/llm-driver')

afterEach(() => {
  captured = []
  mockHttpStatus = 200
  mockResponseFactory = () => ({})
})

const candidates = [
  { id: '1', content: '冲耳朵啊医生', tags: ['满弟'] },
  { id: '2', content: '好困想睡觉', tags: ['略弥'] },
]

describe('chooseMemeWithLLM — provider routing', () => {
  test('anthropic: hits /v1/messages with x-api-key header and parses content[0].text', async () => {
    mockResponseFactory = () => ({ content: [{ text: '2' }] })
    const out = await chooseMemeWithLLM({
      provider: 'anthropic',
      apiKey: 'k1',
      model: 'claude-haiku-4-5-20251001',
      roomName: '灰泽满烂梗库',
      recentChat: ['很困'],
      candidates,
    })
    expect(out).toBe('好困想睡觉')
    expect(captured.length).toBe(1)
    expect(captured[0].url).toBe('https://api.anthropic.com/v1/messages')
    expect(captured[0].headers?.['x-api-key']).toBe('k1')
    expect(captured[0].headers?.['anthropic-version']).toBe('2023-06-01')
    const body = JSON.parse(captured[0].body ?? '{}')
    expect(body.model).toBe('claude-haiku-4-5-20251001')
    expect(body.max_tokens).toBe(64)
    expect(body.system?.[0]?.text).toContain('灰泽满烂梗库')
  })

  test('openai: hits /v1/chat/completions with bearer token', async () => {
    mockResponseFactory = () => ({ choices: [{ message: { content: '1' } }] })
    const out = await chooseMemeWithLLM({
      provider: 'openai',
      apiKey: 'sk-x',
      model: 'gpt-4o-mini',
      roomName: 'r',
      recentChat: ['医生救命'],
      candidates,
    })
    expect(out).toBe('冲耳朵啊医生')
    expect(captured[0].url).toBe('https://api.openai.com/v1/chat/completions')
    expect(captured[0].headers?.Authorization).toBe('Bearer sk-x')
  })

  test('openai-compat: appends /v1/chat/completions to provided baseURL', async () => {
    mockResponseFactory = () => ({ choices: [{ message: { content: '2' } }] })
    const out = await chooseMemeWithLLM({
      provider: 'openai-compat',
      apiKey: 'k',
      model: 'deepseek-chat',
      baseURL: 'https://api.deepseek.com',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(out).toBe('好困想睡觉')
    expect(captured[0].url).toBe('https://api.deepseek.com/v1/chat/completions')
  })

  test('openai-compat: trailing slash in baseURL is normalized', async () => {
    mockResponseFactory = () => ({ choices: [{ message: { content: '1' } }] })
    await chooseMemeWithLLM({
      provider: 'openai-compat',
      apiKey: 'k',
      model: 'm',
      baseURL: 'https://x.example.com//',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(captured[0].url).toBe('https://x.example.com/v1/chat/completions')
  })

  test('openai-compat without baseURL throws', async () => {
    await expect(
      chooseMemeWithLLM({
        provider: 'openai-compat',
        apiKey: 'k',
        model: 'm',
        roomName: 'r',
        recentChat: [],
        candidates,
      })
    ).rejects.toThrow(/base URL/)
  })
})

describe('chooseMemeWithLLM — response parsing', () => {
  test('returns null when LLM picks "-1" (abstain)', async () => {
    mockResponseFactory = () => ({ choices: [{ message: { content: '-1' } }] })
    const out = await chooseMemeWithLLM({
      provider: 'openai',
      apiKey: 'k',
      model: 'm',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(out).toBeNull()
  })

  test('returns null when no apiKey', async () => {
    const out = await chooseMemeWithLLM({
      provider: 'openai',
      apiKey: '',
      model: 'm',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(out).toBeNull()
    expect(captured.length).toBe(0)
  })

  test('returns null when candidates is empty', async () => {
    const out = await chooseMemeWithLLM({
      provider: 'openai',
      apiKey: 'k',
      model: 'm',
      roomName: 'r',
      recentChat: [],
      candidates: [],
    })
    expect(out).toBeNull()
    expect(captured.length).toBe(0)
  })

  test('content fallback: model returned full content instead of id', async () => {
    mockResponseFactory = () => ({ choices: [{ message: { content: '冲耳朵啊医生' } }] })
    const out = await chooseMemeWithLLM({
      provider: 'openai',
      apiKey: 'k',
      model: 'm',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(out).toBe('冲耳朵啊医生')
  })

  test('throws on non-2xx HTTP response', async () => {
    mockHttpStatus = 401
    mockResponseFactory = () => ({ error: 'unauthorized' })
    await expect(
      chooseMemeWithLLM({
        provider: 'anthropic',
        apiKey: 'bad',
        model: 'm',
        roomName: 'r',
        recentChat: [],
        candidates,
      })
    ).rejects.toThrow(/Anthropic HTTP 401/)
  })

  test('returns null on malformed response (anthropic: missing content)', async () => {
    mockResponseFactory = () => ({})
    const out = await chooseMemeWithLLM({
      provider: 'anthropic',
      apiKey: 'k',
      model: 'm',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(out).toBeNull()
  })

  test('returns null on malformed response (openai: missing choices)', async () => {
    mockResponseFactory = () => ({})
    const out = await chooseMemeWithLLM({
      provider: 'openai',
      apiKey: 'k',
      model: 'm',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(out).toBeNull()
  })

  test('passes recentChat + candidates as JSON in user message', async () => {
    mockResponseFactory = () => ({ choices: [{ message: { content: '-1' } }] })
    await chooseMemeWithLLM({
      provider: 'openai',
      apiKey: 'k',
      model: 'm',
      roomName: 'r',
      recentChat: ['弹幕一', '弹幕二'],
      candidates,
    })
    const body = JSON.parse(captured[0].body ?? '{}')
    const userMsg = JSON.parse(body.messages[1].content)
    expect(userMsg.recentDanmu).toEqual(['弹幕一', '弹幕二'])
    expect(userMsg.candidates).toEqual(candidates)
  })
})

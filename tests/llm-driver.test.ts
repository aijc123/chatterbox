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
let mockResponseFactory: (url: string) => unknown = _url => ({})
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

  test('openai-compat: baseURL ending in /v1 does not produce /v1/v1', async () => {
    // Regression: 小米 mimo 的 base URL 是 https://token-plan-sgp.xiaomimimo.com/v1。
    // 之前我们盲目追加 /v1/chat/completions → /v1/v1/... → 404 + TM 拒绝。
    mockResponseFactory = () => ({ choices: [{ message: { content: '1' } }] })
    await chooseMemeWithLLM({
      provider: 'openai-compat',
      apiKey: 'k',
      model: 'mimo-v2.5-pro',
      baseURL: 'https://token-plan-sgp.xiaomimimo.com/v1',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(captured[0].url).toBe('https://token-plan-sgp.xiaomimimo.com/v1/chat/completions')
  })

  test('openai-compat: baseURL already containing /v1/chat/completions is preserved', async () => {
    mockResponseFactory = () => ({ choices: [{ message: { content: '1' } }] })
    await chooseMemeWithLLM({
      provider: 'openai-compat',
      apiKey: 'k',
      model: 'm',
      baseURL: 'https://x.example.com/v1/chat/completions',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(captured[0].url).toBe('https://x.example.com/v1/chat/completions')
  })

  test('openai-compat: trailing slash after /v1 is normalized', async () => {
    mockResponseFactory = () => ({ choices: [{ message: { content: '1' } }] })
    await chooseMemeWithLLM({
      provider: 'openai-compat',
      apiKey: 'k',
      model: 'm',
      baseURL: 'https://x.example.com/v1/',
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

  test('id normalization: model wraps id in markdown json fence', async () => {
    // Real Xiaomi MiMo response: `\`\`\`json\n{"id":"1"}\n\`\`\``
    mockResponseFactory = () => ({
      choices: [{ message: { content: '```json\n{"id":"1"}\n```' } }],
    })
    const out = await chooseMemeWithLLM({
      provider: 'openai-compat',
      apiKey: 'k',
      model: 'mimo-v2.5-pro',
      baseURL: 'https://token-plan-sgp.xiaomimimo.com/v1',
      roomName: 'r',
      recentChat: ['ping'],
      candidates,
    })
    expect(out).toBe('冲耳朵啊医生')
  })

  test('id normalization: bare JSON object with id field', async () => {
    mockResponseFactory = () => ({
      choices: [{ message: { content: '{"id":"2"}' } }],
    })
    const out = await chooseMemeWithLLM({
      provider: 'openai',
      apiKey: 'k',
      model: 'm',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(out).toBe('好困想睡觉')
  })

  test('id normalization: prose-wrapped id ("Selected id: 2")', async () => {
    mockResponseFactory = () => ({
      choices: [{ message: { content: 'Selected id: 2' } }],
    })
    const out = await chooseMemeWithLLM({
      provider: 'openai',
      apiKey: 'k',
      model: 'm',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(out).toBe('好困想睡觉')
  })

  test('id normalization: -1 inside json fence still abstains', async () => {
    mockResponseFactory = () => ({
      choices: [{ message: { content: '```json\n{"id":"-1"}\n```' } }],
    })
    const out = await chooseMemeWithLLM({
      provider: 'openai-compat',
      apiKey: 'k',
      model: 'm',
      baseURL: 'https://x.example.com',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    expect(out).toBeNull()
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

  test('reasoning-model fallback: empty content + reasoning_content tail digit → use the tail id', async () => {
    // Xiaomi MiMo / DeepSeek-R1 / o1 etc. route the answer into
    // `reasoning_content` and leave `content` empty when max_tokens is tight.
    // We pick the last id-like token from the tail of the reasoning trace.
    mockResponseFactory = () => ({
      choices: [
        {
          finish_reason: 'length',
          message: {
            content: '',
            reasoning_content: 'Hmm, between 1 and 2, "好困想睡觉" matches "很困" better. Answer: 2',
          },
        },
      ],
    })
    const out = await chooseMemeWithLLM({
      provider: 'openai-compat',
      apiKey: 'k',
      model: 'mimo-v2.5-pro',
      baseURL: 'https://token-plan-sgp.xiaomimimo.com/v1',
      roomName: 'r',
      recentChat: ['很困'],
      candidates,
    })
    expect(out).toBe('好困想睡觉')
  })

  test('reasoning-model fallback: empty content + reasoning_content with no digits → null', async () => {
    mockResponseFactory = () => ({
      choices: [
        {
          finish_reason: 'length',
          message: {
            content: '',
            reasoning_content: 'still thinking about which one fits best…',
          },
        },
      ],
    })
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

  test('openai max_tokens bumped to 1024 so reasoning models get room to think', async () => {
    mockResponseFactory = () => ({ choices: [{ message: { content: '1' } }] })
    await chooseMemeWithLLM({
      provider: 'openai-compat',
      apiKey: 'k',
      model: 'mimo-v2.5-pro',
      baseURL: 'https://token-plan-sgp.xiaomimimo.com/v1',
      roomName: 'r',
      recentChat: [],
      candidates,
    })
    const body = JSON.parse(captured[0].body ?? '{}')
    expect(body.max_tokens).toBe(1024)
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

describe('chooseMemeWithLLM — candidate cap', () => {
  test('truncates candidates above LLM_CANDIDATES_HARD_CAP and emits a warn log', async () => {
    const { LLM_CANDIDATES_HARD_CAP } = await import('../src/lib/llm-driver')
    const { logLines } = await import('../src/lib/log')
    logLines.value = []
    const overSized = Array.from({ length: LLM_CANDIDATES_HARD_CAP + 50 }, (_, i) => ({
      id: String(i),
      content: `meme-${i}`,
      tags: [],
    }))
    mockResponseFactory = () => ({ content: [{ text: '0' }] })
    const result = await chooseMemeWithLLM({
      provider: 'anthropic',
      apiKey: 'k',
      model: 'm',
      roomName: 'r',
      recentChat: [],
      candidates: overSized,
    })
    expect(result).toBe('meme-0')
    const body = JSON.parse(captured[0].body ?? '{}')
    const userMsg = JSON.parse(body.messages[0].content)
    expect(userMsg.candidates).toHaveLength(LLM_CANDIDATES_HARD_CAP)
    const warned = logLines.value.some(line => line.includes('candidates 超过上限'))
    expect(warned).toBe(true)
  })

  test('does not truncate or warn when candidates is at or below the cap', async () => {
    const { LLM_CANDIDATES_HARD_CAP } = await import('../src/lib/llm-driver')
    const { logLines } = await import('../src/lib/log')
    logLines.value = []
    const sized = Array.from({ length: LLM_CANDIDATES_HARD_CAP }, (_, i) => ({
      id: String(i),
      content: `meme-${i}`,
      tags: [],
    }))
    mockResponseFactory = () => ({ content: [{ text: '5' }] })
    await chooseMemeWithLLM({
      provider: 'anthropic',
      apiKey: 'k',
      model: 'm',
      roomName: 'r',
      recentChat: [],
      candidates: sized,
    })
    const body = JSON.parse(captured[0].body ?? '{}')
    const userMsg = JSON.parse(body.messages[0].content)
    expect(userMsg.candidates).toHaveLength(LLM_CANDIDATES_HARD_CAP)
    const warned = logLines.value.some(line => line.includes('candidates 超过上限'))
    expect(warned).toBe(false)
  })
})

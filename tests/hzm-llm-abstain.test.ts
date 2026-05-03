import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'
import type { LaplaceInternal } from '@laplace.live/internal'

import type { LaplaceMemeWithSource } from '../src/lib/sbhzm-client'

// In-memory GM 存储 + 默认值，与其它 hzm 测试保持一致风格
const gmStore = new Map<string, unknown>()
mock.module('$', () => ({
  GM_addStyle: () => {},
  GM_deleteValue: (key: string) => {
    gmStore.delete(key)
  },
  GM_getValue: <T>(key: string, defaultValue: T): T => (gmStore.has(key) ? (gmStore.get(key) as T) : defaultValue),
  GM_info: { script: { version: 'test' } },
  GM_setValue: (key: string, value: unknown) => {
    gmStore.set(key, value)
  },
  GM_xmlhttpRequest: () => {},
  unsafeWindow: globalThis,
}))

// 通过 pickByLLM 的 `chooser` DI hook 重写每个测试的 LLM 行为。不能用
// mock.module('../src/lib/llm-driver', ...) 因为 bun test 跨文件共享 mock：
// 同进程跑的 llm-driver.test.ts 会继承我们的 stub。详见 gm-fetch.ts 的
// `_setGmXhrForTests` 注释。
let chooseImpl: () => Promise<string | null> = async () => null

const { pickByLLM } = await import('../src/lib/hzm-auto-drive')
const { getMemeSourceForRoom } = await import('../src/lib/meme-sources')
const { hzmLlmApiKey } = await import('../src/lib/store-hzm')

const ROOM = 1713546334
const source = getMemeSourceForRoom(ROOM)
if (!source) throw new Error(`Expected meme source for room ${ROOM}`)

function tag(name: string): LaplaceInternal.HTTPS.Workers.TagWithCount {
  return { id: 0, name, color: 'blue', emoji: null, icon: null, description: null, count: 0 }
}

function meme(content: string, tagNames: string[] = []): LaplaceMemeWithSource {
  return {
    id: -1,
    uid: 0,
    content,
    tags: tagNames.map(tag),
    copyCount: 0,
    lastCopiedAt: null,
    createdAt: '',
    updatedAt: '',
    username: null,
    avatar: null,
    room: null,
    _source: 'sbhzm',
  }
}

const A = meme('冲耳朵啊医生', ['满弟'])
const B = meme('好困想睡觉', ['略弥'])

describe('pickByLLM 三态：pick / abstain / error', () => {
  beforeEach(() => {
    hzmLlmApiKey.value = 'test-key'
    chooseImpl = async () => null
  })

  afterEach(() => {
    hzmLlmApiKey.value = ''
  })

  test('LLM 返回 content 命中候选 → kind=pick', async () => {
    chooseImpl = async () => '冲耳朵啊医生'
    const result = await pickByLLM(ROOM, source, {
      getMemes: () => [A, B],
      recentChat: [],
      chooser: () => chooseImpl(),
    })
    expect(result.kind).toBe('pick')
    if (result.kind === 'pick') expect(result.meme).toBe(A)
  })

  test('LLM 显式弃权（chooseMemeWithLLM 返回 null）→ kind=abstain', async () => {
    chooseImpl = async () => null
    const result = await pickByLLM(ROOM, source, {
      getMemes: () => [A, B],
      recentChat: [],
      chooser: () => chooseImpl(),
    })
    expect(result.kind).toBe('abstain')
  })

  test('LLM 返回的 content 不在候选池里 → kind=abstain（不假装匹配）', async () => {
    chooseImpl = async () => '完全不在池里的内容'
    const result = await pickByLLM(ROOM, source, {
      getMemes: () => [A, B],
      recentChat: [],
      chooser: () => chooseImpl(),
    })
    expect(result.kind).toBe('abstain')
  })

  test('LLM 调用抛错 → kind=error（让调用方回退启发式）', async () => {
    chooseImpl = async () => {
      throw new Error('HTTP 401')
    }
    const result = await pickByLLM(ROOM, source, {
      getMemes: () => [A, B],
      recentChat: [],
      chooser: () => chooseImpl(),
    })
    expect(result.kind).toBe('error')
  })

  test('未配 API key → kind=error（不调 LLM）', async () => {
    hzmLlmApiKey.value = ''
    let called = 0
    chooseImpl = async () => {
      called++
      return '冲耳朵啊医生'
    }
    const result = await pickByLLM(ROOM, source, {
      getMemes: () => [A, B],
      recentChat: [],
      chooser: () => chooseImpl(),
    })
    expect(result.kind).toBe('error')
    expect(called).toBe(0)
  })

  test('候选池空（如所有 meme 都被 recentSent / blacklist 过滤）→ kind=error', async () => {
    let called = 0
    chooseImpl = async () => {
      called++
      return null
    }
    const result = await pickByLLM(ROOM, source, { getMemes: () => [], recentChat: [] })
    expect(result.kind).toBe('error')
    expect(called).toBe(0)
  })
})

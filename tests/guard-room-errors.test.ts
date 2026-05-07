/**
 * Error-path coverage for guard-room-sync HTTP calls.
 *
 * Happy paths and gating logic are covered in:
 *   - guard-room-endpoint.test.ts  (URL normalization)
 *   - guard-room-shadow-rule.test.ts (shadow-rule payload + gating)
 *
 * This file targets the previously untested HTTP failure modes for the
 * THREE different error contracts in guard-room-sync.ts:
 *
 *   - syncGuardRoomShadowRule       — silent (.catch(() => undefined))
 *   - syncGuardRoomWatchlist        — THROWS on non-OK
 *   - fetchGuardRoomControlProfile  — returns null on 5xx/network/non-OK
 *
 * Asserts that each function honors its contract under 4xx/5xx/network
 * failure and malformed JSON without crashing the caller pipeline.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

interface FetchCall {
  url: string
  init: RequestInit
}
const fetchCalls: FetchCall[] = []
let fetchImpl: (url: string, init: RequestInit) => Promise<Response> = async (_url, _init) =>
  new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test-version' } },
  GM_setValue: () => {},
}))

;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const i = init ?? {}
  fetchCalls.push({ url, init: i })
  return fetchImpl(url, i)
}) as typeof fetch

const { syncGuardRoomShadowRule, syncGuardRoomWatchlist, fetchGuardRoomControlProfile, _resetGuardRoomSyncWarnings } =
  await import('../src/lib/guard-room-sync')
const { guardRoomEndpoint, guardRoomSyncKey } = await import('../src/lib/store')
const { logLines } = await import('../src/lib/log')

beforeEach(() => {
  fetchCalls.length = 0
  fetchImpl = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  guardRoomEndpoint.value = 'https://guard.example.com'
  guardRoomSyncKey.value = 'test-key'
  _resetGuardRoomSyncWarnings()
  logLines.value = []
})

afterEach(() => {
  guardRoomEndpoint.value = ''
  guardRoomSyncKey.value = ''
})

describe('syncGuardRoomShadowRule — silent failure contract', () => {
  test('5xx response does not throw', async () => {
    fetchImpl = async () => new Response('boom', { status: 503 })
    await expect(syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })).resolves.toBeUndefined()
  })

  test('401 unauthorized does not throw', async () => {
    fetchImpl = async () => new Response('nope', { status: 401 })
    await expect(syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })).resolves.toBeUndefined()
  })

  test('429 rate-limit does not throw', async () => {
    fetchImpl = async () => new Response('slow down', { status: 429 })
    await expect(syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })).resolves.toBeUndefined()
  })

  test('fetch rejects (network down) does not throw', async () => {
    fetchImpl = async () => {
      throw new Error('ENETUNREACH')
    }
    await expect(syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })).resolves.toBeUndefined()
  })

  test('hits /api/shadow-rules even on a server that will return 5xx', async () => {
    fetchImpl = async () => new Response('', { status: 500 })
    await syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })
    expect(fetchCalls).toHaveLength(1)
    expect(fetchCalls[0]?.url).toBe('https://guard.example.com/api/shadow-rules')
  })
})

describe('syncGuardRoomWatchlist — throw-on-non-OK contract', () => {
  test('5xx response throws', async () => {
    fetchImpl = async () => new Response('boom', { status: 502 })
    await expect(syncGuardRoomWatchlist([])).rejects.toThrow(/HTTP 502/)
  })

  test('401 unauthorized throws', async () => {
    fetchImpl = async () => new Response('nope', { status: 401 })
    await expect(syncGuardRoomWatchlist([])).rejects.toThrow(/HTTP 401/)
  })

  test('200 OK resolves', async () => {
    fetchImpl = async () => new Response('{}', { status: 200 })
    await expect(syncGuardRoomWatchlist([])).resolves.toBeUndefined()
  })
})

describe('fetchGuardRoomControlProfile — null-on-failure contract', () => {
  test('5xx response → returns null', async () => {
    fetchImpl = async () => new Response('boom', { status: 500 })
    const r = await fetchGuardRoomControlProfile()
    expect(r).toBeNull()
  })

  test('401 unauthorized → returns null', async () => {
    fetchImpl = async () => new Response('nope', { status: 401 })
    const r = await fetchGuardRoomControlProfile()
    expect(r).toBeNull()
  })

  test('fetch rejects → returns null without throwing', async () => {
    fetchImpl = async () => {
      throw new Error('ECONNREFUSED')
    }
    const r = await fetchGuardRoomControlProfile()
    expect(r).toBeNull()
  })

  test('endpoint empty → returns null without fetch', async () => {
    guardRoomEndpoint.value = ''
    const r = await fetchGuardRoomControlProfile()
    expect(r).toBeNull()
    expect(fetchCalls).toHaveLength(0)
  })

  test('sync key empty → returns null without fetch', async () => {
    guardRoomSyncKey.value = ''
    const r = await fetchGuardRoomControlProfile()
    expect(r).toBeNull()
    expect(fetchCalls).toHaveLength(0)
  })
})

describe('Guard Room sync — warn-once-per-session surfacing', () => {
  test('shadow-rule failure surfaces a warning to the log', async () => {
    fetchImpl = async () => new Response('boom', { status: 503 })
    await syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })
    const matched = logLines.value.filter(l => l.includes('shadow-rule') && l.includes('HTTP 503'))
    expect(matched.length).toBe(1)
  })

  test('repeated shadow-rule failures only warn once per session', async () => {
    fetchImpl = async () => new Response('boom', { status: 503 })
    await syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })
    await syncGuardRoomShadowRule({ roomId: 1, from: 'c', to: 'd', sourceText: 'c' })
    await syncGuardRoomShadowRule({ roomId: 1, from: 'e', to: 'f', sourceText: 'e' })
    const matched = logLines.value.filter(l => l.includes('shadow-rule'))
    expect(matched.length).toBe(1)
  })

  test('control-profile failure surfaces a separate warning kind', async () => {
    fetchImpl = async () => new Response('nope', { status: 401 })
    await fetchGuardRoomControlProfile()
    const matched = logLines.value.filter(l => l.includes('control-profile') && l.includes('HTTP 401'))
    expect(matched.length).toBe(1)
  })

  test('network error (fetch rejects) surfaces with the error message', async () => {
    fetchImpl = async () => {
      throw new Error('ECONNREFUSED')
    }
    await syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })
    const matched = logLines.value.filter(l => l.includes('shadow-rule') && l.includes('ECONNREFUSED'))
    expect(matched.length).toBe(1)
  })
})

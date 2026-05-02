// Targeted tests for the Layer 2 cloud uplink — `syncGuardRoomShadowRule`
// gates on `guardRoomEndpoint` + `guardRoomSyncKey` and POSTs a tightly-shaped
// payload to `/api/shadow-rules`. Both gating paths and payload contents need
// real-impl coverage, since `tests/shadow-learn.test.ts` only sees the call
// through a mock.

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

interface FetchCall {
  url: string
  init: RequestInit
}
const fetchCalls: FetchCall[] = []
let fetchImpl: (url: string, init: RequestInit) => Promise<Response> = async () => {
  return new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
}

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test-version' } },
  GM_setValue: () => {},
}))

// `guard-room-sync` calls `fetch` directly. Stub the global so tests can
// observe the request without a real network round-trip.
;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async (
  input: RequestInfo | URL,
  init?: RequestInit
) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url
  const i = init ?? {}
  fetchCalls.push({ url, init: i })
  return fetchImpl(url, i)
}) as typeof fetch

const { syncGuardRoomShadowRule } = await import('../src/lib/guard-room-sync')
const { guardRoomEndpoint, guardRoomSyncKey } = await import('../src/lib/store')

beforeEach(() => {
  fetchCalls.length = 0
  fetchImpl = async () => new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } })
  guardRoomEndpoint.value = ''
  guardRoomSyncKey.value = ''
})

afterEach(() => {
  guardRoomEndpoint.value = ''
  guardRoomSyncKey.value = ''
})

describe('syncGuardRoomShadowRule', () => {
  test('no-ops when endpoint is empty', async () => {
    guardRoomSyncKey.value = 'k'
    await syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })
    expect(fetchCalls).toHaveLength(0)
  })

  test('no-ops when sync key is empty', async () => {
    guardRoomEndpoint.value = 'https://guard.example.com'
    await syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })
    expect(fetchCalls).toHaveLength(0)
  })

  test('POSTs to /api/shadow-rules with the configured endpoint and sync key', async () => {
    guardRoomEndpoint.value = 'https://guard.example.com'
    guardRoomSyncKey.value = 'secret'
    await syncGuardRoomShadowRule({
      roomId: 12345,
      from: '上车冲鸭',
      to: '上­车­冲­鸭',
      sourceText: '上车冲鸭',
    })
    expect(fetchCalls).toHaveLength(1)
    const call = fetchCalls[0]
    expect(call.url).toBe('https://guard.example.com/api/shadow-rules')
    expect(call.init.method).toBe('POST')
    const headers = call.init.headers as Record<string, string>
    expect(headers['content-type']).toBe('application/json')
    expect(headers['x-sync-key']).toBe('secret')
  })

  test('payload includes kind, occurredAt, scriptVersion, and the rule fields', async () => {
    guardRoomEndpoint.value = 'https://guard.example.com'
    guardRoomSyncKey.value = 'secret'
    await syncGuardRoomShadowRule({
      roomId: 7,
      from: 'x',
      to: 'y',
      sourceText: 'xx',
    })
    const body = JSON.parse(fetchCalls[0].init.body as string)
    expect(body.kind).toBe('shadow_rule_learned')
    expect(body.roomId).toBe(7)
    expect(body.from).toBe('x')
    expect(body.to).toBe('y')
    expect(body.sourceText).toBe('xx')
    expect(typeof body.occurredAt).toBe('string')
    expect(typeof body.scriptVersion).toBe('string')
    expect(body.scriptVersion.length).toBeGreaterThan(0)
  })

  test('truncates sourceText to 200 characters on the wire', async () => {
    guardRoomEndpoint.value = 'https://guard.example.com'
    guardRoomSyncKey.value = 'secret'
    const long = 'a'.repeat(500)
    await syncGuardRoomShadowRule({
      roomId: 1,
      from: 'a',
      to: 'b',
      sourceText: long,
    })
    const body = JSON.parse(fetchCalls[0].init.body as string)
    expect(body.sourceText.length).toBe(200)
  })

  test('strips trailing slashes from the endpoint when building the URL', async () => {
    guardRoomEndpoint.value = 'https://guard.example.com//'
    guardRoomSyncKey.value = 'secret'
    await syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })
    expect(fetchCalls[0].url).toBe('https://guard.example.com/api/shadow-rules')
  })

  test('refuses non-loopback http endpoints (security gate inherited from normalize)', async () => {
    guardRoomEndpoint.value = 'http://attacker.example.com'
    guardRoomSyncKey.value = 'secret'
    await syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })
    expect(fetchCalls).toHaveLength(0)
  })

  test('swallows fetch errors silently (fire-and-forget)', async () => {
    guardRoomEndpoint.value = 'https://guard.example.com'
    guardRoomSyncKey.value = 'secret'
    fetchImpl = async () => {
      throw new Error('network down')
    }
    await expect(syncGuardRoomShadowRule({ roomId: 1, from: 'a', to: 'b', sourceText: 'a' })).resolves.toBeUndefined()
  })
})

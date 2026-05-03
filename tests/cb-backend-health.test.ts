/**
 * Coverage for the always-on cb-backend health status:
 *  - default state is 'idle' before anyone subscribes
 *  - flipping `cbBackendEnabled` to true triggers a probe and sets 'ok' or 'fail'
 *  - flipping back to false returns the state to 'idle' (no orphan red dot)
 *  - URL override change while enabled triggers a fresh probe
 *
 * The `startCbBackendHealthProbe` lifecycle effect is the unit under test;
 * gmFetch is stubbed at module level so we control the response.
 */

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

type GmFetchResponder = () =>
  | { ok: boolean; json: <T>() => T; status?: number }
  | Promise<{ ok: boolean; json: <T>() => T; status?: number }>

let gmFetchResponder: GmFetchResponder = () => ({
  ok: true,
  status: 200,
  json: <T>() => ({ ok: true, phase: 'D', upstreams: { laplace: true, sbhzm: true, cb: true } }) as T,
})

mock.module('../src/lib/gm-fetch', () => ({
  gmFetch: async () => gmFetchResponder(),
}))

mock.module('../src/lib/log', () => ({
  appendLog: () => {},
  appendLogQuiet: () => {},
}))

const { startCbBackendHealthProbe } = await import('../src/lib/app-lifecycle')
const { cbBackendEnabled, cbBackendHealthState, cbBackendUrlOverride } = await import('../src/lib/store-meme')

let dispose: (() => void) | null = null

beforeEach(() => {
  cbBackendEnabled.value = false
  cbBackendUrlOverride.value = ''
  cbBackendHealthState.value = 'idle'
  gmFetchResponder = () => ({
    ok: true,
    status: 200,
    json: <T>() => ({ ok: true, phase: 'D', upstreams: { laplace: true, sbhzm: true, cb: true } }) as T,
  })
})

afterEach(() => {
  if (dispose) {
    dispose()
    dispose = null
  }
  cbBackendEnabled.value = false
  cbBackendUrlOverride.value = ''
  cbBackendHealthState.value = 'idle'
})

async function flushAsyncQueue() {
  await new Promise(resolve => setTimeout(resolve, 0))
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe('startCbBackendHealthProbe', () => {
  test('default state is "idle"; no probe fires while disabled', async () => {
    let fetchCalls = 0
    gmFetchResponder = () => {
      fetchCalls++
      return {
        ok: true,
        status: 200,
        json: <T>() => ({ ok: true, phase: 'D', upstreams: { laplace: true, sbhzm: true, cb: true } }) as T,
      }
    }
    dispose = startCbBackendHealthProbe()
    await flushAsyncQueue()
    expect(cbBackendHealthState.value).toBe('idle')
    expect(fetchCalls).toBe(0)
  })

  test('enabling the backend triggers a probe → state becomes "ok" on healthy response', async () => {
    dispose = startCbBackendHealthProbe()
    cbBackendEnabled.value = true
    await flushAsyncQueue()
    expect(cbBackendHealthState.value).toBe('ok')
  })

  test('enabling triggers a probe → state becomes "fail" on 5xx', async () => {
    gmFetchResponder = () => ({ ok: false, status: 503, json: <T>() => ({}) as T })
    dispose = startCbBackendHealthProbe()
    cbBackendEnabled.value = true
    await flushAsyncQueue()
    expect(cbBackendHealthState.value).toBe('fail')
  })

  test('enabling triggers a probe → state becomes "fail" on network error', async () => {
    gmFetchResponder = () => {
      throw new Error('ECONNREFUSED')
    }
    dispose = startCbBackendHealthProbe()
    cbBackendEnabled.value = true
    await flushAsyncQueue()
    expect(cbBackendHealthState.value).toBe('fail')
  })

  test('disabling resets the state to "idle" (no stale red dot)', async () => {
    gmFetchResponder = () => ({ ok: false, status: 500, json: <T>() => ({}) as T })
    dispose = startCbBackendHealthProbe()
    cbBackendEnabled.value = true
    await flushAsyncQueue()
    expect(cbBackendHealthState.value).toBe('fail')

    cbBackendEnabled.value = false
    await flushAsyncQueue()
    expect(cbBackendHealthState.value).toBe('idle')
  })

  test('URL override change while enabled triggers a re-probe', async () => {
    let fetchCalls = 0
    gmFetchResponder = () => {
      fetchCalls++
      return {
        ok: true,
        status: 200,
        json: <T>() => ({ ok: true, phase: 'D', upstreams: { laplace: true, sbhzm: true, cb: true } }) as T,
      }
    }
    dispose = startCbBackendHealthProbe()
    cbBackendEnabled.value = true
    await flushAsyncQueue()
    expect(fetchCalls).toBe(1)

    cbBackendUrlOverride.value = 'http://localhost:8787'
    await flushAsyncQueue()
    expect(fetchCalls).toBe(2)
  })

  test('dispose stops the effect (no probe after dispose)', async () => {
    let fetchCalls = 0
    gmFetchResponder = () => {
      fetchCalls++
      return {
        ok: true,
        status: 200,
        json: <T>() => ({ ok: true, phase: 'D', upstreams: { laplace: true, sbhzm: true, cb: true } }) as T,
      }
    }
    dispose = startCbBackendHealthProbe()
    cbBackendEnabled.value = true
    await flushAsyncQueue()
    const before = fetchCalls

    dispose?.()
    dispose = null
    cbBackendEnabled.value = false
    cbBackendEnabled.value = true
    await flushAsyncQueue()
    expect(fetchCalls).toBe(before)
  })
})

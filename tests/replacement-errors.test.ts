/**
 * Error-path coverage for the workers.vrp.moe remote-keywords HTTP fetch.
 *
 * Happy path + sanitization are covered in:
 *   - replacement.test.ts
 *   - replacement-reactive.test.ts
 *   - remote-keywords-sanitize.test.ts
 *
 * This file targets the previously untested HTTP failure modes that
 * `fetchRemoteKeywords` is supposed to surface as thrown errors so the
 * UI can reflect a sync failure and keep the existing cached map.
 */

import { beforeEach, describe, expect, test } from 'bun:test'

type FetchResponder = () => Response | Promise<Response>

let fetchResponder: FetchResponder = () =>
  new Response(JSON.stringify({}), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })

;(globalThis as typeof globalThis & { fetch: typeof fetch }).fetch = (async () => fetchResponder()) as typeof fetch

const { fetchRemoteKeywords } = await import('../src/lib/remote-keywords-fetch')

beforeEach(() => {
  fetchResponder = () => new Response(JSON.stringify({}), { status: 200 })
})

describe('fetchRemoteKeywords — error paths', () => {
  test('5xx response → throws with HTTP status', async () => {
    fetchResponder = () => new Response('boom', { status: 503, statusText: 'Service Unavailable' })
    await expect(fetchRemoteKeywords()).rejects.toThrow(/HTTP 503/)
  })

  test('404 response → throws', async () => {
    fetchResponder = () => new Response('not found', { status: 404, statusText: 'Not Found' })
    await expect(fetchRemoteKeywords()).rejects.toThrow(/HTTP 404/)
  })

  test('malformed JSON body → throws', async () => {
    // Caller is expected to catch this and keep the existing cached keywords.
    fetchResponder = () =>
      new Response('{this is not json', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    await expect(fetchRemoteKeywords()).rejects.toThrow()
  })

  test('fetch rejects (network down) → propagates rejection', async () => {
    fetchResponder = () => {
      throw new Error('ENETUNREACH')
    }
    await expect(fetchRemoteKeywords()).rejects.toThrow(/ENETUNREACH/)
  })

  test('non-object JSON (e.g. an array) → resolves to empty sanitized result', async () => {
    // Documents the contract: sanitizeRemoteKeywords drops anything that
    // isn't a plain object, so callers see an empty {} rather than an
    // error in this case. A 200 with a misshapen body should not look
    // like a failure to the UI; it just produces no remote rules.
    fetchResponder = () =>
      new Response(JSON.stringify(['unexpected', 'array']), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    const result = await fetchRemoteKeywords()
    expect(result).toEqual({})
  })

  test('JSON null → resolves to empty sanitized result, no throw', async () => {
    fetchResponder = () =>
      new Response('null', {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    const result = await fetchRemoteKeywords()
    expect(result).toEqual({})
  })
})

// Regression tests for audit Finding #7: `cbBackendUrlOverride` was a free-form
// user-pasted string. Without normalization a typo (or attacker-supplied URL
// dropped into the settings UI) would cause meme submissions, including any
// configured username, to POST to that destination. Mirrors the same rules as
// `normalizeGuardRoomEndpoint` — see `guard-room-endpoint.test.ts`.

import { describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
  GM_xmlhttpRequest: () => {},
}))

const { normalizeCbBackendUrl } = await import('../src/lib/cb-backend-client')

describe('normalizeCbBackendUrl', () => {
  test('accepts https endpoints and strips trailing slashes', () => {
    expect(normalizeCbBackendUrl('https://chatterbox-cloud.aijc-eric.workers.dev')).toBe(
      'https://chatterbox-cloud.aijc-eric.workers.dev'
    )
    expect(normalizeCbBackendUrl('https://chatterbox-cloud.aijc-eric.workers.dev/')).toBe(
      'https://chatterbox-cloud.aijc-eric.workers.dev'
    )
    expect(normalizeCbBackendUrl('  https://chatterbox-cloud.aijc-eric.workers.dev///  ')).toBe(
      'https://chatterbox-cloud.aijc-eric.workers.dev'
    )
  })

  test('accepts http only for loopback hosts (wrangler dev)', () => {
    expect(normalizeCbBackendUrl('http://localhost:8787')).toBe('http://localhost:8787')
    expect(normalizeCbBackendUrl('http://127.0.0.1:8787')).toBe('http://127.0.0.1:8787')
    expect(normalizeCbBackendUrl('http://[::1]:8787')).toBe('http://[::1]:8787')
  })

  test('rejects http for non-loopback hosts (would exfiltrate username + roomId)', () => {
    expect(normalizeCbBackendUrl('http://attacker.example.com')).toBe('')
    expect(normalizeCbBackendUrl('http://chatterbox-cloud.aijc-eric.workers.dev')).toBe('')
  })

  test('rejects non-http(s) schemes', () => {
    expect(normalizeCbBackendUrl('javascript:alert(1)')).toBe('')
    expect(normalizeCbBackendUrl('file:///etc/passwd')).toBe('')
    expect(normalizeCbBackendUrl('data:text/plain,leak')).toBe('')
    expect(normalizeCbBackendUrl('ws://example.com')).toBe('')
  })

  test('rejects unparseable input', () => {
    expect(normalizeCbBackendUrl('')).toBe('')
    expect(normalizeCbBackendUrl('   ')).toBe('')
    expect(normalizeCbBackendUrl('not a url')).toBe('')
    expect(normalizeCbBackendUrl('//missing-scheme.example.com')).toBe('')
  })
})

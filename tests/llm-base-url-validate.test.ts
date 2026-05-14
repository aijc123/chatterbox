/**
 * Regression tests for the LLM base URL validator added in v2.13.11 (B10).
 *
 * The validator is the script's anti-phishing gate for OpenAI-compatible
 * provider URLs: any host outside `KNOWN_LLM_HOSTS` (and not in the
 * RFC1918/loopback "local" set for Ollama-style self-hosts) trips a yellow
 * warning. The warning is not a hard block — Tampermonkey's per-domain
 * confirm dialog is still the user's last gate — but if this list ever
 * regresses, phishing pages slip past the yellow text and look "blessed".
 */

import { describe, expect, test } from 'bun:test'

import { isKnownLlmHost, isLocalHost, KNOWN_LLM_HOSTS, validateLlmBaseUrl } from '../src/lib/llm-base-url-validate'

describe('validateLlmBaseUrl — error severities (hard format problems)', () => {
  test('missing http(s):// prefix → error with prefix-hint message', () => {
    const r = validateLlmBaseUrl('api.deepseek.com/v1')
    expect(r).not.toBeNull()
    expect(r?.severity).toBe('error')
    expect(r?.message).toMatch(/缺少协议前缀/)
  })

  test('empty string → error (no scheme)', () => {
    const r = validateLlmBaseUrl('')
    expect(r?.severity).toBe('error')
  })

  test('garbage URL that survives the scheme regex but fails URL parse → URL 格式不合法', () => {
    // The scheme regex only checks /^https?:\/\//, so a malformed authority
    // like `http://` (no host) makes new URL() throw. (`URL('http://')` throws
    // "Invalid URL" in Bun/V8/jsdom-spec engines.)
    const r = validateLlmBaseUrl('http://')
    expect(r?.severity).toBe('error')
    // Either "格式不合法" or "缺少主机名" is acceptable depending on the
    // engine — both correctly reject.
    expect(r?.message).toMatch(/格式不合法|缺少主机名/)
  })

  test('javascript: scheme → error (regex stops it at the scheme gate)', () => {
    // Regex /^https?:\/\// is case-insensitive (`/i` flag) but does NOT
    // match `javascript:`. This is the first line of defense — we never
    // even reach the URL constructor.
    const r = validateLlmBaseUrl('javascript:alert(1)')
    expect(r?.severity).toBe('error')
    expect(r?.message).toMatch(/缺少协议前缀/)
  })
})

describe('validateLlmBaseUrl — known LLM provider hosts (silent pass)', () => {
  test.each([
    ['https://api.anthropic.com/v1/messages'],
    ['https://api.openai.com/v1'],
    ['https://api.deepseek.com'],
    ['https://api.moonshot.cn/v1'],
    ['https://openrouter.ai/api/v1'],
    ['https://api.siliconflow.cn/v1'],
    ['https://api.together.xyz/v1'],
    ['https://api.groq.com/openai/v1'],
    ['https://token-plan-sgp.xiaomimimo.com/v1'],
  ])('%s returns null (silent pass)', url => {
    expect(validateLlmBaseUrl(url)).toBeNull()
  })

  test('subdomain of a known host (eu.api.openai.com) also passes via endsWith', () => {
    // The matcher accepts `h === known || h.endsWith('.' + known)`. A
    // hypothetical regional OpenAI sub like `eu.api.openai.com` should
    // pass without a warning.
    expect(validateLlmBaseUrl('https://eu.api.openai.com/v1')).toBeNull()
  })

  test('http:// (not https) is allowed for known hosts — Ollama-style local proxies', () => {
    // The validator only requires the scheme to be http or https; it does
    // NOT require https. (https is enforced higher up in the LLM driver, not
    // here.)
    expect(validateLlmBaseUrl('http://api.openai.com')).toBeNull()
  })
})

describe('validateLlmBaseUrl — phishing defense (the critical safety property)', () => {
  test('evil-deepseek.com is NOT a known host (would-be phisher)', () => {
    const r = validateLlmBaseUrl('https://evil-deepseek.com/v1')
    expect(r).not.toBeNull()
    expect(r?.severity).toBe('warn')
    expect(r?.message).toMatch(/钓鱼/)
  })

  test('deepseek.com.evil.io (suffix attack) → warn, not silent pass', () => {
    // The most dangerous phishing pattern: attacker's domain has the legit
    // host as a prefix. endsWith match must require a literal "." separator
    // so `deepseek.com.evil.io` does NOT match `deepseek.com`.
    const r = validateLlmBaseUrl('https://deepseek.com.evil.io/v1')
    expect(r).not.toBeNull()
    expect(r?.severity).toBe('warn')
  })

  test('host containing a known suffix as a substring (apideepseek.com) → warn', () => {
    // Substring inclusion is not allowed — only exact-match or proper
    // subdomain. `apideepseek.com` does NOT have `api.deepseek.com` as a
    // suffix preceded by a literal ".".
    const r = validateLlmBaseUrl('https://apideepseek.com/v1')
    expect(r?.severity).toBe('warn')
  })

  test('case-insensitive: uppercase known host still passes', () => {
    // Hostnames are case-insensitive per RFC, and isKnownLlmHost lowercases.
    expect(validateLlmBaseUrl('https://API.OPENAI.COM/v1')).toBeNull()
  })
})

describe('validateLlmBaseUrl — local / Ollama bypass', () => {
  test.each([
    ['http://localhost:11434'],
    ['http://127.0.0.1:8080'],
    ['http://[::1]:8080'],
    ['http://192.168.1.50:8080'],
    ['http://10.0.0.5:8080'],
    ['http://172.16.0.5:8080'],
    ['http://172.31.0.5:8080'],
    ['http://ollama.local:11434'],
    ['http://devbox.local'],
  ])('%s is treated as local (no warning, no error)', url => {
    expect(validateLlmBaseUrl(url)).toBeNull()
  })

  test('172.15.x is OUTSIDE the RFC1918 172.16-31 range → warns', () => {
    // Edge of the 172.x range: only 172.16.0.0 – 172.31.255.255 is RFC1918.
    // 172.15.x.x is public space and must not silently pass.
    const r = validateLlmBaseUrl('http://172.15.0.5/v1')
    expect(r?.severity).toBe('warn')
  })

  test('172.32.x is OUTSIDE the RFC1918 range → warns', () => {
    const r = validateLlmBaseUrl('http://172.32.0.5/v1')
    expect(r?.severity).toBe('warn')
  })

  test('a public IP like 8.8.8.8 → warns (not in local set)', () => {
    const r = validateLlmBaseUrl('http://8.8.8.8/v1')
    expect(r?.severity).toBe('warn')
  })
})

describe('isLocalHost (helper) — RFC1918 + loopback boundary checks', () => {
  test('IPv4 loopback', () => {
    expect(isLocalHost('localhost')).toBe(true)
    expect(isLocalHost('127.0.0.1')).toBe(true)
  })

  test('IPv6 loopback', () => {
    expect(isLocalHost('::1')).toBe(true)
  })

  test('10.0.0.0/8 — full /8', () => {
    expect(isLocalHost('10.0.0.0')).toBe(true)
    expect(isLocalHost('10.255.255.255')).toBe(true)
  })

  test('192.168.0.0/16', () => {
    expect(isLocalHost('192.168.0.0')).toBe(true)
    expect(isLocalHost('192.168.255.255')).toBe(true)
  })

  test('172.16.0.0/12 — only 16..31', () => {
    expect(isLocalHost('172.16.0.0')).toBe(true)
    expect(isLocalHost('172.20.5.5')).toBe(true)
    expect(isLocalHost('172.31.255.255')).toBe(true)
    // Outside the /12.
    expect(isLocalHost('172.15.0.0')).toBe(false)
    expect(isLocalHost('172.32.0.0')).toBe(false)
  })

  test('.local suffix (mDNS / Bonjour) recognized', () => {
    expect(isLocalHost('printer.local')).toBe(true)
    expect(isLocalHost('not.actually.local')).toBe(true)
  })

  test('public hostnames are not local', () => {
    expect(isLocalHost('api.openai.com')).toBe(false)
    expect(isLocalHost('localhost.evil.io')).toBe(false) // 看起来像 local 但不是
  })
})

describe('isKnownLlmHost (helper) — exact + subdomain match only', () => {
  test('every entry in KNOWN_LLM_HOSTS is recognized as itself', () => {
    for (const host of KNOWN_LLM_HOSTS) {
      expect(isKnownLlmHost(host)).toBe(true)
    }
  })

  test('proper subdomain match', () => {
    expect(isKnownLlmHost('eu.api.openai.com')).toBe(true)
    expect(isKnownLlmHost('foo.bar.api.openai.com')).toBe(true)
  })

  test('substring without `.` boundary does NOT match', () => {
    expect(isKnownLlmHost('apideepseek.com')).toBe(false)
    expect(isKnownLlmHost('fakeapi.openai.com.evil.io')).toBe(false)
  })

  test('completely unrelated host', () => {
    expect(isKnownLlmHost('example.com')).toBe(false)
    expect(isKnownLlmHost('bilibili.com')).toBe(false)
  })
})

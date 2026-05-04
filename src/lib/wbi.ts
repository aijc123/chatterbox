import type { BilibiliWbiKeys } from '../types'

import { md5 } from './md5'

/** WBI keys captured by XHR hijack; set when /x/web-interface/nav response is received. */
export let cachedWbiKeys: BilibiliWbiKeys | null = null

/**
 * Diagnostic counter incremented every time a `nav` XHR response cannot be
 * parsed or doesn't contain WBI keys. A non-zero value with `cachedWbiKeys`
 * still null usually means B 站 changed the nav payload shape and the
 * extractor needs a fix. Inspect via `window.__chatterboxWbiParseFailures` in
 * DevTools when a user reports "弹幕签名不工作".
 */
export const wbiDiagnostics = { parseFailures: 0, extractMisses: 0 }

if (typeof window !== 'undefined') {
  ;(window as unknown as { __chatterboxWbiParseFailures?: typeof wbiDiagnostics }).__chatterboxWbiParseFailures =
    wbiDiagnostics
}

function setCachedWbiKeys(keys: BilibiliWbiKeys) {
  cachedWbiKeys = keys
}

function extractWbiKeys(data: { data?: { wbi_img?: { img_url?: string; sub_url?: string } } }): BilibiliWbiKeys | null {
  const imgUrl = data.data?.wbi_img?.img_url
  const subUrl = data.data?.wbi_img?.sub_url
  const img_key = imgUrl?.split('/').pop()?.split('.')[0] ?? ''
  const sub_key = subUrl?.split('/').pop()?.split('.')[0] ?? ''
  return img_key && sub_key ? { img_key, sub_key } : null
}

/** Test-only re-export of the private nav-payload extractor. */
export const _extractWbiKeysForTests = extractWbiKeys

/** Test-only reset of the cached WBI keys (fixture isolation). */
export function _resetCachedWbiKeysForTests(): void {
  cachedWbiKeys = null
}

;(() => {
  // Sentinel: avoid double-wrapping the prototype if this module is re-imported
  // (e.g. when the userscript runs in both the top frame and a nested iframe).
  const sentinel = '__chatterboxWbiHijackInstalled' as const
  const proto = XMLHttpRequest.prototype as XMLHttpRequest & { [sentinel]?: boolean }
  if (proto[sentinel]) return
  proto[sentinel] = true

  const originalOpen = XMLHttpRequest.prototype.open
  const originalSend = XMLHttpRequest.prototype.send

  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    async?: boolean,
    username?: string | null,
    password?: string | null
  ) {
    ;(this as XMLHttpRequest & { _url?: string })._url = typeof url === 'string' ? url : url.toString()
    return originalOpen.call(this, method, url, async ?? true, username ?? null, password ?? null)
  }

  XMLHttpRequest.prototype.send = function (body?: Document | XMLHttpRequestBodyInit | null) {
    const url = (this as XMLHttpRequest & { _url?: string })._url
    if (url?.includes('/x/web-interface/nav')) {
      this.addEventListener('load', function () {
        let data: { data?: { wbi_img?: { img_url?: string; sub_url?: string } } } | null = null
        try {
          data = JSON.parse(this.responseText)
        } catch {
          // Malformed nav response. Bump diagnostic counter and clear any
          // stale cache so callers fall back to the explicit fetch path in
          // `ensureWbiKeys` instead of signing requests with a key that's no
          // longer valid (B 站 has rotated WBI mixin tables before).
          wbiDiagnostics.parseFailures++
          cachedWbiKeys = null
          return
        }
        const keys = data ? extractWbiKeys(data) : null
        if (keys) {
          setCachedWbiKeys(keys)
        } else {
          // Valid JSON but missing wbi_img — usually means B 站 changed the
          // payload shape. Don't clobber a previously-good cache, but track
          // the miss so issue reports surface it.
          wbiDiagnostics.extractMisses++
        }
      })
    }

    return originalSend.call(this, body)
  }
})()

/**
 * Waits for WBI keys to become available via XHR interception.
 */
export async function waitForWbiKeys(timeout = 5000, interval = 100): Promise<boolean> {
  const startTime = Date.now()
  while (!cachedWbiKeys) {
    if (Date.now() - startTime > timeout) {
      return false
    }
    await new Promise(r => setTimeout(r, interval))
  }
  return true
}

/**
 * Ensures WBI keys are available. The page usually provides them through the
 * nav XHR that we intercept above, but some userscript start timings miss it.
 */
export async function ensureWbiKeys(): Promise<BilibiliWbiKeys | null> {
  if (cachedWbiKeys) return cachedWbiKeys
  if (await waitForWbiKeys(1500)) return cachedWbiKeys

  try {
    const resp = await fetch('https://api.bilibili.com/x/web-interface/nav', {
      method: 'GET',
      credentials: 'include',
    })
    if (!resp.ok) return null
    let data: { data?: { wbi_img?: { img_url?: string; sub_url?: string } } } | null = null
    try {
      data = await resp.json()
    } catch {
      wbiDiagnostics.parseFailures++
      return null
    }
    const keys = data ? extractWbiKeys(data) : null
    if (keys) {
      setCachedWbiKeys(keys)
    } else {
      wbiDiagnostics.extractMisses++
    }
  } catch {
    // Best-effort fallback. Callers can decide how to proceed without keys.
  }

  return cachedWbiKeys
}

// https://s1.hdslb.com/bfs/static/laputa-home/client/assets/vendor.7679ec63.js
const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41,
  13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34,
  44, 52,
]

function getMixinKey(orig: string): string {
  return mixinKeyEncTab
    .map(n => orig[n])
    .join('')
    .slice(0, 32)
}

/** Test-only re-export of the private mixin-key derivation. */
export const _getMixinKeyForTests = getMixinKey

/**
 * Adds wts and w_rid to request parameters (WBI signature).
 */
export function encodeWbi(params: Record<string, string | number>, wbiKeys: BilibiliWbiKeys): string {
  const mixin_key = getMixinKey(wbiKeys.img_key + wbiKeys.sub_key)
  const currentTime = Math.round(Date.now() / 1000)
  const charaFilter = /[!'()*]/g

  const paramsWithWts: Record<string, string | number> = { ...params, wts: currentTime }

  const sortedQuery = Object.keys(paramsWithWts)
    .sort()
    .map(key => {
      const resolvedValue = paramsWithWts[key]?.toString() ?? ''
      const value = resolvedValue.replace(charaFilter, '')
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
    .join('&')

  const wbi_sign = md5(sortedQuery + mixin_key)

  const unsortedQuery = Object.keys(params)
    .map(key => {
      const resolvedValue = params[key]?.toString() ?? ''
      const value = resolvedValue.replace(charaFilter, '')
      return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    })
    .join('&')

  return `${unsortedQuery}&w_rid=${wbi_sign}&wts=${currentTime}`
}

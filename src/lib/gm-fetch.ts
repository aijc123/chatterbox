/**
 * Thin `fetch`-shaped wrapper over `GM_xmlhttpRequest`.
 *
 * Used ONLY for cross-origin endpoints that don't support browser CORS:
 * - sbhzm.cn (community meme library)
 * - api.anthropic.com (LLM)
 * - api.openai.com / openai-compatible providers (LLM)
 *
 * Everything else stays on plain `fetch()` — see `src/lib/api.ts` etc.
 *
 * Each domain consumed here MUST be listed in `vite.config.ts` `connect`
 * so vite-plugin-monkey emits a matching `// @connect` line in the
 * userscript header. Otherwise Tampermonkey will block the request.
 */

// We need vite-plugin-monkey to add `@grant GM_xmlhttpRequest` to the
// userscript header at build time. It does that by static analysis of the
// source — the literal string `GM_xmlhttpRequest` below in the type alias is
// what triggers the grant. At runtime we resolve the function via dynamic
// import (see `resolveGmXhr`) so each call picks up whichever `$` mock is
// currently active in the test process. A named static import would bind
// once at module link time and break under bun test's per-test `mock.module`
// reassignment.
import type { GM_xmlhttpRequest as GmXhrType } from '$'

export interface GmFetchInit {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  headers?: Record<string, string>
  body?: string
  /** Per-request timeout in milliseconds. Default 20000. */
  timeoutMs?: number
  /**
   * Optional AbortSignal. When the signal fires, the underlying
   * `GM_xmlhttpRequest` handle is aborted and the returned promise rejects
   * with `gmFetch aborted: <url>`. Already-settled requests ignore the abort.
   */
  signal?: AbortSignal
}

export interface GmFetchResponse {
  ok: boolean
  status: number
  statusText: string
  url: string
  text: () => string
  json: <T = unknown>() => T
  headers: string
}

// Test-only override hook. Production never sets this. We use a DI hook
// instead of relying on bun test's `mock.module('$', ...)` because once `$`
// is loaded by ANY earlier test, bun caches its exports — both static and
// dynamic imports — so subsequent re-mocks don't reach gm-fetch's resolver.
let _xhrOverride: typeof GmXhrType | null = null

/** @internal Tests only. Pass `null` to clear the override. */
export function _setGmXhrForTests(fn: typeof GmXhrType | null): void {
  _xhrOverride = fn
}

async function resolveGmXhr(): Promise<typeof GmXhrType | null> {
  if (_xhrOverride) return _xhrOverride
  const m = (await import('$')) as { GM_xmlhttpRequest?: typeof GmXhrType }
  return typeof m.GM_xmlhttpRequest === 'function' ? m.GM_xmlhttpRequest : null
}

/**
 * Strip query string and user:pass from a URL before including it in a log
 * line / error message. If the URL has a token in the path/query (e.g. a
 * user-overridden cb-backend URL with `?token=…` or `/<token>/api`), this
 * keeps the path scheme + host visible for debugging but drops the secret.
 * Falls back to a generic placeholder if the URL is unparseable.
 */
export function scrubUrlForLog(raw: string): string {
  try {
    const u = new URL(raw)
    return `${u.origin}${u.pathname}`
  } catch {
    return '<unparseable-url>'
  }
}

/**
 * Send a request via `GM_xmlhttpRequest` and resolve to a Response-like object.
 *
 * Errors (network, abort, timeout) reject with a plain Error so callers can
 * `try/catch` like any other fetch. Pass `init.signal` to make the request
 * cancellable from outside.
 */
export async function gmFetch(url: string, init: GmFetchInit = {}): Promise<GmFetchResponse> {
  const { method = 'GET', headers, body, timeoutMs = 20000, signal } = init

  const xhr = await resolveGmXhr()
  if (!xhr) {
    throw new Error('gmFetch: GM_xmlhttpRequest unavailable (userscript grant missing or test stub).')
  }

  // Fast path: caller already aborted before the request was even constructed.
  if (signal?.aborted) {
    throw new Error(`gmFetch aborted: ${scrubUrlForLog(url)}`)
  }

  return new Promise<GmFetchResponse>((resolve, reject) => {
    let settled = false
    let abortListener: (() => void) | null = null
    const cleanupAbort = () => {
      if (abortListener && signal) {
        signal.removeEventListener('abort', abortListener)
        abortListener = null
      }
    }
    const finishOnce = (fn: () => void) => {
      if (settled) return
      settled = true
      cleanupAbort()
      fn()
    }

    const handle = xhr({
      method,
      url,
      headers,
      data: body,
      timeout: timeoutMs,
      responseType: 'text',
      onload: resp => {
        finishOnce(() => {
          const status = resp.status
          const text = String(resp.responseText ?? '')
          resolve({
            ok: status >= 200 && status < 300,
            status,
            statusText: resp.statusText ?? '',
            url: resp.finalUrl ?? url,
            headers: resp.responseHeaders ?? '',
            text: () => text,
            json: <T = unknown>() => JSON.parse(text) as T,
          })
        })
      },
      onerror: err => {
        finishOnce(() => {
          const detail = err && typeof err === 'object' ? (err as { error?: string }).error : ''
          reject(new Error(`gmFetch network error: ${detail || 'unknown'} (url=${scrubUrlForLog(url)})`))
        })
      },
      ontimeout: () => {
        finishOnce(() => reject(new Error(`gmFetch timeout after ${timeoutMs}ms: ${scrubUrlForLog(url)}`)))
      },
      onabort: () => {
        finishOnce(() => reject(new Error(`gmFetch aborted: ${scrubUrlForLog(url)}`)))
      },
    })

    if (signal) {
      abortListener = () => {
        if (settled) return
        // Best-effort: not every GM userscript engine returns an abortable handle.
        // Tampermonkey/Violentmonkey/GreaseMonkey 4+ do; older engines silently
        // ignore. We still reject the promise either way so the caller can stop
        // awaiting — but we can't guarantee the underlying XHR is interrupted.
        try {
          ;(handle as { abort?: () => void } | undefined)?.abort?.()
        } catch {
          // ignore engine-side abort errors
        }
        finishOnce(() => reject(new Error(`gmFetch aborted: ${scrubUrlForLog(url)}`)))
      }
      signal.addEventListener('abort', abortListener, { once: true })
    }
  })
}

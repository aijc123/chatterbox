import { effect } from '@preact/signals'

import { unsafeWindow } from '$'
import { BASE_URL, CHATTERBOX_SEND_MARKER } from './const'
import {
  applyTransforms,
  type HijackOpts,
  injectSpaceBlockBanner,
  removeSpaceBlockBanner,
  shouldHijackUrl,
} from './fetch-hijack-helpers'
import { appendLog } from './log'
import { verifyBroadcast } from './send-verification'
import { unlockForbidLive, unlockSpaceBlock } from './store'

function currentOpts(): HijackOpts {
  return {
    unlockForbidLive: unlockForbidLive.value,
    unlockSpaceBlock: unlockSpaceBlock.value,
  }
}

// Self-healing observer for `.header.space-header`. We run at
// `document-start` on `space.bilibili.com` so the header may not yet be
// in the DOM when the matching API response arrives. The observer waits
// for it. Module-scoped so a toggle-off `effect()` can cancel a pending
// injection — without that, an observer waiting for a late-mounted
// header would inject the banner after the user disabled the feature.
let spaceBlockObserver: MutationObserver | null = null

function disconnectSpaceBlockObserver(): void {
  spaceBlockObserver?.disconnect()
  spaceBlockObserver = null
}

function clearSpaceBlockBanner(): void {
  disconnectSpaceBlockObserver()
  removeSpaceBlockBanner()
}

function ensureSpaceBlockBanner(): void {
  const headerSelector = '.header.space-header'
  const header = document.querySelector<HTMLElement>(headerSelector)
  if (header) {
    injectSpaceBlockBanner(header)
    return
  }
  // Cancel any earlier pending observer so we keep at most one alive.
  disconnectSpaceBlockObserver()
  spaceBlockObserver = new MutationObserver(() => {
    // The user can flip `unlockSpaceBlock` off in the configurator
    // between us setting up this observer and B站 finally mounting
    // the space header. Re-read the signal so we don't inject behind
    // the user's back. The `effect(...)` below also disconnects on
    // toggle-off — this check is a defensive fallback for cases where
    // the observer fires before the effect microtask runs.
    if (!unlockSpaceBlock.value) {
      disconnectSpaceBlockObserver()
      return
    }
    const h = document.querySelector<HTMLElement>(headerSelector)
    if (!h) return
    disconnectSpaceBlockObserver()
    injectSpaceBlockBanner(h)
  })
  spaceBlockObserver.observe(document.documentElement, { childList: true, subtree: true })
}

// React to the configurator toggle in real time so disabling the
// feature drops the banner immediately, without forcing a reload.
// (Re-enabling only re-shows it on the next fetch hit, which matches
// the existing "刷新生效" UX of the toggle itself.)
effect(() => {
  if (!unlockSpaceBlock.value) clearSpaceBlockBanner()
})

function handleTransformResult(result: ReturnType<typeof applyTransforms>): void {
  if (result.kind !== 'space') return
  // Same SPA-navigation rationale as in the original LAPLACE script:
  // clear the previous user's banner before deciding whether the
  // current user's relation needs one. Bilibili's space pages reuse
  // the header across SPA route changes, so a stale banner would
  // otherwise linger when navigating to an account that isn't
  // blocking us.
  clearSpaceBlockBanner()
  if (result.wasBlocking) ensureSpaceBlockBanner()
}
/** Patches Response consumption for specific Bilibili API endpoints. */
;(() => {
  try {
    const ResponseProto = unsafeWindow.Response.prototype as Response & {
      __chatterboxFetchHijackInstalled?: boolean
    }
    if (ResponseProto.__chatterboxFetchHijackInstalled) return
    ResponseProto.__chatterboxFetchHijackInstalled = true

    const origJson = ResponseProto.json
    ResponseProto.json = async function (this: Response): Promise<unknown> {
      const data = await origJson.call(this)
      const url = this.url
      // Fast path: skip transform inspection unless the feature is enabled and
      // the URL is one we care about. `applyTransforms` short-circuits too,
      // but doing it here avoids the function call entirely.
      const opts = currentOpts()
      if (!url || !shouldHijackUrl(url, opts) || !data || typeof data !== 'object') return data
      try {
        handleTransformResult(applyTransforms(url, data, opts))
      } catch (err) {
        console.error('[Chatterbox] fetch-hijack json transform failed:', err)
      }
      return data
    }

    const origText = ResponseProto.text
    ResponseProto.text = async function (this: Response): Promise<string> {
      const text = await origText.call(this)
      const url = this.url
      const opts = currentOpts()
      if (!url || !shouldHijackUrl(url, opts)) return text
      try {
        const data = JSON.parse(text)
        handleTransformResult(applyTransforms(url, data, opts))
        return JSON.stringify(data)
      } catch {
        return text
      }
    }
  } catch (err) {
    console.error('[Chatterbox] failed to install fetch-hijack:', err)
  }
})()

function isOurOwnSend(url: string): boolean {
  return url.includes(CHATTERBOX_SEND_MARKER)
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.toString()
  return input.url
}

function extractMsgFromBody(body: BodyInit | null | undefined): string | null {
  if (!body) return null
  if (body instanceof FormData) {
    const v = body.get('msg')
    return typeof v === 'string' ? v : null
  }
  if (body instanceof URLSearchParams) return body.get('msg')
  if (typeof body === 'string') {
    try {
      return new URLSearchParams(body).get('msg')
    } catch {
      return null
    }
  }
  return null
}
/**
 * Wraps `window.fetch` to observe danmaku sent through Bilibili's native UI
 * (when Chatterbox is not the originator). Successful sends are logged and
 * passed to `verifyBroadcast`, mirroring the verification that
 * loop/manual/+1/auto-blend now do.
 */
;(() => {
  try {
    const win = unsafeWindow as Window & { __chatterboxMsgSendHijackInstalled?: boolean }
    if (win.__chatterboxMsgSendHijackInstalled) return
    win.__chatterboxMsgSendHijackInstalled = true

    const origFetch = win.fetch.bind(win)
    win.fetch = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      try {
        const url = urlOf(input)
        const isMsgSend = url.includes(BASE_URL.BILIBILI_MSG_SEND)
        if (!isMsgSend) return origFetch(input, init)
        if (isOurOwnSend(url)) return origFetch(input, init)

        // Snapshot the message text BEFORE awaiting the fetch — the body stream
        // may already have been consumed by the time the response settles.
        const startedAt = Date.now()
        const msg = extractMsgFromBody(init?.body)
        const resp = await origFetch(input, init)

        // Read response via clone to avoid disturbing the page's own consumer.
        resp
          .clone()
          .json()
          .then(json => {
            if (!msg) return
            // biome-ignore lint/suspicious/noExplicitAny: Bilibili response shape is loose
            const code = (json as any)?.code
            if (code !== 0) return
            appendLog(`✅ B站原生: ${msg}`)
            void verifyBroadcast({
              text: msg,
              label: 'B站原生',
              display: msg,
              sinceTs: startedAt,
            })
          })
          .catch(() => {
            // Ignore parse errors — verification is best-effort.
          })
        return resp
      } catch (err) {
        // Never break the page: any unexpected error falls through to the
        // original fetch.
        console.error('[Chatterbox] msg-send hijack error:', err)
        return origFetch(input, init)
      }
    }) as typeof fetch
  } catch (err) {
    console.error('[Chatterbox] failed to install msg-send hijack:', err)
  }
})()

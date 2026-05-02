import { unsafeWindow } from '$'
import { BASE_URL, CHATTERBOX_SEND_HEADER, CHATTERBOX_SEND_VALUE } from './const'
import { appendLog } from './log'
import { verifyBroadcast } from './send-verification'
import { unlockForbidLive } from './store'

const GET_INFO_BY_USER_PATTERN = '/xlive/web-room/v1/index/getInfoByUser'

function shouldHijackUrl(url: string): boolean {
  return unlockForbidLive.value && url.includes(GET_INFO_BY_USER_PATTERN)
}

// biome-ignore lint/suspicious/noExplicitAny: parsed JSON shape from Bilibili is not stable
function applyTransforms(url: string, data: any): void {
  if (!shouldHijackUrl(url)) return
  const forbid = data?.data?.forbid_live
  if (!forbid) return
  forbid.is_forbid = false
  forbid.forbid_text = ''
}
/** Patches Response consumption for specific Bilibili live API endpoints. */
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
      if (!url || !shouldHijackUrl(url) || !data || typeof data !== 'object') return data
      try {
        applyTransforms(url, data)
      } catch (err) {
        console.error('[Chatterbox] fetch-hijack json transform failed:', err)
      }
      return data
    }

    const origText = ResponseProto.text
    ResponseProto.text = async function (this: Response): Promise<string> {
      const text = await origText.call(this)
      const url = this.url
      if (!url || !shouldHijackUrl(url)) return text
      try {
        const data = JSON.parse(text)
        applyTransforms(url, data)
        return JSON.stringify(data)
      } catch {
        return text
      }
    }
  } catch (err) {
    console.error('[Chatterbox] failed to install fetch-hijack:', err)
  }
})()

function isOurOwnSend(init?: RequestInit): boolean {
  const headers = init?.headers
  if (!headers) return false
  if (headers instanceof Headers) return headers.get(CHATTERBOX_SEND_HEADER) === CHATTERBOX_SEND_VALUE
  if (Array.isArray(headers)) {
    return headers.some(([k, v]) => k === CHATTERBOX_SEND_HEADER && v === CHATTERBOX_SEND_VALUE)
  }
  return (headers as Record<string, string>)[CHATTERBOX_SEND_HEADER] === CHATTERBOX_SEND_VALUE
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
        if (isOurOwnSend(init)) return origFetch(input, init)

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

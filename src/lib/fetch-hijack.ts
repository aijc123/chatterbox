import { unsafeWindow } from '$'
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

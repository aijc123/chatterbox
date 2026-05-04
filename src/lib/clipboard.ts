/**
 * Cross-browser clipboard helper.
 *
 * `navigator.clipboard.writeText` is missing or rejects in several common
 * userscript scenarios:
 *  - HTTP pages (B 站 直播间 is HTTPS today, but local dev or self-hosted
 *    fixture pages aren't always).
 *  - Firefox + Violentmonkey, where the Clipboard API can throw
 *    NotAllowedError when not triggered by a direct user gesture.
 *  - Older browsers / non-Chromium engines that lack the Clipboard API
 *    entirely.
 *
 * `copyTextToClipboard` first attempts the modern Clipboard API and falls
 * back to a hidden `<textarea>` + `document.execCommand('copy')`, which is
 * deprecated but still ubiquitously implemented and synchronous.
 *
 * Returns `true` iff *some* path succeeded, `false` if both fail (caller
 * should toast a "复制失败" message).
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to execCommand
  }

  if (typeof document === 'undefined') return false

  try {
    const textarea = document.createElement('textarea')
    textarea.value = text
    // Off-screen + readonly so the page doesn't scroll to / focus the
    // textarea on mobile/Safari while the copy is in flight.
    textarea.setAttribute('readonly', '')
    textarea.style.position = 'fixed'
    textarea.style.top = '0'
    textarea.style.left = '0'
    textarea.style.opacity = '0'
    textarea.style.pointerEvents = 'none'
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, text.length)
    const ok = document.execCommand('copy')
    textarea.remove()
    return ok
  } catch {
    return false
  }
}

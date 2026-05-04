/**
 * Pure DOM parsers used by `user-blacklist.ts` to extract a UID + username
 * from a Bilibili danmaku item. Lives in its own file so unit tests can
 * exercise them without dragging in the full `user-blacklist` runtime
 * (signal subscriptions, document-level event handlers, log emissions).
 *
 * Bilibili's chat DOM is unstable — they sometimes ship a class rename
 * mid-stream — so the parsers consult several selector / attribute
 * fallbacks. The username extractor also filters out noise text that
 * accidentally lands in candidate elements (装扮 / 粉丝牌 / 复制 / 举报 /
 * 回复 / 关闭 sub-strings come from sibling overlay elements that some
 * skins re-parent under `[class*="user-name"]`).
 */

const UNAME_NOISE_RE = /通过活动|装扮|粉丝牌|用户等级|头像|复制|举报|回复|关闭/
const MAX_UNAME_LENGTH = 32

/**
 * Extracts the streamer's UID from a `.chat-item.danmaku-item` element.
 *
 * Tries (in order):
 *   1. `data-uid` attribute (modern desktop layout).
 *   2. `<a href="…space.bilibili.com/{uid}…">` (most legacy layouts).
 *   3. `<a href="…?uid={uid}…">` (some experimental layouts).
 *
 * Returns `null` when nothing matches — caller should skip blacklist
 * actions rather than guess.
 */
export function extractUidFromDanmakuItem(item: HTMLElement): string | null {
  const direct = item.getAttribute('data-uid')
  if (direct) return direct
  const link = item.querySelector<HTMLAnchorElement>('a[href*="space.bilibili.com"], a[href*="uid="]')
  const href = link?.href ?? ''
  return href.match(/space\.bilibili\.com\/(\d+)/)?.[1] ?? href.match(/[?&]uid=(\d+)/)?.[1] ?? null
}

/**
 * Extracts a clean username from a `.chat-item.danmaku-item` element. Tries
 * several known selectors, prefers `data-uname` and `title` over text
 * content (text often leaks badge / decoration noise on themed rooms),
 * normalizes whitespace, and rejects values that:
 *  - exceed `MAX_UNAME_LENGTH` (likely a sub-element with concatenated text);
 *  - match `UNAME_NOISE_RE` (text from sibling decoration / context-menu UI).
 */
export function extractUnameFromDanmakuItem(item: HTMLElement): string | null {
  const selectors = ['[data-uname]', '.user-name', '.username', '.danmaku-item-user', '[class*="user-name"]']
  for (const selector of selectors) {
    const el = item.querySelector<HTMLElement>(selector)
    const value = el?.getAttribute('data-uname') ?? el?.getAttribute('title') ?? el?.textContent
    const clean = (value ?? '').replace(/\s+/g, ' ').trim()
    if (clean && clean.length <= MAX_UNAME_LENGTH && !UNAME_NOISE_RE.test(clean)) return clean
  }
  return null
}

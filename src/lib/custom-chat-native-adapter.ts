import { BASE_URL } from './const'
import { type CustomChatEvent, type CustomChatField, type CustomChatKind, chatEventTime } from './custom-chat-events'

// ── Selector & scan constants ────────────────────────────────────────────────

export const NATIVE_EVENT_SELECTOR =
  '.chat-item, .super-chat-card, .gift-item, [class*="super"], [class*="gift"], [class*="guard"], [class*="privilege"]'

export const NATIVE_HEALTH_WINDOW = 12000
export const NATIVE_HEALTH_MIN_SCANS = 24
export const NATIVE_HEALTH_MAX_EVENTS = 0
export const MAX_NATIVE_SCAN_BATCH = 48
export const MAX_NATIVE_INITIAL_SCAN = 80
export const NATIVE_SCAN_DEBOUNCE_MS = 16

/** True when the node is a candidate for scanning, not an internal root element. */
export function shouldScanNativeEventNode(node: HTMLElement, rootId: string): boolean {
  if (node.closest(`#${rootId}`)) return false
  if (node.classList.contains('danmaku-item')) return false
  return node.matches(NATIVE_EVENT_SELECTOR) || node.querySelector(NATIVE_EVENT_SELECTOR) !== null
}

// ── Pure string helpers ──────────────────────────────────────────────────────

export function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * 用于「去重折叠」的归一化键。在 compactText + 小写之上做三件事：
 *  1. 单字符连续重复折成 1 个 ——「666」「6666」 → "6"；「哈哈哈」「哈哈」 → "哈"。
 *  2. 整串周期性重复折成 1 份 ——「晚安晚安晚安」「你好你好」「[doge][doge]」
 *     → "晚安" / "你好" / "[doge]"。这是独轮车换长度刷屏的典型规避手法
 *     （直接发 "晚安" 容易触发 B 站去重，于是改发 "晚安晚安"、"晚安晚安晚安" …
 *     每条文本都不一样，骗过简单等值合并）。我们对完整字符串做最小周期检测，把
 *     这一族变种全归到同一把卡键。
 *  3. 全部小写 ——「NICE」「nice」算同一条。
 *
 * 非周期串和单字仍保持原样：「wow」「你好啊」「abc」「[doge]」 不会被错误折叠。
 */
export function wheelFoldKey(value: string): string {
  const compacted = compactText(value)
    .replace(/(.)\1+/g, '$1')
    .toLowerCase()
  return collapseRepeatedString(compacted)
}

/**
 * 把 `unit.repeat(n)` 形态的串折回 `unit`。线性扫描，找最小可行周期；不是严格周期
 * 的字符串（含尾巴 / 噪声）保持原样返回。
 *
 * 例：「晚安晚安晚安」(n=6, k=2) → "晚安"；「abcabc」(n=6, k=3) → "abc"；
 *    「晚安啊」无周期 → "晚安啊"。
 */
function collapseRepeatedString(s: string): string {
  const n = s.length
  if (n < 2) return s
  for (let k = 1; k * 2 <= n; k++) {
    if (n % k !== 0) continue
    const unit = s.slice(0, k)
    let matches = true
    for (let i = k; i < n; i += k) {
      if (s.slice(i, i + k) !== unit) {
        matches = false
        break
      }
    }
    if (matches) return unit
  }
  return s
}

export function parseBadgeLevel(raw: string): number | null {
  const text = compactText(raw)
  const match = text.match(/^(?:UL|LV)\s*(\d{1,3})$/iu) ?? text.match(/^用户等级[:：]?\s*(\d{1,3})$/u)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value >= 0 ? value : null
}

export function formatBadgeLevel(level: number): string {
  return `LV${Math.max(0, Math.trunc(level))}`
}

export function cleanDisplayName(value: string): string {
  return compactText(value).replace(/\s*[：:]\s*$/u, '')
}

export function isBadDisplayName(value: string): boolean {
  return !value || /通过活动|查看我的装扮|获得|装扮|荣耀|粉丝牌|用户等级|头像|复制|举报|回复|关闭/u.test(value)
}

export function usefulBadgeText(raw: string, uname: string): string | null {
  const level = parseBadgeLevel(raw)
  const text =
    level === null
      ? compactText(raw)
          .replace(/^粉丝牌[:：]?/u, '')
          .replace(/^荣耀[:：]?/u, '')
          .replace(/^用户等级[:：]?/u, '')
      : formatBadgeLevel(level)
  if (!text || text.length > 16) return null
  if (/这是\s*TA\s*的|TA 的|TA的|荣耀|粉丝|复制|举报|回复|关闭|头像/u.test(text)) return null
  if (uname && (text === uname || text.startsWith(`${uname} `) || text.startsWith(`${uname}　`))) return null
  return text
}

export function isNoiseEventText(text: string): boolean {
  const clean = compactText(text)
  if (!clean) return true
  if (/^(头像|匿名|复制|举报|回复|关闭|更多|展开|收起|弹幕|礼物|SC|进场|通知|暂停|清屏|状态|显示)$/u.test(clean))
    return true
  return /^搜索\s*user:/u.test(clean)
}

// ── Avatar URL ───────────────────────────────────────────────────────────────

export function resolveAvatarUrl(uid: string | null): string | undefined {
  return uid ? `${BASE_URL.BILIBILI_AVATAR}/${uid}?size=96` : undefined
}

// ── Native DOM readers ───────────────────────────────────────────────────────

export function nodeText(node: HTMLElement): string {
  return compactText(node.textContent ?? '')
}

export function attrText(node: HTMLElement, attr: string): string | null {
  const value = node.getAttribute(attr)
  return value ? compactText(value) : null
}

export function nativeUid(node: HTMLElement): string | null {
  const direct = attrText(node, 'data-uid') ?? node.querySelector<HTMLElement>('[data-uid]')?.getAttribute('data-uid')
  if (direct) return direct
  const link = node.querySelector<HTMLAnchorElement>('a[href*="space.bilibili.com"], a[href*="uid="]')
  const href = link?.href ?? ''
  return href.match(/space\.bilibili\.com\/(\d+)/)?.[1] ?? href.match(/[?&]uid=(\d+)/)?.[1] ?? null
}

export function nativeUname(node: HTMLElement, text: string): string {
  const selectors = ['[data-uname]', '.user-name', '.username', '.name', '[class*="user-name"]', '[class*="username"]']
  for (const selector of selectors) {
    const el = node.querySelector<HTMLElement>(selector)
    const value = el?.getAttribute('data-uname') ?? el?.getAttribute('title') ?? el?.textContent
    const clean = cleanDisplayName(value ?? '')
    if (clean && clean !== text && clean.length <= 32 && !isBadDisplayName(clean)) return clean
  }
  return '匿名'
}

export function nativeAvatar(node: HTMLElement): string | undefined {
  for (const img of node.querySelectorAll<HTMLImageElement>('img')) {
    const src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('src')
    if (!src) continue
    const label = `${img.className} ${img.alt}`.toLowerCase()
    if (label.includes('avatar') || label.includes('face') || label.includes('head') || label.includes('头像'))
      return src
  }
  return undefined
}

export function nativeKind(node: HTMLElement, text: string): CustomChatKind | null {
  const signal = `${node.className} ${text}`
  if (/super[-_ ]?chat|superchat|醒目留言|醒目|￥|¥|\bSC\b/iu.test(signal)) return 'superchat'
  if (/舰长|提督|总督|大航海|guard|privilege|开通|续费/iu.test(signal)) return 'guard'
  if (/红包|red[-_ ]?envelop/iu.test(signal)) return 'redpacket'
  if (/天选|lottery|抽奖/iu.test(signal)) return 'lottery'
  if (/关注|follow/iu.test(signal)) return 'follow'
  if (/点赞|like/iu.test(signal)) return 'like'
  if (/分享|share/iu.test(signal)) return 'share'
  if (/gift|礼物|赠送|投喂|送出|小花花|辣条|电池|x\s*\d+/iu.test(signal)) return 'gift'
  return null
}

export function nativeBadges(node: HTMLElement, text: string, uname: string): string[] {
  const badges: string[] = []
  for (const el of node.querySelectorAll<HTMLElement>(
    '[title], [aria-label], [class*="medal"], [class*="guard"], [class*="level"]'
  )) {
    const raw = el.getAttribute('title') ?? el.getAttribute('aria-label') ?? el.textContent ?? ''
    const clean = usefulBadgeText(raw, uname)
    if (!clean || clean === text || badges.includes(clean)) continue
    badges.push(clean)
    if (badges.length >= 3) break
  }
  if (/总督/iu.test(text)) badges.unshift('GUARD 1')
  else if (/提督/iu.test(text)) badges.unshift('GUARD 2')
  else if (/舰长/iu.test(text)) badges.unshift('GUARD 3')
  return [...new Set(badges)]
}

// ── Parse context & main parser ──────────────────────────────────────────────

export interface NativeParseContext {
  /** Root element ID to exclude from scanning (avoids processing our own chat nodes). */
  rootId: string
  /** Returns a fresh unique string ID for the parsed event, e.g. `"native-42"`. */
  nextId: () => string
}

export function parseNativeEvent(node: HTMLElement, ctx: NativeParseContext): CustomChatEvent | null {
  if (node.classList.contains('danmaku-item')) return null
  if (node.closest(`#${ctx.rootId}`)) return null
  const text = nodeText(node)
  if (isNoiseEventText(text) || text.length < 2) return null
  const kind = nativeKind(node, text)
  if (!kind) return null
  const uname = nativeUname(node, text)
  const uid = nativeUid(node)
  const badges = nativeBadges(node, text, uname)
  const avatar = nativeAvatar(node) || resolveAvatarUrl(uid)
  if (uname === '匿名' && !uid && !avatar && text.length <= 4) return null
  const giftMatch = kind === 'gift' ? text.match(/([\p{Script=Han}\w·・ぁ-んァ-ンー\s]+?)\s*x\s*(\d+)/iu) : null
  const fields: CustomChatField[] = []
  if (kind === 'gift' && giftMatch) {
    fields.push({ key: 'gift-name', label: '礼物', value: compactText(giftMatch[1]), kind: 'text' })
    fields.push({ key: 'gift-count', label: '数量', value: `x${giftMatch[2]}`, kind: 'count' })
  }
  if (kind === 'guard') {
    const guard = /总督/u.test(text) ? '总督' : /提督/u.test(text) ? '提督' : '舰长'
    fields.push({ key: 'guard-level', label: '等级', value: guard, kind: 'level' })
    const month = text.match(/(\d+)\s*(个月|月)/u)?.[1]
    if (month) fields.push({ key: 'guard-months', label: '月份', value: `${month}个月`, kind: 'duration' })
  }
  return {
    id: ctx.nextId(),
    kind,
    text,
    sendText: kind === 'superchat' ? text : undefined,
    uname,
    uid,
    time: chatEventTime(),
    isReply: false,
    source: 'dom',
    badges,
    avatarUrl: avatar,
    fields,
  }
}

// ── Health tracking (pure) ───────────────────────────────────────────────────

/**
 * Returns true when the native DOM source looks unhealthy: at least minScans
 * samples have been collected but the parsed-event count is at or below maxEvents.
 */
export function isNativeDomUnhealthy(
  samples: Array<{ ts: number; parsed: boolean }>,
  minScans: number,
  maxEvents: number
): boolean {
  if (samples.length < minScans) return false
  return samples.filter(s => s.parsed).length <= maxEvents
}

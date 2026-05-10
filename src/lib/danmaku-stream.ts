/**
 * Shared danmaku stream — a single MutationObserver on `.chat-items` that
 * fans out events to all subscribers. Both `danmaku-direct` (for inline
 * +1/steal buttons) and `auto-blend` (for trending detection) subscribe
 * here so we don't run multiple observers on the same DOM node.
 *
 * Lifecycle is reference-counted: the first subscribe attaches the observer
 * (waiting for `.chat-items` to appear if needed), and the last unsubscribe
 * tears everything down.
 */

export interface DanmakuEvent {
  /** The `.chat-item.danmaku-item` element. */
  node: HTMLElement
  /** Raw `data-danmaku` text (no @-reply prefix synthesis). */
  text: string
  /** Sender username, if extractable from the DOM. */
  uname: string | null
  /** Sender uid, if extractable from the DOM. */
  uid: string | null
  /** Small identity badges extracted from the native DOM, e.g. medal/level/admin. */
  badges: string[]
  /** Avatar URL from the native DOM, if Bilibili rendered one. */
  avatarUrl?: string
  /** Whether `data-replymid` is non-zero (i.e. a reply danmaku). */
  isReply: boolean
  /**
   * 是否是 fan-club 大表情（bulge-emoticon DOM marker）。这种表情的
   * `data-danmaku` 是显示名（如"应援"、"干杯"），不是 `emoticon_unique`，
   * 没法当成 unique ID 重新发出去——会变成纯文字"应援"两个字落进聊天。
   * 自动跟车 / 智驾应该一律丢弃，永远跟不动。
   */
  hasLargeEmote: boolean
}

export interface DanmakuSubscription {
  /**
   * Called once with the `.chat-items` container as soon as it's available.
   * If the container is already attached at subscribe time, called immediately.
   */
  onAttach?: (container: HTMLElement) => void
  /** Called for each new danmaku node added to the chat. */
  onMessage?: (event: DanmakuEvent) => void
  /**
   * If true, also call `onMessage` for every currently-rendered danmaku at
   * attach time. Useful for late subscribers that want to back-fill state
   * (e.g. inject buttons into already-displayed messages).
   */
  emitExisting?: boolean
}

const subscriptions = new Set<DanmakuSubscription>()
let observer: MutationObserver | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let healthTimer: ReturnType<typeof setInterval> | null = null
let attached: HTMLElement | null = null
let flushTimer: ReturnType<typeof setTimeout> | null = null
const pendingNodes = new Set<HTMLElement>()
const OBSERVER_DEBOUNCE_MS = 16

const USER_SELECTORS = [
  '[data-uname]',
  '[data-uid]',
  '.user-name',
  '.username',
  '.danmaku-item-user',
  '.chat-user-name',
  '[class*="user-name"]',
  '[class*="username"]',
]

const BADGE_SELECTORS = [
  '.fans-medal-item',
  '.fans-medal',
  '.medal-item',
  '.medal-name',
  '.chat-medal',
  '.user-level-icon',
  '.wealth-medal',
  '.guard-icon',
  '[class*="fans-medal"]',
  '[class*="medal"]',
  '[class*="level"]',
  '[class*="guard"]',
]

export function isValidDanmakuNode(node: HTMLElement): boolean {
  if (!node.classList.contains('chat-item') || !node.classList.contains('danmaku-item')) return false
  const count = node.classList.length
  if (count === 2) return true
  if (node.classList.contains('chat-colorful-bubble') && node.classList.contains('has-bubble') && count === 4)
    return true
  if (node.classList.contains('has-bubble') && count === 3) return true
  // 表情贴纸（"哈哈"/"NICE"/"[xxx 表情包]" 等）：dataset.danmaku 是表情名，可参与 +1、
  // 自动跟车、去重折叠。形状有 `chat-emoticon bulge-emoticon`（4 类）以及加了气泡装饰
  // `chat-colorful-bubble has-bubble chat-emoticon bulge-emoticon`（6 类）。放宽到只要
  // 同时含 chat-emoticon + bulge-emoticon 即接受，避免数 class 数量被 B 站新装饰打破。
  if (node.classList.contains('chat-emoticon') && node.classList.contains('bulge-emoticon')) return true
  return false
}

function cleanInlineText(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function isBadNameCandidate(value: string, text = ''): boolean {
  if (!value || value === text || value.length > 36) return true
  if (/通过活动|查看我的装扮|获得|装扮|荣耀|粉丝牌|用户等级|头像|复制|举报|回复|关闭/.test(value)) return true
  return /^[\d\s:：/.-]+$/.test(value)
}

function firstUsefulText(el: Element | null): string | null {
  if (!el) return null
  const value = el.getAttribute('data-uname') || cleanInlineText(el.textContent)
  return value ? value : null
}

function extractUid(node: HTMLElement, userEl: Element | null): string | null {
  const direct = node.getAttribute('data-uid') || userEl?.getAttribute('data-uid')
  if (direct) return direct
  const link = node.querySelector<HTMLAnchorElement>('a[href*="space.bilibili.com"], a[href*="uid="]')
  const href = link?.href ?? ''
  return href.match(/space\.bilibili\.com\/(\d+)/)?.[1] ?? href.match(/[?&]uid=(\d+)/)?.[1] ?? null
}

function extractUname(node: HTMLElement, userEl: Element | null, text: string): string | null {
  const direct = firstUsefulText(userEl)
  if (direct && !isBadNameCandidate(direct, text)) return direct
  for (const selector of USER_SELECTORS) {
    const value = firstUsefulText(node.querySelector(selector))
    if (value && !isBadNameCandidate(value, text)) return value
  }
  return null
}

function extractBadges(node: HTMLElement, text: string): string[] {
  const badges: string[] = []
  for (const el of node.querySelectorAll(BADGE_SELECTORS.join(','))) {
    const value = cleanInlineText(
      el.getAttribute('data-title') || el.getAttribute('title') || el.getAttribute('aria-label') || el.textContent
    )
    if (!value || value === text || value.length > 18) continue
    if (/^(头像|复制|回复|举报|关闭)$/.test(value)) continue
    if (!badges.includes(value)) badges.push(value)
    if (badges.length >= 5) break
  }
  return badges
}

function extractAvatar(node: HTMLElement): string | undefined {
  for (const img of node.querySelectorAll<HTMLImageElement>('img')) {
    const src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('src')
    if (!src) continue
    const label = `${img.className} ${img.alt}`.toLowerCase()
    if (label.includes('avatar') || label.includes('face') || label.includes('head') || label.includes('头像'))
      return src
  }
  return undefined
}

export function extractDanmakuInfo(node: HTMLElement): DanmakuEvent | null {
  const text = node.dataset.danmaku
  const replymid = node.dataset.replymid
  if (text === undefined || replymid === undefined) return null
  const userEl = node.querySelector(USER_SELECTORS.join(','))
  const uid = extractUid(node, userEl)
  return {
    node,
    text,
    uname: extractUname(node, userEl, text),
    uid,
    badges: extractBadges(node, text),
    avatarUrl: extractAvatar(node),
    isReply: replymid !== '0',
    // bulge-emoticon 这层 class 在 isValidDanmakuNode 里已经被白名单接受
    // (line ~91)。这里只是把同样的判定结果作为字段透传给订阅方，让自动
    // 跟车 / 智驾不用再去翻 DOM 就能识别大表情。
    hasLargeEmote: node.classList.contains('bulge-emoticon'),
  }
}

function notifyAttach(container: HTMLElement, sub: DanmakuSubscription): void {
  if (sub.onAttach) {
    try {
      sub.onAttach(container)
    } catch {
      // Subscriber errors are isolated; don't crash the shared stream.
    }
  }
  if (sub.emitExisting && sub.onMessage) {
    const onMessage = sub.onMessage
    for (const node of container.querySelectorAll<HTMLElement>('.chat-item.danmaku-item')) {
      if (!isValidDanmakuNode(node)) continue
      const ev = extractDanmakuInfo(node)
      if (!ev) continue
      try {
        onMessage(ev)
      } catch {
        // Subscriber errors are isolated; don't crash the shared stream.
      }
    }
  }
}

function startPollTimer(): void {
  if (pollTimer) return
  pollTimer = setInterval(() => {
    if (tryAttach() && pollTimer !== null) {
      clearInterval(pollTimer)
      pollTimer = null
    }
  }, 1000)
}

function tryAttach(): boolean {
  const container = document.querySelector<HTMLElement>('.chat-items')
  if (!container) return false
  attached = container

  for (const sub of subscriptions) notifyAttach(container, sub)

  const flushPendingNodes = (): void => {
    flushTimer = null
    for (const node of pendingNodes) {
      pendingNodes.delete(node)
      if (!node.isConnected || !isValidDanmakuNode(node)) continue
      const ev = extractDanmakuInfo(node)
      if (!ev) continue
      for (const sub of subscriptions) {
        if (!sub.onMessage) continue
        try {
          sub.onMessage(ev)
        } catch {
          // Subscriber errors are isolated; don't crash the shared stream.
        }
      }
    }
  }

  const scheduleFlush = (): void => {
    if (flushTimer) return
    flushTimer = setTimeout(flushPendingNodes, OBSERVER_DEBOUNCE_MS)
  }

  observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      for (let i = 0; i < m.addedNodes.length; i++) {
        const node = m.addedNodes[i]
        if (node.nodeType !== 1) continue
        const element = node as HTMLElement
        if (!isValidDanmakuNode(element)) continue
        pendingNodes.add(element)
      }
    }
    if (pendingNodes.size > 0) scheduleFlush()
  })
  observer.observe(container, { childList: true, subtree: false })
  return true
}

function ensureAttached(): void {
  // If the previously-attached container was removed from the DOM (e.g. during
  // SPA navigation or a Bilibili layout refresh), reset state before trying again.
  if (attached && !attached.isConnected) {
    observer?.disconnect()
    observer = null
    attached = null
  }
  if (attached || pollTimer) return
  if (tryAttach()) return
  startPollTimer()
}

function maybeDetach(): void {
  if (subscriptions.size > 0) return
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (healthTimer) {
    clearInterval(healthTimer)
    healthTimer = null
  }
  if (flushTimer) {
    clearTimeout(flushTimer)
    flushTimer = null
  }
  pendingNodes.clear()
  if (observer) {
    observer.disconnect()
    observer = null
  }
  attached = null
}

export function subscribeDanmaku(sub: DanmakuSubscription): () => void {
  subscriptions.add(sub)
  if (attached) {
    notifyAttach(attached, sub)
  } else {
    ensureAttached()
  }

  // Start a health-check timer on the first subscriber so we detect when
  // Bilibili replaces the chat container (SPA navigation, reconnect, etc.)
  // and re-attach automatically.
  if (!healthTimer) {
    healthTimer = setInterval(() => {
      if (attached && !attached.isConnected) {
        observer?.disconnect()
        observer = null
        attached = null
        if (!tryAttach()) startPollTimer()
      }
    }, 2000)
  }

  return () => {
    subscriptions.delete(sub)
    maybeDetach()
  }
}

export function getDanmakuContainer(): HTMLElement | null {
  return attached
}

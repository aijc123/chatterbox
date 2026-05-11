/**
 * Native chat fold — collapse repeated danmaku in Bilibili's official right-side
 * chat list. When the same text shows up again within FOLD_WINDOW_MS, the new
 * node is hidden and the original row gains a `×N` badge that increments.
 *
 * This is independent of `customChatFoldMode` (which works inside Chatterbox
 * Chat). Both can be enabled at once: this module operates on the native DOM,
 * Chatterbox Chat folds inside its own list.
 *
 * Pattern mirrors `danmaku-direct.ts`: subscribe to `danmaku-stream`, inject a
 * scoped style on attach, and remove all decoration on stop.
 */

import { wheelFoldKey } from './custom-chat-native-adapter'
import { type DanmakuEvent, subscribeDanmaku } from './danmaku-stream'

const MARKER = 'lc-native-fold-count'
const HIDDEN_ATTR = 'data-lc-native-fold-hidden'
const STYLE_ID = 'lc-native-fold-style'

const FOLD_WINDOW_MS = 9000
const FOLD_GC_THRESHOLD = 256

// Style notes:
//  - Use B 站 native muted gray (rgba(...)) so the badge reads like a sibling
//    chip to medal/level badges instead of screaming pink.
//  - `vertical-align: text-bottom` aligns the chip with CJK text baseline
//    inside the same span as the danmaku content; `inline-block` keeps it
//    inline with the text so it reads as "<text> ×N" rather than wrapping.
//  - margin-inline-start small so it hugs the text; padding tight; small font.
const STYLE = `
.${MARKER} {
  display: inline-block;
  margin-inline-start: 4px;
  padding: 0 5px;
  border-radius: 8px;
  background: rgba(0, 0, 0, .35);
  color: rgba(255, 255, 255, .92);
  font-size: 11px;
  font-weight: 600;
  line-height: 1.45;
  vertical-align: text-bottom;
  white-space: nowrap;
  pointer-events: none;
  user-select: none;
}
.chat-item.danmaku-item[${HIDDEN_ATTR}="1"] {
  display: none !important;
}
`

interface FoldEntry {
  node: HTMLElement
  count: number
  lastSeen: number
}

const foldByKey = new Map<string, FoldEntry>()

let unsubscribe: (() => void) | null = null
let styleEl: HTMLStyleElement | null = null

function gcFolds(now: number): void {
  for (const [key, entry] of foldByKey) {
    if (!entry.node.isConnected || now - entry.lastSeen > FOLD_WINDOW_MS) {
      foldByKey.delete(key)
    }
  }
}

function foldKey(text: string): string {
  // 复用 Chatterbox 那边同款的 wheelFoldKey：把不同长度的同字独轮车
  //（"666"/"6666"/"66666"，"哈哈"/"哈哈哈"）折到同一张卡上。
  return wheelFoldKey(text).slice(0, 80)
}

function ensureBadge(node: HTMLElement, count: number): void {
  let badge = node.querySelector<HTMLElement>(`.${MARKER}`)
  if (!badge) {
    badge = document.createElement('span')
    badge.className = MARKER
    // B 站 row layout is `<.danmaku-item-left>name：</.danmaku-item-left>
    // <.danmaku-item-right>text</.danmaku-item-right>`. We want the badge to
    // hug the danmaku text, so append it as the LAST child of the right-side
    // text container — yielding "name：text ×N". Inserting it as a sibling
    // *before* the right element would render as "name：×N text" (bug we hit
    // in initial release). Fall back to row-end append only if B 站 reshuffles
    // the row schema.
    const anchor = node.querySelector('.danmaku-item-right')
    if (anchor) anchor.appendChild(badge)
    else node.appendChild(badge)
  }
  badge.textContent = `×${count}`
  badge.setAttribute('aria-label', `近 ${FOLD_WINDOW_MS / 1000} 秒内同一弹幕共出现 ${count} 次`)
}

function handleMessage(ev: DanmakuEvent): void {
  const text = ev.text?.trim()
  if (!text) return

  const now = Date.now()
  if (foldByKey.size > FOLD_GC_THRESHOLD) gcFolds(now)

  const key = foldKey(text)
  const existing = foldByKey.get(key)

  if (existing?.node.isConnected && now - existing.lastSeen <= FOLD_WINDOW_MS) {
    if (existing.node !== ev.node) {
      ev.node.setAttribute(HIDDEN_ATTR, '1')
    }
    existing.count += 1
    existing.lastSeen = now
    ensureBadge(existing.node, existing.count)
    return
  }

  foldByKey.set(key, { node: ev.node, count: 1, lastSeen: now })
}

export function startNativeChatFold(): void {
  if (unsubscribe) return

  unsubscribe = subscribeDanmaku({
    onAttach: () => {
      if (!styleEl) {
        styleEl = document.createElement('style')
        styleEl.id = STYLE_ID
        styleEl.textContent = STYLE
        document.head.appendChild(styleEl)
      }
    },
    onMessage: handleMessage,
    // 折叠只对"新到达"的事件生效，回放历史会让旧节点被错误折叠。
    emitExisting: false,
  })
}

export function stopNativeChatFold(): void {
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  if (styleEl) {
    styleEl.remove()
    styleEl = null
  }
  for (const node of Array.from(document.querySelectorAll<HTMLElement>(`[${HIDDEN_ATTR}]`))) {
    node.removeAttribute(HIDDEN_ATTR)
  }
  for (const badge of Array.from(document.querySelectorAll<HTMLElement>(`.${MARKER}`))) {
    badge.remove()
  }
  foldByKey.clear()
}

/** @internal Exposed for tests. */
export function _resetNativeChatFoldStateForTests(): void {
  foldByKey.clear()
}

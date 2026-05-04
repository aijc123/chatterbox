/**
 * Injects an auto-follow blacklist toggle into Bilibili's danmaku context menu,
 * and exposes helpers for the panel UI to manage the blacklist.
 */

import { appendLog } from './log'
import { autoBlendUserBlacklist } from './store'
import { extractUidFromDanmakuItem, extractUnameFromDanmakuItem } from './user-blacklist-parsers'

const INJECTED_ATTR = 'data-lc-bl'

let lastUid: string | null = null
let lastUname: string | null = null
let contextMenuHandler: ((e: Event) => void) | null = null

function closeNativeContextMenu(): void {
  for (const li of document.querySelectorAll('li')) {
    if (li.textContent?.trim() === '关闭') {
      li.click()
      return
    }
  }
}

function createMenuItem(source: HTMLLIElement, label: string): HTMLLIElement {
  const item = document.createElement('li')
  item.className = source.className
  item.setAttribute(INJECTED_ATTR, '')
  item.textContent = label
  return item
}

function tryInjectMenuItem(copyLi: HTMLLIElement): void {
  if (!lastUid) return
  const ul = copyLi.parentElement
  if (!ul || ul.querySelector(`[${INJECTED_ATTR}]`)) return

  const isBlacklisted = lastUid in autoBlendUserBlacklist.value
  const label = isBlacklisted ? '解除融入黑名单' : '添加融入黑名单'
  const el = createMenuItem(copyLi, label)

  el.addEventListener('click', () => {
    const uid = lastUid
    if (!uid) return
    const next = { ...autoBlendUserBlacklist.value }
    const display = lastUname || uid
    if (uid in next) {
      delete next[uid]
      appendLog(`🚲 已解除融入黑名单：${display}`)
    } else {
      next[uid] = lastUname ?? ''
      appendLog(`🚲 已加入融入黑名单：${display}`)
    }
    autoBlendUserBlacklist.value = next
    closeNativeContextMenu()
  })

  ul.insertBefore(el, copyLi.nextSibling)
}

export function startUserBlacklistHijack(): void {
  if (contextMenuHandler) return

  contextMenuHandler = (e: Event) => {
    const target = e.target
    if (!(target instanceof HTMLElement)) {
      lastUid = null
      lastUname = null
      return
    }
    const item = target.closest<HTMLElement>('.chat-item.danmaku-item')
    if (!item) {
      lastUid = null
      lastUname = null
      return
    }
    lastUid = extractUidFromDanmakuItem(item)
    lastUname = extractUnameFromDanmakuItem(item)

    requestAnimationFrame(() => {
      for (const li of document.querySelectorAll<HTMLLIElement>('li')) {
        if (li.textContent?.trim() === '复制弹幕') {
          tryInjectMenuItem(li)
          break
        }
      }
    })
  }

  document.addEventListener('contextmenu', contextMenuHandler)
}

export function stopUserBlacklistHijack(): void {
  if (contextMenuHandler) {
    document.removeEventListener('contextmenu', contextMenuHandler)
    contextMenuHandler = null
  }
  lastUid = null
  lastUname = null
  for (const el of Array.from(document.querySelectorAll(`[${INJECTED_ATTR}]`))) {
    el.remove()
  }
}

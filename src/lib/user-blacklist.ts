/**
 * Injects an auto-follow blacklist toggle into Bilibili's danmaku context menu,
 * and exposes helpers for the panel UI to manage the blacklist.
 */

import { appendLog } from './log'
import { autoBlendUserBlacklist } from './store'

const INJECTED_ATTR = 'data-lc-bl'

let lastUid: string | null = null
let lastUname: string | null = null
let contextMenuHandler: (() => void) | null = null

function extractUidFromDanmakuItem(item: HTMLElement): string | null {
  const direct = item.getAttribute('data-uid')
  if (direct) return direct
  const link = item.querySelector<HTMLAnchorElement>('a[href*="space.bilibili.com"], a[href*="uid="]')
  const href = link?.href ?? ''
  return href.match(/space\.bilibili\.com\/(\d+)/)?.[1] ?? href.match(/[?&]uid=(\d+)/)?.[1] ?? null
}

function extractUnameFromDanmakuItem(item: HTMLElement): string | null {
  const selectors = ['[data-uname]', '.user-name', '.username', '.danmaku-item-user', '[class*="user-name"]']
  for (const selector of selectors) {
    const el = item.querySelector<HTMLElement>(selector)
    const value = el?.getAttribute('data-uname') ?? el?.getAttribute('title') ?? el?.textContent
    const clean = (value ?? '').replace(/\s+/g, ' ').trim()
    if (clean && clean.length <= 32 && !/通过活动|装扮|粉丝牌|用户等级|头像|复制|举报|回复|关闭/.test(clean))
      return clean
  }
  return null
}

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

  contextMenuHandler = () => {
    const active = document.activeElement
    if (!(active instanceof HTMLElement)) {
      lastUid = null
      lastUname = null
      return
    }
    const item = active.closest<HTMLElement>('.chat-item.danmaku-item')
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

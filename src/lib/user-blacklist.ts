/**
 * Adds an auto-follow blacklist toggle to Bilibili's reused danmaku menu.
 */

import { appendLog } from './log'
import { autoBlendUserBlacklist } from './store'

const INJECTED_CLASS = 'lc-bl-toggle'

let pendingUid: string | null = null
let pendingUname: string | null = null
let clickHandler: ((e: MouseEvent) => void) | null = null

function captureFromClick(e: MouseEvent): void {
  const target = e.target
  if (!(target instanceof HTMLElement)) return
  if (!target.closest('.open-menu')) return
  const item = target.closest<HTMLElement>('[data-uid]')
  if (!item) {
    pendingUid = null
    pendingUname = null
    return
  }
  pendingUid = item.dataset.uid ?? null
  pendingUname = item.dataset.uname ?? null
}

function buildToggleItem(template: HTMLElement, uid: string, uname: string | null): HTMLElement {
  const isBlacklisted = uid in autoBlendUserBlacklist.value
  const item = template.cloneNode(true) as HTMLElement
  item.classList.add(INJECTED_CLASS)
  item.removeAttribute('target')
  for (const a of Array.from(item.querySelectorAll('a'))) {
    a.removeAttribute('href')
  }

  const span = item.querySelector('span')
  if (span) span.textContent = isBlacklisted ? '解除融入黑名单' : '添加融入黑名单'

  item.addEventListener('click', e => {
    e.stopPropagation()

    const next = { ...autoBlendUserBlacklist.value }
    const display = uname || uid
    if (uid in next) {
      delete next[uid]
      appendLog(`🚲 已解除融入黑名单：${display}`)
    } else {
      next[uid] = uname ?? ''
      appendLog(`🚲 已加入融入黑名单：${display}`)
    }
    autoBlendUserBlacklist.value = next

    const menu = item.closest<HTMLElement>('.danmaku-menu')
    if (menu) menu.style.display = 'none'
  })

  return item
}

function ensureToggleInMenu(): void {
  if (!pendingUid) return
  const menu = document.querySelector<HTMLElement>('.danmaku-menu')
  if (!menu) return
  const list = menu.querySelector<HTMLElement>('.none-select')
  if (!list) return
  const template = list.firstElementChild
  if (!(template instanceof HTMLElement)) return

  list.querySelector(`.${INJECTED_CLASS}`)?.remove()
  list.appendChild(buildToggleItem(template, pendingUid, pendingUname))
}

export function startUserBlacklistHijack(): void {
  if (clickHandler) return

  clickHandler = e => {
    captureFromClick(e)
    if (!pendingUid) return
    requestAnimationFrame(() => ensureToggleInMenu())
  }
  document.addEventListener('click', clickHandler, true)
}

export function stopUserBlacklistHijack(): void {
  if (clickHandler) {
    document.removeEventListener('click', clickHandler, true)
    clickHandler = null
  }
  pendingUid = null
  pendingUname = null
  for (const el of Array.from(document.querySelectorAll(`.${INJECTED_CLASS}`))) {
    el.remove()
  }
}

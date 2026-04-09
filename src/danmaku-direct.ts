import { effect as signalEffect } from '@preact/signals'

import { ensureRoomId, getCsrfToken, sendDanmaku } from './api'
import { showConfirm } from './components/ui/alert-dialog'
import { applyReplacements } from './replacement'
import {
  activeTab,
  appendLog,
  danmakuDirectAlwaysShow,
  danmakuDirectConfirm,
  danmakuDirectMode,
  dialogOpen,
  fasongText,
} from './store'
import { formatDanmakuError } from './utils'

const MARKER = 'lc-dm-direct'
const STYLE_ID = 'lc-dm-direct-style'

const STYLE = `
.${MARKER} {
  display: inline-flex;
  vertical-align: middle;
  margin-left: 2px;
  gap: 2px;
  opacity: 0;
  transition: opacity .15s;
  user-select: none;
}
.chat-item.danmaku-item:hover .${MARKER} {
  opacity: 1;
}
.${MARKER} button {
  all: unset;
  cursor: pointer;
  padding: 2px;
  border: 1px solid currentColor;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  line-height: 1;
  color: inherit;
  opacity: .35;
  transition: opacity .1s;
}
.${MARKER} button:hover {
  opacity: 1;
}
html.lc-dm-direct-always .${MARKER} {
  opacity: 1;
}
`

function isValidDanmakuNode(node: HTMLElement): boolean {
  if (!node.classList.contains('chat-item') || !node.classList.contains('danmaku-item')) return false
  const count = node.classList.length
  if (count === 2) return true
  if (node.classList.contains('chat-colorful-bubble') && node.classList.contains('has-bubble') && count === 4)
    return true
  if (node.classList.contains('has-bubble') && count === 3) return true
  return false
}

function extractMessage(node: HTMLElement): string | null {
  const danmaku = node.dataset.danmaku
  const replyMid = node.dataset.replymid
  if (danmaku === undefined || replyMid === undefined) return null
  if (replyMid !== '0') {
    const replyUname = node.querySelector('[data-uname]')?.getAttribute('data-uname')
    if (replyUname) return `@${replyUname} ${danmaku}`
    return null
  }
  return danmaku
}

function injectButtons(node: HTMLElement, msg: string): void {
  if (node.querySelector(`.${MARKER}`)) return
  const anchor = node.querySelector('.danmaku-item-right')
  if (!anchor) return

  const container = document.createElement('span')
  container.className = MARKER
  container.dataset.msg = msg

  const stealBtn = document.createElement('button')
  stealBtn.type = 'button'
  stealBtn.textContent = '偷'
  stealBtn.title = '偷弹幕到发送框'
  stealBtn.dataset.action = 'steal'

  const repeatBtn = document.createElement('button')
  repeatBtn.type = 'button'
  repeatBtn.textContent = '+1'
  repeatBtn.title = '+1 发送弹幕'
  repeatBtn.dataset.action = 'repeat'

  container.appendChild(stealBtn)
  container.appendChild(repeatBtn)
  anchor.after(container)
}

function handleSteal(msg: string): void {
  fasongText.value = msg
  activeTab.value = 'fasong'
  dialogOpen.value = true
  appendLog(`🥷 偷: ${msg}`)
}

async function handleRepeat(msg: string, anchor?: { x: number; y: number }): Promise<void> {
  if (danmakuDirectConfirm.value) {
    const confirmed = await showConfirm({ title: '确认发送以下弹幕？', body: msg, confirmText: '发送', anchor })
    if (!confirmed) return
  }

  try {
    const roomId = await ensureRoomId()
    const csrfToken = getCsrfToken()
    if (!csrfToken) {
      appendLog('❌ 未找到登录信息，请先登录 Bilibili')
      return
    }
    const processed = applyReplacements(msg)
    const result = await sendDanmaku(processed, roomId, csrfToken)
    const display = msg !== processed ? `${msg} → ${processed}` : processed
    if (result.success) {
      appendLog(`✅ +1: ${display}`)
    } else {
      appendLog(`❌ +1: ${display}，原因：${formatDanmakuError(result.error)}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    appendLog(`🔴 +1 出错：${message}`)
  }
}

function handleDelegatedClick(e: MouseEvent): void {
  const target = e.target
  if (!(target instanceof HTMLElement)) return
  const btn = target.closest<HTMLElement>(`.${MARKER} button`)
  if (!btn) return
  e.stopPropagation()
  const container = btn.closest<HTMLElement>(`.${MARKER}`)
  const msg = container?.dataset.msg
  if (!msg) return
  const action = btn.dataset.action
  if (action === 'steal') handleSteal(msg)
  else if (action === 'repeat') {
    void handleRepeat(msg, { x: e.clientX, y: e.clientY })
  }
}

let observer: MutationObserver | null = null
let styleEl: HTMLStyleElement | null = null
let delegateTarget: HTMLElement | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let alwaysShowDispose: (() => void) | null = null
let contextMenuHandler: (() => void) | null = null

function closeNativeContextMenu(): void {
  for (const li of document.querySelectorAll('li')) {
    if (li.textContent?.trim() === '关闭') {
      li.click()
      return
    }
  }
}

function createContextMenuItem(source: HTMLLIElement, label: string): HTMLLIElement {
  const item = document.createElement('li')
  item.className = source.className
  item.dataset.lc = ''
  item.textContent = label
  return item
}

function tryInjectContextMenuItems(li: HTMLLIElement): void {
  if (li.textContent?.trim() !== '复制弹幕') return

  const ul = li.parentElement
  if (!ul || ul.querySelector('[data-lc]')) return

  const repeatEl = createContextMenuItem(li, '弹幕 +1')

  repeatEl.onclick = (e: MouseEvent) => {
    const text = ul.parentElement?.querySelector('span')?.textContent?.trim() ?? null
    if (text) {
      void handleRepeat(text, { x: e.clientX, y: e.clientY })
    }
    closeNativeContextMenu()
  }

  const stealEl = createContextMenuItem(li, '偷弹幕')

  stealEl.onclick = () => {
    const text = ul.parentElement?.querySelector('span')?.textContent?.trim() ?? null
    if (text) {
      handleSteal(text)
    }
    closeNativeContextMenu()
  }

  ul.insertBefore(stealEl, li.nextSibling)
  ul.insertBefore(repeatEl, li.nextSibling)
}

function initContextMenuHijack(): void {
  if (contextMenuHandler) return

  contextMenuHandler = () => {
    requestAnimationFrame(() => {
      for (const li of document.querySelectorAll<HTMLLIElement>('li')) {
        tryInjectContextMenuItems(li)
      }
    })
  }

  document.addEventListener('contextmenu', contextMenuHandler)
}

function stopContextMenuHijack(): void {
  if (contextMenuHandler) {
    document.removeEventListener('contextmenu', contextMenuHandler)
    contextMenuHandler = null
  }
}

function processExistingNodes(container: HTMLElement): void {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>('.chat-item.danmaku-item'))
  for (const node of nodes) {
    if (!isValidDanmakuNode(node)) continue
    const msg = extractMessage(node)
    if (msg !== null) injectButtons(node, msg)
  }
}

function tryAttach(): boolean {
  const chatContainer = document.querySelector<HTMLElement>('.chat-items')
  if (!chatContainer) return false

  styleEl = document.createElement('style')
  styleEl.id = STYLE_ID
  styleEl.textContent = STYLE
  document.head.appendChild(styleEl)

  processExistingNodes(chatContainer)

  chatContainer.addEventListener('click', handleDelegatedClick, true)
  delegateTarget = chatContainer

  observer = new MutationObserver(mutations => {
    if (!danmakuDirectMode.value) return
    for (const mutation of mutations) {
      for (let i = 0; i < mutation.addedNodes.length; i++) {
        const node = mutation.addedNodes[i]
        if (!(node instanceof HTMLElement)) continue
        if (!isValidDanmakuNode(node)) continue
        const msg = extractMessage(node)
        if (msg !== null) injectButtons(node, msg)
      }
    }
  })

  observer.observe(chatContainer, { childList: true, subtree: false })
  return true
}

export function startDanmakuDirect(): void {
  if (observer) return

  alwaysShowDispose = signalEffect(() => {
    document.documentElement.classList.toggle('lc-dm-direct-always', danmakuDirectAlwaysShow.value)
  })

  initContextMenuHijack()

  if (tryAttach()) return

  // Bilibili's SPA may not have rendered .chat-items yet; poll until it appears
  pollTimer = setInterval(() => {
    if (tryAttach()) {
      if (pollTimer !== null) clearInterval(pollTimer)
      pollTimer = null
    }
  }, 1000)
}

export function stopDanmakuDirect(): void {
  stopContextMenuHijack()
  if (alwaysShowDispose) {
    alwaysShowDispose()
    alwaysShowDispose = null
    document.documentElement.classList.remove('lc-dm-direct-always')
  }
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
  if (observer) {
    observer.disconnect()
    observer = null
  }
  if (delegateTarget) {
    delegateTarget.removeEventListener('click', handleDelegatedClick, true)
    delegateTarget = null
  }
  if (styleEl) {
    styleEl.remove()
    styleEl = null
  }
  for (const el of Array.from(document.querySelectorAll(`.${MARKER}`))) {
    el.remove()
  }
}

import { effect as signalEffect } from '@preact/signals'

import { repeatDanmaku, stealDanmaku } from './danmaku-actions'
import { type DanmakuEvent, subscribeDanmaku } from './danmaku-stream'
import { danmakuDirectAlwaysShow, danmakuDirectConfirm, danmakuDirectMode } from './store'

const MARKER = 'lc-dm-direct'
const STYLE_ID = 'lc-dm-direct-style'

const STYLE = `
.chat-item.danmaku-item {
  position: relative;
}
.${MARKER} {
  display: inline-flex;
  position: absolute;
  right: 4px;
  top: 50%;
  transform: translateY(-50%);
  gap: 2px;
  opacity: 0;
  transition: opacity .15s, transform .15s;
  user-select: none;
  pointer-events: none;
  z-index: 2;
}
.chat-item.danmaku-item:hover .${MARKER},
.${MARKER}:hover {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(-50%) translateX(-2px);
}
.${MARKER} button {
  all: unset;
  cursor: pointer;
  min-width: 20px;
  padding: 2px 4px;
  border-radius: 3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: #fff;
  background: rgba(0, 0, 0, .62);
  font-size: 12px;
  transition: background .1s;
}
.${MARKER} button:hover {
  background: rgba(0, 0, 0, .82);
}
html.lc-dm-direct-always .${MARKER} {
  opacity: 1;
  pointer-events: auto;
}
`

function eventToSendableMessage(ev: DanmakuEvent): string | null {
  if (!ev.isReply) return ev.text
  return ev.uname ? `@${ev.uname} ${ev.text}` : null
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
  stealBtn.title = '偷弹幕到发送框并复制'
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
  if (action === 'steal') void stealDanmaku(msg)
  else if (action === 'repeat') {
    void repeatDanmaku(msg, { confirm: danmakuDirectConfirm.value, anchor: { x: e.clientX, y: e.clientY } })
  }
}

let unsubscribe: (() => void) | null = null
let styleEl: HTMLStyleElement | null = null
let attachedContainer: HTMLElement | null = null
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
      void repeatDanmaku(text, { confirm: danmakuDirectConfirm.value, anchor: { x: e.clientX, y: e.clientY } })
    }
    closeNativeContextMenu()
  }

  const stealEl = createContextMenuItem(li, '偷弹幕')
  stealEl.onclick = () => {
    const text = ul.parentElement?.querySelector('span')?.textContent?.trim() ?? null
    if (text) {
      void stealDanmaku(text)
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

export function startDanmakuDirect(): void {
  if (unsubscribe) return

  alwaysShowDispose = signalEffect(() => {
    document.documentElement.classList.toggle('lc-dm-direct-always', danmakuDirectAlwaysShow.value)
  })

  initContextMenuHijack()

  unsubscribe = subscribeDanmaku({
    onAttach: container => {
      styleEl = document.createElement('style')
      styleEl.id = STYLE_ID
      styleEl.textContent = STYLE
      document.head.appendChild(styleEl)

      attachedContainer = container
      container.addEventListener('click', handleDelegatedClick, true)
    },
    onMessage: ev => {
      if (!danmakuDirectMode.value) return
      const msg = eventToSendableMessage(ev)
      if (msg !== null) injectButtons(ev.node, msg)
    },
    emitExisting: true,
  })
}

export function stopDanmakuDirect(): void {
  stopContextMenuHijack()
  if (alwaysShowDispose) {
    alwaysShowDispose()
    alwaysShowDispose = null
    document.documentElement.classList.remove('lc-dm-direct-always')
  }
  if (unsubscribe) {
    unsubscribe()
    unsubscribe = null
  }
  if (attachedContainer) {
    attachedContainer.removeEventListener('click', handleDelegatedClick, true)
    attachedContainer = null
  }
  if (styleEl) {
    styleEl.remove()
    styleEl = null
  }
  for (const el of Array.from(document.querySelectorAll(`.${MARKER}`))) {
    el.remove()
  }
}

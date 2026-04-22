import { effect as signalEffect } from '@preact/signals'

import { copyText, repeatDanmaku, sendManualDanmaku, stealDanmaku } from './danmaku-actions'
import { type DanmakuEvent, subscribeDanmaku } from './danmaku-stream'
import {
  chatEventTime,
  emitCustomChatEvent,
  subscribeCustomChatEvents,
  subscribeCustomChatWsStatus,
  type CustomChatEvent,
  type CustomChatKind,
  type CustomChatWsStatus,
} from './custom-chat-events'
import { BASE_URL } from './const'
import { hasRecentWsDanmaku } from './live-ws-source'
import {
  customChatCss,
  customChatHideNative,
  customChatShowDanmaku,
  customChatShowEnter,
  customChatShowGift,
  customChatShowNotice,
  customChatShowSuperchat,
  customChatTheme,
  danmakuDirectConfirm,
} from './store'

const ROOT_ID = 'laplace-custom-chat'
const STYLE_ID = 'laplace-custom-chat-style'
const USER_STYLE_ID = 'laplace-custom-chat-user-style'
const MAX_MESSAGES = 220

const STYLE = `
#${ROOT_ID}, #${ROOT_ID} * {
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  letter-spacing: 0;
}
#${ROOT_ID} {
  height: 100%;
  min-height: 340px;
  flex: 1 1 auto;
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  color: #f2f4f8;
  background: #101214;
  border-left: 1px solid rgba(255, 255, 255, .08);
  overflow: hidden;
}
#${ROOT_ID}[data-theme="light"] {
  color: #1d1d1f;
  background: #f7f8fa;
  border-left-color: rgba(0, 0, 0, .08);
}
#${ROOT_ID}[data-theme="light"] .lc-chat-toolbar,
#${ROOT_ID}[data-theme="light"] .lc-chat-composer {
  background: rgba(0, 0, 0, .035);
  border-color: rgba(0, 0, 0, .08);
}
#${ROOT_ID}[data-theme="light"] .lc-chat-title,
#${ROOT_ID}[data-theme="light"] .lc-chat-text,
#${ROOT_ID}[data-theme="light"] textarea {
  color: #1d1d1f;
}
#${ROOT_ID}[data-theme="light"] textarea,
#${ROOT_ID}[data-theme="light"] .lc-chat-search {
  color: #1d1d1f;
  background: #fff;
  border-color: rgba(0, 0, 0, .12);
}
#${ROOT_ID}[data-theme="light"] .lc-chat-pill,
#${ROOT_ID}[data-theme="light"] .lc-chat-action,
#${ROOT_ID}[data-theme="light"] .lc-chat-badge {
  color: #1d1d1f;
  background: rgba(0, 0, 0, .06);
}
#${ROOT_ID}[data-theme="compact"] .lc-chat-avatar {
  display: none;
}
#${ROOT_ID}[data-theme="compact"] .lc-chat-message {
  grid-template-columns: minmax(0, 1fr) auto;
  padding: 4px 6px;
  gap: 3px 5px;
}
#${ROOT_ID}[data-theme="compact"] .lc-chat-meta {
  grid-column: 1 / 2;
}
#${ROOT_ID}[data-theme="compact"] .lc-chat-text {
  grid-column: 1 / -1;
  font-size: 12px;
}
#${ROOT_ID} .lc-chat-toolbar {
  min-height: 34px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, .045);
  border-bottom: 1px solid rgba(255, 255, 255, .07);
}
#${ROOT_ID} .lc-chat-title {
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  margin-right: auto;
}
#${ROOT_ID} .lc-chat-pill {
  min-width: 0;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 5px;
  background: rgba(255, 255, 255, .08);
  color: #dce3ee;
  height: 23px;
  padding: 0 7px;
  font-size: 11px;
  cursor: pointer;
}
#${ROOT_ID} .lc-chat-pill[aria-pressed="true"] {
  color: #111;
  background: #8ee6c9;
  border-color: #8ee6c9;
}
#${ROOT_ID} .lc-chat-filterbar {
  display: flex;
  gap: 4px;
  padding: 4px 8px;
  overflow-x: auto;
  background: rgba(255, 255, 255, .025);
  border-bottom: 1px solid rgba(255, 255, 255, .06);
}
#${ROOT_ID} .lc-chat-filter {
  flex: 0 0 auto;
  height: 22px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 5px;
  background: rgba(255, 255, 255, .08);
  color: #dce3ee;
  padding: 0 7px;
  font-size: 11px;
  cursor: pointer;
}
#${ROOT_ID} .lc-chat-filter[aria-pressed="true"] {
  background: #8ee6c9;
  color: #111;
  border-color: #8ee6c9;
}
#${ROOT_ID} .lc-chat-search {
  min-width: 80px;
  width: 34%;
  height: 24px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 5px;
  background: rgba(0, 0, 0, .22);
  color: #fff;
  padding: 0 7px;
  font-size: 11px;
  outline: none;
}
#${ROOT_ID} .lc-chat-search:focus {
  border-color: #8ee6c9;
}
#${ROOT_ID} .lc-chat-list {
  min-height: 0;
  overflow: auto;
  padding: 6px;
  scrollbar-width: thin;
  scroll-behavior: smooth;
}
#${ROOT_ID} .lc-chat-message {
  position: relative;
  display: grid;
  grid-template-columns: 28px minmax(0, 1fr) auto;
  gap: 5px 7px;
  padding: 6px 7px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
}
#${ROOT_ID} .lc-chat-message:hover {
  background: rgba(255, 255, 255, .055);
  border-color: rgba(255, 255, 255, .08);
}
#${ROOT_ID} .lc-chat-message[data-kind="gift"] {
  background: rgba(255, 209, 102, .08);
}
#${ROOT_ID} .lc-chat-message[data-kind="superchat"] {
  background: linear-gradient(135deg, rgba(255, 122, 89, .28), rgba(255, 209, 102, .12));
  border-color: rgba(255, 209, 102, .38);
}
#${ROOT_ID} .lc-chat-message[data-kind="enter"],
#${ROOT_ID} .lc-chat-message[data-kind="notice"],
#${ROOT_ID} .lc-chat-message[data-kind="system"] {
  opacity: .86;
}
#${ROOT_ID} .lc-chat-meta {
  grid-column: 2 / 3;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  color: #8f9aaa;
  font-size: 11px;
}
#${ROOT_ID} .lc-chat-name {
  color: #8ee6c9;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID} .lc-chat-avatar {
  grid-row: 1 / 3;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
  background: rgba(255, 255, 255, .12);
  align-self: start;
}
#${ROOT_ID} .lc-chat-avatar-fallback {
  display: grid;
  place-items: center;
  color: #111;
  background: #8ee6c9;
  font-weight: 800;
  font-size: 12px;
}
#${ROOT_ID} .lc-chat-reply {
  color: #ffd166;
}
#${ROOT_ID} .lc-chat-badge {
  border-radius: 3px;
  padding: 1px 4px;
  background: rgba(255, 255, 255, .1);
  color: #dce3ee;
  font-size: 10px;
}
#${ROOT_ID} .lc-chat-kind {
  color: #111;
  background: #8ee6c9;
}
#${ROOT_ID} .lc-chat-kind[data-kind="gift"] {
  background: #ffd166;
}
#${ROOT_ID} .lc-chat-kind[data-kind="superchat"] {
  background: #ff7a59;
  color: #fff;
}
#${ROOT_ID} .lc-chat-kind[data-kind="enter"] {
  background: #9cb8ff;
}
#${ROOT_ID} .lc-chat-text {
  grid-column: 2 / -1;
  color: #f5f7fb;
  font-size: 13px;
  line-height: 1.42;
  word-break: break-word;
}
#${ROOT_ID} .lc-chat-actions {
  grid-column: 3 / 4;
  display: flex;
  gap: 3px;
  opacity: 0;
  transition: opacity .12s;
}
#${ROOT_ID} .lc-chat-message:hover .lc-chat-actions,
#${ROOT_ID} .lc-chat-message.lc-chat-peek .lc-chat-actions {
  opacity: 1;
}
#${ROOT_ID} .lc-chat-action {
  min-width: 24px;
  height: 22px;
  border: 0;
  border-radius: 4px;
  background: rgba(255, 255, 255, .1);
  color: #f2f4f8;
  font-size: 11px;
  cursor: pointer;
}
#${ROOT_ID} .lc-chat-action:hover {
  background: #8ee6c9;
  color: #111;
}
#${ROOT_ID} .lc-chat-composer {
  display: grid;
  gap: 6px;
  padding: 7px;
  border-top: 1px solid rgba(255, 255, 255, .07);
  background: rgba(255, 255, 255, .045);
}
#${ROOT_ID} .lc-chat-input-wrap {
  position: relative;
}
#${ROOT_ID} textarea {
  width: 100%;
  height: 54px;
  resize: vertical;
  min-height: 42px;
  max-height: 120px;
  border: 1px solid rgba(255, 255, 255, .12);
  border-radius: 6px;
  background: rgba(0, 0, 0, .28);
  color: #fff;
  padding: 7px 38px 7px 8px;
  outline: none;
  font-size: 13px;
  line-height: 1.35;
}
#${ROOT_ID} textarea:focus {
  border-color: #8ee6c9;
  box-shadow: 0 0 0 3px rgba(142, 230, 201, .12);
}
#${ROOT_ID} .lc-chat-count {
  position: absolute;
  right: 8px;
  bottom: 6px;
  color: #8f9aaa;
  font-size: 11px;
  pointer-events: none;
}
#${ROOT_ID} .lc-chat-send-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
#${ROOT_ID} .lc-chat-send {
  min-height: 28px;
  padding: 0 12px;
  border: 0;
  border-radius: 6px;
  background: #8ee6c9;
  color: #111;
  font-weight: 700;
  cursor: pointer;
}
#${ROOT_ID} .lc-chat-send:disabled {
  opacity: .5;
  cursor: wait;
}
#${ROOT_ID} .lc-chat-hint {
  color: #8f9aaa;
  font-size: 11px;
}
#${ROOT_ID} .lc-chat-ws-status {
  font-size: 11px;
  color: #8f9aaa;
}
#${ROOT_ID} .lc-chat-ws-status[data-status="live"] {
  color: #8ee6c9;
}
#${ROOT_ID} .lc-chat-ws-status[data-status="error"] {
  color: #ff7a59;
}
html.lc-custom-chat-hide-native .chat-items,
html.lc-custom-chat-hide-native .chat-control-panel,
html.lc-custom-chat-hide-native .chat-input-panel,
html.lc-custom-chat-hide-native .control-panel-ctnr,
html.lc-custom-chat-hide-native .chat-input-ctnr {
  display: none !important;
}
html.lc-custom-chat-hide-native .chat-history-panel:has(#${ROOT_ID}) > :not(#${ROOT_ID}) {
  display: none !important;
}
`

let unsubscribeDom: (() => void) | null = null
let unsubscribeEvents: (() => void) | null = null
let unsubscribeWsStatus: (() => void) | null = null
let disposeSettings: (() => void) | null = null
let root: HTMLElement | null = null
let listEl: HTMLElement | null = null
let pauseBtn: HTMLButtonElement | null = null
let unreadEl: HTMLElement | null = null
let searchInput: HTMLInputElement | null = null
let matchCountEl: HTMLElement | null = null
let wsStatusEl: HTMLElement | null = null
let textarea: HTMLTextAreaElement | null = null
let countEl: HTMLElement | null = null
let styleEl: HTMLStyleElement | null = null
let userStyleEl: HTMLStyleElement | null = null
let messageSeq = 0
let paused = false
let unread = 0
let sending = false
let searchQuery = ''
const messages: CustomChatEvent[] = []

function eventToSendableMessage(ev: DanmakuEvent): string {
  if (!ev.isReply) return ev.text
  return ev.uname ? `@${ev.uname} ${ev.text}` : ev.text
}

function setText(el: HTMLElement, text: string): void {
  el.textContent = text
}

function makeButton(className: string, text: string, title: string, onClick: (e: MouseEvent) => void): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = className
  btn.textContent = text
  btn.title = title
  btn.addEventListener('click', onClick)
  return btn
}

function splitQuery(query: string): string[] {
  return query.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(token => token.replace(/^"|"$/g, '').trim()).filter(Boolean) ?? []
}

function includesFolded(value: string, needle: string): boolean {
  return value.toLowerCase().includes(needle.toLowerCase())
}

function kindLabel(kind: CustomChatKind): string {
  if (kind === 'danmaku') return '弹幕'
  if (kind === 'gift') return '礼物'
  if (kind === 'superchat') return 'SC'
  if (kind === 'enter') return '进场'
  if (kind === 'notice') return '通知'
  return '系统'
}

function avatarUrl(uid: string | null): string | undefined {
  return uid ? `${BASE_URL.BILIBILI_AVATAR}/${uid}?size=96` : undefined
}

function tokenMatches(message: CustomChatEvent, token: string): boolean {
  const normalized = token.trim()
  if (!normalized) return true
  const colon = normalized.indexOf(':')
  if (colon > 0) {
    const key = normalized.slice(0, colon).toLowerCase()
    const value = normalized.slice(colon + 1)
    if (key === 'user' || key === 'name' || key === 'from') return includesFolded(message.uname, value)
    if (key === 'uid') return includesFolded(message.uid ?? '', value)
    if (key === 'text' || key === 'msg') return includesFolded(message.text, value)
    if (key === 'kind' || key === 'type') return includesFolded(message.kind, value) || includesFolded(kindLabel(message.kind), value)
    if (key === 'source') return includesFolded(message.source, value)
    if (key === 'is') return value.toLowerCase() === 'reply' ? message.isReply : true
  }
  return includesFolded(message.text, normalized) || includesFolded(message.uname, normalized)
}

function kindVisible(kind: CustomChatKind): boolean {
  if (kind === 'danmaku') return customChatShowDanmaku.value
  if (kind === 'gift') return customChatShowGift.value
  if (kind === 'superchat') return customChatShowSuperchat.value
  if (kind === 'enter') return customChatShowEnter.value
  if (kind === 'notice' || kind === 'system') return customChatShowNotice.value
  return true
}

function messageMatchesSearch(message: CustomChatEvent): boolean {
  if (!kindVisible(message.kind)) return false
  const tokens = splitQuery(searchQuery)
  for (const rawToken of tokens) {
    const negative = rawToken.startsWith('-')
    const token = negative ? rawToken.slice(1) : rawToken
    const matched = tokenMatches(message, token)
    if (negative ? matched : !matched) return false
  }
  return true
}

function wsStatusLabel(status: CustomChatWsStatus): string {
  if (status === 'connecting') return 'WS 连接中'
  if (status === 'live') return 'WS 已连接'
  if (status === 'error') return 'WS 异常'
  if (status === 'closed') return 'WS 已断开'
  return 'WS 关闭'
}

function updateWsStatus(status: CustomChatWsStatus): void {
  if (!wsStatusEl) return
  wsStatusEl.textContent = wsStatusLabel(status)
  wsStatusEl.dataset.status = status
}

function updateMatchCount(): void {
  if (!matchCountEl) return
  if (!searchQuery.trim()) {
    matchCountEl.textContent = ''
    matchCountEl.style.display = 'none'
    return
  }
  const count = messages.filter(messageMatchesSearch).length
  matchCountEl.textContent = `${count}/${messages.length}`
  matchCountEl.style.display = ''
}

function updateUnread(): void {
  if (unreadEl) {
    unreadEl.textContent = unread > 0 ? `${unread} 新` : ''
    unreadEl.style.display = unread > 0 ? '' : 'none'
  }
  if (pauseBtn) pauseBtn.setAttribute('aria-pressed', paused ? 'true' : 'false')
}

function scrollToBottom(): void {
  if (!listEl) return
  listEl.scrollTop = listEl.scrollHeight
}

function pruneMessages(): void {
  let removed = false
  while (messages.length > MAX_MESSAGES) {
    messages.shift()
    removed = true
  }
  if (removed) rerenderMessages()
}

function renderMessage(message: CustomChatEvent, countUnread = true): void {
  if (!listEl) return
  if (!messageMatchesSearch(message)) {
    updateMatchCount()
    return
  }

  const row = document.createElement('div')
  row.className = 'lc-chat-message lc-chat-peek'
  row.dataset.uid = message.uid ?? ''
  row.dataset.kind = message.kind
  row.dataset.source = message.source

  const avatar = message.avatarUrl || avatarUrl(message.uid)
  let avatarEl: HTMLElement
  if (avatar) {
    const img = document.createElement('img')
    img.className = 'lc-chat-avatar'
    img.src = avatar
    img.alt = '头像'
    img.referrerPolicy = 'no-referrer'
    img.loading = 'lazy'
    avatarEl = img
  } else {
    const fallback = document.createElement('div')
    fallback.className = 'lc-chat-avatar lc-chat-avatar-fallback'
    fallback.textContent = message.uname.slice(0, 1).toUpperCase() || '?'
    avatarEl = fallback
  }

  const meta = document.createElement('div')
  meta.className = 'lc-chat-meta'

  const kind = document.createElement('span')
  kind.className = 'lc-chat-badge lc-chat-kind'
  kind.dataset.kind = message.kind
  setText(kind, kindLabel(message.kind))

  const name = document.createElement('span')
  name.className = 'lc-chat-name'
  setText(name, message.uname)

  const time = document.createElement('span')
  setText(time, message.time)

  meta.append(kind, name, time)
  if (message.isReply) {
    const reply = document.createElement('span')
    reply.className = 'lc-chat-reply'
    reply.textContent = '回复'
    meta.append(reply)
  }
  for (const badgeText of message.badges.slice(0, 4)) {
    const badge = document.createElement('span')
    badge.className = 'lc-chat-badge'
    setText(badge, badgeText)
    meta.append(badge)
  }

  const actions = document.createElement('div')
  actions.className = 'lc-chat-actions'
  if (message.sendText) {
    actions.append(
      makeButton('lc-chat-action', '偷', '偷到发送框并复制', () => void stealDanmaku(message.sendText ?? message.text)),
      makeButton('lc-chat-action', '+1', '+1 发送', e => {
        void repeatDanmaku(message.sendText ?? message.text, {
          confirm: danmakuDirectConfirm.value,
          anchor: { x: e.clientX, y: e.clientY },
        })
      })
    )
  }
  actions.append(makeButton('lc-chat-action', '复制', '复制事件文本', () => void copyText(message.sendText ?? message.text)))

  const text = document.createElement('div')
  text.className = 'lc-chat-text'
  setText(text, message.text)

  row.append(avatarEl, meta, actions, text)
  listEl.append(row)

  window.setTimeout(() => row.classList.remove('lc-chat-peek'), 2600)
  pruneMessages()
  if (paused && countUnread) {
    unread++
    updateUnread()
  } else {
    scrollToBottom()
  }
  updateMatchCount()
}

function clearMessages(): void {
  messages.length = 0
  unread = 0
  listEl?.replaceChildren()
  updateUnread()
  updateMatchCount()
}

function rerenderMessages(): void {
  if (!listEl) return
  listEl.replaceChildren()
  for (const message of messages) renderMessage(message, false)
  updateMatchCount()
  if (!paused) scrollToBottom()
}

async function sendFromComposer(): Promise<void> {
  if (!textarea || sending) return
  const text = textarea.value
  sending = true
  const sendBtn = root?.querySelector<HTMLButtonElement>('.lc-chat-send')
  if (sendBtn) sendBtn.disabled = true
  const sent = await sendManualDanmaku(text)
  if (sent) {
    textarea.value = ''
    updateCount()
  }
  sending = false
  if (sendBtn) sendBtn.disabled = false
}

function updateCount(): void {
  if (countEl && textarea) countEl.textContent = String(textarea.value.length)
}

function createRoot(): HTMLElement {
  const panel = document.createElement('section')
  panel.id = ROOT_ID
  panel.dataset.theme = customChatTheme.value

  const toolbar = document.createElement('div')
  toolbar.className = 'lc-chat-toolbar'

  const title = document.createElement('div')
  title.className = 'lc-chat-title'
  title.textContent = 'Chatterbox Chat'

  pauseBtn = makeButton('lc-chat-pill', '暂停', '暂停自动滚动', () => {
    paused = !paused
    if (!paused) {
      unread = 0
      scrollToBottom()
    }
    updateUnread()
  })
  unreadEl = document.createElement('span')
  unreadEl.className = 'lc-chat-hint'
  unreadEl.style.display = 'none'
  matchCountEl = document.createElement('span')
  matchCountEl.className = 'lc-chat-hint'
  matchCountEl.style.display = 'none'
  wsStatusEl = document.createElement('span')
  wsStatusEl.className = 'lc-chat-ws-status'
  updateWsStatus('off')

  searchInput = document.createElement('input')
  searchInput.type = 'search'
  searchInput.className = 'lc-chat-search'
  searchInput.placeholder = '搜索 user:名 kind:gift source:ws -词'
  searchInput.value = searchQuery
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput?.value ?? ''
    unread = 0
    rerenderMessages()
    updateUnread()
  })

  const clearBtn = makeButton('lc-chat-pill', '清屏', '清空自定义评论区', clearMessages)

  toolbar.append(title, searchInput, matchCountEl, pauseBtn, unreadEl, wsStatusEl, clearBtn)

  const filterbar = document.createElement('div')
  filterbar.className = 'lc-chat-filterbar'
  const filters: Array<[CustomChatKind, string, typeof customChatShowDanmaku]> = [
    ['danmaku', '弹幕', customChatShowDanmaku],
    ['gift', '礼物', customChatShowGift],
    ['superchat', 'SC', customChatShowSuperchat],
    ['enter', '进场', customChatShowEnter],
    ['notice', '通知', customChatShowNotice],
  ]
  for (const [, label, signal] of filters) {
    const btn = makeButton('lc-chat-filter', label, `显示/隐藏${label}`, () => {
      signal.value = !signal.value
      btn.setAttribute('aria-pressed', signal.value ? 'true' : 'false')
      rerenderMessages()
    })
    btn.setAttribute('aria-pressed', signal.value ? 'true' : 'false')
    filterbar.append(btn)
  }

  listEl = document.createElement('div')
  listEl.className = 'lc-chat-list'

  const composer = document.createElement('div')
  composer.className = 'lc-chat-composer'

  const inputWrap = document.createElement('div')
  inputWrap.className = 'lc-chat-input-wrap'

  textarea = document.createElement('textarea')
  textarea.placeholder = '输入弹幕... Enter 发送，Shift+Enter 换行'
  textarea.addEventListener('input', updateCount)
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      void sendFromComposer()
    }
  })

  countEl = document.createElement('span')
  countEl.className = 'lc-chat-count'
  countEl.textContent = '0'

  inputWrap.append(textarea, countEl)

  const sendRow = document.createElement('div')
  sendRow.className = 'lc-chat-send-row'
  const sendBtn = makeButton('lc-chat-send', '发送', '发送弹幕', () => void sendFromComposer())
  const hint = document.createElement('span')
  hint.className = 'lc-chat-hint'
  hint.textContent = '可偷、+1、复制；设置里可贴自定义 CSS'
  sendRow.append(sendBtn, hint)

  composer.append(inputWrap, sendRow)
  panel.append(toolbar, filterbar, listEl, composer)
  updateUnread()
  return panel
}

function ensureStyles(): void {
  if (!styleEl) {
    styleEl = document.createElement('style')
    styleEl.id = STYLE_ID
    styleEl.textContent = STYLE
    document.head.appendChild(styleEl)
  }
  if (!userStyleEl) {
    userStyleEl = document.createElement('style')
    userStyleEl.id = USER_STYLE_ID
    document.head.appendChild(userStyleEl)
  }
  userStyleEl.textContent = customChatCss.value
}

function mount(container: HTMLElement): void {
  ensureStyles()
  root?.remove()
  const host = container.closest<HTMLElement>('.chat-history-panel') ?? container.parentElement
  if (!host) return
  root = createRoot()
  root.dataset.theme = customChatTheme.value
  host.appendChild(root)
  rerenderMessages()
}

function addDomMessage(ev: DanmakuEvent): void {
  const text = ev.text.trim()
  if (!text) return
  const uid = ev.uid
  if (hasRecentWsDanmaku(text, uid)) return
  emitCustomChatEvent({
    id: `dom-${++messageSeq}`,
    kind: 'danmaku',
    text,
    sendText: eventToSendableMessage(ev),
    uname: ev.uname || '匿名',
    uid,
    time: chatEventTime(),
    isReply: ev.isReply,
    source: 'dom',
    badges: [],
    avatarUrl: avatarUrl(uid),
  })
}

function addEvent(event: CustomChatEvent): void {
  if (messages.some(message => message.id === event.id && message.source === event.source)) return
  messages.push(event)
  renderMessage(event)
}

export function startCustomChat(): void {
  if (unsubscribeDom) return

  ensureStyles()
  disposeSettings = signalEffect(() => {
    document.documentElement.classList.toggle('lc-custom-chat-hide-native', customChatHideNative.value)
    if (root) root.dataset.theme = customChatTheme.value
    ensureStyles()
  })

  unsubscribeEvents = subscribeCustomChatEvents(addEvent)
  unsubscribeWsStatus = subscribeCustomChatWsStatus(updateWsStatus)
  unsubscribeDom = subscribeDanmaku({
    onAttach: mount,
    onMessage: addDomMessage,
    emitExisting: true,
  })
}

export function stopCustomChat(): void {
  if (unsubscribeDom) {
    unsubscribeDom()
    unsubscribeDom = null
  }
  if (unsubscribeEvents) {
    unsubscribeEvents()
    unsubscribeEvents = null
  }
  if (unsubscribeWsStatus) {
    unsubscribeWsStatus()
    unsubscribeWsStatus = null
  }
  if (disposeSettings) {
    disposeSettings()
    disposeSettings = null
  }
  document.documentElement.classList.remove('lc-custom-chat-hide-native')
  root?.remove()
  root = null
  styleEl?.remove()
  styleEl = null
  userStyleEl?.remove()
  userStyleEl = null
  listEl = null
  pauseBtn = null
  unreadEl = null
  textarea = null
  countEl = null
  searchInput = null
  matchCountEl = null
  wsStatusEl = null
  messages.length = 0
  unread = 0
  paused = false
  sending = false
  searchQuery = ''
}

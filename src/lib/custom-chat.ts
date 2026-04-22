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
  --lc-chat-bg: #f2f2f7;
  --lc-chat-panel: rgba(255, 255, 255, .78);
  --lc-chat-border: rgba(60, 60, 67, .16);
  --lc-chat-text: #111;
  --lc-chat-muted: #6e6e73;
  --lc-chat-name: #007aff;
  --lc-chat-bubble: #ffffff;
  --lc-chat-bubble-text: #111;
  --lc-chat-own: #007aff;
  --lc-chat-own-text: #fff;
  --lc-chat-chip: rgba(118, 118, 128, .14);
  --lc-chat-chip-text: #1d1d1f;
  --lc-chat-accent: #34c759;
  --lc-chat-shadow: rgba(0, 0, 0, .12);
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 340px;
  flex: 1 1 auto;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  color: var(--lc-chat-text);
  background: var(--lc-chat-bg);
  border-left: 1px solid var(--lc-chat-border);
  overflow: hidden;
  contain: layout style;
}
#${ROOT_ID}[data-theme="laplace"],
#${ROOT_ID}[data-theme="compact"] {
  --lc-chat-bg: #0b0f14;
  --lc-chat-panel: rgba(28, 31, 36, .82);
  --lc-chat-border: rgba(255, 255, 255, .08);
  --lc-chat-text: #f5f7fb;
  --lc-chat-muted: #a0a7b3;
  --lc-chat-name: #64d2ff;
  --lc-chat-bubble: #1c1f24;
  --lc-chat-bubble-text: #f5f7fb;
  --lc-chat-own: #0a84ff;
  --lc-chat-own-text: #fff;
  --lc-chat-chip: rgba(255, 255, 255, .1);
  --lc-chat-chip-text: #e6edf7;
  --lc-chat-accent: #30d158;
  --lc-chat-shadow: rgba(0, 0, 0, .34);
}
#${ROOT_ID}[data-theme="light"] {
  color: var(--lc-chat-text);
}
#${ROOT_ID}[data-theme="compact"] .lc-chat-avatar {
  display: none;
}
#${ROOT_ID}[data-theme="compact"] .lc-chat-message {
  grid-template-columns: minmax(0, 1fr);
  padding: 4px 6px;
  gap: 3px 5px;
}
#${ROOT_ID}[data-theme="compact"] .lc-chat-body {
  grid-column: 1 / 2;
}
#${ROOT_ID}[data-theme="compact"] .lc-chat-bubble {
  font-size: 12px;
}
#${ROOT_ID} .lc-chat-toolbar {
  position: relative;
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 9px;
  background: var(--lc-chat-panel);
  border-bottom: 1px solid var(--lc-chat-border);
  backdrop-filter: blur(16px);
  min-width: 0;
  overflow: hidden;
}
#${ROOT_ID} .lc-chat-title {
  flex: 1 1 auto;
  min-width: 0;
  text-align: center;
  font-size: 13px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--lc-chat-text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID} .lc-chat-pill {
  min-width: 0;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-chip-text);
  height: 24px;
  padding: 0 8px;
  font-size: 11px;
  cursor: pointer;
}
#${ROOT_ID} .lc-chat-icon {
  flex: 0 0 auto;
  width: 28px;
  height: 28px;
  border: 0;
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-own);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
}
#${ROOT_ID} .lc-chat-menu {
  display: none;
  min-width: 0;
  margin: 0 8px 8px;
  grid-template-columns: 1fr;
  gap: 10px;
  max-height: min(280px, 38vh);
  overflow-y: auto;
  padding: 10px;
  border: 1px solid var(--lc-chat-border);
  border-radius: 18px;
  background: color-mix(in srgb, var(--lc-chat-bg) 92%, #fff);
  box-shadow: 0 16px 42px rgba(0, 0, 0, .28);
  backdrop-filter: blur(24px) saturate(1.35);
  -webkit-backdrop-filter: blur(24px) saturate(1.35);
}
#${ROOT_ID}.lc-chat-menu-open .lc-chat-menu {
  display: grid;
}
#${ROOT_ID} .lc-chat-menu-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
}
#${ROOT_ID} .lc-chat-menu-row + .lc-chat-menu-row {
  padding-top: 8px;
  border-top: 1px solid var(--lc-chat-border);
}
#${ROOT_ID} .lc-chat-menu-label {
  flex: 0 0 34px;
  color: var(--lc-chat-muted);
  font-size: 11px;
}
#${ROOT_ID} .lc-chat-pill[aria-pressed="true"] {
  color: var(--lc-chat-own-text);
  background: var(--lc-chat-own);
  border-color: var(--lc-chat-own);
}
#${ROOT_ID} .lc-chat-filterbar {
  display: grid;
  flex: 1 1 auto;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  padding: 0;
  min-width: 0;
  overflow: hidden;
  background: transparent;
  border-bottom: 0;
  backdrop-filter: none;
}
#${ROOT_ID} .lc-chat-filter {
  width: 100%;
  flex: 1 1 0;
  min-width: 0;
  height: 21px;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-chip-text);
  padding: 0 3px;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
}
#${ROOT_ID} .lc-chat-filter[aria-pressed="true"] {
  background: var(--lc-chat-own);
  color: var(--lc-chat-own-text);
  border-color: var(--lc-chat-own);
}
#${ROOT_ID} .lc-chat-search {
  flex: 1 1 auto;
  min-width: 0;
  width: 0;
  max-width: 100%;
  height: 24px;
  border: 1px solid var(--lc-chat-border);
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-text);
  padding: 0 7px;
  font-size: 11px;
  outline: none;
}
#${ROOT_ID} .lc-chat-search:focus {
  border-color: var(--lc-chat-own);
}
#${ROOT_ID} .lc-chat-list {
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 9px 8px 10px;
  scrollbar-width: thin;
  scroll-behavior: smooth;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 18px, #000 calc(100% - 18px), transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 18px, #000 calc(100% - 18px), transparent);
}
#${ROOT_ID} .lc-chat-message {
  position: relative;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr);
  gap: 2px 8px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 5px 2px;
  border-radius: 0;
  border: 1px solid transparent;
  background: transparent;
  overflow: visible;
}
#${ROOT_ID} .lc-chat-message:hover {
  background: transparent;
  border-color: transparent;
}
#${ROOT_ID} .lc-chat-message[data-kind="gift"] {
  background: transparent;
}
#${ROOT_ID} .lc-chat-message[data-kind="superchat"] {
  background: transparent;
  border-color: transparent;
}
#${ROOT_ID} .lc-chat-card-event {
  grid-template-columns: 36px minmax(0, 1fr);
  gap: 3px 10px;
  padding: 7px 2px;
}
#${ROOT_ID} .lc-chat-card-event .lc-chat-avatar {
  width: 36px;
  height: 36px;
  margin-bottom: 8px;
}
#${ROOT_ID} .lc-chat-card-event .lc-chat-meta {
  padding-left: 6px;
}
#${ROOT_ID} .lc-chat-card-event .lc-chat-bubble {
  width: 100%;
  max-width: 100%;
  min-height: 66px;
  padding: 11px 14px;
  border-radius: 10px;
  border-top-left-radius: 18px;
  border-bottom-left-radius: 18px;
  font-size: 14px;
  font-weight: 720;
  box-shadow: 0 4px 13px var(--lc-chat-shadow);
}
#${ROOT_ID} .lc-chat-card-compact .lc-chat-bubble {
  min-height: 0;
  padding: 8px 11px;
  border-radius: 18px;
  border-top-left-radius: 7px;
  font-size: 13px;
  font-weight: 650;
}
#${ROOT_ID} .lc-chat-card-event .lc-chat-bubble::before {
  top: 10px;
  left: -8px;
  width: 15px;
  height: 15px;
}
#${ROOT_ID} .lc-chat-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
  margin-bottom: 6px;
  font-size: 12px;
  line-height: 1.2;
  opacity: .92;
}
#${ROOT_ID} .lc-chat-card-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID} .lc-chat-card-mark {
  flex: 0 0 auto;
  display: inline-grid;
  place-items: center;
  min-width: 28px;
  height: 22px;
  padding: 0 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .28);
  color: currentColor;
  font-size: 11px;
  font-weight: 800;
}
#${ROOT_ID} .lc-chat-card-text {
  display: block;
}
#${ROOT_ID} .lc-chat-card-event[data-card="gift"] .lc-chat-bubble {
  background: linear-gradient(135deg, #ffd8bf, #fff2c7);
  color: #4a2a10;
  border-color: rgba(191, 92, 0, .2);
}
#${ROOT_ID} .lc-chat-card-event[data-card="superchat"] .lc-chat-bubble {
  background: linear-gradient(135deg, #ff9f0a, #ff453a);
  color: #fff;
  border-color: rgba(255, 69, 58, .32);
}
#${ROOT_ID} .lc-chat-card-event[data-card="guard"] .lc-chat-bubble {
  background: linear-gradient(135deg, #2f80ed, #7c5cff);
  color: #fff;
  border-color: rgba(47, 128, 237, .32);
}
#${ROOT_ID} .lc-chat-card-event[data-guard="2"] .lc-chat-bubble {
  background: linear-gradient(135deg, #af52de, #ff7ad9);
}
#${ROOT_ID} .lc-chat-card-event[data-guard="1"] .lc-chat-bubble {
  background: linear-gradient(135deg, #ff2d55, #ff9f0a);
}
#${ROOT_ID} .lc-chat-message[data-kind="enter"],
#${ROOT_ID} .lc-chat-message[data-kind="notice"],
#${ROOT_ID} .lc-chat-message[data-kind="system"] {
  opacity: .86;
}
#${ROOT_ID} .lc-chat-meta {
  max-width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 3px;
  color: var(--lc-chat-muted);
  font-size: 11px;
  line-height: 1.2;
  padding-left: 4px;
  overflow: hidden;
}
#${ROOT_ID} .lc-chat-name {
  min-width: 0;
  max-width: min(15em, 64%);
  color: var(--lc-chat-name);
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID} .lc-chat-time {
  flex: 0 0 auto;
  color: var(--lc-chat-muted);
}
#${ROOT_ID} .lc-chat-avatar {
  grid-row: 1 / 3;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--lc-chat-chip);
  align-self: end;
  margin-bottom: 4px;
  box-shadow: 0 1px 3px var(--lc-chat-shadow);
}
#${ROOT_ID} .lc-chat-avatar-fallback {
  display: grid;
  place-items: center;
  color: var(--lc-chat-own-text);
  background: var(--lc-chat-own);
  font-weight: 800;
  font-size: 12px;
}
#${ROOT_ID} .lc-chat-reply {
  color: var(--lc-chat-accent);
}
#${ROOT_ID} .lc-chat-badge {
  flex: 0 1 auto;
  border-radius: 999px;
  padding: 1px 5px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-chip-text);
  font-size: 10px;
  line-height: 1.25;
  max-width: min(11em, 58%);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID} .lc-chat-medal {
  max-width: min(12em, 72%);
}
#${ROOT_ID} .lc-chat-kind {
  color: var(--lc-chat-own-text);
  background: var(--lc-chat-own);
}
#${ROOT_ID} .lc-chat-message[data-kind="danmaku"] .lc-chat-kind {
  display: none;
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
#${ROOT_ID} .lc-chat-body {
  grid-column: 2 / 3;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  display: grid;
  justify-items: start;
  gap: 3px;
  overflow: visible;
}
#${ROOT_ID} .lc-chat-bubble {
  position: relative;
  display: block;
  width: fit-content;
  min-width: 2.6em;
  max-width: calc(100% - 14px);
  color: var(--lc-chat-bubble-text);
  background: var(--lc-chat-bubble);
  border: 1px solid var(--lc-chat-border);
  border-radius: 18px;
  border-top-left-radius: 7px;
  padding: 8px 11px;
  font-size: 13px;
  line-height: 1.42;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  box-shadow: 0 1px 3px var(--lc-chat-shadow);
}
#${ROOT_ID} .lc-chat-bubble::before {
  content: "";
  position: absolute;
  left: -7px;
  top: 6px;
  width: 13px;
  height: 13px;
  background: var(--lc-chat-bubble);
  border-left: 1px solid var(--lc-chat-border);
  border-bottom: 1px solid var(--lc-chat-border);
  border-bottom-left-radius: 10px;
  transform: rotate(28deg);
  z-index: -1;
}
#${ROOT_ID} .lc-chat-message[data-kind="gift"] .lc-chat-bubble {
  background: #fff4c2;
  color: #4a3400;
  border-color: rgba(191, 134, 0, .22);
}
#${ROOT_ID} .lc-chat-message[data-kind="superchat"] .lc-chat-bubble {
  background: linear-gradient(180deg, #ff9f0a, #ff7a59);
  color: #fff;
  border-color: rgba(255, 122, 89, .28);
}
#${ROOT_ID}[data-theme="laplace"] .lc-chat-message[data-kind="gift"] .lc-chat-bubble,
#${ROOT_ID}[data-theme="compact"] .lc-chat-message[data-kind="gift"] .lc-chat-bubble {
  background: rgba(255, 214, 10, .22);
  color: #fff4bf;
}
#${ROOT_ID}[data-theme="laplace"] .lc-chat-message[data-kind="superchat"] .lc-chat-bubble,
#${ROOT_ID}[data-theme="compact"] .lc-chat-message[data-kind="superchat"] .lc-chat-bubble {
  background: linear-gradient(180deg, rgba(255, 159, 10, .92), rgba(255, 69, 58, .86));
  color: #fff;
}
#${ROOT_ID} .lc-chat-actions {
  grid-column: 2 / 3;
  justify-self: start;
  display: flex;
  gap: 4px;
  margin: 0 0 0 4px;
  opacity: 0;
  transform: translateY(-2px);
  transition: opacity .12s;
  max-width: 100%;
  overflow: hidden;
  pointer-events: none;
}
#${ROOT_ID} .lc-chat-message:hover .lc-chat-actions,
#${ROOT_ID} .lc-chat-message.lc-chat-selected .lc-chat-actions {
  opacity: 1;
  transform: translateY(0);
  pointer-events: auto;
}
#${ROOT_ID} .lc-chat-action {
  min-width: 22px;
  height: 20px;
  border: 0;
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-chip-text);
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
}
#${ROOT_ID} .lc-chat-action:hover {
  background: var(--lc-chat-own);
  color: var(--lc-chat-own-text);
}
#${ROOT_ID} .lc-chat-composer {
  display: grid;
  min-width: 0;
  gap: 5px;
  padding: 6px;
  border-top: 1px solid var(--lc-chat-border);
  background: var(--lc-chat-panel);
  backdrop-filter: blur(16px);
}
#${ROOT_ID} .lc-chat-input-wrap {
  position: relative;
}
#${ROOT_ID} textarea {
  width: 100%;
  min-width: 0;
  height: 48px;
  resize: vertical;
  min-height: 42px;
  max-height: 120px;
  border: 1px solid var(--lc-chat-border);
  border-radius: 18px;
  background: var(--lc-chat-bubble);
  color: var(--lc-chat-bubble-text);
  padding: 6px 34px 6px 7px;
  outline: none;
  font-size: 12px;
  line-height: 1.35;
  overflow-x: hidden;
}
#${ROOT_ID} textarea:focus {
  border-color: var(--lc-chat-own);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--lc-chat-own) 18%, transparent);
}
#${ROOT_ID} .lc-chat-count {
  position: absolute;
  right: 8px;
  bottom: 6px;
  color: var(--lc-chat-muted);
  font-size: 11px;
  pointer-events: none;
}
#${ROOT_ID} .lc-chat-send-row {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  overflow: hidden;
}
#${ROOT_ID} .lc-chat-send {
  min-height: 27px;
  padding: 0 13px;
  border: 0;
  border-radius: 999px;
  background: var(--lc-chat-own);
  color: var(--lc-chat-own-text);
  font-weight: 700;
  cursor: pointer;
}
#${ROOT_ID} .lc-chat-send:disabled {
  opacity: .5;
  cursor: wait;
}
#${ROOT_ID} .lc-chat-hint {
  color: var(--lc-chat-muted);
  font-size: 11px;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
#${ROOT_ID} .lc-chat-ws-status {
  font-size: 11px;
  color: var(--lc-chat-muted);
  min-width: 38px;
}
#${ROOT_ID} .lc-chat-ws-status[data-status="live"] {
  color: var(--lc-chat-accent);
}
#${ROOT_ID} .lc-chat-ws-status[data-status="error"] {
  color: #ff453a;
}
html.lc-custom-chat-hide-native .chat-items,
html.lc-custom-chat-hide-native .super-chat-card,
html.lc-custom-chat-hide-native .gift-item,
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
let nativeEventObserver: MutationObserver | null = null
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
const recentEventKeys = new Map<string, number>()
const renderQueue: CustomChatEvent[] = []
let renderFrame: number | null = null

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

function compactText(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function eventKey(event: Pick<CustomChatEvent, 'kind' | 'uid' | 'text'>): string {
  return `${event.kind}:${event.uid ?? ''}:${compactText(event.text).slice(0, 80)}`
}

function rememberEvent(event: Pick<CustomChatEvent, 'kind' | 'uid' | 'text'>): boolean {
  const now = Date.now()
  for (const [key, ts] of recentEventKeys) {
    if (now - ts > 9000) recentEventKeys.delete(key)
  }
  const key = eventKey(event)
  if (recentEventKeys.has(key)) return false
  recentEventKeys.set(key, now)
  return true
}

function isNoiseEventText(text: string): boolean {
  const clean = compactText(text)
  if (!clean) return true
  if (/^(头像|匿名|复制|举报|回复|关闭|更多|展开|收起|弹幕|礼物|SC|进场|通知|暂停|清屏|状态|显示)$/.test(clean)) return true
  if (/^搜索\s*user:/.test(clean)) return true
  return false
}

function isReliableEvent(event: CustomChatEvent): boolean {
  const text = compactText(event.text)
  if (isNoiseEventText(text)) return false
  if (event.source === 'dom' && displayName(event) === '匿名' && !event.uid && !event.avatarUrl && text.length <= 2) return false
  return true
}

function usefulBadgeText(raw: string, uname: string): string | null {
  const text = compactText(raw)
    .replace(/^粉丝牌[:：]?/, '')
    .replace(/^荣耀[:：]?/, '')
    .replace(/^用户等级[:：]?/, 'UL ')
  if (!text || text.length > 16) return null
  if (/这是\s*TA\s*的|TA 的|TA的|荣耀|粉丝|复制|举报|回复|关闭|头像/.test(text)) return null
  if (uname && (text === uname || text.startsWith(`${uname} `) || text.startsWith(`${uname}　`))) return null
  return text
}

function isBadDisplayName(value: string): boolean {
  return !value || /通过活动|查看我的装扮|获得|装扮|荣耀|粉丝牌|用户等级|头像|复制|举报|回复|关闭/.test(value)
}

function cleanDisplayName(value: string): string {
  return compactText(value).replace(/\s*[：:]\s*$/, '')
}

function displayName(message: CustomChatEvent): string {
  let name = cleanDisplayName(message.uname) || '匿名'
  for (const raw of message.badges) {
    const badge = compactText(raw)
    if (badge && name.startsWith(`${badge} `)) {
      name = cleanDisplayName(name.slice(badge.length))
    }
  }
  const medalPrefix = name.match(/^[^\s:：]{1,10}\s+\d{1,3}\s+(.{1,32})$/)
  const medalName = cleanDisplayName(medalPrefix?.[1] ?? '')
  if (medalName && !isBadDisplayName(medalName)) name = medalName
  name = cleanDisplayName(name)
  if (isBadDisplayName(name)) return '匿名'
  return name || '匿名'
}

function normalizeBadges(message: CustomChatEvent, name = displayName(message)): string[] {
  const normalized: string[] = []
  for (const raw of message.badges) {
    const text = usefulBadgeText(raw, name)
    if (!text) continue
    if (text === name || name.includes(text)) continue
    if (normalized.includes(text)) continue
    const parts = text.split(/\s+/).filter(Boolean)
    if (parts.length === 1 && normalized.some(item => item.includes(text))) continue
    if (parts.length > 1) {
      for (let i = normalized.length - 1; i >= 0; i--) {
        if (/^\d{1,3}$/.test(normalized[i]) && text.includes(normalized[i])) normalized.splice(i, 1)
      }
    }
    normalized.push(text)
    if (normalized.length >= 2) break
  }
  return normalized
}

function guardLevel(message: CustomChatEvent): string | null {
  const value = `${message.text} ${message.badges.join(' ')} ${message.rawCmd ?? ''}`
  if (/总督|GUARD\s*1|舰队\s*1|privilege[_-]?type["':\s]*1/i.test(value)) return '1'
  if (/提督|GUARD\s*2|舰队\s*2|privilege[_-]?type["':\s]*2/i.test(value)) return '2'
  if (/舰长|GUARD\s*3|舰队\s*3|privilege[_-]?type["':\s]*3/i.test(value)) return '3'
  return null
}

function cardType(message: CustomChatEvent): 'gift' | 'superchat' | 'guard' | null {
  if (message.kind === 'superchat') return 'superchat'
  if (message.kind === 'gift') return 'gift'
  if (guardLevel(message)) return 'guard'
  return null
}

function cardTitle(type: 'gift' | 'superchat' | 'guard', message: CustomChatEvent, guard: string | null): string {
  if (type === 'superchat') return message.amount ? `醒目留言 ¥${message.amount}` : '醒目留言'
  if (type === 'gift') return message.amount ? `礼物 ¥${Math.round(message.amount / 1000)}` : '礼物事件'
  if (guard === '1') return '总督事件'
  if (guard === '2') return '提督事件'
  return '舰长事件'
}

function cardMark(type: 'gift' | 'superchat' | 'guard', guard: string | null): string {
  if (type === 'superchat') return 'SC'
  if (type === 'gift') return '礼物'
  if (guard === '1') return '总督'
  if (guard === '2') return '提督'
  return '舰长'
}

function createAvatar(message: CustomChatEvent): HTMLElement {
  const fallback = document.createElement('div')
  fallback.className = 'lc-chat-avatar lc-chat-avatar-fallback'
  fallback.textContent = message.uname.slice(0, 1).toUpperCase() || '?'
  fallback.title = message.uid ? `UID ${message.uid}` : message.uname

  const avatar = message.avatarUrl || avatarUrl(message.uid)
  if (!avatar) return fallback

  const img = document.createElement('img')
  img.className = 'lc-chat-avatar'
  img.src = avatar
  img.alt = '头像'
  img.referrerPolicy = 'no-referrer'
  img.loading = 'lazy'
  img.title = fallback.title
  img.addEventListener('error', () => img.replaceWith(fallback), { once: true })
  return img
}

function nodeText(node: HTMLElement): string {
  return compactText(node.textContent ?? '')
}

function attrText(node: HTMLElement, attr: string): string | null {
  const value = node.getAttribute(attr)
  return value ? compactText(value) : null
}

function nativeUid(node: HTMLElement): string | null {
  const direct = attrText(node, 'data-uid') ?? node.querySelector<HTMLElement>('[data-uid]')?.getAttribute('data-uid')
  if (direct) return direct
  const link = node.querySelector<HTMLAnchorElement>('a[href*="space.bilibili.com"], a[href*="uid="]')
  const href = link?.href ?? ''
  return href.match(/space\.bilibili\.com\/(\d+)/)?.[1] ?? href.match(/[?&]uid=(\d+)/)?.[1] ?? null
}

function nativeUname(node: HTMLElement, text: string): string {
  const selectors = ['[data-uname]', '.user-name', '.username', '.name', '[class*="user-name"]', '[class*="username"]']
  for (const selector of selectors) {
    const el = node.querySelector<HTMLElement>(selector)
    const value = el?.getAttribute('data-uname') ?? el?.getAttribute('title') ?? el?.textContent
    const clean = cleanDisplayName(value ?? '')
    if (clean && clean !== text && clean.length <= 32 && !isBadDisplayName(clean)) return clean
  }
  return '匿名'
}

function nativeAvatar(node: HTMLElement): string | undefined {
  for (const img of node.querySelectorAll<HTMLImageElement>('img')) {
    const src = img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('src')
    if (!src) continue
    const label = `${img.className} ${img.alt}`.toLowerCase()
    if (label.includes('avatar') || label.includes('face') || label.includes('head') || label.includes('头像')) return src
  }
  return undefined
}

function nativeKind(node: HTMLElement, text: string): CustomChatKind | null {
  const signal = `${node.className} ${text}`
  if (/super[-_ ]?chat|superchat|醒目留言|醒目|￥|¥|\bSC\b/i.test(signal)) return 'superchat'
  if (/舰长|提督|总督|大航海|guard|privilege|开通|续费/i.test(signal)) return 'enter'
  if (/gift|礼物|赠送|投喂|送出|小花花|辣条|电池|x\s*\d+/i.test(signal)) return 'gift'
  return null
}

function nativeBadges(node: HTMLElement, text: string, uname: string): string[] {
  const badges: string[] = []
  for (const el of node.querySelectorAll<HTMLElement>('[title], [aria-label], [class*="medal"], [class*="guard"], [class*="level"]')) {
    const raw = el.getAttribute('title') ?? el.getAttribute('aria-label') ?? el.textContent ?? ''
    const clean = usefulBadgeText(raw, uname)
    if (!clean || clean === text || badges.includes(clean)) continue
    badges.push(clean)
    if (badges.length >= 3) break
  }
  if (/总督/i.test(text)) badges.unshift('GUARD 1')
  else if (/提督/i.test(text)) badges.unshift('GUARD 2')
  else if (/舰长/i.test(text)) badges.unshift('GUARD 3')
  return [...new Set(badges)]
}

function parseNativeEvent(node: HTMLElement): CustomChatEvent | null {
  if (node.classList.contains('danmaku-item')) return null
  if (node.closest(`#${ROOT_ID}`)) return null
  const text = nodeText(node)
  if (isNoiseEventText(text) || text.length < 2) return null
  const kind = nativeKind(node, text)
  if (!kind) return null
  const uname = nativeUname(node, text)
  const uid = nativeUid(node)
  const badges = nativeBadges(node, text, uname)
  const avatar = nativeAvatar(node) || avatarUrl(uid)
  if (uname === '匿名' && !uid && !avatar && text.length <= 4) return null
  return {
    id: `native-${++messageSeq}`,
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
  }
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
  if (status === 'connecting') return '实时事件源连接中'
  if (status === 'live') return '实时事件源正常'
  if (status === 'error') return '实时事件源异常，页面兜底中'
  if (status === 'closed') return '实时事件源断开，页面兜底中'
  return '实时事件源关闭'
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

function isNearBottom(): boolean {
  if (!listEl) return true
  return listEl.scrollHeight - listEl.scrollTop - listEl.clientHeight < 80
}

function scrollToBottom(): void {
  if (!listEl) return
  listEl.scrollTop = listEl.scrollHeight
}

function pruneMessages(): void {
  while (messages.length > MAX_MESSAGES) {
    messages.shift()
  }
  while (listEl && listEl.children.length > MAX_MESSAGES) {
    listEl?.firstElementChild?.remove()
  }
}

function renderMessage(message: CustomChatEvent, countUnread = true, updateCount = true, manageFlow = true): boolean {
  if (!listEl) return false
  const shouldStickToBottom = !paused && isNearBottom()
  if (!messageMatchesSearch(message)) {
    if (updateCount) updateMatchCount()
    return false
  }

  const row = document.createElement('div')
  row.className = countUnread ? 'lc-chat-message lc-chat-peek' : 'lc-chat-message'
  row.dataset.uid = message.uid ?? ''
  row.dataset.kind = message.kind
  row.dataset.source = message.source
  row.tabIndex = 0
  const guard = guardLevel(message)
  const card = cardType(message)
  if (card) {
    row.classList.add('lc-chat-card-event')
    row.dataset.card = card
  }
  if (card === 'gift' && !message.amount) row.classList.add('lc-chat-card-compact')
  if (guard) row.dataset.guard = guard

  row.addEventListener('click', e => {
    const target = e.target
    if (target instanceof HTMLElement && target.closest('button')) return
    row.classList.toggle('lc-chat-selected')
  })

  const avatarEl = createAvatar(message)

  const meta = document.createElement('div')
  meta.className = 'lc-chat-meta'

  const kind = document.createElement('span')
  kind.className = 'lc-chat-badge lc-chat-kind'
  kind.dataset.kind = message.kind
  setText(kind, kindLabel(message.kind))

  const name = document.createElement('span')
  name.className = 'lc-chat-name'
  const shownName = displayName(message)
  setText(name, shownName)

  const time = document.createElement('span')
  time.className = 'lc-chat-time'
  setText(time, message.time)

  if (message.kind !== 'danmaku') meta.append(kind)
  meta.append(name, time)
  if (message.isReply) {
    const reply = document.createElement('span')
    reply.className = 'lc-chat-reply'
    reply.textContent = '回复'
    meta.append(reply)
  }
  for (const badgeText of normalizeBadges(message, shownName)) {
    const badge = document.createElement('span')
    badge.className = 'lc-chat-badge lc-chat-medal'
    badge.dataset.badge = badgeText
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

  const body = document.createElement('div')
  body.className = 'lc-chat-body'

  const text = document.createElement('div')
  text.className = 'lc-chat-bubble lc-chat-text'
  if (card) {
    const head = document.createElement('div')
    head.className = 'lc-chat-card-head'

    const title = document.createElement('span')
    title.className = 'lc-chat-card-title'
    setText(title, cardTitle(card, message, guard))

    const mark = document.createElement('span')
    mark.className = 'lc-chat-card-mark'
    setText(mark, cardMark(card, guard))

    const content = document.createElement('span')
    content.className = 'lc-chat-card-text'
    setText(content, message.text)

    head.append(title, mark)
    text.append(head, content)
  } else {
    setText(text, message.text)
  }
  body.append(meta, text)

  row.append(avatarEl, body, actions)
  listEl.append(row)

  if (countUnread) window.setTimeout(() => row.classList.remove('lc-chat-peek'), 2600)
  if (manageFlow) {
    pruneMessages()
    if (!shouldStickToBottom && countUnread) {
      unread++
      updateUnread()
    } else {
      scrollToBottom()
    }
    if (updateCount) updateMatchCount()
  }
  return true
}

function clearMessages(): void {
  messages.length = 0
  renderQueue.length = 0
  unread = 0
  listEl?.replaceChildren()
  updateUnread()
  updateMatchCount()
}

function rerenderMessages(): void {
  if (!listEl) return
  listEl.replaceChildren()
  for (const message of messages) renderMessage(message, false, false, false)
  pruneMessages()
  updateMatchCount()
  if (!paused) scrollToBottom()
}

function flushRenderQueue(): void {
  renderFrame = null
  if (!listEl || renderQueue.length === 0) return
  const batch = renderQueue.splice(0)
  const shouldStickToBottom = !paused && isNearBottom()
  const animate = batch.length <= 12
  let appended = 0
  for (const event of batch) {
    if (renderMessage(event, animate, false, false)) appended++
  }
  if (appended === 0) {
    updateMatchCount()
    return
  }
  pruneMessages()
  if (!shouldStickToBottom) {
    unread += appended
    updateUnread()
  } else {
    scrollToBottom()
  }
  updateMatchCount()
}

function scheduleRender(event: CustomChatEvent): void {
  renderQueue.push(event)
  if (renderFrame !== null) return
  renderFrame = window.requestAnimationFrame(flushRenderQueue)
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

  const spacer = document.createElement('span')
  spacer.className = 'lc-chat-icon'
  spacer.setAttribute('aria-hidden', 'true')
  spacer.style.visibility = 'hidden'

  const title = document.createElement('div')
  title.className = 'lc-chat-title'
  title.textContent = '直播聊天'

  const menuBtn = makeButton('lc-chat-icon', '…', '聊天工具', () => {
    panel.classList.toggle('lc-chat-menu-open')
  })
  menuBtn.setAttribute('aria-label', '聊天工具')

  const menu = document.createElement('div')
  menu.className = 'lc-chat-menu'

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
  searchInput.placeholder = '搜索 user:名 kind:gift -词'
  searchInput.value = searchQuery
  searchInput.addEventListener('input', () => {
    searchQuery = searchInput?.value ?? ''
    unread = 0
    rerenderMessages()
    updateUnread()
  })

  const clearBtn = makeButton('lc-chat-pill', '清屏', '清空自定义评论区', clearMessages)

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

  const searchRow = document.createElement('div')
  searchRow.className = 'lc-chat-menu-row'
  searchRow.append(searchInput, matchCountEl)

  const controlRow = document.createElement('div')
  controlRow.className = 'lc-chat-menu-row'
  controlRow.append(pauseBtn, unreadEl, clearBtn)

  const statusRow = document.createElement('div')
  statusRow.className = 'lc-chat-menu-row'
  const statusLabel = document.createElement('span')
  statusLabel.className = 'lc-chat-menu-label'
  statusLabel.textContent = '状态'
  statusRow.append(statusLabel, wsStatusEl)

  const filterLabel = document.createElement('span')
  filterLabel.className = 'lc-chat-menu-label'
  filterLabel.textContent = '显示'
  const filterRow = document.createElement('div')
  filterRow.className = 'lc-chat-menu-row'
  filterRow.append(filterLabel, filterbar)

  menu.append(searchRow, controlRow, filterRow, statusRow)
  toolbar.append(spacer, title, menuBtn)

  listEl = document.createElement('div')
  listEl.className = 'lc-chat-list'
  listEl.addEventListener('scroll', () => {
    if (isNearBottom() && unread > 0) {
      unread = 0
      updateUnread()
    }
  }, { passive: true })

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
  hint.textContent = '偷 / +1 / 复制，设置可贴 CSS'
  sendRow.append(sendBtn, hint)

  composer.append(inputWrap, sendRow)
  panel.append(toolbar, menu, listEl, composer)
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
  observeNativeEvents(container)
  rerenderMessages()
}

function observeNativeEvents(container: HTMLElement): void {
  nativeEventObserver?.disconnect()
  const scan = (node: HTMLElement): void => {
    const event = parseNativeEvent(node)
    if (event) emitCustomChatEvent(event)
    for (const child of node.querySelectorAll<HTMLElement>('.chat-item, [class*="super"], [class*="gift"], [class*="guard"], [class*="privilege"]')) {
      const childEvent = parseNativeEvent(child)
      if (childEvent) emitCustomChatEvent(childEvent)
    }
  }
  for (const node of container.querySelectorAll<HTMLElement>('.chat-item, [class*="super"], [class*="gift"], [class*="guard"], [class*="privilege"]')) {
    scan(node)
  }
  nativeEventObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) scan(node)
      }
    }
  })
  nativeEventObserver.observe(container, { childList: true, subtree: true })
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
    badges: ev.badges,
    avatarUrl: ev.avatarUrl || avatarUrl(uid),
  })
}

function addEvent(event: CustomChatEvent): void {
  if (!isReliableEvent(event)) return
  if (messages.some(message => message.id === event.id && message.source === event.source)) return
  if (!rememberEvent(event)) return
  messages.push(event)
  scheduleRender(event)
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
  nativeEventObserver?.disconnect()
  nativeEventObserver = null
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
  renderQueue.length = 0
  if (renderFrame !== null) {
    window.cancelAnimationFrame(renderFrame)
    renderFrame = null
  }
  unread = 0
  paused = false
  sending = false
  searchQuery = ''
  recentEventKeys.clear()
}

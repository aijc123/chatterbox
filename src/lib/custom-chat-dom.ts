import { effect as signalEffect } from '@preact/signals'

import { BASE_URL } from './const'
import {
  type CustomChatEvent,
  type CustomChatField,
  type CustomChatKind,
  type CustomChatWsStatus,
  chatEventTime,
  emitCustomChatEvent,
  subscribeCustomChatEvents,
  subscribeCustomChatWsStatus,
} from './custom-chat-events'
import { formatMilliyuanAmount } from './custom-chat-pricing'
import {
  CUSTOM_CHAT_MAX_MESSAGES,
  customChatBadgeType,
  customChatPriority,
  shouldAnimateRenderBatch,
  shouldSuppressCustomChatEvent,
  takeRenderBatch,
  trimRenderQueue,
  visibleRenderMessages,
} from './custom-chat-render'
import { customChatSearchHint, kindLabel, messageMatchesCustomChatSearch } from './custom-chat-search'
import { copyText, repeatDanmaku, sendManualDanmaku, stealDanmaku } from './danmaku-actions'
import { type DanmakuEvent, subscribeDanmaku } from './danmaku-stream'
import { hasRecentWsDanmaku } from './live-ws-source'
import {
  cachedEmoticonPackages,
  customChatCss,
  customChatHideNative,
  customChatPerfDebug,
  customChatShowDanmaku,
  customChatShowEnter,
  customChatShowGift,
  customChatShowNotice,
  customChatShowSuperchat,
  customChatTheme,
  danmakuDirectConfirm,
  fasongText,
} from './store'

const ROOT_ID = 'laplace-custom-chat'
const STYLE_ID = 'laplace-custom-chat-style'
const USER_STYLE_ID = 'laplace-custom-chat-user-style'
const MAX_MESSAGES = CUSTOM_CHAT_MAX_MESSAGES
const MAX_NATIVE_SCAN_BATCH = 48
const MAX_NATIVE_INITIAL_SCAN = 80
const VIRTUAL_OVERSCAN = 7
const DEFAULT_ROW_HEIGHT = 62
const LITE_ROW_HEIGHT = 42
const CARD_ROW_HEIGHT = 96
const CRITICAL_CARD_ROW_HEIGHT = 108
const COMPACT_CARD_ROW_HEIGHT = 70
const NATIVE_HEALTH_WINDOW = 12000
const NATIVE_HEALTH_MIN_SCANS = 24
const NATIVE_HEALTH_MAX_EVENTS = 0
const NATIVE_EVENT_SELECTOR =
  '.chat-item, .super-chat-card, .gift-item, [class*="super"], [class*="gift"], [class*="guard"], [class*="privilege"]'

type ChatFollowMode = 'following' | 'frozenByScroll' | 'frozenByButton'

interface FrozenSnapshot {
  messages: CustomChatEvent[]
  rowHeights: Map<string, number>
  scrollTop: number
}

const STYLE = `
#${ROOT_ID}, #${ROOT_ID} * {
  box-sizing: border-box;
  font-family: var(--lc-chat-font, -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif);
  letter-spacing: 0;
}
#${ROOT_ID} {
  --lc-chat-bg: #f5f5f7;
  --lc-chat-panel: rgba(255, 255, 255, .84);
  --lc-chat-border: rgba(60, 60, 67, .12);
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
  --lc-chat-shadow: rgba(0, 0, 0, .10);
  --lc-chat-bubble-shadow: 0 1px 1px rgba(0, 0, 0, .035), 0 8px 22px rgba(0, 0, 0, .075);
  --lc-chat-lite: rgba(118, 118, 128, .12);
  --lc-chat-lite-text: #5f6368;
  --lc-chat-medal-bg: #fff0b8;
  --lc-chat-medal-text: #5c4210;
  --lc-chat-guard-bg: #dceaff;
  --lc-chat-guard-text: #184a8b;
  --lc-chat-admin-bg: #d7ecff;
  --lc-chat-admin-text: #0057a8;
  --lc-chat-rank-bg: #ffe6a8;
  --lc-chat-rank-text: #6a4300;
  --lc-chat-ul-bg: #e8e5ff;
  --lc-chat-ul-text: #473a8d;
  --lc-chat-honor-bg: #e8f8ef;
  --lc-chat-honor-text: #19643a;
  --lc-chat-price-bg: #ffe2cf;
  --lc-chat-price-text: #7f3516;
  height: 100%;
  width: 100%;
  min-width: 0;
  min-height: 340px;
  flex: 1 1 auto;
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr) auto;
  color: var(--lc-chat-text);
  background: var(--lc-chat-bg);
  border-left: 1px solid var(--lc-chat-border);
  overflow: hidden;
  contain: layout style;
  transition:
    color .18s ease,
    background-color .18s ease,
    border-color .18s ease;
}
html.lc-custom-chat-mounted #${ROOT_ID} {
  display: grid !important;
}
html.lc-custom-chat-root-outside-history #${ROOT_ID} {
  flex: 1 1 auto;
  min-height: 0;
}
#${ROOT_ID}[data-theme="laplace"],
#${ROOT_ID}[data-theme="compact"] {
  --lc-chat-bg: #050608;
  --lc-chat-panel: rgba(22, 24, 29, .86);
  --lc-chat-border: rgba(255, 255, 255, .075);
  --lc-chat-text: #f5f5f7;
  --lc-chat-muted: #98989f;
  --lc-chat-name: #64d2ff;
  --lc-chat-bubble: #1c1c1e;
  --lc-chat-bubble-text: #f5f5f7;
  --lc-chat-own: #0a84ff;
  --lc-chat-own-text: #fff;
  --lc-chat-chip: rgba(255, 255, 255, .1);
  --lc-chat-chip-text: #e6edf7;
  --lc-chat-accent: #30d158;
  --lc-chat-shadow: rgba(0, 0, 0, .34);
  --lc-chat-bubble-shadow: 0 1px 1px rgba(255, 255, 255, .025), 0 10px 28px rgba(0, 0, 0, .28);
  --lc-chat-lite: rgba(255, 255, 255, .08);
  --lc-chat-lite-text: #b8bac4;
  --lc-chat-medal-bg: rgba(255, 214, 10, .18);
  --lc-chat-medal-text: #ffe8a3;
  --lc-chat-guard-bg: rgba(100, 210, 255, .18);
  --lc-chat-guard-text: #b8e6ff;
  --lc-chat-admin-bg: rgba(10, 132, 255, .2);
  --lc-chat-admin-text: #c4e2ff;
  --lc-chat-rank-bg: rgba(255, 204, 0, .2);
  --lc-chat-rank-text: #ffe08a;
  --lc-chat-ul-bg: rgba(191, 90, 242, .2);
  --lc-chat-ul-text: #e7c6ff;
  --lc-chat-honor-bg: rgba(48, 209, 88, .18);
  --lc-chat-honor-text: #b9f6c8;
  --lc-chat-price-bg: rgba(255, 159, 10, .2);
  --lc-chat-price-text: #ffd49a;
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
  position: relative;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overflow-x: hidden;
  overscroll-behavior: contain;
  overflow-anchor: none;
  padding: 13px 10px 14px;
  scrollbar-width: thin;
  scroll-behavior: auto;
  -webkit-mask-image: linear-gradient(to bottom, transparent, #000 18px, #000 calc(100% - 18px), transparent);
  mask-image: linear-gradient(to bottom, transparent, #000 18px, #000 calc(100% - 18px), transparent);
}
#${ROOT_ID} .lc-chat-virtual-items {
  min-width: 0;
  overflow-anchor: none;
}
#${ROOT_ID} .lc-chat-virtual-spacer {
  min-width: 1px;
  pointer-events: none;
  overflow-anchor: none;
}
#${ROOT_ID} .lc-chat-empty {
  min-height: 100%;
  display: grid;
  place-items: center;
  padding: 32px 18px;
  color: var(--lc-chat-muted);
  font-size: 12px;
  line-height: 1.55;
  text-align: center;
  pointer-events: none;
}
#${ROOT_ID} .lc-chat-message {
  position: relative;
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr);
  gap: 3px 9px;
  width: 100%;
  min-width: 0;
  max-width: 100%;
  padding: 4px 2px 6px;
  border-radius: 0;
  border: 1px solid transparent;
  background: transparent;
  overflow: visible;
}
#${ROOT_ID} .lc-chat-message:focus-visible {
  outline: 2px solid color-mix(in srgb, var(--lc-chat-own) 64%, transparent);
  outline-offset: -2px;
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
  grid-template-columns: 38px minmax(0, 1fr);
  gap: 4px 10px;
  padding: 7px 2px;
}
#${ROOT_ID} .lc-chat-card-event .lc-chat-avatar {
  width: 38px;
  height: 38px;
  margin-bottom: 9px;
}
#${ROOT_ID} .lc-chat-card-event .lc-chat-meta {
  padding-left: 6px;
}
#${ROOT_ID} .lc-chat-card-event .lc-chat-bubble {
  width: 100%;
  max-width: 100%;
  min-height: 62px;
  padding: 11px 14px;
  border-radius: 18px;
  border-bottom-left-radius: 8px;
  font-size: 14px;
  font-weight: 720;
  box-shadow: var(--lc-chat-bubble-shadow);
}
#${ROOT_ID} .lc-chat-card-compact .lc-chat-bubble {
  min-height: 0;
  padding: 8px 11px;
  border-radius: 20px;
  border-bottom-left-radius: 8px;
  font-size: 12.5px;
  font-weight: 650;
}
#${ROOT_ID} .lc-chat-card-event .lc-chat-bubble::before {
  top: auto;
  bottom: 0;
  left: -4px;
  width: 13px;
  height: 15px;
  background: var(--lc-chat-bubble);
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
  line-height: 1.35;
}
#${ROOT_ID} .lc-chat-card-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 6px;
}
#${ROOT_ID} .lc-chat-card-field {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-width: 0;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, .24);
  color: currentColor;
  font-size: 11px;
  line-height: 1.35;
}
#${ROOT_ID} .lc-chat-card-field-label {
  opacity: .72;
}
#${ROOT_ID} .lc-chat-card-field-value {
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
#${ROOT_ID} .lc-chat-card-event[data-card="redpacket"] .lc-chat-bubble {
  background: linear-gradient(135deg, #ff375f, #ffcc00);
  color: #fff;
  border-color: rgba(255, 55, 95, .32);
}
#${ROOT_ID} .lc-chat-card-event[data-card="lottery"] .lc-chat-bubble {
  background: linear-gradient(135deg, #34c759, #64d2ff);
  color: #063320;
  border-color: rgba(52, 199, 89, .28);
}
#${ROOT_ID} .lc-chat-card-event[data-guard="2"] .lc-chat-bubble {
  background: linear-gradient(135deg, #af52de, #ff7ad9);
}
#${ROOT_ID} .lc-chat-card-event[data-guard="1"] .lc-chat-bubble {
  background: linear-gradient(135deg, #ff2d55, #ff9f0a);
}
#${ROOT_ID} .lc-chat-message[data-kind="guard"],
#${ROOT_ID} .lc-chat-message[data-kind="follow"],
#${ROOT_ID} .lc-chat-message[data-kind="like"],
#${ROOT_ID} .lc-chat-message[data-kind="share"],
#${ROOT_ID} .lc-chat-message[data-kind="redpacket"],
#${ROOT_ID} .lc-chat-message[data-kind="lottery"],
#${ROOT_ID} .lc-chat-message[data-kind="notice"],
#${ROOT_ID} .lc-chat-message[data-kind="system"] {
  opacity: .86;
}
#${ROOT_ID} .lc-chat-message[data-priority="lite"] {
  grid-template-columns: minmax(0, 1fr);
  padding: 2px 8px;
  opacity: .78;
}
#${ROOT_ID} .lc-chat-message[data-priority="lite"] .lc-chat-avatar,
#${ROOT_ID} .lc-chat-message[data-priority="lite"] .lc-chat-meta,
#${ROOT_ID} .lc-chat-message[data-priority="lite"] .lc-chat-actions {
  display: none;
}
#${ROOT_ID} .lc-chat-message[data-priority="lite"] .lc-chat-body {
  grid-column: 1 / 2;
  justify-items: center;
}
#${ROOT_ID} .lc-chat-message[data-priority="lite"] .lc-chat-bubble {
  max-width: 92%;
  min-width: 0;
  padding: 4px 9px;
  border-radius: 999px;
  color: var(--lc-chat-lite-text);
  background: var(--lc-chat-lite);
  border-color: transparent;
  box-shadow: none;
  font-size: 11px;
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
#${ROOT_ID} .lc-chat-message[data-priority="lite"] .lc-chat-bubble::before {
  display: none;
}
#${ROOT_ID} .lc-chat-message[data-priority="identity"] .lc-chat-avatar {
  box-shadow: 0 0 0 1px var(--lc-chat-guard-bg), 0 2px 7px var(--lc-chat-shadow);
}
#${ROOT_ID} .lc-chat-message[data-guard="1"] .lc-chat-avatar {
  box-shadow: 0 0 0 2px var(--lc-chat-price-bg), 0 2px 8px var(--lc-chat-shadow);
}
#${ROOT_ID} .lc-chat-message[data-guard="2"] .lc-chat-avatar {
  box-shadow: 0 0 0 2px var(--lc-chat-ul-bg), 0 2px 8px var(--lc-chat-shadow);
}
#${ROOT_ID} .lc-chat-message[data-guard="3"] .lc-chat-avatar {
  box-shadow: 0 0 0 2px var(--lc-chat-guard-bg), 0 2px 8px var(--lc-chat-shadow);
}
#${ROOT_ID} .lc-chat-meta {
  max-width: 100%;
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  color: var(--lc-chat-muted);
  font-size: 11px;
  line-height: 1.2;
  padding-left: 10px;
  overflow: hidden;
}
#${ROOT_ID} .lc-chat-name {
  min-width: 0;
  max-width: min(15em, 64%);
  color: var(--lc-chat-name);
  font-weight: 700;
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
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--lc-chat-chip);
  align-self: end;
  margin-bottom: 3px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, .5), 0 2px 7px var(--lc-chat-shadow);
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
  padding: 1px 6px;
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
#${ROOT_ID} .lc-chat-badge[data-badge-type="medal"] {
  color: var(--lc-chat-medal-text);
  background: var(--lc-chat-medal-bg);
  text-shadow: none;
}
#${ROOT_ID} .lc-chat-badge[data-badge-type="guard"] {
  color: var(--lc-chat-guard-text);
  background: var(--lc-chat-guard-bg);
  font-weight: 800;
  text-shadow: none;
}
#${ROOT_ID} .lc-chat-badge[data-badge-type="admin"] {
  color: var(--lc-chat-admin-text);
  background: var(--lc-chat-admin-bg);
}
#${ROOT_ID} .lc-chat-badge[data-badge-type="rank"] {
  color: var(--lc-chat-rank-text);
  background: var(--lc-chat-rank-bg);
  font-weight: 800;
}
#${ROOT_ID} .lc-chat-badge[data-badge-type="ul"] {
  color: var(--lc-chat-ul-text);
  background: var(--lc-chat-ul-bg);
}
#${ROOT_ID} .lc-chat-badge[data-badge-type="honor"] {
  color: var(--lc-chat-honor-text);
  background: var(--lc-chat-honor-bg);
}
#${ROOT_ID} .lc-chat-badge[data-badge-type="price"] {
  color: var(--lc-chat-price-text);
  background: var(--lc-chat-price-bg);
  font-weight: 800;
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
  gap: 4px;
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
  border: 1px solid color-mix(in srgb, var(--lc-chat-border) 74%, transparent);
  border-radius: 20px;
  border-bottom-left-radius: 7px;
  padding: 8px 13px 9px;
  font-size: 13.5px;
  line-height: 1.38;
  word-break: break-word;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  box-shadow: var(--lc-chat-bubble-shadow);
  isolation: isolate;
}
#${ROOT_ID} .lc-chat-emote {
  display: inline-block;
  width: 1.7em;
  height: 1.7em;
  margin: -.2em .08em;
  vertical-align: middle;
  object-fit: contain;
}
#${ROOT_ID} .lc-chat-bubble::before {
  content: "";
  position: absolute;
  left: -4px;
  bottom: 0;
  width: 12px;
  height: 15px;
  background: inherit;
  border-left: 1px solid color-mix(in srgb, var(--lc-chat-border) 74%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--lc-chat-border) 74%, transparent);
  border-bottom-left-radius: 12px;
  transform: skew(-22deg);
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
#${ROOT_ID} .lc-chat-message.lc-chat-selected .lc-chat-bubble {
  box-shadow: 0 0 0 2px color-mix(in srgb, var(--lc-chat-own) 18%, transparent), var(--lc-chat-bubble-shadow);
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
  position: sticky;
  bottom: 0;
  z-index: 4;
  display: grid;
  grid-template-rows: auto auto;
  flex: 0 0 auto;
  min-width: 0;
  min-height: 88px;
  gap: 6px;
  padding: 9px 8px 8px;
  border-top: 1px solid var(--lc-chat-border);
  background: color-mix(in srgb, var(--lc-chat-panel) 94%, transparent);
  box-shadow: 0 -10px 24px color-mix(in srgb, var(--lc-chat-bg) 86%, transparent);
  backdrop-filter: blur(16px);
}
#${ROOT_ID} .lc-chat-input-wrap {
  position: relative;
}
#${ROOT_ID} textarea {
  width: 100%;
  min-width: 0;
  height: 46px;
  resize: vertical;
  min-height: 42px;
  max-height: 120px;
  border: 1px solid var(--lc-chat-border);
  border-radius: 22px;
  background: color-mix(in srgb, var(--lc-chat-bubble) 92%, var(--lc-chat-panel));
  color: var(--lc-chat-bubble-text);
  padding: 9px 38px 9px 13px;
  outline: none;
  font-size: 13px;
  line-height: 1.34;
  overflow-x: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, .035);
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
#${ROOT_ID} .lc-chat-unread {
  max-width: min(100%, 220px);
  border-color: color-mix(in srgb, var(--lc-chat-own) 28%, transparent);
}
#${ROOT_ID} .lc-chat-unread[data-frozen="true"] {
  background: color-mix(in srgb, var(--lc-chat-chip) 74%, var(--lc-chat-own) 26%);
}
#${ROOT_ID} .lc-chat-ws-status {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  max-width: 100%;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 11px;
  color: var(--lc-chat-muted);
  min-width: 38px;
  background: color-mix(in srgb, var(--lc-chat-chip) 70%, transparent);
  overflow-wrap: anywhere;
}
#${ROOT_ID} .lc-chat-ws-status[data-status="live"] {
  color: var(--lc-chat-accent);
}
#${ROOT_ID} .lc-chat-ws-status[data-status="fallback"] {
  color: #8a4b00;
  background: rgba(255, 159, 10, .18);
  border: 1px solid rgba(255, 159, 10, .34);
}
#${ROOT_ID} .lc-chat-ws-status[data-status="dom-warning"] {
  color: #9a3412;
  background: rgba(255, 204, 0, .20);
  border: 1px solid rgba(255, 204, 0, .42);
}
#${ROOT_ID}[data-theme="laplace"] .lc-chat-ws-status[data-status="fallback"],
#${ROOT_ID}[data-theme="compact"] .lc-chat-ws-status[data-status="fallback"],
#${ROOT_ID}[data-theme="laplace"] .lc-chat-ws-status[data-status="dom-warning"],
#${ROOT_ID}[data-theme="compact"] .lc-chat-ws-status[data-status="dom-warning"] {
  color: #ffd60a;
  background: rgba(255, 159, 10, .20);
  border-color: rgba(255, 214, 10, .36);
}
#${ROOT_ID} .lc-chat-perf {
  display: none;
  width: 100%;
  padding: 6px 8px;
  border-radius: 12px;
  color: var(--lc-chat-muted);
  background: color-mix(in srgb, var(--lc-chat-chip) 72%, transparent);
  font: 11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
  overflow-wrap: anywhere;
}
#${ROOT_ID}[data-debug="true"] .lc-chat-perf {
  display: block;
}
#${ROOT_ID} .lc-chat-event-debug {
  display: none;
  min-width: 0;
  margin: 0 8px 6px;
  padding: 8px 10px;
  border: 1px solid var(--lc-chat-border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--lc-chat-panel) 88%, var(--lc-chat-bg));
  color: var(--lc-chat-muted);
  font: 11px/1.45 ui-monospace, SFMono-Regular, Consolas, monospace;
  overflow-wrap: anywhere;
}
#${ROOT_ID}[data-inspecting="true"] .lc-chat-event-debug {
  display: grid;
  gap: 5px;
}
#${ROOT_ID} .lc-chat-debug-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
#${ROOT_ID} .lc-chat-debug-title {
  color: var(--lc-chat-text);
  font-weight: 800;
}
#${ROOT_ID} .lc-chat-debug-close {
  border: 0;
  border-radius: 999px;
  background: var(--lc-chat-chip);
  color: var(--lc-chat-chip-text);
  cursor: pointer;
  font-size: 11px;
}
#${ROOT_ID} .lc-chat-debug-row {
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr);
  gap: 6px;
}
#${ROOT_ID} .lc-chat-debug-key {
  color: var(--lc-chat-muted);
}
#${ROOT_ID} .lc-chat-debug-value {
  color: var(--lc-chat-text);
}
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .chat-items,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .super-chat-card,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .gift-item,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .chat-control-panel,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .chat-input-panel,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .control-panel-ctnr,
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .chat-input-ctnr {
  display: none !important;
}
html.lc-custom-chat-hide-native.lc-custom-chat-mounted.lc-custom-chat-root-outside-history .chat-history-panel {
  display: none !important;
}
html.lc-custom-chat-hide-native.lc-custom-chat-mounted .chat-history-panel:has(#${ROOT_ID}) > :not(#${ROOT_ID}) {
  display: none !important;
}
`

let unsubscribeDom: (() => void) | null = null
let unsubscribeEvents: (() => void) | null = null
let unsubscribeWsStatus: (() => void) | null = null
let disposeSettings: (() => void) | null = null
let disposeComposer: (() => void) | null = null
let nativeEventObserver: MutationObserver | null = null
let root: HTMLElement | null = null
let rootOutsideHistory = false
let listEl: HTMLElement | null = null
let virtualTopSpacer: HTMLElement | null = null
let virtualItemsEl: HTMLElement | null = null
let virtualBottomSpacer: HTMLElement | null = null
let pauseBtn: HTMLButtonElement | null = null
let unreadBtn: HTMLButtonElement | null = null
let searchInput: HTMLInputElement | null = null
let matchCountEl: HTMLElement | null = null
let wsStatusEl: HTMLElement | null = null
let emptyEl: HTMLElement | null = null
let perfEl: HTMLElement | null = null
let debugEl: HTMLElement | null = null
let textarea: HTMLTextAreaElement | null = null
let countEl: HTMLElement | null = null
let styleEl: HTMLStyleElement | null = null
let userStyleEl: HTMLStyleElement | null = null
let messageSeq = 0
let followMode: ChatFollowMode = 'following'
let frozenSnapshot: FrozenSnapshot | null = null
let unread = 0
let sending = false
let searchQuery = ''
let hasClearedMessages = false
let currentWsStatus: CustomChatWsStatus = 'off'
let nativeDomWarning = false
const messages: CustomChatEvent[] = []
const messageKeys = new Set<string>()
const recentEventKeys = new Map<string, number>()
const renderQueue: CustomChatEvent[] = []
let visibleMessages: CustomChatEvent[] = []
const rowHeights = new Map<string, number>()
const eventTicks: number[] = []
const nativeHealthSamples: Array<{ ts: number; parsed: boolean }> = []
const seenNativeNodes = new WeakSet<HTMLElement>()
const pendingNativeNodes = new Set<HTMLElement>()
const sourceCounts: Record<CustomChatEvent['source'], number> = { dom: 0, ws: 0, local: 0 }
let lastBatchSize = 0
let renderFrame: number | null = null
let rerenderFrame: number | null = null
let nativeScanFrame: number | null = null
let rerenderToken = 0
let rootEventController: AbortController | null = null
let emoticonCacheSource: typeof cachedEmoticonPackages.value | null = null
let emoticonCache = new Map<string, { url: string; alt: string }>()
let emoticonFirstCharCache = new Map<string, string[]>()

function eventToSendableMessage(ev: DanmakuEvent): string {
  if (!ev.isReply) return ev.text
  return ev.uname ? `@${ev.uname} ${ev.text}` : ev.text
}

function normalizeEmoticonTokens(...values: Array<string | null | undefined>): string[] {
  const tokens = new Set<string>()

  const add = (value: string | null | undefined): void => {
    const token = (value ?? '').trim()
    if (!token) return
    tokens.add(token)

    const bracketMatch = token.match(/^[[\u3010](.*?)[\]\u3011]$/u)
    const core = (bracketMatch?.[1] ?? token).trim()
    if (!core) return

    tokens.add(core)
    tokens.add(`[${core}]`)
    tokens.add(`【${core}】`)
  }

  for (const value of values) add(value)
  return [...tokens]
}

function rebuildEmoticonCache(): void {
  const packages = cachedEmoticonPackages.value
  if (packages === emoticonCacheSource) return
  emoticonCacheSource = packages
  emoticonCache = new Map()
  emoticonFirstCharCache = new Map()

  for (const pkg of packages) {
    for (const emoticon of pkg.emoticons) {
      const entries = normalizeEmoticonTokens(emoticon.emoticon_unique, emoticon.emoji, emoticon.descript)
      for (const token of entries) {
        if (!token || emoticonCache.has(token)) continue
        emoticonCache.set(token, {
          url: emoticon.url,
          alt: emoticon.descript || emoticon.emoji || emoticon.emoticon_unique || token,
        })
      }
    }
  }

  const tokens = [...emoticonCache.keys()].sort((a, b) => b.length - a.length)
  for (const token of tokens) {
    const firstChar = token[0]
    if (!firstChar) continue
    const list = emoticonFirstCharCache.get(firstChar)
    if (list) list.push(token)
    else emoticonFirstCharCache.set(firstChar, [token])
  }
}

function matchingEmoticonToken(text: string, start: number): string | null {
  rebuildEmoticonCache()
  const candidates = emoticonFirstCharCache.get(text[start] ?? '')
  if (!candidates) return null
  for (const token of candidates) {
    if (text.startsWith(token, start)) return token
  }
  return null
}

function appendTextFragment(parent: HTMLElement, text: string): void {
  if (!text) {
    parent.replaceChildren()
    return
  }
  const fragment = document.createDocumentFragment()
  let cursor = 0
  let buffer = ''

  while (cursor < text.length) {
    const token = matchingEmoticonToken(text, cursor)
    if (!token) {
      buffer += text[cursor]
      cursor += 1
      continue
    }

    if (buffer) {
      fragment.append(buffer)
      buffer = ''
    }

    const emoticon = emoticonCache.get(token)
    if (!emoticon?.url) {
      buffer += token
      cursor += token.length
      continue
    }

    const img = document.createElement('img')
    img.className = 'lc-chat-emote'
    img.src = emoticon.url
    img.alt = emoticon.alt || token
    img.title = emoticon.alt || token
    img.loading = 'lazy'
    img.decoding = 'async'
    fragment.append(img)
    cursor += token.length
  }

  if (buffer) fragment.append(buffer)
  parent.replaceChildren(fragment)
}

function setText(el: HTMLElement, text: string): void {
  appendTextFragment(el, text)
}

function getRootEventSignal(): AbortSignal {
  rootEventController ??= new AbortController()
  return rootEventController.signal
}

function abortRootEventListeners(): void {
  rootEventController?.abort()
  rootEventController = null
}

function addRootEventListener<K extends keyof GlobalEventHandlersEventMap>(
  target: HTMLElement,
  type: K,
  listener: (event: GlobalEventHandlersEventMap[K]) => void,
  options?: AddEventListenerOptions
): void {
  target.addEventListener(type, listener as EventListener, { ...options, signal: getRootEventSignal() })
}

function makeButton(
  className: string,
  text: string,
  title: string,
  onClick: (e: MouseEvent) => void
): HTMLButtonElement {
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = className
  btn.textContent = text
  btn.title = title
  addRootEventListener(btn, 'click', onClick)
  return btn
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

function messageKey(event: Pick<CustomChatEvent, 'source' | 'id'>): string {
  return `${event.source}:${event.id}`
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

function messageIndexByEvent(event: Pick<CustomChatEvent, 'kind' | 'uid' | 'text'>): number {
  const key = eventKey(event)
  for (let index = messages.length - 1; index >= 0; index--) {
    if (eventKey(messages[index]) === key) return index
  }
  return -1
}

function chooseBetterName(current: string, incoming: string): string {
  const currentName = compactText(current)
  const incomingName = compactText(incoming)
  if (!incomingName) return current
  if (!currentName || currentName === '匿名') return incoming
  if (incomingName === '匿名') return current
  if (incomingName.length > currentName.length && incomingName.includes(currentName)) return incoming
  return current
}

function mergeFields(
  current: CustomChatField[] | undefined,
  incoming: CustomChatField[] | undefined
): CustomChatField[] | undefined {
  if (!incoming?.length) return current
  if (!current?.length) return incoming
  const merged = [...current]
  const keys = new Set(current.map(field => field.key))
  for (const field of incoming) {
    if (keys.has(field.key)) continue
    merged.push(field)
  }
  return merged
}

function parseBadgeLevel(raw: string): number | null {
  const text = compactText(raw)
  const match = text.match(/^(?:UL|LV)\s*(\d{1,3})$/i) ?? text.match(/^用户等级[:：]?\s*(\d{1,3})$/)
  if (!match) return null
  const value = Number(match[1])
  return Number.isFinite(value) && value >= 0 ? value : null
}

function formatBadgeLevel(level: number): string {
  return `LV${Math.max(0, Math.trunc(level))}`
}

function bestMergedBadges(currentBadges: string[], incomingBadges: string[]): string[] {
  const merged: string[] = []
  let bestLevel: number | null = null
  for (const raw of [...currentBadges, ...incomingBadges]) {
    const level = parseBadgeLevel(raw)
    if (level !== null) {
      if (bestLevel === null || level > bestLevel) bestLevel = level
      continue
    }
    if (!merged.includes(raw)) merged.push(raw)
  }
  if (bestLevel !== null) merged.push(formatBadgeLevel(bestLevel))
  return merged
}

function mergeDuplicateEvent(current: CustomChatEvent, incoming: CustomChatEvent): CustomChatEvent | null {
  const preferIncomingIdentity = incoming.source === 'ws' && current.source === 'dom'
  const mergedBadges = bestMergedBadges(current.badges, incoming.badges)
  const mergedFields = mergeFields(current.fields, incoming.fields)
  const merged: CustomChatEvent = {
    ...current,
    id: preferIncomingIdentity ? incoming.id : current.id,
    kind: current.kind === incoming.kind ? current.kind : incoming.kind,
    sendText: incoming.sendText ?? current.sendText,
    uname: chooseBetterName(current.uname, incoming.uname),
    uid: current.uid ?? incoming.uid,
    time: preferIncomingIdentity ? incoming.time : current.time,
    isReply: current.isReply || incoming.isReply,
    source: preferIncomingIdentity ? incoming.source : current.source,
    badges: mergedBadges,
    avatarUrl: incoming.avatarUrl ?? current.avatarUrl,
    amount: current.amount ?? incoming.amount,
    fields: mergedFields,
    rawCmd: incoming.rawCmd ?? current.rawCmd,
  }

  const changed =
    merged.id !== current.id ||
    merged.kind !== current.kind ||
    merged.sendText !== current.sendText ||
    merged.uname !== current.uname ||
    merged.uid !== current.uid ||
    merged.time !== current.time ||
    merged.isReply !== current.isReply ||
    merged.source !== current.source ||
    merged.avatarUrl !== current.avatarUrl ||
    merged.amount !== current.amount ||
    merged.rawCmd !== current.rawCmd ||
    merged.badges.length !== current.badges.length ||
    merged.badges.some((badge, index) => badge !== current.badges[index]) ||
    (merged.fields?.length ?? 0) !== (current.fields?.length ?? 0)

  return changed ? merged : null
}

function replaceMessage(index: number, next: CustomChatEvent): void {
  const previous = messages[index]
  if (!previous) return
  const prevKey = messageKey(previous)
  const nextKey = messageKey(next)
  messages[index] = next
  if (prevKey !== nextKey) {
    messageKeys.delete(prevKey)
    rowHeights.delete(prevKey)
    messageKeys.add(nextKey)
  }
  scheduleRerenderMessages()
}

function recordEventStats(event: CustomChatEvent): void {
  const now = Date.now()
  eventTicks.push(now)
  while (eventTicks.length > 0 && now - eventTicks[0] > 1000) eventTicks.shift()
  sourceCounts[event.source]++
}

function updatePerfDebug(): void {
  if (!perfEl || !root) return
  root.dataset.debug = customChatPerfDebug.value ? 'true' : 'false'
  root.dataset.followMode = followMode
  if (!customChatPerfDebug.value) {
    root.removeAttribute('data-inspecting')
    root.querySelectorAll('.lc-chat-message.lc-chat-selected').forEach(el => {
      el.classList.remove('lc-chat-selected')
    })
    debugEl?.replaceChildren()
    return
  }
  const totalSources = sourceCounts.dom + sourceCounts.ws + sourceCounts.local || 1
  const pct = (value: number) => Math.round((value / totalSources) * 100)
  const rendered = virtualItemsEl?.querySelectorAll('.lc-chat-message').length ?? 0
  perfEl.textContent = `消息 ${messages.length}/${MAX_MESSAGES} | 可见 ${renderedMessages().length} | DOM节点 ${rendered} | 事件 ${eventTicks.length}/秒 | 本帧 ${lastBatchSize} | 待渲染 ${renderQueue.length} | DOM待扫 ${pendingNativeNodes.size} | WS ${pct(sourceCounts.ws)}% DOM ${pct(sourceCounts.dom)}% 本地 ${pct(sourceCounts.local)}%`
}

function isNoiseEventText(text: string): boolean {
  const clean = compactText(text)
  if (!clean) return true
  if (/^(头像|匿名|复制|举报|回复|关闭|更多|展开|收起|弹幕|礼物|SC|进场|通知|暂停|清屏|状态|显示)$/.test(clean))
    return true
  if (/^搜索\s*user:/.test(clean)) return true
  return false
}

function isReliableEvent(event: CustomChatEvent): boolean {
  if (shouldSuppressCustomChatEvent(event)) return false
  const text = compactText(event.text)
  if (isNoiseEventText(text)) return false
  if (event.source === 'dom' && displayName(event) === '匿名' && !event.uid && !event.avatarUrl && text.length <= 2)
    return false
  return true
}

function usefulBadgeText(raw: string, uname: string): string | null {
  const level = parseBadgeLevel(raw)
  const text =
    level === null
      ? compactText(raw)
          .replace(/^粉丝牌[:：]?/, '')
          .replace(/^荣耀[:：]?/, '')
          .replace(/^用户等级[:：]?/, '')
      : formatBadgeLevel(level)
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

function shouldShowUserLevelBadge(message: CustomChatEvent): boolean {
  return message.kind === 'danmaku'
}

function normalizedUserLevelBadge(message: CustomChatEvent, name = displayName(message)): string | null {
  if (!shouldShowUserLevelBadge(message)) return null
  for (const raw of message.badges) {
    const text = usefulBadgeText(raw, name)
    const level = text ? parseBadgeLevel(text) : parseBadgeLevel(raw)
    if (level !== null) return formatBadgeLevel(level)
  }
  return formatBadgeLevel(0)
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
  const userLevelBadge = normalizedUserLevelBadge(message, name)
  const maxOtherBadges = userLevelBadge ? 1 : 2
  for (const raw of message.badges) {
    const text = usefulBadgeText(raw, name)
    if (!text) continue
    if (parseBadgeLevel(text) !== null) continue
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
    if (normalized.length >= maxOtherBadges) break
  }
  if (userLevelBadge && !normalized.includes(userLevelBadge)) normalized.push(userLevelBadge)
  return normalized
}

function guardLevel(message: CustomChatEvent): string | null {
  const value = `${message.text} ${message.badges.join(' ')} ${message.rawCmd ?? ''}`
  if (/总督|GUARD\s*1|舰队\s*1|privilege[_-]?type["':\s]*1/i.test(value)) return '1'
  if (/提督|GUARD\s*2|舰队\s*2|privilege[_-]?type["':\s]*2/i.test(value)) return '2'
  if (/舰长|GUARD\s*3|舰队\s*3|privilege[_-]?type["':\s]*3/i.test(value)) return '3'
  return null
}

function cardType(message: CustomChatEvent): 'gift' | 'superchat' | 'guard' | 'redpacket' | 'lottery' | null {
  if (message.kind === 'superchat') return 'superchat'
  if (message.kind === 'gift') return 'gift'
  if (message.kind === 'guard') return 'guard'
  if (message.kind === 'redpacket') return 'redpacket'
  if (message.kind === 'lottery') return 'lottery'
  return null
}

function cardTitle(
  type: 'gift' | 'superchat' | 'guard' | 'redpacket' | 'lottery',
  message: CustomChatEvent,
  guard: string | null
): string {
  if (type === 'superchat') return message.amount ? `醒目留言 ¥${message.amount}` : '醒目留言'
  if (type === 'gift') return message.amount ? `礼物 ¥${Math.round(message.amount / 1000)}` : '礼物事件'
  if (type === 'redpacket') return '红包事件'
  if (type === 'lottery') return '天选时刻'
  if (guard === '1') return '总督事件'
  if (guard === '2') return '提督事件'
  return '舰长事件'
}

function cardMark(type: 'gift' | 'superchat' | 'guard' | 'redpacket' | 'lottery', guard: string | null): string {
  if (type === 'superchat') return 'SC'
  if (type === 'gift') return '礼物'
  if (type === 'redpacket') return '红包'
  if (type === 'lottery') return '天选'
  if (guard === '1') return '总督'
  if (guard === '2') return '提督'
  return '舰长'
}

function formatAmount(message: CustomChatEvent, card: NonNullable<ReturnType<typeof cardType>>): string {
  if (!message.amount) return ''
  if (card === 'gift' || card === 'guard') return formatMilliyuanAmount(message.amount)
  if (card === 'gift' || card === 'guard') return `¥${Math.round(message.amount / 1000)}`
  return `¥${message.amount}`
}

function cardFields(
  message: CustomChatEvent,
  card: NonNullable<ReturnType<typeof cardType>>,
  guard: string | null
): CustomChatField[] {
  const fields = message.fields?.filter(field => field.value) ?? []
  if (fields.length > 0) return fields

  const fallback: CustomChatField[] = []
  const amount = formatAmount(message, card)
  if (card === 'superchat' && amount) fallback.push({ key: 'sc-price', label: '金额', value: amount, kind: 'money' })
  if (card === 'gift') {
    const giftMatch = message.text.match(/(.+?)\s*x\s*(\d+)/i)
    if (giftMatch?.[1])
      fallback.push({
        key: 'gift-name',
        label: '礼物',
        value: giftMatch[1].replace(/^.*?(投喂|赠送|送出)\s*/, ''),
        kind: 'text',
      })
    if (giftMatch?.[2]) fallback.push({ key: 'gift-count', label: '数量', value: `x${giftMatch[2]}`, kind: 'count' })
    if (amount) fallback.push({ key: 'gift-price', label: '金额', value: amount, kind: 'money' })
  }
  if (card === 'guard') {
    const level = guard === '1' ? '总督' : guard === '2' ? '提督' : '舰长'
    fallback.push({ key: 'guard-level', label: '等级', value: level, kind: 'level' })
    const month = message.text.match(/x\s*(\d+)/i)?.[1]
    if (month) fallback.push({ key: 'guard-months', label: '月份', value: `${month}个月`, kind: 'duration' })
    if (amount) fallback.push({ key: 'guard-price', label: '金额', value: amount, kind: 'money' })
  }
  return fallback
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
  addRootEventListener(img, 'error', () => img.replaceWith(fallback), { once: true })
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
    if (label.includes('avatar') || label.includes('face') || label.includes('head') || label.includes('头像'))
      return src
  }
  return undefined
}

function nativeKind(node: HTMLElement, text: string): CustomChatKind | null {
  const signal = `${node.className} ${text}`
  if (/super[-_ ]?chat|superchat|醒目留言|醒目|￥|¥|\bSC\b/i.test(signal)) return 'superchat'
  if (/舰长|提督|总督|大航海|guard|privilege|开通|续费/i.test(signal)) return 'guard'
  if (/红包|red[-_ ]?envelop/i.test(signal)) return 'redpacket'
  if (/天选|lottery|抽奖/i.test(signal)) return 'lottery'
  if (/关注|follow/i.test(signal)) return 'follow'
  if (/点赞|like/i.test(signal)) return 'like'
  if (/分享|share/i.test(signal)) return 'share'
  if (/gift|礼物|赠送|投喂|送出|小花花|辣条|电池|x\s*\d+/i.test(signal)) return 'gift'
  return null
}

function nativeBadges(node: HTMLElement, text: string, uname: string): string[] {
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
  const giftMatch = kind === 'gift' ? text.match(/([\p{Script=Han}\w·・ぁ-んァ-ンー\s]+?)\s*x\s*(\d+)/iu) : null
  const fields: CustomChatField[] = []
  if (kind === 'gift' && giftMatch) {
    fields.push({ key: 'gift-name', label: '礼物', value: compactText(giftMatch[1]), kind: 'text' })
    fields.push({ key: 'gift-count', label: '数量', value: `x${giftMatch[2]}`, kind: 'count' })
  }
  if (kind === 'guard') {
    const guard = /总督/.test(text) ? '总督' : /提督/.test(text) ? '提督' : '舰长'
    fields.push({ key: 'guard-level', label: '等级', value: guard, kind: 'level' })
    const month = text.match(/(\d+)\s*(个月|月)/)?.[1]
    if (month) fields.push({ key: 'guard-months', label: '月份', value: `${month}个月`, kind: 'duration' })
  }
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
    fields,
  }
}

function recordNativeHealth(parsed: boolean): void {
  const now = Date.now()
  nativeHealthSamples.push({ ts: now, parsed })
  while (nativeHealthSamples.length > 0 && now - nativeHealthSamples[0].ts > NATIVE_HEALTH_WINDOW) {
    nativeHealthSamples.shift()
  }
  const parsedCount = nativeHealthSamples.filter(sample => sample.parsed).length
  const unhealthy = nativeHealthSamples.length >= NATIVE_HEALTH_MIN_SCANS && parsedCount <= NATIVE_HEALTH_MAX_EVENTS
  if (nativeDomWarning === unhealthy) return
  nativeDomWarning = unhealthy
  updateWsStatus(currentWsStatus)
}

function kindVisible(kind: CustomChatKind): boolean {
  if (kind === 'danmaku') return customChatShowDanmaku.value
  if (kind === 'gift') return customChatShowGift.value
  if (kind === 'superchat') return customChatShowSuperchat.value
  if (kind === 'guard' || kind === 'enter' || kind === 'follow' || kind === 'like' || kind === 'share')
    return customChatShowEnter.value
  if (kind === 'redpacket' || kind === 'lottery' || kind === 'notice' || kind === 'system')
    return customChatShowNotice.value
  return true
}

function messageMatchesSearch(message: CustomChatEvent): boolean {
  return messageMatchesCustomChatSearch(message, searchQuery, kindVisible)
}

function searchHint(): string {
  return customChatSearchHint(searchQuery)
}

function isFollowing(): boolean {
  return followMode === 'following'
}

function renderedMessages(): CustomChatEvent[] {
  return frozenSnapshot?.messages ?? visibleMessages
}

function renderedRowHeights(): Map<string, number> {
  return frozenSnapshot?.rowHeights ?? rowHeights
}

function snapshotFromLive(scrollTop = listEl?.scrollTop ?? 0): FrozenSnapshot {
  return {
    messages: [...visibleMessages],
    rowHeights: new Map(rowHeights),
    scrollTop,
  }
}

function syncFrozenSnapshotFromLive(): void {
  if (isFollowing()) return
  frozenSnapshot = snapshotFromLive(listEl?.scrollTop ?? frozenSnapshot?.scrollTop ?? 0)
}

function enterFrozenMode(mode: Exclude<ChatFollowMode, 'following'>): void {
  if (isFollowing()) {
    frozenSnapshot = snapshotFromLive()
  } else if (frozenSnapshot && listEl) {
    frozenSnapshot.scrollTop = listEl.scrollTop
  }
  followMode = mode
  updateUnread()
}

function resumeFollowing(behavior: ScrollBehavior = 'smooth'): void {
  followMode = 'following'
  frozenSnapshot = null
  unread = 0
  updateUnread()
  scrollToBottom(behavior)
}

function renderedMessageCount(): number {
  return renderedMessages().length
}

function updateEmptyState(): void {
  if (!listEl || !emptyEl) return
  const visibleCount = renderedMessageCount()
  if (visibleCount > 0) {
    emptyEl.remove()
    return
  }
  const trimmedQuery = searchQuery.trim()
  const hint = searchHint()
  if (trimmedQuery) {
    emptyEl.textContent = hint || `没有找到匹配“${trimmedQuery}”的消息`
  } else if (hasClearedMessages) {
    emptyEl.textContent = '已清屏，新的弹幕会继续出现在这里'
  } else {
    emptyEl.textContent = '还没有收到消息'
  }
  if (!emptyEl.isConnected) listEl.append(emptyEl)
}

function wsStatusLabel(status: CustomChatWsStatus): string {
  if (nativeDomWarning && (status === 'error' || status === 'closed' || status === 'off'))
    return '页面兜底疑似失效，B站页面结构可能变了'
  if (status === 'connecting') return '实时事件源连接中'
  if (status === 'live') return '实时事件源正常'
  if (status === 'error') return '直连异常，使用页面兜底，可能漏消息'
  if (status === 'closed') return '直连已断开，使用页面兜底，可能漏消息'
  return '实时事件源关闭'
}

function updateWsStatus(status: CustomChatWsStatus): void {
  currentWsStatus = status
  if (!wsStatusEl) return
  wsStatusEl.textContent = wsStatusLabel(status)
  wsStatusEl.dataset.status =
    nativeDomWarning && (status === 'error' || status === 'closed' || status === 'off')
      ? 'dom-warning'
      : status === 'error' || status === 'closed'
        ? 'fallback'
        : status
}

function updateMatchCount(): void {
  if (!matchCountEl) return
  if (!searchQuery.trim()) {
    matchCountEl.textContent = ''
    matchCountEl.style.display = 'none'
    return
  }
  const hint = searchHint()
  if (hint) {
    matchCountEl.textContent = hint
    matchCountEl.style.display = ''
    return
  }
  const count = messages.filter(messageMatchesSearch).length
  matchCountEl.textContent = `${count}/${messages.length}`
  matchCountEl.style.display = ''
}

function updateUnread(): void {
  if (pauseBtn) {
    const frozen = !isFollowing()
    pauseBtn.textContent = frozen ? '恢复跟随' : '暂停'
    pauseBtn.title = frozen ? '恢复自动跟随并跳到底部' : '暂停自动跟随，停留在当前聊天位置'
    pauseBtn.setAttribute('aria-pressed', frozen ? 'true' : 'false')
  }
  if (unreadBtn) {
    if (isFollowing()) {
      unreadBtn.textContent = ''
      unreadBtn.style.display = 'none'
      unreadBtn.dataset.frozen = 'false'
    } else {
      unreadBtn.textContent =
        unread > 0
          ? `${unread} 条新消息，点击回到底部`
          : followMode === 'frozenByButton'
            ? '已手动暂停跟随'
            : '正在浏览历史'
      unreadBtn.title = '恢复自动跟随并跳到底部'
      unreadBtn.style.display = ''
      unreadBtn.dataset.frozen = 'true'
    }
  }
  updatePerfDebug()
}

function isNearBottom(): boolean {
  if (!listEl) return true
  return virtualContentHeight() - listEl.scrollTop - listEl.clientHeight < 80
}

function syncAutoFollowFromScroll(): void {
  if (!listEl) return
  if (frozenSnapshot) frozenSnapshot.scrollTop = listEl.scrollTop
  const nearBottom = isNearBottom()
  if (isFollowing()) {
    if (!nearBottom) enterFrozenMode('frozenByScroll')
    return
  }
  if (followMode === 'frozenByScroll' && nearBottom) {
    resumeFollowing()
    return
  }
  updateUnread()
}

function scrollToBottom(behavior: ScrollBehavior = 'auto'): void {
  if (!listEl) return
  const top = Math.max(0, virtualContentHeight() - listEl.clientHeight)
  listEl.scrollTo({ top, behavior })
  if (behavior === 'auto') renderVirtualWindow()
}

function normalizeWheelDelta(event: WheelEvent): number {
  const unit =
    event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 18 : event.deltaMode === WheelEvent.DOM_DELTA_PAGE ? 180 : 1
  const delta = event.deltaY * unit
  if (!Number.isFinite(delta) || delta === 0) return 0
  return Math.max(-140, Math.min(140, delta))
}

function scrollListByWheel(event: WheelEvent): void {
  if (!listEl || renderedMessages().length === 0) return
  const delta = normalizeWheelDelta(event)
  if (delta === 0) return
  event.preventDefault()
  const maxTop = Math.max(0, virtualContentHeight() - listEl.clientHeight)
  const nextTop = Math.max(0, Math.min(maxTop, listEl.scrollTop + delta))
  if (Math.abs(nextTop - listEl.scrollTop) < 0.5) return
  listEl.scrollTop = nextTop
  renderVirtualWindow()
  syncAutoFollowFromScroll()
}

function pruneMessages(): void {
  while (messages.length > MAX_MESSAGES) {
    const removed = messages.shift()
    if (removed) {
      const key = messageKey(removed)
      messageKeys.delete(key)
      rowHeights.delete(key)
    }
  }
  updatePerfDebug()
}

function estimatedRowHeight(message: CustomChatEvent): number {
  const card = cardType(message)
  const priority = customChatPriority(message)
  if (priority === 'lite') return LITE_ROW_HEIGHT
  if (card === 'gift' && !message.amount) return COMPACT_CARD_ROW_HEIGHT
  if (priority === 'critical') return CRITICAL_CARD_ROW_HEIGHT
  if (card) return CARD_ROW_HEIGHT
  return DEFAULT_ROW_HEIGHT + Math.max(0, Math.ceil(message.text.length / 34) - 1) * 18
}

function rowHeight(message: CustomChatEvent): number {
  return renderedRowHeights().get(messageKey(message)) ?? estimatedRowHeight(message)
}

function virtualContentHeight(end = renderedMessages().length): number {
  const items = renderedMessages()
  let height = 0
  for (let index = 0; index < end; index++) height += rowHeight(items[index])
  return height
}

function setSpacerHeight(spacer: HTMLElement | null, height: number): void {
  if (!spacer) return
  spacer.style.height = `${Math.max(0, Math.round(height))}px`
}

function refreshVisibleMessages(): void {
  visibleMessages = visibleRenderMessages(messages, messageMatchesSearch)
}

function createMessageRow(message: CustomChatEvent, animate = false, virtualIndex = 0): HTMLElement {
  const row = document.createElement('div')
  const priority = customChatPriority(message)
  row.className = animate ? 'lc-chat-message lc-chat-peek' : 'lc-chat-message'
  row.dataset.uid = message.uid ?? ''
  row.dataset.kind = message.kind
  row.dataset.source = message.source
  row.dataset.user = displayName(message)
  row.dataset.priority = priority
  row.dataset.virtualIndex = String(virtualIndex)
  row.tabIndex = 0
  const guard = guardLevel(message)
  const card = cardType(message)
  if (priority === 'lite') row.classList.add('lc-chat-lite-event')
  if (card) {
    row.classList.add('lc-chat-card-event')
    row.dataset.card = card
  }
  if (card === 'gift' && !message.amount) row.classList.add('lc-chat-card-compact')
  if (guard) row.dataset.guard = guard

  addRootEventListener(row, 'click', e => {
    if (!customChatPerfDebug.value) return
    const target = e.target
    if (target instanceof HTMLElement && target.closest('button')) return
    showEventDebug(message, row, card, guard)
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
    const badgeType = customChatBadgeType(badgeText)
    const badge = document.createElement('span')
    badge.className = `lc-chat-badge lc-chat-medal lc-chat-badge-${badgeType}`
    badge.dataset.badge = badgeText
    badge.dataset.badgeType = badgeType
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
  actions.append(
    makeButton('lc-chat-action', '复制', '复制事件文本', () => void copyText(message.sendText ?? message.text))
  )

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

    const fields = cardFields(message, card, guard).slice(0, 3)
    const fieldsEl = document.createElement('div')
    fieldsEl.className = 'lc-chat-card-fields'
    for (const field of fields) {
      const fieldEl = document.createElement('span')
      fieldEl.className = 'lc-chat-card-field'
      fieldEl.dataset.field = field.key
      if (field.kind) fieldEl.dataset.kind = field.kind
      const label = document.createElement('span')
      label.className = 'lc-chat-card-field-label'
      setText(label, field.label)
      const value = document.createElement('span')
      value.className = 'lc-chat-card-field-value'
      setText(value, field.value)
      fieldEl.append(label, value)
      fieldsEl.append(fieldEl)
    }

    head.append(title, mark)
    text.append(head)
    if (fields.length > 0) text.append(fieldsEl)
    text.append(content)
  } else {
    setText(text, message.text)
  }
  body.append(meta, text)

  row.append(avatarEl, body, actions)
  return row
}

function virtualRange(): { start: number; end: number; top: number; bottom: number; total: number } {
  const items = renderedMessages()
  const total = virtualContentHeight()
  if (!listEl || items.length === 0) return { start: 0, end: 0, top: 0, bottom: 0, total }
  const viewportTop = listEl.scrollTop
  const viewportBottom = viewportTop + Math.max(listEl.clientHeight, 1)
  let start = 0
  let top = 0
  while (start < items.length && top + rowHeight(items[start]) < viewportTop) {
    top += rowHeight(items[start])
    start++
  }
  start = Math.max(0, start - VIRTUAL_OVERSCAN)
  top = virtualContentHeight(start)
  let end = start
  let bottom = top
  while (end < items.length && bottom < viewportBottom) {
    bottom += rowHeight(items[end])
    end++
  }
  end = Math.min(items.length, end + VIRTUAL_OVERSCAN)
  bottom = virtualContentHeight(end)
  return { start, end, top, bottom, total }
}

function measureRenderedRows(): void {
  if (!virtualItemsEl) return
  const items = renderedMessages()
  const heights = renderedRowHeights()
  let changed = false
  for (const row of virtualItemsEl.querySelectorAll<HTMLElement>('.lc-chat-message')) {
    const index = Number(row.dataset.virtualIndex)
    const message = items[index]
    if (!message) continue
    const measured = Math.ceil(row.getBoundingClientRect().height)
    if (measured <= 0) continue
    const key = messageKey(message)
    if (Math.abs((heights.get(key) ?? 0) - measured) > 2) {
      heights.set(key, measured)
      changed = true
    }
  }
  if (changed) {
    const range = virtualRange()
    setSpacerHeight(virtualTopSpacer, range.top)
    setSpacerHeight(virtualBottomSpacer, range.total - range.bottom)
  }
}

function renderVirtualWindow(animateKeys = new Set<string>()): void {
  if (!listEl || !virtualItemsEl) return
  const items = renderedMessages()
  if (items.length === 0) {
    virtualItemsEl.replaceChildren()
    setSpacerHeight(virtualTopSpacer, 0)
    setSpacerHeight(virtualBottomSpacer, 0)
    updateEmptyState()
    updatePerfDebug()
    return
  }

  emptyEl?.remove()
  const activeKey =
    document.activeElement instanceof HTMLElement
      ? document.activeElement.closest<HTMLElement>('.lc-chat-message')?.dataset.key
      : undefined
  const range = virtualRange()
  const rows: HTMLElement[] = []
  for (let index = range.start; index < range.end; index++) {
    const message = items[index]
    const key = messageKey(message)
    const row = createMessageRow(message, animateKeys.has(key), index)
    row.dataset.key = key
    rows.push(row)
  }
  virtualItemsEl.replaceChildren(...rows)
  setSpacerHeight(virtualTopSpacer, range.top)
  setSpacerHeight(virtualBottomSpacer, range.total - range.bottom)
  if (activeKey) {
    for (const row of virtualItemsEl.querySelectorAll<HTMLElement>('.lc-chat-message')) {
      if (row.dataset.key === activeKey) {
        row.focus()
        break
      }
    }
  }
  measureRenderedRows()
  updateEmptyState()
  updatePerfDebug()
}

function scrollToVirtualIndex(index: number): void {
  const items = renderedMessages()
  if (!listEl || items.length === 0) return
  const clamped = Math.max(0, Math.min(items.length - 1, index))
  const top = virtualContentHeight(clamped)
  listEl.scrollTo({ top: Math.max(0, top - 10), behavior: 'auto' })
  renderVirtualWindow()
  virtualItemsEl?.querySelector<HTMLElement>(`.lc-chat-message[data-virtual-index="${clamped}"]`)?.focus()
}

function clearMessages(): void {
  messages.length = 0
  messageKeys.clear()
  renderQueue.length = 0
  visibleMessages = []
  rowHeights.clear()
  unread = 0
  followMode = 'following'
  frozenSnapshot = null
  hasClearedMessages = true
  virtualItemsEl?.replaceChildren()
  setSpacerHeight(virtualTopSpacer, 0)
  setSpacerHeight(virtualBottomSpacer, 0)
  updateUnread()
  updateMatchCount()
  updateEmptyState()
}

function restoreFrozenScrollPosition(): void {
  if (!listEl || !frozenSnapshot) return
  const maxTop = Math.max(0, virtualContentHeight() - listEl.clientHeight)
  const top = Math.max(0, Math.min(maxTop, frozenSnapshot.scrollTop))
  if (Math.abs(top - listEl.scrollTop) > 0.5) listEl.scrollTop = top
  frozenSnapshot.scrollTop = top
}

function rerenderMessages(options: { refreshFrozenSnapshot?: boolean } = {}): void {
  if (!listEl || !virtualItemsEl) return
  pruneMessages()
  refreshVisibleMessages()
  if (!isFollowing()) {
    if (options.refreshFrozenSnapshot || !frozenSnapshot) syncFrozenSnapshotFromLive()
    restoreFrozenScrollPosition()
  }
  renderVirtualWindow()
  updateMatchCount()
  updateEmptyState()
  if (isFollowing()) scrollToBottom()
}

function scheduleRerenderMessages(options: { refreshFrozenSnapshot?: boolean } = {}): void {
  rerenderToken++
  const token = rerenderToken
  if (rerenderFrame !== null) window.cancelAnimationFrame(rerenderFrame)
  rerenderFrame = window.requestAnimationFrame(() => {
    rerenderFrame = null
    if (!listEl || token !== rerenderToken) return
    refreshVisibleMessages()
    if (!isFollowing()) {
      if (options.refreshFrozenSnapshot || !frozenSnapshot) syncFrozenSnapshotFromLive()
      restoreFrozenScrollPosition()
    }
    renderVirtualWindow()
    updateMatchCount()
    updatePerfDebug()
    updateEmptyState()
    if (isFollowing()) scrollToBottom()
  })
}

function flushRenderQueue(): void {
  renderFrame = null
  if (!listEl || renderQueue.length === 0) return
  const batch = takeRenderBatch(renderQueue)
  lastBatchSize = batch.length
  const shouldStickToBottom = isFollowing() && isNearBottom()
  const animate = isFollowing() && shouldAnimateRenderBatch(batch.length)
  const animateKeys = new Set<string>()
  let matched = 0
  for (const event of batch) {
    if (!messageKeys.has(messageKey(event))) continue
    if (!messageMatchesSearch(event)) continue
    matched++
    if (animate) animateKeys.add(messageKey(event))
  }
  refreshVisibleMessages()
  if (isFollowing()) renderVirtualWindow(animateKeys)
  if (renderQueue.length > 0) renderFrame = window.requestAnimationFrame(flushRenderQueue)
  if (matched === 0) {
    updateMatchCount()
    updatePerfDebug()
    updateEmptyState()
    return
  }
  pruneMessages()
  if (!shouldStickToBottom) {
    if (isFollowing()) enterFrozenMode('frozenByScroll')
    unread += matched
    updateUnread()
  } else {
    scrollToBottom()
  }
  updateMatchCount()
  updatePerfDebug()
  updateEmptyState()
}

function scheduleRender(event: CustomChatEvent): void {
  renderQueue.push(event)
  trimRenderQueue(renderQueue)
  updatePerfDebug()
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
    fasongText.value = ''
    updateCount()
  }
  sending = false
  if (sendBtn) sendBtn.disabled = false
}

function updateCount(): void {
  if (countEl && textarea) countEl.textContent = String(textarea.value.length)
}

function syncComposerFromStore(): void {
  if (!textarea || textarea.value === fasongText.value) return
  textarea.value = fasongText.value
  updateCount()
}

function updateNativeVisibility(): void {
  const mounted = !!root?.isConnected && !!root.querySelector('.lc-chat-composer')
  document.documentElement.classList.toggle('lc-custom-chat-mounted', mounted)
  document.documentElement.classList.toggle('lc-custom-chat-root-outside-history', mounted && rootOutsideHistory)
  document.documentElement.classList.toggle('lc-custom-chat-hide-native', mounted && customChatHideNative.value)
}

function appendDebugRow(parent: HTMLElement, key: string, value: string): void {
  const row = document.createElement('div')
  row.className = 'lc-chat-debug-row'
  const keyEl = document.createElement('span')
  keyEl.className = 'lc-chat-debug-key'
  setText(keyEl, key)
  const valueEl = document.createElement('span')
  valueEl.className = 'lc-chat-debug-value'
  setText(valueEl, value || '-')
  row.append(keyEl, valueEl)
  parent.append(row)
}

function showEventDebug(
  message: CustomChatEvent,
  row: HTMLElement,
  card: ReturnType<typeof cardType>,
  guard: string | null
): void {
  if (!root || !debugEl) return
  root.querySelectorAll('.lc-chat-message.lc-chat-selected').forEach(el => {
    if (el !== row) el.classList.remove('lc-chat-selected')
  })
  row.classList.add('lc-chat-selected')
  root.dataset.inspecting = 'true'
  debugEl.replaceChildren()

  const head = document.createElement('div')
  head.className = 'lc-chat-debug-head'
  const title = document.createElement('span')
  title.className = 'lc-chat-debug-title'
  setText(title, '事件调试')
  const close = makeButton('lc-chat-debug-close', '关闭', '关闭事件调试', () => {
    root?.removeAttribute('data-inspecting')
    row.classList.remove('lc-chat-selected')
    debugEl?.replaceChildren()
  })
  head.append(title, close)
  debugEl.append(head)
  appendDebugRow(debugEl, 'id', message.id)
  appendDebugRow(debugEl, 'data-kind', message.kind)
  appendDebugRow(debugEl, 'data-card', card ?? '')
  appendDebugRow(debugEl, 'data-guard', guard ?? '')
  appendDebugRow(debugEl, 'priority', customChatPriority(message))
  appendDebugRow(debugEl, 'source', message.source)
  appendDebugRow(debugEl, 'uid', message.uid ?? '')
  appendDebugRow(debugEl, 'raw cmd', message.rawCmd ?? '')
  appendDebugRow(debugEl, 'fields', (message.fields ?? []).map(field => `${field.key}=${field.value}`).join(' | '))
}

function createRoot(): HTMLElement {
  const panel = document.createElement('section')
  panel.id = ROOT_ID
  panel.dataset.theme = customChatTheme.value
  panel.dataset.debug = customChatPerfDebug.value ? 'true' : 'false'

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

  pauseBtn = makeButton('lc-chat-pill', '暂停', '暂停自动跟随', () => {
    if (isFollowing()) {
      enterFrozenMode('frozenByButton')
      return
    }
    resumeFollowing()
  })
  unreadBtn = makeButton('lc-chat-pill lc-chat-unread', '', '恢复自动跟随并跳到底部', () => {
    resumeFollowing()
  })
  unreadBtn.style.display = 'none'
  matchCountEl = document.createElement('span')
  matchCountEl.className = 'lc-chat-hint'
  matchCountEl.style.display = 'none'
  wsStatusEl = document.createElement('span')
  wsStatusEl.className = 'lc-chat-ws-status'
  updateWsStatus(currentWsStatus)
  perfEl = document.createElement('div')
  perfEl.className = 'lc-chat-perf'
  updatePerfDebug()

  searchInput = document.createElement('input')
  searchInput.type = 'search'
  searchInput.className = 'lc-chat-search'
  searchInput.placeholder = '搜索 user:名 kind:gift -词'
  searchInput.value = searchQuery
  addRootEventListener(searchInput, 'input', () => {
    searchQuery = searchInput?.value ?? ''
    unread = 0
    scheduleRerenderMessages({ refreshFrozenSnapshot: true })
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
      scheduleRerenderMessages({ refreshFrozenSnapshot: true })
    })
    btn.setAttribute('aria-pressed', signal.value ? 'true' : 'false')
    filterbar.append(btn)
  }

  const searchRow = document.createElement('div')
  searchRow.className = 'lc-chat-menu-row'
  searchRow.append(searchInput, matchCountEl)

  const controlRow = document.createElement('div')
  controlRow.className = 'lc-chat-menu-row'
  controlRow.append(pauseBtn, unreadBtn, clearBtn)

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

  menu.append(searchRow, controlRow, filterRow, statusRow, perfEl)
  toolbar.append(spacer, title, menuBtn)

  debugEl = document.createElement('div')
  debugEl.className = 'lc-chat-event-debug'

  listEl = document.createElement('div')
  listEl.className = 'lc-chat-list'
  listEl.tabIndex = 0
  listEl.setAttribute('aria-label', '直播聊天消息')
  virtualTopSpacer = document.createElement('div')
  virtualTopSpacer.className = 'lc-chat-virtual-spacer'
  virtualItemsEl = document.createElement('div')
  virtualItemsEl.className = 'lc-chat-virtual-items'
  virtualBottomSpacer = document.createElement('div')
  virtualBottomSpacer.className = 'lc-chat-virtual-spacer'
  emptyEl = document.createElement('div')
  emptyEl.className = 'lc-chat-empty'
  listEl.append(virtualTopSpacer, virtualItemsEl, virtualBottomSpacer)
  addRootEventListener(listEl, 'wheel', scrollListByWheel, { passive: false })
  addRootEventListener(
    listEl,
    'scroll',
    () => {
      renderVirtualWindow()
      syncAutoFollowFromScroll()
    },
    { passive: true }
  )
  addRootEventListener(listEl, 'keydown', e => {
    if (!['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) return
    const items = renderedMessages()
    if (items.length === 0) return
    e.preventDefault()
    const active =
      document.activeElement instanceof HTMLElement ? document.activeElement.closest('.lc-chat-message') : null
    const index = active instanceof HTMLElement ? Number(active.dataset.virtualIndex) : -1
    const nextIndex =
      e.key === 'Home'
        ? 0
        : e.key === 'End'
          ? items.length - 1
          : Math.max(0, Math.min(items.length - 1, index + (e.key === 'ArrowUp' ? -1 : 1)))
    scrollToVirtualIndex(nextIndex)
  })

  const composer = document.createElement('div')
  composer.className = 'lc-chat-composer'

  const inputWrap = document.createElement('div')
  inputWrap.className = 'lc-chat-input-wrap'

  textarea = document.createElement('textarea')
  textarea.value = fasongText.value
  textarea.placeholder = '输入弹幕... Enter 发送，Shift+Enter 换行'
  addRootEventListener(textarea, 'input', () => {
    fasongText.value = textarea?.value ?? ''
    updateCount()
  })
  addRootEventListener(textarea, 'keydown', e => {
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
  panel.append(toolbar, menu, debugEl, listEl, composer)
  updateUnread()
  updateEmptyState()
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
  abortRootEventListeners()
  root?.remove()
  const historyPanel = container.closest<HTMLElement>('.chat-history-panel')
  const host = historyPanel?.parentElement ?? container.parentElement
  if (!host) return
  root = createRoot()
  rootOutsideHistory = !!historyPanel && host !== historyPanel
  root.dataset.theme = customChatTheme.value
  host.appendChild(root)
  updateNativeVisibility()
  observeNativeEvents(container)
  rerenderMessages()
}

function observeNativeEvents(container: HTMLElement): void {
  nativeEventObserver?.disconnect()
  pendingNativeNodes.clear()
  nativeHealthSamples.length = 0
  nativeDomWarning = false
  updateWsStatus(currentWsStatus)
  if (nativeScanFrame !== null) {
    window.cancelAnimationFrame(nativeScanFrame)
    nativeScanFrame = null
  }
  const isCandidate = (node: HTMLElement): boolean => {
    if (node.closest(`#${ROOT_ID}`)) return false
    if (node.classList.contains('danmaku-item')) return false
    return node.matches(NATIVE_EVENT_SELECTOR) || !!node.querySelector(NATIVE_EVENT_SELECTOR)
  }
  const scan = (node: HTMLElement): void => {
    if (seenNativeNodes.has(node)) return
    seenNativeNodes.add(node)
    const event = parseNativeEvent(node)
    let parsed = false
    if (event) emitCustomChatEvent(event)
    if (event) parsed = true
    for (const child of node.querySelectorAll<HTMLElement>(NATIVE_EVENT_SELECTOR)) {
      if (seenNativeNodes.has(child) || child.classList.contains('danmaku-item')) continue
      seenNativeNodes.add(child)
      const childEvent = parseNativeEvent(child)
      if (childEvent) emitCustomChatEvent(childEvent)
      if (childEvent) parsed = true
    }
    recordNativeHealth(parsed)
  }
  const flushScan = (): void => {
    nativeScanFrame = null
    let count = 0
    for (const node of pendingNativeNodes) {
      pendingNativeNodes.delete(node)
      if (node.isConnected) scan(node)
      count++
      if (count >= MAX_NATIVE_SCAN_BATCH) break
    }
    if (pendingNativeNodes.size > 0) nativeScanFrame = window.requestAnimationFrame(flushScan)
  }
  const queueScan = (node: HTMLElement): void => {
    if (!isCandidate(node)) return
    pendingNativeNodes.add(node)
    if (nativeScanFrame === null) nativeScanFrame = window.requestAnimationFrame(flushScan)
  }
  const existing = Array.from(container.querySelectorAll<HTMLElement>(NATIVE_EVENT_SELECTOR))
    .filter(node => !node.classList.contains('danmaku-item'))
    .slice(-MAX_NATIVE_INITIAL_SCAN)
  for (const node of existing) queueScan(node)
  nativeEventObserver = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (node instanceof HTMLElement) queueScan(node)
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
  const duplicateIndex = messageIndexByEvent(event)
  if (duplicateIndex >= 0) {
    const merged = mergeDuplicateEvent(messages[duplicateIndex], event)
    if (merged) replaceMessage(duplicateIndex, merged)
    return
  }
  const key = messageKey(event)
  if (messageKeys.has(key)) return
  if (!rememberEvent(event)) return
  hasClearedMessages = false
  recordEventStats(event)
  messages.push(event)
  messageKeys.add(key)
  pruneMessages()
  scheduleRender(event)
}

export function startCustomChatDom(): void {
  if (unsubscribeDom) return

  ensureStyles()
  disposeSettings = signalEffect(() => {
    if (root) root.dataset.theme = customChatTheme.value
    if (root) root.dataset.debug = customChatPerfDebug.value ? 'true' : 'false'
    updateNativeVisibility()
    updatePerfDebug()
    ensureStyles()
  })
  disposeComposer = signalEffect(syncComposerFromStore)

  unsubscribeEvents = subscribeCustomChatEvents(addEvent)
  unsubscribeWsStatus = subscribeCustomChatWsStatus(updateWsStatus)
  unsubscribeDom = subscribeDanmaku({
    onAttach: mount,
    onMessage: addDomMessage,
    emitExisting: true,
  })
}

export function stopCustomChatDom(): void {
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
  if (disposeComposer) {
    disposeComposer()
    disposeComposer = null
  }
  abortRootEventListeners()
  nativeEventObserver?.disconnect()
  nativeEventObserver = null
  pendingNativeNodes.clear()
  if (nativeScanFrame !== null) {
    window.cancelAnimationFrame(nativeScanFrame)
    nativeScanFrame = null
  }
  document.documentElement.classList.remove('lc-custom-chat-hide-native')
  document.documentElement.classList.remove('lc-custom-chat-mounted')
  document.documentElement.classList.remove('lc-custom-chat-root-outside-history')
  root?.remove()
  root = null
  rootOutsideHistory = false
  styleEl?.remove()
  styleEl = null
  userStyleEl?.remove()
  userStyleEl = null
  listEl = null
  virtualTopSpacer = null
  virtualItemsEl = null
  virtualBottomSpacer = null
  pauseBtn = null
  unreadBtn = null
  textarea = null
  countEl = null
  searchInput = null
  matchCountEl = null
  wsStatusEl = null
  emptyEl = null
  perfEl = null
  debugEl = null
  messages.length = 0
  messageKeys.clear()
  renderQueue.length = 0
  visibleMessages = []
  rowHeights.clear()
  eventTicks.length = 0
  nativeHealthSamples.length = 0
  rerenderToken++
  sourceCounts.dom = 0
  sourceCounts.ws = 0
  sourceCounts.local = 0
  lastBatchSize = 0
  if (renderFrame !== null) {
    window.cancelAnimationFrame(renderFrame)
    renderFrame = null
  }
  if (rerenderFrame !== null) {
    window.cancelAnimationFrame(rerenderFrame)
    rerenderFrame = null
  }
  unread = 0
  followMode = 'following'
  frozenSnapshot = null
  sending = false
  searchQuery = ''
  hasClearedMessages = false
  currentWsStatus = 'off'
  nativeDomWarning = false
  recentEventKeys.clear()
}

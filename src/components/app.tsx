import { useEffect } from 'preact/hooks'

import { startAutoBlend, stopAutoBlend } from '../lib/auto-blend'
import { startCustomChat, stopCustomChat } from '../lib/custom-chat'
import { startDanmakuDirect, stopDanmakuDirect } from '../lib/danmaku-direct'
import { startLiveWsSource, stopLiveWsSource } from '../lib/live-ws-source'
import { loop } from '../lib/loop'
import { autoBlendEnabled, customChatUseWs, danmakuDirectMode, optimizeLayout } from '../lib/store'
import { Configurator } from './configurator'
import { ToggleButton } from './toggle-button'
import { AlertDialog } from './ui/alert-dialog'
import { UserNotice } from './user-notice'

export function App() {
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      #laplace-chatterbox-toggle,
      #laplace-chatterbox-dialog,
      #laplace-chatterbox-dialog * {
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
        font-size: 12px;
        letter-spacing: 0;
      }

      #laplace-chatterbox-toggle {
        appearance: none !important;
        border: 1px solid rgba(255, 255, 255, .42) !important;
        border-radius: 999px !important;
        min-height: 30px !important;
        padding: 0 12px !important;
        background: rgba(30, 30, 30, .78) !important;
        color: #fff !important;
        box-shadow: 0 10px 28px rgba(0, 0, 0, .22), inset 0 1px rgba(255, 255, 255, .22) !important;
        backdrop-filter: blur(18px) saturate(1.4);
        -webkit-backdrop-filter: blur(18px) saturate(1.4);
      }

      #laplace-chatterbox-dialog {
        color: #1d1d1f !important;
        background: rgba(248, 248, 250, .86) !important;
        border: 1px solid rgba(0, 0, 0, .08) !important;
        border-radius: 8px !important;
        box-shadow: 0 22px 60px rgba(0, 0, 0, .24), 0 1px 0 rgba(255,255,255,.72) inset !important;
        backdrop-filter: blur(26px) saturate(1.5);
        -webkit-backdrop-filter: blur(26px) saturate(1.5);
        scrollbar-width: thin;
      }

      #laplace-chatterbox-dialog .cb-scroll {
        padding: 8px !important;
      }

      #laplace-chatterbox-dialog details {
        margin: 0 0 5px !important;
        padding: 0 !important;
        border: 1px solid rgba(0, 0, 0, .08) !important;
        border-radius: 8px !important;
        background: rgba(252, 252, 253, .78) !important;
        box-shadow: 0 1px 0 rgba(255, 255, 255, .7) inset !important;
        overflow: hidden;
      }

      #laplace-chatterbox-dialog details[open] {
        background: rgba(255, 255, 255, .9) !important;
      }

      #laplace-chatterbox-dialog .cb-settings-accordion > .cb-section {
        margin: 0 !important;
        padding: 0 7px 7px !important;
        border: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        box-shadow: none !important;
      }

      #laplace-chatterbox-dialog .cb-settings-accordion[open] > .cb-section > .cb-heading,
      #laplace-chatterbox-dialog .cb-settings-accordion[open] > .cb-section > .cb-row:first-child > .cb-heading {
        display: none;
      }

      #laplace-chatterbox-dialog details > :not(summary):not(.cb-body) {
        margin-left: 10px;
        margin-right: 10px;
      }

      #laplace-chatterbox-dialog details > :last-child:not(summary) {
        margin-bottom: 10px;
      }

      #laplace-chatterbox-dialog summary {
        min-height: 30px;
        display: flex !important;
        align-items: center;
        gap: 6px;
        padding: 0 8px !important;
        color: #1d1d1f !important;
        list-style: none;
        font-weight: 650 !important;
        cursor: pointer;
        user-select: none;
      }

      #laplace-chatterbox-dialog summary::-webkit-details-marker {
        display: none;
      }

      #laplace-chatterbox-dialog summary::after {
        content: "⌄";
        margin-left: auto;
        color: #8e8e93;
        font-size: 13px;
        line-height: 1;
        transition: transform .18s ease;
      }

      #laplace-chatterbox-dialog details[open] > summary::after {
        transform: rotate(180deg);
      }

      #laplace-chatterbox-dialog button,
      #laplace-chatterbox-dialog select,
      #laplace-chatterbox-dialog input,
      #laplace-chatterbox-dialog textarea {
        outline: none !important;
        font: inherit;
      }

      #laplace-chatterbox-dialog button {
        appearance: none !important;
        min-height: 26px !important;
        border: 1px solid rgba(0, 0, 0, .08) !important;
        border-radius: 8px !important;
        background: rgba(255, 255, 255, .9) !important;
        color: #1d1d1f !important;
        padding: 3px 9px !important;
        cursor: pointer !important;
        font-weight: 560 !important;
        line-height: 1.3 !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, .05) !important;
      }

      #laplace-chatterbox-dialog button:hover {
        background: #fff !important;
        border-color: rgba(0, 0, 0, .14) !important;
      }

      #laplace-chatterbox-dialog button:active {
        transform: translateY(1px);
      }

      #laplace-chatterbox-dialog button:disabled,
      #laplace-chatterbox-dialog input:disabled,
      #laplace-chatterbox-dialog select:disabled {
        opacity: .46;
        cursor: not-allowed !important;
      }

      #laplace-chatterbox-dialog input[type="text"],
      #laplace-chatterbox-dialog input[type="password"],
      #laplace-chatterbox-dialog input[type="number"],
      #laplace-chatterbox-dialog select,
      #laplace-chatterbox-dialog textarea {
        border: 1px solid rgba(0, 0, 0, .08) !important;
        border-radius: 8px !important;
        background: rgba(255, 255, 255, .86) !important;
        color: #1d1d1f !important;
        padding: 5px 8px !important;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, .035) !important;
      }

      #laplace-chatterbox-dialog input[type="number"] {
        text-align: center;
        width: 64px !important;
        min-width: 64px !important;
      }

      #laplace-chatterbox-dialog textarea {
        line-height: 1.45 !important;
      }

      #laplace-chatterbox-dialog input:focus,
      #laplace-chatterbox-dialog select:focus,
      #laplace-chatterbox-dialog textarea:focus {
        border-color: #007aff !important;
        box-shadow: 0 0 0 3px rgba(0, 122, 255, .16), inset 0 1px 2px rgba(0, 0, 0, .03) !important;
      }

      #laplace-chatterbox-dialog input[type="checkbox"] {
        appearance: none !important;
        width: 30px !important;
        height: 18px !important;
        flex: 0 0 30px;
        border: none !important;
        border-radius: 999px !important;
        background: #d1d1d6 !important;
        padding: 0 !important;
        position: relative;
        cursor: pointer;
        box-shadow: inset 0 0 0 1px rgba(0, 0, 0, .04) !important;
        transition: background .18s ease;
      }

      #laplace-chatterbox-dialog input[type="checkbox"]::after {
        content: "";
        position: absolute;
        top: 2px;
        left: 2px;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: #fff;
        box-shadow: 0 1px 2px rgba(0,0,0,.24);
        transition: transform .18s ease;
      }

      #laplace-chatterbox-dialog input[type="checkbox"]:checked {
        background: #34c759 !important;
      }

      #laplace-chatterbox-dialog input[type="checkbox"]:checked::after {
        transform: translateX(12px);
      }

      #laplace-chatterbox-dialog a {
        color: #007aff !important;
        text-decoration: none !important;
      }

      #laplace-chatterbox-dialog .cb-tabs {
        position: sticky;
        top: 0;
        z-index: 2;
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 4px;
        padding: 7px;
        background: rgba(248, 248, 250, .9);
        backdrop-filter: blur(18px) saturate(1.4);
        -webkit-backdrop-filter: blur(18px) saturate(1.4);
        border-bottom: 1px solid rgba(0, 0, 0, .06);
      }

      #laplace-chatterbox-dialog .cb-tab {
        min-height: 28px !important;
        padding: 4px 0 !important;
        border: none !important;
        box-shadow: none !important;
        background: transparent !important;
        color: #6e6e73 !important;
      }

      #laplace-chatterbox-dialog .cb-tab[data-active="true"] {
        background: #fff !important;
        color: #1d1d1f !important;
        box-shadow: 0 1px 4px rgba(0, 0, 0, .08) !important;
      }

      #laplace-chatterbox-dialog .cb-primary {
        background: #007aff !important;
        color: #fff !important;
        border-color: #007aff !important;
      }

      #laplace-chatterbox-dialog .cb-danger {
        background: #ff3b30 !important;
        color: #fff !important;
        border-color: #ff3b30 !important;
      }

      #laplace-chatterbox-dialog .cb-soft {
        color: #6e6e73 !important;
      }

      #laplace-chatterbox-dialog .cb-row {
        display: flex;
        align-items: center;
        flex-wrap: wrap;
        gap: 6px;
      }

      #laplace-chatterbox-dialog .cb-stack {
        display: grid;
        gap: 6px;
      }

      #laplace-chatterbox-dialog .cb-body {
        padding: 0 9px 8px;
      }

      #laplace-chatterbox-dialog .cb-note {
        color: #6e6e73;
        font-size: 11px !important;
        line-height: 1.45;
      }

      #laplace-chatterbox-dialog .cb-label {
        color: #6e6e73;
        font-size: 11px !important;
        font-weight: 560;
      }

      #laplace-chatterbox-dialog .cb-panel {
        border: 1px solid rgba(0,0,0,.06);
        border-radius: 8px;
        background: rgba(248, 248, 250, .8);
        padding: 7px;
      }

      #laplace-chatterbox-dialog .cb-section {
        margin: 0 0 6px !important;
        padding: 7px !important;
        border: 1px solid rgba(0, 0, 0, .06) !important;
        border-radius: 8px !important;
        background: rgba(255, 255, 255, .72) !important;
        box-shadow: 0 1px 2px rgba(0, 0, 0, .04) !important;
      }

      #laplace-chatterbox-dialog .cb-heading {
        margin: 0 0 6px !important;
        color: #1d1d1f !important;
        font-weight: 650 !important;
      }

      #laplace-chatterbox-dialog .cb-empty {
        color: #8e8e93 !important;
        background: rgba(118, 118, 128, .08);
        border-radius: 8px;
        padding: 7px;
      }

      #laplace-chatterbox-dialog .cb-result {
        border: 1px solid rgba(0, 0, 0, .06) !important;
        border-radius: 8px !important;
        background: rgba(255, 255, 255, .82) !important;
        padding: 7px !important;
      }

      #laplace-chatterbox-dialog .cb-switch-row {
        display: flex !important;
        align-items: center !important;
        gap: 6px !important;
        min-height: 22px;
        line-height: 1.32;
      }

      #laplace-chatterbox-dialog .cb-setting-block {
        display: grid;
        gap: 5px;
        padding: 6px 0;
      }

      #laplace-chatterbox-dialog .cb-setting-block + .cb-setting-block {
        border-top: 1px solid rgba(0, 0, 0, .06);
      }

      #laplace-chatterbox-dialog .cb-setting-primary {
        padding: 6px 7px;
        border: 1px solid rgba(0, 0, 0, .055);
        border-left: 3px solid #007aff;
        border-radius: 8px;
        background: rgba(255, 255, 255, .68);
      }

      #laplace-chatterbox-dialog .cb-setting-row {
        justify-content: space-between;
        gap: 8px;
        min-height: 26px;
      }

      #laplace-chatterbox-dialog .cb-setting-row select {
        max-width: 178px;
        margin-left: auto;
      }

      #laplace-chatterbox-dialog .cb-setting-child[data-enabled="false"] {
        color: #8e8e93;
      }

      #laplace-chatterbox-dialog .cb-dependent-group {
        position: relative;
        margin-top: 1px;
        padding: 7px;
        border: 1px solid rgba(0, 0, 0, .055);
        border-left: 3px solid #34c759;
        border-radius: 8px;
        background: rgba(248, 248, 250, .7);
        transition: background .18s ease, border-color .18s ease, opacity .18s ease;
      }

      #laplace-chatterbox-dialog .cb-dependent-group[data-enabled="false"] {
        border-left-color: #c7c7cc;
        background: repeating-linear-gradient(
          -45deg,
          rgba(118, 118, 128, .06),
          rgba(118, 118, 128, .06) 6px,
          rgba(255, 255, 255, .52) 6px,
          rgba(255, 255, 255, .52) 12px
        );
      }

      #laplace-chatterbox-dialog .cb-dependent-group[data-enabled="false"]::before {
        content: attr(data-reason);
        justify-self: start;
        width: max-content;
        max-width: 100%;
        padding: 2px 6px;
        border-radius: 999px;
        background: rgba(118, 118, 128, .13);
        color: #6e6e73;
        font-size: 11px;
        font-weight: 620;
        line-height: 1.35;
      }

      #laplace-chatterbox-dialog .cb-accordion-title {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        margin-right: auto;
      }

      #laplace-chatterbox-dialog .cb-module-summary::after {
        margin-left: 2px;
      }

      #laplace-chatterbox-dialog .cb-module-state {
        flex: 0 0 auto;
        min-width: 32px;
        padding: 1px 6px;
        border-radius: 999px;
        border: 1px solid rgba(0, 0, 0, .06);
        background: rgba(118, 118, 128, .1);
        color: #6e6e73;
        font-size: 10px !important;
        font-weight: 720;
        line-height: 1.45;
        text-align: center;
      }

      #laplace-chatterbox-dialog .cb-module-state[data-active="true"] {
        border-color: rgba(52, 199, 89, .28);
        background: rgba(52, 199, 89, .14);
        color: #0a7f55;
      }

      #laplace-chatterbox-dialog .cb-subdetails {
        margin: 0 !important;
        border-color: rgba(0, 0, 0, .05) !important;
        background: rgba(248, 248, 250, .56) !important;
        box-shadow: none !important;
      }

      #laplace-chatterbox-dialog .cb-segment {
        display: grid;
        grid-auto-flow: column;
        grid-auto-columns: 1fr;
        gap: 4px;
        padding: 3px;
        border-radius: 8px;
        background: rgba(118, 118, 128, .12);
      }

      #laplace-chatterbox-dialog .cb-segment button {
        box-shadow: none !important;
        border-color: transparent !important;
        background: transparent !important;
        min-width: 0;
      }

      #laplace-chatterbox-dialog .cb-segment button[aria-pressed="true"] {
        background: #fff !important;
        color: #1d1d1f !important;
        box-shadow: 0 1px 3px rgba(0, 0, 0, .12) !important;
      }

      #laplace-chatterbox-dialog .cb-status-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        display: inline-block;
        background: currentColor;
      }

      #laplace-chatterbox-dialog .cb-list {
        display: grid;
        gap: 6px;
      }

      #laplace-chatterbox-dialog .cb-list-item {
        border-radius: 8px;
        background: rgba(255,255,255,.74);
        border: 1px solid rgba(0,0,0,.06);
        padding: 8px;
      }

      #laplace-chatterbox-dialog .cb-rule-list {
        display: grid;
        gap: 6px;
        max-height: 190px;
        overflow-y: auto;
      }

      #laplace-chatterbox-dialog .cb-rule-item {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 7px;
        align-items: center;
        border: 1px solid rgba(0,0,0,.06);
        border-radius: 8px;
        background: rgba(255,255,255,.7);
        padding: 7px;
      }

      #laplace-chatterbox-dialog .cb-rule-pair {
        min-width: 0;
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 7px;
      }

      #laplace-chatterbox-dialog .cb-rule-pair code {
        display: block;
        min-height: 24px;
        padding: 4px 6px;
        border-radius: 6px;
        background: rgba(118, 118, 128, .08);
        color: #1d1d1f;
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        white-space: normal;
        word-break: break-all;
      }

      #laplace-chatterbox-dialog .cb-rule-form,
      #laplace-chatterbox-dialog .cb-rule-room-form {
        display: grid;
        grid-template-columns: 1fr 1fr auto;
        gap: 7px;
        align-items: end;
      }

      #laplace-chatterbox-dialog .cb-rule-form label,
      #laplace-chatterbox-dialog .cb-rule-room-form label {
        min-width: 0;
        display: grid;
        gap: 3px;
      }

      #laplace-chatterbox-dialog .cb-rule-form input,
      #laplace-chatterbox-dialog .cb-rule-room-form input,
      #laplace-chatterbox-dialog .cb-rule-room-form select {
        width: 100%;
        min-width: 0;
      }

      #laplace-chatterbox-dialog .cb-rule-room-actions {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      #laplace-chatterbox-dialog .cb-rule-remove {
        color: #ff3b30 !important;
      }

      #laplace-chatterbox-dialog .cb-icon-button {
        width: 28px !important;
        min-width: 28px !important;
        padding: 0 !important;
      }

      #laplace-chatterbox-dialog .cb-tag {
        background: var(--cb-tag-bg, #8e8e93) !important;
        color: #fff !important;
        border: none !important;
        box-shadow: none !important;
        min-height: 20px !important;
        border-radius: 5px !important;
        padding: 0 6px !important;
      }

      #laplace-chatterbox-dialog .cb-emote[data-copied="true"] {
        background: #34c759 !important;
        color: #fff !important;
      }

      @media (max-width: 420px) {
        #laplace-chatterbox-dialog .cb-rule-item,
        #laplace-chatterbox-dialog .cb-rule-form,
        #laplace-chatterbox-dialog .cb-rule-room-form {
          grid-template-columns: 1fr;
        }
      }
    `
    document.head.appendChild(style)
    void loop()
    return () => style.remove()
  }, [])

  useEffect(() => {
    if (danmakuDirectMode.value) {
      startDanmakuDirect()
    } else {
      stopDanmakuDirect()
    }
    return () => stopDanmakuDirect()
  }, [danmakuDirectMode.value])

  useEffect(() => {
    if (autoBlendEnabled.value) {
      startAutoBlend()
    } else {
      stopAutoBlend()
    }
    return () => stopAutoBlend()
  }, [autoBlendEnabled.value])

  useEffect(() => {
    startCustomChat()
    return () => stopCustomChat()
  }, [])

  useEffect(() => {
    if (customChatUseWs.value) {
      startLiveWsSource()
    } else {
      stopLiveWsSource()
    }
    return () => stopLiveWsSource()
  }, [customChatUseWs.value])

  useEffect(() => {
    const el = document.querySelector<HTMLElement>('.app-body')
    if (!el) return
    if (optimizeLayout.value) {
      el.style.marginLeft = '1rem'
    } else {
      el.style.marginLeft = ''
    }
  }, [optimizeLayout.value])

  return (
    <>
      <ToggleButton />
      <Configurator />
      <UserNotice />
      <AlertDialog />
    </>
  )
}

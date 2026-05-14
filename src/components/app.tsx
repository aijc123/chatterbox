import { useEffect } from 'preact/hooks'

import {
  installOptimizedLayoutStyle,
  installPanelStyles,
  startCbBackendHealthProbe,
  startCustomChatRoomRearm,
} from '../lib/app-lifecycle'
import { startAutoBlend, stopAutoBlend } from '../lib/auto-blend'
import { installRemoteClusterLifecycle } from '../lib/chatfilter/remote-controller'
import { startReplacementFeed, stopReplacementFeed } from '../lib/chatfilter-replacement-feed'
import { startCustomChat, stopCustomChat } from '../lib/custom-chat'
import { startDanmakuDirect, stopDanmakuDirect } from '../lib/danmaku-direct'
import { startGuardRoomAgent, stopGuardRoomAgent } from '../lib/guard-room-agent'
import { applyGuardRoomHandoff } from '../lib/guard-room-handoff'
import { guardRoomLiveDeskSessionId } from '../lib/guard-room-live-desk-state'
import { startLiveDeskSync, stopLiveDeskSync } from '../lib/live-desk-sync'
import { startLiveWsSource, stopLiveWsSource } from '../lib/live-ws-source'
import { loop } from '../lib/loop'
import { startNativeChatFold, stopNativeChatFold } from '../lib/native-chat-fold'
import { startRadarReportLoop } from '../lib/radar-report'
import {
  autoBlendEnabled,
  chatfilterFeedReplacementLearn,
  customChatEnabled,
  customChatUseWs,
  danmakuDirectMode,
  nativeChatFoldMode,
  optimizeLayout,
} from '../lib/store'
import { startUserBlacklistHijack, stopUserBlacklistHijack } from '../lib/user-blacklist'
import { Configurator } from './configurator'
import { ErrorBoundary } from './error-boundary'
import { Onboarding } from './onboarding'
import { ShadowBypassChip } from './shadow-bypass-chip'
import { ToggleButton } from './toggle-button'
import { AlertDialog } from './ui/alert-dialog'
import { UserNotice } from './user-notice'

export function App() {
  useEffect(() => {
    applyGuardRoomHandoff()
  }, [])

  useEffect(() => {
    startGuardRoomAgent()
    return () => {
      stopGuardRoomAgent()
    }
  }, [])

  useEffect(() => {
    const dispose = installPanelStyles()
    void loop()
    return dispose
  }, [])

  useEffect(() => startCustomChatRoomRearm(), [])

  useEffect(() => startCbBackendHealthProbe(), [])

  // radar 观察上报:默认 OFF。开关打开时才订阅 danmaku 流,关掉时立刻退订并
  // 丢掉未发送的 buffer。fire-and-forget — 失败/网络错误一律静默吞掉。
  useEffect(() => {
    startRadarReportLoop()
  }, [])

  // chatfilter 远程聚类：用户在设置里打开 chatfilterRemoteEnabled 时自动启动，
  // 关闭或换 endpoint 时自动重连。失败 / 网络错误一律静默，主路径不受影响。
  useEffect(() => installRemoteClusterLifecycle(), [])

  // chatfilter 替换规则学习：开关 ON 时订阅 normalize 事件，把高频 alias 命中
  // 累计为候选规则，用户在 log panel 里看到并主动「采纳」才晋升。
  useEffect(() => {
    if (chatfilterFeedReplacementLearn.value) startReplacementFeed()
    else stopReplacementFeed()
    return () => stopReplacementFeed()
  }, [chatfilterFeedReplacementLearn.value])

  useEffect(() => {
    if (danmakuDirectMode.value) {
      startDanmakuDirect()
    } else {
      stopDanmakuDirect()
    }
    return () => stopDanmakuDirect()
  }, [danmakuDirectMode.value])

  useEffect(() => {
    if (nativeChatFoldMode.value) {
      startNativeChatFold()
    } else {
      stopNativeChatFold()
    }
    return () => stopNativeChatFold()
  }, [nativeChatFoldMode.value])

  useEffect(() => {
    if (autoBlendEnabled.value) {
      startAutoBlend()
    } else {
      stopAutoBlend()
    }
    return () => stopAutoBlend()
  }, [autoBlendEnabled.value])

  useEffect(() => {
    startUserBlacklistHijack()
    return () => stopUserBlacklistHijack()
  }, [])

  useEffect(() => {
    if (guardRoomLiveDeskSessionId.value) {
      startLiveDeskSync()
    } else {
      stopLiveDeskSync()
    }
    return () => stopLiveDeskSync()
  }, [guardRoomLiveDeskSessionId.value])

  useEffect(() => {
    if (customChatEnabled.value) {
      startCustomChat()
    } else {
      stopCustomChat()
    }
    return () => stopCustomChat()
  }, [customChatEnabled.value])

  // Live WS 是所有自动功能的规范事件源（跟车 / 智驾 / 影子屏蔽校验 /
  // Chatterbox Chat）。原本只在 customChatEnabled && customChatUseWs 时才
  // startLiveWsSource()——这是设计 bug：用户没启用 Chatterbox Chat 的话
  // WS 就永远不启动，header 会显示「WS 未启用」，但用户不知道这词跟自己
  // 用的功能有什么关系。同时 auto-blend / send-verification 自己也会
  // startLiveWsSource()，但那要等用户实际触发功能。
  //
  // 现在的设计：直播页加载就自动 ref-count 起来一份 WS，依赖通过
  // live-ws-source 的引用计数协议跟其它消费者协作。`customChatUseWs=false`
  // 是 power-user 的强制 DOM-only 模式，保留这个 opt-out。
  useEffect(() => {
    if (!customChatUseWs.value) return
    return startLiveWsSource()
  }, [customChatUseWs.value])

  useEffect(() => installOptimizedLayoutStyle(), [optimizeLayout.value])

  return (
    <>
      <ToggleButton />
      <ErrorBoundary>
        <Configurator />
        <Onboarding />
        <UserNotice />
        <ShadowBypassChip />
        <AlertDialog />
      </ErrorBoundary>
    </>
  )
}

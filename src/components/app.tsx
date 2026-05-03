import { useEffect } from 'preact/hooks'

import {
  installOptimizedLayoutStyle,
  installPanelStyles,
  startCbBackendHealthProbe,
  startCustomChatRoomRearm,
} from '../lib/app-lifecycle'
import { startAutoBlend, stopAutoBlend } from '../lib/auto-blend'
import { startCustomChat, stopCustomChat } from '../lib/custom-chat'
import { startDanmakuDirect, stopDanmakuDirect } from '../lib/danmaku-direct'
import { startGuardRoomAgent, stopGuardRoomAgent } from '../lib/guard-room-agent'
import { applyGuardRoomHandoff } from '../lib/guard-room-handoff'
import { guardRoomLiveDeskSessionId } from '../lib/guard-room-live-desk-state'
import { startLiveDeskSync, stopLiveDeskSync } from '../lib/live-desk-sync'
import { startLiveWsSource, stopLiveWsSource } from '../lib/live-ws-source'
import { loop } from '../lib/loop'
import { autoBlendEnabled, customChatEnabled, customChatUseWs, danmakuDirectMode, optimizeLayout } from '../lib/store'
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

  useEffect(() => {
    if (customChatEnabled.value && customChatUseWs.value) {
      startLiveWsSource()
    } else {
      stopLiveWsSource()
    }
    return () => stopLiveWsSource()
  }, [customChatEnabled.value, customChatUseWs.value])

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

import { activeTab, autoBlendEnabled, hzmDriveEnabled, liveWsStatus, sendMsg, sttRunning } from '../lib/store'

const TABS = [
  { id: 'fasong', label: '发送' },
  { id: 'tongchuan', label: '同传' },
  { id: 'settings', label: '设置' },
  { id: 'about', label: '关于' },
] as const

export function Tabs() {
  const current = activeTab.value
  // Show a degraded indicator only when WS was attempted (i.e. not 'off')
  // AND is now in error/closed. 'off' means the user simply hasn't enabled
  // anything that needs WS — not a degradation worth flagging.
  const wsDegraded = liveWsStatus.value === 'error' || liveWsStatus.value === 'closed'

  return (
    <div className='cb-tabs' role='tablist' aria-label='弹幕助手分类'>
      {TABS.map(tab => (
        <button
          type='button'
          key={tab.id}
          className='cb-tab lc-min-w-0'
          role='tab'
          aria-selected={current === tab.id}
          data-active={current === tab.id}
          onClick={() => {
            activeTab.value = tab.id
          }}
        >
          {tab.label}
          {tab.id === 'fasong' && sendMsg.value ? ' · 车' : ''}
          {tab.id === 'fasong' && autoBlendEnabled.value ? ' · 跟' : ''}
          {tab.id === 'fasong' && hzmDriveEnabled.value ? ' · 智' : ''}
          {tab.id === 'fasong' && wsDegraded ? ' ⚠️' : ''}
          {tab.id === 'tongchuan' && sttRunning.value ? ' · 开' : ''}
        </button>
      ))}
      {wsDegraded && (
        <div
          className='cb-ws-degraded-banner'
          role='status'
          aria-live='polite'
          title='直播 WebSocket 断开，自动跟车与 Chatterbox Chat 已退化为 DOM 抓取模式（高峰期可能漏事件）'
        >
          ⚠️ 直播 WS 已断开 · 已退回 DOM 抓取（高峰期可能漏事件）
        </div>
      )}
    </div>
  )
}

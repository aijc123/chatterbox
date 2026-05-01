import { activeTab, autoBlendEnabled, sendMsg, sttRunning } from '../lib/store'

const TABS = [
  { id: 'fasong', label: '发送' },
  { id: 'tongchuan', label: '同传' },
  { id: 'settings', label: '设置' },
  { id: 'about', label: '关于' },
] as const

export function Tabs() {
  const current = activeTab.value

  return (
    <div className='cb-tabs'>
      {TABS.map(tab => (
        <button
          type='button'
          key={tab.id}
          className='cb-tab lc-min-w-0'
          data-active={current === tab.id}
          onClick={() => {
            activeTab.value = tab.id
          }}
        >
          {tab.label}
          {tab.id === 'fasong' && sendMsg.value ? ' · 车' : ''}
          {tab.id === 'fasong' && autoBlendEnabled.value ? ' · 跟' : ''}
          {tab.id === 'tongchuan' && sttRunning.value ? ' · 开' : ''}
        </button>
      ))}
    </div>
  )
}

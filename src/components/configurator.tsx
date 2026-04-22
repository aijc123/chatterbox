import { activeTab, dialogOpen } from '../lib/store'
import { AboutTab } from './about-tab'
import { AutoBlendControls } from './auto-blend-controls'
import { AutoSendControls } from './auto-send-controls'
import { LogPanel } from './log-panel'
import { MemesList } from './memes-list'
import { SettingsTab } from './settings-tab'
import { SttTab } from './stt-tab'
import { Tabs } from './tabs'

export function Configurator() {
  const tab = activeTab.value
  const visible = dialogOpen.value

  return (
    <div
      id='laplace-chatterbox-dialog'
      style={{
        position: 'fixed',
        right: '8px',
        bottom: '46px',
        zIndex: 2147483647,
        display: visible ? 'block' : 'none',
        maxHeight: '50vh',
        overflowY: 'auto',
        width: '360px',
        maxWidth: 'calc(100vw - 16px)',
      }}
    >
      <Tabs />

      <div
        style={{
          display: tab === 'fasong' ? 'block' : 'none',
        }}
        className='cb-scroll'
      >
        <AutoSendControls />

        <div>
          <AutoBlendControls />
        </div>

        <div
          style={{
            margin: '.25rem 0',
          }}
        >
          <MemesList />
        </div>
      </div>

      <div
        style={{
          display: tab === 'tongchuan' ? 'block' : 'none',
        }}
        className='cb-scroll'
      >
        <SttTab />
      </div>

      <div
        style={{
          display: tab === 'settings' ? 'block' : 'none',
        }}
        className='cb-scroll'
      >
        <SettingsTab />
      </div>

      <div
        style={{
          display: tab === 'about' ? 'block' : 'none',
        }}
        className='cb-scroll'
      >
        <AboutTab />
      </div>

      <div style={{ paddingInline: '10px', paddingBlockEnd: '10px' }}>
        <LogPanel />
      </div>
    </div>
  )
}

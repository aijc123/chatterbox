import { useRef } from 'preact/hooks'

import { cn } from '../lib/cn'
import { activeTab, dialogOpen } from '../lib/store'
import { AboutTab } from './about-tab'
import { AutoBlendControls } from './auto-blend-controls'
import { AutoSendControls } from './auto-send-controls'
import { HzmDrivePanelMount } from './hzm-drive-panel'
import { LogPanel } from './log-panel'
import { MemesList } from './memes-list'
import { NormalSendTab } from './normal-send-tab'
import { SettingsTab } from './settings-tab'
import { SttTab } from './stt-tab'
import { Tabs } from './tabs'

export function Configurator() {
  const tab = activeTab.value
  const visible = dialogOpen.value
  // Mount each tab on first visit, then keep it in DOM (avoids remounting state)
  const visited = useRef(new Set([tab]))
  visited.current.add(tab)
  const panelClass = (active: boolean) => cn('cb-scroll', active ? 'lc-block' : 'lc-hidden')

  return (
    <section
      id='laplace-chatterbox-dialog'
      aria-label='弹幕助手面板'
      aria-hidden={!visible}
      className={cn(
        'lc-fixed lc-right-2 lc-bottom-[46px] lc-z-[2147483647]',
        'lc-w-[320px] lc-max-w-[calc(100vw_-_16px)]',
        'lc-max-h-[50vh] lc-overflow-y-auto',
        !visible && 'lc-hidden'
      )}
    >
      <Tabs />

      <div className={panelClass(tab === 'fasong')}>
        {visited.current.has('fasong') && (
          <>
            <AutoSendControls />
            <div>
              <AutoBlendControls />
            </div>
            <div>
              <HzmDrivePanelMount />
            </div>
            <div style={{ margin: '.25rem 0' }}>
              <MemesList />
            </div>
            <NormalSendTab />
          </>
        )}
      </div>

      <div className={panelClass(tab === 'tongchuan')}>{visited.current.has('tongchuan') && <SttTab />}</div>

      <div className={panelClass(tab === 'settings')}>{visited.current.has('settings') && <SettingsTab />}</div>

      <div className={panelClass(tab === 'about')}>{visited.current.has('about') && <AboutTab />}</div>

      <div className='lc-px-[10px] lc-pb-[10px]'>
        <LogPanel />
      </div>
    </section>
  )
}

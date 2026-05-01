import { useSignal } from '@preact/signals'

import { maxLogLines } from '../lib/log'
import { EmoteIds } from './emote-ids'
import { BackupSection } from './settings/backup-section'
import { CustomChatSection } from './settings/custom-chat-section'
import { DanmakuDirectSection } from './settings/danmaku-direct-section'
import { LayoutSection } from './settings/layout-section'
import { MedalCheckSection } from './settings/medal-check-section'
import {
  CloudReplacementSection,
  LocalGlobalReplacementSection,
  LocalRoomReplacementSection,
} from './settings/replacement-section'

export function SettingsTab() {
  const settingsSearch = useSignal('')
  const query = settingsSearch.value.trim().toLowerCase()

  return (
    <>
      <div className='cb-section cb-stack' style={{ margin: '.5em 0', gap: '.35em' }}>
        <label htmlFor='settingsSearch' className='cb-label'>
          搜索设置
        </label>
        <input
          id='settingsSearch'
          type='search'
          value={settingsSearch.value}
          placeholder='输入关键词，例如：表情、保安室、CSS、备份'
          style={{ width: '100%' }}
          onInput={e => {
            settingsSearch.value = e.currentTarget.value
          }}
        />
      </div>

      <CloudReplacementSection query={query} />
      <LocalGlobalReplacementSection query={query} />
      <LocalRoomReplacementSection query={query} />

      {(!query || '表情 emote emoji ID 复制'.toLowerCase().includes(query)) && (
        <details className='cb-settings-accordion' open>
          <summary>表情</summary>
          <div
            className='cb-section cb-stack'
            style={{ margin: '.5em 0', paddingBottom: '1em', borderBottom: '1px solid var(--Ga2, #eee)' }}
          >
            <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
              表情（复制后可在独轮车或常规发送中直接发送）
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <EmoteIds />
            </div>
          </div>
        </details>
      )}

      <MedalCheckSection query={query} />
      <CustomChatSection query={query} />
      <DanmakuDirectSection query={query} />
      <LayoutSection query={query} />

      {(!query || '日志设置 日志 行数'.toLowerCase().includes(query)) && (
        <details className='cb-settings-accordion'>
          <summary>日志设置</summary>
          <div className='cb-section cb-stack' style={{ margin: '.5em 0', paddingBottom: '1em' }}>
            <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
              日志设置
            </div>
            <div className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap' }}>
              <label htmlFor='maxLogLines' style={{ color: '#666' }}>
                最大日志行数:
              </label>
              <input
                id='maxLogLines'
                type='number'
                min='1'
                max='1000'
                style={{ width: '80px' }}
                value={maxLogLines.value}
                onChange={e => {
                  let v = parseInt(e.currentTarget.value, 10)
                  if (Number.isNaN(v) || v < 1) v = 1
                  else if (v > 1000) v = 1000
                  maxLogLines.value = v
                }}
              />
              <span style={{ color: '#999', fontSize: '0.9em' }}>(1-1000)</span>
            </div>
          </div>
        </details>
      )}

      <BackupSection query={query} />
    </>
  )
}

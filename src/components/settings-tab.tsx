import { useSignal } from '@preact/signals'

import { debugLogVisible, maxLogLines } from '../lib/log'
import { EmoteIds } from './emote-ids'
import { BackupSection } from './settings/backup-section'
import { CbBackendSection } from './settings/cb-backend-section'
import { CustomChatSection } from './settings/custom-chat-section'
import { DanmakuDirectSection } from './settings/danmaku-direct-section'
import { LayoutSection } from './settings/layout-section'
import { MedalCheckSection } from './settings/medal-check-section'
import {
  CloudReplacementSection,
  LocalGlobalReplacementSection,
  LocalRoomReplacementSection,
} from './settings/replacement-section'
import { ShadowObservationSection } from './settings/shadow-observation-section'

function GroupHeading({ children, query }: { children: string; query: string }) {
  if (query) return null
  return (
    <div
      className='cb-group-heading'
      style={{
        margin: '1em 0 .25em',
        fontSize: '0.75em',
        fontWeight: 'bold',
        color: '#999',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  )
}

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

      <GroupHeading query={query}>常用</GroupHeading>
      <CustomChatSection query={query} />
      <DanmakuDirectSection query={query} />
      <LayoutSection query={query} />
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

      <GroupHeading query={query}>替换规则</GroupHeading>
      <CloudReplacementSection query={query} />
      <LocalGlobalReplacementSection query={query} />
      <LocalRoomReplacementSection query={query} />
      <ShadowObservationSection query={query} />

      <GroupHeading query={query}>工具</GroupHeading>
      <MedalCheckSection query={query} />
      <CbBackendSection query={query} />
      <BackupSection query={query} />

      <GroupHeading query={query}>系统</GroupHeading>
      {(!query || '日志设置 日志 行数 调试 debug'.toLowerCase().includes(query)) && (
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
                  let v = Number.parseInt(e.currentTarget.value, 10)
                  if (Number.isNaN(v) || v < 1) v = 1
                  else if (v > 1000) v = 1000
                  maxLogLines.value = v
                }}
              />
              <span style={{ color: '#999', fontSize: '0.9em' }}>(1-1000)</span>
            </div>
            <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.4em' }}>
              <input
                id='debugLogVisible'
                type='checkbox'
                checked={debugLogVisible.value}
                onInput={e => {
                  debugLogVisible.value = e.currentTarget.checked
                }}
              />
              <label
                htmlFor='debugLogVisible'
                title='打开后内部诊断日志会带上 🔍 前缀，便于打包成完整日志反馈给维护者。正常使用不需要打开。'
              >
                调试模式（在日志中标注内部诊断行）
              </label>
            </span>
            <div className='cb-note' style={{ color: '#666' }}>
              收到「请发完整日志」类的反馈请求时打开此开关，再复制日志面板内容提交。
            </div>
          </div>
        </details>
      )}
    </>
  )
}

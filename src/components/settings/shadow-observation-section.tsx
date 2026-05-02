import { useSignal } from '@preact/signals'

import { processText } from '../../lib/ai-evasion'
import { appendLog } from '../../lib/log'
import {
  clearShadowBanObservations,
  promoteObservationToRule,
  removeShadowBanObservation,
} from '../../lib/shadow-learn'
import { autoLearnShadowRules, shadowBanObservations } from '../../lib/store'

const SECTION_KEYWORDS = '影子屏蔽 屏蔽观察 自动学习 shadow ban'

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / 86_400_000)} 天前`
}

export function ShadowObservationSection({ query = '' }: { query?: string }) {
  const visible = !query || SECTION_KEYWORDS.toLowerCase().includes(query)
  const replaceTo = useSignal<Record<string, string>>({})

  if (!visible) return null

  const sorted = [...shadowBanObservations.value].sort((a, b) => b.count - a.count || b.ts - a.ts)
  const top = sorted.slice(0, 50)

  const keyOf = (text: string, roomId: number | undefined): string => `${roomId ?? 'global'}\x00${text}`

  return (
    <details className='cb-settings-accordion'>
      <summary>影子屏蔽观察 / 自动学习</summary>
      <div
        className='cb-section cb-stack'
        style={{ margin: '.5em 0', paddingBottom: '1em', borderBottom: '1px solid var(--Ga2, #eee)' }}
      >
        <div className='cb-row'>
          <input
            id='autoLearnShadowRules'
            type='checkbox'
            checked={autoLearnShadowRules.value}
            onInput={e => {
              autoLearnShadowRules.value = e.currentTarget.checked
            }}
          />
          <label
            for='autoLearnShadowRules'
            title='当 verifyBroadcast 检测到影子封禁、AI 规避又成功改写之后，自动把（敏感词→改写后）写入当前房间的本地替换规则。'
          >
            自动学习屏蔽词（AI 规避成功后写入本地房间规则）
          </label>
        </div>
        <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', paddingLeft: '1.4em' }}>
          学到的规则会作为本地房间规则保存，下次发送同样文本会先走替换。如果配置了 Guard
          Room，每条新规则会上报到云端供跨设备同步。
        </div>

        <div className='cb-heading' style={{ fontWeight: 'bold', marginTop: '.6em' }}>
          影子封禁观察列表
          <span style={{ color: '#999', fontWeight: 'normal', marginLeft: '.4em' }}>
            (共 {shadowBanObservations.value.length} 条，显示前 50)
          </span>
          {top.length > 0 && (
            <button
              type='button'
              className='cb-button-text'
              style={{ float: 'right', fontSize: '0.85em' }}
              onClick={() => {
                if (!confirm('确定清空所有影子封禁观察记录吗？')) return
                clearShadowBanObservations()
                appendLog('🧹 已清空影子封禁观察列表')
              }}
            >
              全部清空
            </button>
          )}
        </div>

        {top.length === 0 ? (
          <div className='cb-empty' style={{ color: '#999' }}>
            暂无观察记录。当 AI 规避未开、或开了但 Laplace 没识别敏感词、或改写后仍未广播时，原句会出现在这里。
          </div>
        ) : (
          <div className='cb-rule-list'>
            {top.map(obs => {
              const k = keyOf(obs.text, obs.roomId)
              const editing = replaceTo.value[k]
              const showInput = typeof editing === 'string'
              return (
                <div
                  key={k}
                  className='cb-rule-item'
                  style={{ flexDirection: 'column', alignItems: 'stretch', gap: '.35em' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <code style={{ fontSize: '0.95em' }}>{obs.text}</code>
                    <span style={{ color: '#999', fontSize: '0.85em' }}>
                      ×{obs.count}
                      {obs.roomId !== undefined && <> · 房间 {obs.roomId}</>}
                      {' · '}
                      {formatRelative(obs.ts)}
                      {obs.evadedAlready && <> · AI改写后仍未广播</>}
                    </span>
                  </div>
                  {showInput && (
                    <div className='cb-row' style={{ gap: '.4em', alignItems: 'center' }}>
                      <span className='cb-label' style={{ color: '#999', fontSize: '0.85em' }}>
                        改成
                      </span>
                      <input
                        type='text'
                        style={{ flex: 1 }}
                        value={editing}
                        placeholder='留空 = 用隐形字符变体'
                        onInput={e => {
                          replaceTo.value = { ...replaceTo.value, [k]: e.currentTarget.value }
                        }}
                      />
                      <button
                        type='button'
                        onClick={() => {
                          const target = (replaceTo.value[k] ?? '').trim() || processText(obs.text)
                          if (obs.roomId === undefined) {
                            appendLog('⚠️ 该条观察记录没有房间 id，无法转为本地房间规则')
                            return
                          }
                          const ok = promoteObservationToRule(obs, target)
                          if (ok) {
                            appendLog(`📚 已加为房间 ${obs.roomId} 的本地规则：${obs.text} → ${target}`)
                            const { [k]: _drop, ...rest } = replaceTo.value
                            replaceTo.value = rest
                          } else {
                            appendLog('⚠️ 添加规则失败（可能已存在同 from 的规则，或 from===to）')
                          }
                        }}
                      >
                        确认
                      </button>
                      <button
                        type='button'
                        onClick={() => {
                          const { [k]: _drop, ...rest } = replaceTo.value
                          replaceTo.value = rest
                        }}
                      >
                        取消
                      </button>
                    </div>
                  )}
                  {!showInput && (
                    <div className='cb-row' style={{ gap: '.4em' }}>
                      <button
                        type='button'
                        disabled={obs.roomId === undefined}
                        title={obs.roomId === undefined ? '没有房间 id 信息，无法加为房间规则' : ''}
                        onClick={() => {
                          replaceTo.value = { ...replaceTo.value, [k]: processText(obs.text) }
                        }}
                      >
                        加为本地规则
                      </button>
                      <button type='button' onClick={() => removeShadowBanObservation(obs.text, obs.roomId)}>
                        删除
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </details>
  )
}

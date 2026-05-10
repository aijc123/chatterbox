import { useSignal } from '@preact/signals'

import type { ShadowBypassCandidate } from '../../lib/shadow-suggestion'

import { processText } from '../../lib/ai-evasion'
import { copyText, fillIntoComposer } from '../../lib/danmaku-actions'
import { appendLog } from '../../lib/log'
import {
  clearShadowBanObservations,
  promoteObservationToRule,
  removeShadowBanObservation,
} from '../../lib/shadow-learn'
import { autoLearnShadowRules, shadowBanMode, shadowBanObservations } from '../../lib/store'
import { showConfirm } from '../ui/alert-dialog'
import { matchesSearchQuery } from './search'

const SECTION_KEYWORDS = '影子屏蔽 屏蔽观察 自动学习 shadow ban 改写 候选 隐形 invisible kou 空格'

function formatRelative(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / 86_400_000)} 天前`
}

function CandidateRow({ candidate }: { candidate: ShadowBypassCandidate }) {
  return (
    <div
      className='cb-row'
      style={{
        display: 'flex',
        gap: '.4em',
        alignItems: 'baseline',
        flexWrap: 'wrap',
        padding: '.15em 0',
      }}
    >
      <span style={{ color: '#888', fontSize: '0.85em', minWidth: '4.5em' }}>{candidate.label}</span>
      <code
        style={{
          flex: 1,
          minWidth: 0,
          overflowWrap: 'anywhere',
          background: 'var(--Ga0, #f5f5f5)',
          padding: '.1em .3em',
          borderRadius: '.2em',
        }}
      >
        {candidate.text}
      </code>
      <button
        type='button'
        style={{ fontSize: '0.85em' }}
        onClick={async () => {
          const ok = await copyText(candidate.text)
          appendLog(ok ? `📋 已复制（${candidate.label}）` : `⚠️ 复制失败（${candidate.label}）`)
        }}
      >
        复制
      </button>
      <button
        type='button'
        style={{ fontSize: '0.85em' }}
        title='填入弹幕输入框，但不会自动发送 — 你确认无误后再按发送/回车'
        onClick={() => {
          const target = fillIntoComposer(candidate.text)
          const where =
            target === 'custom-chat' ? 'Chatterbox 输入框' : target === 'native' ? 'B站原生输入框' : '发送 Tab'
          appendLog(`📝 已填入${where}（${candidate.label}），请检查后再发送`)
        }}
      >
        填入输入框
      </button>
    </div>
  )
}

export function ShadowObservationSection({ query = '' }: { query?: string }) {
  const replaceTo = useSignal<Record<string, string>>({})

  if (!matchesSearchQuery(SECTION_KEYWORDS, query)) return null

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
        <div className='cb-row' style={{ flexWrap: 'wrap', gap: '.4em', alignItems: 'baseline' }}>
          <span className='cb-label'>检测到影子封禁后：</span>
          <label>
            <input
              type='radio'
              name='shadowBanMode'
              value='suggest'
              checked={shadowBanMode.value === 'suggest'}
              onInput={() => {
                shadowBanMode.value = 'suggest'
              }}
            />{' '}
            只给候选改写（推荐）
          </label>
          <label>
            <input
              type='radio'
              name='shadowBanMode'
              value='auto-resend'
              checked={shadowBanMode.value === 'auto-resend'}
              onInput={() => {
                shadowBanMode.value = 'auto-resend'
              }}
            />{' '}
            自动 AI 改写并重发
          </label>
        </div>
        <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', paddingLeft: '1.4em' }}>
          「只给候选」模式下脚本不会自动再发任何消息，只是把改写候选列在日志和下方观察列表里，由你决定是否复制/填入输入框。
          「自动重发」模式需要同时打开「AI 规避」开关，会把 AI 改写后的弹幕自动重发并写入本地房间规则。
        </div>

        <div className='cb-row' style={{ marginTop: '.4em' }}>
          <input
            id='autoLearnShadowRules'
            type='checkbox'
            checked={autoLearnShadowRules.value}
            onInput={e => {
              autoLearnShadowRules.value = e.currentTarget.checked
            }}
          />
          <label
            htmlFor='autoLearnShadowRules'
            title='仅在「自动重发」模式下生效：AI 改写成功后把（敏感词→改写后）写入当前房间的本地替换规则。'
          >
            自动学习屏蔽词（仅自动重发模式生效，写入本地房间规则）
          </label>
        </div>
        <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', paddingLeft: '1.4em' }}>
          学到的规则保存为本地房间规则，下次发送同样文本会先走替换。如果配置了 Guard
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
              onClick={async () => {
                const ok = await showConfirm({
                  title: '确定清空所有影子封禁观察记录吗？',
                  body: '此操作不可撤销。已经晋升为本地规则的不会受影响。',
                  confirmText: '清空',
                  cancelText: '取消',
                })
                if (!ok) return
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
            暂无观察记录。被影子封禁的弹幕会出现在这里，附带候选改写以供你复制或填入输入框。
          </div>
        ) : (
          <div className='cb-rule-list'>
            {top.map(obs => {
              const k = keyOf(obs.text, obs.roomId)
              const editing = replaceTo.value[k]
              const showInput = typeof editing === 'string'
              const candidates = obs.candidates ?? []
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

                  {candidates.length > 0 && (
                    <div className='cb-stack' style={{ paddingLeft: '.5em', borderLeft: '2px solid var(--Ga2, #ddd)' }}>
                      <div style={{ color: '#888', fontSize: '0.8em' }}>候选改写（不自动发送）</div>
                      {candidates.map(c => (
                        <CandidateRow key={`${k}|${c.strategy}`} candidate={c} />
                      ))}
                    </div>
                  )}

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

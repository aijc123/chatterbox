import { useSignal } from '@preact/signals'
import { useEffect } from 'preact/hooks'

import type { MemeSource } from '../lib/meme-sources'
import type { LaplaceMemeWithSource } from '../lib/sbhzm-client'

import { startHzmAutoDrive, stopHzmAutoDrive } from '../lib/hzm-auto-drive'
import {
  cachedRoomId,
  getBlacklistTags,
  getDailyStats,
  getSelectedTags,
  type HzmDriveMode,
  type HzmLlmProvider,
  hzmDriveIntervalSec,
  hzmDriveMode,
  hzmDryRun,
  hzmLlmApiKey,
  hzmLlmBaseURL,
  hzmLlmModel,
  hzmLlmProvider,
  hzmLlmRatio,
  hzmPauseKeywordsOverride,
  hzmRateLimitPerMin,
  sendMsg,
  setBlacklistTags,
  setSelectedTags,
} from '../lib/store'

/**
 * 智能辅助驾驶面板。
 *
 * 设计原则：和「独轮车（auto-send-controls.tsx）」视觉/交互保持一致——
 *  - 用 cb-row / cb-stack / cb-body / cb-panel 类
 *  - 主控用大「开车 / 停车」按钮 + 模式按钮组（启发式 / LLM 智驾）
 *  - LLM 区有内联状态指示 + 「测试连接」按钮
 *
 * 默认模式：off。点开车 → heuristic（最安全的进场）。dryRun 默认 true。
 */

const PROVIDER_LABEL: Record<HzmLlmProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  'openai-compat': 'OpenAI 兼容',
}

const MODE_LABEL: Record<Exclude<HzmDriveMode, 'off'>, string> = {
  heuristic: '启发式',
  llm: 'LLM 智驾',
}

/** 把 API key 显示成 `sk-1234...abcd` 这种半遮罩形态，避免完整泄露。 */
function maskKey(k: string): string {
  const trimmed = k.trim()
  if (trimmed.length <= 8) return trimmed ? `${trimmed[0]}***${trimmed.at(-1)}` : ''
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`
}

export function HzmDrivePanel({ source, memes }: { source: MemeSource; memes: LaplaceMemeWithSource[] }) {
  const roomId = cachedRoomId.value
  const stats = getDailyStats(roomId)
  const selected = getSelectedTags(roomId)
  const blacklist = getBlacklistTags(roomId)
  const isRunning = hzmDriveMode.value !== 'off'

  // 当前梗列表里出现过的所有 tag（用作偏好/黑名单选项）
  const tagOptions: string[] = (() => {
    const set = new Set<string>()
    for (const m of memes) {
      for (const t of m.tags) {
        if (t.name) set.add(t.name)
      }
    }
    return [...set].sort()
  })()

  // 模式变化 → 启停 runtime（off 时停车，否则按当前 mode 启动）
  useEffect(() => {
    if (hzmDriveMode.value === 'off') {
      stopHzmAutoDrive()
      return
    }
    void startHzmAutoDrive({ source, getMemes: () => memes })
    return () => stopHzmAutoDrive()
  }, [hzmDriveMode.value, source.roomId])

  // 测试连接状态
  const testStatus = useSignal<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const testError = useSignal<string>('')

  const toggleDrive = () => {
    if (isRunning) {
      hzmDriveMode.value = 'off'
    } else {
      // 默认进场启发式（不需要 key、最稳）
      hzmDriveMode.value = 'heuristic'
    }
  }

  const setMode = (m: Exclude<HzmDriveMode, 'off'>) => {
    hzmDriveMode.value = m
  }

  const handleTestLLM = async () => {
    if (testStatus.value === 'testing') return
    testStatus.value = 'testing'
    testError.value = ''
    try {
      const { testLLMConnection } = await import('../lib/llm-driver')
      const r = await testLLMConnection({
        provider: hzmLlmProvider.value,
        apiKey: hzmLlmApiKey.value,
        model: hzmLlmModel.value,
        baseURL: hzmLlmBaseURL.value.trim() || undefined,
      })
      if (r.ok) {
        testStatus.value = 'ok'
      } else {
        testStatus.value = 'fail'
        testError.value = r.error ?? '未知错误'
      }
    } catch (err) {
      testStatus.value = 'fail'
      testError.value = err instanceof Error ? err.message : String(err)
    }
  }

  const toggleSelectedTag = (tag: string) => {
    if (roomId === null) return
    setSelectedTags(roomId, selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag])
  }

  const toggleBlacklistTag = (tag: string) => {
    if (roomId === null) return
    setBlacklistTags(roomId, blacklist.includes(tag) ? blacklist.filter(t => t !== tag) : [...blacklist, tag])
  }

  const apiKeyConfigured = hzmLlmApiKey.value.trim().length > 0
  const pauseDefault = (source.pauseKeywords ?? []).join(' / ')

  return (
    <details
      style={{
        marginTop: '.6em',
        padding: '.4em .5em',
        border: '1px solid var(--Ga2, #ccc)',
        borderRadius: '4px',
        background: 'var(--bg2, #fafafa)',
      }}
    >
      <summary style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }}>
        <span>🤖 智能辅助驾驶（{source.name}）</span>
        {isRunning && (
          <span className='cb-soft'>运行中 · {MODE_LABEL[hzmDriveMode.value as Exclude<HzmDriveMode, 'off'>]}</span>
        )}
      </summary>

      <div className='cb-body cb-stack'>
        {/* 免责 */}
        <div
          className='cb-panel'
          style={{
            background: '#fff7e6',
            borderColor: '#d6b86a',
            color: '#a86',
            fontSize: '11px',
            lineHeight: 1.5,
          }}
        >
          前排提霉：独轮车工具无罪，请合理使用。开启即代表你已同意：本工具不为任何独轮车自动驾驶事故负责。 建议先用{' '}
          <b>dryRun</b> 试运行 5 分钟看效果。
        </div>

        {/* 主控行：开车按钮 + 模式按钮组 + dryRun */}
        <div className='cb-row'>
          <button
            type='button'
            className={isRunning ? 'cb-danger' : 'cb-primary'}
            onClick={toggleDrive}
            title={isRunning ? '点击停止智驾' : '点击启动智驾（默认启发式模式）'}
          >
            {isRunning ? '停车' : '开车'}
          </button>
          <span>模式</span>
          {(['heuristic', 'llm'] as const).map(m => (
            <button
              key={m}
              type='button'
              className={hzmDriveMode.value === m ? 'cb-primary' : ''}
              style={{
                fontSize: '11px',
                padding: '.15em .6em',
                opacity: isRunning ? 1 : 0.6,
              }}
              onClick={() => setMode(m)}
              title={
                m === 'heuristic'
                  ? '启发式：用关键词正则 + 偏好 tag 选梗，不调用 LLM。免费、稳定。'
                  : 'LLM 智驾：每 N 次 tick 用大模型选梗，其余仍走启发式。需要 API key。'
              }
            >
              {MODE_LABEL[m]}
            </button>
          ))}
          <span className='cb-row' style={{ marginLeft: '.5em' }}>
            <input
              id='hzmDryRun'
              type='checkbox'
              checked={hzmDryRun.value}
              onInput={e => {
                hzmDryRun.value = e.currentTarget.checked
              }}
            />
            <label for='hzmDryRun' title='只在日志显示候选，不真发到弹幕——新手强烈建议先开'>
              dryRun
            </label>
          </span>
        </div>

        {/* 节奏面板（仅运行时展开） */}
        {isRunning && (
          <div className='cb-panel cb-stack'>
            <div className='cb-row'>
              <span>间隔</span>
              <input
                type='number'
                min='3'
                max='120'
                style={{ width: '40px' }}
                value={hzmDriveIntervalSec.value}
                onInput={e => {
                  const v = parseInt(e.currentTarget.value, 10)
                  if (Number.isFinite(v) && v > 0) hzmDriveIntervalSec.value = v
                }}
                title='基础 tick 间隔（秒），实际加 0.7-1.5x 的随机抖动。建议 5-15。'
              />
              <span>秒，每分钟最多</span>
              <input
                type='number'
                min='1'
                max='20'
                style={{ width: '40px' }}
                value={hzmRateLimitPerMin.value}
                onInput={e => {
                  const v = parseInt(e.currentTarget.value, 10)
                  if (Number.isFinite(v) && v > 0) hzmRateLimitPerMin.value = v
                }}
                title='硬限速。同时开文字独轮车会叠加发送量，建议保持 ≤6 单独使用。'
              />
              <span>条</span>
              {hzmDriveMode.value === 'llm' && (
                <>
                  <span style={{ marginLeft: '.5em' }}>，LLM 每</span>
                  <input
                    type='number'
                    min='1'
                    max='10'
                    style={{ width: '36px' }}
                    value={hzmLlmRatio.value}
                    onInput={e => {
                      const v = parseInt(e.currentTarget.value, 10)
                      if (Number.isFinite(v) && v >= 1) hzmLlmRatio.value = v
                    }}
                    title='1=每次都用 LLM；3=每 3 次用 1 次（其它走启发式，省 API 费）'
                  />
                  <span>次</span>
                </>
              )}
            </div>

            {/* 偏好 / 黑名单 tag */}
            {tagOptions.length > 0 && (
              <>
                <div className='cb-row' style={{ flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '4em' }} title='只从勾选 tag 的梗里选；空 = 全部'>
                    偏好 tag
                  </span>
                  {tagOptions.map(t => (
                    <button
                      key={t}
                      type='button'
                      className='cb-tag'
                      onClick={() => toggleSelectedTag(t)}
                      style={{
                        padding: '.05em .4em',
                        background: selected.includes(t) ? '#10b981' : '#bbb',
                        border: 'none',
                        borderRadius: '2px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                <div className='cb-row' style={{ flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 'bold', minWidth: '4em' }} title='命中即跳过的 tag'>
                    黑名单
                  </span>
                  {tagOptions.map(t => (
                    <button
                      key={t}
                      type='button'
                      className='cb-tag'
                      onClick={() => toggleBlacklistTag(t)}
                      style={{
                        padding: '.05em .4em',
                        background: blacklist.includes(t) ? '#ef4444' : '#bbb',
                        border: 'none',
                        borderRadius: '2px',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '11px',
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 暂停关键词 */}
            <div className='cb-row'>
              <span style={{ fontWeight: 'bold', minWidth: '4em' }}>暂停词</span>
              <span style={{ fontSize: '10px', color: '#888' }}>
                每行一条正则；命中后 60s 不发。空 = 用默认（{pauseDefault || '无'}）
              </span>
            </div>
            <textarea
              rows={2}
              value={hzmPauseKeywordsOverride.value}
              onInput={e => {
                hzmPauseKeywordsOverride.value = e.currentTarget.value
              }}
              style={{ boxSizing: 'border-box', width: '100%', fontSize: '11px', resize: 'vertical' }}
              placeholder={(source.pauseKeywords ?? []).join('\n')}
            />

            {/* 统计 */}
            <div className='cb-row' style={{ fontSize: '11px', color: '#666' }}>
              今日已发：<b>{stats.sent}</b> 条 · LLM 调用：<b>{stats.llmCalls}</b> 次
            </div>

            {/* 文字独轮车互斥提示 */}
            {sendMsg.value && (
              <div
                className='cb-soft'
                style={{
                  padding: '.25em .4em',
                  background: '#fee',
                  border: '1px dashed #d33',
                  borderRadius: '3px',
                  color: '#a30',
                  fontSize: '11px',
                }}
              >
                ⚠️ 文字独轮车正在运行，与智驾叠加可能超出每分钟限速。建议先停一个。
              </div>
            )}
          </div>
        )}

        {/* LLM 设置（仅 mode=llm 显示） */}
        {hzmDriveMode.value === 'llm' && (
          <div className='cb-panel cb-stack'>
            <div className='cb-row' style={{ fontWeight: 'bold', fontSize: '11px' }}>
              LLM 设置
            </div>

            {/* Provider 按钮组 */}
            <div className='cb-row'>
              <span>Provider</span>
              {(['anthropic', 'openai', 'openai-compat'] as const).map(p => (
                <button
                  key={p}
                  type='button'
                  className={hzmLlmProvider.value === p ? 'cb-primary' : ''}
                  style={{ fontSize: '11px', padding: '.15em .5em' }}
                  onClick={() => {
                    hzmLlmProvider.value = p
                    testStatus.value = 'idle'
                  }}
                >
                  {PROVIDER_LABEL[p]}
                </button>
              ))}
            </div>

            {/* API key + 内联状态 */}
            <div className='cb-row'>
              <span style={{ minWidth: '4em' }}>API Key</span>
              <input
                type='password'
                value={hzmLlmApiKey.value}
                onInput={e => {
                  hzmLlmApiKey.value = e.currentTarget.value
                  testStatus.value = 'idle'
                }}
                placeholder='sk-... 或 anthropic key'
                style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}
              />
              <span
                style={{
                  fontSize: '11px',
                  color: apiKeyConfigured ? '#0a0' : '#888',
                  whiteSpace: 'nowrap',
                }}
              >
                {apiKeyConfigured ? `✅ ${maskKey(hzmLlmApiKey.value)}` : '⚪ 未配置'}
              </span>
            </div>

            {/* 模型 */}
            <div className='cb-row'>
              <span style={{ minWidth: '4em' }}>模型</span>
              <input
                type='text'
                value={hzmLlmModel.value}
                onInput={e => {
                  hzmLlmModel.value = e.currentTarget.value
                  testStatus.value = 'idle'
                }}
                placeholder='claude-haiku-4-5-20251001 / gpt-4o-mini / deepseek-chat'
                title='Anthropic 推荐 claude-haiku-4-5-20251001；OpenAI 推荐 gpt-4o-mini；DeepSeek 用 deepseek-chat'
                style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}
              />
            </div>

            {/* Base URL（仅 openai-compat 显示） */}
            {hzmLlmProvider.value === 'openai-compat' && (
              <div className='cb-row'>
                <span style={{ minWidth: '4em' }}>Base URL</span>
                <input
                  type='text'
                  value={hzmLlmBaseURL.value}
                  onInput={e => {
                    hzmLlmBaseURL.value = e.currentTarget.value
                    testStatus.value = 'idle'
                  }}
                  placeholder='https://api.deepseek.com（不带尾斜线，自动追加 /v1/chat/completions）'
                  title='DeepSeek=https://api.deepseek.com / Moonshot=https://api.moonshot.cn / OpenRouter=https://openrouter.ai/api'
                  style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}
                />
              </div>
            )}

            {/* 测试连接 */}
            <div className='cb-row'>
              <button
                type='button'
                disabled={!apiKeyConfigured || testStatus.value === 'testing'}
                onClick={() => void handleTestLLM()}
                title='发一个最小请求验证 key/路由能跑通；不消耗你的实际智驾配额'
              >
                {testStatus.value === 'testing' ? '测试中…' : '🧪 测试连接'}
              </button>
              {testStatus.value === 'ok' && <span style={{ color: '#0a0', fontSize: '11px' }}>✅ 连接成功</span>}
              {testStatus.value === 'fail' && (
                <span style={{ color: '#c00', fontSize: '11px', wordBreak: 'break-all' }}>❌ {testError.value}</span>
              )}
            </div>

            <div style={{ fontSize: '10px', color: '#a86', lineHeight: 1.4 }}>
              ⚠️ Key 明文保存在浏览器 GM 存储，泄露风险自担。openai-compat 自定义域首次调用时 Tampermonkey
              可能弹权限确认。
            </div>
          </div>
        )}
      </div>
    </details>
  )
}

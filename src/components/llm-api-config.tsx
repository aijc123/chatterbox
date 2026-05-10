import { useSignal } from '@preact/signals'

import {
  clearLlmApiKey,
  type LlmProvider,
  llmApiKey,
  llmApiKeyPersist,
  llmBaseURL,
  llmModel,
  llmProvider,
} from '../lib/store-llm'

/**
 * 共享 LLM API 配置面板。
 *
 * 历史背景：这套 UI 原本嵌在「智能辅助驾驶」(`HzmDrivePanel`) 里。但 HZM 面板
 * 受 `meme-sources` 注册表 gate（目前只有灰泽满 1713546334 房间会渲染），导致
 * 别的房间用户开了 YOLO 三档却找不到地方填 API key。这次抽出来：
 *  - 设置 → LLM 永远显示这块（凭证集中管理）
 *  - HZM 面板不再内嵌 API 配置，只读地显示状态 + 跳设置链接
 *
 * 排版策略：**label 在上、input 100% 宽占下一行的"堆叠"模式**。
 *
 * 历史教训：原版用 `cb-row` flex 把 label + input + 状态文字 + 清除按钮 4 个
 * 元素挤到一行，在 320px 宽的弹幕助手面板里 input 会被压到 ~80px，连
 * placeholder 都看不全；"OpenAI 兼容" segment 按钮文字也会被压成两行。这次
 * 改为 medal-check 风格的 stacked layout——label 短行在上、input 全宽在下、
 * 辅助按钮（清除 / 测试）也独占一行——保证 320px 内每个控件可读、可点。
 */

const PROVIDER_LABEL: Record<LlmProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  // "OpenAI 兼容"全称——配合下面 segment 的 minmax(94px) 列宽足够一行 fit，
  // 不会被压成 "OpenAI / 兼容" 那种破碎两行。
  'openai-compat': 'OpenAI 兼容',
}

const PROVIDER_TITLE: Record<LlmProvider, string> = {
  anthropic: 'Anthropic（推荐 claude-haiku-4-5-20251001）',
  openai: 'OpenAI（推荐 gpt-4o-mini）',
  'openai-compat': 'OpenAI 兼容（DeepSeek / Moonshot / OpenRouter / Ollama / 小米 mimo）',
}

/** 把 API key 显示成 `sk-1234…abcd` 这种半遮罩形态。 */
function maskKey(k: string): string {
  const trimmed = k.trim()
  if (trimmed.length <= 8) return trimmed ? `${trimmed[0]}***${trimmed.at(-1)}` : ''
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`
}

function modeButtonStyle(active: boolean) {
  return {
    fontWeight: active ? ('bold' as const) : undefined,
  }
}

const FIELD_LABEL_STYLE = { fontSize: '11px', fontWeight: 600, color: '#1d1d1f' }
const FIELD_HINT_STYLE = { fontSize: '11px', color: '#6e6e73' }
const STACK_STYLE = { display: 'grid', gap: '4px' }

export interface LlmApiConfigPanelProps {
  /**
   * 隐藏"测试连接"按钮——HZM 面板原本就没暴露这个功能；保留这里只是让设置面板
   * 用一份相同 UI 即可。`true` 默认显示。
   */
  showTestConnection?: boolean
}

export function LlmApiConfigPanel({ showTestConnection = true }: LlmApiConfigPanelProps) {
  const testStatus = useSignal<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const testError = useSignal<string>('')

  const apiKeyConfigured = llmApiKey.value.trim().length > 0

  const handleTestLLM = async () => {
    if (testStatus.value === 'testing') return
    testStatus.value = 'testing'
    testError.value = ''
    try {
      const { testLLMConnection } = await import('../lib/llm-driver')
      const r = await testLLMConnection({
        provider: llmProvider.value,
        apiKey: llmApiKey.value,
        model: llmModel.value,
        baseURL: llmBaseURL.value.trim() || undefined,
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

  const inputStyle = { boxSizing: 'border-box' as const, width: '100%' }

  return (
    <div className='cb-stack' style={{ margin: '.5em 0', gap: '10px' }}>
      {/* Provider —— segment 用 grid auto-fit minmax 自适应；窄宽不会把
          单个按钮文字压成两行，而是整体换行。 */}
      <div style={STACK_STYLE}>
        <span style={FIELD_LABEL_STYLE}>Provider</span>
        <div
          className='cb-segment'
          style={{
            // 关键：用 minmax 让按钮可换行成多行，但单个按钮文字不会被压成两行。
            // 94px 阈值挑得在 320px 弹幕助手面板里稳定 wrap 成 2+1 布局（多占
            // 30px 高度），保证"OpenAI 兼容"全文一行可读——尝试过 80/88px 单行
            // 三按钮，但 "OpenAI 兼容" 会被等分宽度（~88px）压成 "OpenAI 兼"+"容"
            // 两行；"含义清晰" 胜过 "紧凑"。
            gridTemplateColumns: 'repeat(auto-fit, minmax(94px, 1fr))',
            gridAutoFlow: 'row',
          }}
        >
          {(['anthropic', 'openai', 'openai-compat'] as const).map(p => (
            <button
              key={p}
              type='button'
              aria-pressed={llmProvider.value === p}
              style={modeButtonStyle(llmProvider.value === p)}
              title={PROVIDER_TITLE[p]}
              onClick={() => {
                llmProvider.value = p
                testStatus.value = 'idle'
              }}
            >
              {PROVIDER_LABEL[p]}
            </button>
          ))}
        </div>
      </div>

      {/* API Key —— input 单独占满一行；状态/清除做成下方 helper row。
          这样窄面板下密码框还能容纳 30+ 字符，不会被挤成 80px。 */}
      <div style={STACK_STYLE}>
        <span style={FIELD_LABEL_STYLE}>API Key</span>
        <input
          type='password'
          value={llmApiKey.value}
          onInput={e => {
            llmApiKey.value = e.currentTarget.value
            testStatus.value = 'idle'
          }}
          placeholder='sk-... 或 anthropic key'
          style={inputStyle}
          autocomplete='off'
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={FIELD_HINT_STYLE}>{apiKeyConfigured ? `已配置：${maskKey(llmApiKey.value)}` : '未配置'}</span>
          <button
            type='button'
            disabled={!apiKeyConfigured}
            onClick={() => {
              clearLlmApiKey()
              testStatus.value = 'idle'
            }}
            style={{ marginLeft: 'auto', fontSize: '11px' }}
            title='把 key 从内存和 GM 存储里都抹掉'
          >
            清除
          </button>
        </div>
        <label
          htmlFor='llmApiKeyPersist'
          style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', ...FIELD_HINT_STYLE, cursor: 'pointer' }}
        >
          <input
            id='llmApiKeyPersist'
            type='checkbox'
            checked={llmApiKeyPersist.value}
            onInput={e => {
              llmApiKeyPersist.value = e.currentTarget.checked
            }}
          />
          <span title='不勾：key 仅留在内存，刷新页面就清空，GM 存储里的旧值也立即抹掉'>
            保存到 GM 存储（关闭后仅本次会话有效）
          </span>
        </label>
      </div>

      <div style={STACK_STYLE}>
        <span style={FIELD_LABEL_STYLE}>模型</span>
        <input
          type='text'
          value={llmModel.value}
          onInput={e => {
            llmModel.value = e.currentTarget.value
            testStatus.value = 'idle'
          }}
          placeholder='例：claude-haiku-4-5-20251001'
          title='Anthropic 推荐 claude-haiku-4-5-20251001；OpenAI 推荐 gpt-4o-mini；DeepSeek 用 deepseek-chat'
          style={inputStyle}
        />
      </div>

      {llmProvider.value === 'openai-compat' && (
        <div style={STACK_STYLE}>
          <span style={FIELD_LABEL_STYLE}>Base URL</span>
          <input
            type='text'
            value={llmBaseURL.value}
            onInput={e => {
              llmBaseURL.value = e.currentTarget.value
              testStatus.value = 'idle'
            }}
            placeholder='https://api.deepseek.com'
            title='DeepSeek=https://api.deepseek.com / Moonshot=https://api.moonshot.cn / OpenRouter=https://openrouter.ai/api / 小米 mimo=https://token-plan-sgp.xiaomimimo.com/v1'
            style={inputStyle}
          />
          <span style={FIELD_HINT_STYLE}>带不带 /v1 都行，自动补全到 /v1/chat/completions。</span>
        </div>
      )}

      {showTestConnection && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <button
            type='button'
            disabled={!apiKeyConfigured || testStatus.value === 'testing'}
            onClick={() => void handleTestLLM()}
            title='发一个最小请求验证 key/路由能跑通；不消耗你的实际配额'
          >
            {testStatus.value === 'testing' ? '测试中…' : '测试连接'}
          </button>
          {testStatus.value === 'ok' && (
            <span className='cb-soft' style={{ color: '#0a7f55' }}>
              连接成功
            </span>
          )}
          {testStatus.value === 'fail' && (
            <span style={{ color: '#c00', fontSize: '11px', wordBreak: 'break-all', flex: '1 1 100%' }}>
              连接失败：{testError.value}
            </span>
          )}
        </div>
      )}

      <div className='cb-note' style={{ color: '#a15c00' }}>
        {llmApiKeyPersist.value
          ? 'Key 明文保存在浏览器 GM 存储；共用电脑或备份导出会暴露。担心可关掉「保存到 GM 存储」改为仅本会话。'
          : 'Key 仅留在内存，刷新页面后清空。'}
        openai-compat 自定义域首次调用时 Tampermonkey 会弹权限确认，需手动允许。
      </div>
    </div>
  )
}

/**
 * 紧凑摘要：用在已经显示了配置面板的别处（例如 HZM 面板）作为状态指示，
 * 不重复一份完整 UI。点 anchor 跳转到设置面板。
 */
export function LlmApiConfigSummary({ onJumpToSettings }: { onJumpToSettings?: () => void }) {
  const apiKeyConfigured = llmApiKey.value.trim().length > 0
  const baseLabel = llmProvider.value === 'openai-compat' ? llmBaseURL.value.trim() || '未填 base URL' : ''
  return (
    <div className='cb-panel' style={{ display: 'grid', gap: '4px' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', flexWrap: 'wrap' }}>
        <strong>LLM</strong>
        {apiKeyConfigured ? (
          <span className='cb-soft' style={{ color: '#0a7f55' }}>
            已配置
          </span>
        ) : (
          <span style={{ color: '#c00' }}>未配置</span>
        )}
        {onJumpToSettings && (
          <button
            type='button'
            style={{
              marginLeft: 'auto',
              background: 'none',
              border: 'none',
              padding: 0,
              color: '#1677ff',
              cursor: 'pointer',
              fontSize: '11px',
            }}
            onClick={onJumpToSettings}
          >
            在设置中配置 →
          </button>
        )}
      </div>
      {apiKeyConfigured && (
        <div className='cb-soft' style={{ wordBreak: 'break-all', fontSize: '11px' }}>
          {PROVIDER_TITLE[llmProvider.value].split('（')[0]} · {maskKey(llmApiKey.value)} ·{' '}
          {llmModel.value || '未填模型'}
          {baseLabel && ` · ${baseLabel}`}
        </div>
      )}
    </div>
  )
}

import { sendManualDanmaku } from '../lib/danmaku-actions'
import { describeLlmGap } from '../lib/llm-polish'
import {
  aiEvasion,
  customChatEnabled,
  fasongText,
  llmActivePromptNormalSend,
  llmPromptsNormalSend,
  normalSendYolo,
} from '../lib/store'
import { PromptPicker } from './prompt-picker'
import { SendActions } from './send-actions'

export function NormalSendTab() {
  if (customChatEnabled.value) return null

  const sendMessage = async () => {
    const sent = await sendManualDanmaku(fasongText.value)
    if (sent) {
      fasongText.value = ''
    }
  }

  return (
    <details open>
      <summary style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }}>
        <span>常规发送</span>
      </summary>
      <div className='cb-body cb-stack'>
        <div style={{ position: 'relative' }} data-cb-send-tab-anchor>
          <textarea
            data-cb-send-tab-textarea
            value={fasongText.value}
            onInput={e => {
              fasongText.value = e.currentTarget.value
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
                e.preventDefault()
                void sendMessage()
              }
            }}
            placeholder='输入弹幕内容... (Enter 发送)'
            style={{
              boxSizing: 'border-box',
              height: '50px',
              minHeight: '40px',
              width: '100%',
              resize: 'vertical',
            }}
          />
          <div
            style={{
              position: 'absolute',
              right: '8px',
              bottom: '6px',
              color: '#999',
              pointerEvents: 'none',
            }}
          >
            {fasongText.value.length}
          </div>
        </div>
        <div className='cb-row' style={{ display: 'flex', alignItems: 'center', gap: '.5em' }}>
          <SendActions onSend={msg => void sendManualDanmaku(msg)} />
          <button
            type='button'
            className='cb-primary'
            onClick={() => void sendMessage()}
            style={{ marginLeft: 'auto' }}
          >
            发送
          </button>
        </div>
        <div className='cb-row' style={{ display: 'flex', flexDirection: 'column', gap: '.15em' }}>
          <span className='cb-row'>
            <input
              id='aiEvasion'
              type='checkbox'
              checked={aiEvasion.value}
              onInput={e => {
                aiEvasion.value = e.currentTarget.checked
              }}
            />
            <label
              htmlFor='aiEvasion'
              title='发送失败时，弹幕文本会发到 edge-workers.laplace.cn 进行敏感词检测和改写，再尝试重新发送。详见 关于 → 隐私说明。'
            >
              AI规避（发送失败时自动检测敏感词并重试）
            </label>
          </span>
          {aiEvasion.value && (
            <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', paddingLeft: '1.4em' }}>
              开启后，发送失败的弹幕文本会发到 edge-workers.laplace.cn 改写。详见 关于 → 隐私说明。
            </div>
          )}

          <span className='cb-row' style={{ flexWrap: 'wrap', gap: '.25em' }}>
            <input
              id='normalSendYolo'
              type='checkbox'
              checked={normalSendYolo.value}
              onInput={e => {
                normalSendYolo.value = e.currentTarget.checked
              }}
            />
            <label
              htmlFor='normalSendYolo'
              title='YOLO：手动发送的文本先送 LLM 润色再发。失败时回退原文。LLM 配置复用「智能辅助驾驶」。'
            >
              🤖 YOLO（LLM 润色后再发）
            </label>
            <PromptPicker
              prompts={llmPromptsNormalSend.value}
              activeIndex={llmActivePromptNormalSend.value}
              onActiveIndexChange={i => {
                llmActivePromptNormalSend.value = i
              }}
              previewGraphemes={12}
              className='lc-min-w-[120px] lc-max-w-[180px] lc-truncate'
              title='当前提示词（在「设置 → LLM 提示词 → 常规发送」里管理）'
              emptyText='暂无提示词，请到设置里添加'
              disabled={!normalSendYolo.value}
            />
          </span>
          {normalSendYolo.value && (
            <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', paddingLeft: '1.4em' }}>
              {describeLlmGap('normalSend') ?? '已就绪：手动发送的文本会先用 LLM 润色（产生 token 消耗）。'}
            </div>
          )}
        </div>
      </div>
    </details>
  )
}

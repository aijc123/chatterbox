import { sendManualDanmaku } from '../lib/danmaku-actions'
import { aiEvasion, customChatEnabled, fasongText } from '../lib/store'
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
        </div>
      </div>
    </details>
  )
}

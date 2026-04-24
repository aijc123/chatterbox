import { signal } from '@preact/signals'

import { sendManualDanmaku } from '../lib/danmaku-actions'
import { aiEvasion, customChatEnabled, fasongText } from '../lib/store'

const open = signal(true)

export function NormalSendTab() {
  if (customChatEnabled.value) return null

  const sendMessage = async () => {
    const sent = await sendManualDanmaku(fasongText.value)
    if (sent) {
      fasongText.value = ''
    }
  }

  return (
    <div className='cb-section cb-stack' style={{ marginBottom: '.5em' }}>
      <div
        className='cb-heading'
        style={{
          fontWeight: 'bold',
          marginBottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <span>常规发送</span>
        <button
          type='button'
          onClick={() => {
            open.value = !open.value
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '0 4px',
            fontSize: '12px',
            color: 'inherit',
          }}
        >
          {open.value ? '▼' : '▶'}
        </button>
      </div>
      {open.value && (
        <div className='cb-body cb-stack'>
          <div style={{ position: 'relative' }}>
            <textarea
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
          <div className='cb-row'>
            <button type='button' className='cb-primary' onClick={() => void sendMessage()}>
              发送
            </button>
          </div>
          <div className='cb-row'>
            <span className='cb-row'>
              <input
                id='aiEvasion'
                type='checkbox'
                checked={aiEvasion.value}
                onInput={e => {
                  aiEvasion.value = e.currentTarget.checked
                }}
              />
              <label for='aiEvasion'>AI规避（发送失败时自动检测敏感词并重试）</label>
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

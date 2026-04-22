import { useEffect, useRef } from 'preact/hooks'

import { logLines, maxLogLines } from '../lib/log'
import { logPanelFocusRequest, logPanelOpen } from '../lib/store'

export function LogPanel() {
  const detailsRef = useRef<HTMLDetailsElement>(null)
  const ref = useRef<HTMLTextAreaElement>(null)

  const scrollToBottom = () => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }

  useEffect(() => {
    scrollToBottom()
  }, [logLines.value])

  useEffect(() => {
    if (logPanelFocusRequest.value <= 0) return
    detailsRef.current?.scrollIntoView({ block: 'nearest' })
    scrollToBottom()
    ref.current?.focus()
  }, [logPanelFocusRequest.value])

  return (
    <details
      ref={detailsRef}
      open={logPanelOpen.value}
      onToggle={e => {
        logPanelOpen.value = e.currentTarget.open
      }}
      style={{ marginTop: '.25em' }}
    >
      <summary style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }}>日志</summary>
      <div className='cb-body'>
        <textarea
          ref={ref}
          readOnly
          value={logLines.value.join('\n')}
          placeholder={`此处将输出日志（最多保留 ${maxLogLines.value} 条）`}
          style={{
            boxSizing: 'border-box',
            height: '60px',
            width: '100%',
            resize: 'vertical',
            marginTop: '.5em',
          }}
        />
      </div>
    </details>
  )
}

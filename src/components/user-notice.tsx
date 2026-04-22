import { userNotice } from '../lib/log'
import { logPanelFocusRequest, logPanelOpen } from '../lib/store'

export function UserNotice() {
  const notice = userNotice.value
  if (!notice) return null

  const toneColor = notice.tone === 'error' ? '#ff3b30' : '#a15c00'
  const showLog = () => {
    logPanelOpen.value = true
    logPanelFocusRequest.value += 1
  }

  return (
    <div
      role='status'
      aria-live='polite'
      style={{
        position: 'fixed',
        right: '8px',
        bottom: '86px',
        zIndex: 2147483647,
        width: 'min(360px, calc(100vw - 16px))',
        border: `1px solid ${toneColor}`,
        borderRadius: '8px',
        background: 'rgba(255, 255, 255, .94)',
        color: '#1d1d1f',
        boxShadow: '0 18px 48px rgba(0,0,0,.22)',
        backdropFilter: 'blur(22px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
        padding: '9px 10px',
        fontSize: '12px',
        lineHeight: 1.45,
        wordBreak: 'break-word',
      }}
    >
      <div style={{ color: toneColor, fontWeight: 650, marginBottom: '2px' }}>
        {notice.tone === 'error' ? '操作失败' : '需要注意'}
      </div>
      <div>{notice.message}</div>
      <button
        type='button'
        onClick={showLog}
        style={{
          marginTop: '7px',
          minHeight: '24px',
          border: `1px solid ${toneColor}`,
          borderRadius: '8px',
          background: '#fff',
          color: toneColor,
          padding: '3px 8px',
          cursor: 'pointer',
          fontWeight: 650,
        }}
      >
        查看日志
      </button>
    </div>
  )
}

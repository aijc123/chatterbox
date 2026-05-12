import { userNotices } from '../lib/log'
import { logPanelFocusRequest, logPanelOpen } from '../lib/store'

export function UserNotice() {
  const notices = userNotices.value
  if (notices.length === 0) return null

  const showLog = () => {
    logPanelOpen.value = true
    logPanelFocusRequest.value += 1
  }

  return (
    <div
      style={{
        position: 'fixed',
        right: '8px',
        bottom: '86px',
        zIndex: 2147483647,
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        width: 'min(360px, calc(100vw - 16px))',
      }}
    >
      {notices.map(notice => {
        const toneColor =
          notice.tone === 'error'
            ? '#ff3b30'
            : notice.tone === 'warning'
              ? '#a15c00'
              : notice.tone === 'success'
                ? '#168a45'
                : '#2563eb'
        const title =
          notice.tone === 'error'
            ? '操作失败'
            : notice.tone === 'warning'
              ? '需要注意'
              : notice.tone === 'success'
                ? '操作成功'
                : '提示'

        return (
          <div
            key={notice.id}
            role='status'
            aria-live='polite'
            className='cb-floating-surface'
            style={{
              borderColor: toneColor,
              padding: '9px 10px',
              fontSize: '12px',
              lineHeight: 1.45,
              wordBreak: 'break-word',
            }}
          >
            <div style={{ color: toneColor, fontWeight: 650, marginBottom: '2px' }}>{title}</div>
            <div>{notice.message}</div>
            <button
              type='button'
              onClick={showLog}
              className='cb-floating-notice-btn'
              style={{
                marginTop: '7px',
                minHeight: '24px',
                border: `1px solid ${toneColor}`,
                borderRadius: '8px',
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
      })}
    </div>
  )
}

import { useSignal } from '@preact/signals'
import { useRef } from 'preact/hooks'

import { EmotePicker } from './emote-picker'

interface SendActionsProps {
  onSend: (msg: string) => void
}

const iconBtnStyle = {
  width: '28px',
  height: '28px',
  padding: 0,
  border: '1px solid var(--Ga2, #ddd)',
  borderRadius: '999px',
  background: 'var(--bg2, #f5f5f5)',
  cursor: 'pointer',
  fontSize: '14px',
  lineHeight: 1,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
} as const

// TODO: 点赞 / 醒目留言（SC）的「即将上线」占位按钮删了——它们之前以 opacity 40%
// 灰显在 composer 上，但点了只 toast「即将上线」，纯属 UI 噪声。等真正接入
// `xlive/app-ucenter/v1/like_info_v3/Like` 和 `xlive/revenue/v1/order/createOrder`
// 后再放回 composer，不要先 ship 占位。
//
// 历史接入笔记：
//   - 点赞 anti_token 由页面 __BILI_LIKE_INFO__ 或 fetch-hijack 拿，每次轮换
//   - SC 拿二维码 URL → 弹窗 → 轮询订单状态；不能做成「一键」体验

export function SendActions({ onSend }: SendActionsProps) {
  const open = useSignal(false)
  const anchorRef = useRef<HTMLButtonElement>(null)

  return (
    <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center' }}>
      <button
        ref={anchorRef}
        type='button'
        title='表情'
        onClick={() => {
          open.value = !open.value
        }}
        style={iconBtnStyle}
      >
        😀
      </button>
      <EmotePicker
        open={open}
        anchorRef={anchorRef}
        onSend={onSend}
        onClose={() => {
          open.value = false
        }}
      />
    </div>
  )
}

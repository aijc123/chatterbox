import { useSignal } from '@preact/signals'
import { useRef } from 'preact/hooks'

import { notifyUser } from '../lib/log'
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

// TODO: real like + SuperChat support
// 点赞: api.live.bilibili.com/xlive/app-ucenter/v1/like_info_v3/Like
//   或 web 端 likeReportV3 RPC，参数: anti_token / csrf / room_id / click_time。
//   建议放 src/lib/api.ts 的 sendLike(roomId)；anti_token 由页面
//   __BILI_LIKE_INFO__ 或 fetch-hijack 拦截获取，每次会轮换。
// SC: xlive/revenue/v1/order/createOrder → 拿到二维码 URL → 弹窗显示 →
//   轮询订单状态。要求账号有钱包余额且通过支付宝/微信扫码，无法做成
//   「一键」体验。占位先 toast，后续可改成原生 Bilibili 对话框或自建确认 modal。

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
      <button
        type='button'
        title='点赞 — 即将上线'
        onClick={() => notifyUser('info', '点赞功能即将上线')}
        style={{ ...iconBtnStyle, opacity: 0.4, cursor: 'not-allowed' }}
        aria-disabled='true'
      >
        👍
      </button>
      <button
        type='button'
        title='醒目留言 SC — 即将上线'
        onClick={() => notifyUser('info', '醒目留言 (SC) 功能即将上线')}
        style={{ ...iconBtnStyle, opacity: 0.4, cursor: 'not-allowed' }}
        aria-disabled='true'
      >
        💰
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

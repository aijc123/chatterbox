import { useCallback, useRef, useState } from 'preact/hooks'

import { dialogOpen, sendMsg } from '../lib/store'

export function ToggleButton() {
  const [pressed, setPressed] = useState(false)
  const btnRef = useRef<HTMLButtonElement>(null)

  const toggle = useCallback(() => {
    dialogOpen.value = !dialogOpen.value
  }, [])

  const sending = sendMsg.value
  const open = dialogOpen.value

  return (
    <button
      ref={btnRef}
      type='button'
      id='laplace-chatterbox-toggle'
      data-open={open}
      data-sending={sending}
      onClick={toggle}
      onPointerDown={() => setPressed(true)}
      onPointerUp={() => setPressed(false)}
      onPointerLeave={() => setPressed(false)}
      style={{
        appearance: 'none',
        outline: 'none',
        border: '1px solid rgba(255, 255, 255, .42)',
        borderRadius: '999px',
        minHeight: '30px',
        padding: '0 12px',
        background: sending ? 'rgba(0, 186, 143, .88)' : 'rgba(30, 30, 30, .78)',
        color: '#fff',
        boxShadow: '0 10px 28px rgba(0, 0, 0, .22), inset 0 1px rgba(255, 255, 255, .22)',
        backdropFilter: 'blur(18px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(18px) saturate(1.4)',
        transform: pressed ? 'scale(0.96)' : open ? 'scale(1.06)' : 'scale(1)',
        transition: 'transform .2s ease, background .2s ease',
        cursor: 'pointer',
        userSelect: 'none',
        position: 'fixed',
        right: '8px',
        bottom: '8px',
        zIndex: 2147483647,
      }}
    >
      弹幕助手
    </button>
  )
}

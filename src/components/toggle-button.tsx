import { useCallback, useRef } from 'preact/hooks'

import { dialogOpen, sendMsg } from '../lib/store'

export function ToggleButton() {
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
      style={{
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

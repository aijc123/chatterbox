import { useCallback, useEffect, useRef } from 'preact/hooks'

import { dialogOpen, sendMsg } from '../lib/store'

export function ToggleButton() {
  const btnRef = useRef<HTMLButtonElement>(null)

  const toggle = useCallback(() => {
    dialogOpen.value = !dialogOpen.value
  }, [])

  // Esc closes the panel from anywhere on the page (capture phase so we run
  // before Bilibili's own Esc handlers that close their popovers). Only acts
  // when the panel is open AND focus is not currently inside an editable
  // field, so users can still hit Esc to clear an input without dismissing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (!dialogOpen.value) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return
      e.stopPropagation()
      dialogOpen.value = false
      btnRef.current?.focus()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
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
      aria-label={open ? '关闭弹幕助手面板（按 Esc 关闭）' : '打开弹幕助手面板'}
      aria-expanded={open}
      aria-controls='laplace-chatterbox-dialog'
      title={open ? 'Esc 关闭面板' : '点击打开弹幕助手'}
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

import { useCallback, useEffect, useRef } from 'preact/hooks'

import { activeTab, dialogOpen, sendMsg } from '../lib/store'

export function ToggleButton() {
  const btnRef = useRef<HTMLButtonElement>(null)

  const toggle = useCallback(() => {
    dialogOpen.value = !dialogOpen.value
  }, [])

  // Esc 两阶段行为（capture phase，抢在 B 站自己的 Esc handler 之前）：
  //   1) 当前在设置/关于子页 → Esc 先返回主页（不关面板）。这是抽屉式导航的标准
  //      退路；用户通常想"退回上一层"，而不是"一键关掉整个面板"。
  //   2) 在主页（或已经在主页）→ Esc 关掉面板。
  //
  // 焦点在 input/textarea/select 等可编辑控件时不响应——用户清输入框的 Esc
  // 应该让默认行为通过。
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (!dialogOpen.value) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || target?.isContentEditable) return
      // 在子页面：第一次 Esc 返回主页。
      if (activeTab.value === 'settings' || activeTab.value === 'about') {
        e.stopPropagation()
        activeTab.value = 'fasong'
        return
      }
      // 在主页：Esc 关闭面板。
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

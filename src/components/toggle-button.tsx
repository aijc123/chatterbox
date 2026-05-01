import { useComputed } from '@preact/signals'

import { dialogOpen, sendMsg } from '../lib/store'

export function ToggleButton() {
  const bg = useComputed(() => (sendMsg.value ? 'rgb(0 186 143)' : '#777'))

  const toggle = () => {
    dialogOpen.value = !dialogOpen.value
  }

  return (
    <button
      type='button'
      id='laplace-chatterbox-toggle'
      onClick={toggle}
      className='lc-fixed lc-right-2 lc-bottom-2 lc-z-[2147483647] lc-cursor-pointer lc-select-none'
      style={{
        appearance: 'none',
        outline: 'none',
        border: 'none',
        background: bg.value,
        color: 'white',
        padding: '6px 8px',
        borderRadius: '4px',
        userSelect: 'none',
      }}
    >
      弹幕助手
    </button>
  )
}

import { dialogOpen, sendMsg } from '../lib/store'

export function ToggleButton() {
  const toggle = () => {
    dialogOpen.value = !dialogOpen.value
  }

  return (
    <button
      type='button'
      id='laplace-chatterbox-toggle'
      data-open={dialogOpen.value}
      data-sending={sendMsg.value}
      onClick={toggle}
      className='lc-fixed lc-right-2 lc-bottom-2 lc-z-[2147483647] lc-cursor-pointer lc-select-none'
    >
      弹幕助手
    </button>
  )
}

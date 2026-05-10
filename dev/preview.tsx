/**
 * 独立浏览器预览入口——专门用来做面板 UI 视觉回归。
 *
 * 不挂 main.tsx 里的 hostname=live.bilibili.com 守门，也不走 userscript 包装。
 * 直接 mock GM_*（用 sessionStorage 当后端，不污染真实 localStorage），
 * 然后挂载完整的 <App />。
 *
 * 使用方法：`bun run dev`，然后浏览器打开 `http://localhost:5173/dev/preview.html`
 * 点击「打开面板」按钮即可。专门用来调 LLM API 配置面板这种容易溢出的窄宽 UI。
 */

import { render } from 'preact'

import 'virtual:uno.css'

// 必须在 import App / 任何 store-* 之前 mock，否则 gmSignal 模块加载时会报
// `GM_getValue is not defined`。
const memory = new Map<string, unknown>()
const w = window as unknown as Record<string, unknown>
w.GM_getValue = function getValue<T>(key: string, defaultValue?: T): T | undefined {
  if (memory.has(key)) return memory.get(key) as T
  return defaultValue
}
w.GM_setValue = (key: string, value: unknown) => {
  memory.set(key, value)
}
w.GM_deleteValue = (key: string) => {
  memory.delete(key)
}
w.GM_addStyle = (css: string) => {
  const tag = document.createElement('style')
  tag.textContent = css
  document.head.append(tag)
}
w.GM_xmlhttpRequest = () => {
  /* no-op for visual preview */
}
w.GM_info = { script: { version: 'preview' } }
w.unsafeWindow = window

// chatterbox 的 fetch-hijack 在 import 时会改 XHR 原型——预览模式我们不希望它跑。
// 用一个空 noop 模块 stub 在 import map 里就够，但 main.tsx 里直接 import 的，
// 这里换成另一种策略：让 store-* 模块直接被加载，但不导入 fetch-hijack。
// → 我们绕开 main.tsx 的 mount 逻辑，直接 import App。

const { App } = await import('../src/components/app')

const mountAt = document.getElementById('preview-frame')
if (!mountAt) throw new Error('#preview-frame 元素未找到')
render(<App />, mountAt)

// 控制按钮
const dialogQuery = '#laplace-chatterbox-dialog'
const toggleBtnQuery = '[data-cb-toggle-button]'

document.getElementById('btn-open')?.addEventListener('click', () => {
  const tb = document.querySelector<HTMLButtonElement>(toggleBtnQuery)
  if (tb) tb.click()
  // 如果没找到就直接强制可见
  setTimeout(() => {
    const dlg = document.querySelector<HTMLElement>(dialogQuery)
    if (dlg) dlg.style.display = 'block'
  }, 100)
})

function jumpToTab(tabId: string) {
  const tabs = document.querySelectorAll<HTMLButtonElement>(`${dialogQuery} [role='tab']`)
  for (const t of tabs) {
    if (t.textContent?.trim().startsWith(tabId)) {
      t.click()
      return
    }
  }
}

document.getElementById('btn-settings')?.addEventListener('click', () => jumpToTab('设置'))
document.getElementById('btn-fasong')?.addEventListener('click', () => jumpToTab('发送'))

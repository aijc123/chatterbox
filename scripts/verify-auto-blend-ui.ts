import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const DIST_USER_SCRIPT = join(ROOT, 'dist', 'laplace-chatterbox.user.js')
const SCREENSHOT_PATH = join(ROOT, 'auto-blend-ui-bilibili.png')
const DEBUG_PORT = 9333
const LIVE_URL = 'https://live.bilibili.com/'

function findChrome(): string {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ]
  const found = candidates.find(existsSync)
  if (!found) throw new Error('Chrome/Edge executable not found')
  return found
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${url} failed: ${res.status}`)
  return res.json() as Promise<T>
}

async function waitForDebugTarget(): Promise<string> {
  for (let i = 0; i < 80; i++) {
    try {
      const target = await fetchJson<{ webSocketDebuggerUrl: string }>(
        `http://127.0.0.1:${DEBUG_PORT}/json/new?${encodeURIComponent('about:blank')}`,
        { method: 'PUT' }
      )
      return target.webSocketDebuggerUrl
    } catch {
      await sleep(250)
    }
  }
  throw new Error('Chrome DevTools endpoint did not start')
}

function createCdp(wsUrl: string) {
  const ws = new WebSocket(wsUrl)
  let nextId = 1
  const pending = new Map<number, { resolve: (value: unknown) => void; reject: (err: Error) => void }>()
  const listeners = new Map<string, Array<(params: unknown) => void>>()

  ws.addEventListener('message', event => {
    const msg = JSON.parse(String(event.data))
    if (typeof msg.id === 'number') {
      const item = pending.get(msg.id)
      if (!item) return
      pending.delete(msg.id)
      if (msg.error) item.reject(new Error(msg.error.message ?? JSON.stringify(msg.error)))
      else item.resolve(msg.result)
      return
    }
    const handlers = listeners.get(msg.method)
    if (handlers) for (const handler of handlers) handler(msg.params)
  })

  return {
    async open() {
      if (ws.readyState === WebSocket.OPEN) return
      await new Promise<void>((resolve, reject) => {
        ws.addEventListener('open', () => resolve(), { once: true })
        ws.addEventListener('error', () => reject(new Error('WebSocket connection failed')), { once: true })
      })
    },
    send<T = unknown>(method: string, params: Record<string, unknown> = {}): Promise<T> {
      const id = nextId++
      ws.send(JSON.stringify({ id, method, params }))
      return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
    },
    once(method: string): Promise<unknown> {
      return new Promise(resolve => {
        const list = listeners.get(method) ?? []
        list.push(params => resolve(params))
        listeners.set(method, list)
      })
    },
    close() {
      ws.close()
    },
  }
}

async function main(): Promise<void> {
  const script = readFileSync(DIST_USER_SCRIPT, 'utf8')
  const chrome = findChrome()
  const userDataDir = mkdtempSync(join(tmpdir(), 'chatterbox-ui-'))
  const proc = Bun.spawn([
    chrome,
    `--remote-debugging-port=${DEBUG_PORT}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    'about:blank',
  ])

  try {
    const wsUrl = await waitForDebugTarget()
    const cdp = createCdp(wsUrl)
    await cdp.open()
    await cdp.send('Page.enable')
    await cdp.send('Runtime.enable')
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: false,
    })

    const loaded = cdp.once('Page.loadEventFired')
    await cdp.send('Page.navigate', { url: LIVE_URL })
    await loaded
    await sleep(2500)

    const mocks = `
      window.GM_getValue = (key, fallback) => fallback;
      window.GM_setValue = () => {};
      window.GM_deleteValue = () => {};
      window.GM_info = { script: { version: 'verify' } };
      window.unsafeWindow = window;
      window.SonioxSpeechToTextWeb = {};
    `
    await cdp.send('Runtime.evaluate', { expression: mocks, awaitPromise: true })
    await cdp.send('Runtime.evaluate', {
      expression: `${script}\n//# sourceURL=laplace-chatterbox.user.js`,
      awaitPromise: true,
    })

    await sleep(500)
    const result = await cdp.send<{
      result: {
        value: {
          url: string
          dialogWidth: number
          dialogHeight: number
          text: string
          overflowing: Array<{ text: string; tag: string; scrollWidth: number; clientWidth: number }>
        }
      }
    }>('Runtime.evaluate', {
      awaitPromise: true,
      returnByValue: true,
      expression: `
        (async () => {
          const waitFor = async selector => {
            for (let i = 0; i < 40; i++) {
              const el = document.querySelector(selector);
              if (el) return el;
              await new Promise(r => setTimeout(r, 100));
            }
            throw new Error('missing ' + selector);
          };
          const toggle = await waitFor('#laplace-chatterbox-toggle');
          toggle.click();
          const dialog = await waitFor('#laplace-chatterbox-dialog');
          const autoSummary = [...document.querySelectorAll('summary')].find(el => el.textContent.includes('自动跟车'));
          if (!autoSummary) throw new Error('auto-follow summary missing');
          if (!autoSummary.parentElement.open) autoSummary.click();
          const start = [...dialog.querySelectorAll('button')].find(el => el.textContent.trim() === '开始跟车');
          if (!start) throw new Error('start button missing');
          start.click();
          const waitButton = async text => {
            for (let i = 0; i < 20; i++) {
              const button = [...dialog.querySelectorAll('button')].find(el => el.textContent.trim() === text);
              if (button) return button;
              await new Promise(r => setTimeout(r, 50));
            }
            return null;
          };
          const stop = await waitButton('停止跟车');
          if (!stop) throw new Error('stop button missing after start');
          stop.click();
          const startAgain = await waitButton('开始跟车');
          if (!startAgain) throw new Error('start button missing after stop');
          for (const text of ['稳一点', '正常', '热闹']) {
            const button = [...dialog.querySelectorAll('button')].find(el => el.textContent.trim() === text);
            if (!button) throw new Error('mode missing: ' + text);
            button.click();
          }
          const rect = dialog.getBoundingClientRect();
          const overflowing = [...dialog.querySelectorAll('*')]
            .filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible')
            .map(el => ({ text: el.textContent.trim().slice(0, 40), tag: el.tagName, scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
          return {
            url: location.href,
            dialogWidth: Math.round(rect.width),
            dialogHeight: Math.round(rect.height),
            text: dialog.innerText,
            overflowing,
          };
        })()
      `,
    })

    const ui = result.result.value
    if (ui.dialogWidth > 302) throw new Error(`dialog too wide: ${ui.dialogWidth}`)
    if (!ui.text.includes('自动跟车')) throw new Error('auto-follow title not visible')
    if (!ui.text.includes('开始跟车')) throw new Error('start button not visible after stop')
    if (!ui.text.includes('稳一点') || !ui.text.includes('正常') || !ui.text.includes('热闹')) {
      throw new Error('mode buttons not visible')
    }
    if (ui.overflowing.length > 0) {
      throw new Error(`text overflow detected: ${JSON.stringify(ui.overflowing)}`)
    }

    const screenshot = await cdp.send<{ data: string }>('Page.captureScreenshot', { format: 'png', fromSurface: true })
    writeFileSync(SCREENSHOT_PATH, Buffer.from(screenshot.data, 'base64'))
    console.log(`PASS loaded ${ui.url}`)
    console.log(`PASS dialog ${ui.dialogWidth}x${ui.dialogHeight}, no clipped text`)
    console.log(`PASS screenshot ${SCREENSHOT_PATH}`)
    cdp.close()
  } finally {
    proc.kill()
    await proc.exited.catch(() => {})
    rmSync(userDataDir, { recursive: true, force: true })
  }
}

main().catch(err => {
  console.error(`FAIL ${err instanceof Error ? err.message : String(err)}`)
  process.exit(1)
})

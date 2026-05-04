import { render } from 'preact'

import 'virtual:uno.css'
import './lib/fetch-hijack'

import { App } from './components/app'
import { warnIfDegraded } from './lib/platform'

function mount() {
  const app = document.createElement('div')
  document.body.append(app)
  render(<App />, app)
}

const isLiveHost = location.hostname === 'live.bilibili.com'

// The userscript runs at document-start so the WBI XHR interceptor (wbi.ts)
// can patch XMLHttpRequest before the page fires /x/web-interface/nav.
// At that point document.body may not exist yet, so we defer mounting until
// the browser creates <body>.
if (isLiveHost) {
  // Surface a single console warning when we detect a mobile UA. Users on
  // unsupported platforms get an up-front explanation in their bug reports
  // instead of mysterious "button didn't work" tickets.
  warnIfDegraded()
  if (document.body) {
    mount()
  } else {
    const observer = new MutationObserver(() => {
      if (document.body) {
        observer.disconnect()
        mount()
      }
    })
    observer.observe(document.documentElement, { childList: true })
  }
}

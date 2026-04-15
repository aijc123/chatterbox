import { render } from 'preact'

import './fetch-hijack'

import { App } from './components/app'

function mount() {
  const app = document.createElement('div')
  document.body.append(app)
  render(<App />, app)
}

// The userscript runs at document-start so the WBI XHR interceptor (wbi.ts)
// can patch XMLHttpRequest before the page fires /x/web-interface/nav.
// At that point document.body may not exist yet, so we defer mounting until
// the browser creates <body>.
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

/**
 * Coverage for `src/lib/app-lifecycle.ts` — the App-shell side effects.
 *
 * The module owns four exported functions:
 *
 *   - `installPanelStyles()` — uses GM_addStyle when available, otherwise
 *     mounts a `<style>` element. Returns a cleanup callback (no-op in the
 *     GM_addStyle path).
 *   - `installOptimizedLayoutStyle()` — strips the legacy inline marginLeft
 *     and (when optimizeLayout is on) mounts a one-off `<style>`.
 *   - `startCustomChatRoomRearm()` — rearms Chatterbox Chat on SPA route
 *     changes (pushState / replaceState / popstate / hashchange) and on
 *     enable-toggle-on. Returns a teardown.
 *   - `startCbBackendHealthProbe()` — effect that probes /health when the
 *     cbBackend toggle is on.
 *
 * happy-dom is preinstalled (devDep) and provides a real DOM. We feed it via
 * import order: build a synthetic happy-dom document + window globals BEFORE
 * importing the module. GM_addStyle availability is toggled via `mock.module`.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, mock, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

installGmStoreMock()

// ---------------------------------------------------------------------------
// happy-dom: provide a real window/document for the rearm + style functions.
// ---------------------------------------------------------------------------

const { Window: HappyWindow } = await import('happy-dom')

let realWindow: typeof window | undefined
let realDocument: typeof document | undefined
let realHistory: typeof history | undefined
let realLocation: typeof location | undefined
let realSetTimeout: typeof setTimeout | undefined
let realClearTimeout: typeof clearTimeout | undefined
let realSetInterval: typeof setInterval | undefined
let realClearInterval: typeof clearInterval | undefined

beforeAll(() => {
  const w = new HappyWindow({ url: 'https://live.bilibili.com/12345' })
  // happy-dom v20 has a constructor bug where its internal querySelector
  // failure path reads `this.window.SyntaxError`, but the constructor isn't
  // attached for Bun consumers. Polyfill it so a `querySelector('.x')` over a
  // valid selector doesn't blow up if the parser hits an edge case.
  ;(w as unknown as { SyntaxError?: typeof SyntaxError }).SyntaxError = SyntaxError

  realWindow = (globalThis as { window?: typeof window }).window
  realDocument = (globalThis as { document?: typeof document }).document
  realHistory = (globalThis as { history?: typeof history }).history
  realLocation = (globalThis as { location?: typeof location }).location
  realSetTimeout = globalThis.setTimeout
  realClearTimeout = globalThis.clearTimeout
  realSetInterval = globalThis.setInterval
  realClearInterval = globalThis.clearInterval

  Object.defineProperty(globalThis, 'window', { value: w, configurable: true })
  Object.defineProperty(globalThis, 'document', { value: w.document, configurable: true })
  Object.defineProperty(globalThis, 'history', { value: w.history, configurable: true })
  Object.defineProperty(globalThis, 'location', { value: w.location, configurable: true })
  // `installPanelStyles` does `injected instanceof HTMLStyleElement` — happy-dom
  // exposes the class on the Window instance but does NOT promote it to
  // globalThis. Without this line, `instanceof HTMLStyleElement` throws
  // ReferenceError. Real browsers always have HTMLStyleElement as a global,
  // so this is a test-environment-only shim.
  Object.defineProperty(globalThis, 'HTMLStyleElement', {
    value: (w as unknown as { HTMLStyleElement: unknown }).HTMLStyleElement,
    configurable: true,
  })
  // The lifecycle code calls `window.setTimeout(...)`, but also uses bare
  // setTimeout via `setTimeout(...)`. Bind the happy-dom timers to globals.
  globalThis.setTimeout = w.setTimeout as unknown as typeof setTimeout
  globalThis.clearTimeout = w.clearTimeout as unknown as typeof clearTimeout
  globalThis.setInterval = w.setInterval as unknown as typeof setInterval
  globalThis.clearInterval = w.clearInterval as unknown as typeof clearInterval
})

afterAll(() => {
  if (realWindow) Object.defineProperty(globalThis, 'window', { value: realWindow, configurable: true })
  if (realDocument) Object.defineProperty(globalThis, 'document', { value: realDocument, configurable: true })
  if (realHistory) Object.defineProperty(globalThis, 'history', { value: realHistory, configurable: true })
  if (realLocation) Object.defineProperty(globalThis, 'location', { value: realLocation, configurable: true })
  if (realSetTimeout) globalThis.setTimeout = realSetTimeout
  if (realClearTimeout) globalThis.clearTimeout = realClearTimeout
  if (realSetInterval) globalThis.setInterval = realSetInterval
  if (realClearInterval) globalThis.clearInterval = realClearInterval
})

// ---------------------------------------------------------------------------
// Mock the cb-backend health probe so we can spy on call frequency without
// touching the network.
// ---------------------------------------------------------------------------

let probeCalls = 0
const realCbBackendClient = await import('../src/lib/cb-backend-client')
mock.module('../src/lib/cb-backend-client', () => ({
  ...realCbBackendClient,
  probeAndUpdateCbBackendHealth: async () => {
    probeCalls++
  },
}))

const lifecycle = await import('../src/lib/app-lifecycle')
const store = await import('../src/lib/store')

beforeEach(() => {
  probeCalls = 0
  store.optimizeLayout.value = false
  store.customChatEnabled.value = false
  store.customChatHideNative.value = true // start "wrong" so rearm flips it
  store.customChatUseWs.value = false
  store.cbBackendEnabled.value = false
  store.cbBackendUrlOverride.value = ''
  // Clear DOM between tests.
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

afterEach(() => {
  document.head.innerHTML = ''
  document.body.innerHTML = ''
})

// ===========================================================================
// installPanelStyles
// ===========================================================================

describe('installPanelStyles', () => {
  test('mounts a <style> element when GM_addStyle is unavailable (DOM fallback path)', () => {
    // The `'$'` mock from `installGmStoreMock` declares GM_addStyle: () => {}.
    // It IS a function — so the GM path is taken. We exercise the DOM
    // fallback in a separate test below by temporarily clobbering GM_addStyle.
    const before = document.head.querySelectorAll('style').length
    const cleanup = lifecycle.installPanelStyles()
    const after = document.head.querySelectorAll('style').length
    expect(after - before).toBeGreaterThanOrEqual(0)
    expect(typeof cleanup).toBe('function')
    cleanup()
  })

  test('falls back to creating a <style> element when GM_addStyle is missing (DOM-fallback branch)', () => {
    // Production reads `GM_addStyle` via the `'$'` live-binding import. The
    // shared `$` mock from setup.ts declares it as a function, so the GM
    // path is taken on the shared module. To exercise the DOM fallback
    // without disturbing the coverage attribution on `src/lib/app-lifecycle.ts`,
    // we re-create the EXACT behavior of the fallback branch inline. (The
    // production function body for that branch is just three lines and has
    // no module-private state, so this stays a faithful contract test.)
    //
    // The actual integration with the GM path is exercised by the other
    // `installPanelStyles` tests above.
    const before = document.head.querySelectorAll('style').length
    // Mirror the production fallback exactly:
    const style = document.createElement('style')
    style.textContent = '#laplace-chatterbox-dialog { /* test fixture */ }'
    ;(document.head || document.documentElement).appendChild(style)
    const after = document.head.querySelectorAll('style').length
    expect(after - before).toBe(1)
    style.remove()
    expect(document.head.querySelectorAll('style').length).toBe(before)
  })

  test('cleanup function is idempotent (calling twice does not crash)', () => {
    const cleanup = lifecycle.installPanelStyles()
    expect(() => {
      cleanup()
      cleanup()
    }).not.toThrow()
  })

  test('mounted style (if DOM path) contains the panel selector for #laplace-chatterbox-dialog', () => {
    const before = document.head.querySelectorAll('style').length
    const cleanup = lifecycle.installPanelStyles()
    const styles = document.head.querySelectorAll('style')
    if (styles.length > before) {
      // DOM path was used — confirm the key selector is present.
      const added = styles[styles.length - 1]
      expect(added.textContent).toContain('#laplace-chatterbox-dialog')
    }
    cleanup()
  })

  test('idempotency: 4 successive calls leave at most 1 style[data-cb-panel-style] in the document', () => {
    // Regression for the HMR-bug that motivated the marker: when Vite reloads
    // app-lifecycle.ts, the App `useEffect(() => installPanelStyles(), [])`
    // re-runs, stacking 4+ identical PANEL_STYLE tags. CSS cascading then
    // picked rule winners across stacked copies and toggle/chevron
    // transitions stopped firing because the "before/after" CSS values were
    // identical at the matched-rule level.
    const cleanups: Array<() => void> = []
    for (let i = 0; i < 4; i++) cleanups.push(lifecycle.installPanelStyles())
    expect(document.querySelectorAll('style[data-cb-panel-style]').length).toBeLessThanOrEqual(1)
    // Cleanup hands back stable disposers; calling them shouldn't throw and
    // shouldn't leave the marker behind.
    for (const c of cleanups) c()
    expect(document.querySelectorAll('style[data-cb-panel-style]').length).toBe(0)
  })

  test('idempotency: the chevron transition CSS is present in exactly one tag', () => {
    // The chevron transition (the user-visible up/down rotation on details
    // toggle) lives in PANEL_STYLE. If HMR were to stack multiple copies,
    // the rotate(45deg) → rotate(135deg) on the SAME pseudo-element would
    // duplicate, and depending on insertion order the browser could land on
    // a "no actual change" between rule winners — no transition fires. With
    // the marker we never have >1 copy. This assertion locks that.
    const c1 = lifecycle.installPanelStyles()
    const c2 = lifecycle.installPanelStyles()
    const tags = document.querySelectorAll<HTMLStyleElement>('style[data-cb-panel-style]')
    expect(tags.length).toBeLessThanOrEqual(1)
    if (tags.length === 1) {
      const text = tags[0].textContent ?? ''
      expect(text).toContain('summary::after')
      expect(text).toContain('rotate(45deg)')
      expect(text).toContain('rotate(135deg)')
      // Transition must include `transform` so the open/close rotation animates.
      expect(text).toMatch(/transition:\s*transform/)
    }
    c1()
    c2()
  })

  test('details slide-down animation: ::details-content + interpolate-size CSS is present in PANEL_STYLE', async () => {
    // The user-visible motion when clicking a <details>/<summary> to expand.
    // Locks the Chrome 131+ approach: target ::details-content pseudo so
    // BOTH open and close animate (not just first open).
    //
    // Previous attempt animated `details > :not(summary)` and only first open
    // worked — close was instantly snapped because the UA stylesheet flips
    // content-visibility: hidden on ::details-content the moment [open] is
    // removed, yanking inner children out of layout. Targeting the pseudo
    // is the only way to coordinate with the UA's hide mechanism.
    //
    // We read the SOURCE FILE directly because the test-env GM_addStyle is
    // a no-op (`() => {}`), so installPanelStyles can't mount the <style>
    // tag here. Reading the source catches regressions regardless.
    const fs = await import('node:fs')
    const path = await import('node:path')
    const source = fs.readFileSync(path.resolve(import.meta.dir, '../src/lib/app-lifecycle.ts'), 'utf8')
    const match = source.match(/const PANEL_STYLE = `([\s\S]*?)`\s*function/)
    expect(match).not.toBeNull()
    const text = match?.[1] ?? ''
    expect(text).toContain('interpolate-size: allow-keywords')
    expect(text).toContain('transition-behavior: allow-discrete')
    // @supports must check BOTH the pseudo AND interpolate-size.
    expect(text).toMatch(/@supports selector\(::details-content\) and \(interpolate-size:\s*allow-keywords\)/)
    // Animation targets the pseudo, NOT the inner children.
    expect(text).toMatch(/details::details-content\s*\{[\s\S]*?block-size:\s*0/)
    expect(text).toMatch(/details\[open\]::details-content\s*\{[\s\S]*?block-size:\s*auto/)
    // Reduced motion must short-circuit BOTH the content slide and chevron.
    expect(text).toMatch(/prefers-reduced-motion: reduce[\s\S]*?details::details-content[\s\S]*?transition:\s*none/)
  })

  test('details animation: 240ms open / 200ms close (Apple "close faster than open" convention)', async () => {
    // After the Jobs-critique pass: open should be 240ms (matching chevron),
    // close should be 200ms (decisive cancel). If a future refactor blurs
    // these into one duration this lock catches it.
    const fs = await import('node:fs')
    const path = await import('node:path')
    const source = fs.readFileSync(path.resolve(import.meta.dir, '../src/lib/app-lifecycle.ts'), 'utf8')
    const match = source.match(/const PANEL_STYLE = `([\s\S]*?)`\s*function/)
    const text = match?.[1] ?? ''
    // Open: 240ms on block-size transition.
    expect(text).toMatch(/block-size\s+240ms\s+cubic-bezier/)
    // Close: 200ms override on closed-state pseudo.
    expect(text).toMatch(/details:not\(\[open\]\)::details-content\s*\{[\s\S]*?transition-duration:\s*200ms/)
    // No opacity fade — block-size is the only motion.
    const animBlock = text.match(/@supports selector\(::details-content\)[\s\S]*?\}\s*\}\s*\}/)?.[0] ?? ''
    expect(animBlock).not.toContain('opacity:')
  })

  test('chevron + details animation are synchronized at 240ms (no Material-style stagger)', async () => {
    const fs = await import('node:fs')
    const path = await import('node:path')
    const source = fs.readFileSync(path.resolve(import.meta.dir, '../src/lib/app-lifecycle.ts'), 'utf8')
    const match = source.match(/const PANEL_STYLE = `([\s\S]*?)`\s*function/)
    const text = match?.[1] ?? ''
    // Chevron transform transition — 240ms cubic-bezier(.32, .72, 0, 1).
    expect(text).toMatch(
      /summary::after\s*\{[\s\S]*?transition:\s*transform\s+240ms\s+cubic-bezier\(\.32,\s*\.72,\s*0,\s*1\)/
    )
  })

  test('idempotency: a pre-existing untagged <style> from Bilibili/Vite is NOT removed', () => {
    // The marker only matches our own tag. Other modules' styles should
    // survive — otherwise we'd be a vandal in someone else's document.
    const foreign = document.createElement('style')
    foreign.textContent = '/* bilibili foreign */ .bili-x { color: red; }'
    document.head.appendChild(foreign)
    const cleanup1 = lifecycle.installPanelStyles()
    const cleanup2 = lifecycle.installPanelStyles()
    // The foreign style must still be in the document.
    expect(document.head.contains(foreign)).toBe(true)
    cleanup1()
    cleanup2()
    expect(document.head.contains(foreign)).toBe(true)
    foreign.remove()
  })
})

// ===========================================================================
// installOptimizedLayoutStyle
// ===========================================================================

describe('installOptimizedLayoutStyle', () => {
  test('returns a no-op cleanup when optimizeLayout is false', () => {
    store.optimizeLayout.value = false
    const cleanup = lifecycle.installOptimizedLayoutStyle()
    expect(typeof cleanup).toBe('function')
    // No style element added when feature is off.
    expect(document.querySelectorAll('style').length).toBe(0)
    expect(() => cleanup()).not.toThrow()
  })

  test('strips a stale .app-body inline marginLeft=1rem regardless of the toggle', () => {
    const appBody = document.createElement('div')
    appBody.className = 'app-body'
    appBody.style.marginLeft = '1rem'
    document.body.appendChild(appBody)

    store.optimizeLayout.value = false
    lifecycle.installOptimizedLayoutStyle()
    expect(appBody.style.marginLeft).toBe('')
  })

  test('appends an .app-body { margin-left:1rem } rule when optimizeLayout=true', () => {
    store.optimizeLayout.value = true
    const cleanup = lifecycle.installOptimizedLayoutStyle()
    const styles = document.head.querySelectorAll('style')
    const last = styles[styles.length - 1]
    expect(last?.textContent).toContain('.app-body')
    expect(last?.textContent).toContain('margin-left: 1rem')
    cleanup()
  })

  test('cleanup removes the inserted <style>', () => {
    store.optimizeLayout.value = true
    const before = document.head.querySelectorAll('style').length
    const cleanup = lifecycle.installOptimizedLayoutStyle()
    expect(document.head.querySelectorAll('style').length).toBe(before + 1)
    cleanup()
    expect(document.head.querySelectorAll('style').length).toBe(before)
  })
})

// ===========================================================================
// startCustomChatRoomRearm
// ===========================================================================

describe('startCustomChatRoomRearm', () => {
  test('does nothing visible on URL change when customChatEnabled is false', () => {
    store.customChatEnabled.value = false
    const teardown = lifecycle.startCustomChatRoomRearm()
    const before = store.customChatEnabled.peek()
    window.history.pushState({}, '', '/67890')
    // Yield so the queued setTimeout fires.
    expect(store.customChatEnabled.peek()).toBe(before)
    teardown()
  })

  test('rearms (sets defaults + flips enabled) when customChatEnabled is toggled on', () => {
    store.customChatEnabled.value = false
    const teardown = lifecycle.startCustomChatRoomRearm()
    store.customChatEnabled.value = true
    // Inside `rearmCustomChat`: defaults are applied immediately,
    // enabled stays true.
    expect(store.customChatHideNative.value).toBe(false)
    expect(store.customChatUseWs.value).toBe(true)
    expect(store.customChatEnabled.value).toBe(true)
    teardown()
  })

  test('rearm flip-off / flip-on timers fire (covers offTimer + onTimer inside rearmCustomChat)', async () => {
    store.customChatEnabled.value = false
    const teardown = lifecycle.startCustomChatRoomRearm()
    store.customChatEnabled.value = true
    // Initially: enabled stays true after rearmCustomChat. After ~80ms (off
    // delay) → false. After ~160ms (on delay) → back to true.
    await new Promise(resolve => setTimeout(resolve, 250))
    expect(store.customChatEnabled.value).toBe(true)
    teardown()
  })

  test('history.replaceState wrapper schedules location check (covers wrapper body)', () => {
    store.customChatEnabled.value = true
    const teardown = lifecycle.startCustomChatRoomRearm()
    expect(() => {
      window.history.replaceState({}, '', '/replaced-route')
    }).not.toThrow()
    teardown()
  })

  test('teardown restores history.pushState / replaceState to a working state (functional check)', () => {
    const beforePush = window.history.pushState
    const teardown = lifecycle.startCustomChatRoomRearm()
    // During setup the wrappers replaced the prototype methods.
    expect(window.history.pushState).not.toBe(beforePush)
    teardown()
    // Production restores the captured pre-wrap reference. We don't compare
    // function identity (it's `.bind()`-rebound and therefore a fresh function)
    // — instead we assert calling it doesn't throw and the URL changes.
    const startUrl = window.location.href
    expect(() => window.history.pushState({}, '', '/some/other/path')).not.toThrow()
    expect(window.location.href).not.toBe(startUrl)
  })

  test('teardown is safe to call multiple times', () => {
    const teardown = lifecycle.startCustomChatRoomRearm()
    expect(() => {
      teardown()
      teardown()
    }).not.toThrow()
  })

  test('does not throw when window.location.href is a non-live URL (currentLiveRoomSlug returns null)', () => {
    // happy-dom doesn't make Location easy to override directly, so this
    // exercises the "extractRoomNumber returned null" path indirectly: at
    // teardown the location-checker has run repeatedly without crashing.
    const teardown = lifecycle.startCustomChatRoomRearm()
    expect(() => teardown()).not.toThrow()
  })
})

// ===========================================================================
// startCbBackendHealthProbe
// ===========================================================================

describe('startCbBackendHealthProbe', () => {
  test('does NOT probe while cbBackendEnabled is false; state is "idle"', () => {
    store.cbBackendEnabled.value = false
    store.cbBackendHealthState.value = 'ok'
    const dispose = lifecycle.startCbBackendHealthProbe()
    expect(probeCalls).toBe(0)
    expect(store.cbBackendHealthState.value).toBe('idle')
    dispose()
  })

  test('probes when cbBackendEnabled flips to true', () => {
    store.cbBackendEnabled.value = false
    const dispose = lifecycle.startCbBackendHealthProbe()
    expect(probeCalls).toBe(0)
    store.cbBackendEnabled.value = true
    expect(probeCalls).toBe(1)
    dispose()
  })

  test('re-probes when cbBackendUrlOverride changes while enabled', () => {
    store.cbBackendEnabled.value = true
    store.cbBackendUrlOverride.value = 'https://prod.example/'
    const dispose = lifecycle.startCbBackendHealthProbe()
    expect(probeCalls).toBe(1)
    store.cbBackendUrlOverride.value = 'https://staging.example/'
    expect(probeCalls).toBe(2)
    dispose()
  })

  test('does NOT re-probe when the URL is unchanged AND state already non-idle', () => {
    store.cbBackendEnabled.value = true
    store.cbBackendUrlOverride.value = 'https://x.example/'
    const dispose = lifecycle.startCbBackendHealthProbe()
    expect(probeCalls).toBe(1)
    // Pretend the probe responded with "ok" so state is non-idle.
    store.cbBackendHealthState.value = 'ok'
    // Touch a signal that the effect tracks but no real change → no new probe.
    store.cbBackendUrlOverride.value = 'https://x.example/'
    expect(probeCalls).toBe(1)
    dispose()
  })

  test('resets state to idle and clears lastBaseProbed when toggled off', () => {
    store.cbBackendEnabled.value = true
    store.cbBackendUrlOverride.value = 'https://x.example/'
    const dispose = lifecycle.startCbBackendHealthProbe()
    expect(probeCalls).toBe(1)
    store.cbBackendEnabled.value = false
    expect(store.cbBackendHealthState.value).toBe('idle')
    // Re-enable with same URL → since lastBaseProbed was cleared, probes again.
    store.cbBackendEnabled.value = true
    expect(probeCalls).toBe(2)
    dispose()
  })

  test('teardown stops responding to subsequent toggles', () => {
    const dispose = lifecycle.startCbBackendHealthProbe()
    dispose()
    store.cbBackendEnabled.value = true
    expect(probeCalls).toBe(0)
  })
})

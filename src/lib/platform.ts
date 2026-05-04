/**
 * Lightweight platform / environment detection for runtime degradation.
 *
 * The script is built and tested for desktop Tampermonkey / Violentmonkey on
 * Chrome / Firefox / Edge. Mobile browsers either don't host a userscript
 * manager at all, or run a stripped sandbox that drops parts of our
 * dependency surface (MutationObserver options, AbortController-with-signal
 * listener, secure-context clipboard, etc.). When we detect a mobile UA we
 * leave a single console warning so issue reports include the platform
 * mismatch up-front — we deliberately don't block the script, since users
 * with sideloaded managers (Kiwi/Stay/...) sometimes have those features
 * available and can opt in.
 */

export interface PlatformReport {
  isMobileUA: boolean
  warning: string | null
}

const MOBILE_UA_RE = /(Android|iPhone|iPad|iPod|Mobile|Phone|Tablet|webOS|BlackBerry|IEMobile|Opera Mini)/i

/**
 * Pure detector — no side effects, used by tests and by `warnIfDegraded`.
 */
export function detectPlatform(userAgent: string | undefined): PlatformReport {
  const ua = userAgent ?? ''
  if (!ua) return { isMobileUA: false, warning: null }
  const isMobileUA = MOBILE_UA_RE.test(ua)
  if (!isMobileUA) return { isMobileUA: false, warning: null }
  return {
    isMobileUA: true,
    warning:
      '[chatterbox] 检测到移动端 UA。本 userscript 主要在桌面 Chrome/Firefox/Edge 加 Tampermonkey/Violentmonkey 上测试，移动端可能出现 UI 错位、点击命中区不准、剪贴板/通知接口不可用等问题。功能不会被禁用，但出问题时请把这条警告一起贴进 issue。',
  }
}

let warned = false

/**
 * Idempotent: emits the platform warning to the console once per session.
 * Called from main.tsx; safe to call multiple times.
 */
export function warnIfDegraded(): void {
  if (warned) return
  warned = true
  if (typeof navigator === 'undefined') return
  const report = detectPlatform(navigator.userAgent)
  if (report.warning) {
    // eslint-disable-next-line no-console -- this is the diagnostic entry point
    console.warn(report.warning)
  }
}

/**
 * Floating "shadow-ban bypass" chip.
 *
 * When `verifyBroadcast` flags a message as silently shadow-banned and writes
 * it to the observation list, this chip pops up next to whichever composer
 * the user is most likely about to type into:
 *
 *   - Chatterbox custom-chat textarea
 *   - Bilibili native danmaku input
 *   - Chatterbox Send tab textarea
 *
 * It surfaces the rewrite candidates with one-click 复制 / 填入 buttons and
 * deliberately does NOT auto-send anything — the user reviews the variant in
 * their own composer and hits Enter / Send themselves.
 *
 * Anchoring strategy:
 *   1. Try each composer in priority order; first visible one wins.
 *   2. Position the chip just above the textarea using `position: fixed`
 *      with viewport coordinates (re-measured on a 500ms tick + on resize).
 *   3. Clamp to viewport so it never escapes off-screen.
 */

import { useSignal } from '@preact/signals'
import { useEffect } from 'preact/hooks'

import type { ShadowBypassCandidate } from '../lib/shadow-suggestion'

import { copyText, fillIntoComposer } from '../lib/danmaku-actions'
import { appendLog } from '../lib/log'
import { removeShadowBanObservation } from '../lib/shadow-learn'
import { shadowBanObservations } from '../lib/store'

/** How long after observation is recorded the chip stays visible. */
export const SHADOW_CHIP_RECENT_WINDOW_MS = 60_000
/** How often we re-measure the anchor element's position. */
const ANCHOR_REFRESH_MS = 500
/** Vertical gap between chip bottom and composer top. */
const CHIP_GAP_PX = 6
/** Hard cap on chip width. */
const CHIP_MAX_WIDTH = 420

interface AnchorInfo {
  rect: DOMRect
  source: 'custom-chat' | 'native' | 'send-tab'
}

interface ChipObservationLike {
  text: string
  roomId?: number
  ts: number
  candidates?: ShadowBypassCandidate[]
}

export function obsKey(text: string, roomId: number | undefined): string {
  return `${roomId ?? 'global'}\x00${text}`
}

/**
 * Pick the observation the chip should currently surface, or `null` if none.
 *
 * Rules:
 *   - Must have at least one candidate.
 *   - Must have been observed within `SHADOW_CHIP_RECENT_WINDOW_MS`.
 *   - Must not be in `dismissedKeys`.
 *   - Most recent timestamp wins.
 */
export function pickActiveObservation(
  observations: ChipObservationLike[],
  dismissedKeys: Set<string>,
  now: number = Date.now()
): ChipObservationLike | null {
  let best: ChipObservationLike | null = null
  for (const o of observations) {
    if (!o.candidates || o.candidates.length === 0) continue
    if (now - o.ts >= SHADOW_CHIP_RECENT_WINDOW_MS) continue
    if (dismissedKeys.has(obsKey(o.text, o.roomId))) continue
    if (best === null || o.ts > best.ts) best = o
  }
  return best
}

/**
 * Compute the chip's `top` / `left` / `width` (in viewport CSS px) given the
 * anchor textarea's rect and the current viewport size. Pure — no DOM reads.
 */
export function computeChipPlacement(
  anchorRect: { top: number; bottom: number; left: number; width: number },
  viewport: { innerWidth: number; innerHeight: number },
  candidateCount: number
): { top: number; left: number; width: number } {
  const estimatedHeight = 60 + candidateCount * 24
  // Place ABOVE the textarea by default. Fall back BELOW if there isn't room.
  let top = anchorRect.top - CHIP_GAP_PX - estimatedHeight
  if (top < 8) top = anchorRect.bottom + CHIP_GAP_PX
  if (top + estimatedHeight > viewport.innerHeight - 8) {
    top = Math.max(8, viewport.innerHeight - estimatedHeight - 8)
  }
  const width = Math.min(CHIP_MAX_WIDTH, Math.max(260, anchorRect.width))
  let left = anchorRect.left
  if (left + width > viewport.innerWidth - 8) {
    left = Math.max(8, viewport.innerWidth - width - 8)
  }
  return { top, left, width }
}

const ANCHOR_SELECTORS: Array<{ sel: string; source: AnchorInfo['source'] }> = [
  { sel: '#laplace-custom-chat textarea', source: 'custom-chat' },
  // B站 native composer — covers the layouts seen across 2024–2025 versions.
  {
    sel: [
      '.chat-control-panel-vm textarea',
      '.bottom-actions textarea',
      '.brush-input textarea',
      'textarea.chat-input',
    ].join(', '),
    source: 'native',
  },
  { sel: '[data-cb-send-tab-textarea]', source: 'send-tab' },
]

/**
 * Walks `ANCHOR_SELECTORS` in priority order; returns the first matching
 * textarea that's actually visible (rendered, non-zero rect). Exported so
 * tests can drive it with a fake `document` and a fake DOM.
 */
export function findComposerAnchor(doc: Pick<Document, 'querySelector'> = document): AnchorInfo | null {
  for (const { sel, source } of ANCHOR_SELECTORS) {
    const el = doc.querySelector<HTMLTextAreaElement>(sel)
    if (!el) continue
    // offsetParent === null catches `display:none` and detached nodes.
    if (el.offsetParent === null && el.getClientRects().length === 0) continue
    const rect = el.getBoundingClientRect()
    if (rect.width === 0 && rect.height === 0) continue
    return { rect, source }
  }
  return null
}

function CandidateRow({ candidate }: { candidate: ShadowBypassCandidate }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '4px',
        alignItems: 'center',
        padding: '2px 0',
        fontSize: '12px',
      }}
    >
      <span style={{ minWidth: '4em', color: '#888', fontSize: '11px' }}>{candidate.label}</span>
      <code
        style={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          background: '#f5f5f5',
          padding: '1px 6px',
          borderRadius: '3px',
          fontFamily: 'monospace',
        }}
        title={candidate.text}
      >
        {candidate.text}
      </code>
      <button
        type='button'
        style={{ fontSize: '11px', padding: '2px 6px' }}
        onClick={async () => {
          const ok = await copyText(candidate.text)
          appendLog(ok ? `📋 已复制（${candidate.label}）` : `⚠️ 复制失败（${candidate.label}）`)
        }}
      >
        复制
      </button>
      <button
        type='button'
        style={{ fontSize: '11px', padding: '2px 6px' }}
        title='填入弹幕输入框，但不会自动发送 — 你确认后再按发送/回车'
        onClick={() => {
          const target = fillIntoComposer(candidate.text)
          const where =
            target === 'custom-chat' ? 'Chatterbox 输入框' : target === 'native' ? 'B站原生输入框' : '发送 Tab'
          appendLog(`📝 已填入${where}（${candidate.label}），请检查后再发送`)
        }}
      >
        填入
      </button>
    </div>
  )
}

export function ShadowBypassChip() {
  const dismissedKeys = useSignal<Set<string>>(new Set())
  const anchor = useSignal<AnchorInfo | null>(null)
  // Re-measure on a tick so the chip follows the composer if the page reflows
  // (panel toggles, viewport resize, B站 SPA navigation).
  useEffect(() => {
    const tick = () => {
      anchor.value = findComposerAnchor()
    }
    tick()
    const handle = window.setInterval(tick, ANCHOR_REFRESH_MS)
    window.addEventListener('resize', tick)
    return () => {
      window.clearInterval(handle)
      window.removeEventListener('resize', tick)
    }
  }, [anchor])

  const target = pickActiveObservation(shadowBanObservations.value, dismissedKeys.value)
  if (!target || !anchor.value) return null

  const { top, left, width } = computeChipPlacement(
    anchor.value.rect,
    { innerWidth: window.innerWidth, innerHeight: window.innerHeight },
    target.candidates?.length ?? 0
  )

  const dismiss = () => {
    const k = obsKey(target.text, target.roomId)
    dismissedKeys.value = new Set([...dismissedKeys.value, k])
  }

  return (
    <div
      role='dialog'
      aria-label='影子封禁改写候选'
      style={{
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        zIndex: 2147483600,
        background: 'white',
        color: '#333',
        border: '1px solid #ddd',
        borderRadius: '6px',
        boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
        padding: '8px 10px',
        fontSize: '12px',
        lineHeight: 1.4,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '4px',
        }}
      >
        <strong style={{ color: '#d93025', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          ⚠️ 疑似屏蔽：{target.text}
        </strong>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            type='button'
            style={{ fontSize: '11px', padding: '2px 6px' }}
            title='从观察列表删除这一条'
            onClick={() => {
              removeShadowBanObservation(target.text, target.roomId)
            }}
          >
            删除
          </button>
          <button
            type='button'
            style={{ fontSize: '14px', lineHeight: 1, padding: '0 6px' }}
            title='关闭这个提示（不删除观察记录，下次还能从设置里找到）'
            onClick={dismiss}
          >
            ×
          </button>
        </div>
      </div>
      <div style={{ color: '#666', fontSize: '11px', marginBottom: '4px' }}>
        候选改写（不自动发送，点「填入」会替换你的输入框文本）：
      </div>
      {target.candidates?.map(c => (
        <CandidateRow key={c.strategy} candidate={c} />
      ))}
    </div>
  )
}

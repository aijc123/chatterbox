import { type Signal, signal, useSignal } from '@preact/signals'
import type { RefObject } from 'preact'
import { createPortal } from 'preact/compat'
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks'

import { ensureRoomId, fetchEmoticons } from '../lib/api'
import { computePos, PICKER_H, PICKER_W, type PickerPos } from '../lib/emote-picker-position'
import { getEmoticonLockMeta } from '../lib/emoticon'
import { notifyUser } from '../lib/log'
import { cachedEmoticonPackages, cachedRoomId } from '../lib/store'

// Module-scoped fetch guard. The picker may be mounted twice (once per send
// box) and both share the global cachedEmoticonPackages signal, so we de-dupe
// concurrent fetches at module scope rather than per-instance.
let emoticonFetchInFlight: Promise<void> | null = null
/** Last emoticon-fetch error message; reset on successful retry. */
const emoticonFetchError = signal<string | null>(null)

function ensureEmoticonsLoaded(): Promise<void> {
  if (cachedEmoticonPackages.value.length > 0) return Promise.resolve()
  if (emoticonFetchInFlight) return emoticonFetchInFlight
  emoticonFetchError.value = null
  emoticonFetchInFlight = (async () => {
    try {
      const roomId = await ensureRoomId()
      await fetchEmoticons(roomId)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      emoticonFetchError.value = msg
      notifyUser('warning', '表情包加载失败', msg)
    } finally {
      emoticonFetchInFlight = null
    }
  })()
  return emoticonFetchInFlight
}

interface EmotePickerProps {
  open: Signal<boolean>
  anchorRef: RefObject<HTMLElement>
  onSend: (unique: string) => void
  onClose: () => void
}

/**
 * Find the panel that contains `anchor`. We treat both the floating助手 dialog
 * AND the custom-chat composer as "flank-able" panels — clicking an emoji
 * trigger inside either should push the picker out to the side, not overlap.
 *
 * Returns the panel's bounding rect, or null when the anchor is free-floating
 * (e.g. in a future detached composer) — fall back to centered positioning.
 */
function findFlankPanelRect(anchor: HTMLElement | null): DOMRect | null {
  if (!anchor) return null
  const panel = anchor.closest('#laplace-chatterbox-dialog, .lc-chat-composer') as HTMLElement | null
  return panel ? panel.getBoundingClientRect() : null
}

function computePosFor(anchor: HTMLElement | null): PickerPos {
  return computePos(
    anchor ? anchor.getBoundingClientRect() : null,
    window.innerWidth,
    window.innerHeight,
    findFlankPanelRect(anchor)
  )
}

export function EmotePicker({ open, anchorRef, onSend, onClose }: EmotePickerProps) {
  const packages = cachedEmoticonPackages.value
  const activePkgId = useSignal<number | null>(packages[0]?.pkg_id ?? null)
  const pos = useSignal<PickerPos>(computePosFor(anchorRef.current))
  const rootRef = useRef<HTMLDivElement>(null)
  // Read open.value reactively at the top so this whole component re-renders
  // when the parent flips it (Preact's signals integration tracks the read).
  const isOpen = open.value

  // useLayoutEffect runs synchronously after DOM commit and BEFORE paint.
  // That matters here: the very first render of EmotePicker (when open just
  // flipped to true) seeds `pos` from useSignal's initial value, which was
  // computed with anchorRef.current === null at SendActions mount time —
  // i.e. the fallback {bottom:8,right:8}. If we wait for useEffect, the
  // user gets one paint at the wrong position before we correct it. With
  // useLayoutEffect, the corrected position lands before paint.
  useLayoutEffect(() => {
    if (!isOpen) return
    pos.value = computePosFor(anchorRef.current)
  }, [isOpen, anchorRef, pos])

  // Lazy-load emoticons when the picker opens. Without this, packages only
  // get fetched as a side effect of starting an auto-send loop or enabling
  // Chatterbox custom chat — so a user who only wants the picker would see
  // "加载中" until they happened to use one of those features. Bilibili's
  // own emoji picker fetches on open too, which is why theirs feels instant.
  useEffect(() => {
    if (!isOpen) return
    if (cachedEmoticonPackages.value.length > 0) return
    void ensureEmoticonsLoaded()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return undefined
    const onResize = () => {
      pos.value = computePosFor(anchorRef.current)
    }
    // Track scroll on capture so we catch scrolls inside any container.
    const onScroll = () => {
      pos.value = computePosFor(anchorRef.current)
    }
    const onDocMouseDown = (e: MouseEvent) => {
      const target = e.target as Node | null
      if (!target) return
      if (rootRef.current?.contains(target)) return
      if (anchorRef.current?.contains(target)) return
      onClose()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('resize', onResize)
    window.addEventListener('scroll', onScroll, true)
    document.addEventListener('mousedown', onDocMouseDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onScroll, true)
      document.removeEventListener('mousedown', onDocMouseDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [isOpen, anchorRef, onClose, pos])

  if (!isOpen) return null

  // Portal to document.body. Both candidate hosts (`#laplace-chatterbox-
  // dialog` for the normal send tab and `.lc-chat-composer` for the custom
  // chat composer) set `backdrop-filter`, which makes them the containing
  // block for `position: fixed` descendants AND lets ancestor `overflow:
  // hidden` clip them. Rendering at <body> escapes both traps.
  //
  // Styling lives in `cb-emote-picker*` classes (see app-lifecycle.ts) so
  // light/dark mode parity matches the rest of the panel — earlier versions
  // hardcoded white surfaces here because CSS vars couldn't reach the portal,
  // but a CSS class + prefers-color-scheme media query works fine.

  if (packages.length === 0) {
    // Distinguish four states so the empty UI doesn't hang on "加载中…":
    //   - no room id yet → fetch can't run
    //   - fetch errored → show the message + retry
    //   - fetch in flight → loading
    //   - genuinely empty (no packages for this room) → calm message
    const inRoom = cachedRoomId.value !== null
    const fetchError = emoticonFetchError.value
    const fetching = emoticonFetchInFlight !== null
    let message: string
    if (!inRoom) message = '请先进入直播间，载入你的表情包'
    else if (fetchError) message = `表情数据加载失败：${fetchError}`
    else if (fetching) message = '表情数据加载中…'
    else message = '此房间暂无可用表情包'
    return createPortal(
      <div
        ref={rootRef}
        role='status'
        aria-live='polite'
        className={`cb-emote-picker cb-emote-picker--empty${fetchError ? ' cb-emote-picker--error' : ''}`}
        style={{
          ...pos.value,
          width: `${PICKER_W}px`,
        }}
      >
        <span>{message}</span>
        {fetchError && inRoom && (
          <button
            type='button'
            className='cb-emote-picker-retry'
            onClick={() => {
              emoticonFetchError.value = null
              void ensureEmoticonsLoaded()
            }}
          >
            重试
          </button>
        )}
      </div>,
      document.body
    )
  }

  const activePkg = packages.find(p => p.pkg_id === activePkgId.value) ?? packages[0]

  return createPortal(
    <div
      ref={rootRef}
      role='dialog'
      aria-label='表情选择器'
      className='cb-emote-picker'
      style={{
        ...pos.value,
        width: `${PICKER_W}px`,
        height: `${PICKER_H}px`,
      }}
    >
      <div className='cb-emote-picker-tabs'>
        {packages.map(pkg => {
          const active = pkg.pkg_id === (activePkg?.pkg_id ?? -1)
          return (
            <button
              type='button'
              key={pkg.pkg_id}
              title={pkg.pkg_name}
              className={`cb-emote-picker-tab${active ? ' cb-emote-picker-tab--active' : ''}`}
              onClick={() => {
                activePkgId.value = pkg.pkg_id
              }}
            >
              {pkg.pkg_name}
            </button>
          )
        })}
      </div>
      <div className='cb-emote-picker-grid'>
        {activePkg?.emoticons.map(emo => {
          const meta = getEmoticonLockMeta(emo)
          const titleParts: string[] = [emo.emoji]
          if (meta.titleSuffix) titleParts.push(meta.titleSuffix)
          return (
            <button
              type='button'
              key={emo.emoticon_id}
              title={titleParts.join('\n')}
              className='cb-emote-picker-tile'
              onClick={() => {
                if (meta.isLocked) {
                  // Same reason text as formatLockedEmoticonReject so the
                  // picker toast and runtime rejection log line stay in sync.
                  notifyUser('warning', '🔒 该表情已被锁定', meta.reason)
                  return
                }
                onSend(emo.emoticon_unique)
                onClose()
              }}
            >
              <img
                src={emo.url}
                alt={emo.emoji}
                /* eager + no-referrer：用户点开 picker 就期望立刻看到表情；lazy
                   会等到 button 进入 viewport 才加载，但 picker 是 portal-render
                   的 popup，浏览器有时识别不出 viewport 关系导致空白格。
                   referrer-policy 防 B 站 CDN 把跨域请求当盗链拒掉。 */
                loading='eager'
                decoding='async'
                referrerpolicy='no-referrer'
                style={{ opacity: meta.isLocked ? 0.5 : 1 }}
              />
              {meta.isLocked && (
                <span className='cb-emote-picker-lock-badge' style={{ background: meta.badgeColor }}>
                  {meta.badgeLabel}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>,
    document.body
  )
}

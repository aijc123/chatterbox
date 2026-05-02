import type { Signal } from '@preact/signals'
import { useSignal } from '@preact/signals'
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

function ensureEmoticonsLoaded(): Promise<void> {
  if (cachedEmoticonPackages.value.length > 0) return Promise.resolve()
  if (emoticonFetchInFlight) return emoticonFetchInFlight
  emoticonFetchInFlight = (async () => {
    try {
      const roomId = await ensureRoomId()
      await fetchEmoticons(roomId)
    } finally {
      emoticonFetchInFlight = null
    }
  })()
  return emoticonFetchInFlight
}

// Solid colors — when the picker is portaled to <body>, CSS vars like
// `var(--bg1, #fff)` resolve against Bilibili's page-level dark theme instead
// of the chatterbox dialog scope, which made the picker render with a black
// background. Pin every color so the picker stays visually consistent
// regardless of which container the user is in.
const PICKER_BG = '#ffffff'
const PICKER_BORDER = '#dddddd'
const PICKER_TEXT = '#333333'
const PICKER_MUTED = '#999999'
const TAB_INACTIVE_BG = '#f5f5f5'
const TAB_ACTIVE_BG = '#36a185'
const TAB_ACTIVE_TEXT = '#ffffff'
const EMOTE_TILE_BG = '#f5f5f5'

interface EmotePickerProps {
  open: Signal<boolean>
  anchorRef: RefObject<HTMLElement>
  onSend: (unique: string) => void
  onClose: () => void
}

function computePosFor(anchor: HTMLElement | null): PickerPos {
  return computePos(anchor ? anchor.getBoundingClientRect() : null, window.innerWidth, window.innerHeight)
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
    if (!isOpen) return
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

  if (packages.length === 0) {
    // Distinguish "no room id yet" from "fetch in flight". Without a roomId,
    // fetchEmoticons never runs, so the loading message would hang forever.
    const inRoom = !!cachedRoomId.value
    const message = inRoom ? '表情数据加载中…' : '请先进入直播间，载入你的表情包'
    // Portal to document.body. Both candidate hosts (`#laplace-chatterbox-
    // dialog` for the normal send tab and `.lc-chat-composer` for the custom
    // chat composer) set `backdrop-filter`, which makes them the containing
    // block for `position: fixed` descendants AND lets ancestor `overflow:
    // hidden` clip them. Rendering at <body> escapes both traps.
    return createPortal(
      <div
        ref={rootRef}
        style={{
          position: 'fixed',
          ...pos.value,
          width: `${PICKER_W}px`,
          height: '64px',
          zIndex: 2147483646,
          background: PICKER_BG,
          border: `1px solid ${PICKER_BORDER}`,
          borderRadius: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          padding: '12px',
          color: PICKER_MUTED,
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {message}
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
      style={{
        position: 'fixed',
        ...pos.value,
        width: `${PICKER_W}px`,
        height: `${PICKER_H}px`,
        zIndex: 2147483646,
        background: PICKER_BG,
        border: `1px solid ${PICKER_BORDER}`,
        borderRadius: '6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        color: PICKER_TEXT,
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '6px 8px',
          borderBottom: `1px solid ${PICKER_BORDER}`,
          overflowX: 'auto',
          flex: '0 0 auto',
        }}
      >
        {packages.map(pkg => {
          const active = pkg.pkg_id === (activePkg?.pkg_id ?? -1)
          return (
            <button
              type='button'
              key={pkg.pkg_id}
              title={pkg.pkg_name}
              onClick={() => {
                activePkgId.value = pkg.pkg_id
              }}
              style={{
                padding: '3px 8px',
                fontSize: '11px',
                lineHeight: 1.4,
                border: `1px solid ${PICKER_BORDER}`,
                borderRadius: '3px',
                background: active ? TAB_ACTIVE_BG : TAB_INACTIVE_BG,
                color: active ? TAB_ACTIVE_TEXT : '#555555',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flex: '0 0 auto',
              }}
            >
              {pkg.pkg_name}
            </button>
          )
        })}
      </div>
      <div
        style={{
          flex: '1 1 auto',
          overflowY: 'auto',
          padding: '8px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '4px',
          alignContent: 'flex-start',
        }}
      >
        {activePkg?.emoticons.map(emo => {
          const meta = getEmoticonLockMeta(emo)
          const titleParts: string[] = [emo.emoji]
          if (meta.titleSuffix) titleParts.push(meta.titleSuffix)
          return (
            <button
              type='button'
              key={emo.emoticon_id}
              title={titleParts.join('\n')}
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
              style={{
                position: 'relative',
                width: '52px',
                height: '52px',
                padding: '2px',
                border: `1px solid ${PICKER_BORDER}`,
                borderRadius: '4px',
                background: EMOTE_TILE_BG,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <img
                src={emo.url}
                alt={emo.emoji}
                loading='lazy'
                style={{
                  maxWidth: '44px',
                  maxHeight: '44px',
                  objectFit: 'contain',
                  opacity: meta.isLocked ? 0.5 : 1,
                }}
              />
              {meta.isLocked && (
                <span
                  style={{
                    position: 'absolute',
                    top: 1,
                    right: 1,
                    padding: '0 4px',
                    fontSize: '9px',
                    lineHeight: '12px',
                    color: '#fff',
                    borderRadius: '2px',
                    background: meta.badgeColor,
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
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

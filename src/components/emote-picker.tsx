import type { Signal } from '@preact/signals'
import { useSignal } from '@preact/signals'
import type { RefObject } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

import { computePos, PICKER_H, PICKER_W, type PickerPos } from '../lib/emote-picker-position'
import { getEmoticonLockMeta } from '../lib/emoticon'
import { notifyUser } from '../lib/log'
import { cachedEmoticonPackages } from '../lib/store'

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

  useEffect(() => {
    pos.value = computePosFor(anchorRef.current)
    const onResize = () => {
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
    document.addEventListener('mousedown', onDocMouseDown, true)
    document.addEventListener('keydown', onKeyDown, true)
    return () => {
      window.removeEventListener('resize', onResize)
      document.removeEventListener('mousedown', onDocMouseDown, true)
      document.removeEventListener('keydown', onKeyDown, true)
    }
  }, [anchorRef, onClose, pos])

  if (!open.value) return null

  if (packages.length === 0) {
    return (
      <div
        ref={rootRef}
        style={{
          position: 'fixed',
          ...pos.value,
          width: `${PICKER_W}px`,
          height: '64px',
          zIndex: 100000,
          background: 'var(--bg1, #fff)',
          border: '1px solid var(--Ga2, #ddd)',
          borderRadius: '6px',
          boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
          padding: '12px',
          color: '#999',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        表情数据加载中…
      </div>
    )
  }

  const activePkg = packages.find(p => p.pkg_id === activePkgId.value) ?? packages[0]

  return (
    <div
      ref={rootRef}
      role='dialog'
      aria-label='表情选择器'
      style={{
        position: 'fixed',
        ...pos.value,
        width: `${PICKER_W}px`,
        height: `${PICKER_H}px`,
        zIndex: 100000,
        background: 'var(--bg1, #fff)',
        border: '1px solid var(--Ga2, #ddd)',
        borderRadius: '6px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '6px 8px',
          borderBottom: '1px solid var(--Ga2, #eee)',
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
                border: '1px solid var(--Ga2, #ddd)',
                borderRadius: '3px',
                background: active ? '#36a185' : 'var(--bg2, #f5f5f5)',
                color: active ? '#fff' : '#555',
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
                border: '1px solid var(--Ga2, #ddd)',
                borderRadius: '4px',
                background: 'var(--bg2, #f5f5f5)',
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
    </div>
  )
}

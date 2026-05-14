import { signal } from '@preact/signals'
import type { ComponentChildren } from 'preact'
import { useEffect, useRef } from 'preact/hooks'

interface ConfirmOptions {
  title?: string
  body?: ComponentChildren
  confirmText?: string
  cancelText?: string
  anchor?: { x: number; y: number }
  resolve: (confirmed: boolean) => void
}

const pending = signal<ConfirmOptions | null>(null)

export function showConfirm(opts?: {
  title?: string
  body?: ComponentChildren
  confirmText?: string
  cancelText?: string
  anchor?: { x: number; y: number }
}): Promise<boolean> {
  return new Promise(resolve => {
    pending.value = { ...opts, resolve }
  })
}

export function AlertDialog() {
  const ref = useRef<HTMLDialogElement>(null)
  const p = pending.value

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (p) {
      dialog.showModal()

      if (p.anchor) {
        const rect = dialog.getBoundingClientRect()
        const x = Math.max(0, Math.min(p.anchor.x - rect.width / 2, window.innerWidth - rect.width))
        const y = Math.max(0, Math.min(p.anchor.y - rect.height - 8, window.innerHeight - rect.height))
        dialog.style.margin = '0'
        dialog.style.position = 'fixed'
        dialog.style.left = `${x}px`
        dialog.style.top = `${y}px`
      } else {
        dialog.style.margin = ''
        dialog.style.position = ''
        dialog.style.left = ''
        dialog.style.top = ''
      }
    } else {
      dialog.close()
    }
  }, [p])

  if (!p) return null

  const close = (confirmed: boolean) => {
    p.resolve(confirmed)
    pending.value = null
  }

  return (
    <dialog
      ref={ref}
      onCancel={e => {
        e.preventDefault()
        close(false)
      }}
      onClick={e => {
        if (p.anchor && e.target === ref.current) close(false)
      }}
      onKeyDown={e => {
        if (p.anchor && e.key === 'Escape') close(false)
      }}
      style={{
        border: '1px solid rgba(0, 0, 0, .08)',
        borderRadius: '8px',
        padding: '14px',
        maxWidth: '320px',
        fontSize: '12px',
        color: '#1d1d1f',
        background: 'rgba(248, 248, 250, .92)',
        boxShadow: '0 22px 60px rgba(0,0,0,.24)',
        backdropFilter: 'blur(26px) saturate(1.5)',
      }}
    >
      {p.title && <p style={{ margin: '0 0 .75em', wordBreak: 'break-all' }}>{p.title}</p>}
      {p.body && <div style={{ margin: '0 0 .75em', wordBreak: 'break-all' }}>{p.body}</div>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '.5em' }}>
        <button
          type='button'
          onClick={() => close(false)}
          style={{
            border: '1px solid rgba(0,0,0,.08)',
            borderRadius: '8px',
            background: '#fff',
            padding: '5px 10px',
          }}
        >
          {p.cancelText ?? '取消'}
        </button>
        <button
          type='button'
          onClick={() => close(true)}
          style={{
            border: '1px solid var(--cb-accent)',
            borderRadius: '8px',
            background: 'var(--cb-accent)',
            color: '#fff',
            padding: '5px 10px',
          }}
        >
          {p.confirmText ?? '确认'}
        </button>
      </div>
    </dialog>
  )
}

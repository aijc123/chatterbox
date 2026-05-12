// 场景 D 观察日志面板。条件渲染在「发送」tab 底部，仅当
// `chatfilterLogPanelEnabled === true` 时挂载。
//
// 数据源：subscribeNormalizeEvents()，由 chatfilter-runtime 在 auto-blend
// 走 normalize 时广播（仅 panel 启用 + 至少一个订阅者时广播）。
//
// 内存：200 行环形缓冲；超过即丢最旧。
// 性能：单次 push 是 O(1)；rerender 由 signal 自动管。

import { signal, useSignal } from '@preact/signals'
import { useEffect } from 'preact/hooks'

import type { NormalizeResult, StageId } from '../lib/chatfilter'

import {
  adoptReplacementCandidate,
  dismissReplacementCandidate,
  replacementFeedCandidates,
} from '../lib/chatfilter-replacement-feed'
import { subscribeNormalizeEvents } from '../lib/chatfilter-runtime'

const MAX_ROWS = 200

interface LogRow {
  ts: number
  raw: string
  canonical: string
  filtered: boolean
  stages: StageId[]
  isNew: boolean
  count: number
}

// 模块级信号 —— 多个面板挂载时共享同一份。
const rows = signal<LogRow[]>([])
let installed = false

function ensureInstalled(): () => void {
  if (installed) return () => {}
  installed = true
  const unsub = subscribeNormalizeEvents((r: NormalizeResult) => {
    const row: LogRow = {
      ts: Date.now(),
      raw: r.raw,
      canonical: r.canonical,
      filtered: r.filtered,
      stages: r.stageHits.map(h => h.stage),
      isNew: r.isNew,
      count: r.count,
    }
    const next = rows.value.length >= MAX_ROWS ? [...rows.value.slice(-(MAX_ROWS - 1)), row] : [...rows.value, row]
    rows.value = next
  })
  return () => {
    installed = false
    unsub()
  }
}

function stageEmoji(stage: StageId): string {
  switch (stage) {
    case 'preprocess':
      return '🧹'
    case 'alias':
      return '🔄'
    case 'variant':
    case 'pinyin':
      return '🔉'
    case 'cycle':
      return '♻️'
    case 'simhash':
      return '🔍'
    case 'dedup':
      return '#'
  }
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d
    .getSeconds()
    .toString()
    .padStart(2, '0')}`
}

export function ChatfilterLogPanel() {
  const filterText = useSignal('')

  // 面板挂载时确保订阅一次；这里不在 unmount 时取消订阅 —— 多面板共存或
  // tab 切换都让总线常驻；订阅本身没产物开销（仅在 chatfilter 主路径调用
  // 时 fire），关闭面板就够了。
  useEffect(() => {
    const cleanup = ensureInstalled()
    return cleanup
  }, [])

  const q = filterText.value.trim().toLowerCase()
  const visible = q
    ? rows.value.filter(r => r.raw.toLowerCase().includes(q) || r.canonical.toLowerCase().includes(q))
    : rows.value

  return (
    <details className='cb-settings-accordion' open>
      <summary>
        <span className='cb-accordion-title'>
          Chatfilter 观察日志（{rows.value.length}/{MAX_ROWS}）
        </span>
      </summary>
      <div className='cb-section cb-stack' style={{ margin: '.5em 0', paddingBottom: '1em' }}>
        <div className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type='search'
            placeholder='过滤 raw / canonical'
            value={filterText.value}
            onInput={e => {
              filterText.value = e.currentTarget.value
            }}
            style={{ flex: '1 1 200px' }}
          />
          <button
            type='button'
            onClick={() => {
              rows.value = []
            }}
            title='清空缓冲'
          >
            清空
          </button>
          <button
            type='button'
            onClick={() => {
              const json = JSON.stringify(rows.value, null, 2)
              navigator.clipboard?.writeText(json).catch(() => {})
            }}
            title='复制为 JSON 到剪贴板'
          >
            复制 JSON
          </button>
        </div>
        {replacementFeedCandidates.value.length > 0 && (
          <div
            style={{
              border: '1px solid var(--Ga2, #eee)',
              padding: '.25em .4em',
              margin: '.25em 0',
              background: 'rgba(255, 220, 100, 0.08)',
            }}
          >
            <div style={{ fontSize: '0.8em', color: '#666', marginBottom: '.2em' }}>
              替换规则候选（场景 C；命中 ≥ 10 次的高频归一化映射）：
            </div>
            {replacementFeedCandidates.value.slice(0, 8).map(c => (
              <div
                key={`${c.variant}->${c.canonical}`}
                style={{ display: 'flex', gap: '.4em', alignItems: 'center', padding: '2px 0', fontSize: '0.85em' }}
              >
                <span style={{ flex: '1 1 auto' }}>
                  <code>{c.variant}</code> → <code style={{ color: '#4a8' }}>{c.canonical}</code>
                  <span style={{ color: '#999', marginLeft: '.5em' }}>×{c.count}</span>
                </span>
                <button type='button' onClick={() => adoptReplacementCandidate(c)} title='写入当前房间替换规则'>
                  采纳
                </button>
                <button type='button' onClick={() => dismissReplacementCandidate(c)} title='本会话内不再提示'>
                  忽略
                </button>
              </div>
            ))}
          </div>
        )}
        <div
          style={{
            maxHeight: '320px',
            overflowY: 'auto',
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: '0.85em',
            border: '1px solid var(--Ga2, #eee)',
            padding: '.25em',
          }}
        >
          {visible.length === 0 ? (
            <div style={{ color: '#999', padding: '.5em' }}>{rows.value.length === 0 ? '等待弹幕…' : '过滤无匹配'}</div>
          ) : (
            visible
              .slice()
              .reverse()
              .map((r, idx) => (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: 环形缓冲，索引稳定
                  key={`${r.ts}-${idx}`}
                  style={{
                    padding: '2px 4px',
                    borderBottom: '1px dashed var(--Ga2, #f0f0f0)',
                    color: r.filtered ? '#999' : 'inherit',
                  }}
                  title={r.filtered ? '被 preprocess 丢弃' : `count=${r.count} ${r.isNew ? '(new)' : ''}`}
                >
                  <span style={{ color: '#999', marginRight: '.5em' }}>{fmtTime(r.ts)}</span>
                  <span>{r.raw}</span>
                  {!r.filtered && r.canonical !== r.raw && (
                    <>
                      <span style={{ margin: '0 .25em', color: '#999' }}>→</span>
                      <span style={{ color: '#4a8' }}>{r.canonical}</span>
                    </>
                  )}
                  {r.stages.length > 0 && (
                    <span style={{ marginLeft: '.5em' }}>{r.stages.map(stageEmoji).join('')}</span>
                  )}
                </div>
              ))
          )}
        </div>
      </div>
    </details>
  )
}

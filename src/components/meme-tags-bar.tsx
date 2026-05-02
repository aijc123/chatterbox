import type { LaplaceInternal } from '@laplace.live/internal'
import type { Signal } from '@preact/signals'
import { useMemo } from 'preact/hooks'

/**
 * Tag 颜色 → CSS 颜色（与 memes-list.tsx 一致，统一调色板）。
 */
const TAG_COLORS: Record<string, string> = {
  red: '#ef4444',
  yellow: '#eab308',
  fuchsia: '#d946ef',
  emerald: '#10b981',
  blue: '#3b82f6',
  orange: '#f97316',
  purple: '#a855f7',
  pink: '#ec4899',
  cyan: '#06b6d4',
  green: '#22c55e',
}

interface AggregatedTag {
  name: string
  emoji: string | null
  color: string
  count: number
}

/**
 * 烂梗库顶部 tag 导航条：把当前梗列表里出现过的所有 tag 聚合，按使用次数降序，
 * 用户点击 = 写入 `filterText` 信号；再点同一个 = 取消过滤。
 *
 * 与 MemeItem 内联 tag 共用同一个 `filterText`，行为一致。
 */
export function MemeTagsBar({
  memes,
  filterText,
}: {
  memes: LaplaceInternal.HTTPS.Workers.MemeWithUser[]
  filterText: Signal<string>
}) {
  const aggregated = useMemo(() => {
    const map = new Map<string, AggregatedTag>()
    for (const m of memes) {
      for (const t of m.tags) {
        const existing = map.get(t.name)
        if (existing) {
          existing.count++
        } else {
          const colorKey = t.color ?? 'blue'
          map.set(t.name, {
            name: t.name,
            emoji: t.emoji ?? null,
            color: TAG_COLORS[colorKey] ?? '#888',
            count: 1,
          })
        }
      }
    }
    return [...map.values()].sort((a, b) => b.count - a.count)
  }, [memes])

  if (aggregated.length === 0) return null

  const active = filterText.value.trim()

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '.25em',
        marginBottom: '.5em',
        paddingBottom: '.4em',
        borderBottom: '1px dashed var(--Ga2, #ddd)',
      }}
    >
      <span style={{ fontSize: '11px', color: '#666', alignSelf: 'center', marginRight: '.25em' }}>标签：</span>
      {aggregated.map(t => {
        const isActive = active === t.name
        return (
          <button
            type='button'
            key={t.name}
            className='cb-tag'
            onClick={() => {
              filterText.value = isActive ? '' : t.name
            }}
            title={`按「${t.name}」筛选（${t.count} 条）`}
            style={{
              appearance: 'none',
              border: isActive ? '1.5px solid #000' : 'none',
              outline: 'none',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '.15em',
              padding: '.05em .4em',
              borderRadius: '2px',
              fontSize: '10px',
              lineHeight: 1.6,
              color: '#fff',
              background: t.color,
              fontFamily: 'inherit',
              transition: 'filter .15s, opacity .15s',
              opacity: isActive ? 1 : 0.85,
            }}
          >
            {t.emoji ?? ''}
            {t.name}
            <span style={{ opacity: 0.7, marginLeft: '.15em' }}>{t.count}</span>
          </button>
        )
      })}
    </div>
  )
}

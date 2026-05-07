import { lookupTrendingMatch, trendingMemeKeys } from '../lib/meme-trending'

/**
 * Compact 🔥 chip rendered next to a meme card when radar reports the meme
 * is trending across rooms today.
 *
 * Self-contained: looks up `content` against `trendingMemeKeys` itself so
 * the parent component can place it without managing match state. Returns
 * `null` (renders nothing) when the meme is not trending — the parent can
 * unconditionally drop one of these next to the meme content.
 *
 * Lives in its own file so it can be unit-tested without dragging in the
 * full MemesList component tree.
 */
export function TrendingBadge({ content }: { content: string }) {
  // Read .value to subscribe this component to signal updates. When
  // refreshTrendingMemes() lands a new map, every TrendingBadge re-renders.
  void trendingMemeKeys.value
  const match = lookupTrendingMatch(content)
  if (!match) return null
  const title = `今日跨房间热门 · 第 ${match.rank} 位（簇 #${match.clusterId}）`
  return (
    <span
      title={title}
      style={{
        display: 'inline-block',
        flexShrink: 0,
        marginRight: '.3em',
        padding: '0 .25em',
        fontSize: '10px',
        lineHeight: 1.6,
        verticalAlign: 'middle',
      }}
    >
      🔥
    </span>
  )
}

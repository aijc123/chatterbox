import { VARIANTS_VERSION } from '../../lib/chatfilter'
import {
  chatfilterAffectAutoBlendTrend,
  chatfilterAffectCustomChatFold,
  chatfilterAggressiveness,
  chatfilterEnabled,
  chatfilterFeedReplacementLearn,
  chatfilterLogPanelEnabled,
  chatfilterRemoteEnabled,
  chatfilterRemoteEndpoint,
} from '../../lib/store-chatfilter'
import { matchesSearchQuery } from './search'

const SECTION_KEYWORDS =
  'chatfilter 弹幕归一化 同义 canonical 趋势 聚类 cluster normalize 拼音 simhash trend 牛逼 niubi yyds 哈哈哈 别名 alias variants'

/**
 * Chatfilter 设置段（场景 A/B/C/D + aggressiveness + 远程聚类）。
 *
 * 默认值：
 *   - 总开关 + 场景 A 默认开（trendMap 用 canonical，增强 auto-blend）。
 *   - 场景 B/C/D 默认关——它们会改变用户可感知的 UI 行为，让用户主动开。
 *   - aggressiveness 默认 'normal'；'aggressive' 启用 simhash 自动合并，
 *     有一定误合并风险，UI 上加警告。
 *   - 远程聚类默认关；endpoint 必填才能勾选启用。
 */
export function ChatfilterSection({ query = '' }: { query?: string }) {
  if (!matchesSearchQuery(SECTION_KEYWORDS, query)) return null

  const disabled = !chatfilterEnabled.value

  return (
    <details className='cb-settings-accordion'>
      <summary>
        <span className='cb-accordion-title'>Chatfilter 弹幕归一化</span>
      </summary>
      <div className='cb-section cb-stack' style={{ margin: '.5em 0', paddingBottom: '1em' }}>
        <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', marginBottom: '.5em' }}>
          把 "niubi"/"NB"/"牛批" 这类同义弹幕合并为同一条 canonical（"牛逼"），让自动跟车的相似计数更准。 源字典 v
          {VARIANTS_VERSION}。
        </div>

        <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}>
          <input
            type='checkbox'
            checked={chatfilterEnabled.value}
            onChange={e => {
              chatfilterEnabled.value = e.currentTarget.checked
            }}
          />
          <span>启用 Chatfilter（总开关）</span>
        </label>

        <fieldset
          style={{
            border: '1px solid var(--Ga2, #eee)',
            padding: '.5em',
            margin: '.5em 0 0',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <legend style={{ fontSize: '0.85em', color: '#666', padding: '0 .25em' }}>场景开关</legend>

          <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}>
            <input
              type='checkbox'
              checked={chatfilterAffectAutoBlendTrend.value}
              disabled={disabled}
              onChange={e => {
                chatfilterAffectAutoBlendTrend.value = e.currentTarget.checked
              }}
            />
            <span title='同义弹幕合并为一条趋势，threshold 命中更准。建议开启。'>A · 自动跟车趋势用 canonical</span>
          </label>

          <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}>
            <input
              type='checkbox'
              checked={chatfilterAffectCustomChatFold.value}
              disabled={disabled}
              onChange={e => {
                chatfilterAffectCustomChatFold.value = e.currentTarget.checked
              }}
            />
            <span title='Chatterbox Chat 把相邻同 canonical 的弹幕折叠为一张卡，"niubi"/"NB"/"牛批" 计同一条。'>
              B · Custom Chat 同义折叠
            </span>
          </label>

          <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}>
            <input
              type='checkbox'
              checked={chatfilterFeedReplacementLearn.value}
              disabled={disabled}
              onChange={e => {
                chatfilterFeedReplacementLearn.value = e.currentTarget.checked
              }}
            />
            <span title='同房间内同一 variant→canonical 命中 ≥10 次 → 出现在观察日志面板的候选规则区，点「采纳」才写入当前房间的替换规则。'>
              C · 喂替换规则学习候选
            </span>
          </label>

          <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}>
            <input
              type='checkbox'
              checked={chatfilterLogPanelEnabled.value}
              disabled={disabled}
              onChange={e => {
                chatfilterLogPanelEnabled.value = e.currentTarget.checked
              }}
            />
            <span title='在「发送」tab 底部显示一个 200 行环形缓冲，实时打印每条弹幕的归一化过程。'>
              D · 观察日志面板
            </span>
          </label>
        </fieldset>

        <div
          className='cb-row'
          style={{
            display: 'flex',
            gap: '.5em',
            alignItems: 'center',
            marginTop: '.5em',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <label htmlFor='chatfilterAggr' style={{ color: '#666' }}>
            算法档位：
          </label>
          <select
            id='chatfilterAggr'
            value={chatfilterAggressiveness.value}
            disabled={disabled}
            onChange={e => {
              const v = e.currentTarget.value
              if (v === 'safe' || v === 'normal' || v === 'aggressive') {
                chatfilterAggressiveness.value = v
              }
            }}
          >
            <option value='safe'>safe（仅清洗 + 去重 + 循环压缩）</option>
            <option value='normal'>normal（+ 字典别名 + 谐音）</option>
            <option value='aggressive'>aggressive（+ SimHash 自动合并，有误合并风险）</option>
          </select>
        </div>

        <fieldset
          style={{
            border: '1px solid var(--Ga2, #eee)',
            padding: '.5em',
            margin: '.5em 0 0',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <legend style={{ fontSize: '0.85em', color: '#666', padding: '0 .25em' }}>远程语义聚类（可选）</legend>
          <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', marginBottom: '.4em' }}>
            前端归一化已经覆盖 80% 的变体；如果要 BGE-small-zh 级别的语义聚类（"难听" ↔ "南亭" 跨字面合并），
            需要自己部署 Chatfilter Python 服务（VPS / Fly.io / Render），把 endpoint 填到这里。
          </div>
          <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap' }}>
            <span>Endpoint：</span>
            <input
              type='url'
              placeholder='http://localhost:8766'
              value={chatfilterRemoteEndpoint.value}
              disabled={disabled}
              style={{ flex: '1 1 220px' }}
              onInput={e => {
                chatfilterRemoteEndpoint.value = e.currentTarget.value
              }}
            />
          </label>
          <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center', marginTop: '.4em' }}>
            <input
              type='checkbox'
              checked={chatfilterRemoteEnabled.value}
              disabled={disabled || !chatfilterRemoteEndpoint.value.trim()}
              onChange={e => {
                chatfilterRemoteEnabled.value = e.currentTarget.checked
              }}
            />
            <span>启用远程聚类（勾选后自动 ingest + SSE 订阅）</span>
          </label>
        </fieldset>
      </div>
    </details>
  )
}

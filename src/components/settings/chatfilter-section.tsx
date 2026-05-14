import { VARIANTS_VERSION } from '../../lib/chatfilter'
import {
  chatfilterAffectAutoBlendTrend,
  chatfilterAffectCustomChatFold,
  chatfilterAggressiveness,
  chatfilterEnabled,
  chatfilterFeedReplacementLearn,
  chatfilterLogPanelEnabled,
} from '../../lib/store-chatfilter'
import { ChatfilterLogPanel } from '../chatfilter-log-panel'
import { matchesSearchQuery } from './search'

// "debug" / "调试" 关键字也算命中 —— 搜索 "chatfilter debug" 才会展开开发者选项区。
const SECTION_KEYWORDS = '智能识别同义弹幕 同义 折叠 重复 牛逼 niubi yyds 哈哈哈 chatfilter debug 调试'

/**
 * 「智能识别同义弹幕」设置段。
 *
 * 用户视角只暴露 2 个开关：
 *   - 启用（总开关；同时驱动自动跟车趋势用 canonical，这是默认行为）
 *   - 在右侧聊天面板把重复弹幕折叠显示（Chatterbox Chat 的同义折叠）
 *
 * 算法档位、观察日志面板、替换规则学习候选这些"开发者调试用"的开关，
 * 默认隐藏；用户在设置搜索框输入 "chatfilter debug" 才会展开。普通用户
 * 不会偶然碰到。
 *
 * 远程语义聚类那一整段已经从 UI 移除（需要自托管 Python 后端，普通
 * 用户用不上）；signal 还在 store 里以保留底层机器，但没有 UI 入口。
 */
export function ChatfilterSection({ query = '' }: { query?: string }) {
  if (!matchesSearchQuery(SECTION_KEYWORDS, query)) return null
  const q = query.toLowerCase()
  const isDebug = q.includes('debug') || q.includes('调试')
  const disabled = !chatfilterEnabled.value

  return (
    <details className='cb-settings-accordion'>
      <summary>
        <span className='cb-accordion-title'>智能识别同义弹幕</span>
      </summary>
      <div className='cb-section cb-stack' style={{ margin: '.5em 0', paddingBottom: '1em' }}>
        <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', marginBottom: '.5em' }}>
          把"niubi"/"NB"/"牛批"/"牛逼"这类同义弹幕当成一条，让自动跟车判断更准。
        </div>

        <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}>
          <input
            type='checkbox'
            checked={chatfilterEnabled.value}
            onChange={e => {
              chatfilterEnabled.value = e.currentTarget.checked
            }}
          />
          <span>启用</span>
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
          <span title='Chatterbox Chat（右侧聊天面板）相邻的同义弹幕合并成一条，显示"牛逼 ×3"。'>
            在右侧聊天面板把重复弹幕折叠显示
          </span>
        </label>

        {isDebug && (
          <fieldset
            style={{
              border: '1px solid var(--Ga2, #eee)',
              padding: '.5em',
              margin: '.75em 0 0',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <legend style={{ fontSize: '0.85em', color: '#888', padding: '0 .25em' }}>
              开发者选项（搜索 "chatfilter debug" 可见）
            </legend>

            <label className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center' }}>
              <input
                type='checkbox'
                checked={chatfilterAffectAutoBlendTrend.value}
                disabled={disabled}
                onChange={e => {
                  chatfilterAffectAutoBlendTrend.value = e.currentTarget.checked
                }}
              />
              <span title='关掉后自动跟车回到字面匹配。默认开。'>自动跟车趋势使用 canonical</span>
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
              <span title='高频归一化映射（命中 ≥10 次）出现在观察日志面板的候选区，点采纳才写入房间替换规则。'>
                喂替换规则学习候选
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
              <span title='200 行环形缓冲，实时打印每条弹幕的归一化过程；勾上后展开在本节下方。'>
                展开观察日志（开发者）
              </span>
            </label>

            <div className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center', marginTop: '.5em' }}>
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

            <div style={{ fontSize: '0.8em', color: '#888', marginTop: '.5em' }}>字典版本 v{VARIANTS_VERSION}</div>
          </fieldset>
        )}

        {/*
         * 观察日志面板：开发者排查"为什么这两条弹幕被自动跟车合并"用的。
         * 默认折在本节下面（仅在开发者勾了上面的开关后渲染），不再出现在
         * 首页。原本在 configurator.tsx 主页底部硬挂——首页应该只放"开车
         * /跟车/发弹幕"三件事，调试工具属于设置。
         */}
        {chatfilterLogPanelEnabled.value && (
          <div style={{ marginTop: '.75em' }}>
            <ChatfilterLogPanel />
          </div>
        )}
      </div>
    </details>
  )
}

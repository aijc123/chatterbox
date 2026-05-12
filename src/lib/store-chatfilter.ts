import { signal } from '@preact/signals'

import type { Aggressiveness, RemoteStatus } from './chatfilter/types'

import { gmSignal, numericGmSignal } from './gm-signal'

// ────────────────────────────────────────────────────────────────────────
// Chatfilter store
// ────────────────────────────────────────────────────────────────────────
//
// 弹幕语义归一化（Chatfilter 移植 → chatterbox 内置）的所有持久化开关。
// 与 store-replacement / store-shadow-learn 互不耦合：本模块只决定"识别
// 同一句话"，后两者管"发送前/后改写"。
//
// 默认值哲学：仅"场景 A"（auto-blend 趋势用 canonical）开。其他场景默认关，
// 因为同义折叠/学习喂数据/log panel 都会改变用户可感知的 UI 行为，让用户
// 主动开比悄悄开更安全。

// ── 总开关 / 场景开关 ───────────────────────────────────────────────────

export const chatfilterEnabled = gmSignal('chatfilterEnabled', true)

/** 场景 A：把 auto-blend trendMap 的 key 从 raw 文本换成 canonical。
 *  "哈哈哈"/"哈哈哈哈"/"hhh" 合并为同一趋势，threshold 命中更准。 */
export const chatfilterAffectAutoBlendTrend = gmSignal('chatfilterAffectAutoBlendTrend', true)

/** 场景 B：Custom Chat 同义折叠（虚拟列表把相邻同 canonical 合并显示）。
 *  默认关 —— 折叠会改变阅读密度，让用户主动启用。 */
export const chatfilterAffectCustomChatFold = gmSignal('chatfilterAffectCustomChatFold', false)

/** 场景 C：把高频 alias hit（variant→canonical）喂给 replacement.ts 学习路径。
 *  默认关 —— 只产生候选，不自动写入 localRoomRules。 */
export const chatfilterFeedReplacementLearn = gmSignal('chatfilterFeedReplacementLearn', false)

/** 场景 D：观察日志面板（在「发送」tab 底部条件渲染）。 */
export const chatfilterLogPanelEnabled = gmSignal('chatfilterLogPanelEnabled', false)

// ── 算法档位 ─────────────────────────────────────────────────────────────

const isAggressiveness = (v: unknown): v is Aggressiveness => v === 'safe' || v === 'normal' || v === 'aggressive'

export const chatfilterAggressiveness = gmSignal<Aggressiveness>('chatfilterAggressiveness', 'normal', {
  validate: isAggressiveness,
})

/** cycle-compress / dedup 的 LRU/cap 上限。 */
export const chatfilterMaxLruSize = numericGmSignal('chatfilterMaxLruSize', 4096, {
  min: 64,
  max: 65536,
  integer: true,
})

// ── 远程聚类（M4 才会真用上，先把 store 占位） ────────────────────────────

export const chatfilterRemoteEnabled = gmSignal('chatfilterRemoteEnabled', false)

/** Chatfilter Python 服务的 endpoint，形如 `http://localhost:8766`。空 = 未配置. */
export const chatfilterRemoteEndpoint = gmSignal('chatfilterRemoteEndpoint', '')

/** 可选 Bearer 令牌（自托管加一层简单鉴权）。 */
export const chatfilterRemoteAuthToken = gmSignal('chatfilterRemoteAuthToken', '')

/** 运行时连接状态，**非持久化**（每次启动重新探测）。 */
export const chatfilterRemoteStatus = signal<RemoteStatus>('idle')

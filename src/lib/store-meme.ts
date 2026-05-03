import { signal } from '@preact/signals'

import type { LaplaceMemeWithSource } from './sbhzm-client'

import { gmSignal } from './gm-signal'

// Meme Contributor (社区烂梗贡献者)
export const enableMemeContribution = gmSignal('enableMemeContribution', false)

// roomId(String) → 候选梗列表
export const memeContributorCandidatesByRoom = gmSignal<Record<string, string[]>>('memeContributorCandidatesByRoom', {})

// roomId(String) → 已见(被忽略或已贡献)梗列表
export const memeContributorSeenTextsByRoom = gmSignal<Record<string, string[]>>('memeContributorSeenTextsByRoom', {})

// chatterbox-cloud 自建后端
// 默认 false——未启用前 userscript 的行为完全等同于旧版,不影响现有用户。
export const cbBackendEnabled = gmSignal('cbBackendEnabled', false)

// 开发用:覆盖 BASE_URL.CB_BACKEND。Phase A 必须填 'http://localhost:8787' 才能验收。
// 留空 = 用 BASE_URL.CB_BACKEND(指向待部署的生产 *.workers.dev)。
export const cbBackendUrlOverride = gmSignal('cbBackendUrlOverride', '')

/**
 * 当前直播间的合并梗列表（运行时共享 signal）。
 *
 * 由 `MemesList` 组件每次成功 loadMemes 时写入；其它需要"按当前梗集做事"
 * 的兄弟组件（如智能辅助驾驶）通过订阅这个 signal 拿到最新数据，避免再发起
 * 重复的网络请求。MemesList 默认 30s 轮询保证数据新鲜。
 */
export const currentMemesList = signal<LaplaceMemeWithSource[]>([])

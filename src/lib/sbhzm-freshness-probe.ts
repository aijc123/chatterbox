/**
 * SBHZM 保鲜探测器。
 *
 * Phase D.1 起,SBHZM 数据保鲜的主要机制是**前端用户**而不是后端 cron:
 * 每个 userscript 用户每次打开梗库面板时,通过 `fetchSbhzmFirstPage` 拉一次
 * 首页(~100 条最新),把结果 mirror 到 chatterbox-cloud。后端 cron 看到
 * `contributions` 表里有用户活动后会跳过本次拉取,只在用户长期不在线时兜底。
 *
 * 这样做的好处:
 *  - SBHZM 站长视角看到的是真实用户分散浏览器请求,不是后端集中扒库
 *  - 自然限流:用户活跃度本身就是流量上限
 *  - 保鲜频率随用户量自动伸缩
 *
 * 节流:每个 listEndpoint 30 分钟一次。同房间多次 mount(用户来回切 tab)只
 * 会触发一次。多房间同时打开则各自独立计时(可能同时探测,但每个房间都是
 * 30 分钟一次,总流量上限是「房间数 × 2 次/小时」)。
 */

import type { MemeSource } from './meme-sources'

import { mirrorToCbBackend } from './cb-backend-client'
import { fetchSbhzmFirstPage } from './sbhzm-client'
import { cbBackendEnabled } from './store-meme'

const PROBE_INTERVAL_MS = 30 * 60 * 1000 // 30 分钟

/** 每个 listEndpoint 上次探测时间(运行时,不持久化)。 */
const lastProbeByEndpoint = new Map<string, number>()

export interface ProbeOptions {
  /** 测试覆盖:固定 now 值,默认 Date.now()。 */
  now?: number
  /** 测试覆盖:跳过 cbBackendEnabled 闸门,默认按全局 signal 取值。 */
  forceEnabled?: boolean
}

export type ProbeOutcome = 'skipped_disabled' | 'skipped_no_source' | 'skipped_throttled' | 'probed'

export interface ProbeResult {
  outcome: ProbeOutcome
  itemsFetched?: number
}

/**
 * 在节流允许时探测 SBHZM 首页 + mirror 推到后端。背景任务,失败不弹通知。
 *
 * @returns 实际行为(用于测试断言)。
 */
export async function maybeProbeSbhzmFreshness(
  source: MemeSource | null,
  options: ProbeOptions = {}
): Promise<ProbeResult> {
  if (!source) return { outcome: 'skipped_no_source' }
  const enabled = options.forceEnabled ?? cbBackendEnabled.value
  if (!enabled) return { outcome: 'skipped_disabled' }

  const now = options.now ?? Date.now()
  const last = lastProbeByEndpoint.get(source.listEndpoint) ?? 0
  if (now - last < PROBE_INTERVAL_MS) return { outcome: 'skipped_throttled' }

  // 占位(防并发触发):先写入 now,再去 fetch。即使 fetch 失败,30 分钟内也
  // 不会重试 —— 这是 acceptable cost,毕竟 cron 还会兜底。
  lastProbeByEndpoint.set(source.listEndpoint, now)

  let items: Awaited<ReturnType<typeof fetchSbhzmFirstPage>> = []
  try {
    items = await fetchSbhzmFirstPage(source)
  } catch {
    return { outcome: 'probed', itemsFetched: 0 }
  }

  if (items.length > 0) {
    try {
      await mirrorToCbBackend(items, 'sbhzm')
    } catch {
      // 后端 mirror 失败不阻塞;用户的发送链路完全独立。
    }
  }

  return { outcome: 'probed', itemsFetched: items.length }
}

/** 测试用:清空节流状态。 */
export function _resetSbhzmProbeStateForTests(): void {
  lastProbeByEndpoint.clear()
}

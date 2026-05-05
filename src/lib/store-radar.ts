/**
 * live-meme-radar 客户端的 GM-persisted 设置 signal。
 *
 * 与 chatterbox-cloud 后端不同，radar 是一个独立的"传感器/雷达"项目
 * (https://github.com/aijc123/live-meme-radar)，userscript 既可以
 *  1. 读 — 通过 /radar/cluster-rank 给"自动跟车"加一个软门
 *  2. 写 — 通过 /radar/report 把本房间的聚合统计回传(隐私安全:只送 hash 后的
 *     uid 和聚合后的文本计数,绝不送单条消息明文 + uid)
 *
 * 两条路径默认 false。已有用户在不勾选任何开关之前不会看到任何行为差异。
 */

import { gmSignal } from './gm-signal'

/**
 * 软门:在 auto-blend 的"trend gate"通过后,额外查一下 radar 的 cluster-rank。
 *  - 命中 isTrending=true → 视作跨房间 meme,给候选 +1
 *  - 命中 isTrending=false 且本房间是 single-room 候选 → 视作本房间噪声,给 -1
 * 默认关闭(放行所有现有用户的行为)。
 */
export const radarConsultEnabled = gmSignal('radarConsultEnabled', false)

/**
 * 数据双源:在用户启用后,把本房间的聚合 sample(短文本 + 时间窗口)POST 到
 * /radar/report。endpoint 在 radar Week 9-10 才上线,在那之前打开开关也只会
 * 静默失败,不会产生用户可见错误。
 *
 * 隐私契约:
 *  - 只发短文本数组(已 dedupe + count),不送单条 ws-message + 发送者 uid
 *  - 如果一定要送 uid,会用 SHA-256(salt + uid) 哈希,salt 与 chatterbox 复用
 *  - 默认 false,且不会持久化任何 PII
 */
export const radarReportEnabled = gmSignal('radarReportEnabled', false)

/**
 * 开发用:覆盖 BASE_URL.RADAR_BACKEND。留空走默认。仅放行:
 *  - https://<任意 host>
 *  - http://localhost / 127.0.0.1 / [::1]
 * 与 cb-backend 同一套 normalize 规则。
 */
export const radarBackendUrlOverride = gmSignal('radarBackendUrlOverride', '')

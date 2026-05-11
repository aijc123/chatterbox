/**
 * live-meme-radar 客户端的 GM-persisted 设置 signal。
 *
 * radar 是一个独立的只读"传感器"项目（https://github.com/aijc123/live-meme-radar）：
 * 聚类几十个直播间的弹幕成跨房间 meme。当前 release 把雷达数据用作烂梗库的
 * "🔥 跨房间热门"徽章信号——纯被动展示，不影响发送行为，不暴露给用户的
 * 设置面板。三个 signal 保留只为 1) 兼容老用户已存的 GM storage 值不会被
 * 误读为别的类型；2) 给将来的实验性开关留位置。
 */

import { gmSignal } from './gm-signal'

/**
 * @public Future-reserved (not currently read by any production path).
 *
 * Was the user-facing "radar 软门 / boost" toggle in 2.11.0–2.11.1; removed
 * from the UI in 2.11.2 once we decided radar should only feed passive
 * surfaces (烂梗库徽章). Kept declared so any persisted `false`/`true` from
 * old users round-trips through gm-signal type guards without warnings.
 */
export const radarConsultEnabled = gmSignal('radarConsultEnabled', false)

/**
 * Future-reserved (not exposed, not called).
 *
 * Was meant to gate `POST /radar/report` (sample upload). The endpoint
 * never landed in production and the UI never shipped a stable toggle.
 * Kept declared for the same forward-compat reason as radarConsultEnabled.
 *
 * Privacy contract (if it ever gets wired up):
 *  - aggregated short-text counts only, never single ws-message + uid pairs
 *  - if uid is ever sent, it is SHA-256(salt + uid)
 */
export const radarReportEnabled = gmSignal('radarReportEnabled', false)

/**
 * 开发用:覆盖 BASE_URL.RADAR_BACKEND。留空走默认。仅放行:
 *  - https://<任意 host>
 *  - http://localhost / 127.0.0.1 / [::1]
 * 与 cb-backend 同一套 normalize 规则。
 */
export const radarBackendUrlOverride = gmSignal('radarBackendUrlOverride', '')

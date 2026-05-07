/**
 * live-meme-radar 客户端的 GM-persisted 设置 signal。
 *
 * radar 是一个独立的只读"传感器"项目（https://github.com/aijc123/live-meme-radar）：
 * 聚类几十个直播间的弹幕成跨房间 meme，并把 trending 信号开放给 userscript。
 * 当前 release 只读取该信号作为自动跟车的可选信心提示。
 */

import { gmSignal } from './gm-signal'

/**
 * Optional cross-room heat boost for auto-follow (experimental, default OFF).
 * When enabled, auto-blend consults /radar/cluster-rank before each send;
 * a confirmed trending rank yields a positive log line, all other outcomes
 * are no-ops. Never blocks, skips, or alters the local send.
 */
export const radarConsultEnabled = gmSignal('radarConsultEnabled', false)

/**
 * Future-reserved (not exposed in the UI as of 2.11.0).
 *
 * If/when the radar `/radar/report` endpoint ships and we decide to surface
 * this control, callers can opt in via GM storage. The current release does
 * not call reportRadarObservation() from any production path, and the
 * settings panel does not render this toggle.
 *
 * Privacy contract (still valid for any future use):
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

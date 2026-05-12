// Chatfilter Python 服务的轻量 HTTP 客户端。
//
// 所有请求走 gm-fetch（GM_xmlhttpRequest）以绕开 CORS —— 后端虽然回了
// `Access-Control-Allow-Origin: *`，但用户填的 endpoint 可能是 IP:port、
// localhost 或自签证书，浏览器原生 fetch 会拦掉 mixed-content / 私网。
// gm-fetch 给我们 `'*'` 兜底 + Tampermonkey 弹窗确认双重闸门。
//
// API 与 Chatfilter `src/network/http_server.py` 对齐：
//   - POST /ingest?text=<encoded>&room=<id>   → 文本回 "ok"
//   - GET  /state                              → JSON: ClusterStateSnapshot
//   - POST /admin/threshold?centroid=&anchor=  → 文本回 "ok"
//   - GET  /events                              → SSE（在 remote-sse 单独处理）

import { gmFetch } from '../gm-fetch'

export interface RemoteClientOptions {
  endpoint: string
  /** 可选 Bearer，附加到 Authorization 头。 */
  authToken?: string
  /** 默认 8000ms；ingest 路径建议短超时（200 msg/s 时不能堆 promise）。 */
  ingestTimeoutMs?: number
  /** 默认 12000ms。 */
  stateTimeoutMs?: number
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.replace(/\/+$/, '')
}

function authHeaders(token?: string): Record<string, string> | undefined {
  if (!token) return undefined
  return { Authorization: `Bearer ${token}` }
}

export interface IngestResult {
  ok: boolean
  /** 服务返回的原始 body（一般是 "ok" 或 JSON）。失败时是错误描述。 */
  body: string
}

export async function ingest(text: string, roomId: number | null, opts: RemoteClientOptions): Promise<IngestResult> {
  const params = new URLSearchParams()
  params.set('text', text)
  if (roomId !== null) params.set('room', String(roomId))
  const url = `${normalizeEndpoint(opts.endpoint)}/ingest?${params.toString()}`
  try {
    const resp = await gmFetch(url, {
      method: 'POST',
      headers: authHeaders(opts.authToken),
      timeoutMs: opts.ingestTimeoutMs ?? 8000,
    })
    return { ok: resp.ok, body: resp.text() }
  } catch (err) {
    return { ok: false, body: err instanceof Error ? err.message : String(err) }
  }
}

export interface StateSnapshot {
  ingested?: number
  unique?: number
  centroid?: number
  anchor?: number
  clusters?: unknown[]
  permanent?: unknown[]
  // 服务返回的字段可能演进；保留 unknown，调用方自己窄化。
  [k: string]: unknown
}

export async function fetchState(opts: RemoteClientOptions): Promise<StateSnapshot | { error: string }> {
  const url = `${normalizeEndpoint(opts.endpoint)}/state`
  try {
    const resp = await gmFetch(url, {
      method: 'GET',
      headers: authHeaders(opts.authToken),
      timeoutMs: opts.stateTimeoutMs ?? 12000,
    })
    if (!resp.ok) return { error: `${resp.status} ${resp.statusText}` }
    try {
      return resp.json<StateSnapshot>()
    } catch {
      return { error: 'invalid JSON response' }
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) }
  }
}

export async function setThreshold(
  centroid: number,
  anchor: number,
  opts: RemoteClientOptions
): Promise<{ ok: boolean; body: string }> {
  const url = `${normalizeEndpoint(opts.endpoint)}/admin/threshold?centroid=${centroid}&anchor=${anchor}`
  try {
    const resp = await gmFetch(url, {
      method: 'POST',
      headers: authHeaders(opts.authToken),
      timeoutMs: 8000,
    })
    return { ok: resp.ok, body: resp.text() }
  } catch (err) {
    return { ok: false, body: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * 抽出自 `components/llm-api-config.tsx`：OpenAI 兼容 base URL 的格式 + 钓鱼
 * 防护校验。原本是组件内私有函数,但 (a) 是纯函数没有 React/Preact 依赖,
 * (b) 钓鱼防护清单是安全关键路径,值得单独测试,所以挪到 lib 层。
 *
 * 设计要点：
 * - 不阻断未知服务商,只显示黄色提示——用户自部署、Ollama 局域网、新服务商
 *   都得允许通过。TM 弹窗仍是最后一道闸门。
 * - hostname 白名单用 `endsWith('.' + suffix)` 或精确匹配,避免
 *   `evil-deepseek.com` 这种钓鱼域假冒 `deepseek.com`。
 * - 局域网 / 本机 hostname (Ollama 等本地服务) 跳过白名单检查。
 */

/**
 * 已知 OpenAI 兼容服务商的 hostname 白名单。命中 = 静默通过；不命中 = 显示
 * 黄色"未知服务商"提示，并不阻断（用户自部署 / Ollama 局域网 / 新服务商
 * 都需要能通过）。仅文案级提醒——TM 弹窗仍是最后一道闸门。
 *
 * 列表来源：[const.ts](./const.ts) 注释 + UI placeholder + 社区常用。
 */
export const KNOWN_LLM_HOSTS = [
  'api.anthropic.com',
  'api.openai.com',
  'api.deepseek.com',
  'api.moonshot.cn',
  'openrouter.ai',
  'token-plan-sgp.xiaomimimo.com',
  'api.siliconflow.cn',
  'api.together.xyz',
  'api.groq.com',
] as const

/**
 * 局域网 / 本机 hostname，Ollama 等本地服务常用，不视为可疑。
 *
 * IPv6 注意：`URL` 把 `http://[::1]:8080` 的 hostname 解析成 `[::1]`（带方括
 * 号）；如果直接传 IPv6 字面量字符串则没有方括号。两种来源都要支持,所以
 * 调用前先剥一次方括号。
 */
export function isLocalHost(hostname: string): boolean {
  const h = hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname
  if (h === 'localhost' || h === '127.0.0.1' || h === '::1') return true
  if (/^192\.168\./.test(h)) return true
  if (/^10\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true
  if (h.endsWith('.local')) return true
  return false
}

export function isKnownLlmHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  return KNOWN_LLM_HOSTS.some(known => h === known || h.endsWith(`.${known}`))
}

export interface LlmBaseUrlValidation {
  severity: 'error' | 'warn'
  message: string
}

/**
 * Quick sanity-check on the OpenAI-compatible Base URL. The test-connection
 * button already exercises the real upstream, but the user normally clicks
 * it once after typing — and they shouldn't have to round-trip to learn the
 * URL is missing a scheme.
 *
 * 返回 `{ severity, message }`：
 * - `'error'`: URL 格式问题（红字）
 * - `'warn'`: 域名不在已知服务商白名单（黄字，不阻断）
 * - `null`: 通过校验
 */
export function validateLlmBaseUrl(raw: string): LlmBaseUrlValidation | null {
  if (!/^https?:\/\//i.test(raw)) {
    return { severity: 'error', message: '缺少协议前缀，请加 http:// 或 https://' }
  }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return { severity: 'error', message: 'URL 格式不合法' }
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { severity: 'error', message: '只支持 http:// 或 https:// 协议' }
  }
  if (!url.hostname) return { severity: 'error', message: 'URL 缺少主机名' }
  if (!isKnownLlmHost(url.hostname) && !isLocalHost(url.hostname)) {
    return {
      severity: 'warn',
      message: `这个域名（${url.hostname}）不在已知 LLM 服务商列表里。请确认是你信任的服务商（如 DeepSeek/Moonshot/OpenRouter/Ollama 等），否则你的 API key 可能被钓鱼。Tampermonkey 也会弹窗确认。`,
    }
  }
  return null
}

/**
 * 智能辅助驾驶 LLM 客户端。
 *
 * 三个 provider：
 *   - `anthropic`：调用 `https://api.anthropic.com/v1/messages`
 *   - `openai`：调用 `https://api.openai.com/v1/chat/completions`
 *   - `openai-compat`：调用 `<baseURL>/v1/chat/completions`，OpenAI 兼容（DeepSeek/Moonshot/OpenRouter/Ollama）
 *
 * 都走 GM_xmlhttpRequest（gm-fetch.ts），因为浏览器直连这些 LLM 端点会被 CORS 拦截。
 *
 * 这个模块由 `hzm-auto-drive.ts` 通过 `await import('./llm-driver')` **懒加载**，
 * 所以未启用 LLM 模式的用户冷启动 bundle 不会拉这部分代码。
 */

import type { HzmLlmProvider } from './store-hzm'

import { BASE_URL } from './const'
import { gmFetch } from './gm-fetch'

export interface LlmCandidate {
  id: string
  content: string
  tags: string[]
}

export interface ChooseMemeOptions {
  provider: HzmLlmProvider
  apiKey: string
  model: string
  /** 仅 provider='openai-compat' 时使用。例如 `https://api.deepseek.com`。可带或不带尾斜线。 */
  baseURL?: string
  /** 用于 prompt 上下文，例如 "灰泽满烂梗库"。 */
  roomName: string
  /** 最近 30 条公屏弹幕文本。 */
  recentChat: string[]
  /** 候选梗（≤30 条）。 */
  candidates: LlmCandidate[]
}

const SYSTEM_PROMPT_TEMPLATE = (roomName: string) =>
  `你在 ${roomName} 直播间帮观众发弹幕（独轮车）。从下面给出的 candidates 里选 1 条最贴合最近公屏氛围的发出去。
仅返回该梗的 id（candidates 里的 id 字符串）。如果都不合适，返回 -1。
不要解释，不要带前后空格，不要 Markdown，只输出一个 id 字符串或者 -1。`

function buildUserMessage(opts: ChooseMemeOptions): string {
  return JSON.stringify({
    recentDanmu: opts.recentChat,
    candidates: opts.candidates,
  })
}

function trimBaseURL(base: string): string {
  return base.replace(/\/+$/, '')
}

interface LlmResponseChoice {
  /** 原始返回 id 字符串（包含 "-1" 用作弃权信号）。 */
  rawId: string
}

function parseAnthropicResponse(json: unknown): LlmResponseChoice | null {
  if (!json || typeof json !== 'object') return null
  const arr = (json as { content?: Array<{ text?: string }> }).content
  if (!Array.isArray(arr) || arr.length === 0) return null
  const text = arr
    .map(c => c.text ?? '')
    .join('')
    .trim()
  return text ? { rawId: text } : null
}

function parseOpenAIResponse(json: unknown): LlmResponseChoice | null {
  if (!json || typeof json !== 'object') return null
  const choices = (json as { choices?: Array<{ message?: { content?: string } }> }).choices
  if (!Array.isArray(choices) || choices.length === 0) return null
  const text = choices[0]?.message?.content?.trim() ?? ''
  return text ? { rawId: text } : null
}

async function callAnthropic(opts: ChooseMemeOptions): Promise<LlmResponseChoice | null> {
  const resp = await gmFetch(BASE_URL.ANTHROPIC_MESSAGES, {
    method: 'POST',
    headers: {
      'x-api-key': opts.apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      // Allow CORS-safe direct browser usage.
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 64,
      system: [{ type: 'text', text: SYSTEM_PROMPT_TEMPLATE(opts.roomName), cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: buildUserMessage(opts) }],
    }),
    timeoutMs: 15000,
  })
  if (!resp.ok) {
    throw new Error(`Anthropic HTTP ${resp.status}: ${resp.text().slice(0, 200)}`)
  }
  return parseAnthropicResponse(resp.json())
}

async function callOpenAI(opts: ChooseMemeOptions, urlOverride?: string): Promise<LlmResponseChoice | null> {
  const url = urlOverride ?? BASE_URL.OPENAI_CHAT
  const resp = await gmFetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: opts.model,
      max_tokens: 64,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT_TEMPLATE(opts.roomName) },
        { role: 'user', content: buildUserMessage(opts) },
      ],
    }),
    timeoutMs: 15000,
  })
  if (!resp.ok) {
    throw new Error(`OpenAI HTTP ${resp.status}: ${resp.text().slice(0, 200)}`)
  }
  return parseOpenAIResponse(resp.json())
}

/**
 * 选一条最贴合最近公屏的梗。
 *
 * 返回值：
 *  - 命中：返回该候选梗的 `content` 字符串（调用方据此从池里查回 meme 对象）
 *  - LLM 主动弃权（返回 -1）或解析失败：返回 `null`，调用方应回退启发式
 *
 * 抛错时让调用方接住——hzm-auto-drive 会 catch 并回退启发式。
 */
export async function chooseMemeWithLLM(opts: ChooseMemeOptions): Promise<string | null> {
  if (!opts.apiKey || opts.candidates.length === 0) return null

  let parsed: LlmResponseChoice | null = null
  if (opts.provider === 'anthropic') {
    parsed = await callAnthropic(opts)
  } else if (opts.provider === 'openai') {
    parsed = await callOpenAI(opts)
  } else {
    // openai-compat
    const base = trimBaseURL(opts.baseURL ?? '')
    if (!base) throw new Error('openai-compat 需要填 base URL（例如 https://api.deepseek.com）')
    parsed = await callOpenAI(opts, `${base}/v1/chat/completions`)
  }

  if (!parsed) return null
  const id = parsed.rawId.trim()
  if (!id || id === '-1') return null

  const found = opts.candidates.find(c => c.id === id)
  if (found) return found.content

  // 一些模型可能直接吐 content 而非 id，再容错一次：尝试根据 id 字符串匹配 content 子串
  const byContent = opts.candidates.find(c => c.content === id || id.includes(c.content) || c.content.includes(id))
  return byContent?.content ?? null
}

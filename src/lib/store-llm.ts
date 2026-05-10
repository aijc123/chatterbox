/**
 * YOLO（AI 润色弹幕）相关持久状态。
 *
 * 设计要点：
 * - **复用智能辅助驾驶（HZM）的 LLM 配置**（provider/key/model/baseURL），不再做
 *   一份并行的 API 设置 UI。同一台 LLM 既能选梗又能润色，配置一次即可两用。
 * - 提示词独立管理：每个使用 LLM 的功能（常规发送 / 自动跟车 / 独轮车）有
 *   各自的提示词列表 + 当前选中索引，配合一个共享的"全局提示词"作为基线。
 * - YOLO 三个开关分别驻留在自己的功能里，默认 off——必须显式打开 + LLM 配好
 *   才会走 LLM 路径，避免新用户误开就开始烧 token。
 *
 * 设计参考自 upstream chatterbox 0c8706f / 090bd1e / 3914ec6（提示词模型 + YOLO 三档开关），
 * 但本 fork 不再引入并行的 `llmApiBase/llmApiKey/llmModel`——直接复用 HZM 的
 * `hzmLlmProvider` / `hzmLlmApiKey` / `hzmLlmModel` / `hzmLlmBaseURL`。
 */

import { GM_getValue, GM_setValue } from '$'
import { gmSignal } from './gm-signal'

// ---------------------------------------------------------------------------
// YOLO 模式开关（每个功能一个）
// ---------------------------------------------------------------------------

/** 自动跟车 YOLO：触发后用 LLM 润色再发。默认关。 */
export const autoBlendYolo = gmSignal<boolean>('autoBlendYolo', false)
/** 独轮车 YOLO：循环里每条非表情消息用 LLM 润色再发。默认关。 */
export const autoSendYolo = gmSignal<boolean>('autoSendYolo', false)
/** 常规发送 YOLO：手动 / +1 / 偷 路径上把文本先送给 LLM 润色。默认关。 */
export const normalSendYolo = gmSignal<boolean>('normalSendYolo', false)

// ---------------------------------------------------------------------------
// 提示词
// ---------------------------------------------------------------------------

/**
 * 全局基线提示词（出厂默认值）。
 *
 * 作为 PromptManager 的初始内容种子写入一次（见下面的 seeding 迁移）。用户可
 * 自由编辑、新增、删除——seeding 是一次性的，删了就不会再回来。多行 markdown
 * 列表是为了让模型清楚地看到弹幕场景下的几条互不相关的硬约束（长度、格式、
 * 敏感词）。
 *
 * Exported in case 未来 UI 想加个"恢复默认"按钮。
 */
export const DEFAULT_GLOBAL_PROMPT = [
  '你是哔哩哔哩直播间的弹幕优化助手，根据用户的输入内容，完全遵循用户的修改提示，输出相应的内容，并遵循以下基本约定：',
  '',
  '- 单条弹幕请控制在 40 字以内，使用自然口语化的中文',
  '- 不要使用 Markdown、列表、不要包裹引号或代码块',
  '- 直接输出最终弹幕文本，不要包含解释、前缀或多余空白，结尾不带句号',
].join('\n')

const isStringArray = (v: unknown): v is string[] => Array.isArray(v) && v.every(s => typeof s === 'string')
const isNonNegativeInt = (v: unknown): v is number => typeof v === 'number' && Number.isInteger(v) && v >= 0

// 一次性 seeding：在用户首次安装 / 升级到带 LLM 的版本时把默认全局提示词
// 写进 GM 存储。用一个独立的 sentinel key 标记已 seed，这样用户主动清空
// 提示词列表后不会被这里"还原"。设计参考 upstream 0c8706f 的同位策略。
const SEED_KEY = 'llmPromptsGlobalSeeded'
if (!GM_getValue<boolean>(SEED_KEY, false)) {
  const existing = GM_getValue<unknown>('llmPromptsGlobal', undefined)
  if (existing === undefined || (Array.isArray(existing) && existing.length === 0)) {
    GM_setValue('llmPromptsGlobal', [DEFAULT_GLOBAL_PROMPT])
  }
  GM_setValue(SEED_KEY, true)
}

/**
 * 全局提示词列表 + 当前激活索引。getActiveLlmPrompt 会把"激活的全局提示词"
 * 拼接到激活的功能提示词前面（详见 prompts.ts）。
 *
 * 各功能各自维护独立的列表 + 索引（不是 Record<feature, ...>），这样某个功能
 * 的存储损坏不会拖累其它功能；也方便 UI 单独 diff 每个 signal。
 */
export const llmPromptsGlobal = gmSignal<string[]>('llmPromptsGlobal', [DEFAULT_GLOBAL_PROMPT], {
  validate: isStringArray,
})
export const llmActivePromptGlobal = gmSignal<number>('llmActivePromptGlobal', 0, { validate: isNonNegativeInt })

/** 常规发送（含 +1 / 偷）的提示词列表 + 索引。默认空数组——用户没配 = YOLO 不可用。 */
export const llmPromptsNormalSend = gmSignal<string[]>('llmPromptsNormalSend', [], { validate: isStringArray })
export const llmActivePromptNormalSend = gmSignal<number>('llmActivePromptNormalSend', 0, {
  validate: isNonNegativeInt,
})

/** 自动跟车的提示词列表 + 索引。 */
export const llmPromptsAutoBlend = gmSignal<string[]>('llmPromptsAutoBlend', [], { validate: isStringArray })
export const llmActivePromptAutoBlend = gmSignal<number>('llmActivePromptAutoBlend', 0, { validate: isNonNegativeInt })

/** 独轮车的提示词列表 + 索引。 */
export const llmPromptsAutoSend = gmSignal<string[]>('llmPromptsAutoSend', [], { validate: isStringArray })
export const llmActivePromptAutoSend = gmSignal<number>('llmActivePromptAutoSend', 0, { validate: isNonNegativeInt })

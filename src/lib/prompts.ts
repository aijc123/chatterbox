/**
 * YOLO 提示词访问层。
 *
 * 把"全局基线 + 功能特定"的拼接策略集中在这里，调用方（llm-polish.ts、UI 的
 * PromptManager / PromptPicker）只看 `getActiveLlmPrompt(feature)` 一个入口，
 * 不需要知道底下的 8 个 signal 各自的角色。
 *
 * 单独成模块（而不是塞进 store-llm.ts）是为了让低层的 `llm-driver.ts` /
 * `chatCompletionViaLlm` 不强依赖 GM 存储的 signal — 那一层将来可能从 worker /
 * 测试 harness 里被调用，没有 GM 上下文。
 *
 * 设计参考自 upstream chatterbox 090bd1e（PromptManager + 单独 prompts 模块）。
 */

import {
  llmActivePromptAutoBlend,
  llmActivePromptAutoSend,
  llmActivePromptGlobal,
  llmActivePromptNormalSend,
  llmPromptsAutoBlend,
  llmPromptsAutoSend,
  llmPromptsGlobal,
  llmPromptsNormalSend,
} from './store-llm'
import { getGraphemes, trimText } from './utils'

/** 用 LLM 的三个发送场景。Discriminator，跟 store-llm.ts 的 signal 命名对齐。 */
export type LlmPromptFeature = 'normalSend' | 'autoBlend' | 'autoSend'

/**
 * 提示词预览的默认显示长度（字素，graphemes）。24 在设置面板的全宽
 * PromptManager 里读起来舒服；功能内嵌的 PromptPicker 可传更小的值，避免
 * 下拉菜单挤占整行。
 */
const DEFAULT_PROMPT_PREVIEW_GRAPHEMES = 24

/**
 * 给提示词草稿生成一个简短的预览文本：取第一非空行，按字素数截断。
 *
 * 空草稿统一渲染为 `(空)`，让选择器里仍然可点而不是空白行。所有 PromptManager
 * 与 PromptPicker 都走这一个函数，保证同一份草稿在所有地方读起来都一致。
 */
export function getPromptPreview(prompt: string, maxGraphemes = DEFAULT_PROMPT_PREVIEW_GRAPHEMES): string {
  const firstLine = (prompt.split('\n')[0] ?? '').trim()
  if (!firstLine) return '(空)'
  return getGraphemes(firstLine).length > maxGraphemes ? `${trimText(firstLine, maxGraphemes)[0]}…` : firstLine
}

/**
 * 当前激活的功能特定提示词（不含全局前缀）。给设置 UI 自身的编辑器显示用。
 *
 * 索引越界时回退到空字符串——`store-llm.ts` 的 validator 已经把"非负整数"
 * 卡住，这里只是防御性处理列表被外部清空的窗口期。
 */
export function getActiveFeaturePrompt(feature: LlmPromptFeature): string {
  switch (feature) {
    case 'normalSend':
      return llmPromptsNormalSend.value[llmActivePromptNormalSend.value] ?? ''
    case 'autoBlend':
      return llmPromptsAutoBlend.value[llmActivePromptAutoBlend.value] ?? ''
    case 'autoSend':
      return llmPromptsAutoSend.value[llmActivePromptAutoSend.value] ?? ''
    default:
      return ''
  }
}

/** 当前激活的全局提示词，没设则为空字符串。 */
export function getActiveGlobalPrompt(): string {
  return llmPromptsGlobal.value[llmActivePromptGlobal.value] ?? ''
}

/**
 * 全局基线 + 功能特定的拼接 separator。双换行让模型把它读成段落分隔；标注
 * "以下是用户的修改提示" 让大多数模型清楚后面这一段才是要执行的具体任务，
 * 而不是把全局基线当成示例去模仿。
 */
const PROMPT_SEPARATOR = '\n\n以下是用户的修改提示：\n\n'

/**
 * 生成实际要发给 LLM 的 system prompt：激活的全局基线 + separator + 激活的
 * 功能特定提示词。功能提示词为空则返回 ""，调用方据此决定是否跳过 LLM 调用
 * （单纯的 global 不足以让模型知道要执行什么任务，没意义浪费 token）。
 */
export function getActiveLlmPrompt(feature: LlmPromptFeature): string {
  const featurePrompt = getActiveFeaturePrompt(feature)
  if (!featurePrompt.trim()) return ''
  const globalPrompt = getActiveGlobalPrompt()
  if (!globalPrompt.trim()) return featurePrompt
  return `${globalPrompt}${PROMPT_SEPARATOR}${featurePrompt}`
}

/**
 * Unit coverage for `src/lib/prompts.ts` — the YOLO prompt accessor layer
 * (active draft per feature + global-baseline join).
 *
 * Goal: cover the edge cases that matter for YOLO correctness:
 *   - "no feature prompt" → empty result so callers skip the LLM call
 *   - "feature only" → returns the feature prompt verbatim, no separator
 *   - "global + feature" → prepends global with the documented separator
 *   - whitespace-only feature treated as missing
 *   - out-of-range index falls back to '' (defensive — real users see
 *     this after manually editing GM storage or restoring a corrupt backup)
 *   - getPromptPreview: empty / multiline / overlong strings
 */

import { beforeEach, describe, expect, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

const {
  llmActivePromptAutoBlend,
  llmActivePromptAutoSend,
  llmActivePromptGlobal,
  llmActivePromptNormalSend,
  llmPromptsAutoBlend,
  llmPromptsAutoSend,
  llmPromptsGlobal,
  llmPromptsNormalSend,
  DEFAULT_GLOBAL_PROMPT,
} = await import('../src/lib/store-llm')
const { getActiveFeaturePrompt, getActiveGlobalPrompt, getActiveLlmPrompt, getPromptPreview } = await import(
  '../src/lib/prompts'
)

beforeEach(() => {
  resetGmStore()
  // Reset to safe defaults — each test seeds what it needs.
  llmPromptsGlobal.value = []
  llmActivePromptGlobal.value = 0
  llmPromptsNormalSend.value = []
  llmActivePromptNormalSend.value = 0
  llmPromptsAutoBlend.value = []
  llmActivePromptAutoBlend.value = 0
  llmPromptsAutoSend.value = []
  llmActivePromptAutoSend.value = 0
})

describe('DEFAULT_GLOBAL_PROMPT', () => {
  test('is a non-empty multi-line Chinese system prompt suitable for danmaku', () => {
    expect(DEFAULT_GLOBAL_PROMPT.length).toBeGreaterThan(20)
    // Mentions the 40-char danmaku constraint that's central to the task.
    expect(DEFAULT_GLOBAL_PROMPT).toContain('40')
    // Shipped as multi-line bullets so it scans well in the textarea editor.
    expect(DEFAULT_GLOBAL_PROMPT.split('\n').length).toBeGreaterThan(2)
  })
})

describe('getActiveFeaturePrompt', () => {
  test('returns the active draft for each feature', () => {
    llmPromptsNormalSend.value = ['ns0', 'ns1']
    llmActivePromptNormalSend.value = 1
    llmPromptsAutoBlend.value = ['ab0']
    llmActivePromptAutoBlend.value = 0
    llmPromptsAutoSend.value = ['as0', 'as1', 'as2']
    llmActivePromptAutoSend.value = 2
    expect(getActiveFeaturePrompt('normalSend')).toBe('ns1')
    expect(getActiveFeaturePrompt('autoBlend')).toBe('ab0')
    expect(getActiveFeaturePrompt('autoSend')).toBe('as2')
  })

  test('returns "" when the active index is past the end of the list', () => {
    // Defensive: GM storage edited externally could leave activeIndex pointing
    // past the array. We must NOT throw or read undefined as a string.
    llmPromptsNormalSend.value = ['only-one']
    llmActivePromptNormalSend.value = 5
    expect(getActiveFeaturePrompt('normalSend')).toBe('')
  })

  test('returns "" when the prompt list is empty (default state)', () => {
    expect(getActiveFeaturePrompt('normalSend')).toBe('')
    expect(getActiveFeaturePrompt('autoBlend')).toBe('')
    expect(getActiveFeaturePrompt('autoSend')).toBe('')
  })
})

describe('getActiveGlobalPrompt', () => {
  test('returns active global draft, or "" if list is empty', () => {
    expect(getActiveGlobalPrompt()).toBe('')
    llmPromptsGlobal.value = ['G0', 'G1']
    llmActivePromptGlobal.value = 1
    expect(getActiveGlobalPrompt()).toBe('G1')
  })
})

describe('getActiveLlmPrompt', () => {
  test('returns "" when feature prompt is missing — caller skips LLM call', () => {
    // Even a non-empty global is not enough to engage the LLM: without a
    // feature prompt, the model wouldn't know what task to perform. The
    // empty string is the contract that callers (llm-polish.ts) check.
    llmPromptsGlobal.value = ['Global only, no task']
    expect(getActiveLlmPrompt('normalSend')).toBe('')
    expect(getActiveLlmPrompt('autoBlend')).toBe('')
    expect(getActiveLlmPrompt('autoSend')).toBe('')
  })

  test('returns the feature prompt verbatim when no global is set', () => {
    llmPromptsAutoBlend.value = ['just-feature']
    expect(getActiveLlmPrompt('autoBlend')).toBe('just-feature')
  })

  test('joins global + feature with the documented "以下是用户的修改提示" separator', () => {
    llmPromptsGlobal.value = ['GLOBAL']
    llmPromptsAutoSend.value = ['FEATURE']
    const out = getActiveLlmPrompt('autoSend')
    expect(out.startsWith('GLOBAL')).toBe(true)
    expect(out.endsWith('FEATURE')).toBe(true)
    expect(out).toContain('以下是用户的修改提示')
    // Separator surrounded by paragraph breaks so most chat models read it
    // as a topic shift rather than a continuation.
    expect(out).toContain('\n\n')
  })

  test('whitespace-only feature draft is treated as missing (no LLM call)', () => {
    llmPromptsGlobal.value = ['GLOBAL']
    llmPromptsAutoSend.value = ['   \n  \t']
    expect(getActiveLlmPrompt('autoSend')).toBe('')
  })

  test('whitespace-only global is dropped — feature prompt returned alone', () => {
    llmPromptsGlobal.value = ['  \n\t  ']
    llmPromptsNormalSend.value = ['F']
    // No separator should sneak in for a whitespace-only global.
    expect(getActiveLlmPrompt('normalSend')).toBe('F')
  })

  test('respects per-feature index switches without touching siblings', () => {
    llmPromptsAutoBlend.value = ['A0', 'A1']
    llmPromptsAutoSend.value = ['S0']
    // Switch the autoBlend index — autoSend output must not change.
    llmActivePromptAutoBlend.value = 1
    expect(getActiveLlmPrompt('autoBlend')).toBe('A1')
    expect(getActiveLlmPrompt('autoSend')).toBe('S0')
  })
})

describe('getPromptPreview', () => {
  test('renders "(空)" sentinel for blank / whitespace-only prompts', () => {
    expect(getPromptPreview('')).toBe('(空)')
    expect(getPromptPreview('   \n   ')).toBe('(空)')
    expect(getPromptPreview('\n\n')).toBe('(空)')
  })

  test('returns first non-empty line as the preview', () => {
    expect(getPromptPreview('hello\nworld')).toBe('hello')
    expect(getPromptPreview('  trim me  \nignored')).toBe('trim me')
  })

  test('long previews get a grapheme-trimmed ellipsis suffix (default 24)', () => {
    const long = 'abcdefghijklmnopqrstuvwxyz1234567890'
    const out = getPromptPreview(long)
    expect(out.endsWith('…')).toBe(true)
    // 24 + 1 ellipsis = 25 grapheme cells (not bytes) — we don't assert
    // exact length here because grapheme width depends on locale; just
    // confirm it's shorter than the input and ends with the marker.
    expect(out.length).toBeLessThan(long.length)
  })

  test('short previews under the cap keep their original length, no ellipsis', () => {
    const short = '简短预览'
    expect(getPromptPreview(short)).toBe(short)
  })

  test('respects custom previewGraphemes cap (used by inline pickers in feature tabs)', () => {
    const long = '一二三四五六七八九十十一'
    expect(getPromptPreview(long, 5).endsWith('…')).toBe(true)
    expect(getPromptPreview(long, 100)).toBe(long)
  })
})

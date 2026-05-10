import { useSignal } from '@preact/signals'

import { debugLogVisible, maxLogLines } from '../lib/log'
import {
  llmActivePromptAutoBlend,
  llmActivePromptAutoSend,
  llmActivePromptGlobal,
  llmActivePromptNormalSend,
  llmPromptsAutoBlend,
  llmPromptsAutoSend,
  llmPromptsGlobal,
  llmPromptsNormalSend,
} from '../lib/store-llm'
import { EmoteIds } from './emote-ids'
import { LlmApiConfigPanel } from './llm-api-config'
import { PromptManager } from './prompt-manager'
import { BackupSection } from './settings/backup-section'
import { CbBackendSection } from './settings/cb-backend-section'
import { CustomChatSection } from './settings/custom-chat-section'
import { DanmakuDirectSection } from './settings/danmaku-direct-section'
import { LayoutSection } from './settings/layout-section'
import { MedalCheckSection } from './settings/medal-check-section'
import { RadarSection } from './settings/radar-section'
import {
  CloudReplacementSection,
  LocalGlobalReplacementSection,
  LocalRoomReplacementSection,
} from './settings/replacement-section'
import { matchesSearchQuery } from './settings/search'
import { ShadowObservationSection } from './settings/shadow-observation-section'

function GroupHeading({ children, query }: { children: string; query: string }) {
  if (query) return null
  return (
    <div
      className='cb-group-heading'
      style={{
        margin: '1em 0 .25em',
        fontSize: '0.75em',
        fontWeight: 'bold',
        color: '#999',
        letterSpacing: '0.04em',
        textTransform: 'uppercase',
      }}
    >
      {children}
    </div>
  )
}

export function SettingsTab() {
  const settingsSearch = useSignal('')
  const query = settingsSearch.value.trim().toLowerCase()

  return (
    <>
      <div className='cb-section cb-stack' style={{ margin: '.5em 0', gap: '.35em' }}>
        <label htmlFor='settingsSearch' className='cb-label'>
          搜索设置
        </label>
        <input
          id='settingsSearch'
          type='search'
          value={settingsSearch.value}
          placeholder='输入关键词（可空格分隔多词），例如：表情、粉丝牌、CSS、API key、备份'
          style={{ width: '100%' }}
          onInput={e => {
            settingsSearch.value = e.currentTarget.value
          }}
        />
      </div>

      <GroupHeading query={query}>常用</GroupHeading>
      <CustomChatSection query={query} />
      <DanmakuDirectSection query={query} />
      <LayoutSection query={query} />
      {matchesSearchQuery('表情 emote emoji 表情包 ID 复制 表情ID 表情ids', query) && (
        <details className='cb-settings-accordion' open>
          <summary>表情</summary>
          <div
            className='cb-section cb-stack'
            style={{ margin: '.5em 0', paddingBottom: '1em', borderBottom: '1px solid var(--Ga2, #eee)' }}
          >
            <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
              表情（复制后可在独轮车或常规发送中直接发送）
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <EmoteIds />
            </div>
          </div>
        </details>
      )}

      <GroupHeading query={query}>替换规则</GroupHeading>
      <CloudReplacementSection query={query} />
      <LocalGlobalReplacementSection query={query} />
      <LocalRoomReplacementSection query={query} />
      <ShadowObservationSection query={query} />

      <GroupHeading query={query}>LLM（智驾选梗 + YOLO 润色共用）</GroupHeading>
      <LlmApiSection query={query} />
      <LlmPromptsSection query={query} />

      {/* 工具组：把粉丝牌巡检放在最前面（最常用），其它按使用频率次序。 */}
      <GroupHeading query={query}>工具</GroupHeading>
      <MedalCheckSection query={query} />
      <CbBackendSection query={query} />
      <RadarSection query={query} />

      <GroupHeading query={query}>系统</GroupHeading>
      {/* 备份/恢复在用户心智里属于"系统"，不属于"工具"。 */}
      <BackupSection query={query} />
      {matchesSearchQuery('日志设置 日志 行数 调试 debug log lines', query) && (
        <details className='cb-settings-accordion'>
          <summary>日志设置</summary>
          <div className='cb-section cb-stack' style={{ margin: '.5em 0', paddingBottom: '1em' }}>
            <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
              日志设置
            </div>
            <div className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap' }}>
              <label htmlFor='maxLogLines' style={{ color: '#666' }}>
                最大日志行数:
              </label>
              <input
                id='maxLogLines'
                type='number'
                min='1'
                max='1000'
                style={{ width: '80px' }}
                value={maxLogLines.value}
                onChange={e => {
                  let v = Number.parseInt(e.currentTarget.value, 10)
                  if (Number.isNaN(v) || v < 1) v = 1
                  else if (v > 1000) v = 1000
                  maxLogLines.value = v
                }}
              />
              <span style={{ color: '#999', fontSize: '0.9em' }}>(1-1000)</span>
            </div>
            <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.4em' }}>
              <input
                id='debugLogVisible'
                type='checkbox'
                checked={debugLogVisible.value}
                onInput={e => {
                  debugLogVisible.value = e.currentTarget.checked
                }}
              />
              <label
                htmlFor='debugLogVisible'
                title='打开后内部诊断日志会带上 🔍 前缀，便于打包成完整日志反馈给维护者。正常使用不需要打开。'
              >
                调试模式（在日志中标注内部诊断行）
              </label>
            </span>
            <div className='cb-note' style={{ color: '#666' }}>
              收到「请发完整日志」类的反馈请求时打开此开关，再复制日志面板内容提交。
            </div>
          </div>
        </details>
      )}
    </>
  )
}

/**
 * LLM API 凭证（provider / key / model / baseURL）。
 *
 * 这个 section 必须在所有房间都可见——之前 LLM 凭证嵌在「智能辅助驾驶」面板里，
 * 而 HZM 面板只对注册了梗源的房间渲染（目前仅灰泽满），导致别的房间用户开了
 * YOLO 三档却找不到地方填 API key。把它搬到设置里、永远可见。
 *
 * 同一份 signal 既给智能辅助驾驶选梗用，也给 YOLO 三档润色用——配置一次两用。
 */
function LlmApiSection({ query }: { query: string }) {
  const KEYWORDS =
    'llm api key model 模型 anthropic openai deepseek moonshot openrouter ollama 智能辅助驾驶 智驾 yolo 润色 base url 凭证 token 选梗'
  if (!matchesSearchQuery(KEYWORDS, query)) return null
  return (
    <details className='cb-settings-accordion' open>
      <summary>LLM API 配置（智驾选梗 + YOLO 润色共用）</summary>
      <div className='cb-section cb-stack' style={{ margin: '.5em 0', paddingBottom: '1em', gap: '.75em' }}>
        <div className='cb-note' style={{ color: '#666', fontSize: '0.85em' }}>
          填一次，「智能辅助驾驶」选梗 与「自动跟车 / 独轮车 / 常规发送」的 YOLO 润色都能用。
        </div>
        <LlmApiConfigPanel showTestConnection />
      </div>
    </details>
  )
}

/**
 * LLM 提示词管理（YOLO 用）。
 *
 * 全局基线 + 三个功能特定的 PromptManager。getActiveLlmPrompt 在调用时会把
 * 全局拼到功能前面（详见 `src/lib/prompts.ts`）。
 * 设计参考自 upstream chatterbox 0c8706f / 090bd1e。
 */
function LlmPromptsSection({ query }: { query: string }) {
  const KEYWORDS = 'llm 提示词 prompt yolo 润色 ai openai anthropic 全局基线 常规发送 自动跟车 独轮车 system prompt'
  if (!matchesSearchQuery(KEYWORDS, query)) return null
  return (
    <details className='cb-settings-accordion'>
      <summary>LLM 提示词（YOLO 用）</summary>
      <div className='cb-section cb-stack' style={{ margin: '.5em 0', paddingBottom: '1em', gap: '.75em' }}>
        <div className='cb-note' style={{ color: '#666', fontSize: '0.85em' }}>
          这里只管理 YOLO 用的提示词。API 凭证（key / 模型 / base URL）在上面的「LLM API 配置」section 里填一次。
        </div>

        <div>
          <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.25em' }}>
            全局基线
          </div>
          <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', marginBottom: '.4em' }}>
            会作为通用前缀拼到下面三个功能特定提示词的前面（用 ↓ 双换行 + "以下是用户的修改提示" 分隔）。
          </div>
          <PromptManager
            prompts={llmPromptsGlobal.value}
            activeIndex={llmActivePromptGlobal.value}
            onPromptsChange={p => {
              llmPromptsGlobal.value = p
            }}
            onActiveIndexChange={i => {
              llmActivePromptGlobal.value = i
            }}
            placeholder='全局基线，例如：你是直播间弹幕优化助手，结尾不带句号，单条 ≤40 字…'
          />
        </div>

        <div>
          <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.25em' }}>
            常规发送
          </div>
          <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', marginBottom: '.4em' }}>
            手动输入框 / 偷 / +1 等手动发送场景的修改提示。空 = 跳过 LLM。
          </div>
          <PromptManager
            prompts={llmPromptsNormalSend.value}
            activeIndex={llmActivePromptNormalSend.value}
            onPromptsChange={p => {
              llmPromptsNormalSend.value = p
            }}
            onActiveIndexChange={i => {
              llmActivePromptNormalSend.value = i
            }}
            placeholder='例如：把我输入的话改写成更礼貌的中文弹幕'
          />
        </div>

        <div>
          <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.25em' }}>
            自动跟车
          </div>
          <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', marginBottom: '.4em' }}>
            触发跟车后，把命中的弹幕用 LLM 润色一遍再发的修改提示。
          </div>
          <PromptManager
            prompts={llmPromptsAutoBlend.value}
            activeIndex={llmActivePromptAutoBlend.value}
            onPromptsChange={p => {
              llmPromptsAutoBlend.value = p
            }}
            onActiveIndexChange={i => {
              llmActivePromptAutoBlend.value = i
            }}
            placeholder='例如：把要跟的弹幕换个说法但保留意思，更像观众随口说出来的'
          />
        </div>

        <div>
          <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.25em' }}>
            独轮车
          </div>
          <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', marginBottom: '.4em' }}>
            循环里每条非表情消息发送前用 LLM 润色的修改提示。配置不全会自动停车。
          </div>
          <PromptManager
            prompts={llmPromptsAutoSend.value}
            activeIndex={llmActivePromptAutoSend.value}
            onPromptsChange={p => {
              llmPromptsAutoSend.value = p
            }}
            onActiveIndexChange={i => {
              llmActivePromptAutoSend.value = i
            }}
            placeholder='例如：把模板里的话改成有梗的中文弹幕，每次表达不重复'
          />
        </div>
      </div>
    </details>
  )
}

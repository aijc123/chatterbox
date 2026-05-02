import { useEffect } from 'preact/hooks'

import type { MemeSource } from '../lib/meme-sources'
import type { LaplaceMemeWithSource } from '../lib/sbhzm-client'

import { startHzmAutoDrive, stopHzmAutoDrive } from '../lib/hzm-auto-drive'
import {
  cachedRoomId,
  getBlacklistTags,
  getDailyStats,
  getSelectedTags,
  hzmDriveIntervalSec,
  hzmDriveMode,
  hzmDryRun,
  hzmLlmApiKey,
  hzmLlmBaseURL,
  hzmLlmModel,
  hzmLlmProvider,
  hzmLlmRatio,
  hzmPauseKeywordsOverride,
  hzmRateLimitPerMin,
  sendMsg,
  setBlacklistTags,
  setSelectedTags,
} from '../lib/store'

/**
 * 智能辅助驾驶面板。
 *
 * UI 结构：
 *  1. 模式切换（off / 启发式 / LLM）+ dryRun 开关
 *  2. 节奏：tick 间隔、每分钟限速、LLM 比例
 *  3. tag 筛选：勾选 tag、黑名单 tag（multi-select）
 *  4. 暂停关键词文本框
 *  5. 当日统计
 *  6. LLM 配置（仅 mode=llm 时展开）
 *  7. 免责声明 + 文字独轮车互斥提示
 */
export function HzmDrivePanel({ source, memes }: { source: MemeSource; memes: LaplaceMemeWithSource[] }) {
  const roomId = cachedRoomId.value
  const stats = getDailyStats(roomId)
  const selected = getSelectedTags(roomId)
  const blacklist = getBlacklistTags(roomId)

  // 当前梗列表里出现过的所有 tag（用作选项来源）
  const tagOptions: string[] = (() => {
    const set = new Set<string>()
    for (const m of memes) {
      for (const t of m.tags) {
        if (t.name) set.add(t.name)
      }
    }
    return [...set].sort()
  })()

  // 模式变化时启停（首次启动也走这条路径，因为默认 'off' 不会进入此 effect）
  useEffect(() => {
    if (hzmDriveMode.value === 'off') {
      stopHzmAutoDrive()
      return
    }
    void startHzmAutoDrive({ source, getMemes: () => memes })
    return () => stopHzmAutoDrive()
  }, [hzmDriveMode.value, source.roomId])

  const toggleSelectedTag = (tag: string) => {
    if (roomId === null) return
    const next = selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag]
    setSelectedTags(roomId, next)
  }

  const toggleBlacklistTag = (tag: string) => {
    if (roomId === null) return
    const next = blacklist.includes(tag) ? blacklist.filter(t => t !== tag) : [...blacklist, tag]
    setBlacklistTags(roomId, next)
  }

  return (
    <details
      style={{
        marginTop: '.6em',
        padding: '.4em .5em',
        border: '1px solid var(--Ga2, #ccc)',
        borderRadius: '4px',
        background: 'var(--bg2, #fafafa)',
      }}
    >
      <summary
        style={{
          cursor: 'pointer',
          userSelect: 'none',
          fontWeight: 'bold',
          fontSize: '12px',
          color: '#288bb8',
        }}
      >
        🤖 智能辅助驾驶（{source.name}）
      </summary>

      {/* 免责 */}
      <div
        style={{
          marginTop: '.4em',
          padding: '.3em .4em',
          fontSize: '10px',
          color: '#a86',
          background: '#fff7e6',
          border: '1px dashed #d6b86a',
          borderRadius: '3px',
          lineHeight: 1.5,
        }}
      >
        前排提霉：独轮车工具无罪，请合理使用。开启即代表你已阅读并同意：本工具不为 任何独轮车自动驾驶事故负责。建议先用
        dryRun 试运行 5 分钟看效果。
      </div>

      {/* 模式 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.6em', marginTop: '.5em', fontSize: '12px' }}>
        <span style={{ fontWeight: 'bold' }}>模式：</span>
        {(['off', 'heuristic', 'llm'] as const).map(m => (
          <label key={m} style={{ display: 'inline-flex', alignItems: 'center', gap: '.15em' }}>
            <input
              type='radio'
              name='hzmMode'
              checked={hzmDriveMode.value === m}
              onChange={() => {
                hzmDriveMode.value = m
              }}
            />
            {m === 'off' ? '关闭' : m === 'heuristic' ? '启发式' : 'LLM 智驾'}
          </label>
        ))}
      </div>

      {/* dryRun */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '.4em', marginTop: '.4em', fontSize: '12px' }}>
        <input
          id='hzmDryRun'
          type='checkbox'
          checked={hzmDryRun.value}
          onInput={e => {
            hzmDryRun.value = e.currentTarget.checked
          }}
        />
        <label for='hzmDryRun'>dryRun（只在日志显示候选，不真发）</label>
      </div>

      {/* 节奏 */}
      {hzmDriveMode.value !== 'off' && (
        <>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 60px',
              alignItems: 'center',
              gap: '.3em .5em',
              marginTop: '.5em',
              fontSize: '12px',
            }}
          >
            <label for='hzmInterval'>间隔（秒）</label>
            <input
              id='hzmInterval'
              type='number'
              min={3}
              max={120}
              value={hzmDriveIntervalSec.value}
              onInput={e => {
                const v = Number(e.currentTarget.value)
                if (Number.isFinite(v) && v > 0) hzmDriveIntervalSec.value = v
              }}
              style={{ width: '60px' }}
            />
            <label for='hzmRate'>每分钟最多</label>
            <input
              id='hzmRate'
              type='number'
              min={1}
              max={20}
              value={hzmRateLimitPerMin.value}
              onInput={e => {
                const v = Number(e.currentTarget.value)
                if (Number.isFinite(v) && v > 0) hzmRateLimitPerMin.value = v
              }}
              style={{ width: '60px' }}
            />
            {hzmDriveMode.value === 'llm' && (
              <>
                <label for='hzmLlmRatio'>LLM 每 N 次</label>
                <input
                  id='hzmLlmRatio'
                  type='number'
                  min={1}
                  max={10}
                  value={hzmLlmRatio.value}
                  onInput={e => {
                    const v = Number(e.currentTarget.value)
                    if (Number.isFinite(v) && v >= 1) hzmLlmRatio.value = v
                  }}
                  style={{ width: '60px' }}
                />
              </>
            )}
          </div>

          {/* tag 勾选 */}
          {tagOptions.length > 0 && (
            <div style={{ marginTop: '.5em', fontSize: '12px' }}>
              <div style={{ marginBottom: '.2em', fontWeight: 'bold' }}>偏好标签（白名单，空 = 全部）：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3em' }}>
                {tagOptions.map(t => (
                  <label
                    key={t}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '.15em',
                      padding: '0 .35em',
                      borderRadius: '2px',
                      background: selected.includes(t) ? '#10b981' : 'transparent',
                      color: selected.includes(t) ? '#fff' : 'inherit',
                      border: '1px solid var(--Ga2, #ccc)',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    <input
                      type='checkbox'
                      style={{ marginRight: '.15em' }}
                      checked={selected.includes(t)}
                      onInput={() => toggleSelectedTag(t)}
                    />
                    {t}
                  </label>
                ))}
              </div>

              <div style={{ marginTop: '.4em', marginBottom: '.2em', fontWeight: 'bold' }}>黑名单标签：</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3em' }}>
                {tagOptions.map(t => (
                  <label
                    key={t}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '.15em',
                      padding: '0 .35em',
                      borderRadius: '2px',
                      background: blacklist.includes(t) ? '#ef4444' : 'transparent',
                      color: blacklist.includes(t) ? '#fff' : 'inherit',
                      border: '1px solid var(--Ga2, #ccc)',
                      cursor: 'pointer',
                      fontSize: '11px',
                    }}
                  >
                    <input
                      type='checkbox'
                      style={{ marginRight: '.15em' }}
                      checked={blacklist.includes(t)}
                      onInput={() => toggleBlacklistTag(t)}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 暂停关键词 */}
          <div style={{ marginTop: '.5em', fontSize: '12px' }}>
            <label for='hzmPause' style={{ display: 'block', marginBottom: '.2em' }}>
              暂停关键词（每行一条正则；空 = 用梗源默认 {(source.pauseKeywords ?? []).join(' / ')}）
            </label>
            <textarea
              id='hzmPause'
              rows={2}
              value={hzmPauseKeywordsOverride.value}
              onInput={e => {
                hzmPauseKeywordsOverride.value = e.currentTarget.value
              }}
              style={{ boxSizing: 'border-box', width: '100%', fontSize: '11px' }}
              placeholder={(source.pauseKeywords ?? []).join('\n')}
            />
          </div>

          {/* 统计 */}
          <div style={{ marginTop: '.5em', fontSize: '11px', color: '#666' }}>
            今日已发：<b>{stats.sent}</b> 条 · LLM 调用：<b>{stats.llmCalls}</b> 次
          </div>

          {/* 文字独轮车互斥提示 */}
          {sendMsg.value && (
            <div
              style={{
                marginTop: '.4em',
                padding: '.25em .4em',
                fontSize: '11px',
                color: '#a30',
                background: '#fee',
                border: '1px dashed #d33',
                borderRadius: '3px',
              }}
            >
              ⚠️ 文字独轮车正在运行，与智驾叠加可能超出每分钟限速。建议先停一个。
            </div>
          )}
        </>
      )}

      {/* LLM 配置 */}
      {hzmDriveMode.value === 'llm' && (
        <fieldset
          style={{ marginTop: '.6em', padding: '.4em', border: '1px solid var(--Ga2, #ccc)', borderRadius: '3px' }}
        >
          <legend style={{ fontSize: '11px', padding: '0 .3em' }}>LLM 设置</legend>
          <div style={{ display: 'flex', gap: '.6em', alignItems: 'center', fontSize: '12px' }}>
            <span>Provider：</span>
            {(['anthropic', 'openai', 'openai-compat'] as const).map(p => (
              <label key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '.15em' }}>
                <input
                  type='radio'
                  name='hzmProvider'
                  checked={hzmLlmProvider.value === p}
                  onChange={() => {
                    hzmLlmProvider.value = p
                  }}
                />
                {p === 'anthropic' ? 'Anthropic' : p === 'openai' ? 'OpenAI' : 'OpenAI 兼容'}
              </label>
            ))}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'auto 1fr',
              gap: '.3em .5em',
              marginTop: '.4em',
              alignItems: 'center',
              fontSize: '12px',
            }}
          >
            <label for='hzmKey'>API Key</label>
            <input
              id='hzmKey'
              type='password'
              value={hzmLlmApiKey.value}
              onInput={e => {
                hzmLlmApiKey.value = e.currentTarget.value
              }}
              style={{ boxSizing: 'border-box' }}
              placeholder='sk-... 或 anthropic key'
            />
            <label for='hzmModel'>模型</label>
            <input
              id='hzmModel'
              type='text'
              value={hzmLlmModel.value}
              onInput={e => {
                hzmLlmModel.value = e.currentTarget.value
              }}
              style={{ boxSizing: 'border-box' }}
              placeholder='claude-haiku-4-5-20251001 / gpt-4o-mini / deepseek-chat'
            />
            {hzmLlmProvider.value === 'openai-compat' && (
              <>
                <label for='hzmBase'>Base URL</label>
                <input
                  id='hzmBase'
                  type='text'
                  value={hzmLlmBaseURL.value}
                  onInput={e => {
                    hzmLlmBaseURL.value = e.currentTarget.value
                  }}
                  style={{ boxSizing: 'border-box' }}
                  placeholder='https://api.deepseek.com'
                />
              </>
            )}
          </div>
          <div style={{ marginTop: '.4em', fontSize: '10px', color: '#a86', lineHeight: 1.4 }}>
            ⚠️ API Key 明文保存在浏览器 GM 存储，泄露风险自担。自定义 base URL 首次调用时 Tampermonkey
            可能弹权限确认；同意后才能继续。
          </div>
        </fieldset>
      )}
    </details>
  )
}

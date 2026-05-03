import { useSignal } from '@preact/signals'

import type { MemeSource } from '../lib/meme-sources'

import { startHzmAutoDrive, stopHzmAutoDrive } from '../lib/hzm-auto-drive'
import { getMemeSourceForRoom } from '../lib/meme-sources'
import {
  cachedRoomId,
  clearHzmLlmApiKey,
  currentMemesList,
  getBlacklistTags,
  getDailyStats,
  getSelectedTags,
  type HzmDriveMode,
  type HzmLlmProvider,
  hasConfirmedHzmRealFire,
  hzmDriveEnabled,
  hzmDriveIntervalSec,
  hzmDriveMode,
  hzmDriveStatusText,
  hzmDryRun,
  hzmLlmApiKey,
  hzmLlmApiKeyPersist,
  hzmLlmBaseURL,
  hzmLlmModel,
  hzmLlmProvider,
  hzmLlmRatio,
  hzmPanelOpen,
  hzmPauseKeywordsOverride,
  hzmRateLimitPerMin,
  sendMsg,
  setBlacklistTags,
  setSelectedTags,
} from '../lib/store'
import { extractRoomNumber } from '../lib/utils'

/**
 * 智能辅助驾驶（灰泽满烂梗库）独立面板。
 *
 * 设计：UIUX 镜像 `AutoBlendControls`：
 *  - 顶部：开车/停车按钮 + 状态指示点
 *  - 第二行：模式 segment（启发式 / LLM 智驾），仅切换模式偏好，不会启动
 *  - 试运行 复选框
 *  - 状态面板：今日已发 / 刚刚动作
 *  - 高级设置 折叠
 *  - LLM 配置 折叠（仅 mode=llm 时显示）
 */

const PROVIDER_LABEL: Record<HzmLlmProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  'openai-compat': 'OpenAI 兼容',
}

const MODE_LABEL: Record<HzmDriveMode, string> = {
  heuristic: '启发式',
  llm: 'LLM 智驾',
}

const MODE_HINT: Record<HzmDriveMode, string> = {
  heuristic: '关键词触发，按 tag 命中本地梗库',
  llm: '由 LLM 阅读弹幕选梗，需要 API key',
}

/** 把 API key 显示成 `sk-1234...abcd` 这种半遮罩形态。 */
function maskKey(k: string): string {
  const trimmed = k.trim()
  if (trimmed.length <= 8) return trimmed ? `${trimmed[0]}***${trimmed.at(-1)}` : ''
  return `${trimmed.slice(0, 4)}…${trimmed.slice(-4)}`
}

function modeButtonStyle(active: boolean) {
  return {
    fontWeight: active ? ('bold' as const) : undefined,
  }
}

/**
 * 在配置面板里挂载智驾——仅当当前房间在 meme-sources 注册表里有匹配源时显示。
 * 目前只有灰泽满（roomId 1713546334）。
 *
 * 立即可见性：cachedRoomId 要等 ensureRoomId() 的网络解析（room_init）回来才会
 * 被填上，开面板时会有一两秒空窗。对现代房间，URL slug 就是真实 room_id，
 * 所以先用 URL slug 同步查一次注册表——能命中就立即渲染，不必等 API。等
 * cachedRoomId 实际写入后，下面的 HzmDrivePanel 会自然重渲染拿到正确的统计。
 */
function resolveCurrentRoomIdSync(): number | null {
  const fromCache = cachedRoomId.value
  if (fromCache !== null) return fromCache
  try {
    const slug = extractRoomNumber(window.location.href)
    if (!slug) return null
    const n = Number(slug)
    return Number.isFinite(n) && n > 0 ? n : null
  } catch {
    return null
  }
}

export function HzmDrivePanelMount() {
  const source = getMemeSourceForRoom(resolveCurrentRoomIdSync())
  if (!source) return null
  return <HzmDrivePanel source={source} />
}

export function HzmDrivePanel({ source }: { source: MemeSource }) {
  const roomId = cachedRoomId.value
  const stats = getDailyStats(roomId)
  const selected = getSelectedTags(roomId)
  const blacklist = getBlacklistTags(roomId)
  const isOn = hzmDriveEnabled.value
  const mode = hzmDriveMode.value

  // 当前梗集里出现过的 tag（偏好 / 黑名单选项源）
  const memes = currentMemesList.value
  const tagOptions: string[] = (() => {
    const set = new Set<string>()
    for (const m of memes) {
      for (const t of m.tags) {
        if (t.name) set.add(t.name)
      }
    }
    return [...set].sort()
  })()

  // 测试连接状态
  const testStatus = useSignal<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const testError = useSignal<string>('')
  const advancedOpen = useSignal(false)
  const llmConfigOpen = useSignal(false)

  const statusText = hzmDriveStatusText.value
  const statusColor = !isOn
    ? '#777'
    : statusText.includes('试运行')
      ? '#a15c00'
      : statusText.includes('运行中')
        ? '#1677ff'
        : '#0a7f55'

  const toggleEnabled = () => {
    if (isOn) {
      hzmDriveEnabled.value = false
      stopHzmAutoDrive()
      return
    }
    // 关 → 开：非试运行且未确认过，先弹一次提示
    if (!hzmDryRun.value && !hasConfirmedHzmRealFire.value) {
      const ok = confirm(
        '智能辅助驾驶将会以你的账号真实发送弹幕（试运行已关闭）。\n\n建议先打开「试运行」观察一段时间。是否继续直接开车？'
      )
      if (!ok) return
      hasConfirmedHzmRealFire.value = true
    }
    hzmDriveEnabled.value = true
    void startHzmAutoDrive({ source, getMemes: () => currentMemesList.value })
  }

  const handleTestLLM = async () => {
    if (testStatus.value === 'testing') return
    testStatus.value = 'testing'
    testError.value = ''
    try {
      const { testLLMConnection } = await import('../lib/llm-driver')
      const r = await testLLMConnection({
        provider: hzmLlmProvider.value,
        apiKey: hzmLlmApiKey.value,
        model: hzmLlmModel.value,
        baseURL: hzmLlmBaseURL.value.trim() || undefined,
      })
      if (r.ok) {
        testStatus.value = 'ok'
      } else {
        testStatus.value = 'fail'
        testError.value = r.error ?? '未知错误'
      }
    } catch (err) {
      testStatus.value = 'fail'
      testError.value = err instanceof Error ? err.message : String(err)
    }
  }

  const toggleSelectedTag = (tag: string) => {
    if (roomId === null) return
    setSelectedTags(roomId, selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag])
  }

  const toggleBlacklistTag = (tag: string) => {
    if (roomId === null) return
    setBlacklistTags(roomId, blacklist.includes(tag) ? blacklist.filter(t => t !== tag) : [...blacklist, tag])
  }

  const apiKeyConfigured = hzmLlmApiKey.value.trim().length > 0
  const pauseDefault = (source.pauseKeywords ?? []).join(' / ')

  return (
    <details
      open={hzmPanelOpen.value}
      onToggle={e => {
        hzmPanelOpen.value = e.currentTarget.open
      }}
    >
      <summary style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'bold' }}>
        <span>智能辅助驾驶（{source.name}）</span>
        {isOn && <span className='cb-soft'>已开</span>}
      </summary>

      <div className='cb-body cb-stack'>
        <div className='cb-note' style={{ marginBottom: '.25em' }}>
          条件满足时，会以你的账号自动从烂梗库挑选并发送弹幕。第一次开启建议先打开下方的「试运行」观察效果。
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '.5em', alignItems: 'center' }}>
          <button type='button' className={isOn ? 'cb-danger' : 'cb-primary'} onClick={toggleEnabled}>
            {isOn ? '停车' : '开车'}
          </button>
          <span
            style={{
              color: statusColor,
              fontWeight: 'bold',
              whiteSpace: 'nowrap',
            }}
          >
            <span className='cb-status-dot' /> {statusText}
          </span>
        </div>

        <div>
          <div className='cb-segment'>
            {(['heuristic', 'llm'] as const).map(m => (
              <button
                key={m}
                type='button'
                aria-pressed={mode === m}
                onClick={() => {
                  hzmDriveMode.value = m
                  testStatus.value = 'idle'
                }}
                style={modeButtonStyle(mode === m)}
                title={MODE_HINT[m]}
              >
                {MODE_LABEL[m]}
              </button>
            ))}
          </div>
          <div className='cb-note' style={{ marginTop: '.25em' }}>
            当前：{MODE_HINT[mode]}
          </div>
        </div>

        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
          <input
            id='hzmDryRun'
            type='checkbox'
            checked={hzmDryRun.value}
            onInput={e => {
              hzmDryRun.value = e.currentTarget.checked
            }}
          />
          <label for='hzmDryRun' title='开启后只在日志显示候选，不真发到弹幕——新手强烈建议先开'>
            试运行（只观察，不发送）
          </label>
          {!hzmDryRun.value && (
            <span style={{ color: '#a15c00', fontSize: '0.85em' }} title='当前关闭试运行，会真实发送弹幕。'>
              关闭后会真实发送
            </span>
          )}
        </span>

        <div
          className='cb-panel'
          style={{
            color: isOn ? undefined : '#999',
            lineHeight: 1.6,
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '4.5em 1fr', gap: '.25em' }}>
            <strong>今日</strong>
            <span>
              已发 <b>{stats.sent}</b> 条 · LLM 调用 <b>{stats.llmCalls}</b> 次
            </span>
          </div>
        </div>

        {sendMsg.value && (
          <div style={{ color: '#a15c00', fontSize: '12px', lineHeight: 1.5 }}>
            文字独轮车正在运行，与智驾叠加可能超出每分钟限速，建议先停一个。
          </div>
        )}
      </div>

      <details
        open={advancedOpen.value}
        onToggle={e => {
          advancedOpen.value = e.currentTarget.open
        }}
        style={{ marginTop: '.5em' }}
      >
        <summary style={{ cursor: 'pointer', userSelect: 'none' }}>高级设置</summary>

        <div
          style={{
            margin: '.5em 0',
            display: 'grid',
            gap: '.5em',
            color: isOn ? undefined : '#999',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.25em' }}>
            <span>发送间隔</span>
            <input
              type='number'
              min='3'
              max='120'
              style={{ width: '40px' }}
              value={hzmDriveIntervalSec.value}
              onInput={e => {
                const v = parseInt(e.currentTarget.value, 10)
                if (Number.isFinite(v) && v > 0) hzmDriveIntervalSec.value = v
              }}
              title='基础间隔（秒），实际会再加 0.7~1.5× 的随机抖动。建议 5–15。'
            />
            <span>秒，每分钟最多</span>
            <input
              type='number'
              min='1'
              max='20'
              style={{ width: '40px' }}
              value={hzmRateLimitPerMin.value}
              onInput={e => {
                const v = parseInt(e.currentTarget.value, 10)
                if (Number.isFinite(v) && v > 0) hzmRateLimitPerMin.value = v
              }}
              title='硬限速。同时开文字独轮车会叠加发送量，建议保持 ≤6 单独使用。'
            />
            <span>条</span>
            {mode === 'llm' && (
              <>
                <span style={{ marginLeft: '.5em' }}>，LLM 每</span>
                <input
                  type='number'
                  min='1'
                  max='10'
                  style={{ width: '36px' }}
                  value={hzmLlmRatio.value}
                  onInput={e => {
                    const v = parseInt(e.currentTarget.value, 10)
                    if (Number.isFinite(v) && v >= 1) hzmLlmRatio.value = v
                  }}
                  title='1=每次都用 LLM；3=每 3 次用 1 次（其它走启发式，省 API 费）'
                />
                <span>次</span>
              </>
            )}
          </div>

          {tagOptions.length > 0 ? (
            <>
              <div className='cb-row'>
                <span style={{ fontWeight: 'bold', minWidth: '4em' }} title='只从勾选 tag 的梗里选；空 = 全部'>
                  偏好 tag
                </span>
                {tagOptions.map(t => (
                  <button
                    key={t}
                    type='button'
                    className='cb-tag'
                    onClick={() => toggleSelectedTag(t)}
                    title={selected.includes(t) ? '已加入偏好，点击取消' : '点击加入偏好'}
                    style={{ '--cb-tag-bg': selected.includes(t) ? '#34c759' : undefined }}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className='cb-row'>
                <span style={{ fontWeight: 'bold', minWidth: '4em' }} title='命中即跳过的 tag'>
                  黑名单
                </span>
                {tagOptions.map(t => (
                  <button
                    key={t}
                    type='button'
                    className='cb-tag'
                    onClick={() => toggleBlacklistTag(t)}
                    title={blacklist.includes(t) ? '已拉黑，点击取消' : '点击拉黑这个 tag'}
                    style={{ '--cb-tag-bg': blacklist.includes(t) ? '#ff3b30' : undefined }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className='cb-empty'>梗库还没加载到 tag。等列表载入后再来选偏好与黑名单。</div>
          )}

          <div className='cb-row'>
            <span style={{ fontWeight: 'bold', minWidth: '4em' }}>暂停词</span>
            <span style={{ fontSize: '10px', color: '#888' }}>
              每行一条正则；命中后 60s 不发。空 = 用默认（{pauseDefault || '无'}）
            </span>
          </div>
          <textarea
            rows={2}
            value={hzmPauseKeywordsOverride.value}
            onInput={e => {
              hzmPauseKeywordsOverride.value = e.currentTarget.value
            }}
            style={{ boxSizing: 'border-box', width: '100%', fontSize: '11px', resize: 'vertical' }}
            placeholder={(source.pauseKeywords ?? []).join('\n')}
          />
        </div>
      </details>

      {mode === 'llm' && (
        <details
          open={llmConfigOpen.value}
          onToggle={e => {
            llmConfigOpen.value = e.currentTarget.open
          }}
          style={{ marginTop: '.5em' }}
        >
          <summary style={{ cursor: 'pointer', userSelect: 'none' }}>
            LLM 配置
            <span className='cb-soft' style={{ marginLeft: '.4em' }}>
              {apiKeyConfigured ? '已配置' : '未配置'}
            </span>
          </summary>

          <div className='cb-stack' style={{ margin: '.5em 0' }}>
            <div className='cb-row'>
              <span style={{ minWidth: '4em' }}>Provider</span>
              <div className='cb-segment' style={{ flex: 1, minWidth: 0 }}>
                {(['anthropic', 'openai', 'openai-compat'] as const).map(p => (
                  <button
                    key={p}
                    type='button'
                    aria-pressed={hzmLlmProvider.value === p}
                    style={modeButtonStyle(hzmLlmProvider.value === p)}
                    onClick={() => {
                      hzmLlmProvider.value = p
                      testStatus.value = 'idle'
                    }}
                  >
                    {PROVIDER_LABEL[p]}
                  </button>
                ))}
              </div>
            </div>

            <div className='cb-row'>
              <span style={{ minWidth: '4em' }}>API Key</span>
              <input
                type='password'
                value={hzmLlmApiKey.value}
                onInput={e => {
                  hzmLlmApiKey.value = e.currentTarget.value
                  testStatus.value = 'idle'
                }}
                placeholder='sk-... 或 anthropic key'
                style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}
              />
              <span className='cb-soft' style={{ whiteSpace: 'nowrap' }}>
                {apiKeyConfigured ? maskKey(hzmLlmApiKey.value) : '未配置'}
              </span>
              <button
                type='button'
                disabled={!apiKeyConfigured}
                onClick={() => {
                  clearHzmLlmApiKey()
                  testStatus.value = 'idle'
                }}
                title='把 key 从内存和 GM 存储里都抹掉'
              >
                清除
              </button>
            </div>
            <div className='cb-row'>
              <span style={{ minWidth: '4em' }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em', flex: 1 }}>
                <input
                  id='hzmLlmApiKeyPersist'
                  type='checkbox'
                  checked={hzmLlmApiKeyPersist.value}
                  onInput={e => {
                    hzmLlmApiKeyPersist.value = e.currentTarget.checked
                  }}
                />
                <label
                  for='hzmLlmApiKeyPersist'
                  title='不勾：key 仅留在内存，刷新页面就清空，GM 存储里的旧值也立即抹掉'
                >
                  保存到 GM 存储（关闭后仅本次会话有效）
                </label>
              </span>
            </div>

            <div className='cb-row'>
              <span style={{ minWidth: '4em' }}>模型</span>
              <input
                type='text'
                value={hzmLlmModel.value}
                onInput={e => {
                  hzmLlmModel.value = e.currentTarget.value
                  testStatus.value = 'idle'
                }}
                placeholder='例：claude-haiku-4-5-20251001'
                title='Anthropic 推荐 claude-haiku-4-5-20251001；OpenAI 推荐 gpt-4o-mini；DeepSeek 用 deepseek-chat'
                style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}
              />
            </div>

            {hzmLlmProvider.value === 'openai-compat' && (
              <div className='cb-row'>
                <span style={{ minWidth: '4em' }}>Base URL</span>
                <input
                  type='text'
                  value={hzmLlmBaseURL.value}
                  onInput={e => {
                    hzmLlmBaseURL.value = e.currentTarget.value
                    testStatus.value = 'idle'
                  }}
                  placeholder='https://api.deepseek.com（带不带 /v1 都行，自动补全到 /v1/chat/completions）'
                  title='DeepSeek=https://api.deepseek.com / Moonshot=https://api.moonshot.cn / OpenRouter=https://openrouter.ai/api / 小米 mimo=https://token-plan-sgp.xiaomimimo.com/v1'
                  style={{ flex: 1, minWidth: 0, boxSizing: 'border-box' }}
                />
              </div>
            )}

            <div className='cb-row'>
              <button
                type='button'
                disabled={!apiKeyConfigured || testStatus.value === 'testing'}
                onClick={() => void handleTestLLM()}
                title='发一个最小请求验证 key/路由能跑通；不消耗你的实际智驾配额'
              >
                {testStatus.value === 'testing' ? '测试中…' : '测试连接'}
              </button>
              {testStatus.value === 'ok' && (
                <span className='cb-soft' style={{ color: '#0a7f55' }}>
                  连接成功
                </span>
              )}
              {testStatus.value === 'fail' && (
                <span style={{ color: '#c00', fontSize: '11px', wordBreak: 'break-all' }}>
                  连接失败：{testError.value}
                </span>
              )}
            </div>

            <div className='cb-note' style={{ color: '#a15c00' }}>
              {hzmLlmApiKeyPersist.value
                ? 'Key 明文保存在浏览器 GM 存储；共用电脑或备份导出会暴露。担心可关掉「保存到 GM 存储」改为仅本会话。'
                : 'Key 仅留在内存，刷新页面后清空。'}
              openai-compat 自定义域首次调用时 Tampermonkey 会弹权限确认，需手动允许。
            </div>
          </div>
        </details>
      )}
    </details>
  )
}

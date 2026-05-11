import { useSignal } from '@preact/signals'

import type { MemeSource } from '../lib/meme-sources'

import { startHzmAutoDrive, stopHzmAutoDrive } from '../lib/hzm-auto-drive'
import { getMemeSourceForRoom } from '../lib/meme-sources'
import {
  activeTab,
  cachedRoomId,
  currentMemesList,
  getBlacklistTags,
  getDailyStats,
  getSelectedTags,
  type HzmDriveMode,
  hasConfirmedHzmRealFire,
  hzmActivityMinDanmu,
  hzmActivityMinDistinctUsers,
  hzmActivityWindowSec,
  hzmDriveEnabled,
  hzmDriveIntervalSec,
  hzmDriveMode,
  hzmDriveStatusText,
  hzmDryRun,
  hzmLlmRatio,
  hzmPanelOpen,
  hzmPauseKeywordsOverride,
  hzmRateLimitPerMin,
  hzmStrictHeuristic,
  sendMsg,
  setBlacklistTags,
  setSelectedTags,
} from '../lib/store'
import { extractRoomNumber } from '../lib/utils'
import { LlmApiConfigSummary } from './llm-api-config'
import { showConfirm } from './ui/alert-dialog'

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

const MODE_LABEL: Record<HzmDriveMode, string> = {
  heuristic: '启发式',
  llm: 'LLM 智驾',
}

const MODE_HINT: Record<HzmDriveMode, string> = {
  heuristic: '关键词触发，按 tag 命中本地梗库',
  llm: '由 LLM 阅读弹幕选梗，需要 API key',
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

function HzmDrivePanel({ source }: { source: MemeSource }) {
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
    return [...set].sort((a, b) => a.localeCompare(b))
  })()

  const advancedOpen = useSignal(false)

  const statusText = hzmDriveStatusText.value
  const statusColor = !isOn
    ? '#777'
    : statusText.includes('试运行')
      ? '#a15c00'
      : statusText.includes('运行中')
        ? '#1677ff'
        : '#0a7f55'

  const toggleEnabled = async () => {
    if (isOn) {
      hzmDriveEnabled.value = false
      stopHzmAutoDrive()
      return
    }
    // 关 → 开：非试运行且未确认过，先弹一次提示。用 showConfirm 替代 native confirm()
    // ——后者在浏览器里会被 anti-popup 抑制 / 不参与暗色模式 / 没法做样式与 dialog
    // 一致。同样的安全护栏要用同一种 UI primitive。
    if (!hzmDryRun.value && !hasConfirmedHzmRealFire.value) {
      const ok = await showConfirm({
        title: '智能辅助驾驶将以你的账号真实发送弹幕',
        body: '试运行已关闭。建议先打开「试运行」观察一段时间。是否继续直接开车？',
        confirmText: '我已了解，开车',
        cancelText: '取消',
      })
      if (!ok) return
      hasConfirmedHzmRealFire.value = true
    }
    hzmDriveEnabled.value = true
    void startHzmAutoDrive({ source, getMemes: () => currentMemesList.value })
  }

  const toggleSelectedTag = (tag: string) => {
    if (roomId === null) return
    setSelectedTags(roomId, selected.includes(tag) ? selected.filter(t => t !== tag) : [...selected, tag])
  }

  const toggleBlacklistTag = (tag: string) => {
    if (roomId === null) return
    setBlacklistTags(roomId, blacklist.includes(tag) ? blacklist.filter(t => t !== tag) : [...blacklist, tag])
  }

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
        {isOn && <span className='cb-soft'>运行中</span>}
      </summary>

      <div className='cb-body cb-stack'>
        <div className='cb-note' style={{ marginBottom: '.25em' }}>
          条件满足时，会以你的账号自动从烂梗库挑选并发送弹幕。第一次开启建议先打开下方的「试运行」观察效果。
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '.5em', alignItems: 'center' }}>
          {/* skipcq: JS-0098 — `void` discards the floating Promise from the async toggle so the click handler stays sync-typed for React. */}
          <button type='button' className={isOn ? 'cb-danger' : 'cb-primary'} onClick={() => void toggleEnabled()}>
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
          <label htmlFor='hzmDryRun' title='开启后只在日志显示候选，不真发到弹幕——新手强烈建议先开'>
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
                const v = Number.parseInt(e.currentTarget.value, 10)
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
                const v = Number.parseInt(e.currentTarget.value, 10)
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
                    const v = Number.parseInt(e.currentTarget.value, 10)
                    if (Number.isFinite(v) && v >= 1) hzmLlmRatio.value = v
                  }}
                  title='1=每次都用 LLM；3=每 3 次用 1 次（其它走启发式，省 API 费）'
                />
                <span>次</span>
              </>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '.25em' }}>
            <span title='活跃度闸门：最近窗口内必须既有 ≥N 条公屏，又有 ≥M 个不同 uid，否则本 tick 不发——避免空屏照刷。'>
              活跃度 最近
            </span>
            <input
              type='number'
              min='10'
              max='300'
              style={{ width: '46px' }}
              value={hzmActivityWindowSec.value}
              onInput={e => {
                const v = Number.parseInt(e.currentTarget.value, 10)
                if (Number.isFinite(v) && v >= 10) hzmActivityWindowSec.value = v
              }}
              title='活跃度窗口（秒）。建议 30–90。'
            />
            <span>秒内 ≥</span>
            <input
              type='number'
              min='1'
              max='50'
              style={{ width: '40px' }}
              value={hzmActivityMinDanmu.value}
              onInput={e => {
                const v = Number.parseInt(e.currentTarget.value, 10)
                if (Number.isFinite(v) && v >= 1) hzmActivityMinDanmu.value = v
              }}
              title='窗口内最少弹幕条数。'
            />
            <span>条 / ≥</span>
            <input
              type='number'
              min='1'
              max='20'
              style={{ width: '36px' }}
              value={hzmActivityMinDistinctUsers.value}
              onInput={e => {
                const v = Number.parseInt(e.currentTarget.value, 10)
                if (Number.isFinite(v) && v >= 1) hzmActivityMinDistinctUsers.value = v
              }}
              title='窗口内最少不同人数。防一人独刷被当作活跃。'
            />
            <span>人在说话</span>
          </div>

          <label
            style={{ display: 'flex', alignItems: 'center', gap: '.4em', cursor: 'pointer' }}
            title='严格模式：弹幕里没匹配到关键词、用户也没勾偏好 tag 时，本 tick 不发。关掉则随机选一条（旧版行为）。'
          >
            <input
              type='checkbox'
              checked={hzmStrictHeuristic.value}
              onInput={e => {
                hzmStrictHeuristic.value = e.currentTarget.checked
              }}
            />
            <span>严格选梗（无信号时不随机兜底）</span>
          </label>

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
        <div style={{ marginTop: '.5em' }}>
          <LlmApiConfigSummary
            onJumpToSettings={() => {
              activeTab.value = 'settings'
            }}
          />
        </div>
      )}
    </details>
  )
}

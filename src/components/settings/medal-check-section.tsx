import { useSignal } from '@preact/signals'

import { checkMedalRoomRestriction, fetchMedalRooms, type MedalRestrictionCheck } from '../../lib/api'
import { VERSION } from '../../lib/const'
import { gmSignal } from '../../lib/gm-signal'
import {
  guardRoomAgentConnected,
  guardRoomAgentLastSyncAt,
  guardRoomAgentLiveCount,
  guardRoomAgentStatusText,
  guardRoomAgentWatchlistCount,
  guardRoomAppliedProfile,
  guardRoomLiveDeskHeartbeatSec,
  guardRoomLiveDeskSessionId,
} from '../../lib/guard-room-live-desk-state'
import { appendLog } from '../../lib/log'
import {
  guardRoomEndpoint,
  guardRoomHandoffActive,
  guardRoomSyncKey,
  guardRoomWebsiteControlEnabled,
} from '../../lib/store'

const medalCheckStatus = gmSignal('medalCheckStatus', '未检查')
const medalCheckResults = gmSignal<MedalRestrictionCheck[]>('medalCheckResults', [])
const medalCheckFilter = gmSignal<'issues' | 'restricted' | 'unknown' | 'deactivated' | 'ok' | 'all'>(
  'medalCheckFilter',
  'issues'
)

function getMedalCheckCounts(results: MedalRestrictionCheck[]) {
  return {
    restricted: results.filter(result => result.status === 'restricted').length,
    deactivated: results.filter(result => result.status === 'deactivated').length,
    unknown: results.filter(result => result.status === 'unknown').length,
    ok: results.filter(result => result.status === 'ok').length,
  }
}

function signalKindLabel(kind: string): string {
  if (kind === 'muted') return '房间禁言'
  if (kind === 'blocked') return '房间屏蔽/拉黑'
  if (kind === 'account') return '账号风控'
  if (kind === 'rate-limit') return '频率限制'
  if (kind === 'deactivated') return '主播已注销'
  return '未知信号'
}

function formatCheckTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function sortMedalResults(results: MedalRestrictionCheck[]): MedalRestrictionCheck[] {
  const rank = { restricted: 0, unknown: 1, deactivated: 2, ok: 3 } satisfies Record<
    MedalRestrictionCheck['status'],
    number
  >
  return [...results].sort(
    (a, b) => rank[a.status] - rank[b.status] || a.room.anchorName.localeCompare(b.room.anchorName)
  )
}

function medalStatusTitle(status: MedalRestrictionCheck['status']): string {
  if (status === 'restricted') return '发现限制'
  if (status === 'unknown') return '无法确认'
  if (status === 'deactivated') return '主播已注销'
  return '未发现限制'
}

function medalStatusColor(status: MedalRestrictionCheck['status']): string {
  if (status === 'restricted') return '#a15c00'
  if (status === 'unknown') return '#666'
  if (status === 'deactivated') return '#8e8e93'
  return '#0a7f55'
}

function getFilteredMedalResults(
  results: MedalRestrictionCheck[],
  filter: 'issues' | 'restricted' | 'unknown' | 'deactivated' | 'ok' | 'all'
): MedalRestrictionCheck[] {
  const sorted = sortMedalResults(results)
  if (filter === 'all') return sorted
  if (filter === 'issues') return sorted.filter(result => result.status !== 'ok')
  return sorted.filter(result => result.status === filter)
}

function formatMedalResultLine(result: MedalRestrictionCheck): string {
  const room = `${result.room.anchorName} / ${result.room.medalName}`
  const header = `${medalStatusTitle(result.status)}｜${room}｜房间号：${result.room.roomId}｜检查时间：${formatCheckTime(result.checkedAt)}`
  if (result.signals.length === 0) return `${header}\n${result.note ?? '接口未发现禁言/封禁信号'}`
  const details = result.signals
    .map(
      signal => `${signalKindLabel(signal.kind)}：${signal.message}；时长：${signal.duration}；来源：${signal.source}`
    )
    .join('\n')
  return `${header}\n${details}`
}

function medalFilterLabel(filter: 'issues' | 'restricted' | 'unknown' | 'deactivated' | 'ok' | 'all'): string {
  if (filter === 'issues') return '异常'
  if (filter === 'restricted') return '限制'
  if (filter === 'unknown') return '未知'
  if (filter === 'deactivated') return '主播注销'
  if (filter === 'ok') return '正常'
  return '全部'
}

function formatMedalCheckReport(
  results: MedalRestrictionCheck[],
  status: string,
  filter: 'issues' | 'restricted' | 'unknown' | 'deactivated' | 'ok' | 'all'
): string {
  const counts = getMedalCheckCounts(results)
  const shown = getFilteredMedalResults(results, filter)
  return [
    '粉丝牌禁言巡检',
    status,
    `统计：限制 ${counts.restricted}，未知 ${counts.unknown}，主播注销 ${counts.deactivated}，正常 ${counts.ok}`,
    `当前复制范围：${medalFilterLabel(filter)}（${shown.length} 条）`,
    '',
    ...shown.map(formatMedalResultLine),
  ].join('\n\n')
}

function normalizeGuardRoomEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '')
}

function buildGuardRoomInspectionRun(results: MedalRestrictionCheck[]) {
  const checkedAtValues = results.map(result => result.checkedAt)
  const startedAt = checkedAtValues.length > 0 ? Math.min(...checkedAtValues) : Date.now()
  const finishedAt = checkedAtValues.length > 0 ? Math.max(...checkedAtValues) : Date.now()
  return {
    runId: `chatterbox-${Date.now()}`,
    scriptVersion: VERSION,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    results: results.map(result => ({
      roomId: result.room.roomId,
      anchorName: result.room.anchorName,
      anchorUid: result.room.anchorUid,
      medalName: result.room.medalName,
      status: result.status,
      signals: result.signals.map(signal => ({
        kind: signal.kind,
        message: signal.message,
        duration: signal.duration,
        source: signal.source,
      })),
      checkedAt: new Date(result.checkedAt).toISOString(),
      note: result.note,
    })),
  }
}

export function MedalCheckSection({ query = '' }: { query?: string }) {
  const checkingMedalRooms = useSignal(false)
  const medalCheckCopyStatus = useSignal('')
  const guardRoomSyncing = useSignal(false)
  const guardRoomSyncStatus = useSignal('')

  const visible =
    !query || '粉丝牌禁言巡检 禁言 粉丝牌 直播间 巡检 保安室 guard room 同步'.toLowerCase().includes(query)
  if (!visible) return null

  const checkMedalRooms = async () => {
    checkingMedalRooms.value = true
    medalCheckResults.value = []
    medalCheckStatus.value = '正在获取粉丝牌…'
    try {
      const rooms = await fetchMedalRooms()
      if (rooms.length === 0) {
        medalCheckStatus.value = '没有找到粉丝牌直播间'
        appendLog('禁言巡检：没有找到粉丝牌直播间')
        return
      }

      appendLog(`禁言巡检：找到 ${rooms.length} 个粉丝牌直播间，开始检查`)
      const results: MedalRestrictionCheck[] = []
      for (let i = 0; i < rooms.length; i++) {
        const room = rooms[i]
        medalCheckStatus.value = `检查中 ${i + 1}/${rooms.length}：${room.anchorName}（${room.medalName}）`
        const result = await checkMedalRoomRestriction(room)
        results.push(result)
        medalCheckResults.value = [...results]
        const label = `${room.anchorName} / ${room.medalName} / ${room.roomId}`
        if (result.status === 'restricted') {
          const detail = result.signals
            .map(signal => `${signalKindLabel(signal.kind)}：${signal.message}，时长：${signal.duration}`)
            .join('；')
          appendLog(`禁言巡检：发现限制 - ${label}：${detail}`)
        } else if (result.status === 'deactivated') {
          appendLog(`禁言巡检：主播已注销 - ${label}`)
        } else if (result.status === 'unknown') {
          appendLog(`禁言巡检：无法确认 - ${label}：${result.note ?? '接口未返回明确结果'}`)
        } else {
          appendLog(`禁言巡检：正常 - ${label}`)
        }
        if (i < rooms.length - 1) await new Promise(r => setTimeout(r, 500))
      }

      const counts = getMedalCheckCounts(results)
      medalCheckStatus.value = `完成：${rooms.length} 个房间，${counts.restricted} 个限制，${counts.deactivated} 个主播注销，${counts.unknown} 个无法确认`
      appendLog(
        `禁言巡检完成：${rooms.length} 个房间，${counts.restricted} 个限制，${counts.deactivated} 个主播注销，${counts.unknown} 个无法确认`
      )
      if (guardRoomSyncKey.value.trim()) await syncGuardRoomInspection(results)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      medalCheckStatus.value = `检查失败：${msg}`
      appendLog(`禁言巡检失败：${msg}`)
    } finally {
      checkingMedalRooms.value = false
    }
  }

  const syncGuardRoomInspection = async (results = medalCheckResults.value) => {
    if (results.length === 0) {
      guardRoomSyncStatus.value = '还没有巡检结果'
      return
    }
    const endpoint = normalizeGuardRoomEndpoint(guardRoomEndpoint.value)
    const syncKey = guardRoomSyncKey.value.trim()
    if (!endpoint || !syncKey) {
      guardRoomSyncStatus.value = '缺少保安室地址或同步密钥'
      return
    }
    guardRoomSyncing.value = true
    guardRoomSyncStatus.value = '同步中…'
    try {
      const response = await fetch(`${endpoint}/api/inspection-runs`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-sync-key': syncKey,
        },
        body: JSON.stringify(buildGuardRoomInspectionRun(results)),
      })
      const json: { message?: string } = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(json.message ?? `HTTP ${response.status}`)
      guardRoomSyncStatus.value = '已同步到直播间保安室'
      appendLog('直播间保安室：巡检结果已同步')
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      guardRoomSyncStatus.value = `同步失败：${msg}`
      appendLog(`直播间保安室：同步失败：${msg}`)
    } finally {
      guardRoomSyncing.value = false
    }
  }

  const copyMedalCheckResults = async () => {
    const results = medalCheckResults.value
    if (results.length === 0) {
      medalCheckCopyStatus.value = '还没有巡检结果'
      return
    }
    try {
      await navigator.clipboard.writeText(
        formatMedalCheckReport(results, medalCheckStatus.value, medalCheckFilter.value)
      )
      medalCheckCopyStatus.value = `已复制${medalFilterLabel(medalCheckFilter.value)}结果`
      setTimeout(() => {
        medalCheckCopyStatus.value = ''
      }, 1800)
    } catch {
      medalCheckCopyStatus.value = '复制失败，请检查浏览器剪贴板权限'
    }
  }

  const downloadMedalCheckResults = () => {
    const results = medalCheckResults.value
    if (results.length === 0) {
      medalCheckCopyStatus.value = '还没有巡检结果'
      return
    }
    const report = formatMedalCheckReport(results, medalCheckStatus.value, 'all')
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `禁言巡检_${new Date().toISOString().slice(0, 10)}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    medalCheckCopyStatus.value = '已下载报告'
    setTimeout(() => {
      medalCheckCopyStatus.value = ''
    }, 1800)
  }

  return (
    <details className='cb-settings-accordion' open>
      <summary>粉丝牌禁言巡检</summary>
      <div
        className='cb-section cb-stack'
        style={{ margin: '.5em 0', paddingBottom: '1em', borderBottom: '1px solid var(--Ga2, #eee)' }}
      >
        <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
          粉丝牌禁言巡检
        </div>
        <div className='cb-note' style={{ marginBlock: '.5em', color: '#666' }}>
          只读取 B 站接口，不发送弹幕。结果会按限制、无法确认、主播注销、正常排序；上次巡检会自动保留。
        </div>
        <div className='cb-panel cb-stack' style={{ marginBottom: '.5em' }}>
          <div className='cb-heading' style={{ marginBottom: 0 }}>
            直播间保安室同步
          </div>
          <input
            type='text'
            placeholder='https://bilibili-guard-room.vercel.app'
            value={guardRoomEndpoint.value}
            onInput={e => {
              guardRoomEndpoint.value = e.currentTarget.value
            }}
          />
          <input
            type='text'
            placeholder='spaceId@syncSecret'
            value={guardRoomSyncKey.value}
            onInput={e => {
              guardRoomSyncKey.value = e.currentTarget.value
            }}
          />
          <div className='cb-row'>
            <button
              type='button'
              disabled={guardRoomSyncing.value || medalCheckResults.value.length === 0}
              onClick={() => void syncGuardRoomInspection()}
            >
              {guardRoomSyncing.value ? '同步中…' : '保存并同步'}
            </button>
            {guardRoomSyncStatus.value && <span className='cb-note'>{guardRoomSyncStatus.value}</span>}
          </div>
        </div>
        <div className='cb-panel cb-stack' style={{ marginBottom: '.5em' }}>
          <div className='cb-heading' style={{ marginBottom: 0 }}>
            监控室代理状态（网站主控版）
          </div>
          <div className='cb-note'>
            监控、推荐、跳转和统一跟车配置现在都以网站为准。脚本这边只负责同步牌子房/关注房清单、拉取网站配置，并在当前直播页执行试运行。
          </div>
          <label className='cb-note cb-switch-row'>
            <input
              type='checkbox'
              checked={guardRoomWebsiteControlEnabled.value}
              onChange={e => {
                guardRoomWebsiteControlEnabled.value = e.currentTarget.checked
              }}
            />
            <span>允许网站覆盖本地自动跟车配置（预设 / 试运行）</span>
          </label>
          {!guardRoomWebsiteControlEnabled.value && (
            <div className='cb-note'>关闭时仍会同步监控状态，但不会把你的本地自定义参数改回 normal / 试运行。</div>
          )}
          {guardRoomHandoffActive.value && (
            <div className='cb-note'>当前页是从监控室接管跳转进来的，本页仍会按监控室指令执行试运行/自动启动。</div>
          )}
          <div className='cb-row' style={{ display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap' }}>
            <label className='cb-note' style={{ display: 'inline-flex', alignItems: 'center', gap: '.4em' }}>
              心跳间隔
              <input
                type='number'
                min='10'
                max='120'
                value={guardRoomLiveDeskHeartbeatSec.value}
                onInput={e => {
                  const value = Number(e.currentTarget.value)
                  guardRoomLiveDeskHeartbeatSec.value = Number.isFinite(value) ? Math.max(10, Math.min(120, value)) : 30
                }}
                style={{ width: '64px' }}
              />
              秒
            </label>
          </div>
          <div className='cb-note'>
            连接状态（网站主控版）：{guardRoomAgentConnected.value ? '已连接' : '未连接'} ·{' '}
            {guardRoomAgentStatusText.value}
          </div>
          <div className='cb-note'>当前会话：{guardRoomLiveDeskSessionId.value || '暂无活动监控会话'}</div>
          <div className='cb-note'>
            最近同步：
            {guardRoomAgentLastSyncAt.value
              ? new Date(guardRoomAgentLastSyncAt.value).toLocaleString('zh-CN', {
                  month: '2-digit',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : '暂无'}
          </div>
          <div className='cb-note'>
            当前监控清单：{guardRoomAgentWatchlistCount.value} 间 · 开播 {guardRoomAgentLiveCount.value} 间
          </div>
          <div className='cb-note'>
            网站下发配置：
            {guardRoomAppliedProfile.value
              ? `${guardRoomAppliedProfile.value.dryRunDefault ? '默认试运行' : '默认真发'} / ${guardRoomAppliedProfile.value.autoBlendEnabled ? '允许自动跟车' : '只观察'} / ${guardRoomAppliedProfile.value.conservativeMode} 档`
              : '尚未收到'}
          </div>
        </div>
        <div
          className='cb-row'
          style={{ display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.5em' }}
        >
          <button type='button' disabled={checkingMedalRooms.value} onClick={() => void checkMedalRooms()}>
            {checkingMedalRooms.value ? '检查中…' : '检查粉丝牌禁言'}
          </button>
          <button
            type='button'
            disabled={medalCheckResults.value.length === 0}
            onClick={() => void copyMedalCheckResults()}
          >
            复制巡检结果
          </button>
          <button type='button' disabled={medalCheckResults.value.length === 0} onClick={downloadMedalCheckResults}>
            下载报告
          </button>
          <span style={{ color: medalCheckStatus.value.includes('发现限制') ? '#a15c00' : '#666' }}>
            {medalCheckStatus.value}
          </span>
          {medalCheckCopyStatus.value && <span className='cb-note'>{medalCheckCopyStatus.value}</span>}
        </div>
        {medalCheckResults.value.length > 0 && (
          <div className='cb-stack'>
            {(() => {
              const counts = getMedalCheckCounts(medalCheckResults.value)
              const filter = medalCheckFilter.value
              const shownCount = getFilteredMedalResults(medalCheckResults.value, filter).length
              const filterButtonStyle = (
                active: boolean,
                color?: string
              ): Record<string, string | number | undefined> => ({
                minHeight: '24px',
                padding: '2px 6px',
                borderColor: active ? color : undefined,
                background: active ? 'rgba(0, 122, 255, .08)' : undefined,
                color,
                boxShadow: active ? 'inset 0 0 0 1px currentColor' : undefined,
              })
              return (
                <div className='cb-panel' style={{ display: 'grid', gap: '6px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '4px' }}>
                    <button
                      type='button'
                      aria-pressed={filter === 'issues'}
                      onClick={() => {
                        medalCheckFilter.value = 'issues'
                      }}
                      style={filterButtonStyle(filter === 'issues', '#a15c00')}
                    >
                      异常 {counts.restricted + counts.unknown + counts.deactivated}
                    </button>
                    <button
                      type='button'
                      aria-pressed={filter === 'all'}
                      onClick={() => {
                        medalCheckFilter.value = 'all'
                      }}
                      style={filterButtonStyle(filter === 'all')}
                    >
                      全部 {medalCheckResults.value.length}
                    </button>
                    <button
                      type='button'
                      aria-pressed={filter === 'restricted'}
                      onClick={() => {
                        medalCheckFilter.value = 'restricted'
                      }}
                      style={filterButtonStyle(filter === 'restricted', '#a15c00')}
                    >
                      限制 {counts.restricted}
                    </button>
                    <button
                      type='button'
                      aria-pressed={filter === 'unknown'}
                      onClick={() => {
                        medalCheckFilter.value = 'unknown'
                      }}
                      style={filterButtonStyle(filter === 'unknown', '#666')}
                    >
                      未知 {counts.unknown}
                    </button>
                    <button
                      type='button'
                      aria-pressed={filter === 'deactivated'}
                      onClick={() => {
                        medalCheckFilter.value = 'deactivated'
                      }}
                      style={filterButtonStyle(filter === 'deactivated', '#8e8e93')}
                    >
                      注销 {counts.deactivated}
                    </button>
                    <button
                      type='button'
                      aria-pressed={filter === 'ok'}
                      onClick={() => {
                        medalCheckFilter.value = 'ok'
                      }}
                      style={filterButtonStyle(filter === 'ok', '#0a7f55')}
                    >
                      正常 {counts.ok}
                    </button>
                  </div>
                  <div className='cb-note'>
                    当前显示：{medalFilterLabel(filter)} {shownCount} / {medalCheckResults.value.length} 条
                  </div>
                </div>
              )
            })()}
            <div style={{ maxHeight: '220px', overflowY: 'auto', display: 'grid', gap: '.35em' }}>
              {getFilteredMedalResults(medalCheckResults.value, medalCheckFilter.value).map(result => {
                const color = medalStatusColor(result.status)
                const title = medalStatusTitle(result.status)
                return (
                  <div
                    key={result.room.roomId}
                    className='cb-panel'
                    style={{
                      display: 'grid',
                      gap: '.25em',
                      borderColor: result.status === 'restricted' ? '#f0b35a' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '.5em' }}>
                      <strong style={{ wordBreak: 'break-all' }}>
                        {result.room.anchorName} / {result.room.medalName}
                      </strong>
                      <span style={{ color, whiteSpace: 'nowrap' }}>{title}</span>
                    </div>
                    <div className='cb-note'>
                      房间号：{result.room.roomId} · 检查时间：{formatCheckTime(result.checkedAt)}
                    </div>
                    {result.signals.length > 0 ? (
                      result.signals.map((signal, index) => (
                        <div key={index} style={{ color, wordBreak: 'break-all', lineHeight: 1.5 }}>
                          {signalKindLabel(signal.kind)}：{signal.message}
                          <br />
                          时长：{signal.duration} · 来源：{signal.source}
                        </div>
                      ))
                    ) : (
                      <div className='cb-note'>{result.note ?? '接口未发现禁言/封禁信号'}</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </details>
  )
}

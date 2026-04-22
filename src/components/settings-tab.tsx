import { useSignal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'

import {
  checkMedalRoomRestriction,
  ensureRoomId,
  fetchMedalRooms,
  getCsrfToken,
  type MedalRestrictionCheck,
  sendDanmaku,
} from '../lib/api'
import { BASE_URL, VERSION } from '../lib/const'
import { gmSignal } from '../lib/gm-signal'
import { appendLog, maxLogLines } from '../lib/log'
import { buildReplacementMap } from '../lib/replacement'
import {
  cachedRoomId,
  customChatCss,
  customChatEnabled,
  customChatHideNative,
  customChatTheme,
  customChatUseWs,
  danmakuDirectAlwaysShow,
  danmakuDirectConfirm,
  danmakuDirectMode,
  forceScrollDanmaku,
  guardRoomEndpoint,
  guardRoomSyncKey,
  localGlobalRules,
  localRoomRules,
  optimizeLayout,
  remoteKeywords,
  remoteKeywordsLastSync,
  unlockForbidLive,
} from '../lib/store'
import { EmoteIds } from './emote-ids'

const SYNC_INTERVAL = 10 * 60 * 1000
const medalCheckStatus = gmSignal('medalCheckStatus', '未检查')
const medalCheckResults = gmSignal<MedalRestrictionCheck[]>('medalCheckResults', [])
const medalCheckFilter = gmSignal<'issues' | 'restricted' | 'unknown' | 'deactivated' | 'ok' | 'all'>(
  'medalCheckFilter',
  'issues'
)

interface RemoteKeywords {
  global?: { keywords?: Record<string, string> }
  rooms?: Array<{ room: string; keywords?: Record<string, string> }>
}

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
  const rank = { restricted: 0, unknown: 1, deactivated: 2, ok: 3 } satisfies Record<MedalRestrictionCheck['status'], number>
  return [...results].sort((a, b) => rank[a.status] - rank[b.status] || a.room.anchorName.localeCompare(b.room.anchorName))
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
    .map(signal => `${signalKindLabel(signal.kind)}：${signal.message}；时长：${signal.duration}；来源：${signal.source}`)
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

async function fetchRemoteKeywords(): Promise<RemoteKeywords> {
  const response = await fetch(BASE_URL.REMOTE_KEYWORDS)
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  return await response.json()
}

export function SettingsTab() {
  const syncStatus = useSignal('未同步')
  const syncStatusColor = useSignal('#666')
  const syncing = useSignal(false)
  const testingRemote = useSignal(false)
  const testingLocal = useSignal(false)
  const checkingMedalRooms = useSignal(false)
  const medalCheckCopyStatus = useSignal('')
  const guardRoomSyncing = useSignal(false)
  const guardRoomSyncStatus = useSignal('')

  const globalReplaceFrom = useSignal('')
  const globalReplaceTo = useSignal('')

  const roomReplaceFrom = useSignal('')
  const roomReplaceTo = useSignal('')
  const editingRoomId = useSignal(cachedRoomId.value !== null ? String(cachedRoomId.value) : '')
  const newRoomId = useSignal('')

  const updateRemoteStatus = () => {
    const rk = remoteKeywords.value
    const ls = remoteKeywordsLastSync.value
    if (!rk || !ls) {
      syncStatus.value = '未同步'
      syncStatusColor.value = '#666'
      return
    }
    const rid = cachedRoomId.value
    const globalCount = Object.keys(rk.global?.keywords ?? {}).length
    let roomCount = 0
    if (rid !== null) {
      const roomData = rk.rooms?.find(r => String(r.room) === String(rid))
      roomCount = Object.keys(roomData?.keywords ?? {}).length
    }
    const timeStr = new Date(ls).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
    syncStatus.value = `最后同步: ${timeStr}，当前房间共 ${globalCount + roomCount} 条规则（全局 ${globalCount} + 当前房间 ${roomCount}）`
    syncStatusColor.value = '#36a185'
  }

  const syncRemote = async () => {
    syncing.value = true
    syncStatus.value = '正在同步…'
    syncStatusColor.value = '#666'
    try {
      const data = await fetchRemoteKeywords()
      remoteKeywords.value = data
      remoteKeywordsLastSync.value = Date.now()
      buildReplacementMap()
      updateRemoteStatus()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      syncStatus.value = `同步失败: ${msg}`
      syncStatusColor.value = '#f44'
      appendLog(`❌ 云端替换规则同步失败: ${msg}`)
    } finally {
      syncing.value = false
    }
  }

  const testKeywordPair = async (
    original: string,
    replaced: string,
    roomId: number,
    csrfToken: string
  ): Promise<{
    originalBlocked: boolean
    replacedBlocked: boolean | null
    originalError?: string
    replacedError?: string
  }> => {
    const originalResult = await sendDanmaku(original, roomId, csrfToken)
    let replacedResult: { success: boolean; error?: string } | null = null
    if (!originalResult.success) {
      await new Promise(r => setTimeout(r, 2000))
      replacedResult = await sendDanmaku(replaced, roomId, csrfToken)
    }
    return {
      originalBlocked: !originalResult.success,
      replacedBlocked: replacedResult ? !replacedResult.success : null,
      originalError: originalResult.error,
      replacedError: replacedResult?.error,
    }
  }

  const logTestResult = (
    result: {
      originalBlocked: boolean
      replacedBlocked: boolean | null
      originalError?: string
      replacedError?: string
    },
    replacedKeyword: string
  ): number => {
    if (result.originalBlocked) {
      appendLog(`  ✅ 原词被屏蔽 (错误: ${result.originalError})，测试替换词: ${replacedKeyword}`)
      if (result.replacedBlocked) {
        appendLog(`  ❌ 替换词也被屏蔽 (错误: ${result.replacedError})`)
      } else {
        appendLog('  ✅ 替换词未被屏蔽')
      }
      return 1
    }
    appendLog('  ⚠️ 原词未被屏蔽，请考虑提交贡献词条')
    return 0
  }

  const testRemote = async () => {
    if (
      !confirm(
        '即将测试当前直播间的云端替换词，请避免在当前直播间正在直播时进行测试，否则可能会给主播造成困扰，是否继续？'
      )
    )
      return
    testingRemote.value = true
    try {
      const roomId = await ensureRoomId()
      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        appendLog('❌ 未找到登录信息，请先登录 Bilibili')
        return
      }
      const rk = remoteKeywords.value
      const globalKw = Object.entries(rk?.global?.keywords ?? {})
        .filter(([f]) => f)
        .map(([from, to]) => ({ from, to }))
      const rid = cachedRoomId.value
      const roomKw =
        rid !== null
          ? Object.entries(rk?.rooms?.find(r => String(r.room) === String(rid))?.keywords ?? {})
              .filter(([f]) => f)
              .map(([from, to]) => ({ from, to }))
          : []
      const total = globalKw.length + roomKw.length
      if (total === 0) {
        appendLog('⚠️ 没有云端替换词可供测试，请先同步云端规则')
        return
      }
      appendLog(`🔵 开始测试云端替换词 ${total} 个（全局 ${globalKw.length} + 房间 ${roomKw.length}）`)
      let tested = 0
      let totalBlocked = 0

      if (globalKw.length > 0) {
        appendLog(`\n📡 测试云端全局替换词 (${globalKw.length} 个)`)
        let blockedCount = 0
        for (const { from, to } of globalKw) {
          tested++
          appendLog(`[${tested}/${total}] 测试: ${from}`)
          const result = await testKeywordPair(from, to, roomId, csrfToken)
          const b = logTestResult(result, to)
          blockedCount += b
          totalBlocked += b
          if (tested < total) await new Promise(r => setTimeout(r, 2000))
        }
        appendLog(`📡 全局替换词测试完成：${blockedCount}/${globalKw.length} 个原词被屏蔽`)
      }

      if (roomKw.length > 0) {
        appendLog(`\n🏠 测试云端房间专属替换词 (${roomKw.length} 个)`)
        let blockedCount = 0
        for (const { from, to } of roomKw) {
          tested++
          appendLog(`[${tested}/${total}] 测试: ${from}`)
          const result = await testKeywordPair(from, to, roomId, csrfToken)
          const b = logTestResult(result, to)
          blockedCount += b
          totalBlocked += b
          if (tested < total) await new Promise(r => setTimeout(r, 2000))
        }
        appendLog(`🏠 房间专属替换词测试完成：${blockedCount}/${roomKw.length} 个原词被屏蔽`)
      }

      appendLog(`\n🔵 云端测试完成！共测试 ${total} 个词，其中 ${totalBlocked} 个原词被屏蔽`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      appendLog(`🔴 测试出错：${msg}`)
    } finally {
      testingRemote.value = false
    }
  }

  const testLocal = async () => {
    if (!confirm('即将测试本地替换词，请避免在当前直播间正在直播时进行测试，否则可能会给主播造成困扰，是否继续？'))
      return
    testingLocal.value = true
    try {
      const roomId = await ensureRoomId()
      const csrfToken = getCsrfToken()
      if (!csrfToken) {
        appendLog('❌ 未找到登录信息，请先登录 Bilibili')
        return
      }
      const globalRules = localGlobalRules.value.filter(r => r.from)
      const rid = cachedRoomId.value
      const roomRules = rid !== null ? (localRoomRules.value[String(rid)] ?? []).filter(r => r.from) : []
      const total = globalRules.length + roomRules.length
      if (total === 0) {
        appendLog('⚠️ 没有本地替换词可供测试，请先添加本地替换规则')
        return
      }
      appendLog(`🔵 开始测试本地替换词 ${total} 个（全局 ${globalRules.length} + 当前房间 ${roomRules.length}）`)
      let tested = 0
      let totalBlocked = 0

      if (globalRules.length > 0) {
        appendLog(`\n📋 测试本地全局替换词 (${globalRules.length} 个)`)
        let blockedCount = 0
        for (const rule of globalRules) {
          tested++
          appendLog(`[${tested}/${total}] 测试: ${rule.from}`)
          const result = await testKeywordPair(rule.from ?? '', rule.to ?? '', roomId, csrfToken)
          const b = logTestResult(result, rule.to ?? '')
          blockedCount += b
          totalBlocked += b
          if (tested < total) await new Promise(r => setTimeout(r, 2000))
        }
        appendLog(`📋 本地全局替换词测试完成：${blockedCount}/${globalRules.length} 个原词被屏蔽`)
      }

      if (roomRules.length > 0) {
        appendLog(`\n🏠 测试本地房间替换词 (${roomRules.length} 个)`)
        let blockedCount = 0
        for (const rule of roomRules) {
          tested++
          appendLog(`[${tested}/${total}] 测试: ${rule.from}`)
          const result = await testKeywordPair(rule.from ?? '', rule.to ?? '', roomId, csrfToken)
          const b = logTestResult(result, rule.to ?? '')
          blockedCount += b
          totalBlocked += b
          if (tested < total) await new Promise(r => setTimeout(r, 2000))
        }
        appendLog(`🏠 本地房间替换词测试完成：${blockedCount}/${roomRules.length} 个原词被屏蔽`)
      }

      appendLog(`\n🔵 本地测试完成！共测试 ${total} 个词，其中 ${totalBlocked} 个原词被屏蔽`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      appendLog(`🔴 测试出错：${msg}`)
    } finally {
      testingLocal.value = false
    }
  }

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
      await navigator.clipboard.writeText(formatMedalCheckReport(results, medalCheckStatus.value, medalCheckFilter.value))
      medalCheckCopyStatus.value = `已复制${medalFilterLabel(medalCheckFilter.value)}结果`
      setTimeout(() => {
        medalCheckCopyStatus.value = ''
      }, 1800)
    } catch {
      medalCheckCopyStatus.value = '复制失败，请检查浏览器剪贴板权限'
    }
  }

  const addGlobalRule = () => {
    if (!globalReplaceFrom.value) {
      appendLog('⚠️ 替换前的内容不能为空')
      return
    }
    localGlobalRules.value = [...localGlobalRules.value, { from: globalReplaceFrom.value, to: globalReplaceTo.value }]
    buildReplacementMap()
    globalReplaceFrom.value = ''
    globalReplaceTo.value = ''
  }

  const removeGlobalRule = (index: number) => {
    const next = [...localGlobalRules.value]
    next.splice(index, 1)
    localGlobalRules.value = next
    buildReplacementMap()
  }

  const addRoomRule = () => {
    const rid = editingRoomId.value
    if (!rid) {
      appendLog('⚠️ 请先选择一个直播间')
      return
    }
    if (!roomReplaceFrom.value) {
      appendLog('⚠️ 替换前的内容不能为空')
      return
    }
    const all = { ...localRoomRules.value }
    const existing = all[rid] ?? []
    all[rid] = [...existing, { from: roomReplaceFrom.value, to: roomReplaceTo.value }]
    localRoomRules.value = all
    buildReplacementMap()
    roomReplaceFrom.value = ''
    roomReplaceTo.value = ''
  }

  const removeRoomRule = (index: number) => {
    const rid = editingRoomId.value
    if (!rid) return
    const all = { ...localRoomRules.value }
    const existing = [...(all[rid] ?? [])]
    existing.splice(index, 1)
    if (existing.length === 0) {
      delete all[rid]
    } else {
      all[rid] = existing
    }
    localRoomRules.value = all
    buildReplacementMap()
  }

  const addRoom = () => {
    const rid = newRoomId.value.trim()
    if (!rid) return
    if (knownRoomIds.includes(rid)) {
      editingRoomId.value = rid
      newRoomId.value = ''
      return
    }
    const all = { ...localRoomRules.value }
    all[rid] = all[rid] ?? []
    localRoomRules.value = all
    editingRoomId.value = rid
    newRoomId.value = ''
  }

  const deleteRoom = (rid: string) => {
    const all = { ...localRoomRules.value }
    delete all[rid]
    localRoomRules.value = all
    if (editingRoomId.value === rid) {
      editingRoomId.value = cachedRoomId.value !== null ? String(cachedRoomId.value) : ''
    }
    buildReplacementMap()
  }

  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    const ls = remoteKeywordsLastSync.value
    if (!ls || Date.now() - ls > SYNC_INTERVAL) {
      void syncRemote()
    } else {
      updateRemoteStatus()
    }
    const timer = setInterval(() => void syncRemote(), SYNC_INTERVAL)
    return () => clearInterval(timer)
  }, [])

  // cachedRoomId is resolved lazily by ensureRoomId(), so it may still be null
  // when this component first mounts. Sync it to the room-rule editor once
  // available, but only if the user hasn't already picked a room manually.
  useEffect(() => {
    if (editingRoomId.value) return
    const rid = cachedRoomId.value
    if (rid !== null) {
      editingRoomId.value = String(rid)
    }
  }, [editingRoomId.value, cachedRoomId.value])

  const globalRules = localGlobalRules.value
  const knownRoomIds = Object.keys(localRoomRules.value)
  const currentRoomStr = cachedRoomId.value !== null ? String(cachedRoomId.value) : null
  if (currentRoomStr && !knownRoomIds.includes(currentRoomStr)) {
    knownRoomIds.unshift(currentRoomStr)
  }
  const editingRules = editingRoomId.value ? (localRoomRules.value[editingRoomId.value] ?? []) : []

  return (
    <>
      <div
        className='cb-section cb-stack'
        style={{ margin: '.5em 0', paddingBottom: '1em', borderBottom: '1px solid var(--Ga2, #eee)' }}
      >
        <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
          云端规则替换{' '}
          <a
            href='https://github.com/laplace-live/public/blob/master/artifacts/livesrtream-keywords.json'
            target='_blank'
            style={{ color: '#288bb8', textDecoration: 'none' }}
            rel='noopener'
          >
            我要贡献规则
          </a>
        </div>
        <div className='cb-note' style={{ marginBlock: '.5em', color: '#666' }}>
          每10分钟会自动同步云端替换规则
        </div>
        <div
          className='cb-row'
          style={{ display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.5em' }}
        >
          <button type='button' disabled={syncing.value} onClick={() => void syncRemote()}>
            {syncing.value ? '同步中…' : '同步'}
          </button>
          <button type='button' disabled={testingRemote.value} onClick={() => void testRemote()}>
            {testingRemote.value ? '测试中…' : '测试云端词库'}
          </button>
          <span style={{ color: syncStatusColor.value }}>{syncStatus.value}</span>
        </div>
      </div>

      <div
        className='cb-section cb-stack'
        style={{ margin: '.5em 0', paddingBottom: '1em', borderBottom: '1px solid var(--Ga2, #eee)' }}
      >
        <div
          className='cb-row'
          style={{ display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.5em' }}
        >
          <div className='cb-heading' style={{ fontWeight: 'bold' }}>
            本地全局规则
          </div>
          <button type='button' disabled={testingLocal.value} onClick={() => void testLocal()}>
            {testingLocal.value ? '测试中…' : '测试本地词库'}
          </button>
        </div>
        <div className='cb-note' style={{ marginBlock: '.5em', color: '#666' }}>
          适用于所有直播间，优先级高于云端规则
        </div>
        <div style={{ marginBottom: '.5em', maxHeight: '160px', overflowY: 'auto' }}>
          {globalRules.length === 0 ? (
            <div className='cb-empty' style={{ color: '#999' }}>
              暂无全局替换规则，请在下方添加
            </div>
          ) : (
            globalRules.map((rule, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '.5em',
                  padding: '.2em',
                  borderBottom: '1px solid var(--Ga2, #eee)',
                }}
              >
                <span style={{ flex: 1, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                  {rule.from ?? '(空)'} → {rule.to ?? '(空)'}
                </span>
                <button
                  type='button'
                  onClick={() => removeGlobalRule(i)}
                  style={{
                    cursor: 'pointer',
                    background: 'transparent',
                    color: 'red',
                    border: 'none',
                    borderRadius: '2px',
                  }}
                >
                  删除
                </button>
              </div>
            ))
          )}
        </div>
        <div className='cb-row' style={{ display: 'flex', gap: '.25em', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder='替换前'
            style={{ flex: 1, minWidth: '80px' }}
            value={globalReplaceFrom.value}
            onInput={e => {
              globalReplaceFrom.value = e.currentTarget.value
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault()
                addGlobalRule()
              }
            }}
          />
          <span>→</span>
          <input
            placeholder='替换后'
            style={{ flex: 1, minWidth: '80px' }}
            value={globalReplaceTo.value}
            onInput={e => {
              globalReplaceTo.value = e.currentTarget.value
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.isComposing) {
                e.preventDefault()
                addGlobalRule()
              }
            }}
          />
          <button type='button' onClick={addGlobalRule}>
            添加
          </button>
        </div>
      </div>

      <div
        className='cb-section cb-stack'
        style={{ margin: '.5em 0', paddingBottom: '1em', borderBottom: '1px solid var(--Ga2, #eee)' }}
      >
        <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
          本地直播间规则
        </div>
        <div className='cb-note' style={{ marginBlock: '.5em', color: '#666' }}>
          仅在对应直播间生效；优先级高于全局规则
        </div>
        <div
          className='cb-row'
          style={{ display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.5em' }}
        >
          <select
            value={editingRoomId.value}
            onChange={e => {
              editingRoomId.value = e.currentTarget.value
            }}
            style={{ minWidth: '120px' }}
          >
            <option value='' disabled>
              选择直播间
            </option>
            {knownRoomIds.map(rid => (
              <option key={rid} value={rid}>
                {rid}
                {rid === currentRoomStr ? ' (当前)' : ''}
              </option>
            ))}
          </select>
          <div className='cb-row' style={{ display: 'flex', gap: '.25em', alignItems: 'center' }}>
            <input
              placeholder='房间号'
              style={{ width: '80px' }}
              value={newRoomId.value}
              onInput={e => {
                newRoomId.value = e.currentTarget.value.replace(/\D/g, '')
              }}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.isComposing) {
                  e.preventDefault()
                  addRoom()
                }
              }}
            />
            <button type='button' onClick={addRoom}>
              添加房间
            </button>
          </div>
          {editingRoomId.value && editingRoomId.value !== currentRoomStr && (
            <button type='button' onClick={() => deleteRoom(editingRoomId.value)} style={{ color: 'red' }}>
              删除此房间
            </button>
          )}
        </div>

        {editingRoomId.value ? (
          <>
            <div style={{ marginBottom: '.5em', maxHeight: '160px', overflowY: 'auto' }}>
              {editingRules.length === 0 ? (
                <div className='cb-empty' style={{ color: '#999' }}>
                  暂无此房间的替换规则，请在下方添加
                </div>
              ) : (
                editingRules.map((rule, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '.5em',
                      padding: '.2em',
                      borderBottom: '1px solid var(--Ga2, #eee)',
                    }}
                  >
                    <span style={{ flex: 1, wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {rule.from ?? '(空)'} → {rule.to ?? '(空)'}
                    </span>
                    <button
                      type='button'
                      onClick={() => removeRoomRule(i)}
                      style={{
                        cursor: 'pointer',
                        background: 'transparent',
                        color: 'red',
                        border: 'none',
                        borderRadius: '2px',
                      }}
                    >
                      删除
                    </button>
                  </div>
                ))
              )}
            </div>
            <div className='cb-row' style={{ display: 'flex', gap: '.25em', alignItems: 'center', flexWrap: 'wrap' }}>
              <input
                placeholder='替换前'
                style={{ flex: 1, minWidth: '80px' }}
                value={roomReplaceFrom.value}
                onInput={e => {
                  roomReplaceFrom.value = e.currentTarget.value
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.isComposing) {
                    e.preventDefault()
                    addRoomRule()
                  }
                }}
              />
              <span>→</span>
              <input
                placeholder='替换后'
                style={{ flex: 1, minWidth: '80px' }}
                value={roomReplaceTo.value}
                onInput={e => {
                  roomReplaceTo.value = e.currentTarget.value
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.isComposing) {
                    e.preventDefault()
                    addRoomRule()
                  }
                }}
              />
              <button type='button' onClick={addRoomRule}>
                添加
              </button>
            </div>
          </>
        ) : (
          <div className='cb-empty' style={{ color: '#999' }}>
            请选择或添加一个直播间
          </div>
        )}
      </div>

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
        <div
          className='cb-row'
          style={{ display: 'flex', gap: '.5em', alignItems: 'center', flexWrap: 'wrap', marginBottom: '.5em' }}
        >
          <button type='button' disabled={checkingMedalRooms.value} onClick={() => void checkMedalRooms()}>
            {checkingMedalRooms.value ? '检查中…' : '检查粉丝牌禁言'}
          </button>
          <button type='button' disabled={medalCheckResults.value.length === 0} onClick={() => void copyMedalCheckResults()}>
            复制巡检结果
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
                  style={{ display: 'grid', gap: '.25em', borderColor: result.status === 'restricted' ? '#f0b35a' : undefined }}
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

      <div
        className='cb-section cb-stack'
        style={{ margin: '.5em 0', paddingBottom: '1em', borderBottom: '1px solid var(--Ga2, #eee)' }}
      >
        <div className='cb-heading' style={{ fontWeight: 'bold', marginBottom: '.5em' }}>
          其他设置
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '.5em' }}>
          <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='customChatEnabled'
              type='checkbox'
              checked={customChatEnabled.value}
              onInput={e => {
                customChatEnabled.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='customChatEnabled'>接管 B 站评论区（Chatterbox Chat）</label>
          </span>
          <span
            className='cb-switch-row'
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em', paddingLeft: '1.5em' }}
          >
            <input
              id='customChatHideNative'
              type='checkbox'
              checked={customChatHideNative.value}
              disabled={!customChatEnabled.value}
              onInput={e => {
                customChatHideNative.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='customChatHideNative' style={{ color: customChatEnabled.value ? undefined : '#999' }}>
              隐藏 B 站原评论列表和原发送框
            </label>
          </span>
          <span
            className='cb-switch-row'
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em', paddingLeft: '1.5em' }}
          >
            <input
              id='customChatUseWs'
              type='checkbox'
              checked={customChatUseWs.value}
              disabled={!customChatEnabled.value}
              onInput={e => {
                customChatUseWs.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='customChatUseWs' style={{ color: customChatEnabled.value ? undefined : '#999' }}>
              直连 WebSocket 获取礼物、醒目留言、进场等事件（DOM 兜底）
            </label>
          </span>
          <div className='cb-row' style={{ paddingLeft: '1.5em' }}>
            <label htmlFor='customChatTheme'>评论区主题</label>
            <select
              id='customChatTheme'
              value={customChatTheme.value}
              disabled={!customChatEnabled.value}
              onChange={e => {
                customChatTheme.value = e.currentTarget.value as typeof customChatTheme.value
              }}
            >
              <option value='laplace'>Laplace Dark</option>
              <option value='light'>Light</option>
              <option value='compact'>Compact</option>
            </select>
          </div>
          <details style={{ marginLeft: '1.5em' }}>
            <summary>自定义评论区 CSS</summary>
            <div className='cb-body cb-stack'>
              <textarea
                value={customChatCss.value}
                disabled={!customChatEnabled.value}
                onInput={e => {
                  customChatCss.value = e.currentTarget.value
                }}
                placeholder={'#laplace-custom-chat .lc-chat-message { ... }'}
                style={{ minHeight: '90px', resize: 'vertical', width: '100%' }}
              />
              <div className='cb-note'>
                可覆盖 #laplace-custom-chat、.lc-chat-message、.lc-chat-name、.lc-chat-text、.lc-chat-action 等选择器。
              </div>
            </div>
          </details>
          <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='danmakuDirectMode'
              type='checkbox'
              checked={danmakuDirectMode.value}
              onInput={e => {
                danmakuDirectMode.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='danmakuDirectMode'>+1模式（在聊天消息旁显示偷弹幕和+1按钮）</label>
          </span>
          <span
            className='cb-switch-row'
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em', paddingLeft: '1.5em' }}
          >
            <input
              id='danmakuDirectConfirm'
              type='checkbox'
              checked={danmakuDirectConfirm.value}
              disabled={!danmakuDirectMode.value}
              onInput={e => {
                danmakuDirectConfirm.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='danmakuDirectConfirm' style={{ color: danmakuDirectMode.value ? undefined : '#999' }}>
              +1弹幕发送前需确认（防误触）
            </label>
          </span>
          <span
            className='cb-switch-row'
            style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em', paddingLeft: '1.5em' }}
          >
            <input
              id='danmakuDirectAlwaysShow'
              type='checkbox'
              checked={danmakuDirectAlwaysShow.value}
              disabled={!danmakuDirectMode.value}
              onInput={e => {
                danmakuDirectAlwaysShow.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='danmakuDirectAlwaysShow' style={{ color: danmakuDirectMode.value ? undefined : '#999' }}>
              总是显示偷/+1按钮
            </label>
          </span>
          <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='forceScrollDanmaku'
              type='checkbox'
              checked={forceScrollDanmaku.value}
              onInput={e => {
                forceScrollDanmaku.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='forceScrollDanmaku'>脚本载入时强制配置弹幕位置为滚动方向</label>
          </span>
          <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='unlockForbidLive'
              type='checkbox'
              checked={unlockForbidLive.value}
              onInput={e => {
                unlockForbidLive.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='unlockForbidLive'>拉黑直播间解锁（刷新生效，仅布局解锁）</label>
          </span>
          <span className='cb-switch-row' style={{ display: 'inline-flex', alignItems: 'center', gap: '.25em' }}>
            <input
              id='optimizeLayout'
              type='checkbox'
              checked={optimizeLayout.value}
              onInput={e => {
                optimizeLayout.value = e.currentTarget.checked
              }}
            />
            <label htmlFor='optimizeLayout'>优化布局</label>
          </span>
        </div>
      </div>

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
              let v = parseInt(e.currentTarget.value, 10)
              if (Number.isNaN(v) || v < 1) v = 1
              else if (v > 1000) v = 1000
              maxLogLines.value = v
            }}
          />
          <span style={{ color: '#999', fontSize: '0.9em' }}>(1-1000)</span>
        </div>
      </div>
    </>
  )
}

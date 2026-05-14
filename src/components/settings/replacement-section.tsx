import { useSignal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'

import { ensureRoomId, getCsrfToken, sendDanmaku } from '../../lib/api'
import { appendLog } from '../../lib/log'
import { isInfrastructureError } from '../../lib/moderation'
import { fetchRemoteKeywords } from '../../lib/remote-keywords-fetch'
import { buildReplacementMap } from '../../lib/replacement'
import { cachedRoomId, localGlobalRules, localRoomRules, remoteKeywords, remoteKeywordsLastSync } from '../../lib/store'
import { showConfirm } from '../ui/alert-dialog'
import { matchesSearchQuery } from './search'

const SYNC_INTERVAL = 10 * 60 * 1000

interface ReplacementRule {
  from?: string
  to?: string
  source?: 'manual' | 'learned'
  learnedAt?: number
}

/**
 * 把毫秒时间戳格式化成"X 前"的相对时间字符串。
 *
 * 我们专门给"自动学到的"规则用，避免 UI 出现绝对日期；用户看的是"这条是最近
 * 还是很久以前学的"，不是"具体几月几号"。粒度足够区分"刚学的（可能是垃圾）"
 * 和"用了一阵的（大概率有用）"。
 */
function formatRelativeTime(ts: number, now = Date.now()): string {
  const diff = Math.max(0, now - ts)
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} 小时前`
  return `${Math.floor(diff / 86_400_000)} 天前`
}

function ReplacementRuleList({
  rules,
  emptyText,
  onRemove,
}: {
  rules: ReplacementRule[]
  emptyText: string
  onRemove: (index: number) => void
}) {
  if (rules.length === 0) {
    return <div className='cb-empty'>{emptyText}</div>
  }

  return (
    <div className='cb-rule-list'>
      {rules.map((rule, i) => (
        <div key={i} className='cb-rule-item'>
          <div className='cb-rule-pair'>
            <div>
              <div className='cb-label'>替换前</div>
              <code>{rule.from || '(空)'}</code>
            </div>
            <div>
              <div className='cb-label'>替换后</div>
              <code>{rule.to || '(空)'}</code>
            </div>
          </div>
          <button type='button' className='cb-rule-remove' onClick={() => onRemove(i)} aria-label='删除替换规则'>
            删除
          </button>
        </div>
      ))}
    </div>
  )
}

function ReplacementRuleForm({
  from,
  to,
  onFromChange,
  onToChange,
  onAdd,
  disabled,
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  onAdd: () => void
  disabled?: boolean
}) {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.isComposing) {
      e.preventDefault()
      onAdd()
    }
  }

  return (
    <div className='cb-rule-form'>
      <label>
        <span className='cb-label'>替换前</span>
        <input
          placeholder='会被屏蔽或想改写的原词'
          value={from}
          disabled={disabled}
          onInput={e => onFromChange(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
      </label>
      <label>
        <span className='cb-label'>替换后</span>
        <input
          placeholder='实际发送的内容'
          value={to}
          disabled={disabled}
          onInput={e => onToChange(e.currentTarget.value)}
          onKeyDown={handleKeyDown}
        />
      </label>
      <button type='button' disabled={disabled} onClick={onAdd}>
        添加规则
      </button>
    </div>
  )
}

export function CloudReplacementSection({ query = '' }: { query?: string }) {
  const syncStatus = useSignal('未同步')
  const syncStatusColor = useSignal('#666')
  const syncing = useSignal(false)
  const testingRemote = useSignal(false)

  const visible = matchesSearchQuery('云端规则替换 远程 规则 同步 替换 LAPLACE remote keyword cloud', query)

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
    if (result.originalBlocked && isInfrastructureError(result.originalError)) {
      appendLog(`  ⛔ 测试出错（网络/CORS）：${result.originalError} — 跳过这条`)
      return 0
    }
    if (result.originalBlocked) {
      appendLog(`  ✅ 原词被屏蔽 (错误: ${result.originalError})，测试替换词: ${replacedKeyword}`)
      if (result.replacedBlocked && isInfrastructureError(result.replacedError)) {
        appendLog(`  ⛔ 替换词测试出错（网络/CORS）：${result.replacedError}`)
      } else if (result.replacedBlocked) {
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
    const ok = await showConfirm({
      title: '即将测试当前直播间的云端替换词',
      body: '请避免在当前直播间正在直播时测试，否则可能给主播造成困扰。是否继续？',
      confirmText: '继续测试',
      cancelText: '取消',
    })
    if (!ok) return
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

  const didInit = useRef(false)
  useEffect(() => {
    if (didInit.current) return undefined
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

  if (!visible) return null

  return (
    <details className='cb-settings-accordion' open>
      <summary>云端规则替换</summary>
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
          云端规则由社区维护，每 10 分钟会自动从 workers.vrp.moe 同步一次。
        </div>
        <div className='cb-note' style={{ marginBlock: '.25em', color: '#666', fontSize: '0.85em' }}>
          应用顺序（从高到低）：当前直播间规则 → 本地全局规则 → 云端规则 → 原文。
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
    </details>
  )
}

export function LocalGlobalReplacementSection({ query = '' }: { query?: string }) {
  const testingLocal = useSignal(false)
  const globalReplaceFrom = useSignal('')
  const globalReplaceTo = useSignal('')

  const visible = matchesSearchQuery('本地全局规则 替换 规则 local global rules 全局', query)

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
    if (result.originalBlocked && isInfrastructureError(result.originalError)) {
      appendLog(`  ⛔ 测试出错（网络/CORS）：${result.originalError} — 跳过这条`)
      return 0
    }
    if (result.originalBlocked) {
      appendLog(`  ✅ 原词被屏蔽 (错误: ${result.originalError})，测试替换词: ${replacedKeyword}`)
      if (result.replacedBlocked && isInfrastructureError(result.replacedError)) {
        appendLog(`  ⛔ 替换词测试出错（网络/CORS）：${result.replacedError}`)
      } else if (result.replacedBlocked) {
        appendLog(`  ❌ 替换词也被屏蔽 (错误: ${result.replacedError})`)
      } else {
        appendLog('  ✅ 替换词未被屏蔽')
      }
      return 1
    }
    appendLog('  ⚠️ 原词未被屏蔽，请考虑提交贡献词条')
    return 0
  }

  const testLocal = async () => {
    const ok = await showConfirm({
      title: '即将测试本地替换词',
      body: '请避免在当前直播间正在直播时测试，否则可能给主播造成困扰。是否继续？',
      confirmText: '继续测试',
      cancelText: '取消',
    })
    if (!ok) return
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

  if (!visible) return null

  const globalRules = localGlobalRules.value

  return (
    <details className='cb-settings-accordion' open>
      <summary>本地全局规则</summary>
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
        <ReplacementRuleList
          rules={globalRules}
          emptyText='暂无全局替换规则，请在下方添加'
          onRemove={removeGlobalRule}
        />
        <ReplacementRuleForm
          from={globalReplaceFrom.value}
          to={globalReplaceTo.value}
          onFromChange={value => {
            globalReplaceFrom.value = value
          }}
          onToChange={value => {
            globalReplaceTo.value = value
          }}
          onAdd={addGlobalRule}
        />
      </div>
    </details>
  )
}

export function LocalRoomReplacementSection({ query = '' }: { query?: string }) {
  const roomReplaceFrom = useSignal('')
  const roomReplaceTo = useSignal('')
  const editingRoomId = useSignal(cachedRoomId.value !== null ? String(cachedRoomId.value) : '')
  const newRoomId = useSignal('')

  const visible = matchesSearchQuery('本地直播间规则 房间 规则 替换 local room rules', query)

  // cachedRoomId is resolved lazily; sync to editor once available
  useEffect(() => {
    if (editingRoomId.value) return
    const rid = cachedRoomId.value
    if (rid !== null) {
      editingRoomId.value = String(rid)
    }
  }, [editingRoomId.value, cachedRoomId.value])

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

  /**
   * 删除一条 learned 规则。learned 规则的索引基于"已过滤的 learned 列表"，
   * 需要从原始数组里找到对应 from/learnedAt 才能定位。源数组里 manual 跟
   * learned 是混在一起的（保留写入顺序）；用 (from, learnedAt) 当复合键能
   * 精确匹配，避免误删同名 manual 规则。
   */
  const removeLearnedRule = (learned: ReplacementRule) => {
    const rid = editingRoomId.value
    if (!rid) return
    const all = { ...localRoomRules.value }
    const existing = (all[rid] ?? []).filter(
      r => !(r.source === 'learned' && r.from === learned.from && r.learnedAt === learned.learnedAt)
    )
    if (existing.length === 0) delete all[rid]
    else all[rid] = existing
    localRoomRules.value = all
    buildReplacementMap()
    appendLog(`📚 已撤销学到的屏蔽词规则：${learned.from} → ${learned.to}`)
  }

  /** 一键撤销 N 条最近 learned 规则（按 learnedAt 倒序）。 */
  const removeRecentLearned = async (n: number) => {
    const rid = editingRoomId.value
    if (!rid) return
    const existing = localRoomRules.value[rid] ?? []
    const recentLearned = existing
      .filter(r => r.source === 'learned')
      .sort((a, b) => (b.learnedAt ?? 0) - (a.learnedAt ?? 0))
      .slice(0, n)
    if (recentLearned.length === 0) return
    const ok = await showConfirm({
      title: `撤销最近 ${recentLearned.length} 条学习的规则`,
      body: recentLearned.map(r => `${r.from} → ${r.to}`).join('\n'),
      confirmText: `撤销这 ${recentLearned.length} 条`,
      cancelText: '取消',
    })
    if (!ok) return
    const keepSet = new Set(recentLearned.map(r => `${r.from}\x00${r.learnedAt}`))
    const filtered = existing.filter(r => !(r.source === 'learned' && keepSet.has(`${r.from}\x00${r.learnedAt}`)))
    const all = { ...localRoomRules.value }
    if (filtered.length === 0) delete all[rid]
    else all[rid] = filtered
    localRoomRules.value = all
    buildReplacementMap()
    appendLog(`📚 已撤销 ${recentLearned.length} 条最近自动学到的规则`)
  }

  const addRoom = () => {
    const rid = newRoomId.value.trim()
    if (!rid) return
    const knownRoomIds = Object.keys(localRoomRules.value)
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

  if (!visible) return null

  const knownRoomIds = Object.keys(localRoomRules.value)
  const currentRoomStr = cachedRoomId.value !== null ? String(cachedRoomId.value) : null
  if (currentRoomStr && !knownRoomIds.includes(currentRoomStr)) {
    knownRoomIds.unshift(currentRoomStr)
  }
  const editingRules = editingRoomId.value ? (localRoomRules.value[editingRoomId.value] ?? []) : []

  return (
    <details className='cb-settings-accordion'>
      <summary>本地直播间规则</summary>
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
        <div className='cb-rule-room-form'>
          <label>
            <span className='cb-label'>正在编辑</span>
            <select
              value={editingRoomId.value}
              onChange={e => {
                editingRoomId.value = e.currentTarget.value
              }}
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
          </label>
          <label>
            <span className='cb-label'>添加房间号</span>
            <input
              placeholder='输入房间号'
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
          </label>
          <div className='cb-rule-room-actions'>
            <button type='button' onClick={addRoom}>
              添加房间
            </button>
            {editingRoomId.value && editingRoomId.value !== currentRoomStr && (
              <button type='button' className='cb-rule-remove' onClick={() => deleteRoom(editingRoomId.value)}>
                删除此房间
              </button>
            )}
          </div>
        </div>

        {editingRoomId.value ? (
          <>
            {(() => {
              // 把规则按 source 拆开展示：手工规则（含未标记的老数据）走原 list,
              // 学到的规则单独区块以时间倒序呈现 + 撤销按钮。
              const manualRules = editingRules.filter(r => r.source !== 'learned')
              const learnedRules = editingRules
                .filter(r => r.source === 'learned')
                .sort((a, b) => (b.learnedAt ?? 0) - (a.learnedAt ?? 0))
              // manualRules 在源数组里的 index 不连续；onRemove 给出的是 manual
              // 列表里的 index，要映射回源数组 index。
              const manualOriginalIdx = editingRules
                .map((r, i) => ({ r, i }))
                .filter(({ r }) => r.source !== 'learned')
                .map(({ i }) => i)

              return (
                <>
                  <ReplacementRuleList
                    rules={manualRules}
                    emptyText='暂无此房间的手工规则，请在下方添加'
                    onRemove={i => removeRoomRule(manualOriginalIdx[i])}
                  />
                  {learnedRules.length > 0 && (
                    <details className='cb-panel' style={{ marginTop: '.5em' }}>
                      <summary style={{ cursor: 'pointer', userSelect: 'none', fontWeight: 'bold', fontSize: '0.9em' }}>
                        自动学到的规则 ({learnedRules.length})
                      </summary>
                      <div className='cb-note' style={{ color: '#666', fontSize: '0.85em', marginTop: '.35em' }}>
                        这些规则由「自动重发 + 自动学习」从 AI 改写结果中沉淀而来。
                        若发现某条改写不准确，点旁边的「撤销」即可删除。
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          gap: '.5em',
                          alignItems: 'center',
                          flexWrap: 'wrap',
                          margin: '.4em 0',
                        }}
                      >
                        <button type='button' className='cb-rule-remove' onClick={() => void removeRecentLearned(5)}>
                          撤销最近 5 条
                        </button>
                        {learnedRules.length > 10 && (
                          <button
                            type='button'
                            className='cb-rule-remove'
                            onClick={() => void removeRecentLearned(learnedRules.length)}
                          >
                            清空全部 ({learnedRules.length})
                          </button>
                        )}
                      </div>
                      <div className='cb-rule-list'>
                        {learnedRules.map(rule => (
                          <div key={`${rule.from}\x00${rule.learnedAt}`} className='cb-rule-item'>
                            <div className='cb-rule-pair'>
                              <div>
                                <div className='cb-label'>
                                  替换前
                                  {rule.learnedAt && (
                                    <span style={{ marginLeft: '.5em', color: '#999', fontWeight: 'normal' }}>
                                      · {formatRelativeTime(rule.learnedAt)}
                                    </span>
                                  )}
                                </div>
                                <code>{rule.from || '(空)'}</code>
                              </div>
                              <div>
                                <div className='cb-label'>替换后</div>
                                <code>{rule.to || '(空)'}</code>
                              </div>
                            </div>
                            <button
                              type='button'
                              className='cb-rule-remove'
                              onClick={() => removeLearnedRule(rule)}
                              aria-label='撤销这条自动学到的规则'
                            >
                              撤销
                            </button>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </>
              )
            })()}
            <ReplacementRuleForm
              from={roomReplaceFrom.value}
              to={roomReplaceTo.value}
              onFromChange={value => {
                roomReplaceFrom.value = value
              }}
              onToChange={value => {
                roomReplaceTo.value = value
              }}
              onAdd={addRoomRule}
            />
          </>
        ) : (
          <div className='cb-empty' style={{ color: '#999' }}>
            请选择或添加一个直播间
          </div>
        )}
      </div>
    </details>
  )
}

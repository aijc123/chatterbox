export type RestrictionKind = 'muted' | 'account' | 'rate-limit' | 'blocked' | 'deactivated' | 'unknown'

/** Known Bilibili live API error codes, checked before string matching. */
const RATE_LIMIT_CODES = new Set([10030, 10031])
const MUTED_CODES = new Set([10024, 11004])
const BLOCKED_CODES = new Set([11002, 11003])
const ACCOUNT_CODES = new Set([-101, -352, 10005, 10006, 10021])

/** Classifies by numeric error code first; faster and more reliable than text matching. */
export function classifyByCode(code: number | undefined): RestrictionKind | null {
  if (code === undefined) return null
  if (RATE_LIMIT_CODES.has(code)) return 'rate-limit'
  if (MUTED_CODES.has(code)) return 'muted'
  if (BLOCKED_CODES.has(code)) return 'blocked'
  if (ACCOUNT_CODES.has(code)) return 'account'
  return null
}

export interface RestrictionSignal {
  kind: RestrictionKind
  message: string
  duration: string
  source: string
}

export function isRateLimitError(error: string | undefined): boolean {
  if (!error) return false
  return error.includes('频率') || error.includes('过快') || error.toLowerCase().includes('rate')
}

export function isMutedError(error: string | undefined): boolean {
  if (!error) return false
  return error.includes('禁言') || error.includes('被封') || error.toLowerCase().includes('muted')
}

export function isAccountRestrictedError(error: string | undefined): boolean {
  if (!error) return false
  const lower = error.toLowerCase()
  return (
    error.includes('账号') ||
    error.includes('账户') ||
    error.includes('风控') ||
    error.includes('封号') ||
    error.includes('封禁') ||
    lower.includes('account') ||
    lower.includes('risk')
  )
}

export function formatDuration(seconds: number): string {
  const rounded = Math.max(1, Math.ceil(seconds))
  if (rounded < 60) return `${rounded} 秒`
  const minutes = Math.ceil(rounded / 60)
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.ceil(minutes / 60)
  if (hours < 24) return `${hours} 小时`
  return `${Math.ceil(hours / 24)} 天`
}

export function durationFromString(text: string): string | null {
  const unitMatch = text.match(/(\d+)\s*(秒|分钟|分|小时|天)/)
  if (unitMatch) {
    const value = Number(unitMatch[1])
    const unit = unitMatch[2]
    if (unit === '秒') return formatDuration(value)
    if (unit === '分' || unit === '分钟') return formatDuration(value * 60)
    if (unit === '小时') return formatDuration(value * 60 * 60)
    if (unit === '天') return formatDuration(value * 24 * 60 * 60)
  }

  const dateMatch = text.match(/(20\d{2}[-/]\d{1,2}[-/]\d{1,2}(?:\s+\d{1,2}:\d{1,2}(?::\d{1,2})?)?)/)
  if (!dateMatch) return null
  const end = new Date(dateMatch[1].replace(/\//g, '-')).getTime()
  if (!Number.isFinite(end) || end <= Date.now()) return null
  return `${formatDuration((end - Date.now()) / 1000)}（到 ${dateMatch[1]}）`
}

export function durationFromData(data: unknown, seen: WeakSet<object> = new WeakSet()): string | null {
  if (typeof data === 'string') return durationFromString(data)
  if (typeof data !== 'object' || data === null) return null
  if (seen.has(data)) return null
  seen.add(data)

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    if (typeof value === 'string') {
      const parsed = durationFromString(value)
      if (parsed) return parsed
    } else if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      if (
        lowerKey.includes('remain') ||
        lowerKey.includes('left') ||
        lowerKey.includes('duration') ||
        lowerKey.includes('second') ||
        lowerKey.includes('ttl') ||
        key.includes('剩余') ||
        key.includes('时长')
      ) {
        return formatDuration(value)
      }
      if (
        lowerKey.includes('end') ||
        lowerKey.includes('expire') ||
        lowerKey.includes('until') ||
        key.includes('解除')
      ) {
        const ms = value > 10_000_000_000 ? value : value * 1000
        if (ms > Date.now()) return `${formatDuration((ms - Date.now()) / 1000)}（到 ${new Date(ms).toLocaleString()}）`
      }
    } else {
      const nested = durationFromData(value, seen)
      if (nested) return nested
    }
  }

  return null
}

export function describeRestrictionDuration(error: string | undefined, data: unknown): string {
  return durationFromString(error ?? '') ?? durationFromData(data) ?? '接口未返回时长'
}

export function scanRestrictionSignals(data: unknown, source: string): RestrictionSignal[] {
  const signals: RestrictionSignal[] = []
  scanNode(data, source, signals, '', new WeakSet<object>())
  return signals
}

function scanNode(
  data: unknown,
  source: string,
  signals: RestrictionSignal[],
  path: string,
  seen: WeakSet<object>
): void {
  if (typeof data === 'string') {
    const kind = classifyText(data)
    if (kind) signals.push({ kind, message: data, duration: describeRestrictionDuration(data, null), source })
    return
  }
  if (typeof data !== 'object' || data === null) return
  // Guard against cyclic JSON (the fetch-hijack runs before this and could in
  // principle hand back a mutated object with a back-reference) so we don't
  // blow the stack.
  if (seen.has(data)) return
  seen.add(data)

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase()
    const currentPath = path ? `${path}.${key}` : key
    if (typeof value === 'boolean' && value) {
      if (lowerKey.includes('silent') || lowerKey.includes('mute') || key.includes('禁言')) {
        signals.push({
          kind: 'muted',
          message: currentPath,
          duration: describeRestrictionDuration(undefined, data),
          source,
        })
      } else if (
        lowerKey.includes('forbid') ||
        lowerKey.includes('block') ||
        key.includes('封') ||
        key.includes('黑')
      ) {
        signals.push({
          kind: 'blocked',
          message: currentPath,
          duration: describeRestrictionDuration(undefined, data),
          source,
        })
      }
    }
    scanNode(value, source, signals, currentPath, seen)
  }
}

function classifyText(text: string): RestrictionKind | null {
  if (text === '账号已注销' || text.includes('账号已注销')) return 'deactivated'
  if (isRateLimitError(text)) return 'rate-limit'
  if (isMutedError(text)) return 'muted'
  if (isAccountRestrictedError(text)) return 'account'
  if (text.includes('拉黑') || text.includes('黑名单') || text.toLowerCase().includes('blacklist')) return 'blocked'
  return null
}

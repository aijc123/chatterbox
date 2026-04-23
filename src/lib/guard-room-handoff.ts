import { guardRoomLiveDeskSessionId } from './guard-room-live-desk-state'
import { appendLog } from './log'
import { autoBlendDryRun, autoBlendEnabled } from './store'

let applied = false

export function applyGuardRoomHandoff(): void {
  if (applied) return
  applied = true

  const url = new URL(window.location.href)
  if (url.searchParams.get('guard_room_source') !== 'guard-room') return

  const mode = url.searchParams.get('guard_room_mode')
  const autostart = url.searchParams.get('guard_room_autostart') === '1'
  const sessionId = url.searchParams.get('guard_room_session')

  if (sessionId) {
    guardRoomLiveDeskSessionId.value = sessionId
  }

  if (mode === 'dry-run') {
    autoBlendDryRun.value = true
  }

  if (autostart) {
    autoBlendEnabled.value = true
    appendLog('直播间保安室：已接管本页，自动跟车进入试运行。')
  }
}

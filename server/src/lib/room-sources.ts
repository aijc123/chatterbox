const SBHZM_ROOM_IDS = new Set([1713546334])

export function parsePositiveRoomId(value: string | null): number | null {
  const roomId = Number(value)
  return Number.isFinite(roomId) && roomId > 0 ? roomId : null
}

export function shouldIncludeSbhzmSource(sourceFilter: string, roomId: number | null): boolean {
  return sourceFilter === 'sbhzm' || (sourceFilter === 'all' && roomId !== null && SBHZM_ROOM_IDS.has(roomId))
}

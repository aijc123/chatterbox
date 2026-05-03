export function filterBackendMemesForRoom<T extends { _source?: string }>(
  items: readonly T[],
  hasRoomSpecificSource: boolean
): T[] {
  if (hasRoomSpecificSource) return [...items]
  return items.filter(m => m._source !== 'sbhzm')
}

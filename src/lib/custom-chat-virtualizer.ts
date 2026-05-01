export interface VirtualRangeInput {
  itemCount: number
  scrollTop: number
  viewportHeight: number
  overscan: number
  rowHeight: (index: number) => number
}

export interface VirtualRange {
  start: number
  end: number
  top: number
  bottom: number
  total: number
}

function buildOffsets(itemCount: number, rowHeight: (index: number) => number): number[] {
  const offsets = new Array<number>(itemCount + 1)
  offsets[0] = 0
  for (let index = 0; index < itemCount; index++) offsets[index + 1] = offsets[index] + rowHeight(index)
  return offsets
}

function findFirstVisibleIndex(offsets: number[], scrollTop: number): number {
  let low = 0
  let high = offsets.length - 2

  while (low <= high) {
    const mid = Math.floor((low + high) / 2)
    if (offsets[mid + 1] < scrollTop) low = mid + 1
    else high = mid - 1
  }

  return low
}

function findRangeEndIndex(offsets: number[], viewportBottom: number, start: number): number {
  let low = start
  let high = offsets.length - 1

  while (low < high) {
    const mid = Math.floor((low + high) / 2)
    if (offsets[mid] < viewportBottom) low = mid + 1
    else high = mid
  }

  return low
}

export function calculateVirtualContentHeight(
  itemCount: number,
  rowHeight: (index: number) => number,
  end = itemCount
): number {
  let height = 0
  for (let index = 0; index < Math.min(end, itemCount); index++) height += rowHeight(index)
  return height
}

export function calculateVirtualRange(input: VirtualRangeInput): VirtualRange {
  const offsets = buildOffsets(input.itemCount, input.rowHeight)
  const total = offsets[input.itemCount] ?? 0
  if (input.itemCount === 0) return { start: 0, end: 0, top: 0, bottom: 0, total }

  const viewportBottom = input.scrollTop + Math.max(input.viewportHeight, 1)
  const visibleStart = findFirstVisibleIndex(offsets, input.scrollTop)
  const visibleEnd = findRangeEndIndex(offsets, viewportBottom, visibleStart)
  const start = Math.max(0, visibleStart - input.overscan)
  const end = Math.min(input.itemCount, visibleEnd + input.overscan)
  const top = offsets[start] ?? 0
  const bottom = offsets[end] ?? total
  return { start, end, top, bottom, total }
}

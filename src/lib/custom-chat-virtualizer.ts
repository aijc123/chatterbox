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
  const total = calculateVirtualContentHeight(input.itemCount, input.rowHeight)
  if (input.itemCount === 0) return { start: 0, end: 0, top: 0, bottom: 0, total }

  const viewportBottom = input.scrollTop + Math.max(input.viewportHeight, 1)
  let start = 0
  let top = 0
  while (start < input.itemCount && top + input.rowHeight(start) < input.scrollTop) {
    top += input.rowHeight(start)
    start++
  }
  start = Math.max(0, start - input.overscan)
  top = calculateVirtualContentHeight(input.itemCount, input.rowHeight, start)

  let end = start
  let bottom = top
  while (end < input.itemCount && bottom < viewportBottom) {
    bottom += input.rowHeight(end)
    end++
  }
  end = Math.min(input.itemCount, end + input.overscan)
  bottom = calculateVirtualContentHeight(input.itemCount, input.rowHeight, end)
  return { start, end, top, bottom, total }
}

import { describe, expect, test } from 'bun:test'

import { filterBackendMemesForRoom } from '../src/lib/meme-room-filter'

describe('filterBackendMemesForRoom', () => {
  test('strips backend LAPLACE mirror entries even in a room-specific source room', () => {
    // 后端 bulk-mirror 没按 roomId 分桶,LAPLACE 镜像是全局池;客户端只信任
    // 自己直拉当前房间的 LAPLACE,不要让后端的旧镜像污染当前房间结果。
    const items = [
      { id: 1, content: 'laplace', _source: 'laplace' },
      { id: 2, content: 'hzm', _source: 'sbhzm' },
      { id: 3, content: 'cb', _source: 'cb' },
    ]

    expect(filterBackendMemesForRoom(items, true)).toEqual([
      { id: 2, content: 'hzm', _source: 'sbhzm' },
      { id: 3, content: 'cb', _source: 'cb' },
    ])
  })

  test('removes both SBHZM and backend LAPLACE entries when the room has no specific source', () => {
    const items = [
      { id: 1, content: 'laplace', _source: 'laplace' },
      { id: 2, content: 'hzm', _source: 'sbhzm' },
      { id: 3, content: 'cb', _source: 'cb' },
      { id: 4, content: 'legacy' },
    ]

    expect(filterBackendMemesForRoom(items, false)).toEqual([
      { id: 3, content: 'cb', _source: 'cb' },
      { id: 4, content: 'legacy' },
    ])
  })
})

import { describe, expect, test } from 'bun:test'

import { filterBackendMemesForRoom } from '../src/lib/meme-room-filter'

describe('filterBackendMemesForRoom', () => {
  test('keeps SBHZM memes when the current room has a room-specific meme source', () => {
    const items = [
      { id: 1, content: 'laplace', _source: 'laplace' },
      { id: 2, content: 'hzm', _source: 'sbhzm' },
      { id: 3, content: 'cb', _source: 'cb' },
    ]

    expect(filterBackendMemesForRoom(items, true)).toEqual(items)
  })

  test('removes SBHZM memes when the current room has no room-specific meme source', () => {
    const items = [
      { id: 1, content: 'laplace', _source: 'laplace' },
      { id: 2, content: 'hzm', _source: 'sbhzm' },
      { id: 3, content: 'cb', _source: 'cb' },
      { id: 4, content: 'legacy' },
    ]

    expect(filterBackendMemesForRoom(items, false)).toEqual([
      { id: 1, content: 'laplace', _source: 'laplace' },
      { id: 3, content: 'cb', _source: 'cb' },
      { id: 4, content: 'legacy' },
    ])
  })
})

import { afterEach, describe, expect, test } from 'bun:test'

import {
  clearRecentCustomChatDanmakuHistory,
  emitCustomChatEvent,
  findRecentCustomChatDanmakuSource,
} from '../src/lib/custom-chat-events'

const realDateNow = Date.now

afterEach(() => {
  Date.now = realDateNow
  clearRecentCustomChatDanmakuHistory()
})

describe('custom chat danmaku history', () => {
  test('finds a recently emitted danmaku by source', () => {
    let now = 1_000
    Date.now = () => now

    emitCustomChatEvent({
      id: 'ws-1',
      kind: 'danmaku',
      text: '最方幻想',
      uname: 'alice',
      uid: '42',
      time: '11:19',
      isReply: false,
      source: 'ws',
      badges: [],
    })

    expect(findRecentCustomChatDanmakuSource('最方幻想', '42', 900)).toBe('ws')
    expect(findRecentCustomChatDanmakuSource('最方幻想', '24', 900)).toBeNull()

    now = 1_200
    expect(findRecentCustomChatDanmakuSource('最方幻想', '42', 1_100)).toBeNull()
  })

  test('ignores non-danmaku events and trims text', () => {
    Date.now = () => 2_000

    emitCustomChatEvent({
      id: 'gift-1',
      kind: 'gift',
      text: 'gift',
      uname: 'alice',
      uid: '42',
      time: '11:19',
      isReply: false,
      source: 'ws',
      badges: [],
    })

    emitCustomChatEvent({
      id: 'dom-1',
      kind: 'danmaku',
      text: '  最方幻想  ',
      uname: 'alice',
      uid: null,
      time: '11:19',
      isReply: false,
      source: 'dom',
      badges: [],
    })

    expect(findRecentCustomChatDanmakuSource('gift', '42', 1_900)).toBeNull()
    expect(findRecentCustomChatDanmakuSource('最方幻想', '42', 1_900)).toBe('dom')
  })
})

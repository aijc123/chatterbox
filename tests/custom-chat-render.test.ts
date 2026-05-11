import { describe, expect, test } from 'bun:test'

import type { CustomChatEvent } from '../src/lib/custom-chat-events'

import {
  CUSTOM_CHAT_MAX_MESSAGES,
  customChatBadgeType,
  customChatPriority,
  shouldSuppressCustomChatEvent,
  trimRenderQueue,
} from '../src/lib/custom-chat-render'

const baseEvent: CustomChatEvent = {
  id: '1',
  kind: 'danmaku',
  text: 'hello',
  uname: 'alice',
  uid: '42',
  time: '12:00',
  isReply: false,
  source: 'ws',
  badges: [],
}

describe('custom chat render classification', () => {
  test('suppresses enter events by default', () => {
    expect(shouldSuppressCustomChatEvent({ ...baseEvent, kind: 'enter', text: 'entered the room' })).toBe(true)
    expect(shouldSuppressCustomChatEvent({ ...baseEvent, kind: 'guard', text: 'opened captain' })).toBe(false)
  })

  test('keeps guard identity danmaku as identity instead of a critical card', () => {
    expect(customChatPriority({ ...baseEvent, badges: ['GUARD 3'] })).toBe('identity')
  })

  test('promotes paid and major events', () => {
    expect(customChatPriority({ ...baseEvent, kind: 'superchat' })).toBe('critical')
    expect(customChatPriority({ ...baseEvent, kind: 'guard' })).toBe('critical')
    expect(customChatPriority({ ...baseEvent, kind: 'gift' })).toBe('card')
  })

  test('classifies badge colors', () => {
    expect(customChatBadgeType('GUARD 3')).toBe('guard')
    expect(customChatBadgeType('UL 22')).toBe('ul')
    expect(customChatBadgeType('牌子 18')).toBe('medal')
    expect(customChatBadgeType('SC 30元')).toBe('price')
    expect(customChatBadgeType('0.1元')).toBe('price')
  })
})

describe('trimRenderQueue (perf regression: was while-shift loop)', () => {
  function makeEvents(n: number): CustomChatEvent[] {
    return Array.from({ length: n }, (_, i) => ({ ...baseEvent, id: String(i) }))
  }

  test('no-op when under cap', () => {
    const queue = makeEvents(10)
    trimRenderQueue(queue)
    expect(queue.length).toBe(10)
  })

  test('drops the oldest entries to leave exactly the cap', () => {
    const queue = makeEvents(CUSTOM_CHAT_MAX_MESSAGES + 25)
    const lastIdBefore = queue[queue.length - 1].id
    trimRenderQueue(queue)
    expect(queue.length).toBe(CUSTOM_CHAT_MAX_MESSAGES)
    // Newest item is preserved at the tail.
    expect(queue[queue.length - 1].id).toBe(lastIdBefore)
    // First item is now the (old length - cap)th original.
    expect(queue[0].id).toBe('25')
  })

  test('handles a queue exactly at the cap (boundary)', () => {
    const queue = makeEvents(CUSTOM_CHAT_MAX_MESSAGES)
    trimRenderQueue(queue)
    expect(queue.length).toBe(CUSTOM_CHAT_MAX_MESSAGES)
  })
})

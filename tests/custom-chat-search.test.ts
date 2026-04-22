import { describe, expect, test } from 'bun:test'

import type { CustomChatEvent } from '../src/lib/custom-chat-events'

import { customChatSearchHint, messageMatchesCustomChatSearch } from '../src/lib/custom-chat-search'

describe('custom chat search hints', () => {
  test('suggests a nearby kind value', () => {
    expect(customChatSearchHint('kind:gfit')).toContain('kind:gift')
  })

  test('reports unknown search filters', () => {
    const hint = customChatSearchHint('knd:gift')

    expect(hint).toContain('knd:')
    expect(hint).toContain('kind:')
  })

  test('does not warn for valid search filters', () => {
    expect(customChatSearchHint('user:alice kind:gift source:ws -text:spam')).toBe('')
  })
})

describe('custom chat search matching', () => {
  const visible = () => true
  const message: CustomChatEvent = {
    id: '1',
    kind: 'danmaku',
    text: 'hello',
    uname: 'alice',
    uid: '42',
    time: '12:00',
    isReply: true,
    source: 'ws',
    badges: [],
  }

  test('matches reply messages with is:reply', () => {
    expect(messageMatchesCustomChatSearch(message, 'is:reply', visible)).toBe(true)
    expect(messageMatchesCustomChatSearch({ ...message, isReply: false }, 'is:reply', visible)).toBe(false)
  })

  test('does not match unknown is filters', () => {
    expect(messageMatchesCustomChatSearch(message, 'is:anything', visible)).toBe(false)
  })
})

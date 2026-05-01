import { describe, expect, mock, test } from 'bun:test'

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

const { emitAutoBlendEvent, subscribeAutoBlendEvents } = await import('../src/lib/auto-blend-events')

describe('auto-blend events', () => {
  test('emits to subscribers and supports unsubscribe', () => {
    const seen: string[] = []
    const unsubscribe = subscribeAutoBlendEvents(event => {
      if (event.kind === 'log') seen.push(event.message)
    })

    emitAutoBlendEvent({ kind: 'log', message: 'first' })
    unsubscribe()
    emitAutoBlendEvent({ kind: 'log', message: 'second' })

    expect(seen).toEqual(['first'])
  })
})

import { beforeEach, describe, expect, mock, test } from 'bun:test'

const sent: string[] = []
let releaseFirstSend: (() => void) | null = null

const sendDanmaku = mock(async (message: string) => {
  sent.push(message)
  if (message === 'first-auto') {
    await new Promise<void>(resolve => {
      releaseFirstSend = resolve
    })
  }
  return { success: true, message, isEmoticon: false }
})

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

mock.module('../src/lib/api', () => ({ sendDanmaku }))

const { SendPriority, enqueueDanmaku, getQueueDepth } = await import('../src/lib/send-queue')

describe('send-queue', () => {
  beforeEach(() => {
    sent.length = 0
    releaseFirstSend = null
  })

  test('manual sends cancel queued automation and jump ahead', async () => {
    const first = enqueueDanmaku('first-auto', 1, 'csrf', SendPriority.AUTO)
    await Promise.resolve()

    const queuedAuto = enqueueDanmaku('queued-auto', 1, 'csrf', SendPriority.AUTO)
    const manual = enqueueDanmaku('manual', 1, 'csrf', SendPriority.MANUAL)

    await expect(queuedAuto).resolves.toMatchObject({
      success: false,
      cancelled: true,
      error: 'preempted',
    })
    expect(getQueueDepth()).toBe(1)

    releaseFirstSend?.()

    await expect(first).resolves.toMatchObject({ success: true, message: 'first-auto' })
    await expect(manual).resolves.toMatchObject({ success: true, message: 'manual' })
    expect(sent).toEqual(['first-auto', 'manual'])
  })

  test('manual sends cancel automation sleeping through the hard gap', async () => {
    await expect(enqueueDanmaku('warmup', 1, 'csrf', SendPriority.MANUAL)).resolves.toMatchObject({
      success: true,
      message: 'warmup',
    })

    const sleepingAuto = enqueueDanmaku('sleeping-auto', 1, 'csrf', SendPriority.AUTO)
    await Promise.resolve()
    const manual = enqueueDanmaku('manual-after-warmup', 1, 'csrf', SendPriority.MANUAL)

    await expect(sleepingAuto).resolves.toMatchObject({
      success: false,
      cancelled: true,
      error: 'preempted',
    })
    await expect(manual).resolves.toMatchObject({ success: true, message: 'manual-after-warmup' })
    expect(sent).toEqual(['warmup', 'manual-after-warmup'])
  })

  test('empty message resolves cancelled without consuming a rate-limit slot', async () => {
    const before = sent.length
    await expect(enqueueDanmaku('', 1, 'csrf', SendPriority.MANUAL)).resolves.toMatchObject({
      success: false,
      cancelled: true,
      error: 'empty-text',
    })
    expect(sent.length).toBe(before)
  })

  test('whitespace-only message resolves cancelled without sending', async () => {
    const before = sent.length
    await expect(enqueueDanmaku('   \n\t  ', 1, 'csrf', SendPriority.AUTO)).resolves.toMatchObject({
      success: false,
      cancelled: true,
      error: 'empty-text',
    })
    expect(sent.length).toBe(before)
  })
})

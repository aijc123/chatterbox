import type { SendDanmakuResult } from './api'

import { appendLog, type NotifyLevel, notifyUser } from './log'

export type AutoBlendEvent =
  | {
      kind: 'log'
      level?: NotifyLevel
      message: string
      detail?: string
    }
  | {
      kind: 'send-result'
      result: SendDanmakuResult
      label: string
      display: string
    }

const subscribers = new Set<(event: AutoBlendEvent) => void>()

export function emitAutoBlendEvent(event: AutoBlendEvent): void {
  for (const subscriber of subscribers) {
    subscriber(event)
  }
}

export function subscribeAutoBlendEvents(subscriber: (event: AutoBlendEvent) => void): () => void {
  subscribers.add(subscriber)
  return () => subscribers.delete(subscriber)
}

export function logAutoBlend(message: string, level?: NotifyLevel, detail?: string): void {
  emitAutoBlendEvent({ kind: 'log', level, message, detail })
}

export function logAutoBlendSendResult(result: SendDanmakuResult, label: string, display: string): void {
  emitAutoBlendEvent({ kind: 'send-result', result, label, display })
}

subscribeAutoBlendEvents(event => {
  if (event.kind === 'send-result') {
    appendLog(event.result, event.label, event.display)
    return
  }

  if (event.level) {
    notifyUser(event.level, event.message, event.detail)
    return
  }

  appendLog(event.detail ? `${event.message}：${event.detail}` : event.message)
})

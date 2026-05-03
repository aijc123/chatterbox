import { signal } from '@preact/signals'

import { gmSignal, numericGmSignal } from './gm-signal'

export const msgSendInterval = numericGmSignal('msgSendInterval', 1, { min: 0.1, max: 600 })
export const maxLength = numericGmSignal('maxLength', 38, { min: 1, max: 100, integer: true })
export const randomColor = gmSignal('randomColor', false)
export const randomInterval = gmSignal('randomInterval', false)
export const randomChar = gmSignal('randomChar', false)
export const aiEvasion = gmSignal('aiEvasion', false)
export const msgTemplates = gmSignal<string[]>('MsgTemplates', [])
export const activeTemplateIndex = numericGmSignal('activeTemplateIndex', 0, { min: 0, max: 999, integer: true })
export const persistSendState = gmSignal<Record<string, boolean>>('persistSendState', {})

export const sendMsg = signal(false)
export const availableDanmakuColors = signal<string[] | null>(null)

// Fasong tab shared text
export const fasongText = signal('')

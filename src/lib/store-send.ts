import { signal } from '@preact/signals'

import { gmSignal } from './gm-signal'

export const msgSendInterval = gmSignal('msgSendInterval', 1)
export const maxLength = gmSignal('maxLength', 38)
export const randomColor = gmSignal('randomColor', false)
export const randomInterval = gmSignal('randomInterval', false)
export const randomChar = gmSignal('randomChar', false)
export const aiEvasion = gmSignal('aiEvasion', false)
export const msgTemplates = gmSignal<string[]>('MsgTemplates', [])
export const activeTemplateIndex = gmSignal('activeTemplateIndex', 0)
export const persistSendState = gmSignal<Record<string, boolean>>('persistSendState', {})

export const sendMsg = signal(false)
export const availableDanmakuColors = signal<string[] | null>(null)

// Fasong tab shared text
export const fasongText = signal('')

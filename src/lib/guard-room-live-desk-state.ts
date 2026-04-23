import { signal } from '@preact/signals'

import { gmSignal } from './gm-signal'

export const guardRoomLiveDeskSessionId = gmSignal('guardRoomLiveDeskSessionId', '')
export const guardRoomLiveDeskHeartbeatSec = gmSignal('guardRoomLiveDeskHeartbeatSec', 30)
export const guardRoomCurrentRiskLevel = signal<'stop' | 'observe' | 'pass'>('pass')

import { signal } from '@preact/signals'

import { gmSignal } from './gm-signal'

export const guardRoomEndpoint = gmSignal('guardRoomEndpoint', 'https://bilibili-guard-room.vercel.app')
export const guardRoomSyncKey = gmSignal('guardRoomSyncKey', '')
export const guardRoomWebsiteControlEnabled = gmSignal('guardRoomWebsiteControlEnabled', false)

export const guardRoomHandoffActive = signal(false)

// Unit tests for the STT microphone-selection port (sonioxAudioDeviceId).
//
// The behavior under test is the start-time validation: if the user's saved
// deviceId no longer matches any live MediaDeviceInfo (e.g. mic was unplugged
// since they last picked it), we fall back to system default AND clear the
// persisted id so the UI reflects the change.
//
// The full SttTab component is hard to unit-test (it imports SonioxClient
// which pulls in Web SDK side effects), so we extract and exercise the
// validation predicate as a pure function. The actual wire-up in
// stt-tab.tsx uses the same boolean expression — see line 193:
//   const deviceStillAvailable = !savedDeviceId
//     || audioDevices.value.some(d => d.deviceId === savedDeviceId)

import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test'

import { installGmStoreMock } from './_gm-store'

const { reset: resetGmStore } = installGmStoreMock()

mock.module('$', () => ({
  GM_deleteValue: () => {},
  GM_getValue: <T>(_key: string, defaultValue: T): T => defaultValue,
  GM_info: { script: { version: 'test' } },
  GM_setValue: () => {},
}))

const { sonioxAudioDeviceId } = await import('../src/lib/store-stt')

interface DeviceLite {
  deviceId: string
  label?: string
}

/**
 * Mirror of the validation in src/components/stt-tab.tsx:
 *
 *   const deviceStillAvailable =
 *     !savedDeviceId || audioDevices.value.some(d => d.deviceId === savedDeviceId)
 *
 * Extracted so we can exercise the truth table without booting the
 * Soniox SDK / happy-dom.
 */
function isDeviceStillAvailable(savedDeviceId: string, devices: DeviceLite[]): boolean {
  return !savedDeviceId || devices.some(d => d.deviceId === savedDeviceId)
}

/**
 * Mirror of the post-validation effect: when device is missing, clear the
 * stored id so the UI dropdown re-renders to "系统默认".
 */
function applyDeviceFallback(): string {
  const savedDeviceId = sonioxAudioDeviceId.value
  // Synthesize "no devices" as the worst case.
  const deviceStillAvailable = isDeviceStillAvailable(savedDeviceId, [])
  if (savedDeviceId && !deviceStillAvailable) {
    sonioxAudioDeviceId.value = ''
  }
  return deviceStillAvailable ? savedDeviceId : ''
}

describe('isDeviceStillAvailable (stt mic validation)', () => {
  test('returns true when no saved id (system default)', () => {
    expect(isDeviceStillAvailable('', [])).toBe(true)
    expect(isDeviceStillAvailable('', [{ deviceId: 'mic-a' }])).toBe(true)
  })

  test('returns true when saved id matches a live device', () => {
    expect(isDeviceStillAvailable('mic-a', [{ deviceId: 'mic-a' }])).toBe(true)
  })

  test('returns true when saved id matches one of several live devices', () => {
    expect(isDeviceStillAvailable('mic-b', [{ deviceId: 'mic-a' }, { deviceId: 'mic-b' }, { deviceId: 'mic-c' }])).toBe(
      true
    )
  })

  test('returns false when saved id is gone (mic unplugged)', () => {
    expect(isDeviceStillAvailable('mic-stale', [{ deviceId: 'mic-a' }])).toBe(false)
  })

  test('returns false when no devices are enumerated at all', () => {
    expect(isDeviceStillAvailable('mic-stale', [])).toBe(false)
  })
})

describe('applyDeviceFallback (sonioxAudioDeviceId persistence)', () => {
  beforeEach(() => {
    resetGmStore()
    sonioxAudioDeviceId.value = ''
  })

  afterEach(() => {
    sonioxAudioDeviceId.value = ''
  })

  test('returns empty (default) when no id was saved', () => {
    expect(applyDeviceFallback()).toBe('')
    expect(sonioxAudioDeviceId.value).toBe('')
  })

  test('clears the persisted id and returns empty when device is gone', () => {
    sonioxAudioDeviceId.value = 'mic-stale'
    const result = applyDeviceFallback()
    expect(result).toBe('')
    // The persisted value gets reset so subsequent UI renders show
    // "系统默认" instead of a phantom selection.
    expect(sonioxAudioDeviceId.value).toBe('')
  })
})

describe('sonioxAudioDeviceId default', () => {
  beforeEach(() => {
    resetGmStore()
  })

  test('defaults to empty string (= system default)', () => {
    // 默认值不应该是任意 deviceId,否则首次启动就会 deviceStillAvailable=false
    // 而被立刻重置——多此一举。
    expect(sonioxAudioDeviceId.value).toBe('')
  })

  test('writable and readable via the GM-backed signal', () => {
    sonioxAudioDeviceId.value = 'mic-a'
    expect(sonioxAudioDeviceId.value).toBe('mic-a')
    sonioxAudioDeviceId.value = ''
    expect(sonioxAudioDeviceId.value).toBe('')
  })
})

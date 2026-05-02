import { describe, expect, test } from 'bun:test'

import { shouldShowVersionUpdateBadge } from '../src/lib/version-update'

describe('shouldShowVersionUpdateBadge', () => {
  test('first-time users (no recorded last seen) do not get an updated badge', () => {
    expect(shouldShowVersionUpdateBadge('', '2.8.58')).toBe(false)
  })

  test('returning users on the same version do not get a badge', () => {
    expect(shouldShowVersionUpdateBadge('2.8.58', '2.8.58')).toBe(false)
  })

  test('returning users on an older version see the badge', () => {
    expect(shouldShowVersionUpdateBadge('2.8.57', '2.8.58')).toBe(true)
  })

  test('returning users on a newer recorded version (rare downgrade) also see badge', () => {
    // We treat any mismatch as "something changed since you last looked".
    expect(shouldShowVersionUpdateBadge('2.9.0', '2.8.58')).toBe(true)
  })
})

import { describe, expect, test } from 'bun:test'

import {
  assertSemver,
  buildUserscriptUrl,
  bumpVersion,
  compareSemver,
  extractCurrentReleaseBullets,
  findMostRecentVersionedHeading,
  findVersionedHeadings,
  parseUserscriptMetadata,
  replaceOrInsertVersionSection,
} from '../scripts/lib/release-checks.ts'

describe('assertSemver', () => {
  test('accepts valid versions', () => {
    expect(() => assertSemver('1.0.0')).not.toThrow()
    expect(() => assertSemver('100.200.300')).not.toThrow()
  })

  test('rejects invalid versions', () => {
    expect(() => assertSemver('1.0')).toThrow()
    expect(() => assertSemver('v1.0.0')).toThrow()
    expect(() => assertSemver('1.0.0-beta')).toThrow()
    expect(() => assertSemver('1.0.0.0')).toThrow()
  })
})

describe('bumpVersion', () => {
  test('bumps patch', () => {
    expect(bumpVersion('1.2.3', 'patch')).toBe('1.2.4')
  })

  test('bumps minor and resets patch', () => {
    expect(bumpVersion('1.2.3', 'minor')).toBe('1.3.0')
  })

  test('bumps major and resets minor and patch', () => {
    expect(bumpVersion('1.2.3', 'major')).toBe('2.0.0')
  })
})

describe('compareSemver', () => {
  test('returns negative when a < b', () => {
    expect(compareSemver('1.2.3', '1.2.4')).toBeLessThan(0)
    expect(compareSemver('1.2.3', '2.0.0')).toBeLessThan(0)
    expect(compareSemver('1.9.9', '1.10.0')).toBeLessThan(0)
  })

  test('returns zero when a == b', () => {
    expect(compareSemver('1.2.3', '1.2.3')).toBe(0)
  })

  test('returns positive when a > b', () => {
    expect(compareSemver('1.2.4', '1.2.3')).toBeGreaterThan(0)
    expect(compareSemver('2.0.0', '1.99.99')).toBeGreaterThan(0)
  })
})

describe('extractCurrentReleaseBullets', () => {
  const sample = `# Greasy Fork Release Notes

## Greasy Fork 脚本简介

intro text

## 当前发布说明

- bullet one
- bullet two

## 1.0.0

- old bullet
`

  test('extracts bullets under the current heading', () => {
    const out = extractCurrentReleaseBullets(sample)
    expect(out).toContain('- bullet one')
    expect(out).toContain('- bullet two')
    expect(out).not.toContain('old bullet')
  })

  test('throws when the section is missing', () => {
    expect(() => extractCurrentReleaseBullets('# Empty\n\n## 1.0.0\n\n- foo\n')).toThrow()
  })

  test('throws when bullets are missing', () => {
    expect(() => extractCurrentReleaseBullets('## 当前发布说明\n\n\n## 1.0.0\n\n- foo\n')).toThrow()
  })
})

describe('findVersionedHeadings', () => {
  test('returns headings in document order', () => {
    const sample = '## 当前发布说明\n\n- a\n\n## 2.8.57\n\n- b\n## 2.8.56\n\n- c\n'
    expect(findVersionedHeadings(sample)).toEqual(['2.8.57', '2.8.56'])
  })

  test('skips non-semver headings', () => {
    const sample = '## TBD\n\n- a\n\n## 1.2.3\n\n- b\n'
    expect(findVersionedHeadings(sample)).toEqual(['1.2.3'])
  })
})

describe('findMostRecentVersionedHeading', () => {
  test('returns the first ## X.Y.Z heading', () => {
    const sample = '## 当前发布说明\n\n- a\n\n## 2.8.57\n\n- b\n## 2.8.56\n\n- c\n'
    expect(findMostRecentVersionedHeading(sample)).toBe('2.8.57')
  })

  test('returns undefined when none', () => {
    expect(findMostRecentVersionedHeading('# Heading\n\nNothing here.')).toBeUndefined()
  })
})

describe('replaceOrInsertVersionSection', () => {
  const initial = `## 当前发布说明

- bullet one

## 1.0.0

- old bullet
`

  test('inserts a new versioned section after the current section', () => {
    const out = replaceOrInsertVersionSection(initial, '1.0.1', '- bullet one')
    expect(out).toContain('## 当前发布说明\n\n- bullet one')
    expect(out).toContain('## 1.0.1\n\n- bullet one')
    expect(out).toContain('## 1.0.0\n\n- old bullet')
  })

  test('replaces an existing matching version section', () => {
    const withDup = `## 当前发布说明

- new bullet

## 1.0.1

- stale bullet

## 1.0.0

- old bullet
`
    const out = replaceOrInsertVersionSection(withDup, '1.0.1', '- new bullet')
    expect(out).toContain('## 1.0.1\n\n- new bullet')
    expect(out).not.toContain('stale bullet')
  })
})

describe('buildUserscriptUrl', () => {
  test('builds URL from repository.url', () => {
    const url = buildUserscriptUrl({
      name: 'my-script',
      version: '1.0.0',
      repository: { url: 'https://github.com/owner/repo.git' },
    })
    expect(url).toBe('https://owner.github.io/repo/my-script.user.js')
  })

  test('falls back to homepage when repository missing', () => {
    const url = buildUserscriptUrl({
      name: 'my-script',
      version: '1.0.0',
      homepage: 'https://github.com/owner/repo',
    })
    expect(url).toBe('https://owner.github.io/repo/my-script.user.js')
  })

  test('throws when neither homepage nor repository points at GitHub', () => {
    expect(() => buildUserscriptUrl({ name: 'x', version: '1.0.0' })).toThrow()
    expect(() => buildUserscriptUrl({ name: 'x', version: '1.0.0', homepage: 'https://example.com' })).toThrow()
  })
})

describe('parseUserscriptMetadata', () => {
  const sample = `// ==UserScript==
// @name         My Script
// @namespace    https://example.com
// @version      2.8.57
// @match        *://example.com/*
// @match        *://example.org/*
// @run-at       document-start
// ==/UserScript==

console.log('hi')
`

  test('parses single-value fields', () => {
    const meta = parseUserscriptMetadata(sample)
    expect(meta.fields.get('name')?.[0]).toBe('My Script')
    expect(meta.fields.get('version')?.[0]).toBe('2.8.57')
    expect(meta.fields.get('namespace')?.[0]).toBe('https://example.com')
  })

  test('preserves multiple @match values', () => {
    const meta = parseUserscriptMetadata(sample)
    expect(meta.fields.get('match')).toEqual(['*://example.com/*', '*://example.org/*'])
  })

  test('handles hyphenated field names', () => {
    const meta = parseUserscriptMetadata(sample)
    expect(meta.fields.get('run-at')?.[0]).toBe('document-start')
  })

  test('throws when block is missing', () => {
    expect(() => parseUserscriptMetadata('console.log("no metadata")')).toThrow()
  })
})

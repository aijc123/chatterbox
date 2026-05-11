#!/usr/bin/env bun
/**
 * Guard: every `bun test` invocation that runs in this repo MUST include
 * `--isolate`. If `--isolate` is dropped, `mock.module(...)` calls leak across
 * test files in the same bun process — silently producing wrong test results
 * (not failures), which is the worst kind of CI regression.
 *
 * Background: `tests/danmaku-actions-branches.test.ts`, `auto-blend-*`, and
 * about 25 other test files use the `...real` spread + `mock.module(...)`
 * pattern to stub internal collaborators. With `--isolate` the bun runner
 * tears down each file's module registry between files, so these stubs don't
 * leak. Without `--isolate`, ~35 tests across 6 representative files turn
 * from pass → fail or pass → "wrong result, still pass". Verified empirically.
 *
 * See also: project memory `feedback_bun_test_mocks.md`, CLAUDE.md "Do NOT
 * run bare `bun test` from the repo root".
 *
 * This script scans all known places that invoke `bun test` and asserts
 * `--isolate` is present. Adding a new test invocation site → add it here.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { projectRoot } from './lib/release-checks.ts'

interface ScanTarget {
  /** Path relative to project root. */
  path: string
  /** Substrings that should each appear at least once in the file. Each
   *  entry expresses one assertion. */
  required: string[]
  /** Optional: substrings whose presence ALSO requires `--isolate` on the
   *  same conceptual command. Used for things like "if you see `bun test`
   *  near this line, it must be paired with --isolate". */
  forbidPattern?: RegExp
  /** Human-readable hint shown when a check fails. */
  hint: string
}

const targets: ScanTarget[] = [
  {
    path: 'package.json',
    required: ['"test": "bun test --isolate', '"test:client": "bun test --isolate', '"test:fuzz": "bun test --isolate'],
    hint: 'package.json `test`, `test:client`, and `test:fuzz` scripts must each include `--isolate` between `bun test` and the test dir. Re-add it before merging.',
  },
  {
    path: 'scripts/release-check.ts',
    required: ["'bun', 'test', '--isolate'"],
    hint: "scripts/release-check.ts must call `bun test --isolate ...` — the release gate is the only thing that catches a regressed package.json on tag-day. Re-add `'--isolate'` to the `run([...])` array.",
  },
  {
    path: '.github/workflows/coverage.yml',
    required: ['bun test --coverage --coverage-reporter=lcov --isolate tests'],
    hint: '.github/workflows/coverage.yml must run `bun test --coverage ... --isolate tests` so the coverage upload reflects the same isolation as the gate.',
  },
]

/**
 * General forbid-pattern: any line in any tracked source/workflow/script that
 * contains `bun test` and the same physical line does NOT contain `--isolate`
 * is flagged. (We exclude `scripts/check-test-isolate.ts` itself and a couple
 * of doc-style files because they discuss the topic without actually invoking
 * the command.)
 */
const lineForbidPattern = /\bbun\s+test\b/
const lineAllowMarker = '--isolate'
const forbidScanPaths = [
  'package.json',
  'scripts/release-check.ts',
  '.github/workflows/coverage.yml',
  '.github/workflows/mutation.yml',
  '.github/workflows/ci.yml',
]

const lineExceptionMarkers = [
  // Comments in scripts and CLAUDE.md explicitly discuss `bun test` without
  // invoking it — those are fine. The patterns below are matched against the
  // line after trimming leading whitespace; if the trimmed line *starts with*
  // any of these markers, the `bun test` mention is ignored.
  '# ', // YAML / shell comment
  '// ', // JS / TS comment
  '* ', // JSDoc continuation
  '- name:', // YAML step name (e.g. mutation.yml has a step named after the cmd it invokes)
  'name:', // YAML workflow/job name
  '"description"', // package.json description field
]

interface Failure {
  path: string
  reason: string
  hint?: string
}

const failures: Failure[] = []

function read(relative: string): string | null {
  try {
    return readFileSync(join(projectRoot, relative), 'utf8')
  } catch {
    return null
  }
}

// Substring assertions.
for (const t of targets) {
  const content = read(t.path)
  if (content === null) {
    failures.push({
      path: t.path,
      reason: 'file missing — this script expects it to exist as a known test invocation site',
    })
    continue
  }
  for (const needle of t.required) {
    if (!content.includes(needle)) {
      failures.push({ path: t.path, reason: `required substring missing: \`${needle}\``, hint: t.hint })
    }
  }
}

// Per-line `bun test` ↔ `--isolate` co-occurrence check across all known
// invocation files. Catches a sneaky regression where someone moves
// `--isolate` to a separate line or deletes it from a less-obvious script.
for (const relative of forbidScanPaths) {
  const content = read(relative)
  if (content === null) continue
  const lines = content.split(/\r?\n/)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!lineForbidPattern.test(line)) continue
    if (line.includes(lineAllowMarker)) continue
    if (lineExceptionMarkers.some(marker => line.trimStart().startsWith(marker.trimStart()))) continue
    failures.push({
      path: `${relative}:${i + 1}`,
      reason: `\`bun test\` invocation without \`--isolate\` on the same line: \`${line.trim()}\``,
      hint: 'Either add `--isolate` to this command, or — if this is a doc/comment mention — start the line with a comment marker so the scanner skips it.',
    })
  }
}

if (failures.length === 0) {
  console.log('✓ check-test-isolate: every `bun test` invocation includes `--isolate`')
  process.exit(0)
}

console.error('✗ check-test-isolate: --isolate guard tripped\n')
for (const f of failures) {
  console.error(`  • ${f.path}`)
  console.error(`      ${f.reason}`)
  if (f.hint) console.error(`      hint: ${f.hint}`)
}
console.error(
  '\nWhy this matters: `mock.module(...)` leaks across files in the same bun process when `--isolate` is dropped.'
)
console.error('  See: project memory `feedback_bun_test_mocks.md` and CLAUDE.md.')
process.exit(1)

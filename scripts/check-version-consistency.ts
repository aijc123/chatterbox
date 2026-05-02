import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  assertSemver,
  compareSemver,
  distArtifactUrl,
  extractCurrentReleaseBullets,
  findMostRecentVersionedHeading,
  parseUserscriptMetadata,
  readPackageJson,
  readReleaseNotes,
} from './lib/release-checks.ts'

type Mode = 'pre' | 'post'

interface CliOptions {
  mode: Mode
  expectedTag?: string
}

function printHelp(): void {
  console.log(
    'Usage: bun scripts/check-version-consistency.ts [--mode pre|post] [--expected-tag vX.Y.Z]\n' +
      '\n' +
      '  --mode pre    (default) require non-empty current notes; permissive on heading vs package.json\n' +
      '  --mode post   require top heading to equal package.json version (post-release state)\n' +
      '  --expected-tag <tag>  assert tag (e.g. v2.8.57) matches package.json version'
  )
}

function parseArgs(argv: string[]): CliOptions {
  let mode: Mode = 'pre'
  let expectedTag: string | undefined
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--mode') {
      const next = argv[i + 1]
      if (next !== 'pre' && next !== 'post') {
        throw new Error(`--mode must be "pre" or "post" (got "${next}")`)
      }
      mode = next
      i += 1
      continue
    }
    if (arg === '--expected-tag') {
      expectedTag = argv[i + 1]
      i += 1
      continue
    }
    if (arg === '--help' || arg === '-h') {
      printHelp()
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }
  return { mode, expectedTag }
}

async function main(): Promise<void> {
  const { mode, expectedTag } = parseArgs(Bun.argv.slice(2))
  const pkg = await readPackageJson()
  assertSemver(pkg.version)
  console.log(`Package version: ${pkg.version}`)

  const notes = await readReleaseNotes()
  const bullets = extractCurrentReleaseBullets(notes)
  const bulletCount = bullets.split('\n').filter(line => line.startsWith('- ')).length
  if (bulletCount === 0) {
    throw new Error('Current release notes block has no bullet entries')
  }
  console.log(`Current notes bullets: ${bulletCount}`)

  const topHeading = findMostRecentVersionedHeading(notes)
  if (!topHeading) {
    throw new Error('No versioned `## X.Y.Z` heading found in GREASYFORK_RELEASE_NOTES.md')
  }
  console.log(`Top versioned heading: ${topHeading}`)

  if (mode === 'post' && topHeading !== pkg.version) {
    throw new Error(`[post-release] Top heading (${topHeading}) must equal package.json version (${pkg.version})`)
  }
  if (mode === 'pre') {
    const cmp = compareSemver(topHeading, pkg.version)
    if (cmp < 0) {
      console.log(
        `Note: top heading (${topHeading}) is older than package.json (${pkg.version}); release.ts will add the new section on next release.`
      )
    } else if (cmp > 0) {
      console.log(
        `Note: top heading (${topHeading}) is ahead of package.json (${pkg.version}); next release should bump to at least ${topHeading}.`
      )
    }
  }

  if (expectedTag) {
    const expected = `v${pkg.version}`
    if (expectedTag !== expected) {
      throw new Error(`Tag mismatch: expected ${expected} (from package.json), got ${expectedTag}`)
    }
    console.log(`Tag matches package.json: ${expectedTag}`)
  }

  const artifactPath = fileURLToPath(distArtifactUrl)
  if (existsSync(artifactPath)) {
    const content = await Bun.file(distArtifactUrl).text()
    const metadata = parseUserscriptMetadata(content)
    const artifactVersion = metadata.fields.get('version')?.[0]
    if (artifactVersion !== pkg.version) {
      throw new Error(
        `Built artifact @version (${artifactVersion}) does not match package.json (${pkg.version}) — rebuild required`
      )
    }
    console.log(`Built artifact @version: ${artifactVersion}`)
  }

  console.log('✓ Version consistency OK')
}

await main()

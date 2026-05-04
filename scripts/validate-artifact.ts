import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import {
  compileSmokeTest,
  distArtifactUrl,
  distMetaUrl,
  extractUserscriptBody,
  parseUserscriptMetadata,
  projectRoot,
  readPackageJson,
  run,
} from './lib/release-checks.ts'

interface CliOptions {
  skipBundleAnalysis: boolean
}

function parseArgs(argv: string[]): CliOptions {
  let skipBundleAnalysis = false
  for (const arg of argv) {
    if (arg === '--no-bundle-analysis') {
      skipBundleAnalysis = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: bun scripts/validate-artifact.ts [--no-bundle-analysis]\n' +
          '  Validates that dist/*.user.js is a complete Tampermonkey artifact\n' +
          '  whose @version matches package.json. By default also runs analyze:bundle.'
      )
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }
  return { skipBundleAnalysis }
}

async function main(): Promise<void> {
  const { skipBundleAnalysis } = parseArgs(Bun.argv.slice(2))
  const artifactPath = fileURLToPath(distArtifactUrl)
  const metaPath = fileURLToPath(distMetaUrl)

  if (!existsSync(artifactPath)) {
    throw new Error(`Built userscript not found at ${artifactPath} — run \`bun run build\` first`)
  }
  const artifactFile = Bun.file(distArtifactUrl)
  const size = artifactFile.size
  if (size === 0) {
    throw new Error(`Built userscript at ${artifactPath} is empty`)
  }

  const content = await artifactFile.text()
  const metadata = parseUserscriptMetadata(content)

  const pkg = await readPackageJson()

  const required: Array<{ field: string; description: string }> = [
    { field: 'name', description: '@name (script display name)' },
    { field: 'namespace', description: '@namespace' },
    { field: 'version', description: '@version' },
  ]
  for (const { field, description } of required) {
    if (!metadata.fields.has(field)) {
      throw new Error(`Userscript metadata is missing ${description}`)
    }
  }

  const versionField = metadata.fields.get('version')?.[0]
  if (versionField !== pkg.version) {
    throw new Error(`Userscript @version is "${versionField}" but package.json version is "${pkg.version}"`)
  }

  const matches = metadata.fields.get('match') ?? []
  const includes = metadata.fields.get('include') ?? []
  if (matches.length === 0 && includes.length === 0) {
    throw new Error('Userscript metadata is missing both @match and @include')
  }

  if (!existsSync(metaPath)) {
    throw new Error(
      `Userscript meta file not found at ${metaPath} — vite-plugin-monkey metaFileName setting must produce it`
    )
  }

  // Smoke test: the bundled JS body must at least parse. A malformed bundle
  // would otherwise pass header validation but fail inside Tampermonkey when
  // a real user installs it.
  const body = extractUserscriptBody(content)
  compileSmokeTest(body, 'Built userscript body')

  console.log(`✓ Artifact: ${artifactPath}`)
  console.log(`  size: ${(size / 1024).toFixed(2)} kB`)
  console.log(`  @version: ${versionField} (matches package.json)`)
  console.log(`  @name: ${metadata.fields.get('name')?.[0]}`)
  console.log(`  @namespace: ${metadata.fields.get('namespace')?.[0]}`)
  console.log(`  @match: ${matches.length > 0 ? matches.join(', ') : '(via @include)'}`)
  console.log(`  meta.js: ${metaPath}`)
  console.log('  body: parses as JavaScript (smoke test passed)')

  if (!skipBundleAnalysis) {
    console.log('Running bundle size budget check')
    run(['node', 'scripts/analyze-bundle.mjs'], { cwd: projectRoot })
  }
}

await main()

import { unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  assertSemver,
  buildUserscriptUrl,
  bumpVersion,
  extractCurrentReleaseBullets,
  type PackageJson,
  packageJsonUrl,
  type ReleaseKind,
  releaseNotesUrl,
  replaceOrInsertVersionSection,
  run,
  waitForUserscriptVersion,
} from './lib/release-checks.ts'

const workflowFile = 'release.yml'
const runDiscoveryTimeoutMs = 30_000

interface CliArgs {
  kind: ReleaseKind
  nextVersion?: string
}

function parseArgs(argv: string[]): CliArgs {
  let kind: ReleaseKind = 'patch'
  let nextVersion: string | undefined

  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index]
    if (arg === 'patch' || arg === 'minor' || arg === 'major') {
      kind = arg
      continue
    }
    if (arg === '--version') {
      nextVersion = argv[index + 1]
      index += 1
      continue
    }
    throw new Error(`Unknown argument: ${arg}`)
  }

  if (nextVersion) assertSemver(nextVersion)
  return { kind, nextVersion }
}

interface WorkflowRunSummary {
  databaseId: number
  status: string
  headSha: string
}

function findReleaseRunId(commitSha: string): string {
  const deadline = Date.now() + runDiscoveryTimeoutMs
  while (Date.now() < deadline) {
    const result = run(
      [
        'gh',
        'run',
        'list',
        '--workflow',
        workflowFile,
        '--commit',
        commitSha,
        '--json',
        'databaseId,status,headSha',
        '--limit',
        '5',
      ],
      { quiet: true }
    )
    try {
      const runs = JSON.parse(result.stdout) as WorkflowRunSummary[]
      const match = runs.find(r => r.headSha === commitSha)
      if (match) return String(match.databaseId)
    } catch {
      // GitHub may take a moment to register the run; keep polling.
    }
    Bun.sleepSync(3000)
  }
  throw new Error(`No ${workflowFile} run found for commit ${commitSha} within ${runDiscoveryTimeoutMs / 1000}s`)
}

async function main(): Promise<void> {
  const { kind, nextVersion: explicitVersion } = parseArgs(Bun.argv.slice(2))
  const packageJsonText = await Bun.file(packageJsonUrl).text()
  const packageJson = JSON.parse(packageJsonText) as PackageJson
  assertSemver(packageJson.version)

  const nextVersion = explicitVersion ?? bumpVersion(packageJson.version, kind)
  const tagName = `v${nextVersion}`

  if (packageJson.version === nextVersion) {
    throw new Error(`Version is already ${nextVersion}`)
  }

  const branch = run(['git', 'branch', '--show-current'], { quiet: true }).stdout
  if (branch !== 'master') {
    throw new Error(`Releases must run from master. Current branch: ${branch || '(detached HEAD)'}`)
  }

  const localTagExists =
    run(['git', 'rev-parse', '-q', '--verify', `refs/tags/${tagName}`], {
      check: false,
      quiet: true,
    }).exitCode === 0
  if (localTagExists) {
    throw new Error(`Tag ${tagName} already exists locally`)
  }

  const remoteTagExists =
    run(['git', 'ls-remote', '--tags', 'origin', tagName], {
      check: false,
      quiet: true,
    }).stdout.length > 0
  if (remoteTagExists) {
    throw new Error(`Tag ${tagName} already exists on origin`)
  }

  console.log('Running release:check (mirrors CI gates)')
  run(['bun', 'run', 'release:check'])

  const releaseNotesContent = await Bun.file(releaseNotesUrl).text()
  const bullets = extractCurrentReleaseBullets(releaseNotesContent)
  const updatedReleaseNotes = replaceOrInsertVersionSection(releaseNotesContent, nextVersion, bullets)
  const updatedPackageJson = packageJsonText.replace(/"version": "\d+\.\d+\.\d+"/, `"version": "${nextVersion}"`)

  await Bun.write(packageJsonUrl, updatedPackageJson)
  await Bun.write(releaseNotesUrl, updatedReleaseNotes)

  console.log(`Preparing release ${nextVersion}`)
  run(['bun', 'run', 'build'])

  run(['git', 'add', '-A'])
  const stagedFiles = run(['git', 'diff', '--cached', '--name-only'], { quiet: true }).stdout
  if (!stagedFiles) {
    throw new Error('Nothing to commit after preparing the release')
  }

  run(['git', 'commit', '-m', `Release ${nextVersion}`])
  const releaseSha = run(['git', 'rev-parse', 'HEAD'], { quiet: true }).stdout
  run(['git', 'tag', tagName])
  run(['git', 'push', 'origin', 'master'])
  run(['git', 'push', 'origin', tagName])

  const tempNotesPath = join(tmpdir(), `bilibili-live-wheel-auto-follow-${tagName}.md`)
  await Bun.write(tempNotesPath, bullets)
  try {
    const releaseExists =
      run(['gh', 'release', 'view', tagName], {
        check: false,
        quiet: true,
      }).exitCode === 0
    if (releaseExists) {
      run(['gh', 'release', 'edit', tagName, '--title', tagName, '--notes-file', tempNotesPath, '--latest'])
    } else {
      run(['gh', 'release', 'create', tagName, '--title', tagName, '--notes-file', tempNotesPath, '--latest'])
    }
  } finally {
    await unlink(tempNotesPath).catch(() => {})
  }

  console.log(`Locating ${workflowFile} run for ${releaseSha}`)
  const workflowRunId = findReleaseRunId(releaseSha)
  console.log(`Waiting for Pages deploy run ${workflowRunId}`)
  run(['gh', 'run', 'watch', workflowRunId, '--exit-status'], { quiet: true })

  const runSummary = JSON.parse(
    run(['gh', 'run', 'view', workflowRunId, '--json', 'status,conclusion,headSha,url,updatedAt'], { quiet: true })
      .stdout
  ) as {
    conclusion: string
    headSha: string
    status: string
    updatedAt: string
    url: string
  }
  if (runSummary.headSha !== releaseSha) {
    throw new Error(`Workflow ${workflowRunId} deployed ${runSummary.headSha}, expected ${releaseSha}`)
  }
  console.log(`Pages deploy: ${runSummary.url}`)
  console.log(`Pages deploy updated at: ${runSummary.updatedAt}`)

  const userscriptUrl = buildUserscriptUrl(packageJson)
  console.log(`Waiting for ${userscriptUrl} to publish ${nextVersion}`)
  await waitForUserscriptVersion(userscriptUrl, nextVersion)

  console.log(`Release ${nextVersion} is live`)
  console.log(`Commit: ${releaseSha}`)
  console.log(`Tag: ${tagName}`)
  console.log(`Userscript: ${userscriptUrl}`)
  if (packageJson.greasyfork?.scriptId) {
    console.log(`Greasy Fork: https://greasyfork.org/scripts/${packageJson.greasyfork.scriptId}`)
  }
}

await main()

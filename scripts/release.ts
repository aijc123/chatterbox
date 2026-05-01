import { unlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

type ReleaseKind = 'patch' | 'minor' | 'major'

interface PackageJson {
  name: string
  version: string
  homepage?: string
  repository?: {
    type?: string
    url?: string
  }
}

const rootDir = new URL('..', import.meta.url)
const packageJsonUrl = new URL('../package.json', import.meta.url)
const releaseNotesUrl = new URL('../GREASYFORK_RELEASE_NOTES.md', import.meta.url)
const workflowFile = 'release.yml'
const currentReleaseHeading = '## 当前发布说明'
const pagesVerifyTimeoutMs = 2 * 60 * 1000

function decode(output: Uint8Array): string {
  return new TextDecoder().decode(output).trim()
}

function run(
  cmd: string[],
  options: {
    check?: boolean
    quiet?: boolean
  } = {}
): { stdout: string; stderr: string; exitCode: number } {
  const { check = true, quiet = false } = options
  if (!quiet) console.log(`> ${cmd.join(' ')}`)
  const result = Bun.spawnSync({
    cmd,
    cwd: fileURLToPath(rootDir),
    env: process.env,
    stdin: 'inherit',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stdout = decode(result.stdout)
  const stderr = decode(result.stderr)
  if (result.exitCode !== 0 && check) {
    if (stdout) console.log(stdout)
    if (stderr) console.error(stderr)
    throw new Error(`Command failed with exit code ${result.exitCode}: ${cmd.join(' ')}`)
  }
  return { stdout, stderr, exitCode: result.exitCode }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function assertSemver(version: string): void {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Unsupported version format: ${version}`)
  }
}

function bumpVersion(currentVersion: string, kind: ReleaseKind): string {
  assertSemver(currentVersion)
  const [major, minor, patch] = currentVersion.split('.').map(Number)
  if (kind === 'major') return `${major + 1}.0.0`
  if (kind === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

function parseArgs(argv: string[]): { nextVersion?: string; kind: ReleaseKind } {
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
  return { nextVersion, kind }
}

function extractCurrentReleaseBullets(content: string): string {
  const match = content.match(new RegExp(`${escapeRegExp(currentReleaseHeading)}\\s*\\n\\n([\\s\\S]*?)(?=\\n## )`))
  const bullets = match?.[1]?.trim()
  if (!bullets?.startsWith('- ')) {
    throw new Error(`Cannot find release bullets under "${currentReleaseHeading}" in GREASYFORK_RELEASE_NOTES.md`)
  }
  return bullets
}

function replaceOrInsertVersionSection(content: string, version: string, bullets: string): string {
  const versionHeading = `## ${version}`
  const currentSection = `${currentReleaseHeading}\n\n${bullets}`
  const versionSection = `${versionHeading}\n\n${bullets}`
  const contentWithCurrent = content.replace(
    new RegExp(`${escapeRegExp(currentReleaseHeading)}\\s*\\n\\n([\\s\\S]*?)(?=\\n## )`),
    currentSection
  )
  const versionPattern = new RegExp(`${escapeRegExp(versionHeading)}\\s*\\n\\n([\\s\\S]*?)(?=\\n## |$)`)
  if (versionPattern.test(contentWithCurrent)) {
    return contentWithCurrent.replace(versionPattern, versionSection)
  }
  return contentWithCurrent.replace(currentSection, `${currentSection}\n\n${versionSection}`)
}

function buildUserscriptUrl(pkg: PackageJson): string {
  const repoUrl = pkg.repository?.url ?? pkg.homepage
  const match = repoUrl?.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/)
  if (!match) {
    throw new Error('Cannot infer GitHub Pages userscript URL from package.json')
  }
  const [, owner, repo] = match
  return `https://${owner}.github.io/${repo}/${pkg.name}.user.js`
}

function extractRunId(stdout: string): string {
  const match = stdout.match(/\/actions\/runs\/(\d+)/)
  if (!match) {
    throw new Error(`Cannot parse workflow run id from output: ${stdout || '(empty output)'}`)
  }
  return match[1]
}

async function waitForUserscriptVersion(url: string, expectedVersion: string): Promise<void> {
  const deadline = Date.now() + pagesVerifyTimeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { cache: 'no-store' })
      if (response.ok) {
        const content = await response.text()
        if (content.includes(`@version      ${expectedVersion}`)) return
      }
    } catch {
      // Keep polling while Pages catches up.
    }
    await Bun.sleep(3000)
  }
  throw new Error(`GitHub Pages did not publish ${expectedVersion} to ${url} within ${pagesVerifyTimeoutMs / 1000}s`)
}

function runPreflightChecks(): void {
  console.log('Running release preflight checks')
  run(['bun', 'install', '--frozen-lockfile'])
  run(['bun', 'x', 'biome', 'ci', '.'])
  run(['bun', 'test'])
  run(['bun', 'run', 'build'])
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

  runPreflightChecks()

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

  const workflowRun = run(['gh', 'workflow', 'run', workflowFile, '--ref', 'master'])
  const workflowRunId = extractRunId(workflowRun.stdout)
  console.log(`Waiting for Pages deploy run ${workflowRunId}`)
  run(['gh', 'run', 'watch', workflowRunId, '--exit-status'], {
    quiet: true,
  })

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
}

await main()

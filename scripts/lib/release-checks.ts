import { fileURLToPath } from 'node:url'
import vm from 'node:vm'

export type ReleaseKind = 'patch' | 'minor' | 'major'

export interface PackageJson {
  name: string
  version: string
  homepage?: string
  repository?: {
    type?: string
    url?: string
  }
  greasyfork?: {
    scriptId?: string
  }
}

export interface UserscriptMetadata {
  raw: string
  fields: Map<string, string[]>
}

export const projectRootUrl = new URL('../../', import.meta.url)
export const projectRoot = fileURLToPath(projectRootUrl)
export const packageJsonUrl = new URL('../../package.json', import.meta.url)
export const releaseNotesUrl = new URL('../../GREASYFORK_RELEASE_NOTES.md', import.meta.url)
export const distArtifactUrl = new URL('../../dist/bilibili-live-wheel-auto-follow.user.js', import.meta.url)
export const distMetaUrl = new URL('../../dist/bilibili-live-wheel-auto-follow.meta.js', import.meta.url)

export const currentReleaseHeading = '## 当前发布说明'
export const pagesVerifyTimeoutMs = 2 * 60 * 1000

export interface RunOptions {
  check?: boolean
  quiet?: boolean
  cwd?: string
  env?: Record<string, string | undefined>
}

export interface RunResult {
  stdout: string
  stderr: string
  exitCode: number
}

function decode(output: Uint8Array): string {
  return new TextDecoder().decode(output).trim()
}

export function run(cmd: string[], options: RunOptions = {}): RunResult {
  const { check = true, quiet = false, cwd = projectRoot, env = process.env } = options
  if (!quiet) console.log(`> ${cmd.join(' ')}`)
  const result = Bun.spawnSync({
    cmd,
    cwd,
    env: env as Record<string, string>,
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

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function assertSemver(version: string): void {
  if (!/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error(`Unsupported version format: ${version}`)
  }
}

export function compareSemver(a: string, b: string): number {
  assertSemver(a)
  assertSemver(b)
  const ap = a.split('.').map(Number)
  const bp = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (ap[i] !== bp[i]) return ap[i] - bp[i]
  }
  return 0
}

export function bumpVersion(currentVersion: string, kind: ReleaseKind): string {
  assertSemver(currentVersion)
  const [major, minor, patch] = currentVersion.split('.').map(Number)
  if (kind === 'major') return `${major + 1}.0.0`
  if (kind === 'minor') return `${major}.${minor + 1}.0`
  return `${major}.${minor}.${patch + 1}`
}

export function extractCurrentReleaseBullets(content: string): string {
  const match = content.match(new RegExp(`${escapeRegExp(currentReleaseHeading)}\\s*\\n\\n([\\s\\S]*?)(?=\\n## )`))
  const bullets = match?.[1]?.trim()
  if (!bullets?.startsWith('- ')) {
    throw new Error(`Cannot find release bullets under "${currentReleaseHeading}" in GREASYFORK_RELEASE_NOTES.md`)
  }
  return bullets
}

export function findVersionedHeadings(content: string): string[] {
  const matches = content.matchAll(/^## (\d+\.\d+\.\d+)\s*$/gm)
  return [...matches].map(m => m[1])
}

export function findMostRecentVersionedHeading(content: string): string | undefined {
  return findVersionedHeadings(content)[0]
}

export function replaceOrInsertVersionSection(content: string, version: string, bullets: string): string {
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

export function buildUserscriptUrl(pkg: PackageJson): string {
  const repoUrl = pkg.repository?.url ?? pkg.homepage
  const match = repoUrl?.match(/github\.com[:/](.+?)\/(.+?)(?:\.git)?$/)
  if (!match) {
    throw new Error('Cannot infer GitHub Pages userscript URL from package.json')
  }
  const [, owner, repo] = match
  return `https://${owner}.github.io/${repo}/${pkg.name}.user.js`
}

export async function waitForUserscriptVersion(url: string, expectedVersion: string): Promise<void> {
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

export function parseUserscriptMetadata(content: string): UserscriptMetadata {
  const headerMatch = content.match(/\/\/ ==UserScript==\s*\n([\s\S]*?)\/\/ ==\/UserScript==/)
  if (!headerMatch) {
    throw new Error('Userscript metadata block (==UserScript==...==/UserScript==) not found')
  }
  const raw = headerMatch[1]
  const fields = new Map<string, string[]>()
  for (const line of raw.split('\n')) {
    const fieldMatch = line.match(/^\/\/\s*@(\S+)\s+(.+?)\s*$/)
    if (!fieldMatch) continue
    const [, name, value] = fieldMatch
    const list = fields.get(name) ?? []
    list.push(value)
    fields.set(name, list)
  }
  return { raw, fields }
}

export async function readPackageJson(): Promise<PackageJson> {
  const text = await Bun.file(packageJsonUrl).text()
  return JSON.parse(text) as PackageJson
}

export async function readReleaseNotes(): Promise<string> {
  return Bun.file(releaseNotesUrl).text()
}

/**
 * Compile-only check: feed a JavaScript source string through Node's `vm`
 * compiler. `compileFunction` parses + creates a Function object but does
 * NOT execute it, so we can detect syntax errors (the artifact would crash
 * inside Tampermonkey's sandbox) without running any of the user-supplied
 * code against the local Node environment.
 *
 * Throws a descriptive Error on parse failure; returns void on success.
 */
export function compileSmokeTest(body: string, label = 'source'): void {
  try {
    vm.compileFunction(body, [], { parsingContext: vm.createContext({}) })
  } catch (err) {
    if (err instanceof SyntaxError) {
      throw new Error(`${label} fails to parse as JavaScript: ${err.message}`)
    }
    throw err
  }
}

/**
 * Returns the JS body of a built userscript with the `// ==UserScript==
 * ... // ==/UserScript==` metadata header removed. Throws when the closing
 * marker is missing (which would imply a malformed artifact).
 */
export function extractUserscriptBody(content: string): string {
  const closer = '// ==/UserScript=='
  const headerEnd = content.indexOf(closer)
  if (headerEnd === -1) {
    throw new Error('Userscript metadata closing marker not found, cannot extract body for smoke test')
  }
  return content.slice(headerEnd + closer.length)
}

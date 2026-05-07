import { assertSemver, readPackageJson } from './lib/release-checks.ts'

interface ScrapedStats {
  totalInstalls: number
  dailyInstalls: number
}

const readmeUrl = new URL('../README.md', import.meta.url)

async function fetchInstalls(scriptId: string): Promise<ScrapedStats> {
  const url = `https://greasyfork.org/en/scripts/${scriptId}`
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error(`Greasy Fork returned ${response.status} ${response.statusText} for ${url}`)
  }
  const html = await response.text()

  const totalMatch = html.match(/<dd class="script-show-total-installs"><span>([\d,]+)<\/span><\/dd>/)
  const dailyMatch = html.match(/<dd class="script-show-daily-installs"><span>([\d,]+)<\/span><\/dd>/)

  if (!totalMatch) {
    throw new Error(
      'Greasy Fork HTML changed: total-installs <dd> not found. Update the regex in scripts/update-greasyfork-badges.ts.'
    )
  }

  return {
    totalInstalls: Number(totalMatch[1].replace(/,/g, '')),
    dailyInstalls: dailyMatch ? Number(dailyMatch[1].replace(/,/g, '')) : 0,
  }
}

const installsBadgeRe =
  /\[!\[Greasy Fork installs\]\(https:\/\/img\.shields\.io\/badge\/installs-[^)]+\)\]\(https:\/\/greasyfork\.org\/[^)]+\)/
const versionBadgeRe =
  /\[!\[Greasy Fork version\]\(https:\/\/img\.shields\.io\/badge\/greasy%20fork-v[^)]+\)\]\(https:\/\/greasyfork\.org\/[^)]+\)/

function rewriteBadges(readme: string, totalInstalls: number, version: string, scriptId: string): string {
  const link = `https://greasyfork.org/zh-CN/scripts/${scriptId}`
  const installsBadge = `[![Greasy Fork installs](https://img.shields.io/badge/installs-${totalInstalls}-brightgreen)](${link})`
  const versionBadge = `[![Greasy Fork version](https://img.shields.io/badge/greasy%20fork-v${version}-blue)](${link})`

  if (!installsBadgeRe.test(readme)) throw new Error('Greasy Fork installs badge not found in README.md')
  if (!versionBadgeRe.test(readme)) throw new Error('Greasy Fork version badge not found in README.md')

  return readme.replace(installsBadgeRe, installsBadge).replace(versionBadgeRe, versionBadge)
}

function parseArgs(argv: string[]): { check: boolean } {
  let check = false
  for (const arg of argv) {
    if (arg === '--check') {
      check = true
      continue
    }
    if (arg === '--help' || arg === '-h') {
      console.log('Usage: bun scripts/update-greasyfork-badges.ts [--check]')
      console.log('  --check   exit non-zero if README would change; do not write')
      process.exit(0)
    }
    throw new Error(`Unknown argument: ${arg}`)
  }
  return { check }
}

async function main(): Promise<void> {
  const { check } = parseArgs(Bun.argv.slice(2))
  const pkg = await readPackageJson()
  const scriptId = pkg.greasyfork?.scriptId
  if (!scriptId) {
    throw new Error('package.json `greasyfork.scriptId` is missing')
  }
  assertSemver(pkg.version)

  const stats = await fetchInstalls(scriptId)
  console.log(
    `Greasy Fork ${scriptId}: ${stats.totalInstalls} total installs (${stats.dailyInstalls}/day); package.json version v${pkg.version}`
  )

  const current = await Bun.file(readmeUrl).text()
  const next = rewriteBadges(current, stats.totalInstalls, pkg.version, scriptId)

  if (current === next) {
    console.log('README.md badges already up to date.')
    return
  }

  if (check) {
    console.error('README.md badges are out of date. Re-run without --check to apply.')
    process.exit(1)
  }

  await Bun.write(readmeUrl, next)
  console.log('README.md badges updated.')
}

await main()

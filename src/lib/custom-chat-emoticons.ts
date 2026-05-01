import { cachedEmoticonPackages } from './store'

let emoticonCacheSource: typeof cachedEmoticonPackages.value | null = null
let emoticonCache = new Map<string, { url: string; alt: string }>()
let emoticonFirstCharCache = new Map<string, string[]>()

function normalizeEmoticonTokens(...values: Array<string | null | undefined>): string[] {
  const tokens = new Set<string>()

  const add = (value: string | null | undefined): void => {
    const token = (value ?? '').trim()
    if (!token) return
    tokens.add(token)

    const bracketMatch = token.match(/^[[\u3010](.*?)[\]\u3011]$/u)
    const core = (bracketMatch?.[1] ?? token).trim()
    if (!core) return

    tokens.add(core)
    tokens.add(`[${core}]`)
    tokens.add(`【${core}】`)
  }

  for (const value of values) add(value)
  return [...tokens]
}

function rebuildEmoticonCache(): void {
  const packages = cachedEmoticonPackages.value
  if (packages === emoticonCacheSource) return
  emoticonCacheSource = packages
  emoticonCache = new Map()
  emoticonFirstCharCache = new Map()

  for (const pkg of packages) {
    for (const emoticon of pkg.emoticons) {
      const entries = normalizeEmoticonTokens(emoticon.emoticon_unique, emoticon.emoji, emoticon.descript)
      for (const token of entries) {
        if (!token || emoticonCache.has(token)) continue
        emoticonCache.set(token, {
          url: emoticon.url,
          alt: emoticon.descript || emoticon.emoji || emoticon.emoticon_unique || token,
        })
      }
    }
  }

  const tokens = [...emoticonCache.keys()].sort((a, b) => b.length - a.length)
  for (const token of tokens) {
    const firstChar = token[0]
    if (!firstChar) continue
    const list = emoticonFirstCharCache.get(firstChar)
    if (list) list.push(token)
    else emoticonFirstCharCache.set(firstChar, [token])
  }
}

function matchingEmoticonToken(text: string, start: number): string | null {
  rebuildEmoticonCache()
  const candidates = emoticonFirstCharCache.get(text[start] ?? '')
  if (!candidates) return null
  for (const token of candidates) {
    if (text.startsWith(token, start)) return token
  }
  return null
}

export function setChatText(el: HTMLElement, text: string): void {
  if (!text) {
    el.replaceChildren()
    return
  }

  const fragment = document.createDocumentFragment()
  let cursor = 0
  let buffer = ''

  while (cursor < text.length) {
    const token = matchingEmoticonToken(text, cursor)
    if (!token) {
      buffer += text[cursor]
      cursor += 1
      continue
    }

    if (buffer) {
      fragment.append(buffer)
      buffer = ''
    }

    const emoticon = emoticonCache.get(token)
    if (!emoticon?.url) {
      buffer += token
      cursor += token.length
      continue
    }

    const img = document.createElement('img')
    img.className = 'lc-chat-emote'
    img.src = emoticon.url
    img.alt = emoticon.alt || token
    img.title = emoticon.alt || token
    img.loading = 'lazy'
    img.decoding = 'async'
    fragment.append(img)
    cursor += token.length
  }

  if (buffer) fragment.append(buffer)
  el.replaceChildren(fragment)
}

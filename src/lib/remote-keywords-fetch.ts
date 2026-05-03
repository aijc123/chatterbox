import { BASE_URL } from './const'
import { type RemoteKeywords, sanitizeRemoteKeywords } from './remote-keywords-sanitize'

export async function fetchRemoteKeywords(): Promise<RemoteKeywords> {
  const response = await fetch(BASE_URL.REMOTE_KEYWORDS)
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
  const raw: unknown = await response.json()
  return sanitizeRemoteKeywords(raw)
}

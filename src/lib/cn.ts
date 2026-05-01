type ClassDictionary = Record<string, boolean | null | undefined>
type ClassArray = ClassValue[]
type ClassValue = string | number | false | null | undefined | ClassDictionary | ClassArray

function pushClass(tokens: string[], value: ClassValue): void {
  if (!value) return
  if (typeof value === 'string' || typeof value === 'number') {
    const parts = String(value).trim().split(/\s+/)
    for (const part of parts) {
      if (part) tokens.push(part)
    }
    return
  }
  if (Array.isArray(value)) {
    for (const entry of value) pushClass(tokens, entry)
    return
  }
  for (const [key, enabled] of Object.entries(value)) {
    if (enabled) tokens.push(key)
  }
}

export function cn(...inputs: ClassValue[]): string {
  const tokens: string[] = []
  for (const input of inputs) pushClass(tokens, input)
  return tokens.join(' ')
}

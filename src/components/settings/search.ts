/**
 * 设置面板搜索匹配。
 *
 * 老逻辑是 `KEYWORDS.includes(query)`——纯子串匹配，意味着多词查询（"key llm"、
 * "ai 规避"）永远不命中，即使 KEYWORDS 同时包含两个词。
 *
 * 新逻辑：把 query 按空白拆成 tokens，要求**每个** token 都出现在 KEYWORDS 里。
 * 顺序无关、可任意组合。空 query 一律命中（"显示全部"语义不变）。
 *
 * 双方都先小写化让大小写无关。
 */
export function matchesSearchQuery(haystackKeywords: string, query: string): boolean {
  const q = query.trim().toLowerCase()
  if (!q) return true
  const hay = haystackKeywords.toLowerCase()
  const tokens = q.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  return tokens.every(t => hay.includes(t))
}

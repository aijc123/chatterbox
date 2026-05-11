/**
 * Run an async mapper over `items` with at most `limit` calls in flight at
 * once. Preserves input ordering in the result array (`results[i]` is the
 * mapper's output for `items[i]`).
 *
 * Used by `api.ts` to fan out anchor-room lookups during fan-medal /
 * following-room scans without flooding Bilibili's endpoints sequentially.
 *
 * Lives in its own module (rather than inside `api.ts`) so unit tests can
 * import it without pulling in api.ts's heavy module-load side effects
 * (WBI XHR hijack, replacement-map effect, etc.).
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  // Defensive clamp:non-positive / NaN / non-integer limit would yield
  // `Math.min(limit, items.length)` workers = 0 → Promise.all([]) resolves
  // immediately → results array filled with `undefined`, callers downstream
  // (api.ts anchor lookups) treat that as "no rooms found" silently.
  // Always run at least 1 worker so the caller gets the real result.
  const safeLimit = Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : 1
  const results = new Array<R>(items.length)
  if (items.length === 0) return results
  let cursor = 0
  const workers = new Array(Math.min(safeLimit, items.length)).fill(0).map(async () => {
    while (true) {
      const idx = cursor++
      if (idx >= items.length) return
      results[idx] = await fn(items[idx])
    }
  })
  await Promise.all(workers)
  return results
}

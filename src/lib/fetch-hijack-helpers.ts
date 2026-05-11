// Pure helpers for the Bilibili Response.prototype hijack. Lives in its
// own module (separate from `fetch-hijack.ts`) so unit tests can import
// them without dragging in the prototype-patching IIFE that the
// orchestrator runs at module load. See docs/coverage-policy.md — the
// orchestrator is whitelisted from coverage exactly because that IIFE
// pollutes any test isolate that imports it; pure logic must live here.

export const GET_INFO_BY_USER_PATTERN = '/xlive/web-room/v1/index/getInfoByUser'
export const ACC_RELATION_PATTERN = '/x/space/wbi/acc/relation'
export const SPACE_BLOCK_BANNER_ID = 'chatterbox-space-block-banner'

export interface HijackOpts {
  unlockForbidLive: boolean
  unlockSpaceBlock: boolean
}

export type TransformResult =
  | { kind: 'live'; wasBlocking: boolean }
  | { kind: 'space'; wasBlocking: boolean }
  | { kind: null }

const NULL_RESULT: TransformResult = { kind: null }

/**
 * True iff the current signal state means we'd actually rewrite this
 * URL. The fast path in the orchestrator uses this to skip the
 * `Response.json()` clone-and-parse cost for URLs we don't care about.
 */
export function shouldHijackUrl(url: string, opts: HijackOpts): boolean {
  if (!url) return false
  return (
    (opts.unlockForbidLive && url.includes(GET_INFO_BY_USER_PATTERN)) ||
    (opts.unlockSpaceBlock && url.includes(ACC_RELATION_PATTERN))
  )
}

/**
 * Mutates parsed-JSON `data` in place to neutralize the relevant block
 * flags. Returns a `TransformResult` so the caller can decide whether
 * to inject / clear the matching DOM indicator.
 *
 * Idempotent: re-applying it on already-transformed data is a no-op
 * (`is_forbid` is already `false`, `attribute` is already `0`), so it's
 * safe even if B站's code clones a Response and consumes it twice.
 *
 * Defensive: silently returns `{ kind: null }` for malformed inputs
 * (null/undefined/primitive `data`, missing nested fields). Hijacking
 * must never throw — uncaught errors here would break the page's own
 * response consumer.
 */
interface BlockPayloadShape {
  data?: {
    forbid_live?: { is_forbid?: boolean; forbid_text?: string }
    be_relation?: { attribute?: number }
  }
}

export function applyTransforms(url: string, data: unknown, opts: HijackOpts): TransformResult {
  if (!url || data === null || typeof data !== 'object') return NULL_RESULT
  const payload = data as BlockPayloadShape

  if (opts.unlockForbidLive && url.includes(GET_INFO_BY_USER_PATTERN)) {
    const forbid = payload.data?.forbid_live
    if (!forbid) return { kind: 'live', wasBlocking: false }
    const wasBlocking = Boolean(forbid.is_forbid)
    forbid.is_forbid = false
    forbid.forbid_text = ''
    return { kind: 'live', wasBlocking }
  }

  if (opts.unlockSpaceBlock && url.includes(ACC_RELATION_PATTERN)) {
    const beRel = payload.data?.be_relation
    if (!beRel || typeof beRel !== 'object') return { kind: 'space', wasBlocking: false }
    if (beRel.attribute === 128) {
      beRel.attribute = 0
      return { kind: 'space', wasBlocking: true }
    }
    return { kind: 'space', wasBlocking: false }
  }

  return NULL_RESULT
}

/**
 * Inserts a full-width banner immediately after `header` to surface the
 * space-page block unlock to the user. Idempotent: if a banner element
 * with our ID already exists in the document, returns the existing
 * node without inserting a second one.
 */
export function injectSpaceBlockBanner(header: HTMLElement): HTMLElement {
  const existing = document.getElementById(SPACE_BLOCK_BANNER_ID)
  if (existing) return existing
  const el = document.createElement('div')
  el.id = SPACE_BLOCK_BANNER_ID
  el.textContent = '🔓 Chatterbox 弹幕助手已解除该用户的部分拉黑限制'
  el.style.cssText = [
    'background: rgb(228 243 240)',
    'color: rgb(0 82 63)',
    'padding: 8px 16px',
    'font-size: 12px',
    'text-align: center',
    'box-sizing: border-box',
    'width: 100%',
    'line-height: 1',
  ].join(';')
  header.insertAdjacentElement('afterend', el)
  return el
}

/**
 * Removes the previously-injected banner if present. Safe to call
 * repeatedly or when no banner exists.
 */
export function removeSpaceBlockBanner(): void {
  document.getElementById(SPACE_BLOCK_BANNER_ID)?.remove()
}

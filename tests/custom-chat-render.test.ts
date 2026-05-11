/**
 * Comprehensive tests for `src/lib/custom-chat-render.ts`. The original
 * happy-path coverage left 91 mutants alive (a lot of regex anchors and
 * priority-ladder branches that "just happened to" classify correctly even
 * with wrong code). Table-driven cases below pin every branch + every
 * regex character class + the boundary on `<= 12` and `> CAP`.
 */

import { describe, expect, test } from 'bun:test'

import type { CustomChatEvent, CustomChatKind } from '../src/lib/custom-chat-events'

import {
  CUSTOM_CHAT_MAX_MESSAGES,
  type CustomChatBadgeType,
  type CustomChatPriority,
  customChatBadgeType,
  customChatPriority,
  shouldAnimateRenderBatch,
  shouldSuppressCustomChatEvent,
  takeRenderBatch,
  trimRenderQueue,
  visibleRenderMessages,
} from '../src/lib/custom-chat-render'

const baseEvent: CustomChatEvent = {
  id: '1',
  kind: 'danmaku',
  text: 'hello',
  uname: 'alice',
  uid: '42',
  time: '12:00',
  isReply: false,
  source: 'ws',
  badges: [],
}

function evt(over: Partial<CustomChatEvent>): CustomChatEvent {
  return { ...baseEvent, ...over }
}

// ---------------------------------------------------------------------------
// customChatBadgeType — each regex branch pinned with a positive AND a
// near-miss negative example so mutating an anchor / character class fails.
// ---------------------------------------------------------------------------
describe('customChatBadgeType (every branch + regex anchor)', () => {
  // GUARD / 总督 / 提督 / 舰长 / 舰队
  test.each<[string, CustomChatBadgeType]>([
    ['GUARD 3', 'guard'],
    ['guard', 'guard'],
    ['privilege', 'guard'],
    ['PRIVILEGE 1', 'guard'],
    ['总督', 'guard'],
    ['提督', 'guard'],
    ['舰长', 'guard'],
    ['舰队', 'guard'],
  ])('"%s" → guard', (input, expected) => {
    expect(customChatBadgeType(input)).toBe(expected)
  })

  // UL / LV
  test.each<[string, CustomChatBadgeType]>([
    ['UL 22', 'ul'],
    ['LV 30', 'ul'],
    ['ul99', 'ul'],
    ['lv 5', 'ul'],
    [' UL 5', 'ul'], // leading whitespace tolerated (after trim, ^ before \s*)
  ])('"%s" → ul', (input, expected) => {
    expect(customChatBadgeType(input)).toBe(expected)
  })

  test('"UL" without trailing digits is NOT ul (kills `\\d+` → `\\D+` mutant)', () => {
    expect(customChatBadgeType('UL ')).toBe('other')
    expect(customChatBadgeType('UL abc')).toBe('other')
  })

  // admin: 房 / 管 / admin / moderator
  test.each<[string, CustomChatBadgeType]>([
    ['房管', 'admin'],
    ['超级房管', 'admin'],
    ['admin', 'admin'],
    ['MODERATOR', 'admin'],
  ])('"%s" → admin', (input, expected) => {
    expect(customChatBadgeType(input)).toBe(expected)
  })

  // rank: 榜 1|2|3 / top 1|2|3 / rank 1|2|3
  test.each<[string, CustomChatBadgeType]>([
    ['榜 1', 'rank'],
    ['榜2', 'rank'],
    ['top 1', 'rank'],
    ['Top 3', 'rank'],
    ['rank 2', 'rank'],
    ['RANK 1', 'rank'],
  ])('"%s" → rank', (input, expected) => {
    expect(customChatBadgeType(input)).toBe(expected)
  })

  test('"rank 4" / "top 9" are NOT rank (4/9 outside [123]); fall through to medal', () => {
    // Rank regex is /...|rank\s*[123]/i. 4 is NOT in [123], so the input
    // falls through to the next branch — medal — where /[^\s]\s+\d{1,3}$/
    // matches ("rank" + space + 1-3 digit at end). A mutant flipping [123]
    // → [^123] would make rank match instead. Asserting `medal` (not
    // `rank`) catches both directions.
    expect(customChatBadgeType('rank 4')).toBe('medal')
    expect(customChatBadgeType('top 9')).toBe('medal')
  })

  test('"rank9" (no space) hits NEITHER rank nor medal → other', () => {
    // Strict negative: no space between text and digit means medal's
    // \s+ anchor fails. Lock the structure of medal's whitespace requirement.
    expect(customChatBadgeType('rank9')).toBe('other')
    expect(customChatBadgeType('top9')).toBe('other')
  })

  // honor: 荣 / 耀 / honor / honour
  test.each<[string, CustomChatBadgeType]>([
    ['荣耀', 'honor'],
    ['荣誉', 'honor'],
    ['honor', 'honor'],
    ['HONOUR', 'honor'],
    ['honour user', 'honor'],
  ])('"%s" → honor', (input, expected) => {
    expect(customChatBadgeType(input)).toBe(expected)
  })

  // price: SC 30 / 0.5元 / ¥30 / $30
  test.each<[string, CustomChatBadgeType]>([
    ['SC 30', 'price'],
    ['SC30', 'price'],
    ['30元', 'price'],
    ['0.5元', 'price'],
    ['¥30', 'price'],
    ['¥30.5', 'price'],
    ['$10', 'price'],
  ])('"%s" → price', (input, expected) => {
    expect(customChatBadgeType(input)).toBe(expected)
  })

  test('"元" without leading digits is NOT price (kills `\\d+` → `\\D+`)', () => {
    expect(customChatBadgeType('元')).toBe('other')
    expect(customChatBadgeType('元 abc')).toBe('other')
  })

  test('"$" / "¥" without digits is NOT price', () => {
    expect(customChatBadgeType('$')).toBe('other')
    expect(customChatBadgeType('¥')).toBe('other')
  })

  // medal: text + whitespace + 1-3 digits at end
  test.each<[string, CustomChatBadgeType]>([
    ['牌子 18', 'medal'],
    ['牌子  18', 'medal'],
    ['名字 1', 'medal'],
    ['名字 999', 'medal'],
  ])('"%s" → medal', (input, expected) => {
    expect(customChatBadgeType(input)).toBe(expected)
  })

  test('medal needs 1-3 digit suffix, no leading whitespace before text part', () => {
    // 4+ digits → not medal
    expect(customChatBadgeType('牌子 1234')).toBe('other')
    // No text before space → fails [^\s] anchor
    expect(customChatBadgeType('  18')).toBe('other')
    // Anchored at end of string ($) — digits not at end should fail
    expect(customChatBadgeType('牌子 18 trailing')).toBe('other')
  })

  // empty / whitespace / fallback
  test.each<[string, CustomChatBadgeType]>([
    ['', 'other'],
    ['   ', 'other'],
    ['\t\n', 'other'],
    ['random text', 'other'],
    ['plain', 'other'],
  ])('"%s" → other (empty / no match)', (input, expected) => {
    expect(customChatBadgeType(input)).toBe(expected)
  })

  test('whitespace-only inputs trim to empty and return "other"', () => {
    // Kills MethodExpression mutant `raw.trim()` → `raw` (without trim,
    // "  " would not be empty, and might match one of the later regexes).
    expect(customChatBadgeType('  \t  ')).toBe('other')
  })
})

// ---------------------------------------------------------------------------
// customChatPriority — pin each branch separately so kind-string mutants
// (replacing a literal with `""`) flip a single classification.
// ---------------------------------------------------------------------------
describe('customChatPriority (kind ladder)', () => {
  const cases: Array<[CustomChatKind, CustomChatPriority]> = [
    ['superchat', 'critical'],
    ['guard', 'critical'],
    ['gift', 'card'],
    ['redpacket', 'card'],
    ['lottery', 'card'],
    ['enter', 'lite'],
    ['follow', 'lite'],
    ['like', 'lite'],
    ['share', 'lite'],
    ['notice', 'lite'],
    ['system', 'lite'],
    ['danmaku', 'message'], // default / fallthrough
  ]
  for (const [kind, prio] of cases) {
    test(`kind="${kind}" → priority=${prio}`, () => {
      expect(customChatPriority(evt({ kind }))).toBe(prio)
    })
  }

  test('danmaku with a recognized badge is promoted from message → identity', () => {
    expect(customChatPriority(evt({ kind: 'danmaku', badges: ['GUARD 3'] }))).toBe('identity')
    expect(customChatPriority(evt({ kind: 'danmaku', badges: ['UL 5'] }))).toBe('identity')
    expect(customChatPriority(evt({ kind: 'danmaku', badges: ['房管'] }))).toBe('identity')
  })

  test('danmaku with only "other" badges stays as message (kills `.some` → `.every`)', () => {
    // `.some(... !== 'other')` becomes `.every(...)` mutant: if all badges
    // are 'other'-classified, `.some` returns false (stay message) but
    // `.every` returns true (promote to identity). With ONE non-matching
    // badge, .some=false, .every=false — same. So we need at least ONE
    // "other" badge mixed with… nothing. Or all "other".
    expect(customChatPriority(evt({ kind: 'danmaku', badges: ['plain text'] }))).toBe('message')
    expect(customChatPriority(evt({ kind: 'danmaku', badges: ['random', 'other text'] }))).toBe('message')
  })

  test('danmaku with NO badges at all stays as message (empty .some/.every short-circuit)', () => {
    expect(customChatPriority(evt({ kind: 'danmaku', badges: [] }))).toBe('message')
  })

  test('guard kind beats GUARD badge: superchat/guard return critical regardless of badges', () => {
    expect(customChatPriority(evt({ kind: 'guard', badges: ['random'] }))).toBe('critical')
    expect(customChatPriority(evt({ kind: 'superchat', badges: ['plain'] }))).toBe('critical')
  })

  test('card kind beats badges: gift/redpacket/lottery return card', () => {
    expect(customChatPriority(evt({ kind: 'gift', badges: ['GUARD 3'] }))).toBe('card')
    expect(customChatPriority(evt({ kind: 'redpacket', badges: ['UL 5'] }))).toBe('card')
    expect(customChatPriority(evt({ kind: 'lottery', badges: ['房管'] }))).toBe('card')
  })

  test('lite kind beats badges: enter/follow/like/share/notice/system stay lite', () => {
    expect(customChatPriority(evt({ kind: 'enter', badges: ['GUARD 3'] }))).toBe('lite')
    expect(customChatPriority(evt({ kind: 'notice', badges: ['UL 5'] }))).toBe('lite')
  })
})

// ---------------------------------------------------------------------------
// shouldSuppressCustomChatEvent — only `enter` is suppressed.
// ---------------------------------------------------------------------------
describe('shouldSuppressCustomChatEvent', () => {
  const cases: Array<[CustomChatKind, boolean]> = [
    ['enter', true],
    ['danmaku', false],
    ['gift', false],
    ['superchat', false],
    ['guard', false],
    ['redpacket', false],
    ['lottery', false],
    ['follow', false],
    ['like', false],
    ['share', false],
    ['notice', false],
    ['system', false],
  ]
  for (const [kind, expected] of cases) {
    test(`kind="${kind}" → ${expected}`, () => {
      expect(shouldSuppressCustomChatEvent(evt({ kind }))).toBe(expected)
    })
  }
})

// ---------------------------------------------------------------------------
// shouldAnimateRenderBatch — boundary at 12.
// ---------------------------------------------------------------------------
describe('shouldAnimateRenderBatch (boundary at 12)', () => {
  test('batch size 0 → animate', () => {
    expect(shouldAnimateRenderBatch(0)).toBe(true)
  })
  test('batch size 1 → animate', () => {
    expect(shouldAnimateRenderBatch(1)).toBe(true)
  })
  test('batch size 11 → animate', () => {
    expect(shouldAnimateRenderBatch(11)).toBe(true)
  })
  test('batch size exactly 12 → animate (boundary; kills `<=` → `<` mutant)', () => {
    expect(shouldAnimateRenderBatch(12)).toBe(true)
  })
  test('batch size 13 → do NOT animate (kills `<=` → `<` and `<=` → `>` mutants)', () => {
    expect(shouldAnimateRenderBatch(13)).toBe(false)
  })
  test('batch size 50 → do NOT animate', () => {
    expect(shouldAnimateRenderBatch(50)).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// takeRenderBatch — splice() side effect verified.
// ---------------------------------------------------------------------------
describe('takeRenderBatch (mutates queue, returns at most 36)', () => {
  function makeEvents(n: number): CustomChatEvent[] {
    return Array.from({ length: n }, (_, i) => evt({ id: String(i) }))
  }

  test('returns at most 36 entries, removes them from the queue', () => {
    const queue = makeEvents(50)
    const batch = takeRenderBatch(queue)
    expect(batch.length).toBe(36)
    expect(queue.length).toBe(14)
    // The batch should be the FIRST 36; queue keeps the rest.
    expect(batch[0]?.id).toBe('0')
    expect(batch[35]?.id).toBe('35')
    expect(queue[0]?.id).toBe('36')
  })

  test('queue shorter than 36 is fully drained', () => {
    const queue = makeEvents(10)
    const batch = takeRenderBatch(queue)
    expect(batch.length).toBe(10)
    expect(queue.length).toBe(0)
  })

  test('empty queue returns empty array, no throw', () => {
    const queue: CustomChatEvent[] = []
    expect(takeRenderBatch(queue)).toEqual([])
    expect(queue.length).toBe(0)
  })

  test('queue exactly 36 returns all and leaves empty', () => {
    const queue = makeEvents(36)
    const batch = takeRenderBatch(queue)
    expect(batch.length).toBe(36)
    expect(queue.length).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// trimRenderQueue — boundary at MAX_MESSAGES (220).
// ---------------------------------------------------------------------------
describe('trimRenderQueue (boundary at MAX_MESSAGES)', () => {
  function makeEvents(n: number): CustomChatEvent[] {
    return Array.from({ length: n }, (_, i) => evt({ id: String(i) }))
  }

  test('no-op under cap', () => {
    const queue = makeEvents(100)
    trimRenderQueue(queue)
    expect(queue.length).toBe(100)
  })

  test('exact cap: NO trim (boundary; kills `>` → `>=`)', () => {
    const queue = makeEvents(CUSTOM_CHAT_MAX_MESSAGES)
    const firstBefore = queue[0]?.id
    trimRenderQueue(queue)
    expect(queue.length).toBe(CUSTOM_CHAT_MAX_MESSAGES)
    expect(queue[0]?.id).toBe(firstBefore)
  })

  test('cap+1: trims exactly one (boundary above cap)', () => {
    const queue = makeEvents(CUSTOM_CHAT_MAX_MESSAGES + 1)
    trimRenderQueue(queue)
    expect(queue.length).toBe(CUSTOM_CHAT_MAX_MESSAGES)
    expect(queue[0]?.id).toBe('1') // first one was dropped
  })

  test('much-over-cap: trims back to exact cap, oldest first', () => {
    const queue = makeEvents(CUSTOM_CHAT_MAX_MESSAGES + 50)
    trimRenderQueue(queue)
    expect(queue.length).toBe(CUSTOM_CHAT_MAX_MESSAGES)
    expect(queue[0]?.id).toBe('50')
    expect(queue[queue.length - 1]?.id).toBe(String(CUSTOM_CHAT_MAX_MESSAGES + 50 - 1))
  })
})

// ---------------------------------------------------------------------------
// visibleRenderMessages — filter THEN slice the last N.
// ---------------------------------------------------------------------------
describe('visibleRenderMessages', () => {
  function makeEvents(n: number): CustomChatEvent[] {
    return Array.from({ length: n }, (_, i) => evt({ id: String(i), text: i % 2 === 0 ? 'even' : 'odd' }))
  }

  test('returns the LAST N filtered events (slice with negative index)', () => {
    const messages = makeEvents(CUSTOM_CHAT_MAX_MESSAGES + 100)
    const out = visibleRenderMessages(messages, () => true)
    expect(out.length).toBe(CUSTOM_CHAT_MAX_MESSAGES)
    // Last item preserved.
    expect(out[out.length - 1]?.id).toBe(String(CUSTOM_CHAT_MAX_MESSAGES + 100 - 1))
  })

  test('filter applied BEFORE slice (kills MethodExpression `.filter(matches)` → `.filter(matches)` only or `.slice` only)', () => {
    // 20 evens out of 40 inputs; cap doesn't trim. Both filter AND slice
    // need to apply: a mutant that drops `.filter(matches)` would return
    // ALL 40 inputs; a mutant that drops `.slice(-CAP)` would return all
    // filtered (still 20 here, so this test only catches the filter drop).
    const messages = makeEvents(40)
    const evens = visibleRenderMessages(messages, m => m.text === 'even')
    expect(evens.length).toBe(20)
    expect(evens.every(m => m.text === 'even')).toBe(true)
  })

  test('slice applied AFTER filter — cap-aware', () => {
    // 300 evens + 300 odds. After filter only 300 evens. After slice last
    // CAP (220) we get the LAST 220 evens. If `.slice` is dropped we'd get
    // all 300 evens.
    const messages = makeEvents(600)
    const evens = visibleRenderMessages(messages, m => m.text === 'even')
    expect(evens.length).toBe(CUSTOM_CHAT_MAX_MESSAGES)
    expect(evens[0]?.id).toBe(String(2 * (300 - CUSTOM_CHAT_MAX_MESSAGES))) // first kept even
  })

  test('CUSTOM_CHAT_MAX_MESSAGES is positive — kills UnaryOperator `-CAP` → `+CAP`', () => {
    // slice(+CAP) starts from index CAP onwards, returning later items. If
    // the unary mutant flips, we'd get items[CAP..] instead of items[-CAP..].
    // For 100-item queue, slice(220) returns []. So a mutant returns []
    // while the real impl returns 100 items.
    const messages = makeEvents(100)
    const out = visibleRenderMessages(messages, () => true)
    expect(out.length).toBe(100)
  })
})

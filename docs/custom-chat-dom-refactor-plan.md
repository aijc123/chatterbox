# `custom-chat-dom.ts` refactor plan — Phase 1 audit

**Status:** Draft for maintainer review. No code changes have been made.
**Target file:** [src/lib/custom-chat-dom.ts](../src/lib/custom-chat-dom.ts) (1,982 LOC).
**Audit date:** 2026-05-04.

The maintainer should read sections 1–8, push back where they disagree, and then explicitly say "proceed with PR #N" before any code is written. No PR will be opened on speculation.

---

## 0. Bundle baseline (correction)

The original brief mentioned a 925 KB cap with ~31 KB margin. The actual budget today (read from [scripts/analyze-bundle.mjs:5](../scripts/analyze-bundle.mjs)) is **975 KB raw** (`BUNDLE_BUDGET_KB`, default 975). The current artifact is:

```
dist/bilibili-live-wheel-auto-follow.user.js = 972,914 bytes ≈ 949.77 KB
Budget                                       = 975.00 KB
Headroom                                     = 25.23 KB
```

The headroom is **tighter than the brief implied**. Any extraction that adds even ~25 KB will fail `release:check`. This sharpens the constraint: every PR must measure bundle delta and any growth needs a tree-shaking explanation.

If you'd rather raise the budget before this work begins, that's a separate conversation; this plan assumes the 975 KB cap stays.

---

## 1. Responsibility map (file walk, top to bottom)

The file is structured as one big module-level state bag plus 70+ free functions. Below is every meaningful symbol grouped by concern, with line numbers from the current head.

### 1.1 Imports & constants ([custom-chat-dom.ts:1-82](../src/lib/custom-chat-dom.ts#L1-L82))
- Imports from 14 modules; no new types defined inline.
- Constants: `ROOT_ID`, `STYLE_ID`, `USER_STYLE_ID`, `MAX_MESSAGES`, `VIRTUAL_OVERSCAN`, `DEFAULT_ROW_HEIGHT`, `LITE_ROW_HEIGHT`, `CARD_ROW_HEIGHT`, `CRITICAL_CARD_ROW_HEIGHT`, `COMPACT_CARD_ROW_HEIGHT`.

### 1.2 Module-scope state ([custom-chat-dom.ts:83-167](../src/lib/custom-chat-dom.ts#L83-L167))
A single mutable bag that every other section reads or mutates. Notable groups:

- **Subscription disposers** (lines 91–96): `unsubscribeDom`, `unsubscribeEvents`, `unsubscribeWsStatus`, `disposeSettings`, `disposeComposer`, `disposeActionsIsland`.
- **Native-DOM observer state** (lines 97–103): `fallbackMountTimer`, `nativeEventObserver`, `nativeEventObserverContainer`, `nativeEventObserverSuspended`.
- **DOM element refs** (lines 104–124): `root`, `rootOutsideHistory`, `rootUsesFallbackHost`, `fallbackHost`, `listEl`, virtual spacers, `pauseBtn`, `unreadBtn`, `jumpBottomBtn`, `searchInput`, `matchCountEl`, `wsStatusEl`, `emptyEl`, `perfEl`, `debugEl`, `textarea`, `countEl`, `styleEl`, `userStyleEl`.
- **Behavioral state** (lines 125–134): `messageSeq`, `followMode`, `frozenSnapshot`, `unread`, `sending`, `searchQuery`, `hasClearedMessages`, `currentWsStatus`, `nativeDomWarning`.
- **Message stores** (lines 134–153): `messages` array, `messageKeys` Set, `recentEventKeys` Map, `eventKeyByMessage` WeakMap, `messageByEventKey` Map, `RECENT_EVENT_KEYS_GC_THRESHOLD`, `renderQueue`, `visibleMessages`, `rowHeights`, `eventTicks`, `nativeHealthSamples`, `seenNativeNodes`, `pendingNativeNodes`, `sourceCounts`, `lastBatchSize`.
- **RAF / scheduler state** (lines 155–161): `chatFrame`, `nativeScanFrame`, `nativeScanDebounceTimer`, `pendingRenderFlush`, `pendingRerender`, `rerenderToken`, `emoticonRefreshToken`.
- **AbortController fallback** (lines 165–167): `rootEventController`, `rootEventDisposers` (note inline by [custom-chat-dom.ts:163-166](../src/lib/custom-chat-dom.ts#L163-L166) about Safari/Violentmonkey AbortSignal compatibility — this is a load-bearing detail).

### 1.3 Emoticon refresh ([custom-chat-dom.ts:169-178](../src/lib/custom-chat-dom.ts#L169-L178))
- `refreshCurrentRoomEmoticons()` — token-guarded async fetch.

### 1.4 Send-text helper ([custom-chat-dom.ts:180-183](../src/lib/custom-chat-dom.ts#L180-L183))
- `eventToSendableMessage(ev)` — pure.

### 1.5 AbortSignal probe + listener registration ([custom-chat-dom.ts:185-275](../src/lib/custom-chat-dom.ts#L185-L275))
- `signalListenerSupported`, `detectSignalListenerSupport()`, `getRootEventSignal()`, `abortRootEventListeners()`, `addRootEventListener()`, `makeButton()`.
- These wrap every event listener attached to the panel. Critical for cleanup correctness — every other section calls `addRootEventListener` for clicks/wheel/scroll/keydown/input.

### 1.6 Event-key + dedup machinery ([custom-chat-dom.ts:276-318](../src/lib/custom-chat-dom.ts#L276-L318))
- `eventKey(event)` — pure, content-addressed (`kind:uid:text-prefix`).
- `eventKeyOf(message)` — memoized via `eventKeyByMessage`.
- `messageKey(event)` — pure (`source:id`).
- `gcRecentEventKeys(now)`, `rememberEvent(event)` — TTL dedup map.
- `messageIndexByEvent(event)` — O(1) duplicate lookup via `messageByEventKey` then `messages.indexOf`.

### 1.7 Merge logic for duplicate events ([custom-chat-dom.ts:319-418](../src/lib/custom-chat-dom.ts#L319-L418))
- `chooseBetterName(current, incoming)` — pure.
- `mergeFields(current, incoming)` — pure.
- `bestMergedBadges(currentBadges, incomingBadges)` — pure.
- `mergeDuplicateEvent(current, incoming)` — pure (returns `null` if nothing changed).
- `replaceMessage(index, next)` — mutates module state and calls `scheduleRerenderMessages()`.

### 1.8 Stats / perf debug ([custom-chat-dom.ts:420-448](../src/lib/custom-chat-dom.ts#L420-L448))
- `recordEventStats(event)` — mutates `eventTicks`, `sourceCounts`.
- `updatePerfDebug()` — DOM mutation: writes `root.dataset.*` and `perfEl.textContent`.

### 1.9 Reliability filter + display helpers ([custom-chat-dom.ts:450-511](../src/lib/custom-chat-dom.ts#L450-L511))
- `isReliableEvent(event)` — pure-ish (calls `displayName` which is pure).
- `shouldShowUserLevelBadge(message)` — pure.
- `normalizedUserLevelBadge(message, name?)` — pure.
- `displayName(message)` — pure.
- `normalizeBadges(message, name?)` — pure.

### 1.10 Card / guard helpers ([custom-chat-dom.ts:513-592](../src/lib/custom-chat-dom.ts#L513-L592))
- `guardLevel(message)`, `cardType(message)`, `cardTitle(...)`, `cardMark(...)`, `formatAmount(...)`, `cardFields(...)` — all pure.

### 1.11 Avatar element factory ([custom-chat-dom.ts:594-626](../src/lib/custom-chat-dom.ts#L594-L626))
- `createAvatar(message)` — DOM-building, attaches `load`/`error` listeners via `addRootEventListener`. Has `@internal` test export.

### 1.12 Native DOM health tracking ([custom-chat-dom.ts:628-638](../src/lib/custom-chat-dom.ts#L628-L638))
- `recordNativeHealth(parsed)` — mutates `nativeHealthSamples`, `nativeDomWarning`, calls `updateWsStatus`.

### 1.13 Visibility / search helpers ([custom-chat-dom.ts:640-657](../src/lib/custom-chat-dom.ts#L640-L657))
- `kindVisible(kind)` — reads gmSignal store; pure-ish.
- `messageMatchesSearch(message)` — wraps `messageMatchesCustomChatSearch` from search module.
- `searchHint()` — wraps `customChatSearchHint`.

### 1.14 Follow-mode state machine ([custom-chat-dom.ts:659-705](../src/lib/custom-chat-dom.ts#L659-L705))
- `isFollowing()`, `renderedMessages()`, `renderedRowHeights()`.
- `snapshotFromLive(scrollTop?)`, `syncFrozenSnapshotFromLive()`, `enterFrozenMode(mode)`, `resumeFollowing(behavior)`, `renderedMessageCount()`.
- These read/write `followMode`, `frozenSnapshot`, `visibleMessages`, `rowHeights`, `unread`, and `listEl.scrollTop`.

### 1.15 Empty state + WS status UI ([custom-chat-dom.ts:706-746](../src/lib/custom-chat-dom.ts#L706-L746))
- `updateEmptyState()`, `wsStatusLabel(status)`, `updateWsStatus(status)`.

### 1.16 Match count + unread + scroll bindings ([custom-chat-dom.ts:748-842](../src/lib/custom-chat-dom.ts#L748-L842))
- `updateMatchCount()`, `updateUnread()`, `isNearBottom()`, `syncAutoFollowFromScroll()`, `scrollToBottom(behavior?)`, `scrollListByWheel(event)`.

### 1.17 Pruning + row-height estimation ([custom-chat-dom.ts:844-880](../src/lib/custom-chat-dom.ts#L844-L880))
- `pruneMessages()` — enforces `MAX_MESSAGES` hard cap. **Coupled to the [CLAUDE.md](../CLAUDE.md) "long-running chat data structures have hard caps" rule — preserve.**
- `estimatedRowHeight(message)`, `rowHeight(message)`, `virtualContentHeight(end?)` — math.
- `setSpacerHeight(spacer, height)` — DOM mutation.

### 1.18 Visible-message materialization ([custom-chat-dom.ts:887-889](../src/lib/custom-chat-dom.ts#L887-L889))
- `refreshVisibleMessages()` — wraps `visibleRenderMessages`.

### 1.19 Message row builder ([custom-chat-dom.ts:891-1034](../src/lib/custom-chat-dom.ts#L891-L1034))
- `createMessageRow(message, animate?, virtualIndex?)` — the largest single function in the file (~140 LOC). DOM-heavy, attaches click listeners, calls back into `repeatDanmaku`/`stealDanmaku`/`copyText` from `danmaku-actions`, calls `customChatPriority`, `cardType`, `guardLevel`, `cardTitle`, `cardMark`, `cardFields`, `displayName`, `normalizeBadges`.

### 1.20 Virtual range + measurement ([custom-chat-dom.ts:1036-1069](../src/lib/custom-chat-dom.ts#L1036-L1069))
- `virtualRange()` — wraps `calculateVirtualRange`.
- `measureRenderedRows()` — DOM read (`getBoundingClientRect`), updates `rowHeights`.

### 1.21 Render core ([custom-chat-dom.ts:1071-1247](../src/lib/custom-chat-dom.ts#L1071-L1247))
- `renderVirtualWindow(animateKeys?)` — DOM rebuild of `virtualItemsEl`.
- `scrollToVirtualIndex(index)` — DOM scroll.
- `clearMessages()` — clears every state structure + DOM.
- `restoreFrozenScrollPosition()` — DOM scroll.
- `rerenderMessages(options?)` — synchronous full rerender.
- `requestChatFrame()`, `runScheduledRerender(rerender)`, `scheduleRerenderMessages(options?)`, `flushRenderQueue()`, `scheduleRender(event)`.
- **The single shared RAF dispatcher lives here.** [CLAUDE.md](../CLAUDE.md) line 66 explicitly forbids parallel RAF loops; this scheduler MUST stay where it is unless a future PR replaces it wholesale.

### 1.22 Composer ([custom-chat-dom.ts:1249-1273](../src/lib/custom-chat-dom.ts#L1249-L1273))
- `sendFromComposer()` — async, calls `sendManualDanmaku`.
- `updateCount()`, `syncComposerFromStore()`.

### 1.23 Native-element hide / sibling visibility ([custom-chat-dom.ts:1275-1330](../src/lib/custom-chat-dom.ts#L1275-L1330))
- `isNativeSendBox(el)`, `isNativeChatHistory(el)`, `applyHide(el, shouldHide)`, `hideSiblingNativeElements(hideSendBox, hideNative)`, `updateNativeVisibility()`.
- All DOM mutation. Comment on lines 1299–1306 documents intent ("gift/reward bar is intentionally left untouched").

### 1.24 Event debug overlay ([custom-chat-dom.ts:1332-1380](../src/lib/custom-chat-dom.ts#L1332-L1380))
- `appendDebugRow(parent, key, value)`, `showEventDebug(message, row, card, guard)`. Only used when `customChatPerfDebug.value` is on.

### 1.25 Root construction ([custom-chat-dom.ts:1382-1592](../src/lib/custom-chat-dom.ts#L1382-L1592))
- `createRoot()` — the second-largest function (~210 LOC). Builds the entire panel DOM tree, wires every listener, instantiates every shared element ref, mounts the Preact send-actions island via `mountSendActionsIsland`.

### 1.26 Style ensure ([custom-chat-dom.ts:1594-1604](../src/lib/custom-chat-dom.ts#L1594-L1604))
- `ensureStyles()` — wraps `ensureCustomChatStyles` from `custom-chat-style.ts`.

### 1.27 Native-prewarm bootstrap ([custom-chat-dom.ts:1606-1626](../src/lib/custom-chat-dom.ts#L1606-L1626))
- `bootstrapPrewarmFromNative(container)` — `@internal` test export. Iterates native event nodes, prewarms BOTH avatar URL forms (Bilibili-rendered + proxied). Comment explains the dual-prewarm rationale.

### 1.28 Mount / fallback mount ([custom-chat-dom.ts:1628-1700](../src/lib/custom-chat-dom.ts#L1628-L1700))
- `mount(container)` — primary path; binds observer to native chat history.
- `ensureFallbackHost()`, `mountFallback()`, `scheduleFallbackMount()` — fixed-position fallback when there is no native chat history container.

### 1.29 Native event observation ([custom-chat-dom.ts:1702-1789](../src/lib/custom-chat-dom.ts#L1702-L1789))
- `observeNativeEvents(container)` — initializes the MutationObserver, debounced scan, RAF flush; suspends observer when WS is `'live'`.
- `syncNativeObserverWithWsStatus()` — pause/resume observer based on WS health.
- **Both functions are tightly coupled to the WS status signal and to `live-ws-source.ts`'s `hasRecentWsDanmaku()` dedup. Treat as single unit; do not split inside this PR series.**

### 1.30 Event ingestion ([custom-chat-dom.ts:1791-1831](../src/lib/custom-chat-dom.ts#L1791-L1831))
- `addDomMessage(ev)` — converts `DanmakuEvent` from `subscribeDanmaku` into a `CustomChatEvent` and emits it via `emitCustomChatEvent` (which then re-enters via the subscription added in `startCustomChatDom`). Calls `hasRecentWsDanmaku` first to dedup.
- `addEvent(event)` — the main subscriber callback. Handles dedup, merge, push, prune, schedule render. **This is the single funnel for everything that lands in `messages[]`.**

### 1.31 Avatar preconnect ([custom-chat-dom.ts:1833-1851](../src/lib/custom-chat-dom.ts#L1833-L1851))
- `ensureAvatarPreconnect()` — `@internal` test export. Inserts `<link rel="preconnect">` for the two avatar hosts.
- `BILIBILI_NOFACE_URL` constant.

### 1.32 Lifecycle entry points ([custom-chat-dom.ts:1853-1982](../src/lib/custom-chat-dom.ts#L1853-L1982))
- `startCustomChatDom()` (exported) — installs styles, preconnect, signal effects (`disposeSettings`, `disposeComposer`), subscriptions to events / WS-status / native-DOM stream.
- `stopCustomChatDom()` (exported) — exhaustive teardown of every disposer/timer/observer/state structure listed above.

### 1.33 Exports
- Public: `startCustomChatDom`, `stopCustomChatDom`.
- `@internal` (tests only): `createAvatar`, `bootstrapPrewarmFromNative`, `ensureAvatarPreconnect`.

---

## 2. Risk classification by region

| § | Region | Risk | Notes |
|---|---|---|---|
| 1.1 | Imports & constants | **Green** | Constants are pure values. Move with the corresponding region. |
| 1.2 | Module-scope state | **Red** | Every other section reads/writes here. Cannot be relocated without changing the whole file's coupling story. Defer. |
| 1.3 | `refreshCurrentRoomEmoticons` | **Yellow** | Async; uses `emoticonRefreshToken`. Single use site. Could move with lifecycle, but no win in isolation. |
| 1.4 | `eventToSendableMessage` | **Green** | Pure; tiny. Trivial extract candidate. |
| 1.5 | AbortSignal probe + `addRootEventListener` + `makeButton` | **Yellow** | Pure-ish probe + cleanup-list state. `makeButton` is widely reused. Has subtle Safari/Violentmonkey behavior. |
| 1.6 | Event-key + dedup machinery | **Green** | All pure functions over `Pick<CustomChatEvent, …>` plus a couple of module Maps. Clean extract candidate IF the maps move with them; risk creeps to Yellow if the maps stay behind. |
| 1.7 | Merge logic | **Green** | All pure except `replaceMessage`. The four pure helpers (`chooseBetterName`, `mergeFields`, `bestMergedBadges`, `mergeDuplicateEvent`) are textbook extract candidates. |
| 1.8 | Stats / perf debug | **Yellow** | `recordEventStats` is pure-ish over module state; `updatePerfDebug` mutates DOM. Splitting risks confusion; keep together. |
| 1.9 | Reliability + display helpers | **Green** | All pure. `displayName`, `normalizeBadges`, `normalizedUserLevelBadge` ride on `parseBadgeLevel`/`formatBadgeLevel`/`usefulBadgeText`/`compactText` already in `custom-chat-native-adapter.ts`. **Strong extract candidate.** |
| 1.10 | Card / guard helpers | **Green** | All pure (`guardLevel`, `cardType`, `cardTitle`, `cardMark`, `formatAmount`, `cardFields`). Also strong extract candidate. |
| 1.11 | `createAvatar` | **Yellow** | DOM-building, but its `addRootEventListener` calls couple it to the listener controller. |
| 1.12 | Native health tracker | **Yellow** | Calls `updateWsStatus`. Pure helper `isNativeDomUnhealthy` already lives in the native adapter. |
| 1.13 | Visibility / search helpers | **Green** | Thin wrappers over already-extracted modules. |
| 1.14 | Follow-mode state machine | **Red** | Mutates `followMode`, `frozenSnapshot`, `unread` and reads `listEl.scrollTop`. Must stay close to render core. |
| 1.15 | Empty state + WS status UI | **Yellow** | DOM mutation; coupled to `currentWsStatus` and `nativeDomWarning`. |
| 1.16 | Match count, unread, scroll | **Yellow→Red** | `syncAutoFollowFromScroll` flips `followMode`. Don't split. |
| 1.17 | Pruning + row-height estimation | **Yellow** | `pruneMessages` mutates Maps; `rowHeight*` math is pure. |
| 1.18 | `refreshVisibleMessages` | **Green** | One-line wrapper. |
| 1.19 | `createMessageRow` | **Yellow** | Big DOM builder, but most of the logic it depends on is already pure (cards/badges/display name). After regions §1.9 + §1.10 extract, this becomes simpler to read. |
| 1.20 | Virtual range + measurement | **Yellow** | `measureRenderedRows` does layout reads. Already partially extracted into `custom-chat-virtualizer.ts`. |
| 1.21 | **Render core (incl. RAF dispatcher)** | **Red — defer entirely.** | [CLAUDE.md](../CLAUDE.md) line 66 forbids parallel RAF loops. Moving the dispatcher risks subtle ordering changes. The render-queue + dispatcher is the heart of the file's correctness; touching it in this effort is out of scope. |
| 1.22 | Composer | **Yellow** | Async `sendManualDanmaku` call + `fasongText` signal write. |
| 1.23 | Native-element hide / sibling visibility | **Green→Yellow** | Pure predicates (`isNativeSendBox`, `isNativeChatHistory`) and DOM mutation (`applyHide`, `hideSiblingNativeElements`, `updateNativeVisibility`). The predicates are clean extract candidates; the orchestrator stays. |
| 1.24 | Event debug overlay | **Green→Yellow** | Only fires when perf-debug toggle is on. Self-contained; could be lifted, but ROI is low. |
| 1.25 | `createRoot` | **Red** | The biggest single function. Heavy entanglement with every module-scope DOM ref. **Defer.** |
| 1.26 | `ensureStyles` | **Green** | Already a 6-line wrapper. Don't bother. |
| 1.27 | `bootstrapPrewarmFromNative` | **Yellow** | DOM scrape; tested via internal export. |
| 1.28 | Mount / fallback mount | **Red** | Lifecycle ordering — observer-disconnect → root-remove → fallback-host → createRoot → bootstrap-prewarm. Defer. |
| 1.29 | Native event observation | **Red** | Tightly coupled to WS status, RAF, debounce timer, and `live-ws-source.ts`'s `hasRecentWsDanmaku`. **Explicit non-goal #4** in the brief is "no render scheduling changes in the first extraction" — same constraint applies here. Defer. |
| 1.30 | Event ingestion | **Red** | `addEvent` is the funnel. Every dedup, merge, prune, render path runs through it. Defer. |
| 1.31 | Avatar preconnect | **Green** | Side-effectful but trivial. Self-contained. |
| 1.32 | Lifecycle entry points | **Red** | The whole purpose of this module is what `startCustomChatDom` / `stopCustomChatDom` orchestrate. Defer. |
| 1.33 | Exports | n/a | Re-export shape will need to be preserved. |

**Counted by status:** Green ≈ 8 regions, Yellow ≈ 9, Red ≈ 8. The first two PRs target Green only. PR #3 (proposed, not approved) would dip into a low-risk Yellow region.

---

## 3. Proposed module boundaries

Each new module follows the existing `custom-chat-*` prefix convention and lands in `src/lib/`.

### 3.1 `custom-chat-card-format.ts` (NEW — proposed)
**Holds:** §1.10 helpers. All pure, no DOM, no signals.
- `guardLevel(message)`
- `cardType(message)` (returns `'gift' | 'superchat' | 'guard' | 'redpacket' | 'lottery' | null`)
- `cardTitle(type, message, guard)`
- `cardMark(type, guard)`
- `formatAmount(message, card)`
- `cardFields(message, card, guard)`
- Plus the `CardType` union type alias (currently inlined as `NonNullable<ReturnType<typeof cardType>>`).

**Justification:** This whole region is pure data-shape inspection over `CustomChatEvent`. It has zero callers outside `custom-chat-dom.ts`. It is the cleanest, smallest, lowest-risk extraction in the file (~80 LOC). Tests are trivial — pass in `CustomChatEvent` fixtures, assert outputs.

### 3.2 `custom-chat-display.ts` (NEW — proposed)
**Holds:** §1.9 helpers.
- `displayName(message)`
- `shouldShowUserLevelBadge(message)`
- `normalizedUserLevelBadge(message, name?)`
- `normalizeBadges(message, name?)`

**Justification:** Same pattern as §3.1: pure functions over `CustomChatEvent` that ride on already-extracted helpers in `custom-chat-native-adapter.ts`. Independent of the card formatter — could land before or after §3.1.

### 3.3 `custom-chat-event-key.ts` (NEW — proposed, deferred to PR #3+)
**Holds:** §1.6 + the pure parts of §1.7.
- `eventKey(event)`, `eventKeyOf(message, cache)`, `messageKey(event)`.
- `chooseBetterName`, `mergeFields`, `bestMergedBadges`, `mergeDuplicateEvent`.

The maps (`recentEventKeys`, `eventKeyByMessage`, `messageByEventKey`) stay in `custom-chat-dom.ts` as instance state; the helpers take them as arguments. **This is the boundary that turns Yellow into Red if mishandled.** Defer until §3.1 + §3.2 ship and prove the pattern works.

### 3.4 What stays in `custom-chat-dom.ts`
After PRs #1 + #2 (the only ones in scope for this audit), the file still owns:
- All module-scope state (§1.2).
- AbortSignal listener machinery (§1.5).
- The render core + RAF dispatcher (§1.21) — non-negotiable.
- `createRoot`, `mount`, `mountFallback`, `observeNativeEvents`, `addEvent`, `addDomMessage`, `startCustomChatDom`, `stopCustomChatDom`.
- All DOM-builder functions: `createAvatar`, `createMessageRow`, the toolbar/menu/composer setup inside `createRoot`.

Expected file size after PRs #1 + #2: roughly **1,800 LOC** (vs. 1,982 today; ~9% reduction). The point of this work is **not** to make the file small. It is to lift testable, pure logic out so that future, riskier work can be done with clearer seams.

---

## 4. Suggested PR sequence

Each PR must touch exactly one extraction, be revertable as a single squash, pass `bun run release:check` standalone, and document bundle delta.

### PR #1 — Extract `custom-chat-card-format.ts`
- **Net diff target:** under 200 LOC (mostly moves; `custom-chat-dom.ts` shrinks by ~80 lines, new file gains ~95 lines including imports/types/JSDoc).
- **Imports added to dom.ts:** one (the new module).
- **Risk:** Green only. No DOM, no signals, no listener, no scheduler.
- **What stays unchanged:** `createMessageRow` still calls `cardType`/`cardTitle`/`cardMark`/`cardFields` exactly as before; just from a different module.

### PR #2 — Extract `custom-chat-display.ts`
- **Net diff target:** under 150 LOC.
- **Risk:** Green only.
- **Depends on PR #1?** No — independent. Could swap order if reviewer prefers.

### PR #3 (proposed; **needs separate approval**) — Extract `custom-chat-event-key.ts`
- **Net diff target:** under 250 LOC.
- **Risk:** Yellow. Pure functions, but the dedup state Maps stay behind, so the pure helpers must accept caches/maps as parameters.
- **Why later, not in this PR series:** if PR #1/#2 expose any unexpected coupling (test infrastructure, bundle growth, biome ordering quirks), we want to find that out before touching anything that runs on every event.

### PR #4+ — None in scope
The audit explicitly defers everything else. Render core, mount/fallback, observer, lifecycle, `createRoot`, `createMessageRow`, `addEvent`: all stay. Phase-2 of this audit (a future re-audit, not this branch) can revisit them.

---

## 5. Test plan

### 5.1 PR #1 — `tests/custom-chat-card-format.test.ts`
Modeled after [tests/custom-chat-virtualizer.test.ts](../tests/custom-chat-virtualizer.test.ts):
- `guardLevel` — covers each of "总督" / "提督" / "舰长" detection in `text`, `badges`, and `rawCmd`.
- `cardType` — every kind path; default `null`.
- `cardTitle` — superchat with/without amount; gift with/without amount; redpacket; lottery; guard 1/2/3.
- `cardMark` — all six branches.
- `formatAmount` — superchat (yuan), gift (milliyuan), guard (milliyuan), no amount → `''`. Note the dead branch on line 557 (`if (card === 'gift' || card === 'guard') return …`) — this should be reported as an out-of-scope finding (see §11) but **not** fixed in this PR.
- `cardFields` — gift fallback parser (`x N` regex), guard fallback (`(\d+)月` regex), pre-existing fields short-circuit.

### 5.2 PR #2 — `tests/custom-chat-display.test.ts`
- `displayName` — handles "匿名", strips medal prefixes, applies `cleanDisplayName`, falls back to "匿名" for bad names.
- `normalizedUserLevelBadge` — only fires for `kind === 'danmaku'`, picks first `LV` badge.
- `normalizeBadges` — dedups, drops badges that match `name`, caps at `maxOtherBadges`, appends user-level badge.

### 5.3 No `mock.module(...)` of internal modules
Per the brief and project memory ([feedback_bun_test_mocks.md](../../.claude/projects/C--Users-eric-ai-OneDrive-Code-Github-chatterbox/memory/feedback_bun_test_mocks.md) — auto-loaded). The proposed extracts are **all pure functions over `CustomChatEvent`**, so no DI seams are needed for PR #1 or #2. Tests construct fixture objects directly.

If PR #3 lands, the dedup tests will need the `recentEventKeys`/`eventKeyByMessage` Maps passed as arguments; that is a parameterization change, not a `mock.module` workaround.

### 5.4 Targeted run, not full suite
Per [feedback_test_scope.md](../../.claude/projects/C--Users-eric-ai-OneDrive-Code-Github-chatterbox/memory/feedback_test_scope.md): each PR runs **the new test plus its adjacent neighbors** (`tests/custom-chat-render.test.ts`, `tests/custom-chat-virtualizer.test.ts`, `tests/custom-chat-search.test.ts`, `tests/custom-chat-dom-lifecycle.test.ts`, `tests/custom-chat-events.test.ts`) — not `bun test` of the whole `tests/` directory. `release:check` runs the full suite anyway as the final gate.

---

## 6. Manual Bilibili Live smoke test checklist

Run these in a real Bilibili live room with the userscript freshly built and installed (`bun run build`, then point Tampermonkey at `dist/bilibili-live-wheel-auto-follow.user.js`).

### 6.1 Panel + tabs
- [ ] Floating panel mounts.
- [ ] Tabs `发送 / 同传 / 设置 / 关于` switch correctly; no console errors.

### 6.2 Custom Chat replaces native chat
- [ ] Chatterbox Chat panel mounts in place of native chat history.
- [ ] Bilibili's native chat panel is hidden when Custom Chat is enabled.
- [ ] Disabling Custom Chat in 设置 restores Bilibili's native panel.
- [ ] Message order matches what arrives on the wire (oldest top, newest bottom).
- [ ] Timestamps render in HH:MM zh-CN format.
- [ ] Usernames render correctly; medals/badges appear next to usernames.

### 6.3 Themes
- [ ] iMessage Dark — bubbles, colors, spacing match expectation.
- [ ] iMessage Light — bubbles, colors, spacing match expectation.
- [ ] Compact Bubble — denser spacing, smaller fonts.
- [ ] Milk-green preset (from [src/lib/custom-chat-presets.ts](../src/lib/custom-chat-presets.ts)) — selectable in 设置, applies on toggle.

### 6.4 Auto-follow + frozen mode
- [ ] Newly arriving messages auto-scroll to bottom while at bottom.
- [ ] Scrolling up triggers `frozenByScroll`: bottom button shows unread count.
- [ ] Pressing 暂停 triggers `frozenByButton`: button label flips to 恢复跟随.
- [ ] Tapping 回到最新 ↓ scrolls to bottom and resumes following.

### 6.5 Search
- [ ] Search input filters messages by free text.
- [ ] `user:NAME` filter works.
- [ ] `kind:gift` filter works; misspelled kinds show suggestion hint.
- [ ] Negative tokens (`-词`) work.
- [ ] Match count `N/M` updates on each keystroke (debounced 120ms).

### 6.6 Per-message actions
- [ ] 偷 button on a danmaku copies + drops into send box.
- [ ] +1 button repeats, with `danmakuDirectConfirm` honored.
- [ ] 复制 button copies the message text to clipboard.
- [ ] User-blacklist toggle on a username (via Bilibili's danmaku context menu, exposed by [src/lib/user-blacklist.ts](../src/lib/user-blacklist.ts)) succeeds; blacklisted UID stops triggering 自动跟车.

### 6.7 Native DOM fallback path
- [ ] In DevTools, switch the network panel to **Offline** to kill the WS connection.
- [ ] Verify within 2.5s the chat panel either stays mounted (if native history exists) or remounts to the fallback host (fixed-position bottom-right corner).
- [ ] New native danmaku still flow into the chat (via `observeNativeEvents` MutationObserver scan).
- [ ] WS status indicator flips to `直连异常，使用页面兜底，可能漏消息` or `直连已断开…`.
- [ ] Reconnect (set DevTools back to **No throttling**), verify status flips to `实时事件源正常` and observer suspends.

### 6.8 Long-session behavior
- [ ] Leave the room running 30+ minutes.
- [ ] Verify `messages.length` never exceeds `CUSTOM_CHAT_MAX_MESSAGES` (220) — open DevTools, evaluate `document.querySelector('#laplace-custom-chat .lc-chat-message')?.parentElement?.children.length`.
- [ ] Memory: take heap snapshots at t=0 and t=30min in DevTools → Performance Monitor; growth stays bounded (no monotonic climb).
- [ ] Avatar prewarm cap (2000) honored — `prewarmedAvatars` size stays ≤ 2000 (debug via DevTools).

### 6.9 Auto-follow event coupling
- [ ] In a target room with repeating danmaku, 自动跟车 still triggers correctly.
- [ ] Verify by reading the **send tab** status — `autoBlendStatusText` should flip to `观察中` → `跟车中` as expected.
- [ ] Confirm both DOM-source and WS-source danmaku feed the trend ([auto-blend.ts:640-647](../src/lib/auto-blend.ts#L640-L647)).

### 6.10 Composer
- [ ] Type a danmaku, Enter sends. Shift+Enter inserts newline.
- [ ] Empty / over-length send is rejected gracefully (existing behavior).
- [ ] After successful send, textarea clears, `fasongText` signal clears.

**The maintainer should record results inline in the PR description** with `[x]` for verified, `[ ]` for skipped, with one-line notes on any deviation.

---

## 7. Bundle size check instructions

Before any PR is opened, capture the baseline (already done at the top of this doc). For each PR:

```bash
# 1. Capture pre-PR baseline (run on master before checkout)
bun run build
ls -l dist/bilibili-live-wheel-auto-follow.user.js | awk '{print $5}' > /tmp/baseline.txt
cat /tmp/baseline.txt
# Should print 972914 (or close — varies by hash & date)

# 2. Apply the PR (in a worktree or branch)
bun run build
ls -l dist/bilibili-live-wheel-auto-follow.user.js | awk '{print $5}'

# 3. Compute delta
echo "Delta: $(($(stat -c %s dist/bilibili-live-wheel-auto-follow.user.js) - $(cat /tmp/baseline.txt))) bytes"

# 4. Run the canonical gate
bun run release:check
```

**Hard rule:** any PR that grows the bundle by more than 2 KB requires a written justification in the PR description. A re-export-only barrel module is **not** acceptable — it defeats tree-shaking.

**Diagnostic:** if PR #1 grows the bundle non-trivially and PR #2's growth is similar, the cause is likely the new module's TypeScript helpers landing in the userscript bundle without being inlined. Use [scripts/analyze-bundle.mjs](../scripts/analyze-bundle.mjs) for raw/gzip/brotli breakdown.

---

## 8. Rollback strategy

| PR | Revert command | Resulting state | Manual verification needed |
|---|---|---|---|
| #1 | `git revert <PR#1-squash-sha>` | `custom-chat-dom.ts` reabsorbs the card formatter; `custom-chat-card-format.ts` deleted; tests file deleted. | Re-run `bun run release:check`. Smoke-test §6.2, §6.6 (where card formatting renders). |
| #2 | `git revert <PR#2-squash-sha>` | Same shape as #1 but for display helpers. | Re-run `bun run release:check`. Smoke-test §6.2 specifically (display name + badges). |

**Both PRs revert cleanly.** Each is a pure additive-then-redirect: it creates a new file, swaps the import line in `custom-chat-dom.ts`, and the old definitions disappear. There is no interface shape change in either direction, so revert order does not matter.

If both PRs land and only #1 needs reverting, that is also clean: PR #2 does not depend on PR #1's module.

If PR #3 lands later (separate approval), it will likely depend on PR #1 + #2 being in place — a clean revert of PR #3 is straightforward, but reverting #1 or #2 *after* #3 lands would require reverting #3 first. **This dependency is documented now so the maintainer can decide whether to accept it later.**

---

## 9. Hard non-goals (re-stated for the record)

For the avoidance of doubt, here is what this branch **will not do**, even when "obvious":

1. No UI/UX changes; pixel output unchanged.
2. No feature changes — no additions, no removals.
3. No event-ordering changes; `subscribeCustomChatEvents` / `subscribeDanmaku` dispatch sequence unchanged. Auto-follow ([auto-blend.ts:640-647](../src/lib/auto-blend.ts#L640-L647)) sees identical data.
4. No render-scheduling changes — RAF dispatcher and debounced native-DOM scan stay where they are.
5. No broad rewrite — extracted code is moved verbatim where possible. Biome reformats only.
6. No opportunistic cleanup outside the target file and its directly extracted modules. (Findings noted in §11.)
7. No new runtime dependencies. No new packages.
8. No `mock.module(...)` of internal project modules in tests. DI hooks if needed.
9. No version bump, no `GREASYFORK_RELEASE_NOTES.md` edits.
10. No edits to `live-ws-source.ts`, `auto-blend.ts`, `auto-blend-events.ts`, `store-*.ts`, or anything in `src/components/`.

---

## 10. What this audit will be judged against

A maintainer reading PR #1 should be able to:

1. Skim the new `custom-chat-card-format.ts` and confirm every function is a verbatim move from `custom-chat-dom.ts` (no logic changes).
2. Skim the diff of `custom-chat-dom.ts` and see only:
   - One new import line.
   - Six removed function definitions.
   - Zero changes to `createMessageRow`, `addEvent`, the RAF dispatcher, listeners, or any state.
3. Run `bun run release:check` and see green.
4. Run the §6 smoke checklist in <15 minutes and see no regressions.
5. Read the PR description's bundle delta line and see growth ≤ 2 KB (and ideally ≤ 0).

If any of those five items wobble, the PR is rejected and the audit is wrong somewhere — the maintainer should push back and we iterate on this plan rather than on the code.

---

## 11. Out-of-scope findings (do NOT fix in this branch)

Surfaced during audit; flagged here so they don't get lost. Each one belongs in a separate, future task.

1. **Dead branch in `formatAmount`** ([custom-chat-dom.ts:556-558](../src/lib/custom-chat-dom.ts#L556-L558)): the second `if (card === 'gift' || card === 'guard')` is unreachable because the first one always returns. Likely a leftover from a refactor. Should be removed in a separate one-line PR with its own bundle-delta receipt.
2. **`isNativeChatHistory`'s third clause** ([custom-chat-dom.ts:1281-1287](../src/lib/custom-chat-dom.ts#L1281-L1287)) does a substring match on `el.className`; this is fragile against Bilibili DOM shape changes. No action proposed; just noting that this is the kind of brittle DOM tuning [CLAUDE.md](../CLAUDE.md) line 138 warns against.
3. **`searchInput` debounce timer leaks on stop** ([custom-chat-dom.ts:1438-1448](../src/lib/custom-chat-dom.ts#L1438-L1448)): if `stopCustomChatDom` runs while `searchInputTimer` is queued, the timer fires against a null `searchInput`. Mostly harmless because the callback null-checks via optional chaining, but would warrant tightening.

These are observations, not commitments. Do not fix in this branch.

---

## 12. What to do next

1. Maintainer reviews this document.
2. Maintainer either:
   - Approves PR #1 explicitly: "proceed with PR #1" — work begins.
   - Pushes back on any section above — we iterate on this document, not on code.
3. PR #1 ships, smoke-tested, bundle-measured.
4. **Do not auto-proceed to PR #2.** Wait for an explicit "proceed with PR #2."
5. Repeat for each subsequent PR.

End of Phase-1 audit.

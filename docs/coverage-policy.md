# Coverage Policy

This document formalizes which `src/` code is excluded from the coverage target, why, and what "good enough" looks like on the remaining (non-whitelisted) set. It is the deliverable from §5 of the SDET coverage audit.

Code that is excluded must be *genuinely untestable in `bun test --isolate` + happy-dom*, not just "we haven't gotten around to it." See the [PR review checklist](#how-to-add-to-the-whitelist) before adding to the list.

## Status quo

Baseline (run `bun test --isolate --coverage tests` from `chatterbox/`):

- 1026 tests, 0 failing, 0 skipped
- bun text reporter "All files": **87.18% funcs / 92.98% lines** — this is an *unweighted average across all instrumented files* (test fixtures included), so it skews high because there are many tiny 100%-covered helper modules
- lcov line-weighted aggregate over `src/` only: **84.44% funcs / 75.62% lines** (FNF=874, FNH=738; LF=9610, LH=7267) — what codecov ranks against

Both metrics are tracked because they answer different questions: the unweighted file-average is what the SDET audit baseline uses; the line-weighted lcov number is what the codecov gate consumes.

## Post-whitelist target

| metric | scope | target | reasoning |
| --- | --- | --- | --- |
| `% funcs` | unweighted file avg over non-whitelisted `src/` | **≥ 90%** | matches audit §5 |
| `% lines` | unweighted file avg over non-whitelisted `src/` | **≥ 95%** | matches audit §5 |
| `% funcs` | line-weighted (lcov) over non-whitelisted `src/` | **≥ 87%** | secondary check; codecov gate |
| `% lines` | line-weighted (lcov) over non-whitelisted `src/` | **≥ 82%** | secondary check; codecov gate |

These targets are aspirational — the whitelist alone does not get there (see [Projected post-whitelist coverage](#projected-post-whitelist-coverage)). The remaining gap closes by testing files in [Considered but rejected](#considered-but-rejected). The whitelist's job is to make sure the gap that's left is real engineering work, not noise from genuinely-untestable lines.

## Whitelist (file-level)

Excluded entirely. Each entry: `path` | `reason` | `covered-by-instead`.

| path | reason | covered-by-instead |
| --- | --- | --- |
| [src/lib/md5.ts](../src/lib/md5.ts) | Vendored algorithm. Branch coverage of the bit-twiddling inner loop is brittle (one extra unrolled round flips % wildly). | [tests/wbi-pure.test.ts](../tests/wbi-pure.test.ts) drives `md5()` through the WBI signing path with known hash vectors — if md5 broke, WBI signing would fail loudly. |
| [src/lib/fetch-hijack.ts](../src/lib/fetch-hijack.ts) | Patches `Response.prototype.json` and `Response.prototype.text` *at module load* via an IIFE. Importing it from any test contaminates the runtime for every other test in the same isolate. | None directly. Behaviour is exercised by manual smoke testing on Bilibili Live; the file has no internal logic worth unit-testing — `shouldHijackUrl` and `applyTransforms` are 5-line predicates that are visible to a reviewer. If logic grows here, extract pure helpers into a sibling file (cf. `live-ws-helpers.ts`) and test those. |
| [src/components/emote-picker.tsx](../src/components/emote-picker.tsx) | Depends on the live Bilibili emote panel API + iframe positioning. happy-dom does not implement the layout primitives needed for the popover anchor math, and the Bilibili API responses are not stable enough to fixture meaningfully. | E2E only. The pure positioning math is in [src/lib/emote-picker-position.ts](../src/lib/emote-picker-position.ts) (covered 100/100 by [tests/emote-picker-position.test.ts](../tests/emote-picker-position.test.ts)). |
| [src/components/ui/alert-dialog.tsx](../src/components/ui/alert-dialog.tsx) | Portal + focus trap + Escape stack. happy-dom's behaviour for focus management and `<dialog>` semantics diverges from real browsers — tests that pass here can still misbehave for users, and tests that fail here can still be correct. False signal either way. | Visual review on Bilibili Live + manual keyboard-trap testing during release smoke. |

## Whitelist (sub-file)

Mark only the listed line ranges with `/* c8 ignore start */ … /* c8 ignore end */`. The rest of the file stays in the coverage denominator and contributes to the target.

> Sub-file markers are *not* in the source — see [Tooling](#tooling). Bun 1.3.13's `--coverage` does not honor `/* c8 ignore */` comments ([oven-sh/bun#7662](https://github.com/oven-sh/bun/issues/7662)), so adding markers would be inert. The ranges below stay listed as the canonical record of intent for when Bun gains support or we wrap with `c8`.

| path | line range | reason | covered-by-instead |
| --- | --- | --- | --- |
| [src/lib/wbi.ts](../src/lib/wbi.ts) | **53–105** (the entire IIFE) | Patches `XMLHttpRequest.prototype.open` and `.send` at module load. Same prototype-pollution problem as `fetch-hijack.ts`. | The double-wrap sentinel is asserted in [tests/wbi-sentinel.test.ts](../tests/wbi-sentinel.test.ts); the diagnostics counters (`parseFailures`, `extractMisses`) are exercised in [tests/wbi-diagnostics.test.ts](../tests/wbi-diagnostics.test.ts); the pure `extractWbiKeys` + `encodeWbi` + `md5`-based mixer get full coverage in [tests/wbi-pure.test.ts](../tests/wbi-pure.test.ts). The IIFE itself is just the wiring that calls those tested helpers from XHR events. |
| [src/lib/live-ws-source.ts](../src/lib/live-ws-source.ts) | **486–493** (the `createWebSocket` factory inside `connect()`) | Lines 487–493 are `WebSocket` `close`/`error` listeners that only fire on real socket teardown. Faking them via factory override would just be re-asserting that we register the listeners — no behavioural value. | `lastWsCloseDetail` formatting is in [src/lib/live-ws-helpers.ts](../src/lib/live-ws-helpers.ts) at 100/100, tested by [tests/live-ws-helpers.test.ts](../tests/live-ws-helpers.test.ts). |
| [src/lib/live-ws-source.ts](../src/lib/live-ws-source.ts) | **539–562** (`ensureVisibilityRecoveryWired` body) | `visibilitychange` recovery uses `document.visibilityState`, OS-throttled `setTimeout`, and bfcache transitions. The decision predicate is `shouldForceImmediateReconnect`, which is pure and covered. The wiring around it is non-deterministic. | `shouldForceImmediateReconnect` is covered in [tests/live-ws-source.test.ts](../tests/live-ws-source.test.ts). |

## Projected post-whitelist coverage

Methodology: take the lcov record for each whitelisted file, subtract its `LF`/`LH`/`FNF`/`FNH` from the `src/` totals. Sub-file ranges are estimated by counting the literal line span (`53-105` = 53 lines) and the executable lines reported in the bun text reporter's "Uncovered Line #s" column.

```
Baseline (src/ only, line-weighted):
  LF=9610  LH=7267  → lines 75.62%
  FNF=874  FNH=738  → funcs 84.44%

Whitelist removes:
  emote-picker.tsx          LF=306  LH=20    FNF=3   FNH=0
  alert-dialog.tsx          LF=103  LH=4     FNF=2   FNH=0
  md5.ts                    LF=115  LH=115   FNF=11  FNH=11
  wbi.ts IIFE 53–105        LF=53   LH=17    FNF=2   FNH=0   (estimated)
  live-ws-source.ts ranges  LF=32   LH=0     FNF=3   FNH=0   (estimated)
  ────────────────────────────────────────────────────────
  total dropped             LF=609  LH=156   FNF=21  FNH=11

Projected (src/ only, line-weighted):
  LF=9001  LH=7111  → lines 79.00%
  FNF=853  FNH=727  → funcs 85.23%
```

Translated to the unweighted file-average metric the audit baselines against:

```
Baseline:                   funcs 87.18%   lines 92.98%
After dropping 3 files:     funcs 88.08%   lines 92.96%   (md5 was 100/100, doesn't help; emote-picker and alert-dialog were drags)
After sub-file improvements:
  wbi.ts                    72.09 → 100% lines, 88.24 → 100% funcs
  live-ws-source.ts         88.94 → 95.71% lines, 89.80 → 95.65% funcs
                            ────────────────────────────
Projected (3 files dropped + 2 files improved): funcs 88.18%   lines 94.12%
```

The whitelist alone gets to roughly **88% funcs / 94% lines** (unweighted file avg). The remaining gap to the 90/95 target is real test work, listed under [Considered but rejected](#considered-but-rejected).

## Considered but rejected

These files are below the target but were *not* whitelisted because they are testable — they're flagged for follow-up sprints, not declared off-limits.

| path | current funcs / lines | why testable |
| --- | --- | --- |
| [src/components/auto-blend-controls.tsx](../src/components/auto-blend-controls.tsx) | 19.23 / 55.56 | Preact + signals UI; renders without DOM-positioning primitives. Standard `@preact/test-utils` setup applies. |
| [src/components/send-actions.tsx](../src/components/send-actions.tsx) | 0 / 29.51 | 77 lines, button handlers wired to `appendDanmaku`. No DOM weirdness. |
| [src/components/settings/medal-check-section.tsx](../src/components/settings/medal-check-section.tsx) | 7.14 / 4.98 | 700-line UI but logic is plain signal reads + `api.ts` calls (which are already mocked). The bulk of uncovered lines is render JSX, which renders fine in happy-dom. |
| [src/components/shadow-bypass-chip.tsx](../src/components/shadow-bypass-chip.tsx) | 66.67 / 31.73 | Mostly testable. The `findComposerAnchor` block (offsetParent / getBoundingClientRect) is happy-dom-fragile but lives in ~30 lines that could be sub-file-whitelisted *if* we end up writing tests for the rest first and find that block still uncovered. |
| [src/lib/app-lifecycle.ts](../src/lib/app-lifecycle.ts) | 33.33 / 20.16 | Side-effect glue. Each effect is testable in isolation by invoking the exported wiring function with stubbed signals. The current 0 tests against it is the gap. |
| [src/lib/meme-sources.ts](../src/lib/meme-sources.ts) | 37.50 / 27.63 | `fetch`-driven; existing `gm-fetch` test pattern (`_setGmXhrForTests` DI) applies. |
| [src/lib/custom-chat-native-adapter.ts](../src/lib/custom-chat-native-adapter.ts) | 66.67 / 48.99 | DOM scanning of native B站 chat. happy-dom handles the queries used. |
| [src/lib/custom-chat-interaction.ts](../src/lib/custom-chat-interaction.ts) | 50 / 44.44 | 11 lines. Just needs the test to exist. |
| [src/lib/store-replacement.ts](../src/lib/store-replacement.ts) | 100 / 73.68 | Module-init block (lines 10–14) reads from GM storage. A fresh `_gm-store` reset per test would cover it. |
| [src/lib/danmaku-actions.ts](../src/lib/danmaku-actions.ts) | 75 / 75.90 | Pure logic + `api.ts` calls. |
| [src/lib/store-hzm.ts](../src/lib/store-hzm.ts) | 68.42 / 90.78 | Persistence + signal wiring. |
| [src/lib/moderation.ts](../src/lib/moderation.ts) | 91.67 / 79.19 | Heuristic shadow-ban *display* (not probability — the probability code in `shadow-learn.ts` and `shadow-suggestion.ts` is already 100/100). |
| [src/lib/ai-evasion.ts](../src/lib/ai-evasion.ts) | 100 / 89.71 | The audit pre-listed this as "stochastic LLM branches", but the actual uncovered lines (217–219, 222–224) are deterministic *post-replacement* error returns ("evaded message empty", "evaded message is locked emoticon"). Both are reachable with fixtures. The genuinely-stochastic LLM call is mocked at the `llm-driver` boundary, which is already 100/98.74. |

## How to add to the whitelist

PR review checklist for any change that adds an entry to the lists above or adds `/* c8 ignore */` markers in code:

1. **Genuinely untestable.** The reviewer must see at least one of:
   - Mutates a global prototype (`XMLHttpRequest`, `Response`, `WebSocket`, `Element`, etc.) at module load.
   - Depends on a layout / focus / `<dialog>` primitive that happy-dom does not faithfully implement (cite the missing primitive).
   - Depends on a non-deterministic timing source (real socket close events, `visibilitychange`, OS throttling) where a fake would just be re-asserting the wiring.
   - Vendored third-party code where line-coverage is brittle.
2. **Alternative coverage path exists.** Either pure helpers carved out and tested in a sibling file, *or* explicit acknowledgement that this region is covered by manual smoke / E2E only.
3. **Not a way to dodge writing tests.** If a reviewer can describe in one paragraph how to test the code with the existing test harness, it does not belong on the whitelist — flag it under [Considered but rejected](#considered-but-rejected) instead.
4. **Sub-file ranges are minimal.** Whitelist the smallest contiguous block that captures the untestable wiring. Do not whitelist a whole file when only an IIFE is the problem (cf. `wbi.ts`).
5. **Linked rationale.** Each entry cites the specific tests / helpers that cover the rest of the file's behaviour, so a future reader can tell if the policy is still load-bearing.

Removing entries follows the same review: if the constraint that justified the whitelist no longer holds (e.g. happy-dom upgraded, code refactored to no longer touch the prototype), drop the entry and add the missing tests.

## Tooling

Two enforcement layers were planned. Layer 1 has landed; layer 2 is blocked on Bun.

1. **`codecov.yml ignore` (landed)** — file-level whitelist entries. The four files are appended to the existing `ignore:` block in [codecov.yml](../codecov.yml); Codecov filters the uploaded LCOV server-side and drops them from the project gate's denominator. Bun's local text reporter does *not* apply this filter, so the per-file rows still appear when running `bun test --coverage` locally — the gate that matters is codecov's.
2. **`/* c8 ignore start */ … /* c8 ignore end */` (blocked)** — sub-file ranges. The intent was to mark the IIFE in `wbi.ts` (lines 53–105) and the two ranges in `live-ws-source.ts` (486–493, 539–562). **Bun 1.3.13's `--coverage` does not honor c8 marker comments** — neither in the text reporter nor in the LCOV output (verified: lines between `/* c8 ignore start */` and `/* c8 ignore end */` still emit `DA:N,0` records). Tracking issue: [oven-sh/bun#7662](https://github.com/oven-sh/bun/issues/7662). Until that lands (or we wrap `bun test` with `c8`), the sub-file ranges remain in the coverage denominator. The line ranges above are the canonical record of intent and should be marked the moment Bun gains support; do not add inert markers in the meantime — they mislead readers into thinking exclusions are in effect.

Both layers were intended to land together; they will once Bun 1.3.13's gap closes.

The `bun run release:check` gate does not currently fail on coverage thresholds — it runs `bun test --isolate` (pass/fail only) and uploads to codecov. Tightening the gate to assert the targets in [Post-whitelist target](#post-whitelist-target) is a separate decision; this policy just makes the targets reviewable.

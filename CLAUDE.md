# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This repository builds a Bilibili Live userscript named `B站独轮车 + 自动跟车`. It is a fork of LAPLACE Chatterbox, packaged for Greasy Fork/Tampermonkey/Violentmonkey, and focuses on live-room danmaku workflows:

- auto-send loops (`独轮车`)
- repeated-danmaku auto-follow (`自动跟车`)
- Chatterbox Chat, a custom right-side live chat replacement
- fan-medal room mute/restriction inspection
- normal danmaku sending, +1/steal actions, replacement rules, AI evasion
- Soniox speech-to-text and meme list utilities

Most UI text is Chinese. Keep Markdown, HTML, and TypeScript files encoded as UTF-8.

## Development Commands

```bash
# Install dependencies
bun install

# Start development server
bun run dev

# Build production userscript and static release page
bun run build

# Preview production build
bun run preview

# Run all tests
bun test

# Focused checks
bun run test:auto-blend
bun run verify:auto-blend-ui
```

The build output is written to `dist/`. The main userscript output is `dist/bilibili-live-wheel-auto-follow.user.js`.

## Architecture Overview

### Core Structure

- `src/main.tsx` mounts the app at `document-start` after the document body is available.
- `src/components/app.tsx` is the main application shell.
- `src/components/configurator.tsx` renders the floating panel and tab content.
- `src/components/*` contains feature UI for sending, auto-send, auto-follow, STT, settings, logs, memes, and about.
- `src/lib/*` contains the userscript integrations, Bilibili API helpers, state, send queue, replacement logic, custom chat, and auto-follow runtime.
- `src/types.ts` contains TypeScript interfaces for Bilibili/live-room data.
- `public/index.html` is the GitHub Pages / release landing page. Keep its copy aligned with `README.md`.

### Key Modules

- `src/lib/store.ts` re-exports domain store modules and keeps only small cross-domain runtime glue. Add new persisted signals to the closest `store-*.ts` domain file instead of growing `store.ts`.
- `src/lib/emoticon.ts` owns emoticon lookup, locked-emoticon detection, and rejection log text. Do not reintroduce emoticon helpers into `store.ts`.
- `src/lib/loop.ts` handles auto-send loop behavior.
- `src/lib/auto-blend.ts`, `auto-blend-presets.ts`, `auto-blend-status.ts`, and `auto-blend-trend.ts` implement auto-follow detection, presets, status labels, and trend scoring.
- `src/lib/send-queue.ts` serializes send attempts and helps avoid overlapping danmaku sends.
- `src/lib/user-blacklist.ts` injects the auto-follow blacklist toggle into Bilibili's danmaku menu. Auto-follow must ignore blacklisted UIDs.
- `src/lib/danmaku-direct.ts` implements steal/+1 buttons beside chat messages.
- `src/lib/custom-chat.ts`, `custom-chat-dom.ts`, `custom-chat-events.ts`, `custom-chat-render.ts`, and `custom-chat-search.ts` implement Chatterbox Chat.
- `custom-chat-style.ts`, `custom-chat-virtualizer.ts`, `custom-chat-native-adapter.ts`, and `custom-chat-interaction.ts` hold extracted Custom Chat infrastructure. Keep future CSS, virtualization math, native DOM filtering, and button/a11y primitives there.
- `custom-chat-dom.ts` uses one shared RAF dispatcher for render/rerender work and debounces native DOM fallback scans. Keep new high-frequency UI work on that scheduler instead of adding standalone RAF loops.
- `src/lib/live-ws-source.ts` connects directly to Bilibili Live WebSocket events, with DOM fallback through the custom chat modules.
- `src/lib/api.ts` wraps Bilibili live APIs, including danmaku sending, room info, fan-medal rooms, and restriction checks.
- `src/lib/guard-room-sync.ts` supports optional sync of fan-medal inspection summaries to the external Guard Room project.
- `src/lib/replacement.ts` builds remote/local replacement maps.
- `src/lib/ai-evasion.ts` checks and rewrites blocked danmaku when AI evasion is enabled.
- `src/lib/wbi.ts` handles Bilibili WBI signing.
- `src/lib/fetch-hijack.ts` intercepts relevant requests early.
- `src/lib/auto-blend-events.ts` is the internal event/log bridge for auto-follow. Prefer emitting events there over adding direct `appendLog()` calls inside `auto-blend.ts`.
- `src/lib/log.ts` owns `appendLog()` plus `notifyUser(level, message, detail?)`. User-facing failures should use `notifyUser` instead of `alert()`.
- `src/lib/app-lifecycle.ts` keeps App-level side effects (panel styles, Custom Chat room rearm, optimized layout style) out of the Preact shell.

### UI Notes

- Main tabs are `发送`, `同传`, `设置`, and `关于`.
- Auto-send and auto-follow controls live inside the send tab.
- Fan-medal inspection, replacement rules, Chatterbox Chat settings, +1 mode, layout options, and log limits live in the settings tab.
- Chatterbox Chat themes include iMessage Dark, iMessage Light, Compact Bubble, plus the milk-green iMessage CSS preset in `src/lib/custom-chat-presets.ts`.
- Keep the floating panel compact: it is meant to sit inside Bilibili Live's right-side area.
- Panel styling now uses a mix of legacy `cb-*` classes and UnoCSS `lc-*` utilities. UnoCSS is configured with a prefix and no global reset; never add unprefixed utility classes that could leak into Bilibili's page.

## State and Persistence

- Reactive state uses `@preact/signals`.
- Persistent settings use GM storage through `src/lib/gm-signal.ts`; do not move persistent userscript data into browser `localStorage`.
- Runtime-only state should remain signal-based and should avoid expensive synchronous work in hot paths.
- Long-running chat data structures have hard caps; preserve those caps when touching Chatterbox Chat performance code.

## Build Process

- Vite and `vite-plugin-monkey` package the userscript.
- TypeScript compilation runs before Vite in `bun run build`.
- Soniox SDK is loaded externally to keep the userscript smaller.
- `public/` assets are copied into `dist/` during build.

## CI and Release Distribution

- `bun run release:check` is the canonical local gate. It runs install, biome ci, tests, version-consistency, build, artifact validation, and bundle-budget. Run it before tagging anything; CI runs the same script.
- Pull requests and pushes to non-master branches are validated by `.github/workflows/ci.yml` (job name `validate`).
- Pushes to master that are NOT release commits deploy the GitHub Pages landing page via `.github/workflows/pages-deploy.yml`. Release commits (commit message starts with `Release `) are skipped here and handled by the tag workflow.
- `.github/workflows/release.yml` is tag-driven — it triggers on `v*` tag pushes and `workflow_dispatch`. It runs `release:check` plus a strict `--mode post --expected-tag` version-consistency check before deploying.
- Distribution to users is two-stage: GitHub Pages serves `dist/bilibili-live-wheel-auto-follow.user.js` (Tampermonkey/Violentmonkey installs read it directly), and Greasy Fork auto-syncs from the same URL on its own ~24h cycle. There is no Chrome Web Store or app-store review step — this is a userscript, not an extension.
- To make `scripts/release.ts` print the Greasy Fork URL at the end of a release, add a `"greasyfork": { "scriptId": "<id>" }` field to `package.json`. If the field is absent, the URL is just skipped.
- Branch protection for `master` is documented in [docs/branch-protection.md](docs/branch-protection.md). The required status check is `validate`.

## External Services

The script may call these services depending on enabled features:

- `api.live.bilibili.com` for live-room APIs and danmaku sending.
- `edge-workers.laplace.cn` for AI evasion checks.
- `workers.vrp.moe` for remote replacement rules and meme lists.
- `api.soniox.com` and `unpkg.com` for Soniox speech-to-text.
- A user-configured Guard Room endpoint for optional fan-medal inspection summary sync.

## Important Notes

- This is an unofficial userscript, not a Bilibili official feature.
- Be careful with automated sending behavior. Prefer conservative defaults, cooldowns, and clear UI state.
- Avoid unrelated refactors in this fork; many modules are tuned for Bilibili Live's changing DOM.
- When updating README/release-page copy, keep `README.md`, `public/index.html`, and generated `dist/index.html` in sync by running `bun run build`.

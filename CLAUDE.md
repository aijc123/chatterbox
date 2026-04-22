# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Bilibili Live userscript called "LAPLACE Chatterbox" that adds various danmaku (chat message) utilities to Bilibili Live streams. It's built as a userscript that runs in the browser and provides features like auto-send loops, 自动跟车, speech-to-text, meme lists, AI evasion, and more.

## Development Commands

```bash
# Install dependencies
bun install

# Start development server (watch mode)
bun run dev

# Build for production
bun run build

# Preview production build
bun run preview
```

The build output is written to `dist/` directory.

## Architecture Overview

### Core Structure
- **Main Entry Point**: `src/main.tsx` - Mounts the application and handles document-start initialization
- **App Component**: `src/components/app.tsx` - Main application container that renders all UI components
- **UI Components**: Located in `src/components/` - Various UI components for different features
- **Core Logic**: Located in `src/lib/` - Business logic for different features
- **State Management**: Uses `@preact/signals` for reactive state with GM persistence
- **Type Definitions**: `src/types.ts` - TypeScript interfaces for API responses and data structures

### Key Features & Modules
1. **自动跟车 (Auto-follow)**: `src/lib/auto-blend.ts` - Automatically follows repeated danmaku waves with conservative presets and cooldowns
2. **Danmaku Direct**: `src/lib/danmaku-direct.ts` - Direct danmaku sending functionality
3. **Speech-to-Text**: `src/lib/stt-tab.tsx` - Integrates Soniox speech-to-text API
4. **AI Evasion**: `src/lib/ai-evasion.ts` - Techniques to avoid AI detection
5. **Replacement System**: `src/lib/replacement.ts` - Text replacement rules
6. **WBI (Watermark Bypass)**: `src/lib/wbi.ts` - Handles Bilibili's anti-bot measures
7. **Send Queue**: `src/lib/send-queue.ts` - Manages message sending queue
8. **Logging**: `src/lib/log.ts` - Debug and activity logging

### State Management
- Uses `@preact/signals` for reactive state
- GM-persisted settings stored in browser's userscript storage
- Runtime state signals for temporary state
- Effects handle send-state persistence and 自动跟车 runtime lifecycle

### Build Process
- Uses Vite with `vite-plugin-monkey` for userscript packaging
- TypeScript compilation via `tsc`
- Production build creates a userscript file in `dist/`
- Externalizes Soniox speech-to-text library for smaller bundle size

### Key Dependencies
- `preact` - UI framework
- `@preact/signals` - Reactive state management
- `@soniox/speech-to-text-web` - Speech-to-text integration
- `vite-plugin-monkey` - Userscript build support
- `@laplace.live/internal` - Internal utility library

### Configuration
- Settings are persisted using GM (Greasemonkey) storage API
- Configuration stored in `src/lib/store.ts`
- Supports GM-persisted settings for send and 自动跟车 features
- Various toggles and settings for different features (auto-send, AI evasion, etc.)

### UI Structure
- **Toggle Button**: Main toggle for enabling/disabling the extension
- **Configurator**: Main settings panel with tabs for different features
- **Tabs**: Normal send, Auto-send, STT, Memes, About
- **Alert Dialog**: For displaying messages and notifications
- **Log Panel**: For viewing debug logs and activity

### API Integration
- Fetch hijacking via `src/lib/fetch-hijack.ts`
- Bilibili API integration for danmaku colors and emoticons
- WBI (Watermark Bypass Integration) for API authentication
- Soniox API for speech-to-text functionality

## Important Notes

- This is a userscript that runs at `document-start` to intercept early page loads
- The application mounts after the document body is available
- All persistent state is stored in GM storage, not browser localStorage
- The build process creates a userscript file compatible with Greasy Fork and userscript managers
- Features are modular and can be enabled/disabled individually through the UI

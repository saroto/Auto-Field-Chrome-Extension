## Project Overview

Auto-Field is a Chrome Extension (Manifest V3) that detects form fields on web pages and auto-fills them with saved profile data or random test data (magic fill). Built with TypeScript, bundled with esbuild.

## Architecture

- **Content Script** (`src/content/`) — Injected into all pages. Handles field detection, form filling, magic fill, toggle button UI, and keyboard shortcuts.
- **Popup** (`src/popup/`) — Extension popup UI. Profile management (create/delete/switch/export/import), field editing, and actions.
- **Shared** (`src/shared/`) — Types and constants shared between content script and popup.

### Key Files

- `src/content/services/fieldDetector.ts` — DOM traversal (Shadow DOM + iframe aware), label extraction, field info generation
- `src/content/services/formFiller.ts` — Fills fields from saved profile data via chrome.storage
- `src/content/services/magicFiller.ts` — Fills fields with random realistic test data
- `src/content/ui/toggleButton.ts` — Floating "A" button that appears on field focus
- `src/popup/services/popupService.ts` — Chrome storage API wrapper, profile CRUD, messaging
- `src/popup/ui/fieldRenderer.ts` — Renders detected fields as form inputs in the popup

### Communication

Popup sends messages (`GET_FIELDS`, `FILL_ALL_FIELDS`, `MAGIC_FILL`) to content script via `chrome.tabs.sendMessage`. Content script responds via `sendResponse`.

### Storage

- `profiles` — All profile metadata (`{ [profileId]: Profile }`)
- `activeProfile` — Currently selected profile ID
- `autofill_{profileId}_{fieldName}` — Individual field values

## Build & Development

```bash
npm install        # Install dependencies
npm run dev        # TypeScript watch mode
npm run build      # Compile TS + bundle with esbuild
npm run bundle     # esbuild only (minified IIFE bundles)
```

Output: `src/content/index.bundled.js` and `src/popup/index.bundled.js` (referenced by manifest.json).

**Always run `npm run build` after code changes** to update the bundled JS files that Chrome loads.

## Code Conventions

- TypeScript strict mode with `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- ES2022 target and module format, bundled to IIFE by esbuild
- Use `readonly string[]` instead of `as const` for constant arrays to avoid `as any` casts
- Use safe DOM construction (`textContent`, `createElement`) instead of `innerHTML` with user data to prevent XSS
- Use `CSS.escape()` when building selectors from field names
- Dispatch both `input` and `change` events after programmatically setting field values
- Font: Noto Sans Khmer (supports Khmer script), loaded from Google Fonts in `popup.html`

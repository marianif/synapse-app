# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Synapse App

Guidelines for agentic coding agents working in this repository.

---

## Project Overview

Expo-managed React Native app (iOS / Android / Web) using file-based routing via
`expo-router`. Key flags: React 19 Compiler (auto-memoization), New Architecture,
and typed routes.

### Sources of truth

- **PRODUCT.md** — strategy: users, purpose, brand personality, design principles, anti-references. Read before any UX decision.
- **DESIGN.md** — the "Field Lab" visual system: tokens (mirrors `constants/theme.ts`), component patterns, do's and don'ts. Read before any UI work.
- **BACKLOG.md** — the current product pivot ("the agenda that talks") with locked decisions and build phases.
- **`.impeccable/brand.md`** — the Field Lab brand brief the rebrand was built from (historical reference; DESIGN.md documents the as-built drift).

**Tech stack:** TypeScript · React 19 · Expo SDK 55 · expo-router v5 ·
React Navigation v7 · react-native-reanimated v4 · expo-sqlite · `@bacons/apple-targets`

---

## Commands

**Package manager: `bun`** (`bun.lock` is the committed lockfile — there is no
`package-lock.json` or `yarn.lock`). Use `bun install` / `bun add`; the `npm run`
and `npx` invocations below work but install deps with `bun`.

### Development

```bash
npx expo start            # Dev server (Expo Go or dev build)
npx expo start --ios      # Open on iOS simulator
npx expo start --android  # Open on Android emulator
npx expo start --web      # Open in browser
npm run ios               # Build and run on iOS simulator (native dev build)
npm run android           # Build and run on Android emulator (native dev build)
```

### Native Targets (iOS Widget & Watch)

The app uses `@bacons/apple-targets` to manage native extension targets (iOS widget, Apple Watch app, Watch widget). Any change to `targets/` or `modules/` requires a prebuild before Xcode picks it up.

```bash
npm run prewidget         # Prebuild with apple-targets template (required after targets/ changes)
npm run clean:ios         # Full DerivedData wipe + clean prebuild (use when prebuild alone isn't enough)
```

After `prewidget`, open `ios/synapseapp.xcworkspace` in Xcode and run from there. The `targets/` directory contains Swift source for each extension — do **not** edit generated files under `ios/` directly.

Targets and their bundle identifiers:
- `targets/widget/` — iOS home-screen widget (`dev.the-wedge.synapse-app` + App Group)
- `targets/watch/` — Apple Watch companion app (`dev.the-wedge.synapse-app.watch`)
- `targets/watch-widget/` — Watch complication widget (`dev.the-wedge.synapse-app.watch.watchwidget`)

Each target has an `expo-target.config.js` that configures type, bundle ID, entitlements, and accent color.

### Lint

```bash
npm run lint              # Run expo lint (ESLint flat config)
npx eslint . --fix       # Auto-fix linting issues
```

### Build

```bash
npx eas build --platform ios     # iOS production build
npx eas build --platform android # Android production build
```

### Tests

**No test framework configured.** When adding tests, prefer `jest` with
`jest-expo` preset:

```bash
npx jest                       # Run all tests
npx jest path/to/file.test.ts  # Run a single test file
npx jest -t "test name"        # Run tests by name
```

---

## Data Architecture

### Entry Types & Schema

Five entry types live in `lib/types.ts`: `todo`, `deadline`, `event`, `someday`, `idea`. Each maps to a `DbEntry` row with these key fields:
- `scheduled_date` / `scheduled_time` — when to do it
- `due_date` / `due_time` — when it's due (deadlines)
- `status` — `"scheduled" | "active" | "completed" | "pending" | "met" | "overdue"`
- `recurrence_rule` — JSON-serialized `RecurrenceRule` (see `lib/recurrence.ts`)

Recurring entries use a separate `recurrence_completions` table. Never mutate a recurring entry's base row for a single instance — use `completeRecurringInstance` / `skipRecurringInstance`.

Reflective notes live in a separate `diary_entries` table (body, optional mood, optional `linked_entry_id` FK to an idea entry, optional `linked_project_id` to a project) — deliberately isolated from the action board. Notes are never actionable and never appear on the home field.

### Database Layer

- `lib/database.ts` — raw SQLite helpers (`initDatabase`, `generateId`, query runners)
- `lib/schema.ts` — table definitions
- `lib/recurrence.ts` — serialize/deserialize recurrence rules, expand instances
- `lib/date-utils.ts` — date formatting helpers (dates stored as `DD/MM/YYYY` strings)
- `lib/notifications.ts` — `expo-notifications` scheduling layer (`scheduleEntryNotification`, `cancelNotificationForEntry`, `rescheduleAllEntries`). `DatabaseContext` keeps scheduled notifications in sync with entry mutations
- `contexts/database-context.tsx` — `DatabaseContext` + `DatabaseProvider`; the single source of truth for all entries in memory
- `hooks/use-database/use-database.ts` — thin wrapper around `DatabaseContext`; the only hook components should import

**Always consume data via `useDatabase()`**, not by importing context or SQLite directly.

### iOS Widget & Watch Sync

`DatabaseContext` calls `syncEntriesToWidget` after every mutation. It writes up to 10 entries to `ExtensionStorage` (App Group `group.dev.the-wedge.synapse-app`) and calls `ExtensionStorage.reloadWidget("entriesWidget")`. Any change to the entry model must stay compatible with this sync payload shape `{ id, title, status }`.

### Speech Recognition

A custom Expo native module (`modules/speech-recognizer/`) wraps iOS `SFSpeechRecognizer`. Use `useSpeechRecognizer()` from `hooks/use-speech-recognizer.ts` — it handles permissions, start/stop, and transcript streaming via the `onTranscriptUpdate` event. The module is iOS-only; a no-op web stub lives at `src/SpeechRecognizerModule.web.ts`.

### Watch Connectivity

A second custom Expo native module (`modules/watch-connectivity/`, depended on via the local path `watch-connectivity` in `package.json`) bridges iOS `WatchConnectivity` for bidirectional sync and voice capture between the phone app and the Apple Watch companion (`targets/watch/`). Like `speech-recognizer`, it ships an Expo plugin and Swift source under `src/`. Both native modules require a prebuild (`npm run prewidget`) before Xcode picks up changes.

---

## Directory Structure

```
synapse-app/
├── app/                        # Routes (expo-router file-based routing)
│   ├── _layout.tsx             # Root layout — Stack navigator + ThemeProvider
│   ├── modal.tsx               # Rich add/edit entry modal
│   ├── calendar.tsx            # Calendar view (monthly)
│   ├── detail.tsx              # Task/entry detail view (inline editing)
│   ├── list.tsx                # Full list view (all entries)
│   └── (tabs)/                 # Tab group (expo-router convention)
│       ├── _layout.tsx         # Tab navigator (custom tab bar, native bar hidden)
│       ├── index.tsx           # Home tab — the Field (STAKES + PRESENT zones)
│       └── notes.tsx           # Notes tab (feed + composer; notes link to projects or ideas)
│
├── components/                 # Shared UI components (Atomic Design)
│   ├── atoms/                  # Smallest building blocks
│   │   ├── counter-display.tsx # Large numeric display (hero counters)
│   │   ├── countdown-chip.tsx   # Time countdown badge
│   │   ├── day-cell.tsx        # Calendar day cell
│   │   ├── DateInput.tsx       # Date picker input
│   │   ├── entry-dot.tsx       # Colored status dot (6px)
│   │   ├── month-navigator.tsx # Month navigation arrows
│   │   ├── streak-badge.tsx    # Streak/persistence badge
│   │   ├── themed-text.tsx     # Themed text wrapper
│   │   ├── themed-view.tsx     # Themed view wrapper
│   │   └── TimeInput.tsx       # Time picker input
│   ├── molecules/              # Composed atoms
│   │   ├── bento-card-header.tsx
│   │   ├── detail-action-bar.tsx
│   │   ├── detail-metadata-row.tsx
│   │   ├── detail-someday-hero.tsx
│   │   ├── empty-state.tsx     # Empty list state
│   │   ├── entry-row.tsx       # Entry list row (no dividers)
│   │   ├── list-item.tsx       # Generic list item
│   │   ├── recurrence-picker.tsx
│   │   ├── someday-item.tsx    # Someday/maybe entry
│   │   ├── today-event-row.tsx # Today's event row
│   │   ├── week-strip.tsx      # Week strip row
│   │   ├── weekday-row.tsx     # Weekday header row
│   │   └── wrapup-card.tsx     # End-of-day summary card
│   ├── organisms/              # Complex UI sections
│   │   ├── agenda-section.tsx  # Agenda list section
│   │   ├── app-header.tsx      # Top navigation header
│   │   ├── app-menu.tsx        # App menu/drawer
│   │   ├── custom-tab-bar.tsx   # Custom tab bar
│   │   ├── day-detail-sheet.tsx # Day detail bottom sheet
│   │   ├── deadlines-card.tsx  # Deadlines bento card
│   │   ├── fab.tsx             # Floating action button
│   │   ├── list-progress.tsx   # Progress indicator
│   │   ├── list-screen-header.tsx
│   │   ├── month-grid.tsx      # Monthly calendar grid
│   │   ├── swipeable-row.tsx   # Swipeable list row
│   │   ├── today-section.tsx   # Today's entries section
│   │   ├── upcoming-preview-card.tsx
│   │   └── weekly-overview-card.tsx
│   ├── ui/                     # UI primitives
│   │   └── icon-symbol.tsx     # Icon wrapper (MaterialCommunityIcons)
│   ├── haptic-tab.tsx          # Custom bottom tab with haptics
│   └── index.ts                # Barrel exports
│
├── constants/
│   └── theme.ts                # Design tokens (Surface, TextColors, Brand, etc.)
│
├── hooks/                      # Custom React hooks
│   ├── use-color-scheme.ts     # System color scheme hook
│   ├── use-calendar-data.ts    # Calendar data fetching
│   ├── use-speech-recognizer.ts
│   └── use-database/           # SQLite database hooks
│       ├── use-database.ts     # Main database hook
│       └── use-database.helpers.ts
│
├── modules/                    # Native modules / Expo plugins
│   ├── speech-recognizer/      # Custom Expo module (iOS SFSpeechRecognizer)
│   │   ├── expo-module.config.json
│   │   ├── index.ts
│   │   ├── SpeechRecognizer.podspec
│   │   ├── plugin/             # Expo plugin (permissions)
│   │   └── src/                # Native source code (Swift + TS stubs)
│   └── watch-connectivity/     # Custom Expo module (iOS WatchConnectivity bridge)
│
├── targets/                    # Native extension targets (@bacons/apple-targets)
│   ├── widget/                 # iOS home-screen widget (Swift/WidgetKit)
│   ├── watch/                  # Apple Watch companion app (SwiftUI)
│   └── watch-widget/           # Watch complication widget
│
├── contexts/
│   └── database-context.tsx    # DatabaseProvider + DatabaseContext (single source of truth)
│
├── lib/                        # Pure logic, no React
│   ├── types.ts                # DbEntry, EntryType, RecurrenceRule, RecurringInstance
│   ├── database.ts             # SQLite helpers (initDatabase, generateId)
│   ├── schema.ts               # Table definitions
│   ├── recurrence.ts           # Recurrence rule serialization + instance expansion
│   ├── date-utils.ts           # Date helpers (dates stored as DD/MM/YYYY strings)
│   └── notifications.ts        # expo-notifications scheduling (synced by DatabaseContext)
│
├── assets/images/              # Static assets (icons, splash, etc.)
├── scripts/
│   └── reset-project.js        # Reset app to blank starter state
├── eslint.config.js            # ESLint flat config
├── app.json                    # Expo config
├── tsconfig.json               # TypeScript config
└── package.json
```

---

## TypeScript

- **Strict mode on** (`"strict": true` in `tsconfig.json`).
- Path alias `@/` maps to project root. Always use `@/` for internal imports.
- Typed routes enabled — `href` values in `<Link>` are statically validated.
- Prefer `type` for object shapes, `interface` for extendable contracts.
- Always annotate return types on exported functions and hooks.
- Avoid `any`; use `unknown` and narrow with type guards.

---

## Import Order

Two blocks separated by a blank line:

```tsx
// 1. External / third-party packages
import { DarkTheme } from "@react-navigation/native";
import { Stack } from "expo-router";
import "react-native-reanimated";

// 2. Internal project imports (blank line separates blocks)
import { useColorScheme } from "@/hooks/use-color-scheme";
```

VSCode auto-organizes imports on save (`source.organizeImports`).

---

## Naming Conventions

| Element             | Convention                    | Example                                |
| ------------------- | ----------------------------- | -------------------------------------- |
| Files & directories | `kebab-case`                  | `use-color-scheme.ts`                  |
| Components          | `PascalCase`                  | `export default function HomeScreen()` |
| Hooks               | `camelCase` with `use` prefix | `useColorScheme`                       |
| Exported constants  | `PascalCase`                  | `Colors`, `Fonts`                      |
| Types / interfaces  | `PascalCase`                  | `type TabBarIconProps = {}`            |

---

## Component Patterns

- All components are **functional** — no class components.
- Every `app/` route and layout must have an `export default`.
- Styles in `StyleSheet.create({})` at the **bottom** of the file.
- Light/dark theming via **`useTheme()`** from `@/constants/theme` (returns
  `{ scheme, colors }`), backed by `contexts/theme-context.tsx` (persisted
  System / Light / Dark preference). Entry-type colors via the typed accessors
  `entryColor`, `useEntryKicker`, `useEntryTint`. Never branch on
  `useColorScheme()` inside a component.
- Use Atomic Design: `components/atoms/`, `molecules/`, `organisms/`.
- React Compiler handles memoization — do **not** add manual
  `useMemo`/`useCallback` unless measured.

---

## Error Handling

- Use `try/catch` around async ops; log errors with `console.error()`.
- Add React **error boundaries** around route-level subtrees doing data fetching.
- Never silently swallow errors — always log or surface to user.
- Prefer explicit error state: `const [error, setError] = useState<Error | null>(null)`.

---

## ESLint

- **Flat config** format (ESLint v9) in `eslint.config.js`.
- Inherits `eslint-config-expo` (TypeScript, React, React Native rules).
- `dist/` is ignored. No custom overrides currently.
- Prettier is **not** configured — formatting via ESLint rules only.

---

## Design System

**"Field Lab"** — your whole brain as a living instrument panel. Source of truth: `constants/theme.ts` (the `tokens` object + `useTheme()`); full spec in `DESIGN.md`. Key principles:

- **Cool extremes only** — never `#FFF`/`#000`; graphite/crisp paper surfaces.
- **Equal volume** — five electric entry-type colors at equal intensity; never dim non-urgent types.
- **Green is completion-only** — todo is cyan, never green.
- **No 1px structural borders** — tonal layering, edge-bars, and glow carry structure.
- **Three type voices** — Host Grotesk (display/body), JetBrains Mono (counts/kickers/status), Caveat (handwritten narrative layer only).
- **No FAB, no gamification, no gradients, no "today" curation** — see DESIGN.md Do's and Don'ts.

---

## General Guidelines

- Keep components small, single-responsibility.
- Never commit secrets, API keys, or `.env` files.
- Prefer `expo-image` over React Native's `<Image>`.
- Use `<Link>` for in-app navigation, not `useNavigation().navigate()`.
- Portrait-only orientation enforced in `app.json`.

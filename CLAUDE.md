# AGENTS.md — Synapse App

Guidelines for agentic coding agents working in this repository.

---

## Project Overview

Expo-managed React Native app (iOS / Android / Web) using file-based routing via
`expo-router`. Key flags: React 19 Compiler (auto-memoization), New Architecture,
and typed routes.

See **DESIGN.md** for design guidelines (Dark Sanctuary aesthetic, tonal depth,
no-line borders, glassmorphism).

**Tech stack:** TypeScript · React 19 · Expo SDK 54 · expo-router v6 ·
React Navigation v7 · react-native-reanimated v4 · expo-sqlite

---

## Commands

### Development

```bash
npx expo start            # Dev server (Expo Go or dev build)
npx expo start --ios      # Open on iOS simulator
npx expo start --android  # Open on Android emulator
npx expo start --web      # Open in browser
```

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

## Directory Structure

```
synapse-app/
├── app/                        # Routes (expo-router file-based routing)
│   ├── _layout.tsx             # Root layout — Stack navigator + ThemeProvider
│   ├── index.tsx               # Redirects to /(tabs)
│   ├── modal.tsx               # Generic modal overlay
│   ├── voice-input.tsx         # Voice input modal (speech-to-text)
│   ├── detail.tsx              # Task/entry detail view
│   ├── list.tsx                # Full list view (all entries)
│   └── (tabs)/                 # Tab group (expo-router convention)
│       ├── _layout.tsx         # Tab navigator (BottomTabNavigator)
│       ├── index.tsx           # Home tab (today's view)
│       └── calendar.tsx        # Calendar tab (monthly view)
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
│   │   ├── wrapup-card.tsx     # End-of-day summary card
│   │   └── week-strip.tsx
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
│   └── speech-recognizer/      # Custom speech recognition module
│       ├── expo-module.config.json
│       ├── index.ts
│       ├── SpeechRecognizer.podspec
│       ├── plugin/             # Expo plugin (permissions)
│       └── src/                # Native source code
│
├── assets/images/              # Static assets (icons, splash, etc.)
├── scripts/
│   └── reset-project.js        # Reset app to blank starter state
├── constants/theme.ts
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
- Light/dark theming via `useColorScheme()` + React Navigation's
  `ThemeProvider`. Access palette: `Colors[colorScheme ?? 'light']`.
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

Check `constants/theme.ts` for color tokens and spacing. Key principles:

- **No 1px borders** — use background color shifts for sectioning.
- **Glassmorphism** for floating elements (FAB, top navigation).
- **Tonal depth** — depth via stacked surfaces, not shadows.
- See `DESIGN.md` for full "Digital Sanctuary" design philosophy.

This repo includes **`ui-ux-pro-max`** OpenCode skill:

---

## General Guidelines

- Keep components small, single-responsibility.
- Never commit secrets, API keys, or `.env` files.
- Prefer `expo-image` over React Native's `<Image>`.
- Use `<Link>` for in-app navigation, not `useNavigation().navigate()`.
- Portrait-only orientation enforced in `app.json`.

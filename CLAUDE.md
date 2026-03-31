# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Synapse is a mobile task planner app (iOS/Android/Web) built with React Native + Expo. The philosophy: glanceable clarity over dashboards — users should understand their day in under 5 seconds.

**Stack:** TypeScript · React 19 · Expo SDK 54 · expo-router v6 · React Navigation v7 · react-native-reanimated v4 · expo-sqlite v16

## Commands

```bash
npx expo start            # Start dev server
npx expo start --ios      # iOS simulator
npx expo start --android  # Android emulator
npx expo start --web      # Browser

npm run lint              # ESLint (flat config via eslint-config-expo)
npx eslint . --fix        # Auto-fix lint issues

# Builds use EAS, not npm scripts:
npx eas build --platform ios
npx eas build --platform android
```

**Tests:** No test framework configured yet. When adding, use `jest` + `jest-expo`. Run with `npx jest` / `npx jest path/to/file.test.ts` / `npx jest -t "test name"`.

## Architecture

### Routing
File-based routing via Expo Router. `app/_layout.tsx` is the root Stack navigator + ThemeProvider. `app/(tabs)/_layout.tsx` defines 4 visible tabs (Home, Calendar, Stats, Settings) + 1 hidden tab. `href` values in `<Link>` are statically validated — typed routes are enabled.

### Data Layer
- `lib/database.ts` — SQLite singleton (`synapse.db`)
- `lib/schema.ts` — TypeScript types + SQL schema (tables: `entries`, `ideas`)
- `hooks/use-database.ts` — Single `useDatabase()` hook for all DB reads/writes with optimistic updates; auto-fetches on mount via options

Entry types: `'task' | 'deadline' | 'event' | 'someday'`

### Components
Atomic Design: `components/atoms/` → `molecules/` → `organisms/`. Design tokens live in `constants/theme.ts`.

### State Management
No global state library. State is managed via local hooks + `useDatabase()`. React Compiler handles memoization automatically — do **not** add manual `useMemo`/`useCallback` without a measured reason.

## Code Conventions

- **Path alias:** Always use `@/` for internal imports (never relative `../../`)
- **Import order:** External packages first, then internal `@/` imports (blank line between blocks)
- **Files:** `kebab-case`; Components: `PascalCase`; Hooks: `camelCase` with `use` prefix
- **Styles:** `StyleSheet.create({})` at the bottom of each file, outside the component
- **Types:** Prefer `type` for object shapes, `interface` for extendable contracts; annotate return types on exported functions; avoid `any`
- **Theming:** `useColorScheme()` hook + `Colors[colorScheme ?? 'light']` pattern
- Portrait-only — do not add landscape layout code

## Design System ("The Kinetic Equilibrium")

See `DESIGN.md` for the full spec. Key rules:

- **No 1px solid borders** — structural boundaries use background color shifts only (tonal depth)
- **No pure white (#FFFFFF)** — use `Primary Text` (#FAFAFA)
- **No black shadows** — always tint with background or accent color
- Surface hierarchy: `#131316` (base) → `#1B1B1E` → `#1F1F22` → `#2A2A2D` → `#353438`
- Entry type accents: Task #6EA8FF · Deadline #FF6B6B · Event #C084FC · Someday #FBB040
- Typography: Inter exclusively; Display-LG 48pt hero counters; Label-SM 11pt ALL CAPS 5% tracking for metadata
- FAB: pill shape, glassmorphic, permanent 8px glow at 20% opacity
- Glassmorphism (20px backdrop blur) for floating elements only

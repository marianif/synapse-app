# AGENTS.md — Synapse App

Guidelines for agentic coding agents working in this repository.

---

## Project Overview

Expo-managed React Native app (iOS / Android / Web) using file-based routing via
`expo-router`. Key flags enabled: React 19 Compiler (auto-memoization), New
Architecture (`newArchEnabled`), and typed routes (`experiments.typedRoutes`).

Check DESIGN.md for design guidelines.

**Tech stack:** TypeScript · React 19 · Expo SDK 54 · expo-router v6 ·
React Navigation v7 · react-native-reanimated v4

---

## Commands

### Development

```bash
npx expo start            # Start dev server (Expo Go or dev build)
npx expo start --ios      # Open on iOS simulator
npx expo start --android  # Open on Android emulator
npx expo start --web      # Open in browser
```

### Lint

```bash
npm run lint              # Run expo lint (ESLint flat config, eslint-config-expo)
```

There is no auto-fix script; to auto-fix:

```bash
npx eslint . --fix
```

### Build

Builds are handled by EAS (Expo Application Services), not a local npm script:

```bash
npx eas build --platform ios
npx eas build --platform android
```

### Tests

**No test framework is currently configured.** When adding tests, prefer
`jest` with `jest-expo` preset (the standard Expo testing setup). Once
configured, use:

```bash
npx jest                       # Run all tests
npx jest path/to/file.test.ts  # Run a single test file
npx jest -t "test name"        # Run a single test by name
```

### Utilities

```bash
node ./scripts/reset-project.js  # Reset app to blank starter state
```

---

## Directory Structure

```
app/                  # Routes (Expo Router file-based routing)
  _layout.tsx         # Root layout — Stack navigator + ThemeProvider
  modal.tsx           # Modal route
  (tabs)/             # Tab group
    _layout.tsx       # Tab navigator
    index.tsx         # Home tab
    explore.tsx       # Explore tab
components/           # Shared UI components
  atoms/              # Smallest building blocks (Atomic Design)
  molecules/          # Composed atoms
  organisms/          # Complex UI sections
constants/
  theme.ts            # App-wide design tokens (colors, fonts, spacing)
hooks/                # Custom React hooks
assets/images/        # Static assets
```

---

## TypeScript

- Strict mode is **on** (`"strict": true` in `tsconfig.json`).
- Path alias `@/` maps to the project root. Always use `@/` for internal
  imports (never relative `../../`).
- Typed routes are enabled — `href` values in `<Link>` are statically
  validated by the compiler; keep them correct.
- Prefer `type` for object shapes and `interface` for extendable contracts.
- Always annotate return types on exported functions and hooks.
- Avoid `any`; use `unknown` and narrow with type guards.

---

## Import Order

Two blocks separated by a blank line:

1. **External / third-party packages** (React, Expo, React Navigation, etc.)
2. **Internal project imports** (prefixed with `@/`)

```tsx
// 1. External
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

// 2. Internal (blank line separates blocks)
import { useColorScheme } from "@/hooks/use-color-scheme";
```

VSCode is configured to auto-organise imports on save (`source.organizeImports`).

---

## Naming Conventions

| Element               | Convention                    | Example                                 |
| --------------------- | ----------------------------- | --------------------------------------- |
| Files & directories   | `kebab-case`                  | `use-color-scheme.ts`, `haptic-tab.tsx` |
| Components (function) | `PascalCase`                  | `export default function HomeScreen()`  |
| Hooks                 | `camelCase` with `use` prefix | `useColorScheme`, `useThemeColor`       |
| Exported constants    | `PascalCase`                  | `Colors`, `Fonts`                       |
| Types / interfaces    | `PascalCase`                  | `type TabBarIconProps = { ... }`        |
| Route files           | Expo Router conventions       | `_layout.tsx`, `(tabs)/index.tsx`       |

---

## Component Patterns

- All components are **functional components** — no class components.
- Every `app/` route and layout must have an `export default`.
- Styles live in `StyleSheet.create({})` at the **bottom** of the file,
  outside the component. Inline styles are only acceptable for truly
  one-off dynamic values.
- Light/dark theming is done via the `useColorScheme()` hook combined with
  React Navigation's `ThemeProvider` and `DarkTheme`/`DefaultTheme`.
  Access palette values with the `Colors[colorScheme ?? 'light']` pattern.
- Organise new shared components under `components/atoms/`, `molecules/`,
  or `organisms/` following Atomic Design principles.
- The React Compiler handles memoization automatically — do **not** add
  manual `useMemo` / `useCallback` unless you have a measured reason.

---

## Error Handling

- Use `try/catch` around async operations; log errors with `console.error()`
  during development.
- Add React **error boundaries** around route-level subtrees that perform
  data fetching or third-party calls.
- Never silently swallow errors — always log or surface them to the user.
- Prefer explicit error state (`const [error, setError] = useState<Error | null>(null)`)
  over boolean flags.

---

## ESLint Configuration

- **Flat config** format (ESLint v9) — config lives in `eslint.config.js`.
- Inherits `eslint-config-expo` which bundles `@typescript-eslint`,
  `eslint-plugin-react`, `eslint-plugin-react-hooks`, and
  `eslint-plugin-react-native` rules.
- No custom rule overrides currently — add overrides in `eslint.config.js`
  using `defineConfig([expoConfig, { rules: { ... } }])`.
- `dist/` is in the ignore list.
- Prettier is **not** configured. Formatting is enforced via ESLint rules
  from `eslint-config-expo`.

---

## Design System & UI Tooling

This repo includes the **`ui-ux-pro-max`** OpenCode skill for generating
design systems and UI recommendations. When working on visual features:

```bash
# Query design recommendations (from repo root)
python .opencode/skills/ui-ux-pro-max/search.py --stack react-native "<query>"

# Generate a full design system
python .opencode/skills/ui-ux-pro-max/search.py --stack react-native --design-system
```

Design tokens (colors, typography, spacing) belong in `constants/theme.ts`.

---

## General Guidelines

- Keep components small and focused on a single responsibility.
- Colocate component-specific hooks and helpers in the same folder when
  they are not reused elsewhere.
- Never commit secrets, API keys, or `.env` files.
- Prefer `expo-image` over React Native's `<Image>` for better performance.
- Use `expo-router`'s `<Link>` for in-app navigation — do not use
  `useNavigation().navigate()` directly unless necessary.
- Portrait-only orientation is enforced in `app.json`; do not add landscape
  layout code unless orientation support is explicitly added.

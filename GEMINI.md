# Synapse Time Planner: Engineering & Context Guide

Welcome to the Synapse project. This document serves as the primary instructional context for Gemini CLI and other AI agents. It overrides general defaults with project-specific architecture, design, and workflow mandates.

---

## 1. Project Overview

Synapse is an intuitive, local-first time planner built for "temporal intuition." It prioritizes glanceability and cognitive relief over complex list management.

- **Framework**: React Native (Expo SDK 55)
- **Routing**: `expo-router` (File-based, Typed Routes)
- **Storage**: SQLite (`expo-sqlite`) - Local-first, offline-first.
- **State Management**: React Context (`DatabaseProvider`) + Custom Hooks (`useDatabase`).
- **Native Extensions**: iOS WidgetKit & Apple Watch (via `@bacons/apple-targets`).
- **Special Features**: Custom Speech Recognition (iOS Native Module), Watch Connectivity.

---

## 2. Design DNA: The Digital Sanctuary

Adhere strictly to these principles from `DESIGN.md`:

- **Tonal Depth**: Use background color shifts (`surface`, `surface-container-low`, etc.) to define space. **NEVER use 1px solid borders for layout.**
- **Dark Mode First**: The "Deep Night" spectrum (#131316 base) is the primary environment.
- **Bento Grid**: Asymmetric modular cards with `1.5rem` (24px) outer radius.
- **Glassmorphism**: Use `20px` backdrop blur for floating elements (FAB, Top Nav).
- **Extreme White Space**: If a layout feels cramped, increase spacing.
- **Typography**: Inter. Use extreme scale (48pt) for hero counters.

---

## 3. Core Architecture

### Atomic Design System
Components are organized by complexity:
- `components/atoms/`: Single-purpose primitives (e.g., `counter-display.tsx`, `entry-dot.tsx`).
- `components/molecules/`: Simple compositions (e.g., `entry-row.tsx`, `empty-state.tsx`).
- `components/organisms/`: Complex UI sections (e.g., `deadlines-card.tsx`, `today-section.tsx`).

### Data Layer
- **Source of Truth**: `DatabaseContext` (in `contexts/database-context.tsx`).
- **Access Pattern**: ALWAYS use the `useDatabase()` hook. Never import the context or SQLite directly in components.
- **Entry Types**: `todo`, `deadline`, `event`, `someday`, `idea`.
- **Date Storage**: Dates are stored as `DD/MM/YYYY` strings. Use `dayjs` for manipulation.

### Sync & Connectivity
- **iOS Widget**: Synced via `ExtensionStorage` (App Group: `group.dev.the-wedge.synapse-app`).
- **Apple Watch**: Bidirectional sync via `WatchConnectivity` module. Handles notes and voice memos.

---

## 4. Key Workflows & Commands

### Development
```bash
npx expo start            # Start dev server
npm run ios               # Run on iOS (Native Dev Build)
npm run android           # Run on Android (Native Dev Build)
npm run lint              # Run ESLint (Flat Config)
```

### Native Targets (Widget/Watch)
Any change to `targets/` or `modules/` requires a prebuild:
```bash
npm run prewidget         # Prebuild apple-targets (required for extensions)
npm run clean:ios         # Wipe DerivedData + Clean Prebuild
```
*Note: After prebuild, use Xcode to run the app if testing native extensions.*

### Testing
- No current framework. Prefer `jest` with `jest-expo`.

---

## 5. Coding Standards & Conventions

- **TypeScript**: Strict mode enabled. Use path aliases `@/` for all internal imports.
- **Components**: Functional components only. Export default for all routes.
- **Styles**: Use `StyleSheet.create` at the bottom of the file. Access theme via `Colors[colorScheme]`.
- **Naming**: 
  - Files: `kebab-case` (e.g., `use-database.ts`)
  - Components/Types: `PascalCase` (e.g., `TodaySection`)
  - Hooks: `camelCase` (e.g., `useDatabase`)
- **Imports**: External first, then a blank line, then internal `@/` imports.

---

## 6. Agent Instructions for Gemini CLI

1. **Surgical Updates**: When modifying components, preserve the "No-Line" rule and Atomic Design structure.
2. **Context Awareness**: Before adding features, check if they need sync support for the iOS Widget or Apple Watch (`syncEntriesToWidget` in `DatabaseContext`).
3. **Native Modules**: If modifying `modules/` or `targets/`, remind the user to run `npm run prewidget`.
4. **Validation**: Always run `npm run lint` after changes. If adding logic, propose a test plan.
5. **Types**: Ensure all new data models are added to `lib/types.ts` and supported by the SQLite schema in `lib/schema.ts`.

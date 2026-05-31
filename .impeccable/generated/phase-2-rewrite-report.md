# Phase 2 rewrite report

Generated: 2026-05-31T12:17:17.445Z
Mode: **dry-run**

## Summary

- **filesPlanned**: 10
- **editsPlanned**: 15
- **filesWritten**: 10
- **conflicts**: 0
- **errors**: 0
- **requiresAgent**: 10

## Requires agent

Files the generated script refused to touch. Open them and apply judgement.
- `components/atoms/countdown-chip.tsx` — add `import { tokens } from '@/constants/theme'` for promoted literal
- `components/molecules/detail-action-bar.tsx` — add `import { tokens } from '@/constants/theme'` for promoted literal
- `components/molecules/today-event-row.tsx` — add `import { tokens } from '@/constants/theme'` for promoted literal
- `components/molecules/weekday-row.tsx` — add `import { tokens } from '@/constants/theme'` for promoted literal
- `components/organisms/app-header.tsx` — add `import { tokens } from '@/constants/theme'` for promoted literal
- `components/organisms/day-detail-sheet.tsx` — add `import { tokens } from '@/constants/theme'` for promoted literal
- `components/organisms/fab.tsx` — add `import { tokens } from '@/constants/theme'` for promoted literal
- `components/organisms/swipeable-row.tsx` — add `import { tokens } from '@/constants/theme'` for promoted literal
- `components/organisms/today-section.tsx` — add `import { tokens } from '@/constants/theme'` for promoted literal
- `components/organisms/week-strip.tsx` — add `import { tokens } from '@/constants/theme'` for promoted literal

## Sample edits by kind

### literal-promote

- `components/atoms/countdown-chip.tsx:25` — `'#52C87A'` → `tokens.feedback.success`
- `components/atoms/countdown-chip.tsx:27` — `'#FF4444'` → `tokens.feedback.danger`
- `components/molecules/detail-action-bar.tsx:35` — `'#131316'` → `tokens.color.dark.paper`
- `components/molecules/detail-action-bar.tsx:40` — `'#131316'` → `tokens.color.dark.paper`
- `components/molecules/detail-action-bar.tsx:22` — `'#FF4444'` → `tokens.feedback.danger`

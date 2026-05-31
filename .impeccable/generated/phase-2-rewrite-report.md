# Phase 2 rewrite report

Mode: **dry-run**

- filesChanged: 13
- requiresAgent: 0

## Edits by file

### components/atoms/countdown-chip.tsx
- promote #52C87A -> tokens.feedback.success
- promote #FF4444 -> tokens.feedback.danger

### components/atoms/day-cell.tsx
- retarget EntryAccent.today -> tokens.accent.clay

### components/error-boundary.tsx
- retarget Brand.primaryContainer -> tokens.accent.clayPressed

### components/molecules/detail-action-bar.tsx
- promote #131316 -> tokens.color.dark.paper
- promote #FF4444 -> tokens.feedback.danger

### components/molecules/today-event-row.tsx
- promote(unresolved) rgba(192,132,252,0.3) -> tokens.colors.unresolved.rgba192_132_252_0_3

### components/molecules/weekday-row.tsx
- promote(unresolved) rgba(255,255,255,0.06) -> tokens.colors.unresolved.rgba255_255_255_0_06

### components/organisms/app-header.tsx
- promote(unresolved) rgba(255,255,255,0.08) -> tokens.colors.unresolved.rgba255_255_255_0_08

### components/organisms/custom-tab-bar.tsx
- retarget Brand.fabGlow -> tokens.accent.clay

### components/organisms/day-detail-sheet.tsx
- promote(unresolved) rgba(0, 0, 0, 0.6) -> tokens.colors.unresolved.rgba0_0_0_0_6
- retarget Brand.fabGlow -> tokens.accent.clay

### components/organisms/fab.tsx
- promote #FAFAFA -> tokens.color.dark.ink
- promote(unresolved) rgba(255, 107, 107, 0.2) -> tokens.colors.unresolved.rgba255_107_107_0_2
- retarget Brand.fabGlow -> tokens.accent.clay

### components/organisms/swipeable-row.tsx
- promote #FF6B6B -> tokens.feedback.danger

### components/organisms/today-section.tsx
- promote(unresolved) rgba(255,255,255,0.04) -> tokens.colors.unresolved.rgba255_255_255_0_04

### components/organisms/week-strip.tsx
- promote(unresolved) rgba(144, 238, 144, 0.15) -> tokens.colors.unresolved.rgba144_238_144_0_15
- retarget EntryAccent.today -> tokens.accent.clay

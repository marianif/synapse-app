export const meta = {
  name: 'rewire-usetheme',
  description: 'Rewire color-using files to read from useTheme() so light/dark switching works',
  phases: [
    { title: 'Rewire', detail: 'one agent per file: lift color to useTheme()' },
    { title: 'Verify', detail: 'per-file tsc/eslint/grep gate' },
  ],
}

function coerceFiles(a) {
  if (!a) return []
  if (Array.isArray(a)) return a
  if (Array.isArray(a.files)) return a.files
  if (typeof a === 'string') {
    try { return coerceFiles(JSON.parse(a)) } catch { return a.split(/[\n,]+/).map((s) => s.trim()).filter(Boolean) }
  }
  return []
}
const files = coerceFiles(args)
if (!files.length) {
  log('No files passed in args — nothing to do.')
  return { error: 'no files', argType: typeof args, sample: String(args).slice(0, 120) }
}

const REWIRE_INSTRUCTIONS = `
You are rewiring ONE React Native file in an Expo app so its COLORS react to a
runtime light/dark theme switch. The file currently reads colors from a deprecated
compat shim in @/constants/theme (Surface, TextColors, EntryAccent, Brand, Colors,
Shadow) that hardcodes DARK values, so the UI can't switch.

THE GOAL: every color the component renders must come from the active scheme at
render time, via the useTheme() hook — NOT from values frozen into a module-level
StyleSheet.create at import.

EXACT PATTERN — follow precisely:
1. Import the hook:  import { useTheme } from "@/constants/theme";
   (and entryColor / useSurfaceColor from the same module if needed — see below.)
2. In the component body, call:  const { colors } = useTheme();
   colors has: paper, surface, surfaceSubtle, ink, inkMuted, accent.{clay,clayPressed},
   feedback.{success,warning,danger}, type.{bills,ideas,todo,event,someday},
   typeKicker.{...same keys}, typeTint.{...same keys}.
3. Map the OLD shim reads to colors.*:
   - Surface.base            -> colors.paper
   - Surface.containerLowest  -> colors.paper
   - Surface.containerLow     -> colors.surfaceSubtle
   - Surface.container / containerHigh / containerHighest -> colors.surface
   - Surface.bright / outlineVariant -> colors.surfaceSubtle
   - TextColors.primary       -> colors.ink
   - TextColors.secondary / tertiary / disabled -> colors.inkMuted
   - Brand.primary / fabGlow  -> colors.accent.clay
   - Brand.primaryContainer   -> colors.accent.clayPressed
   - Brand.onPrimary          -> colors.paper
   - Colors[scheme].text      -> colors.ink ;  .tint -> colors.accent.clay ;
     .tabIconDefault -> colors.inkMuted ; .surface -> colors.surface ;
     .surfaceLow -> colors.surfaceSubtle ; .border -> colors.surfaceSubtle
   - Shadow.card -> tokens.elevation.tile ; Shadow.fab -> tokens.elevation.capture
     (import { tokens } too; elevation is scheme-independent, fine to keep in StyleSheet)
4. DYNAMIC ACCESS — use the typed accessors, do NOT index the shim:
   - EntryAccent[someType]  -> entryColor(someType)   (import { entryColor })
     entryColor takes an EntryType ("todo"|"deadline"|"event"|"someday"|"idea") and
     returns the shared saturated code. Scheme-independent — no colors needed.
   - EntryAccent.deadline (static) -> entryColor("deadline"), etc. OR colors.type.bills
     (deadline maps to bills, idea maps to ideas, others same name).
   - Surface[someLayer] dynamic -> const bg = useSurfaceColor(someLayer)
     (import { useSurfaceColor }); it takes the legacy SurfaceLayer name and returns
     the resolved scheme surface.

MECHANICS:
- KEEP layout/spacing/radius/typography in the bottom StyleSheet.create — those read
  scheme-INDEPENDENT tokens (Spacing/Radius/FontSize/tokens.space/radius/type) and are
  fine frozen. ONLY pull COLOR props (backgroundColor, color, borderColor, shadowColor,
  tintColor) out of the static sheet.
- Apply lifted colors inline by composing arrays:  style={[styles.box, { backgroundColor: colors.surface }]}
- For JSX color attributes (e.g. <Icon color={...} />) read from colors/entryColor directly.
- This codebase has NO FlatList renderItem hot paths and React Compiler is ON — do NOT
  add useMemo/useCallback or a makeStyles factory. Inline color objects are correct here.
- Remove now-unused shim imports. If EntryAccent is used ONLY dynamically, drop it for entryColor.
  If a file still uses Spacing/Radius/FontSize/etc., KEEP those imports (scheme-independent).
- Do NOT touch non-color logic, JSX structure, or behavior.
- If a component receives a color via PROPS (e.g. accentColor) rather than reading the
  shim itself, leave it — the parent supplies it. Only rewire shim reads in THIS file.

SPECIAL: components/molecules/empty-state.tsx — its EmptyStateProps is MISSING an
'accentColor' prop that three callers pass (agenda-section, deadlines-card, today-section),
causing a pre-existing tsc error. If you are assigned empty-state.tsx, ADD an optional
'accentColor?: string' to EmptyStateProps and use it (fallback to colors.accent.clay).

Return ONLY a one-line summary of what you changed (symbols lifted, accessors used).
Do not return the file contents.
`

const VERIFY_INSTRUCTIONS = `
Verify ONE rewired file. Run these checks with Bash from the repo root
(/Users/federicamariani/Desktop/the-wedge/synapse-app):
1. eslint the file:  npx eslint "<FILE>"  — must have 0 ERRORS (warnings ok).
2. grep the file for leftover color-shim reads that should be gone:
   grep -nE "\\b(Surface|TextColors|EntryAccent|Brand|Colors)\\." "<FILE>"   and
   grep -nE "(EntryAccent|Surface|Colors)\\[" "<FILE>"
   These should return NOTHING (color reads should now be colors.* / entryColor / useSurfaceColor).
   EXCEPTION: a file may legitimately keep Spacing./Radius./FontSize./FontFamily./
   LineHeight./LetterSpacing./tokens. references — those are scheme-independent, NOT a failure.
   Shadow. is allowed only if replaced by tokens.elevation.
3. Confirm the file imports and calls useTheme() (or only uses entryColor for purely
   scheme-independent entry colors — that's acceptable for dot-only components).
Report a strict JSON verdict via your structured output: { file, eslintOk, noColorShimLeft,
usesThemeOrAccessor, issues: [..] }. issues lists any leftover color-shim line refs.
`

const VERDICT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['file', 'eslintOk', 'noColorShimLeft', 'usesThemeOrAccessor', 'issues'],
  properties: {
    file: { type: 'string' },
    eslintOk: { type: 'boolean' },
    noColorShimLeft: { type: 'boolean' },
    usesThemeOrAccessor: { type: 'boolean' },
    issues: { type: 'array', items: { type: 'string' } },
  },
}

const results = await pipeline(
  files,
  (file) =>
    agent(`${REWIRE_INSTRUCTIONS}\n\nFILE TO REWIRE: ${file}`, {
      label: `rewire:${file}`,
      phase: 'Rewire',
    }),
  (_summary, file) =>
    agent(`${VERIFY_INSTRUCTIONS.replace(/<FILE>/g, file)}\n\nFILE TO VERIFY: ${file}`, {
      label: `verify:${file}`,
      phase: 'Verify',
      schema: VERDICT_SCHEMA,
    }),
)

const verdicts = results.filter(Boolean)
const failures = verdicts.filter(
  (v) => !v.eslintOk || !v.noColorShimLeft || !v.usesThemeOrAccessor,
)
log(`Rewired ${verdicts.length}/${files.length} files. ${failures.length} need attention.`)
return {
  total: files.length,
  verified: verdicts.length,
  failures: failures.map((f) => ({ file: f.file, issues: f.issues, eslintOk: f.eslintOk, noColorShimLeft: f.noColorShimLeft })),
}

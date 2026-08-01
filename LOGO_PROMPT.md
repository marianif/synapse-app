# Synapse — Logo / App Icon Generation Brief

Hand this file to an image-generation model (e.g. Midjourney, DALL·E, Ideogram, Nano Banana) as the full prompt context. It designs the app icon and primary logo mark for **Synapse**, a mobile "second brain" app.

## What Synapse is

Synapse is a capture-first second brain for an ADHD-adjacent mind: dump a thought the instant you have it (tap for text, long-press for voice), and the app resolves it into an idea, a todo, a deadline, or a diary note. The brand personality is **activating, charged, direct — cool and sharp like an instrument panel, switched on, never soothed.** It explicitly rejects: corporate productivity-tool blue, gamified habit-tracker cheerfulness, pastel-illustration mascots, and soft/warm "cozy journaling app" aesthetics.

Reference in one sentence: **a field-notebook / lab-log kept by hand, not a sterile SaaS dashboard.**

## Direction: "Circuit Node"

The mark is an abstract **neuron / synapse network graph** — not a literal brain, not a lightbulb, not a generic "connection" icon cliché. Three nodes (small filled circles) joined by thin, perfectly straight or crisply angled lines, resolving into one compact, geometric, asymmetric cluster. It should read as **precise and electric**, like an oscilloscope trace or a circuit-board via, never organic or blobby.

### Construction rules

- **Exactly 3 nodes**, each a different accent color (see palette below), unequal in visual weight to avoid symmetry (no equilateral triangle, no perfect radial symmetry).
- **Node shape**: hard-edged filled circles or slightly squared-off dots — never soft gradients, never glowing bloom, never 3D bevel/glass effects.
- **Connecting lines**: thin (1.5–2.5px at export scale), fully opaque, straight or single-angle-break only — no curves, no bezier swoops, no organic branching.
- **Composition**: asymmetric, off-center within the icon's safe area. Avoid perfect radial/triangular symmetry — this should look like a deliberate, specific circuit fragment, not a generic "network" clipart icon.
- **No literal brain, no lightbulb, no gear, no chat bubble, no generic "AI sparkle" glyph.**
- **No gradients, no drop shadows, no glassmorphism, no glow/bloom effects.** Flat, solid color fills only.
- Must work as a **standalone app icon** (no wordmark) at small sizes (down to 40×40px) — the 3-node cluster must stay legible when tiny. Keep it dense/compact, not spread thin across the canvas.

### Color palette (hard constraint — use these exact hex values, no substitutions)

- Background / ground: **`#171A20`** (cool graphite — never pure black `#000000`)
- Node 1 (deadline/coral): **`#FB7185`**
- Node 2 (todo/cyan): **`#22D3EE`**
- Node 3 (idea/amber): **`#FBBF24`**
- Connecting lines: a cool neutral off-white, **`#E9EDF3`**, at full or near-full opacity (not translucent/faded)

All three node colors must appear at **equal visual intensity** — none dimmed, muted, or desaturated relative to the others. This "equal volume" rule is a hard brand constraint: no single node may dominate or recede.

### Two deliverables

1. **App icon (square, 1024×1024px)**: the 3-node cluster centered with generous padding, graphite `#171A20` background filling the full square (no rounded-corner mask baked in — the OS applies the mask). No text.
2. **Primary logomark (horizontal lockup)**: the same node cluster at a smaller scale, to the left of the wordmark "synapse" set in a **bold geometric/grotesk sans** (Host Grotesk Bold if available as a style reference, or a comparable bold grotesk — think Söhne Bold / General Sans Bold energy: tight, no-nonsense, slightly condensed). Wordmark is lowercase, in the off-white `#E9EDF3`, on the same graphite ground. Node cluster and wordmark baseline-align; roughly 1:2.5 ratio of mark-width to wordmark-width.

### Explicitly reject

- Any brain/neuron illustration that looks organic, fleshy, or anatomical.
- Any gradient background (this is a flat-color brand, not a gradient-app brand).
- Rounded, soft, "friendly" bubble nodes — nodes must read hard-edged and precise.
- Generic stock "network/connection" icon tropes (globe with dots, hub-and-spoke wheel, DNA helix).
- Perfectly symmetric layouts — the mark should feel like one specific charged moment, not a generic template icon.
- Warm tones anywhere (no orange, no warm yellow, no terracotta) — amber `#FBBF24` is the warmest permitted color and it is cool-leaning, not warm-leaning.

### Output format

- Deliver as SVG if the tool supports vector output; otherwise PNG with transparent or `#171A20` background at 1024×1024 for the icon, and a separate wide-aspect PNG/SVG for the horizontal lockup.
- Provide 2–3 variations of the node arrangement (different angle/weight distributions) so the strongest asymmetric composition can be selected.

# Onboarding — The Story

**Status:** story brief, locked. Precedes the visual build. Six cinematic chapters, maker voice, real Field Lab UI.

**One line:** From the first thought to the finished project — everything has a place.

**Arc in one breath:** I used to lose the good ones _(the thought)_. I tried every tool and each worked for half of it _(the tools)_. So I started from the thought, not the tool _(the turn)_. One key catches anything, before I decide what it is _(capture)_. And then it's all just there, at equal volume, nothing hidden _(the field)_. Everything has a place _(the promise)_.

## Locked decisions

- **Voice:** first person "I", the maker. Vulnerable and personal.
- **Villain, layered:** the lost thought → tool sprawl → the guilt machine.
- **Ends on:** switched on / activated. Never soothed.
- **Climax:** capture, then the field it preserves.
- **Literalism:** the real UI, staged at scale. No abstract diagrams.
- **Length:** six chapters, skippable throughout.
- **CTA:** "Capture something."

## Must land by the end

- **Mechanically:** the pen key — tap for text, long-press to speak; the resolver classifies any thought into idea / todo / deadline / note; things attach to a project or stand free.
- **Emotionally:** one place for every shape; fast enough for the thought; never loses a thought; one trigger, not five.

## Register & constraints (Field Lab is read-only)

- Brand register: ambitious motion, single-purpose viewports, typographic risk, per-chapter art direction are licensed.
- Read-only tokens: `color.type` (coral / cyan / amber), Host Grotesk + IBM Plex Mono + Caveat, `space`, `radius`, `glow`. No new values.
- No gradients; glow is solid-color opacity. No 1px borders, no colored edge-bars. Equal-volume codes. Sharp radii.
- Motion: passive content prints in on `Easing.bezier(0.22, 1, 0.36, 1)`, staggered — never a spring. Springs only for direct manipulation (the pen-key press, the resolver). `useReducedMotion()` → instant and static.
- Each chapter is one full-bleed idea. The three-node Circuit mark is the recurring motif.
- Scene layer may use `@shopify/react-native-skia` driven by Reanimated 4 worklets. All copy, controls, and navigation stay React Native; the canvas is decorative and hidden from accessibility. Allowed Skia vocabulary: solid token fills, paths, masks/clip, transform/opacity. No gradient shaders, no bloom blur, no decorative noise.

---

## Chapter 01 — The thought

**I used to lose the good ones.**

Not the big plans. The small ones. A line I wanted to keep. An idea that arrived while I was walking and was gone before I found my phone. Out of sight, out of mind — and my mind was always the one doing the hiding.

- **Sees:** one real entry row (_maybe write a book_, amber dot), alone on graphite — then its glow dies and it dissolves. The villain fades; the field behind stays empty.
- **Backs:** never loses a thought.
- **Scene:** Skia — the row is RN, the dissolve is a masked path fading on the timing bezier.

## Chapter 02 — The tools

**Everything I tried worked for half of it.**

Notes were fast, then turned into piles I never opened again. Project apps were powerful, then wanted me to become someone who maintains them. And they all nagged: streaks, overdue red, a "today" view that quietly forgot yesterday. Each one asked me to shrink to fit it.

- **Sees:** a notes pane scattering into a pile; a project grid locking rigid; a nagging overdue chip struck out and rejected.
- **Teaches:** the two failures + the guilt. Generic, no brand names.
- **Scene:** Skia — pans breaking into loose rows, a rigid grid; the guilt chip crosses out on the bezier.

## Chapter 03 — The turn

**So I started from the thought, not the tool.**

A thought already has a shape when it arrives: a flicker, a promise, a date, a project. What if one place took any of them at the speed they show up, and asked nothing before it was safe?

- **Sees:** coral, cyan, amber ignite in sequence around one point, then settle into the Circuit mark.
- **Scene:** Skia — the Chapter-3 spike. Three nodes ignite in sequence, draw a connecting path, settle into the mark.

## Chapter 04 — One key

**One key catches everything.**

Tap the pen to type it. Hold the pen and just say it. I never have to decide what a thing is before it's safe — the app asks after. Keep it. Do it. Put a date on it. Or just write it down.

- **Sees:** the real center pen key; tap → capture bar; long-press → recording state with the amber waveform. Then the resolver's four real doors: **idea / todo / deadline / note**.
- **Teaches:** pen tap, long-press voice, the four types, classification.
- **Backs:** fast enough for the thought; one trigger, not five.
- **Scene:** mostly real UI; the waveform is Skia.

## Chapter 05 — The field

**And then it's all just there.**

No folder to open, no filter to remember. The deadline I'm carrying, the project that's growing, the idea I scribbled last week — same volume, same board, every time I look. An idea glows as hard as a deadline. Nothing gets buried under a "today" that forgot about it.

- **Sees:** the real home field — greeting, projects, direct rows — assembling live at equal volume.
- **Teaches:** the field, nothing hidden.
- **Backs:** one place, all shapes; never loses a thought.

## Chapter 06 — The promise

**Everything has a place.**

Capture quickly. Follow things as they grow. Keep what matters in sight.

**Capture something.**

- **Sees:** the field settles; the three nodes breathe once; Skip gives way to Enter.
- **Emotion:** switched on.
- **Scene:** Skia — the nodes, the settling field.

---

## Build sequence

1. Write this brief.
2. Install `@shopify/react-native-skia`; rebuild the dev client.
3. Chapter 3 spike — validate the Skia scene layer against a Reanimated + SVG fallback.
4. Build chapters 1–6, reusing the real field components (capture bar, resolver, FieldGreeting, rows) rather than hand-drawn diagrams.
5. Verify: iOS + Android sim, light/dark, Dynamic Type 2×, reduce-motion; then `/flow audit app/onboarding.tsx`.

---

## Original brief (superseded, kept for history)

### What we want to tell

My life is made of things with different shapes, but I need one place where all of them can be captured quickly and found immediately.
Synapse exists between two failures:
Simple note apps are fast, but become disconnected piles of information.
Project-management apps are powerful, but too slow and rigid for a passing thought.
Synapse should make the distance between "I just thought of something" and "I can see it when I need it" almost disappear.
The core promise
Capture anything in a second. Keep everything within sight.
Or, slightly more emotional:
From the first thought to the finished project, everything has a place.
A founder-led onboarding story
This could be told almost as a short manifesto:
I started building Synapse because I could not find one place for everything I needed to remember.

Somewhere I could quickly write down a thought before it disappeared.

Somewhere I could keep track of a complex project without turning every idea into a task.

Somewhere I could mark a deadline, like taxes, next to an idea for a book I might write one day.

I did not need more tools. I needed one place that could move at the speed of thought, while still giving shape to everything that mattered.

Synapse is that place.

Capture quickly. Follow things as they grow. Keep what matters in sight.
This is much more credible than generic productivity copy because it explains why the product has this particular model.

# Synapse — Splash Screen Generation Brief

Hand this file to an image/motion-generation model (e.g. Midjourney + a motion tool, Runway, or a code-generation LLM building an Expo splash sequence) as the full prompt context. It designs the launch/splash experience for **Synapse**, a mobile "second brain" app. Assumes the **"Circuit Node"** logo direction (see `LOGO_PROMPT.md`) has already produced the 3-node network mark.

## What Synapse is

Synapse is a capture-first second brain for an ADHD-adjacent mind, built around one core motion: a thought hits, you dump it in seconds, and the app resolves it into an idea, todo, deadline, or diary note. Brand personality: **activating, charged, direct — an instrument panel, switched on, never soothed.** Never cozy, never gamified, never soft.

## Direction: "Circuit Node" splash

The splash is a **short, self-drawing network animation**: the 3 nodes of the logo appear and connect themselves in real time, like an instrument panel powering on — not a generic spinner, not a fade-in logo, not a bounce/elastic reveal.

### Static frame (for platforms that only support a static splash image — iOS launch screen, Android splash)

- **Background**: solid `#171A20` (cool graphite), full bleed, no vignette, no texture, no gradient.
- **Center**: the finished 3-node cluster from the logo (coral `#FB7185`, cyan `#22D3EE`, amber `#FBBF24` nodes, off-white `#E9EDF3` connecting lines), same proportions as the app-icon lockup, sized to roughly 22–28% of the shorter screen dimension.
- **Below the mark**, vertically spaced with generous breathing room (not tight/cramped): the wordmark "synapse" in lowercase, off-white `#E9EDF3`, bold geometric grotesk (Host Grotesk Bold or comparable).
- **Below the wordmark**, in a monospace font (IBM Plex Mono or comparable — must visually contrast with the grotesk wordmark above it), small, all-caps, wide letter-spacing, in a muted cool grey (`#8A93A3`): the line **"ACTIVATING..."**
- No illustration, no mascot, no decorative background shapes, no gradient glow behind the mark.

### Animated sequence (for platforms/tools that support a motion splash — e.g. a Lottie file, a Reanimated-driven native splash transition, or a short video loop)

Total duration: **900ms–1200ms**, single pass, no loop.

1. **0–150ms**: black-to-graphite hold — screen is `#171A20`, nothing visible yet (this covers the JS-thread cold-start gap).
2. **150–450ms**: the three nodes appear one at a time, staggered ~80ms apart, each with an instant hard-edged pop-in (opacity 0→1, no scale bounce, no spring overshoot) — coral first, then cyan, then amber. Each appears already fully saturated at final "equal volume" intensity — no fade-up from dim.
3. **450–650ms**: the connecting lines draw themselves between the nodes — a stroke-draw animation (like an SVG `stroke-dashoffset` reveal), moving at constant linear-then-ease-out speed, tracing from node to node. No overshoot, no bounce.
4. **650–850ms**: the wordmark "synapse" fades in on a calm timing curve (ease-out, cubic-bezier roughly `(0.22, 1, 0.36, 1)` — NOT a spring, NOT elastic, NOT bouncy) directly below the now-complete node mark.
5. **850–1000ms**: the mono tagline "ACTIVATING..." fades in beneath the wordmark on the same calm easing.
6. **1000–1200ms**: brief hold, then the whole splash transitions out via a plain opacity fade (never a scale-zoom, never a slide, never a wipe) to reveal the app's first real screen.

### Motion constraints (hard rules)

- **No spring/bounce/elastic easing anywhere in this sequence.** Every transition uses a calm ease-out timing curve. This is a strict brand rule — passive content appearing on screen never springs; springs are reserved for direct user-touch feedback elsewhere in the app, not for this splash.
- **No looping** — this plays once per cold start.
- **No parallax, no particle effects, no glow/bloom, no lens-flare.**
- Respect **reduced-motion**: if the OS/user has reduced-motion enabled, skip straight to the fully-drawn static frame (final state of step 4) with no staggered animation — the tagline may still do a single instant fade, not a staggered draw.
- Colors, spacing, and typography must exactly match the static frame spec above — the animation is the static frame's construction sequence, not a different composition.

### Explicitly reject

- Any generic "loading spinner," progress bar, or percentage counter.
- Any pulsing/breathing glow behind the logo.
- Zoom/scale-up reveal of the logo (logo appears at final size from the start; only opacity and line-draw animate).
- Warm color grading, vignettes, or film-grain overlays.
- Placing the tagline in the same typeface as the wordmark — the mono/grotesk contrast is a required brand signal (data-voice vs. name-voice).

### Deliverable

- One static PNG/SVG frame (for native splash screen configs — `app.json` / `expo-splash-screen`) at the composition described above, plus
- One motion file (Lottie JSON, MP4 reference, or a written frame-by-frame spec suitable for hand-coding in `react-native-reanimated`) implementing the animated sequence, if the target tool supports motion output.

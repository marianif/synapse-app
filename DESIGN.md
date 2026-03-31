# Design System: The Kinetic Equilibrium

## 1. Overview & Creative North Star

The Creative North Star for this system is **"The Digital Sanctuary."**

In an era of cognitive overload, this design system rejects the "dashboard" aesthetic in favor of a high-end editorial experience. It moves beyond the rigid, boxy nature of standard Bento grids by utilizing **Tonal Depth** and **Asymmetric Breathing Room**.

We do not just "display" tasks; we curate time. The interface should feel like a premium physical planner—minimalist, tactile, and intentionally spacious. We break the "template" look by using extreme typographic scale (48pt hero counters) contrasted against micro-labels, creating a sophisticated visual rhythm that guides the eye without the need for intrusive structural lines.

---

## 2. Colors & Surface Philosophy

The palette is rooted in a "Deep Night" spectrum, using subtle shifts in value rather than hue to define space.

### The "No-Line" Rule

**Explicit Instruction:** Designers are prohibited from using 1px solid borders for sectioning or layout containment. Structural boundaries must be defined solely through background color shifts. A `surface-container-low` section sitting on a `surface` background is the only way to denote a change in context.

### Surface Hierarchy & Nesting

Treat the UI as a series of physical layers—stacked sheets of obsidian glass.

- **Base Layer:** `surface` (#131316) – The infinite void.

- **Secondary Layer:** `surface-container-low` (#1B1B1E) – Large layout blocks.

- **Action Layer:** `surface-container` (#1F1F22) – Interactive Bento cards.

- **Elevated Layer:** `surface-container-highest` (#353438) – Pop-overs and active states.

### The "Glass & Gradient" Rule

To elevate the experience from "dark mode" to "premium," use Glassmorphism for floating elements (e.g., the FAB or Top Navigation). Use semi-transparent surface colors with a `20px` backdrop blur.

- **Signature Textures:** For primary actions, use a subtle linear gradient from `primary` (#ADC6FF) to `primary-container` (#4D8EFF) at a 135° angle. This provides a "soul" to the UI that flat color cannot replicate.

---

## 3. Typography: Editorial Hierarchy

We use **Inter** exclusively, but we treat it with the reverence of a serif font.

- **Display-LG (48pt / Bold):** Reserved for "Hero Counters." These are the heartbeat of the system. Tracking should be set to `-2%` to feel confident and tight.

- **Headline-SM (1.5rem):** Used for Bento card titles.

- **Body-MD (0.875rem):** The workhorse for task descriptions. Use `Secondary Text` (#A1A1AA) to maintain low cognitive load.

- **Label-SM (0.6875rem / All Caps / Tracking 5%):** Used for metadata and categories. This adds a "technical" precision to the "calm" layout.

The hierarchy is designed to create **Immediate Focal Points**. The eye should jump to the 48pt counter first, then glide over the micro-labels, creating a sense of "Airy" confidence.

---

## 4. Elevation & Depth: Tonal Layering

Traditional shadows and borders are replaced by light-theory principles.

- **The Layering Principle:** Depth is achieved by stacking. Place a `surface-container-lowest` (#0E0E11) card inside a `surface-container-high` (#2A2A2D) section to create a "recessed" look, or vice-versa for "lift."

- **Ambient Glows:** When a card requires a "floating" effect, do not use a black shadow. Use a tinted shadow: `0px 20px 40px rgba(0, 0, 0, 0.4)` merged with a soft glow based on the task accent color (e.g., a 4% opacity Blue #3B82F6 glow for "Task" cards).

- **The Ghost Border Fallback:** If accessibility requires a border, use the `outline-variant` token at **15% opacity**. High-contrast borders are strictly forbidden.

---

## 5. Signature Components

### Hero Bento Cards

The primary container.

- **Radius:** `xl` (1.5rem / 24px) for outer containers; `lg` (1rem / 16px) for internal cards.

- **Content:** Large `Display-LG` counter in the top-left, a `Label-SM` in the top-right, and a subtle `surface-variant` glow in the corner.

### Minimal Task Rows

- **Structure:** No divider lines. Use `spacing-4` (1.4rem) of vertical white space between rows.

- **Visual Cue:** A 6px circular dot using the Task Type Accents (Blue, Red, Purple, Amber) is the only vertical alignment anchor.

- **Interaction:** On hover, the background shifts to `surface-bright` (#39393C) with a `sm` (0.25rem) radius.

### Floating Action Button (FAB)

- **Shape:** `full` (pill shape).

- **Background:** `primary` (#ADC6FF) or Glassmorphic `surface-container`.

- **Signature Effect:** A permanent `8px` blurred glow of the same color sits behind the FAB at 20% opacity, giving it a "weighted" presence.

### Checkboxes

- **Radius:** `0.35rem` (6px).

- **States:** Unchecked is a `Ghost Border` (outline-variant @ 20%). Checked is a solid fill using the task’s specific accent color.

---

## 6. Do’s and Don’ts

### Do

- **Do** use extreme white space. If a layout feels "full," increase the spacing scale by one increment.

- **Do** use asymmetrical Bento layouts. One card should always be significantly larger than its neighbors to create a hierarchy of intent.

- **Do** use "Task Type Accents" sparingly. They are sparks of light in a dark room; if used too much, the "Calm" brand is lost.

### Don't

- **Don't** use 1px solid dividers to separate list items. Use white space (`spacing-3`) or subtle color-blocking.

- **Don't** use pure white (#FFFFFF). Always use `Primary Text` (#FAFAFA) to reduce eye strain and maintain the "Refined" tone.

- **Don't** use traditional "Drop Shadows" with 100% black. Always tint shadows with the background or accent color to maintain a "Glassy" feel.

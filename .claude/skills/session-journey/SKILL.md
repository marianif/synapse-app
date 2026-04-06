---
name: session-journey
description: "Developer session diary. Captures goals, discoveries, accomplishments, and next steps in an engaging narrative. Perfect for tracking progress, reflecting on decisions, and maintaining project context across sessions."
---

## Current Thread Context

- Session ID: ${CLAUDE_SESSION_ID}
- Git status: !`git status --short`
- Recent commits: !`git log --oneline -n 5`
- Current branch: !`git rev-parse --abbrev-ref HEAD`

# Session Journey — Developer Diary

Every coding session tells a story. This skill transforms your work into a living narrative that captures not just _what_ you did, but _why_, _how_, and _what's next_.

## When to Use

Invoke this skill when:

- Starting a new development session
- Ending a productive coding sprint
- Reflecting on complex decisions or pivots
- Creating a handoff document for future you
- Tracking the evolution of a feature

## The Anatomy of a Session Journey

```
## The Mission

What are we building today?

## The Landscape

Where are we starting from? What obstacles do we see on the horizon?

## Victories

What did we actually ship? Code merged, bugs squashed, features shipped.

## Hard-Won Wisdom

What did we discover the hard way? What would you tell past-you?

## Unfinished Business

What waits for tomorrow? The loose threads, the edge cases, the "almost there."

## Notes

Debugging war stories, happy accidents, and the occasional "why is this even a thing?"
```

## Tone Guide

Write with professionalism, but don't be afraid to let personality show through.

| Instead of...           | Try...                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| "Implemented feature X" | "Unlocked feature X — took three tries but we got there"            |
| "Fixed bug"             | "Squashed a particularly sneaky bug that was hiding in plain sight" |
| "Added file"            | "New file into the codebase"                                        |
| "Error occurred"        | "Hit a snag — a classic gotcha"                                     |
| "Next steps"            | "The road ahead" or "Tomorrow's quest"                              |

## Examples

### Example 1: Widget Development Session

```markdown
# Session Journey — 2026-04-06

## The Mission

Ship a second widget for the Synapse app without creating duplicate targets or spaghetti code.

## The Landscape

We already have one widget humming along. The challenge: adding another within the same `WidgetBundle`
thanks to `expo-apple-targets`. Simple in theory, tricky in practice.

## Victories

- Discovered that splitting widgets into separate files works perfectly — `widget.swift` and `hello-widget.swift` living in harmony
- Both widgets now show up in Xcode Previews
- Learned that `kind` strings are our secret weapon for forcing iOS to register new widgets

## Hard-Won Wisdom

> "Each target is a separate Swift module." This little nugget saved us hours of confusion.
> LSP errors during development? Prebuild fixes them. Don't panic.

## Unfinished Business

- [ ] Get `helloWidget` to appear in the actual iOS Simulator gallery
- [ ] Test widget data sharing with `ExtensionStorage`

## Notes

The moment we renamed `kind: "helloWidget"` to `kind: "helloWidgetV2"` — the widget just appeared.
Sometimes the solution is that stupid simple.
```

### Example 2: Bug Fix Session

```markdown
# Session Journey — 2026-04-05

## The Mission

Track down why the calendar was showing phantom events from 1970.

## The Landscape

Users reported seeing ancient dates appearing in their calendar view.
The dates all started with "1970-01-01" — the classic Unix epoch zero.
Someone's passing `null` where a date object is expected.

## Victories

- Found the culprit: `new Date(null)` returns January 1, 1970
- Added defensive date parsing in the data layer
- Wrote a unit test so this never sneaks back in

## Hard-Won Wisdom

Never trust user input. Never trust API responses. Always validate before `new Date()`.

## Unfinished Business

- [ ] Add date validation to the schema level
- [ ] Consider using a date library like `date-fns` for better parsing

## Notes

In retrospect, "1970" should have been a clue. Time travel bugs are the best kind.
```

## How to Generate a Session Journey

When the user invokes `/session-journey` or asks to document their session:

### Step 1: Gather Context

Start with a quick context check if needed:

```
Ready to write today's session journey?

Quick context:
1. What were you working on?
2. What's the project/feature?
3. Any memorable moments — wins, struggles, surprises?

Or just share your session notes and I'll craft the narrative.
```

### Step 2: Extract Key Information

Gather from the conversation:

- **Goals**: What was the objective?
- **Actions**: What files were created or modified?
- **Discoveries**: Technical insights, workarounds, gotchas
- **Challenges**: Bugs, blockers, pivots
- **Wins**: Completed features, solved problems

### Step 3: Craft the Narrative

Write in second person (talking to future you):

- "You discovered..." not "The developer discovered..."
- Include code snippets or file paths where relevant
- Keep it conversational but professional
- Let personality show through, but stay grounded

### Step 4: Output Format

Generate as a markdown file named `session-journey-YYYY-MM-DD.md` in the project root, with a brief summary for the conversation.

## Session Journey Template

```markdown
# Session Journey — {DATE}

## The Mission

{1-2 sentence description of the goal}

## The Landscape

{Context: where are we, what's the challenge, what's already in place}

## Victories

- {Accomplishment 1}
- {Accomplishment 2}
- {Accomplishment 3}

## Hard-Won Wisdom

> "{Insight or lesson learned}"
> {blockquote with the nugget of wisdom}

## Unfinished Business

- [ ] {Todo 1}
- [ ] {Todo 2}
- [ ] {Todo 3}

## Notes

{Any tangential thoughts, debugging stories, or TIL moments}
```

## Tips for Great Session Journeys

1. **Be specific** — "Fixed the race condition in the auth flow" beats "Fixed auth"
2. **Include code snippets** — A small diff or before/after shows growth
3. **Acknowledge the struggle** — Future you appreciates knowing what was hard
4. **Link to files** — Include paths so future you can navigate back
5. **Add the human element** — "Took 4 hours" or "three coffees" adds flavor
6. **Capture the "aha!" moment** — When something finally clicked, write it down
7. **Stay professional** — It's a diary, not a Twitter thread

## Pro Tips

- Write the session journey at the end of each coding session
- Reference previous sessions when starting new work
- Use session journeys in code reviews to show decision evolution
- Share them with teammates as async standup updates

---

_The best time to write a session journey was at the start. The second best time is now._

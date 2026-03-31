# Synapse Time Planner

> The intuitive flow of your time.

---

## Purpose

Most planners show you _everything_ but don't help you _see what matters_. Synapse is built for people who feel the friction between their intentions and their tools — who open a task app and feel anxiety instead of clarity.

The goal is simple: **open the app, understand your day in under 5 seconds, act with intention.**

---

## Concept

**"I just want to see what I have to do today, at a glance."**

Synapse centers on **temporal intuition** — removing artificial week/month boundaries and focusing on time awareness the way your brain actually uses it. It doesn't show you a grid or a list. It shows you **scale** (how much?), **direction** (what's next?), and **context** (what's coming?).

**Counters give you scale. Previews give you direction. Everything visible, nothing noisy.**

---

## Philosophy

Synapse speaks like a **thoughtful colleague** — not a cheerleader, not a robot.

|                          |                                                                                                |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| **Direct, not cheerful** | States facts. Doesn't celebrate streaks or nag you. You're the hero; the app is just the tool. |
| **Minimal, not cute**    | Few words. Trust the UI to do the heavy lifting.                                               |
| **Calm, not urgent**     | Informs without alarming. Color categorizes, it doesn't demand.                                |
| **Helpful, not pushy**   | Surfaces information proactively. Never nags.                                                  |

**Color = Categorization, Not Urgency.** Colors identify entry types — they don't manipulate behavior.

---

## Design DNA

**Italian roots**: Warmth, clarity, craft. Like Italian design philosophy — _less but better_.

**Dark mode first**: Designed dark, tested dark. The app is a calm, confident space — not a bright, clinical whiteboard.

**Bento grid**: Modular card-based layouts with generous gaps, rounded corners, subtle borders. Organized, scannable, modern.

---

## Core Features

| Feature            | What It Does                                                               |
| ------------------ | -------------------------------------------------------------------------- |
| **Today**          | Glanceable counter + preview of today's entries                            |
| **Incoming**       | What's coming in the next 7 days                                           |
| **Calendar**       | Month view with dots for context                                           |
| **4 Entry Types**  | Someday, Task, Event, Deadline — each with the right fields, nothing extra |
| **Add in <3 taps** | FAB always visible, smart defaults remembered                              |

---

## Entry Types

| Type         | Date               | Time        | Use Case                             |
| ------------ | ------------------ | ----------- | ------------------------------------ |
| **Someday**  | None               | None        | Ideas, goals, "maybe someday" items  |
| **Task**     | ✅ Today (default) | Optional    | Things to do, with or without a time |
| **Event**    | ✅ Required        | ✅ Required | Time-blocked commitments             |
| **Deadline** | ✅ Required        | Optional    | Things due by a date                 |

---

## Target Users

**Primary — The Overwhelmed Professional**

> _"I don't need another list. I need someone to tell me what I actually need to do today."_
> Marco, 34 · Product Manager · Milan

**Secondary — The Time-Conscious Creator**

> _"I don't have time for time management. Just show me what's next."_
> Luca, 31 · Solo Founder · Rome

**Tertiary — The Reflective Builder**

> _"Most apps feel like they're trying to trick me into being productive. I want something that works with my thinking."_
> Sofia, 28 · Freelance Designer · Barcelona

---

## Objectives

1. **Clarity in <5 seconds** — Open app → know what matters today
2. **Add in ≤3 taps** — From intent to saved entry
3. **Cognitive relief** — Scale without overwhelm, context without clutter
4. **Respect for the user** — No gamification, no manipulation, no nagging
5. **Dark mode first** — A calm space to plan, not a bright office to manage

---

## Competitive Edge

| Competitor      | Their Focus         | Synapse Focus               |
| --------------- | ------------------- | --------------------------- |
| Todoist         | Complexity, filters | **Glanceable simplicity**   |
| Google Calendar | Grid, meetings      | **Temporal intuition**      |
| Things 3        | Aesthetic, Apple    | **Cross-platform, clarity** |

**Synapse wins by doing less, better.**

---

## Stack (MVP)

- **Framework**: React Native (Expo)
- **Storage**: SQLite (local-first, offline-first)
- **State**: Zustand
- **Navigation**: Expo Router

---

## Phases

| Phase      | Focus                                                      |
| ---------- | ---------------------------------------------------------- |
| **MVP**    | Home screen, 4 entry types, add/edit/delete, local storage |
| **Polish** | Dark mode, gestures, animations, empty states              |
| **Depth**  | Filters, recurring entries, data export                    |
| **Scale**  | Cross-device sync, widgets, calendar integrations          |

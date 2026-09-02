# Store — State Management (Redux Toolkit)

This directory holds the app's data-layer state. Everything that comes out of
SQLite (action items, projects, subtasks, recurring-instance completions, diary
notes) is owned by a single Redux store here, replacing the old monolithic
`DatabaseContext` (which was ~1,100 lines of state + actions + side-effects in
one provider).

```
store/
├── index.ts              configureStore: 5 slices + listener middleware
├── hooks.ts              typed useAppDispatch / useAppSelector
├── slices/               pure reducers (state shape + how actions mutate it)
│   ├── entries-slice.ts
│   ├── projects-slice.ts
│   ├── tasks-slice.ts
│   ├── recurrence-slice.ts
│   └── diary-slice.ts
├── thunks/               async DB operations (createAsyncThunk)
│   ├── entries.ts
│   ├── projects.ts
│   ├── tasks.ts
│   ├── recurrence.ts
│   ├── diary.ts
│   ├── bootstrap.ts      one-shot app bootstrap (initApp)
│   └── utils.ts          run() — log-and-rethrow helper
├── middleware/
│   └── index.ts          listener middleware: widget, Watch, notifications
└── selectors/
    └── incoming.ts       memoized/derived reads off the store
```

---

## Big picture

- **Slices** hold plain arrays (per the project's decision) — no entity
  normalization. Each slice owns one collection plus small status flags.
- **Thunks** are the only place that touches SQLite. They do
  `await ensureDb()`, run the SQL, and return the resulting rows; the slice's
  `fulfilled` reducer applies the result. This mirrors the old
  "await DB → then setState" flow, so behavior didn't change in the cutover.
- **Listener middleware** takes over the side-effects that used to live in the
  provider body: widget sync, Watch context push, notification scheduling, and
  the Watch ingest pipeline.
- **Components never touch the store directly.** They call the facade hooks
  `useDatabase()` / `useDiary()` in `hooks/`, which wrap `useAppSelector` /
  `useAppDispatch`. The facades keep the *exact* public shape the old context
  exposed, so call sites were unchanged by the migration.

---

## Store shape (`RootState`)

```ts
type RootState = {
  entries:    { entries: DbEntry[]; isLoading: boolean; isCreating: boolean };
  projects:   { projects: DbProject[] };
  tasks:      { tasks: DbTask[] };
  recurrence: { recurrenceCompletions: DbRecurrenceCompletion[] };
  diary:      { entries: DbDiaryEntry[]; isLoading: boolean };
};
```

Watch out for the two `entries` keys: `state.entries.entries` (action items)
and `state.diary.entries` (journal notes). They are different tables with
different row types.

---

## Slices

Slices are pure reducers. They don't do I/O — thunks dispatch actions and the
slice updates the array. Two small shared mutations are used per slice:

- `upsert(array, row)` — replace a row by `id` in place (or do nothing if the
  id isn't present; the row was already persisted, so a missing match is fine).
- `touch(array, id, updatedAt)` — bump only `updated_at` on one row.

### `entries-slice.ts`

State: `entries: DbEntry[]`, `isLoading`, `isCreating`.

| Action (thunk result) | Reducer behavior |
|---|---|
| `fetchEntries.pending / fulfilled / rejected` | toggles `isLoading`; `fulfilled` replaces the whole array (keeps `created_at DESC` order from SQL) |
| `createEntry.pending / fulfilled / rejected` | toggles `isCreating`; `fulfilled` prepends the new row |
| `updateEntry.fulfilled` | upserts the returned full row (the thunk re-reads the row after the UPDATE, so `updated_at` is authoritative) |
| `updateEntryStatus.fulfilled` | upserts the full row |
| `deleteEntry.fulfilled` | filters the id out |
| `deleteRecurringFuture.fulfilled` | upserts the row with the new `recurrence_end_date` |
| `deleteRecurringSeries.fulfilled` | filters the id out |
| `promoteIdeaToProject.fulfilled` | upserts the idea row (now carrying `promoted_project_id`) |
| `deleteProject.fulfilled` | nulls `project_id` / `promoted_project_id` on entries that pointed at the project |
| `createTask / updateTaskTitle / deleteTask .fulfilled` | bumps `updated_at` on the touched parent entry (cross-slice side effect) |

### `projects-slice.ts`

State: `projects: DbProject[]`.

| Action | Behavior |
|---|---|
| `fetchProjects.fulfilled` | replaces the array |
| `createProject.fulfilled` | prepends |
| `updateProject.fulfilled` | upserts the re-read row |
| `setProjectFeatured.fulfilled` | maps `is_featured` to 0/1 by id |
| `touchProject.fulfilled` | sets `last_opened_at` (skipped when the thunk reports failure) |
| `deleteProject.fulfilled` | filters the id out |
| `promoteIdeaToProject.fulfilled` | prepends the newly created project |

### `tasks-slice.ts`

State: `tasks: DbTask[]` (all subtasks of all entries; call sites filter by
`entry_id`).

| Action | Behavior |
|---|---|
| `fetchTasks.fulfilled` | replaces the array |
| `createTask.fulfilled` | appends the new task |
| `setTaskDone.fulfilled` | upserts the re-read row (done flipped in SQL) |
| `updateTaskTitle.fulfilled` | upserts the re-read row |
| `deleteTask.fulfilled` | filters the task id |
| `reorderTasks.fulfilled` | replaces the whole array (thunk re-reads all tasks after renumbering) |
| `deleteEntry / deleteRecurringSeries .fulfilled` | removes every task whose `entry_id` was deleted (app-side cascade) |

### `recurrence-slice.ts`

State: `recurrenceCompletions: DbRecurrenceCompletion[]`.

| Action | Behavior |
|---|---|
| `fetchRecurrenceCompletions.fulfilled` | replaces the array |
| `completeRecurringInstance.fulfilled` | removes any existing completion for `(entry_id, instance_date)` then appends the new one |
| `uncompleteRecurringInstance.fulfilled` | removes the matching completion |
| `deleteRecurringSeries.fulfilled` | removes all completions for the deleted entry |

### `diary-slice.ts`

State: `entries: DbDiaryEntry[]`, `isLoading`.

| Action | Behavior |
|---|---|
| `fetchDiary.pending / fulfilled / rejected` | toggles `isLoading`; `fulfilled` replaces the array (newest first) |
| `addDiaryEntry.fulfilled` | prepends (optimistic, matches query order) |
| `updateDiaryEntry.fulfilled` | upserts the re-read row |
| `deleteDiaryEntry.fulfilled` | filters the id |

---

## Thunks

Thunks wrap `lib/database.ts` — the SQL layer — unchanged. Two shared patterns:

- Every *mutating* thunk is wrapped in `run(label, fn)` (`thunks/utils.ts`),
  which `console.error`s the failure and rethrows, so the caller can surface
  it (same contract as the old context). Thunks also **re-read the affected row
  after writing** so the slice always stores the authoritative row (including
  the freshly bumped `updated_at`).
- `deleteTask` and `updateTaskTitle` read the parent `entry_id` from
  `getState()` **before** the SQL delete/rename — there's nothing left to
  inspect afterwards.

**entries.ts**
`fetchEntries(type?)` · `createEntry(data)` · `updateEntry({ id, data })` ·
`updateEntryStatus({ id, status })` · `deleteEntry(id)` ·
`deleteRecurringFuture({ id, fromDate })` · `deleteRecurringSeries(id)`

**projects.ts**
`fetchProjects()` · `createProject({ title, emoji })` ·
`updateProject({ id, data })` · `setProjectFeatured({ id, value })` ·
`touchProject(id)` (fire-and-forget; never throws, reports `{ id, at: null }`
on failure so the slice skips the recency stamp) · `deleteProject(id)` ·
`promoteIdeaToProject(ideaId)` (creates a project from an idea and stamps
`promoted_project_id` on the idea)

**tasks.ts**
`fetchTasks()` · `createTask({ entryId, title })` (bumps the parent's
`updated_at` — adding/renaming a task is an edit to the parent's shape) ·
`setTaskDone({ id, done })` (deliberately does **not** bump the parent) ·
`updateTaskTitle({ id, title })` · `deleteTask(id)` · `reorderTasks(orderedIds)`

**recurrence.ts**
`fetchRecurrenceCompletions()` · `completeRecurringInstance({ entryId,
instanceDate, status })` · `uncompleteRecurringInstance({ entryId,
instanceDate })` · `skipRecurringInstance({ entryId, instanceDate })` (delegates
to `complete` with status `"completed"`)

**diary.ts**
`fetchDiary()` · `addDiaryEntry({ body, mood, linkedEntryId, linkedProjectId })`
· `updateDiaryEntry({ id, data })` · `deleteDiaryEntry(id)`

---

## Middleware (`middleware/index.ts`)

A single `createListenerMiddleware` instance, added to the store via
`getDefaultMiddleware().prepend(...)`. All listeners are side-effect-only;
none of them dispatch back into the store, so there's no feedback loop.

1. **Widget + Watch context push** — matches any `entries/*` action and, from
   post-action state, writes the top-10 entries to the widget's App Group
   storage (`syncEntriesToWidget`) and pushes the top-20 titles to the Watch
   (`updateWatchContext({ phone_notes })`).
2. **Notifications — schedule** — matches `createEntry`, `updateEntry`, and
   `updateEntryStatus` `fulfilled`. Requests notification permission only for
   deadlines on create, then fire-and-forgets
   `scheduleEntryNotification(entry)` (internally a no-op for non-deadlines).
3. **Notifications — cancel** — matches `deleteEntry` and
   `deleteRecurringSeries` `fulfilled` and cancels the entry's pending
   notification.
4. **Watch pipeline** — `startWatchSync(dispatch)` is called once by `initApp`.
   It's guarded by a module flag so StrictMode double-effects can't double
   subscribe. Owns: the `pending_notes` drain on mount / AppState "active" /
   30s interval, the Watch message / context / file listeners (filed as todos
   via `createEntry`), and speech-file transcription via
   `SpeechRecognizerModule.transcribeFile`.

---

## Selectors

`selectors/incoming.ts` exports `selectIncomingCount(state, now)` — the count
of still-open deadlines/todos due within the current week. It's consumed by
`hooks/use-incoming-count.ts`, which reads it through `useAppSelector` so it
re-renders only when the `entries` slice changes. This is the template for
future derived reads (e.g. calendar/agenda projections): pure functions over
`RootState`, consumed via `useAppSelector`.

---

## Bootstrap (`thunks/bootstrap.ts`)

`initApp` — dispatched once from the root layout — replaces the old provider
init effect:

1. `ensureDb()` (opens SQLite, runs schema/migrations)
2. `seedDevDataIfEmpty` (dev-only fixture) and `seedDefaultProjectsOnce`
   (the six macro-areas), both failure-tolerant
3. fetches **all five collections** into the store (`Promise.all`), each with
   a `.catch(() => [])` so one failure can't abort the boot
4. `rescheduleAllEntries` once the entries are loaded (self-heals
   notification state)
5. `startWatchSync(dispatch)`

---

## How the app consumes the store (the facade)

Components do **not** import `useAppSelector` directly for data. They use:

- `hooks/use-database/use-database.ts` → `useDatabase()` — returns the old
  context's full surface: the five collections, `isLoading`, `isCreating`, and
  every action as a `dispatch(thunk(...)).unwrap()` wrapper. `fetchEntries` /
  `fetchProjects` / `refetchTasks` / `refetchRecurrenceCompletions` swallow
  errors (return `[]`/`void`); mutations propagate rejections like before.
  `createTask` / `createProject` / `promoteIdeaToProject` unwrap to the created
  row (`DbTask` / `DbProject`). The action functions are built once per
  `dispatch` (via `useMemo`) so their identities stay stable for effect deps.
- `hooks/use-diary.ts` → `useDiary()` — `entries`, `isLoading`, `refresh`,
  `addEntry`, `updateEntry`, `removeEntry`, all backed by the shared diary
  slice. This fixed a real bug: the old hook created an independent local store
  per call site, so edits on one screen could go stale on another.

Migrating a component to narrow reads (Phase 5, in progress): replace
`useDatabase()` with specific `useAppSelector` calls (e.g. only
`state.projects.projects`) so it stops re-rendering on unrelated slices.

---

## What deliberately does NOT live in this store

- **Theme** (`contexts/theme-context.tsx`) and **onboarding**
  (`contexts/onboarding-context.tsx`) — small persisted scalars with a
  ready-gate; they're fine as contexts.
- **Capture state machine** (`useCapture` / `GlobalCaptureContext`) — transient,
  per-surface UI state with project-locked instances; a global slice fits it
  poorly. It *consumes* the store (via `useDatabase` + `useDiary`) but doesn't
  live in it.
- **Persisted UI preferences** (`useUiPreference`, `useConfirm`) — small
  per-screen scalar prefs, already wrapped in their own hooks.
- **`stores/ui-store.ts`** — a tiny zustand store for `captureDockVisible`;
  unrelated to the data layer, left as-is.

---

## Conventions when adding state

1. **New table or collection** → new slice (`slices/x-slice.ts`) + thunk group
   (`thunks/x.ts`), then register both in `store/index.ts`.
2. **New mutation** → add a `createAsyncThunk` in the right thunk file
   (`run("label", ...)` for anything that should log+rethrow), re-read the row
   after writing, and handle `fulfilled` in the slice. If it touches another
   slice's rows, add an `extraReducers` case there (see how
   `deleteEntry.fulfilled` cascades into `tasks` and `entries`).
3. **New side-effect** (notifications, external sync) → a listener in
   `middleware/index.ts`, never in a component or slice.
4. **New derived read** → a pure selector in `store/selectors/`, consumed via
   `useAppSelector`; don't recompute the same projection in multiple components.
5. **Kebab-case files**, `createSlice` + `createAsyncThunk`, typed `RootState`
   / `AppDispatch` from `store/hooks.ts`. No `any` — rows are typed
   (`DbEntry`, `DbProject`, …) from `lib/types.ts`.

## Verification

```bash
npx tsc --noEmit   # typecheck (note: repo has pre-existing errors in
                   # goldie/, speech-recognizer/example, modules/watch-connectivity)
npm run lint       # expo lint (pre-existing issues in icon-symbol.tsx / screen-header.tsx)
```

No test framework is configured; behavior is exercised via the dev-seed
scenarios in Settings and on-device QA.
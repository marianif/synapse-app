# Flows

The behavioral architecture: every goal's paths through the product.

Capture is the spine — one pen key, one trigger, a four-stage machine that takes any thought and files it as the right thing. The board then reads back through two surfaces: the field (what exists, at equal volume, never curated) and the dispatch (what time has done to it, ranked and de-stacked). Projects are triage zones over one macro life area; the diary is the reflective layer that never touches the board.

Ambition order — what must exist before the app is real: capture spine → the field → the dispatch → project triage → reflective note-taking.

Open decision (flagged, not absorbed): GOALS.md says the share extension "funnels through the same capture," but the code routes share-in to the notes composer — a shared link resolves to a diary note, never through the classify spine. FLOWS.md models the code; GOALS.md's primary-action wording is a candidate follow-up.

## Flow — Put something in <!-- flow:flow:put-something-in -->
- Serves: Goal 1 — Capture a thought
- Entry: a thought is in the user's head; the pen key is reachable from any tab
- Success: the thought is filed as the right thing before it is gone
- Exit: the dock closes — thought filed, or deliberately discarded
- Handoff: the-field
- Handoff: reflective-note-taking
- Status: complete

### Step — Write it <!-- flow:step:write-it -->
- Intent: get the thought out of the head
- Action: tap the pen key and type
- State: draft
- Next: classify-it
- Branch: empty blur → discarded
- Component: InputStage / capture-bar

### Step — Speak it <!-- flow:step:speak-it -->
- Intent: catch the thought by voice before it is gone
- Action: long-press the pen key and speak
- State: recording
- Next: classify-it
- Branch: voice stopped with no text → discarded
- Component: RecordingStage / capture-bar

### Step — Classify it <!-- flow:step:classify-it -->
- Intent: decide what kind of thing this is
- Action: tap keep / do it / by a date / note
- State: pending-thought
- Next: set-when-and-where
- Branch: seeded door (type-specific empty state) skips this step → set-when-and-where
- Branch: back → discarded
- Component: capture-resolver

### Step — Arm by kind <!-- flow:step:arm-by-kind -->
- Intent: skip the classify door — the kind is already known
- Action: tap the project FAB or a starter row
- State: workbench
- Next: set-when-and-where
- Branch: idea / note have no workbench → file-it
- Component: ProjectComposer

### Step — Set when and where <!-- flow:step:set-when-and-where -->
- Intent: commit the dated verb's WHEN and PROJECT
- Action: tap the value words on the workbench
- State: workbench
- Next: file-it
- Branch: locked project hides the picker, attribution implied → file-it
- Component: capture-resolver workbench

### Step — File it <!-- flow:step:file-it -->
- Intent: land the thought where it belongs
- Action: tap the check
- State: saved-unfiled
- Next: done
- Branch: note with no recent ideas files free immediately → filed-as-note
- Component: capture-resolver
- Exit: true

### State — Draft <!-- flow:state:draft -->
- Meaning: the thought is typed, not yet submitted
- Next: classify-it
- Recovery: submit to classify, or blur to discard

### State — Recording <!-- flow:state:recording -->
- Meaning: voice is live, the waveform is showing
- Next: classify-it
- Recovery: stop → transcript flows on; cancel discards

### State — Pending thought <!-- flow:state:pending-thought -->
- Meaning: caught but unclassified — held in the resolver
- Next: classify-it
- Recovery: pick a door, or discard

### State — Workbench <!-- flow:state:workbench -->
- Meaning: the dated verb's WHEN / PROJECT readout is open
- Next: file-it
- Recovery: commit with the check, or back to the chooser

### State — Saved unfiled <!-- flow:state:saved-unfiled -->
- Meaning: filed and attributed to no project
- Next: exit
- Recovery: file into a project later from the field

### State — Saved filed <!-- flow:state:saved-filed -->
- Meaning: attributed to a project
- Next: exit

### State — Someday <!-- flow:state:someday -->
- Meaning: an undated todo — still a todo, marked by a badge, never a recolor
- Next: exit

### State — Filed as note <!-- flow:state:filed-as-note -->
- Meaning: the reflection landed in the diary, off the board
- Next: exit
- Recovery: link it later from the notes tab

### State — Discarded <!-- flow:state:discarded -->
- Meaning: the thought is gone on purpose
- Next: exit
- Recovery: recapture

## Flow — The field <!-- flow:flow:the-field -->
- Serves: Goal 2 — See it all at a glance
- Entry: the user opens the app on the home tab
- Success: projects and live deadlines are present without tapping — a 0-tap scan
- Exit: the user leaves the field — a tab, a detail, or capture
- Handoff: put-something-in
- Handoff: browse-and-triage-a-project
- Handoff: the-dispatch
- Status: complete

### Step — Open the app <!-- flow:step:open-the-app -->
- Intent: the 0-tap glance
- Action: open Synapse
- State: glance
- Next: read-the-board
- Screen: /(tabs)/(home)

### Step — Read the board <!-- flow:step:read-the-board -->
- Intent: see everything at equal volume, nothing hidden behind filters
- Action: scan the greeting narrative, the projects overview, the direct rows
- State: glance
- Next: done
- Branch: empty board → empty-field
- Component: FieldGreeting / ProjectsOverview / DirectOverview

### Step — Open a row <!-- flow:step:open-a-row -->
- Intent: act on one thing
- Action: tap a direct row or a project
- State: selected
- Next: close-the-loop
- Component: direct-row / direct-detail-sheet

### Step — Close the loop <!-- flow:step:close-the-loop -->
- Intent: mark it done, or remove it for good
- Action: mark done in the detail sheet, or confirm delete (tier-3, never a swipe)
- State: closed
- Next: done
- Component: direct-detail-sheet / confirm-sheet
- Exit: true

### State — Glance <!-- flow:state:glance -->
- Meaning: the whole field is visible — the core affordance
- Next: read-the-board
- Recovery: nothing to recover — presence is the point

### State — Selected <!-- flow:state:selected -->
- Meaning: one row is open in the detail sheet
- Next: close-the-loop
- Recovery: dismiss the sheet

### State — Closed <!-- flow:state:closed -->
- Meaning: a line struck through and sunk to the bottom
- Next: done

### State — Stale <!-- flow:state:stale -->
- Meaning: an unpromoted idea over a week old — resurfaced in the narrative voice
- Next: done
- Recovery: promote it, file it, or leave it — it stays visible

### State — Empty field <!-- flow:state:empty-field -->
- Meaning: nothing on the board yet — the field is an inception door
- Next: exit
- Recovery: create a project — handoff to browse-and-triage-a-project

## Flow — The dispatch <!-- flow:flow:the-dispatch -->
- Serves: Goal 2 — See it all at a glance
- Entry: the user opens the agenda tab
- Success: the board has told you what time has done to it
- Exit: the user leaves the agenda — a dispatch followed, or a tab switch
- Handoff: the-field
- Handoff: browse-and-triage-a-project
- Handoff: reflective-note-taking
- Status: complete

### Step — Read the feed <!-- flow:step:read-the-feed -->
- Intent: hear what happened — ranked, never filtered
- Action: read the dispatch lines (weight-ranked, de-stacked, one line per subject)
- State: dispatched
- Next: follow-a-dispatch
- Branch: empty board → quiet-empty
- Branch: hot lines breathe wider (space, never color); a collision absorbs calm due lines → dispatched
- Component: agenda-feed

### Step — Follow a dispatch <!-- flow:step:follow-a-dispatch -->
- Intent: act on what the board said
- Action: tap a line — entry opens its detail, project pushes the project, note goes to notes, board goes to the field
- State: dispatched
- Next: done
- Component: agenda-feed / direct-detail-sheet
- Exit: true

### State — Dispatched <!-- flow:state:dispatched -->
- Meaning: a line about what time has done — the board reading itself back
- Next: follow-a-dispatch
- Recovery: scroll on — nothing here is urgent by color

### State — Quiet empty <!-- flow:state:quiet-empty -->
- Meaning: the board has nothing to say on an empty board — the voice goes silent
- Next: exit
- Recovery: capture something, and the voice returns

## Flow — Browse and triage a project <!-- flow:flow:browse-and-triage-a-project -->
- Serves: Goal 2 — See it all at a glance
- Entry: the project shelf, a field project row, or an agenda dispatch
- Success: a life area is found and its open lines triaged in place
- Exit: the user leaves the project — back to the shelf, a line closed, archived, or deleted
- Handoff: put-something-in
- Handoff: the-field
- Status: complete

### Step — Find a project <!-- flow:step:find-a-project -->
- Intent: locate the life area
- Action: search by title, or cycle the sort chip (RECENT / BUSY / A–Z)
- State: shelf
- Next: open-a-project
- Branch: fresh install → name-your-first-life-area
- Component: projects-overview shelf / add-project-bar

### Step — Name your first life area <!-- flow:step:name-your-first-life-area -->
- Intent: inception — the empty product's first commit
- Action: type a name and create
- State: project
- Next: read-the-spine
- Component: inception band / add-project-bar

### Step — Open a project <!-- flow:step:open-a-project -->
- Intent: step inside the life area
- Action: tap the project row
- State: project
- Next: read-the-spine
- Component: project-row

### Step — Read the spine <!-- flow:step:read-the-spine -->
- Intent: see the open lines narrowed to this area
- Action: scan the spine, the ideas pin-row, the notes margin
- State: project
- Next: triage-a-line
- Component: direct-row / idea pins / notes margin

### Step — Triage a line <!-- flow:step:triage-a-line -->
- Intent: move one line forward
- Action: swipe to mark done, or swipe to delete (confirm sheet, tier-3)
- State: closed
- Next: done
- Component: swipeable-row / direct-row
- Exit: true

### Step — Manage the project <!-- flow:step:manage-the-project -->
- Intent: the tier-3 verbs, deliberately out of the way
- Action: open the overflow sheet — rename, emoji, archive, delete
- State: project
- Next: done
- Component: project-overflow-sheet
- Exit: true

### State — Shelf <!-- flow:state:shelf -->
- Meaning: the project list — three verbs only: find, feature, open
- Next: open-a-project
- Recovery: search and sort are the find path

### State — Project <!-- flow:state:project -->
- Meaning: inside one life area, its spine at a glance
- Next: read-the-spine
- Recovery: back to the shelf

## Flow — Reflective note-taking <!-- flow:flow:reflective-note-taking -->
- Serves: Goal 1 — Capture a thought
- Entry: the notes tab, the pen key (delegated), or the share extension
- Success: a reflection is written, linked to its subject or free
- Exit: the composer closes and the note is filed
- Handoff: the-dispatch
- Handoff: put-something-in
- Status: complete

### Step — Compose <!-- flow:step:compose-note -->
- Intent: write the reflection
- Action: type in the composer, or seed it from share-in
- State: draft
- Next: link-it
- Branch: share arrives on another tab → draft
- Component: notes-composer

### Step — Link it <!-- flow:step:link-it -->
- Intent: attach the reflection to its subject
- Action: pick a project or idea, or file free
- State: linked
- Next: file-the-note
- Component: link-sheet

### Step — File the note <!-- flow:step:file-the-note -->
- Intent: land it in the diary — off the board
- Action: save
- State: filed
- Next: done
- Component: notes-composer
- Exit: true

### Step — Re-relate <!-- flow:step:re-relate -->
- Intent: change where a note belongs
- Action: tap the note's relatedness chip and pick a new target
- State: linked
- Next: done
- Component: link-sheet
- Exit: true

### Step — Filter the feed <!-- flow:step:filter-the-feed -->
- Intent: read one strand of the diary
- Action: pick ALL / LINKED / FREE, or a specific project or idea
- State: filed
- Next: done
- Component: diary-filter-bar
- Exit: true

### State — Draft <!-- flow:state:draft-note -->
- Meaning: the reflection is being written, or seeded from share-in
- Next: link-it
- Recovery: dismiss discards; a queued share seeds it once mounted

### State — Linked <!-- flow:state:linked -->
- Meaning: the note attaches to an idea or project — reflective, never actionable
- Next: file-the-note
- Recovery: re-relate to move it

### State — Free <!-- flow:state:free -->
- Meaning: the note belongs to nothing
- Next: file-the-note
- Recovery: re-relate to attach it

### State — Filed <!-- flow:state:filed -->
- Meaning: in the diary, never on the board
- Next: done
- Recovery: filter and re-relate are the ways back in

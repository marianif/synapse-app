import {
  mapArchiveToRows,
  parseArchive,
  type ArchiveRows,
} from "@/lib/import-format";
import {
  buildExportDocument,
  type ExportPayload,
  type SynapseExportPreferences,
} from "@/lib/export-format";
import { SCHEMA_VERSION } from "@/lib/schema";
import type {
  DbDiaryEntry,
  DbEntry,
  DbHabit,
  DbHabitCompletion,
  DbProject,
  DbRecurrenceCompletion,
  DbTask,
  NoteMedia,
} from "@/lib/types";

const preferences: SynapseExportPreferences = {
  theme: "dark",
  notifications: { deadlines: true, projectReturns: false, habits: true },
  confirmSkips: {
    delete_entry: false,
    delete_note: true,
    delete_project: false,
    delete_task: false,
    delete_habit: false,
  },
  deadlineLeadMinutes: 30,
  dormantReminderBehavior: "summary",
};

function photo(uri: string): NoteMedia {
  return { uri, kind: "image", width: 100, height: 80 };
}

function entry(overrides: Partial<DbEntry> = {}): DbEntry {
  return {
    id: "entry-1",
    title: "Sketch a poster",
    type: "idea",
    subtitle: null,
    inspiration: null,
    scheduled_date: null,
    scheduled_time: null,
    due_date: null,
    due_time: null,
    notes: null,
    status: "scheduled",
    recurrence_rule: null,
    recurrence_end_date: null,
    project_id: null,
    due_range: null,
    promoted_project_id: null,
    is_next: 0,
    next_marked_at: null,
    media: [],
    created_at: 10,
    updated_at: 10,
    ...overrides,
  };
}

function project(): DbProject {
  return {
    id: "project-1",
    title: "Studio",
    status: "active",
    emoji: "🎛️",
    description: null,
    is_featured: 1,
    last_opened_at: null,
    created_at: 5,
    updated_at: 5,
  };
}

function note(overrides: Partial<DbDiaryEntry> = {}): DbDiaryEntry {
  return {
    id: "note-1",
    body: "A quiet day.",
    mood: null,
    linked_entry_id: null,
    linked_project_id: null,
    tags: ["calm", "work"],
    media: [],
    bookmarked: 0,
    created_at: 10,
    updated_at: 10,
    ...overrides,
  };
}

function task(): DbTask {
  return {
    id: "task-1",
    entry_id: "entry-1",
    title: "Buy ink",
    done: 0,
    position: 1,
    created_at: 10,
    updated_at: 10,
  };
}

function habit(): DbHabit {
  return {
    id: "habit-1",
    title: "Draw",
    motivation: "It keeps me sane.",
    emoji: null,
    color_hue: null,
    cadence: '{"freq":"daily"}',
    start_date: "01/09/2026",
    end_date: null,
    reminder_time: null,
    project_id: null,
    status: "active",
    created_at: 10,
    updated_at: 10,
  };
}

function habitCompletion(): DbHabitCompletion {
  return {
    id: "hc-1",
    habit_id: "habit-1",
    instance_date: "01/09/2026",
    status: "completed",
    created_at: 10,
  };
}

function recurrenceCompletion(): DbRecurrenceCompletion {
  return {
    id: "rc-1",
    entry_id: "entry-1",
    instance_date: "01/09/2026",
    status: "completed",
    created_at: 10,
  };
}

function payload(overrides: Partial<ExportPayload> = {}): ExportPayload {
  return {
    entries: [],
    projects: [],
    diaryEntries: [],
    tasks: [],
    recurrenceCompletions: [],
    habits: [],
    habitCompletions: [],
    preferences,
    appVersion: "1.0.0",
    exportedAt: "2026-09-13T00:00:00.000Z",
    ...overrides,
  };
}

function validArchiveJson(): string {
  const { document } = buildExportDocument(
    payload({
      entries: [
        entry({ media: [photo("file:///docs/media/entry.jpg")] }),
      ],
      projects: [project()],
      diaryEntries: [note({ media: [photo("file:///docs/media/note.jpg")] })],
      tasks: [task()],
      recurrenceCompletions: [recurrenceCompletion()],
      habits: [habit()],
      habitCompletions: [habitCompletion()],
    }),
  );
  return JSON.stringify(document);
}

describe("parseArchive", () => {
  it("rejects unreadable JSON", () => {
    const result = parseArchive("{not json");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("malformed");
  });

  it("rejects a file that is not a Synapse archive", () => {
    const result = parseArchive(JSON.stringify({ hello: "world" }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("bad_format");
  });

  it("rejects an archive from a newer format version", () => {
    const parsed = JSON.parse(validArchiveJson());
    parsed.formatVersion = 2;
    const result = parseArchive(JSON.stringify(parsed));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unsupported_format_version");
  });

  it("rejects an archive from a newer schema", () => {
    const parsed = JSON.parse(validArchiveJson());
    parsed.schemaVersion = SCHEMA_VERSION + 1;
    const result = parseArchive(JSON.stringify(parsed));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unsupported_schema");
  });

  it("accepts a valid archive and keeps its preferences", () => {
    const result = parseArchive(validArchiveJson());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.preferences).toEqual(preferences);
    expect(result.document.data.entries).toHaveLength(1);
    expect(result.document.data.diaryEntries).toHaveLength(1);
  });

  it("fills missing tables with empty arrays and warns", () => {
    const result = parseArchive(
      JSON.stringify({
        format: "synapse.export",
        formatVersion: 1,
        schemaVersion: 10,
        data: {},
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.document.data.entries).toEqual([]);
    expect(result.document.data.habits).toEqual([]);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.document.preferences.theme).toBe("system");
  });
});

describe("mapArchiveToRows", () => {
  it("keeps whitelisted columns and drops unknown keys", () => {
    const result = parseArchive(validArchiveJson());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rows = mapArchiveToRows(result.document);
    expect(rows.entries[0].title).toBe("Sketch a poster");
    expect(rows.entries[0]).not.toHaveProperty("unknown_column");
    expect(Object.keys(rows.projects[0]).sort()).toEqual(
      [
        "created_at",
        "description",
        "emoji",
        "id",
        "is_featured",
        "last_opened_at",
        "status",
        "title",
        "updated_at",
      ].sort(),
    );
  });

  it("omits columns an older archive lacks so defaults apply", () => {
    const result = parseArchive(validArchiveJson());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const raw = result.document.data.entries[0] as unknown as Record<
      string,
      unknown
    >;
    delete raw.recurrence_rule;
    const rows = mapArchiveToRows(result.document);
    expect(rows.entries[0]).not.toHaveProperty("recurrence_rule");
  });

  it("serializes media and tags back to the strings SQLite stores", () => {
    const result = parseArchive(validArchiveJson());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rows = mapArchiveToRows(result.document, {
      resolveMediaUri: (path) => `file:///device/${path}`,
    });
    expect(JSON.parse(rows.entries[0].media as string)).toEqual([
      {
        uri: "file:///device/media/entry.jpg",
        kind: "image",
        width: 100,
        height: 80,
      },
    ]);
    expect(rows.diaryEntries[0].tags).toBe(JSON.stringify(["calm", "work"]));
  });

  it("drops photo references whose bytes are absent from the archive", () => {
    const result = parseArchive(validArchiveJson());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rows = mapArchiveToRows(result.document, {
      presentMedia: new Set(["media/note.jpg"]),
    });
    expect(rows.entries[0].media).toBeNull();
    expect(
      JSON.parse(rows.diaryEntries[0].media as string)[0].uri,
    ).toBe("media/note.jpg");
  });
});

describe("export to import round trip", () => {
  it("restores every row with its media rewritten to archive paths", () => {
    const sourceEntry = entry({
      media: [photo("file:///docs/media/entry.jpg")],
    });
    const sourceNote = note({ media: [photo("file:///docs/media/note.jpg")] });
    const build = buildExportDocument(
      payload({
        entries: [sourceEntry],
        projects: [project()],
        diaryEntries: [sourceNote],
        tasks: [task()],
        recurrenceCompletions: [recurrenceCompletion()],
        habits: [habit()],
        habitCompletions: [habitCompletion()],
      }),
    );

    const result = parseArchive(JSON.stringify(build.document));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rows: ArchiveRows = mapArchiveToRows(result.document, {
      presentMedia: new Set(build.document.media),
    });

    const { media: _media, ...entryRest } = sourceEntry;
    expect(rows.entries[0]).toMatchObject(entryRest);
    expect(JSON.parse(rows.entries[0].media as string)[0].uri).toBe(
      "media/entry.jpg",
    );

    expect(rows.projects[0]).toMatchObject(project());
    expect(rows.tasks[0]).toMatchObject(task());
    expect(rows.recurrenceCompletions[0]).toMatchObject(
      recurrenceCompletion(),
    );
    expect(rows.habits[0]).toMatchObject(habit());
    expect(rows.habitCompletions[0]).toMatchObject(habitCompletion());

    const { tags, media: _noteMedia, ...noteRest } = sourceNote;
    expect(rows.diaryEntries[0]).toMatchObject(noteRest);
    expect(rows.diaryEntries[0].tags).toBe(JSON.stringify(tags));
    expect(JSON.parse(rows.diaryEntries[0].media as string)[0].uri).toBe(
      "media/note.jpg",
    );
  });
});

import {
  EXPORT_FORMAT,
  EXPORT_FORMAT_VERSION,
  buildExportDocument,
  mediaArchivePath,
  type ExportPayload,
  type SynapseExportPreferences,
} from "@/lib/export-format";
import { SCHEMA_VERSION } from "@/lib/schema";
import type { DbDiaryEntry, DbEntry, NoteMedia } from "@/lib/types";

const preferences: SynapseExportPreferences = {
  theme: "system",
  notifications: { deadlines: true, projectReturns: false, habits: true },
  confirmSkips: {
    delete_entry: false,
    delete_note: false,
    delete_project: false,
    delete_task: false,
    delete_habit: false,
  },
  deadlineLeadMinutes: 0,
  dormantReminderBehavior: "drop",
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

function note(overrides: Partial<DbDiaryEntry> = {}): DbDiaryEntry {
  return {
    id: "note-1",
    body: "A quiet day.",
    mood: null,
    linked_entry_id: null,
    linked_project_id: null,
    tags: [],
    media: [],
    bookmarked: 0,
    created_at: 10,
    updated_at: 10,
    ...overrides,
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

describe("mediaArchivePath", () => {
  it("keeps only the basename under media/", () => {
    expect(
      mediaArchivePath("file:///var/app/Documents/media/1712_ab12.jpg"),
    ).toBe("media/1712_ab12.jpg");
  });

  it("drops a query string", () => {
    expect(mediaArchivePath("file:///docs/media/shot.jpg?width=100")).toBe(
      "media/shot.jpg",
    );
  });

  it("falls back when there is no file name", () => {
    expect(mediaArchivePath("file:///docs/media/")).toBe("media/unknown");
  });
});

describe("buildExportDocument", () => {
  it("stamps the format envelope and counts every table", () => {
    const { document } = buildExportDocument(
      payload({
        entries: [entry(), entry({ id: "entry-2" })],
        diaryEntries: [note()],
      }),
    );

    expect(document.format).toBe(EXPORT_FORMAT);
    expect(document.formatVersion).toBe(EXPORT_FORMAT_VERSION);
    expect(document.schemaVersion).toBe(SCHEMA_VERSION);
    expect(document.appVersion).toBe("1.0.0");
    expect(document.exportedAt).toBe("2026-09-13T00:00:00.000Z");
    expect(document.counts).toEqual({
      entries: 2,
      projects: 0,
      diaryEntries: 1,
      tasks: 0,
      recurrenceCompletions: 0,
      habits: 0,
      habitCompletions: 0,
      media: 0,
    });
  });

  it("rewrites photo references to archive paths, in entries and notes", () => {
    const { document } = buildExportDocument(
      payload({
        entries: [
          entry({ media: [photo("file:///docs/media/entry.jpg")] }),
        ],
        diaryEntries: [
          note({ media: [photo("file:///docs/media/note.jpg")] }),
        ],
      }),
    );

    expect(document.data.entries[0].media[0].uri).toBe("media/entry.jpg");
    expect(document.data.diaryEntries[0].media[0].uri).toBe("media/note.jpg");
    expect(document.media).toEqual(["media/entry.jpg", "media/note.jpg"]);
    expect(document.missingMedia).toEqual([]);
  });

  it("dedupes a photo referenced by more than one row", () => {
    const shared = "file:///docs/media/shared.jpg";
    const { document, mediaSources } = buildExportDocument(
      payload({
        entries: [entry({ media: [photo(shared)] })],
        diaryEntries: [note({ media: [photo(shared)] })],
      }),
    );

    expect(document.media).toEqual(["media/shared.jpg"]);
    expect(mediaSources).toHaveLength(1);
    expect(mediaSources[0].uri).toBe(shared);
  });

  it("leaves the source rows untouched", () => {
    const original = "file:///docs/media/entry.jpg";
    const input = entry({ media: [photo(original)] });
    buildExportDocument(payload({ entries: [input] }));

    expect(input.media[0].uri).toBe(original);
  });
});

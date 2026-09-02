import { createAsyncThunk } from "@reduxjs/toolkit";

import {
  deleteProject as dbDeleteProject,
  ensureDb,
  getProjects,
  insertProject as dbInsertProject,
  setProjectFeatured as dbSetProjectFeatured,
  touchProject as dbTouchProject,
  updateProject as dbUpdateProject,
} from "@/lib/database";
import type { DbEntry, DbProject } from "@/lib/types";

import { run } from "@/store/thunks/utils";

export const fetchProjects = createAsyncThunk<DbProject[], void>(
  "projects/fetch",
  async () => {
    await ensureDb(); // ensure initDatabase (and migrations) completed
    return getProjects();
  },
);

export const createProject = createAsyncThunk<
  DbProject,
  { title: string; emoji?: string | null }
>("projects/create", ({ title, emoji }) =>
  run("createProject", async () => {
    await ensureDb();
    return dbInsertProject(title, emoji ?? null);
  }),
);

export const updateProject = createAsyncThunk<
  DbProject,
  {
    id: string;
    data: {
      title?: string;
      status?: DbProject["status"];
      emoji?: string | null;
    };
  }
>("projects/update", async ({ id, data }) => {
  await ensureDb();
  await dbUpdateProject(id, data);
  const db = await ensureDb();
  const row = await db.getFirstAsync<DbProject>(
    "SELECT * FROM projects WHERE id = ?",
    id,
  );
  if (!row) throw new Error(`Project ${id} not found`);
  return row;
});

export const setProjectFeatured = createAsyncThunk<
  { id: string; value: boolean },
  { id: string; value: boolean }
>("projects/setFeatured", async ({ id, value }) => {
  await ensureDb();
  await dbSetProjectFeatured(id, value);
  return { id, value };
});

/**
 * Mark a project as just-opened. Fire-and-forget; errors only logged and the
 * in-memory stamp is skipped so a failed touch never fabricates recency.
 */
export const touchProject = createAsyncThunk<
  { id: string; at: number | null },
  string
>("projects/touch", async (id) => {
  try {
    await ensureDb();
    const at = Date.now();
    await dbTouchProject(id);
    return { id, at };
  } catch (error) {
    console.error("[store] touchProject failed:", error);
    return { id, at: null };
  }
});

export const deleteProject = createAsyncThunk<string, string>(
  "projects/delete",
  (id) =>
    run("deleteProject", async () => {
      await ensureDb();
      // dbDeleteProject unlinks all references first (app-side SET NULL):
      // entries become unfiled, promoted ideas lose provenance, notes go free.
      await dbDeleteProject(id);
      return id;
    }),
);

/**
 * Promote an idea into a project. The idea row survives as provenance
 * (promoted_project_id set) — the narrative layer stops resurfacing it.
 */
export const promoteIdeaToProject = createAsyncThunk<
  { project: DbProject; ideaId: string; updatedIdea: DbEntry },
  string
>("projects/promoteIdea", (ideaId) =>
  run("promoteIdeaToProject", async () => {
    const db = await ensureDb();
    const idea = await db.getFirstAsync<DbEntry>(
      "SELECT * FROM entries WHERE id = ?",
      ideaId,
    );
    if (!idea) throw new Error(`Idea ${ideaId} not found`);
    if (idea.type !== "idea")
      throw new Error(`Entry ${ideaId} is a '${idea.type}', not an idea`);

    const project = await dbInsertProject(idea.title);
    const now = Math.floor(Date.now() / 1000);
    await db.runAsync(
      "UPDATE entries SET promoted_project_id = ?, updated_at = ? WHERE id = ?",
      project.id,
      now,
      ideaId,
    );

    const updatedIdea = await db.getFirstAsync<DbEntry>(
      "SELECT * FROM entries WHERE id = ?",
      ideaId,
    );
    if (!updatedIdea) throw new Error(`Idea ${ideaId} not found`);
    return { project, ideaId, updatedIdea };
  }),
);
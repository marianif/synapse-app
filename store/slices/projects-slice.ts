import { createSlice } from "@reduxjs/toolkit";

import type { DbProject } from "@/lib/types";
import {
  createProject,
  deleteProject,
  fetchProjects,
  promoteIdeaToProject,
  setProjectFeatured,
  touchProject,
  updateProject,
} from "@/store/thunks/projects";

interface ProjectsState {
  projects: DbProject[];
}

const initialState: ProjectsState = {
  projects: [],
};

function upsert(projects: DbProject[], project: DbProject): void {
  const index = projects.findIndex((p) => p.id === project.id);
  if (index >= 0) projects[index] = project;
}

const projectsSlice = createSlice({
  name: "projects",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.projects = action.payload;
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.projects = [action.payload, ...state.projects];
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        upsert(state.projects, action.payload);
      })
      .addCase(setProjectFeatured.fulfilled, (state, action) => {
        const { id, value } = action.payload;
        state.projects = state.projects.map((p) =>
          p.id === id ? { ...p, is_featured: value ? 1 : 0 } : p,
        );
      })
      .addCase(touchProject.fulfilled, (state, action) => {
        const { id, at } = action.payload;
        if (at === null) return;
        state.projects = state.projects.map((p) =>
          p.id === id ? { ...p, last_opened_at: at } : p,
        );
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.projects = state.projects.filter(
          (p) => p.id !== action.payload,
        );
      })
      .addCase(promoteIdeaToProject.fulfilled, (state, action) => {
        state.projects = [action.payload.project, ...state.projects];
      });
  },
});

export default projectsSlice.reducer;
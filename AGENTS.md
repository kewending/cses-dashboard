<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# CSES Dashboard — Agent & AI Coding Guide

> **Read this before writing any code.** This project is not a standalone productivity app — it is the **Action & Productivity Engine (Module 2)** of a multi-module *Life OS* rooted in first-principles philosophy.

---

## 1. System Identity & Purpose

This dashboard serves the **Continuous Self-Evolution System (CSES)** — a personal operating system designed to drive a systematic transition from high-entropy, reactive living to low-entropy, self-directed evolution.

**Five core axioms govern every feature decision:**

| Axiom | Principle | Dashboard Manifestation |
|-------|-----------|------------------------|
| **Vector Anchoring** | All work must trace to a long-range goal | `Objective → Project → Task` hierarchy |
| **Boundary Metabolism** | High SNR environments only | No notifications, minimal UI clutter |
| **Antifragile Refactoring** | Failures are calibration data | Shutdown view, Error Delta tracking |
| **Endogenous Actuation (MVAU)** | Minimum viable action units | Session/Pomodoro timer, subtasks |
| **Negative Entropy Calibration** | Track and reduce the Error Delta | Daily review, progress bars, completion tracking |

**Never add a feature that contradicts these axioms** (e.g., social sharing, gamification points, streaks as vanity metrics).

---

## 2. Data Model & Hierarchy

The canonical goal-to-action pipeline is:

```
Objective  ──→  Project  ──→  Task  ──→  Subtask  ──→  Session
  (why)          (what)       (how)    (decomposed)   (when / tracked)
```

### Schema (Prisma — `prisma/schema.prisma`)

```
Task        { id, title, status, tag, priority, startDate, dueDate,
              plannedDurationMinutes, actualDurationSeconds, isCompleted,
              notes, showInKanban, order, parentTaskId, projectId }

Session     { id, taskId, startMinutes, date }

Project     { id, title, description, status, startDate, endDate, order,
              objectiveId, parentProjectId }

Objective   { id, title, description }
```

**Key relationships:**
- `Task.parentTaskId` → subtask relationship (self-referential)
- `Task.projectId` → task belongs to a Project (optional)
- `Project.objectiveId` → project belongs to an Objective (optional)
- `Project.parentProjectId` → subproject relationship (self-referential)
- `Session` → time block for a Task on a specific calendar date

---

## 3. Application Architecture

```
src/
  app/
    page.js              ← Dashboard home / sidebar navigation
    actions/
      page.js            ← Main Action Engine UI (the largest component)
      serverActions.js   ← All Prisma DB operations (Server Actions)
    identity/            ← Module 1: Core Values & Vision
    journal/             ← Module 3: Second Brain / Daily Journal
    health/              ← Module 4: Biomarkers, Sleep, Workouts
    finance/             ← Module 5: Wealth & Resource tracking
    crm/                 ← Module 6: Personal CRM
    mood/                ← Module 7: Emotion & Psychology
    environment/         ← Module 8: Inventory & Physical Space
    oracle/              ← Module 9: AI Synthesis Engine
  components/
    ProjectsView.js      ← Full Projects Kanban + Project/Objective modals
    TaskCreatorModal.js  ← Quick-create modal for new tasks
    ProjectCreatorModal.js ← Quick-create modal for new projects
    SortableTask.js      ← Draggable task row in kanban columns
    KanbanColumn.js      ← Kanban column wrapper
    ShutdownView.js      ← End-of-day review ritual
    CalendarGrid.js      ← Daily time-blocking calendar
    DraggableSession.js  ← Draggable session block on calendar
    TaskNotes.js         ← Rich text notes within detail modals
    Sidebar.js           ← Global navigation sidebar
    DateSelectorDropdown.js
    FilterDropdown.js
    MoreActionsDropdown.js
    CurrentTimeLine.js
  lib/
    prisma.js            ← Prisma client singleton
    utils.js             ← Shared helpers (date formatting, time utils)
```

---

## 4. State Management Rules

- **All state lives in `ActionEngine` (the default export of `src/app/actions/page.js`)**. It is the single source of truth for `tasks`, `sessions`, `objectives`, and `projects`.
- **Modal state (`detailTaskId`, `detailProjectId`, `detailObjectiveId`) is hoisted** to `ActionEngine` so that breadcrumb navigation can switch between modals at the top level.
- **Optimistic UI pattern**: Update local state first, then fire the server action asynchronously. Never block the UI waiting for a DB write.
- **Server Actions** are in `serverActions.js` and must be imported individually — never use `fetch()` to call API routes for standard CRUD (use Server Actions instead).

---

## 5. Component Conventions

### Modal Views (Task / Project / Objective)
All three detail modals share the same layout pattern:
1. **Top bar**: metadata fields (right side) + focus mode button + delete button
2. **Breadcrumb**: `🎯 Objective / 📁 Parent Project` — each segment is clickable and navigates between modals
3. **Title**: large editable input (`text-4xl font-bold`)
4. **Body**: list of child entities (subtasks/subprojects/tasks) with drag handle `⠿`, checkbox, clickable title, and hover-reveal delete `✕`
5. **Description**: `TaskNotes` component at the bottom

### Task/Subtask Rows
Every row follows this layout:
```
[⠿ drag] [○ checkbox] [Title — clickable] [badge] [✕ delete — hover]
```

### Creating Entities
- **Tasks**: Use `TaskCreatorModal` — title + date + duration + tag + priority + project
- **Projects**: Use `ProjectCreatorModal` — title + objective + start date + end date (status always defaults to BACKLOG; parentProjectId comes from caller context)
- **Objectives**: Inline input in the Objectives column sidebar

---

## 6. Styling Conventions

- Use Tailwind utility classes throughout
- Dark mode canvas: `bg-[var(--color-bg-dark)]`; modals use light mode `bg-[#fcfcfc]`
- CSS variables for theme tokens are defined in `globals.css`
- Hover-reveal pattern: `opacity-0 group-hover:opacity-100` with `group` on the parent
- Modal overlays: `fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm`
- Detail modals: `max-w-4xl h-[80vh] rounded-xl shadow-2xl`

---

## 7. Server Action Rules

All DB mutations live in `src/app/actions/serverActions.js`:

- Functions must be `async` and decorated with `'use server'`
- Date fields must be converted: `startDate ? new Date(startDate) : null`
- Always call `revalidatePath('/actions')` after mutations
- Use `formatTask()` / `formatProject()` helpers to normalise date fields before returning to client
- Never expose raw Prisma errors — wrap with try/catch

---

## 8. Cross-Module Integration (Future)

When building other modules (health, finance, journal, etc.), they must integrate with the Action Engine:

- A `WorkoutLog` in `/health` may auto-create a `Task` or mark a habit-linked `Task` complete
- The `/oracle` AI Synthesis Engine reads across all schemas to surface correlations (e.g., sleep score vs. task completion rate)
- The `/journal` daily anchor entry should be linkable to `Task`, `Project`, and `MoodLog` entities
- All new schemas must be added to `prisma/schema.prisma` and migrated with `prisma migrate dev`

---

## 9. What NOT to Do

- ❌ Do not add entertainment or social features
- ❌ Do not use `localStorage` for persistent data — use Prisma + SQLite
- ❌ Do not build features that don't serve a CSES axiom
- ❌ Do not use `prompt()` dialogs — always use a proper modal component
- ❌ Do not call setState inside another setState updater (causes React render errors)
- ❌ Do not fire server action side-effects from within `setState` updater functions

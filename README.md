# CSES Dashboard

> **Module 2 — Action & Productivity Engine** of the Continuous Self-Evolution System (CSES)

A personal life-OS dashboard for systematic, axiom-driven self-improvement. The dashboard turns long-range goals (Objectives) into traceable, time-tracked daily work through a structured `Objective → Project → Task → Session` pipeline.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Tailwind CSS v4 + CSS custom properties |
| Database ORM | Prisma 5 (SQLite for dev, PostgreSQL-ready) |
| Rich Text | Tiptap v3 (markdown-aware editor) |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| Charts | Recharts |
| State | React `useState` / `useEffect` / Server Actions |

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Set up the database (first run only)
npx prisma migrate dev
npx prisma generate

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

Copy `.env` and set the database URL if switching from SQLite to PostgreSQL:

```
DATABASE_URL="file:./prisma/dev.db"
```

---

## Project Structure

```
cses-dashboard/
├── prisma/
│   ├── schema.prisma          ← Data models (Task, Project, Objective, Session)
│   └── dev.db                 ← SQLite development database
│
├── src/
│   ├── app/
│   │   ├── layout.js          ← Root layout (font, global CSS)
│   │   ├── globals.css        ← CSS custom properties & base styles
│   │   ├── page.js            ← Home / sidebar navigation shell
│   │   │
│   │   ├── actions/
│   │   │   ├── page.js        ← Action Engine UI (main task/planning view)
│   │   │   └── serverActions.js ← All Prisma DB mutations (Server Actions)
│   │   │
│   │   ├── identity/          ← Module 1: Core Values & Vision
│   │   ├── journal/           ← Module 3: Second Brain / Daily Journal
│   │   ├── health/            ← Module 4: Biomarkers, Sleep, Workouts
│   │   ├── finance/           ← Module 5: Wealth & Resource tracking
│   │   ├── crm/               ← Module 6: Personal CRM
│   │   ├── mood/              ← Module 7: Emotion & Psychology
│   │   ├── environment/       ← Module 8: Inventory & Physical Space
│   │   ├── oracle/            ← Module 9: AI Synthesis Engine
│   │   ├── settings/          ← App-level settings
│   │   └── api/               ← API routes (if any REST endpoints are needed)
│   │
│   ├── components/
│   │   ├── ShutdownView.js    ← End-of-day review ritual (pie chart, task recap)
│   │   ├── ProjectsView.js    ← Projects Kanban + Project/Objective detail modals
│   │   ├── TaskCreatorModal.js ← Quick-create modal for new tasks
│   │   ├── ProjectCreatorModal.js ← Quick-create modal for new projects
│   │   ├── SortableTask.js    ← Draggable task row in Kanban columns
│   │   ├── KanbanColumn.js    ← Kanban column wrapper
│   │   ├── CalendarGrid.js    ← Daily time-blocking calendar
│   │   ├── DraggableSession.js ← Draggable session block on calendar
│   │   ├── TaskNotes.js       ← Tiptap rich-text notes inside detail modals
│   │   ├── Sidebar.js         ← Global navigation sidebar
│   │   ├── DateSelectorDropdown.js
│   │   ├── FilterDropdown.js
│   │   ├── MoreActionsDropdown.js
│   │   └── CurrentTimeLine.js ← Live "current time" indicator on calendar
│   │
│   └── lib/
│       ├── prisma.js          ← Prisma client singleton
│       └── utils.js           ← Shared helpers (date formatting, time utils)
│
├── public/                    ← Static assets
├── AGENTS.md                  ← AI coding guide & architecture rules
├── CLAUDE.md                  ← Claude-specific agent hints
├── eslint.config.mjs
├── jsconfig.json
├── next.config.mjs
├── package.json
└── postcss.config.mjs
```

---

## Data Model

```
Objective  (The "Why" — long-range goal vector)
  └── Project  (The "What" — bounded deliverable)
        └── Task  (The "How" — atomic next action)
              └── Subtask  (Optional decomposition via parentTaskId)
                    └── Session  (Tracked Pomodoro / time block)
```

### Key Schema Fields

| Model | Key Fields |
|---|---|
| `Task` | `title`, `status`, `tag`, `priority`, `startDate`, `plannedDurationMinutes`, `actualDurationSeconds`, `isCompleted`, `projectId`, `parentTaskId` |
| `Session` | `taskId`, `startMinutes`, `date` |
| `Project` | `title`, `status` (`BACKLOG→COMPLETED`), `objectiveId`, `parentProjectId`, `startDate`, `endDate` |
| `Objective` | `title`, `description` |

---

## Features (Action Engine — `/actions`)

- **Daily Planning View** — Kanban board (Today / Inbox / Next Few Days / Backlog) with drag-and-drop task reordering
- **Time-Blocking Calendar** — Draggable session blocks on a daily calendar grid
- **Multi-Day Projection** — Visualise tasks across upcoming days
- **Projects View** — Kanban board across 5 status columns; supports parent/subproject hierarchy
- **Detail Modals** — Full panes for Objective, Project, and Task with breadcrumb navigation, editable fields, and nested child lists
- **Pomodoro / Session Timer** — Per-task and per-subtask time tracking; sessions persist to DB
- **Shutdown View** — End-of-day review: time-spent pie chart, worked-on vs missed task lists, actual vs planned comparison bar
- **Focus Mode** — Distraction-free full-screen deep-work view

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server (Turbopack) |
| `npm run build` | Build production bundle |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
| `npx prisma studio` | Open Prisma DB GUI |
| `npx prisma migrate dev` | Apply schema migrations |

---

## Agent / AI Coding Guide

See [AGENTS.md](./AGENTS.md) for architecture rules, state management conventions, Server Action patterns, and a full list of what **not** to do.

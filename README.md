# CSES Dashboard

> The Continuous Self-Evolution System (CSES)

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
│   │   ├── identity/          ← Module 1: Core Values & Vision
│   │   ├── actions/           ← Module 2: Action & Productivity Engine
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
                    └── Session  (Tracked time block)
```

### Key Schema Fields

| Model | Key Fields |
|---|---|
| `Task` | `title`, `status`, `tag`, `priority`, `startDate`, `plannedDurationMinutes`, `actualDurationSeconds`, `isCompleted`, `projectId`, `parentTaskId` |
| `Session` | `taskId`, `startMinutes`, `date` |
| `Project` | `title`, `status` (`BACKLOG→COMPLETED`), `objectiveId`, `parentProjectId`, `startDate`, `endDate` |
| `Objective` | `title`, `description` |

---

## Features (Module 1: Core Identity — `/identity`) (TODO)

- **Vision & Values** — Define and visualize long-term goals and foundational life principles.
- **Axiom Mapping** — Ensure daily work aligns with overarching life vectors.

---

## Features (Module 2: Action Engine — `/actions`)

- **Daily Planning View** — Kanban board (Today / Inbox / Next Few Days / Backlog) with drag-and-drop task reordering
- **Time-Blocking Calendar** — Draggable session blocks on a daily calendar grid
- **Multi-Day Projection** — Visualise tasks across upcoming days
- **Projects View** — Kanban board across 5 status columns; supports parent/subproject hierarchy
- **Detail Modals** — Full panes for Objective, Project, and Task with breadcrumb navigation, editable fields, and nested child lists
- **Session Timer** — Per-task and per-subtask time tracking; sessions persist to DB
- **Shutdown View** — End-of-day review: time-spent pie chart, worked-on vs missed task lists, actual vs planned comparison bar
- **Focus Mode** — Distraction-free full-screen deep-work view

---

## Features (Module 3: Second Brain / Daily Journal — `/journal`)

- **Daily Anchor Entry** — A centralized daily journaling system linkable to tasks, projects, and mood logs.
- **Knowledge Base** — Capture, organize, and interlink notes, ideas, and reflections.

---

## Features (Module 4: Health Engine — `/health`)

- **Aggregated Health Dashboard** — Unified view of the latest synced health and fitness data
- **Split-Pane Daily Views** — Dedicated tabs for Sleep, Activity, Heart Rate, and Body Composition with chronological timelines and daily metric deep-dives
- **Interactive Calendar Picker** — Browse historical data; visually highlights dates containing metrics
- **Historical Trends** — Dynamic line and bar charts (powered by Recharts) showing 7, 30, and 90-day progress for vital health markers

---

## Features (Module 5: Wealth & Finance — `/finance`)

- **Resource Tracking** — Manage budgets, track net worth, and monitor financial goals.
- **Transaction Logging** — Centralized history of income and expenses across accounts.

---

## Features (Module 6: Personal CRM — `/crm`)

- **Network Management** — Tier-based contact management (e.g., T0 Core to T3 Network).
- **Interaction Logs** — Track past conversations and schedule follow-ups to maintain strong relationships.

---

## Features (Module 7: Emotion & Psychology — `/mood`) (TODO)

- **Mood Tracking** — Log daily emotional states and identify psychological patterns.
- **Cognitive Journaling** — Tools for structured reflection and emotional regulation.

---

## Features (Module 8: Environment & Physical Space — `/environment`) (TODO)

- **Inventory Management** — Track physical assets, equipment, and resources.
- **Space Optimization** — Manage the organization and decluttering of your personal spaces.

---

## Features (Module 9: AI Synthesis Engine — `/oracle`) (TODO)

- **Data Correlation** — AI-driven synthesis across all modules (e.g., analyzing how sleep affects task completion or mood).
- **Automated Insights** — Discover hidden patterns in your habits and productivity vectors.

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

# CSES Dashboard — Life OS

> **Module 2: Action & Productivity Engine** of the Continuous Self-Evolution System (CSES)

---

## What This Project Is

This is the primary web interface for the **Continuous Self-Evolution System (CSES)** — a first-principles, axiom-driven personal operating system built to facilitate a systematic transition from a high-entropy, reactive lifestyle to a low-entropy, self-directed, continuously evolving life.

The CSES Dashboard is **not a generic productivity app**. It is the operational execution layer of a holistic *Life OS* — the place where abstract long-term vectors (Objectives) break down into concrete, trackable work (Projects → Tasks → Pomodoros). Every data entity and UI decision must serve the CSES philosophy.

---

## Big Picture: The Life OS Architecture

The full Life OS is organised into 9 interconnected modules. This dashboard is the current primary build focus (Module 2), but all data models are designed with cross-module linkage in mind.

| # | Module | Domain | Status |
|---|--------|--------|--------|
| 1 | 🧠 Core Identity & Vision | The "Self" — Values, 1/5/10-year visions | Route: `/identity` |
| **2** | **⚙️ Action & Productivity Engine** | **Doing — Tasks, Projects, Objectives, Pomodoros** | **Active build (this dashboard)** |
| 3 | 📚 Second Brain & Knowledge | Thinking — Journal, Zettelkasten, Media logs | Route: `/journal` |
| 4 | 🧬 Health, Biology & Fitness | Physical — Sleep, Workouts, Biomarkers | Route: `/health` |
| 5 | 💰 Wealth & Resource Management | Financial — Income, Expenses, Net Worth | Route: `/finance` |
| 6 | 🤝 Personal CRM & Social | Relationships — Contacts, Interactions | Route: `/crm` |
| 7 | 🧘 Psychology & Emotion | Mental State — Mood, Energy, Triggers | Route: `/mood` |
| 8 | 🌍 Environment & Assets | Physical Space — Inventory, Travel | Route: `/environment` |
| 9 | 🤖 AI Synthesis Engine (Oracle) | Cross-domain AI — Correlations, Auto-scheduling | Route: `/oracle` |

---

## The CSES Philosophy (The "Why" Behind Every Feature)

The system is built on **5 Core Axioms** from [`SELF_EVOLUTION_SYSTEM.md`](../SELF_EVOLUTION_SYSTEM.md):

1. **Vector Anchoring** — All work must trace back to a long-term, environment-independent goal function. This is why every task optionally links to a Project, and every Project optionally links to an Objective.
2. **Boundary Metabolism** — High signal-to-noise environments only. The UI is intentionally distraction-free; no notifications, no news feeds.
3. **Antifragile Refactoring** — Failures and blockers are data, not errors. The shutdown/review views support this.
4. **Endogenous Actuation (MVAU)** — The Pomodoro/session timer enforces *Minimal Action Units*: the smallest possible unit of work that produces a real deliverable.
5. **Negative Entropy Calibration** — The Error Delta between planned and actual work is tracked. The daily shutdown ritual surfaces this discrepancy so the user can correct course.

---

## Data Hierarchy (Goal-to-Action Pipeline)

```
Objective  (The "Why")
  └── Project  (The "What" — a bounded deliverable)
        └── Task  (The "How" — atomic next action)
              └── Subtask  (Optional further decomposition)
                    └── Session  (Tracked Pomodoro time block)
```

- **Objectives** are the user's long-range vectors (e.g., "Complete PhD Thesis", "Build SaaS").
- **Projects** are bounded initiatives with a start/end date and status lifecycle: `BACKLOG → PLANNING → IN_PROGRESS → PAUSED → COMPLETED`.
- **Tasks** are the atomic next actions. They can be scheduled to a date, assigned to a project, and have time tracked via Sessions.
- **Sessions** are calendar time blocks. Each session is draggable on the daily calendar.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Styling | Vanilla CSS + Tailwind utility classes |
| Database ORM | Prisma (SQLite for dev, PostgreSQL-ready) |
| Drag & Drop | `@dnd-kit/core` + `@dnd-kit/sortable` |
| State | React `useState` / `useEffect` / Server Actions |

---

## Running Locally

```bash
# From the cses-dashboard directory
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Database setup (first time):**
```bash
npx prisma migrate dev
npx prisma generate
```

---

## Current Feature Set (Action Engine — `/actions`)

- **Daily Planning View** — Kanban-style task board (Today / Inbox / Next Few Days / Backlog) with a draggable calendar for time-blocking sessions
- **Multi-Day Projection** — Visualise tasks across upcoming days
- **Projects View** — Kanban board for Projects across 5 status columns; supports parent/subproject hierarchy
- **Objective, Project & Task Modals** — Full detail panes with breadcrumb hierarchy navigation, editable fields, description notes, and progress tracking
- **Pomodoro / Session Timer** — Per-task and per-subtask time tracking; sessions persist to DB
- **Shutdown View** — End-of-day review ritual aligned with CSES negative-entropy audit protocol
- **Focus Mode** — Distraction-free full-screen detail view for deep work

---

## Workspace Context

This dashboard lives inside the broader CSES workspace at:
```
C:\Users\30313357\OneDrive\Self_Improvement\
  ├── SELF_EVOLUTION_SYSTEM.md   ← The axiom framework
  ├── LIFE_OS_BLUEPRINT.md       ← The 9-module blueprint
  ├── AI_CONTEXT.md              ← AI agent persistent memory
  └── cses-dashboard\            ← This application
```

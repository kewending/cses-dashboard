'use client';
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const SCALE_CFG = {
  day:     { pxPerDay: 120, label: 'Day' },
  week:    { pxPerDay: 30,  label: 'Week' },
  month:   { pxPerDay: 8,   label: 'Month' },
  quarter: { pxPerDay: 3,   label: 'Quarter' },
  year:    { pxPerDay: 1,   label: 'Year' },
};
const ROW_H      = 36;
const HDR_H      = 52;   // 22 (month row) + 30 (day row)
const LEFT_W     = 280;
const MIN_BAR    = 12;
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const BAR_COLOR  = { project: '#3b82f6', subproject: '#22c55e', task: '#60a5fa' };

// Dynamic calendar window: 180 days before today to 365 days after (can grow)
// We no longer cap to a fixed TOTAL_DAYS — we compute lazily from the data.
// The rendered window is: origin → origin + TOTAL_DAYS_COMPUTED
// We keep a minimum window but auto-extend based on actual data dates.
const BASE_LEAD_DAYS  = 180;   // days before today shown at start
const BASE_TRAIL_DAYS = 365;   // days after today shown at end

// ─────────────────────────────────────────────────────────────────────────────
// Dark theme tokens (inline styles where Tailwind is insufficient)
// ─────────────────────────────────────────────────────────────────────────────
const D = {
  bg: 'var(--color-bg-dark)',
  bgPanel: 'var(--color-bg-panel)',
  bgHeader: 'var(--color-bg-panel)',
  bgHover: 'var(--color-bg-panel-hover)',
  border: 'var(--color-border)',
  borderSub: 'var(--color-border)',
  textPrimary: 'var(--color-text-main)',
  textSecond: 'var(--color-text-main)',
  textMuted: 'var(--color-text-muted)',
  textFaint: 'var(--color-text-muted)',
  weekendBg: 'var(--color-glass-bg)',
  divider: 'var(--color-border)',
  modalBg: 'var(--color-bg-panel)',
  modalBorder: 'var(--color-border)',
};

// ─────────────────────────────────────────────────────────────────────────────
// Date utilities — parse as local midnight (no timezone shift)
// ─────────────────────────────────────────────────────────────────────────────
function pad(n) { return String(n).padStart(2, '0'); }

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function parseD(s) {
  if (!s) return null;
  if (s instanceof Date) {
    return new Date(s.getFullYear(), s.getMonth(), s.getDate());
  }
  const datePart = String(s).split('T')[0];
  const parts = datePart.split('-').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function fmtD(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function addDays(s, n) {
  if (!s) return null;
  const d = parseD(s);
  if (!d || isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + n);
  return fmtD(d);
}

/** Returns b − a in whole days */
function diffDays(a, b) {
  const da = parseD(a), db = parseD(b);
  if (!da || !db || isNaN(da.getTime()) || isNaN(db.getTime())) return 0;
  return Math.round((db - da) / 86400000);
}

// ─────────────────────────────────────────────────────────────────────────────
// Row builder — flattens Objective → Project → Sub-project → Task hierarchy
// ─────────────────────────────────────────────────────────────────────────────
function buildRows(objectives, projects, tasks, collapsed) {
  const rows = [];
  const mainTasks   = (pid) => tasks.filter(t => t.projectId === pid && !t.parentTaskId);
  const subprojects = (pid) => projects.filter(p => p.parentProjectId === pid);

  function addProject(proj, depth) {
    rows.push({
      type: 'project', id: proj.id, title: proj.title, depth,
      startDate: proj.startDate || null, endDate: proj.endDate || null,
      isCollapsible: true,
    });
    if (collapsed[proj.id]) return;

    const subs = subprojects(proj.id);
    if (subs.length > 0) {
      subs.forEach(sub => {
        rows.push({
          type: 'subproject', id: sub.id, title: sub.title, depth: depth + 1,
          startDate: sub.startDate || null, endDate: sub.endDate || null,
          isCollapsible: true,
        });
        if (!collapsed[sub.id]) {
          mainTasks(sub.id).forEach(t => rows.push({
            type: 'task', id: t.id, title: t.title, depth: depth + 2,
            startDate: t.startDate || null,
            endDate: t.dueDate || t.startDate || null,
            isCollapsible: false, isCompleted: t.isCompleted,
          }));
        }
      });
    } else {
      mainTasks(proj.id).forEach(t => rows.push({
        type: 'task', id: t.id, title: t.title, depth: depth + 1,
        startDate: t.startDate || null,
        endDate: t.dueDate || t.startDate || null,
        isCollapsible: false, isCompleted: t.isCompleted,
      }));
    }
  }

  // Objectives
  objectives.forEach(obj => {
    rows.push({
      type: 'objective', id: obj.id, title: obj.title, depth: 0,
      startDate: null, endDate: null, isCollapsible: true,
    });
    if (!collapsed[obj.id]) {
      projects
        .filter(p => p.objectiveId === obj.id && !p.parentProjectId)
        .forEach(p => addProject(p, 1));
    }
  });

  // Unassigned projects (no objectiveId, top-level only)
  const unassigned = projects.filter(p => !p.objectiveId && !p.parentProjectId);
  if (unassigned.length > 0) {
    rows.push({
      type: 'objective', id: '__unassigned__', title: 'Unassigned', depth: 0,
      startDate: null, endDate: null, isCollapsible: true, isVirtual: true,
    });
    if (!collapsed['__unassigned__']) {
      unassigned.forEach(p => addProject(p, 1));
    }
  }

  return rows;
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline detail modal rendered OVER the timeline (no navigation)
// ─────────────────────────────────────────────────────────────────────────────
function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 12 }}>
      <span style={{ fontSize: 11, fontWeight: 600, color: D.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', width: 80, flexShrink: 0, paddingTop: 1 }}>{label}</span>
      <span style={{ fontSize: 14, color: D.textSecond, lineHeight: 1.5 }}>{value}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// GanttView component
// ─────────────────────────────────────────────────────────────────────────────
export default function GanttView({
  objectives, projects, tasks,
  updateProject, updateTask,
  setProjects, setTasks,
  onOpenTask, onOpenProject, onOpenObjective,
}) {
  // Timeline origin = BASE_LEAD_DAYS before today (fixed for session)
  const origin = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - BASE_LEAD_DAYS);
    return fmtD(d);
  }, []);

  const TODAY = useMemo(() => todayStr(), []);

  // Compute dynamic total days: enough to show all data + buffer
  const totalDays = useMemo(() => {
    let maxDate = addDays(TODAY, BASE_TRAIL_DAYS);
    [...projects, ...tasks].forEach(item => {
      const end = item.endDate || item.dueDate || item.startDate;
      if (end && end > maxDate) maxDate = addDays(end, 30);
    });
    return diffDays(origin, maxDate) + 30;
  }, [origin, TODAY, projects, tasks]);

  const [scale, setScale]         = useState('week');
  const [zoom, setZoom]           = useState(1);
  const [collapsed, setCollapsed] = useState({});
  const [hideNames, setHideNames] = useState(false);

  // Inline modals — no navigation away
  const [modalProject,   setModalProject]   = useState(null); // project/subproject object
   // objective object

  const scrollRef = useRef(null);   // single scroll container
  const dragRef   = useRef(null);   // active bar-drag state
  const barElRef  = useRef(null);   // DOM element of bar being dragged
  const panRef    = useRef(null);   // active timeline-pan state
  const pxRef     = useRef(null);   // current pxPerDay

  const pxPerDay  = SCALE_CFG[scale].pxPerDay * zoom;

  const leftW     = hideNames ? 0 : LEFT_W;
  const totalW    = totalDays * pxPerDay;
  const todayPx   = diffDays(origin, TODAY) * pxPerDay;

  // ── Derived data ────────────────────────────────────────────────────────────
  const rows = useMemo(
    () => buildRows(objectives, projects, tasks, collapsed),
    [objectives, projects, tasks, collapsed],
  );

  const headerDays = useMemo(() => (
    Array.from({ length: totalDays }, (_, i) => {
      const s = addDays(origin, i);
      const d = parseD(s);
      return {
        dateStr: s, dayNum: d.getDate(),
        dow: d.getDay(), month: d.getMonth(), year: d.getFullYear(),
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
        isToday: s === TODAY,
      };
    })
  ), [origin, TODAY, totalDays]);

  const monthGroups = useMemo(() => {
    const groups = [];
    let cur = null;
    headerDays.forEach(day => {
      const key = `${day.year}-${day.month}`;
      if (!cur || cur.key !== key) {
        if (cur) groups.push(cur);
        cur = { key, label: `${MONTHS[day.month]} ${day.year}`, count: 1 };
      } else {
        cur.count++;
      }
    });
    if (cur) groups.push(cur);
    return groups;
  }, [headerDays]);

  // ── Today scroll ─────────────────────────────────────────────────────────────
  const scrollToToday = useCallback(() => {
    if (!scrollRef.current) return;
    const px = diffDays(origin, TODAY) * pxRef.current;
    scrollRef.current.scrollLeft = Math.max(0, px - 20);
  }, [origin, TODAY]);

  useEffect(() => { scrollToToday(); }, []);       // mount
  useEffect(() => { scrollToToday(); }, [scrollToToday]);  // scale change — eslint-disable-line
  useEffect(() => { pxRef.current = pxPerDay; }, [pxPerDay]);

  // ── Zoom with preserved viewport center ──────────────────────────────────────
  // When zoom changes, we want the date that was at the horizontal centre of the
  // viewport to remain at the same position after the re-render.
  const applyZoom = useCallback((newZoomFn) => {
    const el = scrollRef.current;
    if (!el) { setZoom(newZoomFn); return; }

    // Capture the date (in fractional days from origin) at the viewport center
    const viewportCenterPx = el.scrollLeft + (el.clientWidth - leftW) / 2;
    const dayAtCenter = viewportCenterPx / pxRef.current; // days from origin

    setZoom(prevZoom => {
      const next = newZoomFn(prevZoom);
      // After state update, restore scroll so that dayAtCenter stays centred.
      // We use a microtask so the DOM has updated pxPerDay already.
      requestAnimationFrame(() => {
        if (!scrollRef.current) return;
        const newPxPerDay = SCALE_CFG[scale].pxPerDay * next;
        const newCenterPx = dayAtCenter * newPxPerDay;
        scrollRef.current.scrollLeft = Math.max(0, newCenterPx - (scrollRef.current.clientWidth - leftW) / 2);
      });
      return next;
    });
  }, [scale, leftW]);

  // ── Ctrl+Scroll → zoom (centre on cursor position) ───────────────────────────
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handle = (e) => {
      if (!e.ctrlKey) return;
      e.preventDefault();

      // Cursor position relative to the timeline area
      const rect = el.getBoundingClientRect();
      const cursorTimelinePx = (e.clientX - rect.left - leftW) + el.scrollLeft;
      const dayAtCursor = cursorTimelinePx / pxRef.current;

      const factor = e.deltaY > 0 ? 0.87 : 1.15;
      setZoom(prevZoom => {
        const next = Math.min(4, Math.max(0.25, prevZoom * factor));
        requestAnimationFrame(() => {
          if (!scrollRef.current) return;
          const newPxPerDay = SCALE_CFG[scale].pxPerDay * next;
          const newCursorPx = dayAtCursor * newPxPerDay;
          scrollRef.current.scrollLeft = Math.max(0, newCursorPx - (e.clientX - rect.left - leftW));
        });
        return next;
      });
    };
    el.addEventListener('wheel', handle, { passive: false });
    return () => el.removeEventListener('wheel', handle);
  }, [scale, leftW]);

  // ── Timeline pan (drag empty area to scroll) ─────────────────────────────────
  const handlePanStart = (e) => {
    if (e.button !== 0 || dragRef.current) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.style.cursor = 'grabbing';
    panRef.current = {
      startX: e.clientX,
      startScrollLeft: scrollRef.current?.scrollLeft ?? 0,
    };
  };

  const handlePanMove = (e) => {
    if (!panRef.current || !scrollRef.current) return;
    const deltaX = e.clientX - panRef.current.startX;
    scrollRef.current.scrollLeft = panRef.current.startScrollLeft - deltaX;
  };

  const handlePanEnd = (e) => {
    if (!panRef.current) return;
    e.currentTarget.style.cursor = 'grab';
    panRef.current = null;
  };

  // ── Bar drag (pointer capture — no global listeners) ─────────────────────────
  const handleBarPointerDown = (e, row, origLeft, origWidth) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation(); // prevent pan from starting

    const resizeEl = e.target.closest('[data-resize]');
    const mode     = resizeEl ? `resize-${resizeEl.dataset.resize}` : 'move';

    e.currentTarget.setPointerCapture(e.pointerId);
    barElRef.current = e.currentTarget;

    dragRef.current = {
      mode, row: { ...row },
      startX: e.clientX, origLeft, origWidth,
      currentDeltaDays: 0, didDrag: false,
    };
  };

  const handleBarPointerMove = (e) => {
    if (!dragRef.current || !barElRef.current) return;
    const { mode, startX, origLeft, origWidth } = dragRef.current;
    const deltaX    = e.clientX - startX;
    const deltaDays = Math.round(deltaX / pxRef.current);
    const deltaPx   = deltaDays * pxRef.current;

    if (Math.abs(deltaX) > 3) dragRef.current.didDrag = true;
    dragRef.current.currentDeltaDays = deltaDays;

    // Direct DOM mutation during drag — no React re-render per pixel
    const el = barElRef.current;
    if (mode === 'move') {
      el.style.left = `${origLeft + deltaPx}px`;
    } else if (mode === 'resize-left') {
      el.style.left  = `${origLeft + deltaPx}px`;
      el.style.width = `${Math.max(MIN_BAR, origWidth - deltaPx)}px`;
    } else if (mode === 'resize-right') {
      el.style.width = `${Math.max(MIN_BAR, origWidth + deltaPx)}px`;
    }
  };

  const handleBarPointerUp = useCallback((e, row) => {
    if (!dragRef.current) return;
    const { didDrag, currentDeltaDays, mode, row: r } = dragRef.current;

    // Clear the ref BEFORE any state updates so stale closures can't re-enter
    const barEl = barElRef.current;
    dragRef.current  = null;
    barElRef.current = null;

    if (!didDrag) {
      // Pure click → open modal
      if (row.type === 'task') {
        onOpenTask?.(row.id);
      } else if (!row.isVirtual) {
        if (row.type === 'objective') {
          const obj = objectives.find(o => o.id === row.id);
          if (obj) onOpenObjective?.(obj.id);
        } else {
          const proj = projects.find(p => p.id === row.id);
          if (proj) onOpenProject?.(proj.id);
        }
      }
      return;
    }

    // Drag ended — commit or discard
    if (currentDeltaDays !== 0 && r.startDate) {
      let newStart = r.startDate;
      let newEnd   = r.endDate;

      if (mode === 'move') {
        newStart = addDays(r.startDate, currentDeltaDays);
        newEnd   = r.endDate ? addDays(r.endDate, currentDeltaDays) : null;
      } else if (mode === 'resize-left') {
        newStart = addDays(r.startDate, currentDeltaDays);
        if (newEnd && newStart >= newEnd) newStart = addDays(newEnd, -1);
      } else if (mode === 'resize-right') {
        newEnd = r.endDate ? addDays(r.endDate, currentDeltaDays) : addDays(r.startDate, currentDeltaDays);
        if (newStart && newEnd <= newStart) newEnd = addDays(newStart, 1);
      }

      // Guard: don't save if dates became invalid
      if (!newStart) newStart = r.startDate;

      if (row.type === 'task') {
        setTasks(prev => prev.map(t =>
          t.id === row.id ? { ...t, startDate: newStart, dueDate: newEnd } : t
        ));
        updateTask(row.id, { startDate: newStart || null, dueDate: newEnd || null });
      } else {
        setProjects(prev => prev.map(p =>
          p.id === row.id ? { ...p, startDate: newStart, endDate: newEnd } : p
        ));
        updateProject(row.id, { startDate: newStart || null, endDate: newEnd || null });
      }
    }

    // We do not manually clear barEl.style.left/width here.
    // React's re-render will automatically overwrite the inline styles 
    // with the newly calculated positions.
  }, [onOpenTask, objectives, projects, setTasks, setProjects, updateTask, updateProject]);

  const toggleCollapse = (id) =>
    setCollapsed(prev => ({ ...prev, [id]: !prev[id] }));

  const bodyHeight = rows.length * ROW_H;

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div
      className="flex-1 flex flex-col overflow-hidden"
      style={{ userSelect: 'none', fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: D.bg }}
    >

      {/* ══════════ TOOLBAR ══════════ */}
      <div
        className="flex-shrink-0 flex items-center gap-2 px-4 py-2"
        style={{ backgroundColor: D.bgHeader, borderBottom: `1px solid ${D.border}` }}
      >
        {/* Hide / Show Names */}
        <button
          onClick={() => setHideNames(h => !h)}
          title="Toggle name panel"
          style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
            border: `1px solid ${hideNames ? 'rgba(99,102,241,0.5)' : D.border}`,
            background: hideNames ? 'rgba(99,102,241,0.18)' : 'transparent',
            color: hideNames ? '#a5b4fc' : D.textSecond,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
            transition: 'all 0.15s',
          }}
        >
          <span style={{ fontSize: 14, lineHeight: 1 }}>☰</span>
          {hideNames ? 'Show' : 'Hide'} Names
        </button>

        {/* Today */}
        <button
          onClick={scrollToToday}
          style={{
            padding: '5px 12px', borderRadius: 6, fontSize: 13, fontWeight: 500,
            border: `1px solid ${D.border}`,
            background: 'transparent', color: D.textSecond,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = D.bgHover}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Today
        </button>

        {/* Scale selector */}
        <select
          value={scale}
          onChange={e => setScale(e.target.value)}
          style={{
            padding: '5px 10px', borderRadius: 6, fontSize: 13, fontWeight: 500,
            border: `1px solid ${D.border}`,
            background: D.bgPanel, color: D.textSecond,
            cursor: 'pointer', outline: 'none',
          }}
        >
          {Object.entries(SCALE_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>

        {/* Zoom */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {['+', '−'].map((sym, i) => (
            <button
              key={sym}
              onClick={() => applyZoom(z => i === 0 ? Math.min(4, z * 1.3) : Math.max(0.25, z / 1.3))}
              style={{
                width: 28, height: 28, borderRadius: 6,
                border: `1px solid ${D.border}`,
                background: 'transparent', color: D.textSecond,
                cursor: 'pointer', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = D.bgHover}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >{sym}</button>
          ))}
          <span style={{ fontSize: 11, color: D.textMuted, width: 40, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}>
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* ══════════ SINGLE SCROLL CONTAINER ══════════
          Sticky header (top) + sticky left panel — all in one scrollable div.
      ═════════════════════════════════════════════════ */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto custom-scrollbar"
        style={{ backgroundColor: D.bg }}
      >
        {/* Inner canvas — full logical width */}
        <div style={{ width: leftW + totalW, minWidth: leftW + totalW }}>

          {/* ── STICKY HEADER ── */}
          <div
            className="sticky top-0 z-20 flex flex-shrink-0"
            style={{ height: HDR_H, backgroundColor: D.bgHeader }}
          >
            {/* Left name header — sticky at left-0 */}
            {!hideNames && (
              <div
                className="sticky left-0 z-30 flex-shrink-0 flex items-end px-4 pb-2"
                style={{
                  width: LEFT_W,
                  backgroundColor: D.bgHeader,
                  borderBottom: `1px solid ${D.border}`,
                  borderRight: `1px solid ${D.border}`,
                }}
              >
                <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, color: D.textFaint }}>
                  Name
                </span>
              </div>
            )}

            {/* Timeline header */}
            <div
              className="flex-shrink-0"
              style={{ width: totalW, borderBottom: `1px solid ${D.border}` }}
            >
              {/* Top row — Month labels */}
              <div className="flex" style={{ height: 22, borderBottom: `1px solid ${D.borderSub}` }}>
                {monthGroups.map(g => (
                  <div
                    key={g.key}
                    className="flex-shrink-0 flex items-center overflow-hidden px-2"
                    style={{
                      width: g.count * pxPerDay,
                      borderRight: `1px solid ${D.borderSub}`,
                    }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, color: D.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {g.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Bottom row — Day cells */}
              <div className="flex" style={{ height: 30 }}>
                {headerDays.map(day => (
                  <div
                    key={day.dateStr}
                    className="flex-shrink-0 flex items-center justify-center overflow-hidden"
                    style={{
                      width: pxPerDay,
                      borderRight: `1px solid ${D.borderSub}`,
                      backgroundColor: day.isWeekend ? 'var(--color-glass-bg)' : 'transparent',
                    }}
                  >
                    {pxPerDay >= 22 ? (
                      day.isToday ? (
                        <span style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          width: 22, height: 22, borderRadius: '50%',
                          backgroundColor: '#3b82f6', color: '#fff',
                          fontSize: 10, fontWeight: 700, flexShrink: 0,
                        }}>
                          {day.dayNum}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, fontWeight: 500, color: day.isWeekend ? D.textFaint : D.textMuted, flexShrink: 0 }}>
                          {day.dayNum}
                        </span>
                      )
                    ) : pxPerDay >= 10 && day.isToday ? (
                      <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6', flexShrink: 0 }} />
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* ── END HEADER ── */}

          {/* ── BODY ── */}
          <div className="flex" style={{ minHeight: bodyHeight }}>

            {/* Left label column — sticky at left-0 */}
            {!hideNames && (
              <div
                className="sticky left-0 z-10 flex-shrink-0"
                style={{ width: LEFT_W, backgroundColor: D.bgPanel, borderRight: `1px solid ${D.border}` }}
              >
                {rows.map((row, idx) => (
                  <div
                    key={`${row.id}-lbl-${idx}`}
                    className="flex items-center transition-colors"
                    style={{
                      height: ROW_H,
                      paddingLeft: 8 + row.depth * 16,
                      borderBottom: `1px solid ${D.borderSub}`,
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = D.bgHover}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Collapse toggle */}
                    {row.isCollapsible ? (
                      <button
                        onClick={() => toggleCollapse(row.id)}
                        style={{
                          width: 16, height: 16, display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 9, fontWeight: 700,
                          color: D.textFaint, flexShrink: 0, marginRight: 4,
                          background: 'none', border: 'none', cursor: 'pointer',
                          transition: 'color 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = D.textMuted}
                        onMouseLeave={e => e.currentTarget.style.color = D.textFaint}
                      >
                        {collapsed[row.id] ? '▶' : '▼'}
                      </button>
                    ) : (
                      <span style={{ width: 20, flexShrink: 0 }} />
                    )}

                    {/* Type icon */}
                    <span style={{ marginRight: 6, flexShrink: 0, fontSize: 13, lineHeight: 1 }}>
                      {row.type === 'objective' ? '🎯'
                       : row.type === 'project' ? '📁'
                       : row.type === 'subproject' ? '≡'
                       : '○'}
                    </span>

                    {/* Title — opens inline modal, never navigates away */}
                    <span
                      onClick={() => {
                        if (row.type === 'task') {
                          onOpenTask?.(row.id);
                        } else if (row.type === 'objective' && !row.isVirtual) {
                          const obj = objectives.find(o => o.id === row.id);
                          if (obj) onOpenObjective?.(obj.id);
                        } else if ((row.type === 'project' || row.type === 'subproject') && !row.isVirtual) {
                          const proj = projects.find(p => p.id === row.id);
                          if (proj) onOpenProject?.(proj.id);
                        }
                      }}
                      style={{
                        fontSize: 13,
                        fontWeight: row.type === 'objective' ? 700
                          : row.type === 'project' ? 600
                          : row.type === 'subproject' ? 500 : 400,
                        color: row.type === 'objective' ? D.textPrimary
                          : row.type === 'project' ? D.textSecond
                          : row.type === 'subproject' ? 'var(--color-text-muted)'
                          : D.textMuted,
                        cursor: row.type === 'objective' && row.isVirtual ? 'default' : 'pointer',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        opacity: row.isCompleted ? 0.4 : 1,
                        textDecoration: row.isCompleted ? 'line-through' : 'none',
                        transition: 'color 0.15s',
                        lineHeight: 1,
                      }}
                      onMouseEnter={e => {
                        if (row.type === 'objective' && !row.isVirtual) e.currentTarget.style.color = '#a5b4fc';
                        else if (row.type === 'project') e.currentTarget.style.color = '#60a5fa';
                        else if (row.type === 'subproject') e.currentTarget.style.color = '#4ade80';
                        else if (row.type === 'task') e.currentTarget.style.color = D.textPrimary;
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.color = row.type === 'objective' ? D.textPrimary
                          : row.type === 'project' ? D.textSecond
                          : row.type === 'subproject' ? 'var(--color-text-muted)'
                          : D.textMuted;
                      }}
                    >
                      {row.title}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* ── Timeline content ── */}
            <div
              className="relative flex-shrink-0"
              style={{ width: totalW, height: bodyHeight, cursor: 'grab' }}
              onPointerDown={handlePanStart}
              onPointerMove={handlePanMove}
              onPointerUp={handlePanEnd}
              onPointerCancel={handlePanEnd}
            >
              {/* Weekend column shading */}
              {headerDays.map((day, i) =>
                day.isWeekend ? (
                  <div
                    key={`${day.dateStr}-ws`}
                    style={{
                      position: 'absolute', top: 0, left: i * pxPerDay,
                      width: pxPerDay, height: '100%',
                      backgroundColor: D.weekendBg,
                      pointerEvents: 'none',
                    }}
                  />
                ) : null
              )}

              {/* Today vertical line */}
              {todayPx >= 0 && todayPx <= totalW && (
                <div
                  style={{
                    position: 'absolute', top: 0,
                    left: todayPx + pxPerDay / 2 - 0.75,
                    width: 1.5, height: '100%',
                    backgroundColor: '#f87171',
                    zIndex: 5, pointerEvents: 'none',
                  }}
                />
              )}

              {/* Row dividers */}
              {rows.map((row, idx) => (
                <div
                  key={`${row.id}-dv-${idx}`}
                  style={{
                    position: 'absolute', top: (idx + 1) * ROW_H - 1, left: 0,
                    width: '100%', height: 1,
                    backgroundColor: D.divider,
                    pointerEvents: 'none',
                  }}
                />
              ))}

              {/* ── Gantt bars ── */}
              {rows.map((row, idx) => {
                const color = BAR_COLOR[row.type];
                if (!color || !row.startDate) return null; // objectives: no bar

                const startPx = diffDays(origin, row.startDate) * pxPerDay;
                const rawEnd  = row.endDate
                  ? diffDays(origin, row.endDate) * pxPerDay + pxPerDay
                  : startPx + pxPerDay;
                const barW   = Math.max(MIN_BAR, rawEnd - startPx);
                const isTask = row.type === 'task';
                const barH   = isTask ? 11 : 20;
                const barTop = idx * ROW_H + (ROW_H - barH) / 2;

                return (
                  <div
                    key={`${row.id}-bar`}
                    style={{
                      position: 'absolute',
                      top: barTop, left: startPx,
                      width: barW, height: barH,
                      backgroundColor: color,
                      borderRadius: 4,
                      opacity: row.isCompleted ? 0.35 : 1,
                      cursor: 'grab',
                      zIndex: 6,
                      display: 'flex', alignItems: 'center',
                      boxShadow: `0 1px 4px rgba(0,0,0,0.4)`,
                      willChange: 'left, width',
                    }}
                    onPointerDown={e => handleBarPointerDown(e, row, startPx, barW)}
                    onPointerMove={handleBarPointerMove}
                    onPointerUp={e => handleBarPointerUp(e, row)}
                  >
                    {/* Left resize handle (projects + subprojects only) */}
                    {!isTask && barW > 20 && (
                      <div
                        data-resize="left"
                        style={{
                          position: 'absolute', left: 0, top: 0, bottom: 0, width: 7,
                          cursor: 'ew-resize', borderRadius: '4px 0 0 4px', zIndex: 1,
                        }}
                        className="hover:bg-black/25 transition-colors"
                      />
                    )}

                    {/* Bar label */}
                    {barW > 32 && (
                      <span
                        style={{
                          position: 'absolute',
                          left: isTask ? 4 : 9, right: isTask ? 4 : 9,
                          fontSize: 10, fontWeight: 600,
                          color: 'var(--color-text-main)',
                          overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
                          pointerEvents: 'none',
                        }}
                      >
                        {row.title}
                      </span>
                    )}

                    {/* Right resize handle */}
                    {!isTask && barW > 20 && (
                      <div
                        data-resize="right"
                        style={{
                          position: 'absolute', right: 0, top: 0, bottom: 0, width: 7,
                          cursor: 'ew-resize', borderRadius: '0 4px 4px 0', zIndex: 1,
                        }}
                        className="hover:bg-black/25 transition-colors"
                      />
                    )}
                  </div>
                );
              })}
            </div>
            {/* ── END timeline content ── */}

          </div>
          {/* ── END BODY ── */}

        </div>
      </div>
      {/* ── END SCROLL CONTAINER ── */}

          </div>
  );
}

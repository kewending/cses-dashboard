"use client";

import { useState, useRef, useEffect, useMemo } from 'react';

export default function ProjectFilterDropdown({
  parentProjectFilter,
  setParentProjectFilter,
  objectiveFilter,
  setObjectiveFilter,
  allProjects = [],
  objectives = []
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter root/parent projects (!parentProjectId)
  const parentProjects = useMemo(() => {
    return allProjects.filter(p => !p.parentProjectId);
  }, [allProjects]);

  // Subprojects count map: parentId -> count
  const subprojectCountMap = useMemo(() => {
    const map = new Map();
    allProjects.forEach(p => {
      if (p.parentProjectId) {
        map.set(p.parentProjectId, (map.get(p.parentProjectId) || 0) + 1);
      }
    });
    return map;
  }, [allProjects]);

  const activeParent = useMemo(() => {
    if (parentProjectFilter === 'all') return null;
    return allProjects.find(p => p.id === parentProjectFilter);
  }, [parentProjectFilter, allProjects]);

  const activeObjective = useMemo(() => {
    if (objectiveFilter === 'all') return null;
    if (objectiveFilter === 'unassigned') return { id: 'unassigned', title: 'Unassigned' };
    return objectives.find(o => o.id === objectiveFilter);
  }, [objectiveFilter, objectives]);

  const query = search.trim().toLowerCase();

  const filteredParentProjects = useMemo(() => {
    if (!query) return parentProjects;
    return parentProjects.filter(p => p.title.toLowerCase().includes(query));
  }, [parentProjects, query]);

  const filteredObjectives = useMemo(() => {
    if (!query) return objectives;
    return objectives.filter(o => o.title.toLowerCase().includes(query));
  }, [objectives, query]);

  const hasActiveFilters = parentProjectFilter !== 'all' || objectiveFilter !== 'all';

  const resetAll = () => {
    setParentProjectFilter('all');
    setObjectiveFilter('all');
  };

  return (
    <div className="relative z-50" ref={containerRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded border text-sm font-semibold shadow-sm transition-colors ${
          hasActiveFilters
            ? 'bg-[var(--color-bg-dark)] border-[var(--color-accent)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-panel-hover)]'
            : 'bg-[var(--color-bg-dark)] border-[var(--color-border)] text-[var(--color-text-main)] hover:bg-[var(--color-bg-panel-hover)]'
        }`}
      >
        <span className="text-[12px]">≡</span>
        {activeParent ? (
          <span className="flex items-center gap-1.5 max-w-[180px]">
            <span className="text-xs">📁</span>
            <span className="truncate text-xs text-[var(--color-accent)] font-medium">
              {activeParent.title}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setParentProjectFilter('all');
              }}
              className="text-[11px] text-[var(--color-text-muted)] hover:text-red-400 p-0.5 rounded leading-none transition-colors"
              title="Clear project focus"
            >
              ✕
            </span>
          </span>
        ) : activeObjective ? (
          <span className="flex items-center gap-1.5 max-w-[180px]">
            <span className="text-xs">🎯</span>
            <span className="truncate text-xs text-[var(--color-accent)] font-medium">
              {activeObjective.title}
            </span>
            <span
              onClick={(e) => {
                e.stopPropagation();
                setObjectiveFilter('all');
              }}
              className="text-[11px] text-[var(--color-text-muted)] hover:text-red-400 p-0.5 rounded leading-none transition-colors"
              title="Clear objective filter"
            >
              ✕
            </span>
          </span>
        ) : (
          <span>Filter</span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-80 bg-[var(--color-bg-panel)] rounded-xl shadow-2xl border border-[var(--color-border)] z-50 py-2.5 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Search Input */}
          <div className="px-3 mb-2.5">
            <input
              type="text"
              placeholder="Search projects or objectives..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[var(--color-bg-dark)] border border-[var(--color-border)] rounded-lg text-xs p-2 focus:outline-none focus:border-[var(--color-accent)] text-[var(--color-text-main)] placeholder-[var(--color-text-muted)] transition-colors"
              autoFocus
            />
          </div>

          <div className="max-h-[380px] overflow-y-auto custom-scrollbar px-1 space-y-3">
            {/* Section 1: Focus on Parent Project */}
            <div>
              <div className="px-3 pb-1.5 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-bold flex items-center justify-between">
                <span>Focus on Parent Project</span>
                <span className="text-[10px] font-normal lowercase opacity-75">1 project + subprojects</span>
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    setParentProjectFilter('all');
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-panel-hover)] flex items-center justify-between transition-colors ${
                    parentProjectFilter === 'all' ? 'bg-[var(--color-bg-panel-hover)] font-semibold' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-green-500 text-sm">📁</span>
                    <span>All Projects</span>
                  </span>
                  {parentProjectFilter === 'all' && (
                    <span className="text-[var(--color-accent)] text-xs">✓</span>
                  )}
                </button>

                {filteredParentProjects.map((p) => {
                  const subCount = subprojectCountMap.get(p.id) || 0;
                  const isSelected = parentProjectFilter === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setParentProjectFilter(p.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-panel-hover)] flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-[var(--color-bg-panel-hover)] font-semibold text-[var(--color-accent)]' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate pr-2">
                        <span className="text-amber-500 text-sm flex-shrink-0">📁</span>
                        <span className="truncate">{p.title}</span>
                      </span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {subCount > 0 ? (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-dark)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
                            {subCount} {subCount === 1 ? 'sub' : 'subs'}
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--color-bg-dark)] text-[var(--color-text-muted)]/60 border border-[var(--color-border)]/50">
                            leaf
                          </span>
                        )}
                        {isSelected && (
                          <span className="text-[var(--color-accent)] text-xs">✓</span>
                        )}
                      </div>
                    </button>
                  );
                })}

                {filteredParentProjects.length === 0 && (
                  <div className="px-3 py-2 text-xs text-[var(--color-text-muted)] italic">
                    No matching parent projects
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-[var(--color-border)] my-1" />

            {/* Section 2: Filter by Objective */}
            <div>
              <div className="px-3 pb-1.5 text-[10px] uppercase tracking-wider text-[var(--color-text-muted)] font-bold">
                Filter by Objective
              </div>

              <div className="space-y-0.5">
                <button
                  onClick={() => {
                    setObjectiveFilter('all');
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-panel-hover)] flex items-center justify-between transition-colors ${
                    objectiveFilter === 'all' ? 'bg-[var(--color-bg-panel-hover)] font-semibold' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-green-500 text-sm">🎯</span>
                    <span>All Objectives</span>
                  </span>
                  {objectiveFilter === 'all' && (
                    <span className="text-[var(--color-accent)] text-xs">✓</span>
                  )}
                </button>

                {filteredObjectives.map((obj) => {
                  const isSelected = objectiveFilter === obj.id;
                  return (
                    <button
                      key={obj.id}
                      onClick={() => {
                        setObjectiveFilter(obj.id);
                        setIsOpen(false);
                      }}
                      className={`w-full text-left px-3 py-1.5 rounded-lg text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-panel-hover)] flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-[var(--color-bg-panel-hover)] font-semibold text-[var(--color-accent)]' : ''
                      }`}
                    >
                      <span className="flex items-center gap-2 truncate pr-2">
                        <span className="text-amber-500 text-sm flex-shrink-0">🎯</span>
                        <span className="truncate">{obj.title}</span>
                      </span>
                      {isSelected && (
                        <span className="text-[var(--color-accent)] text-xs flex-shrink-0">✓</span>
                      )}
                    </button>
                  );
                })}

                <button
                  onClick={() => {
                    setObjectiveFilter('unassigned');
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 rounded-lg text-xs text-[var(--color-text-main)] hover:bg-[var(--color-bg-panel-hover)] flex items-center justify-between transition-colors ${
                    objectiveFilter === 'unassigned' ? 'bg-[var(--color-bg-panel-hover)] font-semibold text-[var(--color-accent)]' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-[var(--color-text-muted)] text-sm">📥</span>
                    <span>Unassigned</span>
                  </span>
                  {objectiveFilter === 'unassigned' && (
                    <span className="text-[var(--color-accent)] text-xs">✓</span>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Reset All Filters Footer */}
          {hasActiveFilters && (
            <div className="border-t border-[var(--color-border)] mt-2 pt-2 px-3 flex justify-end">
              <button
                onClick={() => {
                  resetAll();
                  setIsOpen(false);
                }}
                className="text-[11px] text-[var(--color-accent)] hover:underline font-semibold"
              >
                Reset all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

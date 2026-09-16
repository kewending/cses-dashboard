import React, { useState } from 'react';
import TaskNotes from './TaskNotes';

export default function ObjectiveDetailModal({
  objectiveId,
  objectives,
  projects,
  setObjectives,
  updateObjective,
  setProjects,
  createProject,
  handleDeleteObjective,
  setDetailProjectId,
  setDetailObjectiveId,
  onClose
}) {
  const [isFocusMode, setIsFocusMode] = useState(false);

  const renderContent = () => {
    const detailObjective = objectives.find(o => o.id === objectiveId);
    if (!detailObjective) return null;
    
    const liveProjects = projects.filter(p => p.objectiveId === detailObjective.id);
    const total = liveProjects.length;
    const completed = liveProjects.filter(s => s.status === 'COMPLETED').length;
    const progressStr = `${completed} / ${total} Projects Completed`;
    const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

    return (
      <div className="flex flex-col h-full max-w-4xl mx-auto w-full pt-6 relative text-[var(--color-text-main)]">
        {/* Top bar: focus + delete */}
        <div className="flex items-center justify-end gap-2 w-full mb-8 text-xs font-semibold text-[var(--color-text-muted)] relative z-[90]">
          <button
            onClick={() => {
              handleDeleteObjective(detailObjective.id);
              setDetailObjectiveId(null);
            }}
            className="w-8 h-8 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500 hover:bg-red-50 transition-colors"
            title="Delete Objective"
          >
            🗑️
          </button>
          <button
            onClick={() => setIsFocusMode(!isFocusMode)}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors text-lg ${isFocusMode ? 'bg-[var(--color-bg-panel-hover)] text-[var(--color-text-main)]' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-bg-panel-hover)]'}`}
            title="Focus Mode"
          >
            ⤢
          </button>
        </div>

        <div className="flex items-start justify-between mb-10">
          <div className="flex items-center gap-4 flex-1 min-w-0">
             <span className="text-4xl">🎯</span>
             <input
               type="text"
               value={detailObjective.title}
               onChange={(e) => setObjectives(prev => prev.map(o => o.id === detailObjective.id ? { ...o, title: e.target.value } : o))}
               onBlur={(e) => updateObjective && updateObjective(detailObjective.id, { title: e.target.value })}
               className="bg-transparent text-4xl font-bold focus:outline-none flex-1 min-w-0 text-[var(--color-text-main)]"
               placeholder="Objective Title"
             />
          </div>
          
          <div className="flex flex-col items-end gap-1 ml-4 text-sm font-semibold text-[var(--color-text-muted)] shrink-0">
            <span>{progressStr}</span>
            <div className="w-32 h-2 bg-[var(--color-bg-panel-hover)] rounded-full overflow-hidden mt-1">
               <div className="h-full bg-green-500 transition-all" style={{width: `${progressPercent}%`}} />
            </div>
          </div>
        </div>
        
        <div className="mb-8">
            <h3 className="font-bold text-[var(--color-text-main)] mb-2">Projects</h3>
            <div className="flex flex-col gap-2">
              {liveProjects.map(proj => (
                <div key={proj.id} className="p-3 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg shadow-sm flex justify-between items-center hover:border-[var(--color-border-hover)] cursor-pointer" onClick={() => { setDetailObjectiveId(null); setDetailProjectId(proj.id); }}>
                  <span className="font-medium text-[var(--color-text-main)]">{proj.title}</span>
                  <span className="text-xs text-[var(--color-text-muted)] font-bold">{proj.status}</span>
                </div>
              ))}
              <button 
                onClick={async () => {
                  const title = prompt("New project title:");
                  if (title) {
                    const newP = await createProject({ title, status: 'BACKLOG', objectiveId: detailObjective.id, order: liveProjects.length });
                    setProjects(prev => [...prev, newP]);
                  }
                }}
                className="mt-2 text-sm font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:border-[var(--color-border-hover)] border-2 border-dashed border-[var(--color-border)] rounded-lg p-2 text-center transition-colors"
              >
                + Add Project
              </button>
            </div>
        </div>
        
        <div className="flex-1 min-h-0 flex flex-col mt-auto border-t border-[var(--color-border)] pt-6">
          <h3 className="font-bold text-[var(--color-text-main)] mb-2">Description</h3>
          <TaskNotes
            initialNote={detailObjective.description}
            onSave={(note) => {
              setObjectives(prev => prev.map(o => o.id === detailObjective.id ? { ...o, description: note } : o));
              updateObjective && updateObjective(detailObjective.id, { description: note });
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      {!isFocusMode && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onPointerDown={onClose}>
          <div className="bg-[var(--color-bg-panel)] border border-[var(--color-border)] w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden relative" onPointerDown={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-full bg-[var(--color-bg-panel)] flex">
              <div className="flex-1 p-10 flex flex-col overflow-y-auto overflow-x-hidden custom-scrollbar">
                {renderContent()}
              </div>
              <button onClick={onClose} className="absolute top-6 right-6 text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] text-xl font-bold">✕</button>
            </div>
          </div>
        </div>
      )}

      {isFocusMode && (
        <div className="fixed inset-0 z-[200] bg-[var(--color-bg-panel)] flex items-start justify-center p-12 overflow-y-auto overflow-x-hidden animate-in zoom-in-95 duration-200 custom-scrollbar">
          {renderContent()}
        </div>
      )}
    </>
  );
}

"use client";

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  useDraggable,
  useDroppable
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';

// --- Core Tree Helpers ---
const cloneTree = (nodes) => JSON.parse(JSON.stringify(nodes));

const findBlockPath = (nodes, id, path = []) => {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].id === id) return [...path, i];
    if (nodes[i].children) {
      const childPath = findBlockPath(nodes[i].children, id, [...path, i]);
      if (childPath) return childPath;
    }
  }
  return null;
};

const getBlockAtPath = (nodes, path) => {
  let current = nodes;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]].children;
  }
  return current[path[path.length - 1]];
};

const removeBlockAtPath = (nodes, path) => {
  let current = nodes;
  for (let i = 0; i < path.length - 1; i++) {
    current = current[path[i]].children;
  }
  const [removed] = current.splice(path[path.length - 1], 1);
  return removed;
};

const insertBlockAtPath = (nodes, path, block) => {
  let current = nodes;
  for (let i = 0; i < path.length - 1; i++) {
    if (!current[path[i]].children) current[path[i]].children = [];
    current = current[path[i]].children;
  }
  current.splice(path[path.length - 1], 0, block);
};

const gc = (nodes) => {
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i];
    if (node.children) {
      gc(node.children);
      if (node.type === 'column' && node.children.length === 0) {
        nodes.splice(i, 1);
      } else if (node.type === 'column_list') {
        if (node.children.length === 0) {
          nodes.splice(i, 1);
        } else if (node.children.length === 1) {
          const childrenToHoist = node.children[0].children || [];
          nodes.splice(i, 1, ...childrenToHoist);
        }
      }
    }
  }
};

const generateId = () => Math.random().toString(36).substr(2, 9);

// --- Widget Component ---
function WidgetWrapper({ id, children, height, onResize, indicator, activeId }) {
  const { setNodeRef: setDroppableRef } = useDroppable({ id });
  const { attributes, listeners, setNodeRef: setDraggableRef, transform, isDragging } = useDraggable({ id });

  const setRefs = (node) => {
    setDroppableRef(node);
    setDraggableRef(node);
  };

  const isTarget = indicator?.id === id;
  const dir = indicator?.direction;

  let borderClasses = '';
  if (isTarget && !isDragging) {
    if (dir === 'TOP') borderClasses = 'border-t-4 border-t-blue-500 shadow-[0_-10px_20px_-5px_rgba(59,130,246,0.6)] pt-1';
    if (dir === 'BOTTOM') borderClasses = 'border-b-4 border-b-blue-500 shadow-[0_10px_20px_-5px_rgba(59,130,246,0.6)] pb-1';
    if (dir === 'LEFT') borderClasses = 'border-l-4 border-l-blue-500 shadow-[-10px_0_20px_-5px_rgba(59,130,246,0.6)] pl-1';
    if (dir === 'RIGHT') borderClasses = 'border-r-4 border-r-blue-500 shadow-[10px_0_20px_-5px_rgba(59,130,246,0.6)] pr-1';
  }

  const style = {
    transform: CSS.Translate.toString(transform),
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.2 : 1,
    height: height || 'auto',
    minHeight: '120px',
  };

  return (
    <div ref={setRefs} style={style} className={`relative group/widget flex-shrink-0 w-full ${borderClasses}`}>
      <div {...attributes} {...listeners} className="absolute top-0 left-0 w-full h-14 cursor-grab active:cursor-grabbing z-10 rounded-t-2xl"></div>
      <div className="h-full pointer-events-auto relative z-0">{children}</div>
      <div 
        className="absolute bottom-[-8px] left-0 w-full h-4 cursor-row-resize opacity-0 group-hover/widget:opacity-100 transition-opacity flex items-center justify-center z-20"
        onPointerDown={(e) => {
          e.stopPropagation();
          const widgetNode = e.target.closest('.group\\/widget');
          const startY = e.clientY;
          const startHeight = height ? parseInt(height) : widgetNode.offsetHeight;
          const onMove = (moveEvent) => {
            const newHeight = Math.max(120, startHeight + (moveEvent.clientY - startY));
            widgetNode.style.height = `${newHeight}px`;
          };
          const onUp = (upEvent) => {
            const finalHeight = Math.max(120, startHeight + (upEvent.clientY - startY));
            onResize(id, `${finalHeight}px`);
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onUp);
          };
          document.addEventListener('pointermove', onMove);
          document.addEventListener('pointerup', onUp);
        }}
      >
        <div className="h-1.5 w-12 bg-[var(--color-glass-border)] rounded-full hover:bg-[var(--color-accent)] transition-colors shadow-[0_0_10px_var(--color-bg-dark)] border border-[rgba(255,255,255,0.05)]"></div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [rootBlocks, setRootBlocks] = useState([
    {
      id: 'row-1',
      type: 'column_list',
      children: [
        { id: 'col-1', type: 'column', width: 50, children: [{ id: 'health', type: 'widget', content: 'health', height: '280px' }] },
        { id: 'col-2', type: 'column', width: 50, children: [{ id: 'ai', type: 'widget', content: 'ai', height: '280px' }] }
      ]
    },
    {
      id: 'row-2',
      type: 'column_list',
      children: [
        { id: 'col-3', type: 'column', width: 33, children: [{ id: 'tasks', type: 'widget', content: 'tasks', height: '320px' }] },
        { id: 'col-4', type: 'column', width: 33, children: [{ id: 'calendar', type: 'widget', content: 'calendar', height: '320px' }] },
        { id: 'col-5', type: 'column', width: 33, children: [{ id: 'metrics', type: 'widget', content: 'metrics', height: '320px' }] }
      ]
    },
    { id: 'journal', type: 'widget', content: 'journal', height: '100px' }
  ]);

  const [activeId, setActiveId] = useState(null);
  const [indicator, setIndicator] = useState(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleResize = (id, newHeight) => {
    const next = cloneTree(rootBlocks);
    const path = findBlockPath(next, id);
    if (path) {
      const block = getBlockAtPath(next, path);
      block.height = newHeight;
      setRootBlocks(next);
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      setIndicator(null);
      return;
    }
    const overRect = over.rect;
    const activeRect = active.rect.current.translated;
    if (!overRect || !activeRect) return;

    const activeCenterX = activeRect.left + activeRect.width / 2;
    const activeCenterY = activeRect.top + activeRect.height / 2;
    const x = activeCenterX - overRect.left;
    const y = activeCenterY - overRect.top;

    let dir = 'BOTTOM';
    if (y < overRect.height * 0.25) dir = 'TOP';
    else if (y > overRect.height * 0.75) dir = 'BOTTOM';
    else if (x < overRect.width * 0.25) dir = 'LEFT';
    else if (x > overRect.width * 0.75) dir = 'RIGHT';

    setIndicator({ id: over.id, direction: dir });
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);
    setIndicator(null);
    if (!over || active.id === over.id || !indicator) return;

    setRootBlocks((prev) => {
      const next = cloneTree(prev);
      const activePath = findBlockPath(next, active.id);
      if (!activePath) return prev;

      // Extract the dragged block
      const draggedBlock = removeBlockAtPath(next, activePath);
      gc(next); // clean up empty containers

      const overPath = findBlockPath(next, over.id);
      if (!overPath) {
        next.push(draggedBlock);
        return next;
      }

      const overParentPath = overPath.slice(0, -1);
      const overIndex = overPath[overPath.length - 1];
      let overParent = getBlockAtPath(next, overParentPath) || { children: next };

      if (indicator.direction === 'TOP' || indicator.direction === 'BOTTOM') {
        const insertIndex = indicator.direction === 'TOP' ? overIndex : overIndex + 1;
        overParent.children.splice(insertIndex, 0, draggedBlock);
      } else {
        // FORM_COLUMN
        if (overParent.type === 'column') {
          // It's inside a column, so we add a new column to the parent column_list
          const colListPath = overParentPath.slice(0, -1);
          const colIndex = overParentPath[overParentPath.length - 1];
          const colList = getBlockAtPath(next, colListPath) || { children: next };
          const newCol = { id: `col-${generateId()}`, type: 'column', width: 50, children: [draggedBlock] };
          const insertIndex = indicator.direction === 'LEFT' ? colIndex : colIndex + 1;
          colList.children.splice(insertIndex, 0, newCol);
          // Adjust sibling widths
          colList.children.forEach(c => c.width = 100 / colList.children.length);
        } else {
          // Replace the widget with a new column_list
          const overBlock = removeBlockAtPath(next, overPath);
          const newColList = {
            id: `row-${generateId()}`,
            type: 'column_list',
            children: [
              { id: `col-${generateId()}`, type: 'column', width: 50, children: indicator.direction === 'LEFT' ? [draggedBlock] : [overBlock] },
              { id: `col-${generateId()}`, type: 'column', width: 50, children: indicator.direction === 'LEFT' ? [overBlock] : [draggedBlock] }
            ]
          };
          overParent.children.splice(overIndex, 0, newColList);
        }
      }
      gc(next);
      return next;
    });
  };

  const setColumnWidths = (colListId, newWidths) => {
    setRootBlocks(prev => {
      const next = cloneTree(prev);
      const listPath = findBlockPath(next, colListId);
      if (listPath) {
        const list = getBlockAtPath(next, listPath);
        list.children.forEach((col, i) => col.width = newWidths[i]);
      }
      return next;
    });
  };

  const renderContent = (content) => {
    switch(content) {
      case 'health': return (
        <div className="glass-panel flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center p-6 pb-2">
            <h2 className="text-lg font-semibold text-[var(--color-text-muted)] tracking-wide">Health Telemetry</h2>
            <span className="text-xs px-2 py-1 bg-[rgba(255,255,255,0.05)] rounded-md">7 Days</span>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6 pt-2 h-full">
             <div className="w-full h-full border border-dashed border-[var(--color-glass-border)] rounded-xl flex items-end justify-between gap-2 opacity-70 p-4">
              {[40, 60, 45, 80, 55, 90, 75].map((h, i) => (
                <div key={i} className="w-full bg-[var(--color-accent)]/40 rounded-t-sm hover:bg-[var(--color-accent)] transition-all cursor-pointer" style={{ height: `${h}%` }}></div>
              ))}
            </div>
          </div>
        </div>
      );
      case 'ai': return (
        <div className="glass-panel flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center p-6 pb-2">
             <h2 className="text-lg font-semibold text-[var(--color-text-muted)] tracking-wide">AI Synthesis Engine</h2>
          </div>
          <div className="flex-1 p-6 pt-2 h-full">
            <div className="h-full bg-[rgba(255,51,102,0.05)] border border-[var(--color-accent-glow)] rounded-xl p-6 flex flex-col justify-center relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--color-accent)]/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
              <p className="text-[#f0f0f0] text-[15px] leading-relaxed relative z-10 custom-scrollbar overflow-y-auto">
                <span className="text-[var(--color-accent)] font-bold mr-2 text-lg block mb-1">✦ Oracle Insight:</span> 
                Your deep sleep has averaged 1h 45m this week, correlating with a 20% increase in deep work sessions. Keep maintaining your 10:30 PM wind-down routine to maximize tomorrow's writing output.
              </p>
            </div>
          </div>
        </div>
      );
      case 'tasks': return (
        <div className="glass-panel flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center p-6 pb-4 border-b border-[var(--color-glass-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-muted)] tracking-wide">Action Pipeline</h2>
            <span className="text-xs text-[var(--color-accent)] bg-[var(--color-accent)]/10 px-2 py-1 rounded-md">3 Active</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <ul className="flex flex-col gap-3">
              <li className="flex items-start gap-3 p-3 hover:bg-[rgba(255,255,255,0.03)] rounded-lg cursor-pointer transition-colors">
                <div className="w-5 h-5 rounded border-2 border-[var(--color-accent)] mt-0.5 shrink-0"></div>
                <div className="text-sm text-white font-medium">Finish Thesis Chapter 3</div>
              </li>
              <li className="flex items-start gap-3 p-3 hover:bg-[rgba(255,255,255,0.03)] rounded-lg cursor-pointer transition-colors">
                <div className="w-5 h-5 rounded border-2 border-[var(--color-glass-border)] mt-0.5 shrink-0"></div>
                <div className="text-sm text-white font-medium">Review Q3 Budget</div>
              </li>
            </ul>
          </div>
        </div>
      );
      case 'calendar': return (
        <div className="glass-panel flex flex-col h-full overflow-hidden">
           <div className="flex justify-between items-center p-6 pb-4 border-b border-[var(--color-glass-border)]">
            <h2 className="text-lg font-semibold text-[var(--color-text-muted)] tracking-wide">Daily Schedule</h2>
          </div>
           <div className="flex flex-col gap-4 flex-1 overflow-y-auto p-4 custom-scrollbar">
             <div className="flex gap-4 text-sm relative">
               <span className="text-[var(--color-text-muted)] w-10 text-right pt-2 font-mono text-xs">09:00</span>
               <div className="flex-1 bg-[rgba(255,255,255,0.05)] rounded-lg p-3 border-l-4 border-blue-400">Deep Work</div>
             </div>
             <div className="flex items-center gap-2 -my-2 relative z-10">
               <span className="text-[var(--color-accent)] w-10 text-right text-[10px] font-bold font-mono">11:30</span>
               <div className="h-px bg-[var(--color-accent)] flex-1 relative"><div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-[var(--color-accent)] shadow-[0_0_8px_var(--color-accent-glow)]"></div></div>
             </div>
             <div className="flex gap-4 text-sm">
               <span className="text-[var(--color-text-muted)] w-10 text-right pt-2 font-mono text-xs">13:00</span>
               <div className="flex-1 bg-[rgba(255,255,255,0.05)] rounded-lg p-3 border-l-4 border-purple-400">Lunch</div>
             </div>
           </div>
        </div>
      );
      case 'metrics': return (
        <div className="flex flex-col gap-6 h-full overflow-hidden">
          <div className="glass-panel flex-1 flex flex-col justify-center items-center text-center">
            <div className="text-[var(--color-text-muted)] text-xs uppercase tracking-wider mb-2">Net Worth</div>
            <div className="text-2xl font-bold text-green-400">$142,500</div>
          </div>
          <div className="glass-panel flex-1 flex flex-col justify-center items-center text-center">
            <div className="text-[var(--color-text-muted)] text-xs uppercase tracking-wider mb-2">CRM Action</div>
            <div className="text-2xl font-bold text-[var(--color-accent)]">3 Overdue</div>
          </div>
        </div>
      );
      case 'journal': return (
        <div className="glass-panel h-full flex items-center justify-center gap-4 bg-[var(--color-accent)]/10 border-[var(--color-accent)]/30 hover:bg-[var(--color-accent)]/20 cursor-pointer transition-all p-6 group/btn">
          <span className="text-2xl group-hover/btn:scale-110 transition-transform">✍️</span>
          <span className="font-semibold text-white tracking-wide">Quick Journal Entry</span>
        </div>
      );
      default: return null;
    }
  };

  const renderBlock = (block, depth = 0) => {
    if (block.type === 'column_list') {
      return (
        <div key={block.id} className="flex flex-row w-full gap-6">
          {block.children.map((col, idx) => (
            <div key={col.id} className="relative flex flex-col gap-6 min-w-0" style={{ flex: `${col.width} 1 0%` }}>
              {col.children?.map(child => renderBlock(child, depth + 1))}
              {/* Column Resize Handle */}
              {idx < block.children.length - 1 && (
                <div 
                  className="absolute top-0 right-[-14px] w-4 h-full cursor-col-resize opacity-0 hover:opacity-100 z-30 flex items-center justify-center group/colres"
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    const startX = e.clientX;
                    const containerWidth = e.target.closest('.flex-row').offsetWidth;
                    const startLeftW = block.children[idx].width;
                    const startRightW = block.children[idx+1].width;
                    
                    const onMove = (me) => {
                      const delta = ((me.clientX - startX) / containerWidth) * 100;
                      // Update DOM instantly for silky smooth resize
                      e.target.parentElement.style.flex = `${Math.max(10, startLeftW + delta)} 1 0%`;
                      e.target.parentElement.nextElementSibling.style.flex = `${Math.max(10, startRightW - delta)} 1 0%`;
                    };
                    const onUp = (ue) => {
                      const delta = ((ue.clientX - startX) / containerWidth) * 100;
                      const newWidths = block.children.map(c => c.width);
                      newWidths[idx] = Math.max(10, startLeftW + delta);
                      newWidths[idx+1] = Math.max(10, startRightW - delta);
                      setColumnWidths(block.id, newWidths);
                      document.removeEventListener('pointermove', onMove);
                      document.removeEventListener('pointerup', onUp);
                    };
                    document.addEventListener('pointermove', onMove);
                    document.addEventListener('pointerup', onUp);
                  }}
                >
                  <div className="w-1.5 h-16 bg-[var(--color-glass-border)] rounded-full group-hover/colres:bg-[var(--color-accent)] transition-colors shadow-[0_0_10px_var(--color-bg-dark)] border border-[rgba(255,255,255,0.05)]"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      );
    }
    
    if (block.type === 'widget') {
      return (
        <WidgetWrapper key={block.id} id={block.id} height={block.height} indicator={indicator} activeId={activeId} onResize={handleResize}>
          {renderContent(block.content)}
        </WidgetWrapper>
      );
    }
  };

  // Find dragged content for preview
  let activeContent = null;
  if (activeId) {
    const p = findBlockPath(rootBlocks, activeId);
    if (p) activeContent = getBlockAtPath(rootBlocks, p);
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex items-center justify-between mb-8 px-2">
        <h1 className="text-3xl font-bold text-white tracking-wide">Dashboard</h1>
        <div className="text-[var(--color-text-muted)] text-sm">Friday, September 11, 2026</div>
      </div>
      
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-6 w-full items-start">
          {rootBlocks.map(block => renderBlock(block))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeContent ? (
            <div style={{ height: activeContent.height }} className="opacity-90 scale-105 pointer-events-none shadow-[0_30px_60px_rgba(0,0,0,0.6)] rounded-2xl w-[400px]">
              {renderContent(activeContent.content)}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

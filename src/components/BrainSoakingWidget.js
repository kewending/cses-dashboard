"use client";
import { useBrainSoaking } from "@/lib/BrainSoakingContext";
import { Headphones, Play, Pause, SkipForward, X, Power } from "lucide-react";
import { useState } from "react";
import Link from "next/link";

export default function BrainSoakingWidget() {
  const { playlist, isPlaying, handlePlayPause, handleSkip, handleQuit, currentAction, currentIndex } = useBrainSoaking();
  const [isExpanded, setIsExpanded] = useState(false);

  // If playlist hasn't been initialized, don't show the widget at all.
  if (playlist.length === 0) return null; 

  const track = playlist[currentIndex];
  
  if (!isExpanded) {
    return (
      <button 
        onClick={() => setIsExpanded(true)}
        className={`fixed bottom-6 right-24 z-50 p-3.5 rounded-full shadow-xl transition-all duration-300 hover:scale-110 flex items-center justify-center
          ${isPlaying ? 'bg-indigo-600 shadow-indigo-500/30' : 'bg-[var(--color-bg-panel)] border border-[var(--color-border)]'}`}
      >
        <Headphones className={`w-5 h-5 ${isPlaying ? 'text-white' : 'text-indigo-500'}`} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-72 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in slide-in-from-bottom-5">
      <div className="bg-indigo-600/10 p-3 flex justify-between items-center border-b border-[var(--color-border)]">
        <Link href="/english/soaking" className="flex items-center gap-2 text-indigo-500 hover:text-indigo-400 font-bold text-[10px] uppercase tracking-widest transition-colors">
          <Headphones className="w-3.5 h-3.5" />
          Brain Soaking
        </Link>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsExpanded(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors" title="Minimize">
            <X className="w-4 h-4" />
          </button>
          <button onClick={handleQuit} className="text-red-500/70 hover:text-red-500 transition-colors" title="Quit Soaking">
            <Power className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="p-4 flex flex-col gap-3">
        <div className="text-center px-2">
          <h4 className="text-lg font-bold text-[var(--color-text-main)] truncate" title={track?.text}>
            {currentAction === 'spelling' ? track?.text.split('').join('-') : (track?.text || 'Loading...')}
          </h4>
          <p className="text-[10px] text-[var(--color-text-muted)] mt-1 uppercase tracking-widest truncate" title={track?.meaning}>
            {currentAction === 'loading' ? 'Generating audio...' : track?.meaning}
          </p>
        </div>
        
        <div className="flex justify-center items-center gap-5 mt-2">
           <button onClick={handlePlayPause} className="w-12 h-12 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-indigo-500/30">
             {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-1" />}
           </button>
           <button onClick={handleSkip} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] transition-colors hover:scale-110">
             <SkipForward className="w-5 h-5 fill-current" />
           </button>
        </div>
        
        <div className="w-full mt-2">
          <div className="w-full h-1 bg-[var(--color-border)] rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${((currentIndex + 1) / playlist.length) * 100}%` }} />
          </div>
          <div className="flex justify-between text-[9px] text-[var(--color-text-muted)] font-mono mt-1">
            <span>{currentIndex + 1}</span>
            <span>{playlist.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";
import { Play, Pause, SkipForward, ArrowLeft, Loader2, ListMusic, Volume2 } from "lucide-react";
import Link from "next/link";
import { useBrainSoaking } from "@/lib/BrainSoakingContext";

export default function SoakingClient() {
  const { 
    playlist, 
    isPlaying, 
    currentIndex, 
    cache, 
    currentAction,
    handlePlayPause, 
    handleSkip, 
    initializePlaylist 
  } = useBrainSoaking();

  // Initialize the playlist in the global context if it hasn't been already
  useEffect(() => {
    if (playlist.length === 0) {
      initializePlaylist();
    }
  }, [playlist.length, initializePlaylist]);

  const currentTrack = playlist[currentIndex];
  const trackData = cache[currentTrack?.id];

  if (playlist.length === 0) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-400 animate-spin mb-4" />
        <p className="text-neutral-500 uppercase tracking-widest">Initializing Soaking Engine...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center relative overflow-hidden">
      
      {/* Background ambient glow based on state */}
      <div className={`absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-transparent transition-opacity duration-1000 ${isPlaying ? 'opacity-100' : 'opacity-0'}`} />
      
      <div className="z-10 w-full max-w-md p-6">
        <nav className="mb-12 flex justify-between items-center w-full">
          <Link href="/english" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Leave
          </Link>
          <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-2">
            <ListMusic className="w-4 h-4" />
            Brain Soaking
          </div>
        </nav>

        {/* Player UI */}
        <div className="flex flex-col items-center w-full">
          {/* Album Art / Visualizer */}
          <div className={`w-64 h-64 rounded-3xl mb-12 flex items-center justify-center transition-all duration-700 shadow-2xl ${isPlaying ? 'bg-indigo-600/10 shadow-indigo-500/20 border border-indigo-500/30' : 'bg-white/5 border border-white/10'}`}>
            <Volume2 className={`w-24 h-24 text-indigo-500 transition-all duration-500 ${isPlaying && currentAction !== 'pause' ? 'scale-110 animate-pulse' : 'scale-100 opacity-50'}`} />
          </div>

          {/* Track Info */}
          <div className="text-center w-full min-h-[120px] flex flex-col items-center">
            {currentAction === "loading" ? (
              <div className="flex flex-col items-center mt-6">
                <Loader2 className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
                <p className="text-sm text-neutral-500 tracking-widest uppercase">Generating Audio...</p>
              </div>
            ) : (
              <>
                <h1 className="text-5xl font-black tracking-tight mb-2 truncate w-full px-4">
                  {currentAction === 'spelling' ? currentTrack?.text.split('').join(' - ') : currentTrack?.text}
                </h1>
                <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-6">
                  {trackData?.sentence ? "AI Generated Example" : currentTrack?.meaning}
                </p>
                
                {trackData?.sentence && (
                  <div className={`mt-4 space-y-4 max-w-sm transition-opacity duration-500 ${currentAction === 'meaning' || currentAction === 'sentence' ? 'opacity-100' : 'opacity-40'}`}>
                    {currentTrack?.explanation && (
                      <p className={`text-md text-indigo-200 transition-opacity duration-300 ${currentAction === 'meaning' ? 'opacity-100' : 'opacity-50'}`}>
                        {currentTrack.explanation}
                      </p>
                    )}
                    <p className={`text-xl font-serif text-neutral-300 italic transition-opacity duration-300 ${currentAction === 'sentence' ? 'opacity-100' : 'opacity-50'}`}>
                      "{trackData.sentence}"
                    </p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Progress Bar */}
          <div className="w-full mt-12 mb-8">
            <div className="flex justify-between text-xs text-neutral-500 font-medium tabular-nums mb-2">
              <span>{currentIndex + 1}</span>
              <span>{playlist.length}</span>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-500" 
                style={{ width: `${((currentIndex + 1) / playlist.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-8">
            <button className="text-neutral-500 hover:text-white transition-colors">
               <ListMusic className="w-5 h-5" />
            </button>
            <button 
              onClick={handlePlayPause}
              className="w-20 h-20 bg-white text-black rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_40px_rgba(255,255,255,0.2)]"
            >
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>
            <button onClick={handleSkip} className="text-neutral-300 hover:text-white transition-colors hover:scale-110">
              <SkipForward className="w-8 h-8 fill-current" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}

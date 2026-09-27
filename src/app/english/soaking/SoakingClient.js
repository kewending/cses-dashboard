"use client";

import { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipForward, ArrowLeft, Loader2, ListMusic, Volume2 } from "lucide-react";
import Link from "next/link";
import { useSettings } from "@/lib/SettingsContext";

export default function SoakingClient({ playlist }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const isPlayingRef = useRef(false);
  const { settings, isLoaded } = useSettings();
  
  // Track data cache: { [index]: { sentence: str, wordAudio: base64, explanationAudio: base64, sentenceAudio: base64, error: boolean } }
  const [cache, setCache] = useState({});
  
  const [currentAction, setCurrentAction] = useState(""); // "word", "pause", "explanation", "sentence", "loading"
  const audioRef = useRef(null);
  
  // Ref to hold the current timeouts to allow cancelling on skip/pause
  const timerRefs = useRef([]);
  const activeProcessRef = useRef(false);

  const clearAllTimers = () => {
    timerRefs.current.forEach(clearTimeout);
    timerRefs.current = [];
    if (audioRef.current) {
      audioRef.current.pause();
    }
  };

  const wait = (ms) => new Promise(resolve => {
    const timer = setTimeout(resolve, ms);
    timerRefs.current.push(timer);
  });

  const playAudioBase64 = (base64) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(`data:audio/wav;base64,${base64}`);
      audioRef.current = audio;
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play().catch(reject);
    });
  };

  // The main preloader function
  const preloadTrack = async (index) => {
    if (index >= playlist.length || cache[index]) return; // already cached or fetching
    
    // Mark as fetching to prevent duplicates
    setCache(prev => ({ ...prev, [index]: { fetching: true } }));
    
    try {
      const track = playlist[index];
      
      // 1. Fetch dynamic sentence
      const sentenceRes = await fetch("http://localhost:8000/api/playlist/generate-sentence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: track.text, meaning: track.meaning })
      });
      const { sentence } = await sentenceRes.json();
      
      // 2. Fetch TTS for word
      const wordTtsRes = await fetch("http://localhost:8000/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: track.text })
      });
      const wordTts = await wordTtsRes.json();
      
      // 2.5 Fetch TTS for explanation (if exists)
      let explanationAudio = null;
      if (track.explanation) {
         const expTtsRes = await fetch("http://localhost:8000/api/tts", {
           method: "POST",
           headers: { "Content-Type": "application/json" },
           body: JSON.stringify({ text: track.explanation, speed: 1.1 })
         });
         const expTts = await expTtsRes.json();
         explanationAudio = expTts.audio_base64;
      }
      
      // 3. Fetch TTS for sentence
      const sentenceTtsRes = await fetch("http://localhost:8000/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sentence })
      });
      const sentenceTts = await sentenceTtsRes.json();
      
      setCache(prev => ({
        ...prev,
        [index]: {
          fetching: false,
          sentence,
          wordAudio: wordTts.audio_base64,
          explanationAudio,
          sentenceAudio: sentenceTts.audio_base64
        }
      }));
    } catch (e) {
      console.error("Failed to preload track", index, e);
      setCache(prev => ({ ...prev, [index]: { fetching: false, error: true } }));
    }
  };

  // Preload the next track whenever current index changes
  useEffect(() => {
    preloadTrack(currentIndex);
    preloadTrack(currentIndex + 1);
  }, [currentIndex]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const runTrackEngine = async (index, trackData) => {
    activeProcessRef.current = true;
    
    if (!isPlayingRef.current) {
      activeProcessRef.current = false;
      return;
    }

    // 1. Play word
    setCurrentAction("word");
    try { await playAudioBase64(trackData.wordAudio); } catch (e) {}
    
    if (!isPlayingRef.current) { activeProcessRef.current = false; return; }
    
    // 2. Short pause
    setCurrentAction("pause");
    await wait(settings?.english?.pauseAfterWord ?? 1000);
    
    if (!isPlayingRef.current) { activeProcessRef.current = false; return; }
    
    // 2.5 Play explanation if available
    if (trackData.explanationAudio) {
      setCurrentAction("explanation");
      try { await playAudioBase64(trackData.explanationAudio); } catch (e) {}
      
      if (!isPlayingRef.current) { activeProcessRef.current = false; return; }
      
      setCurrentAction("pause");
      await wait(settings?.english?.pauseAfterWord ?? 1000);
      
      if (!isPlayingRef.current) { activeProcessRef.current = false; return; }
    }
    
    // 3. Play sentence
    setCurrentAction("sentence");
    try { await playAudioBase64(trackData.sentenceAudio); } catch (e) {}
    
    if (!isPlayingRef.current) { activeProcessRef.current = false; return; }
    
    // 4. Long pause before next track
    setCurrentAction("pause");
    await wait(settings?.english?.pauseAfterSentence ?? 2000);
    
    activeProcessRef.current = false;
    
    if (isPlayingRef.current) {
      // Loop infinitely
      setCurrentIndex(prev => (prev + 1) % playlist.length);
    }
  };

  useEffect(() => {
    if (isPlaying && !activeProcessRef.current) {
      const trackData = cache[currentIndex];
      if (trackData && !trackData.fetching) {
        if (!trackData.error) {
          runTrackEngine(currentIndex, trackData);
        } else {
          // If error, just skip to next
          setCurrentIndex(prev => (prev + 1) % playlist.length);
        }
      } else {
        setCurrentAction("loading");
      }
    }
  }, [isPlaying, currentIndex, cache]);

  // Hook into MediaSession API for lockscreen controls
  useEffect(() => {
    if ('mediaSession' in navigator) {
      const currentTrack = playlist[currentIndex];
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack?.text || "Brain Soaking",
        artist: "CSES AI",
        album: "English Playlist"
      });
      
      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('nexttrack', () => handleSkip());
    }
  }, [currentIndex, playlist]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
      clearAllTimers();
    } else {
      setIsPlaying(true);
    }
  };

  const handleSkip = () => {
    clearAllTimers();
    activeProcessRef.current = false;
    setCurrentIndex((currentIndex + 1) % playlist.length);
  };

  const currentTrack = playlist[currentIndex];
  const trackData = cache[currentIndex];

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
                <h1 className="text-5xl font-black tracking-tight mb-2 truncate w-full px-4">{currentTrack?.text}</h1>
                <p className="text-sm font-bold text-neutral-500 uppercase tracking-widest mb-6">
                  {trackData?.sentence ? "AI Generated Example" : currentTrack?.meaning}
                </p>
                
                {trackData?.sentence && (
                  <div className={`mt-4 space-y-4 max-w-sm transition-opacity duration-500 ${currentAction === 'explanation' || currentAction === 'sentence' ? 'opacity-100' : 'opacity-40'}`}>
                    {currentTrack?.explanation && (
                      <p className={`text-md text-indigo-200 transition-opacity duration-300 ${currentAction === 'explanation' ? 'opacity-100' : 'opacity-50'}`}>
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

"use client";

import { useState, useEffect, useRef } from "react";
import { generateScenario } from "../../actions/scenario-generator";
import { logTrainingResult } from "../../actions/training-engine";
import { Loader2, Brain, ShieldAlert, Zap, XCircle, Settings, Keyboard, Headphones, Eye } from "lucide-react";
import { useRouter } from "next/navigation";

export default function TrainingArena({ initialQueue }) {
  const router = useRouter();
  
  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  
  // States: LOBBY, PRE_FLIGHT, TRAINING, HINT, REVEALED, FINISHED
  const [status, setStatus] = useState("LOBBY");
  const [trainingMode, setTrainingMode] = useState("REFLEX"); // REFLEX | CONTEXT_DICTATION | PURE_DICTATION
  
  const [inputValue, setInputValue] = useState("");
  const [inputError, setInputError] = useState(false);
  
  const [forgeProgress, setForgeProgress] = useState({ current: 0, total: 0 });
  const [timeLeft, setTimeLeft] = useState(10);
  
  const timerRef = useRef(null);
  const audioRef = useRef(null);
  const pureAudioRef = useRef(null);
  const inputRef = useRef(null);

  const activeWord = queue[currentIndex];
  const activeScenario = activeWord?.scenarios?.[0];

  useEffect(() => {
    if (status === "TRAINING" && timeLeft > 0) {
      timerRef.current = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    } else if (status === "TRAINING" && timeLeft === 0) {
      if (trainingMode === "REFLEX") {
        setStatus("HINT");
      } else {
        // Dictation modes fail automatically on timeout
        handleDictationSubmit(true); 
      }
    }
    return () => clearTimeout(timerRef.current);
  }, [timeLeft, status, trainingMode]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (trainingMode === "REFLEX" && e.code === "Space" && (status === "TRAINING" || status === "HINT")) {
        e.preventDefault();
        handleReveal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [status, trainingMode]);

  // Focus input automatically in dictation mode
  useEffect(() => {
    if (status === "TRAINING" && (trainingMode === "CONTEXT_DICTATION" || trainingMode === "PURE_DICTATION")) {
      if (inputRef.current) inputRef.current.focus();
    }
  }, [status, trainingMode]);

  const handleBatchSelect = (count) => {
    if (trainingMode === "PURE_DICTATION") {
      // Deduplicate words so we don't test the same spelling multiple times
      const uniqueQueue = [];
      const seen = new Set();
      for (const item of initialQueue) {
        const lower = item.text.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          uniqueQueue.push(item);
        }
      }
      
      const selectedQueue = uniqueQueue.slice(0, count);
      setQueue(selectedQueue);
      setCurrentIndex(0);
      startTraining();
    } else {
      const selectedQueue = initialQueue.slice(0, count);
      setQueue(selectedQueue);
      const missing = selectedQueue.filter(w => !w.scenarios || w.scenarios.length === 0);
      setForgeProgress({ current: 0, total: missing.length });
      setStatus("PRE_FLIGHT");
    }
  };

  useEffect(() => {
    if (status === "PRE_FLIGHT") {
      const forgeBatch = async () => {
        let currentQueue = [...queue];
        let forgedCount = 0;

        for (let i = 0; i < currentQueue.length; i++) {
          const word = currentQueue[i];
          if (!word.scenarios || word.scenarios.length === 0) {
            setForgeProgress(prev => ({ ...prev, current: forgedCount + 1 }));
            const res = await generateScenario(word.id);
            if (res.success && res.scenario) {
              currentQueue[i].scenarios = [res.scenario];
            }
            forgedCount++;
          }
        }
        
        setQueue(currentQueue);
        setCurrentIndex(0);
        startTraining();
      };
      forgeBatch();
    }
  }, [status]);

  const startTraining = () => {
    setStatus("TRAINING");
    setTimeLeft(10);
    setInputValue("");
    setInputError(false);
    
    setTimeout(playActiveAudio, 100);
  };

  const playActiveAudio = () => {
    if (trainingMode === "PURE_DICTATION") {
      if (pureAudioRef.current) {
        pureAudioRef.current.currentTime = 0;
        pureAudioRef.current.play().catch(e => console.error("Audio play failed", e));
      }
    } else {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.error("Audio play failed", e));
      }
    }
  };

  const handleReveal = () => {
    setStatus("REVEALED");
    clearTimeout(timerRef.current);
  };

  const handleDictationSubmit = async (forceFail = false) => {
    if (!activeWord) return;
    const isCorrect = inputValue.trim().toLowerCase() === activeWord.text.toLowerCase();
    
    if (forceFail || (!isCorrect && inputValue.trim().length > 0)) {
      if (!forceFail && !isCorrect) {
        // Visual shake/error if they hit enter with wrong spelling
        setInputError(true);
        setTimeout(() => setInputError(false), 500);
        return; 
      }
    }

    if (forceFail && !isCorrect) {
      setStatus("REVEALED");
      clearTimeout(timerRef.current);
      
      // Update all senses if pure dictation, otherwise just this one
      if (trainingMode === "PURE_DICTATION") {
        const matchingItems = initialQueue.filter(w => w.text.toLowerCase() === activeWord.text.toLowerCase());
        await Promise.all(matchingItems.map(item => logTrainingResult(item.id, 0)));
      } else {
        await logTrainingResult(activeWord.id, 0);
      }
      
      setTimeout(handleNextWord, 2500); 
    } else if (isCorrect) {
      setStatus("REVEALED");
      clearTimeout(timerRef.current);
      
      const rating = timeLeft >= 5 ? 2 : 1; 
      
      if (trainingMode === "PURE_DICTATION") {
        const matchingItems = initialQueue.filter(w => w.text.toLowerCase() === activeWord.text.toLowerCase());
        await Promise.all(matchingItems.map(item => logTrainingResult(item.id, rating)));
      } else {
        await logTrainingResult(activeWord.id, rating);
      }
      
      setTimeout(handleNextWord, 1000); 
    }
  };

  const handleRating = async (rating) => {
    // Only used for REFLEX mode self-assessment
    await logTrainingResult(activeWord.id, rating);
    handleNextWord();
  };

  const handleNextWord = () => {
    if (currentIndex + 1 >= queue.length) {
      setStatus("FINISHED");
    } else {
      setCurrentIndex(prev => prev + 1);
      startTraining();
    }
  };

  const renderSentence = (scenario) => {
    if (!scenario) return "";
    
    const expected = scenario.expectedResponse;
    const regex = new RegExp(`(${expected})`, "gi");
    const parts = scenario.sentence.split(regex);
    
    return (
      <span className="leading-relaxed cursor-pointer" onClick={playActiveAudio} title="Click to replay audio">
        {parts.map((part, i) => {
          if (part.toLowerCase() === expected.toLowerCase()) {
            
            // Dictation Input UI
            if (trainingMode === "CONTEXT_DICTATION" && status === "TRAINING") {
              return (
                <input
                  key={i}
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDictationSubmit(false)}
                  className={`mx-2 bg-white/10 border-b-2 text-center focus:outline-none transition-all ${inputError ? 'border-rose-500 text-rose-500' : 'border-indigo-500/50 text-indigo-300 focus:border-indigo-400'} w-32`}
                  onClick={(e) => e.stopPropagation()}
                />
              );
            }

            // Reflex & Revealed UI
            let displayWord = "_______";
            let styles = "bg-white/10 text-transparent border-b-2 border-white/30 min-w-[80px]";
            
            if (status === "REVEALED") {
              displayWord = part;
              if (trainingMode !== "REFLEX" && inputValue.trim().toLowerCase() !== expected.toLowerCase()) {
                styles = "bg-rose-500/20 text-rose-400 border border-rose-500/50"; // Dictation Failed
              } else {
                styles = "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50"; // Dictation Success or Reflex reveal
              }
            } else if (status === "HINT") {
              if (part.length <= 2) {
                displayWord = part;
              } else {
                displayWord = part[0] + "*".repeat(part.length - 2) + part[part.length - 1];
              }
              styles = "bg-amber-500/20 text-amber-400 border-b-2 border-amber-500/50 tracking-[0.2em]";
            }

            return (
              <span key={i} className={`inline-block font-black px-2 mx-1 rounded transition-all duration-300 ${styles}`}>
                {displayWord}
              </span>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </span>
    );
  };

  if (status === "LOBBY") {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 shadow-2xl">
        <Settings className="w-16 h-16 text-indigo-500 mb-6" />
        <h2 className="text-3xl font-black tracking-tight text-white mb-8 uppercase">Pre-flight Checklist</h2>
        
        {/* Mode Selector */}
        <div className="flex gap-4 mb-10 w-full max-w-2xl">
          <button 
            onClick={() => setTrainingMode("REFLEX")}
            className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${trainingMode === "REFLEX" ? "bg-indigo-500/20 border-indigo-500 text-indigo-300 shadow-[0_0_15px_rgba(79,70,229,0.2)]" : "bg-white/5 border-white/10 text-neutral-500 hover:bg-white/10 hover:text-white"}`}
          >
            <Eye className="w-6 h-6 mb-2" />
            <span className="font-bold">Reflex Cloze</span>
            <span className="text-[10px] mt-1 uppercase opacity-70">Read & Think</span>
          </button>
          
          <button 
            onClick={() => setTrainingMode("CONTEXT_DICTATION")}
            className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${trainingMode === "CONTEXT_DICTATION" ? "bg-rose-500/20 border-rose-500 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.2)]" : "bg-white/5 border-white/10 text-neutral-500 hover:bg-white/10 hover:text-white"}`}
          >
            <Keyboard className="w-6 h-6 mb-2" />
            <span className="font-bold">Context Dictation</span>
            <span className="text-[10px] mt-1 uppercase opacity-70">Listen & Type</span>
          </button>

          <button 
            onClick={() => setTrainingMode("PURE_DICTATION")}
            className={`flex-1 flex flex-col items-center justify-center p-4 rounded-2xl border transition-all ${trainingMode === "PURE_DICTATION" ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]" : "bg-white/5 border-white/10 text-neutral-500 hover:bg-white/10 hover:text-white"}`}
          >
            <Headphones className="w-6 h-6 mb-2" />
            <span className="font-bold">Pure Dictation</span>
            <span className="text-[10px] mt-1 uppercase opacity-70">Blind Audio Only</span>
          </button>
        </div>

        <p className="text-neutral-400 mb-6 max-w-md text-center">
          You have <span className="text-indigo-400 font-bold">{initialQueue.length}</span> targets available. Select your batch size to initialize.
        </p>
        
        <div className="flex gap-4">
          <button onClick={() => handleBatchSelect(5)} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/10">
            Train 5 Words
          </button>
          <button onClick={() => handleBatchSelect(10)} className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-white/10">
            Train 10 Words
          </button>
          <button onClick={() => handleBatchSelect(20)} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.4)]">
            Train 20 Words
          </button>
        </div>
      </div>
    );
  }

  if (status === "PRE_FLIGHT") {
    const percentage = forgeProgress.total > 0 
      ? Math.round((forgeProgress.current / forgeProgress.total) * 100) 
      : 100;

    return (
      <div className="flex flex-col items-center justify-center h-96 border border-indigo-500/20 rounded-3xl bg-indigo-950/20 shadow-2xl overflow-hidden relative">
        <div 
          className="absolute left-0 bottom-0 top-0 bg-indigo-600/10 transition-all duration-500" 
          style={{ width: `${percentage}%` }}
        />
        <div className="z-10 flex flex-col items-center">
          <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
          <h2 className="text-xl font-bold text-indigo-400 mb-2 tracking-widest uppercase">Forging Scenarios</h2>
          {forgeProgress.total > 0 ? (
            <p className="text-indigo-500/60 font-medium">
              Generating High-Pressure Contexts: {forgeProgress.current} / {forgeProgress.total}
            </p>
          ) : (
            <p className="text-indigo-500/60 font-medium">Loading cached data...</p>
          )}
        </div>
      </div>
    );
  }

  if (status === "FINISHED") {
    return (
      <div className="flex flex-col items-center justify-center h-96 border border-emerald-500/20 rounded-3xl bg-emerald-950/20">
        <div className="text-6xl mb-6">🏆</div>
        <h2 className="text-2xl font-bold text-emerald-400 mb-2 uppercase tracking-widest">Sequence Complete</h2>
        <p className="text-emerald-500/60 mb-8">Your neural pathways have been strengthened.</p>
        <button 
          onClick={() => router.push("/english")}
          className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all border border-emerald-500/20 hover:border-emerald-500/50"
        >
          Return to Vault
        </button>
      </div>
    );
  }

  const isRevealed = status === "REVEALED";
  const timerPercentage = (timeLeft / 10) * 100;
  
  return (
    <div className="relative flex flex-col items-center justify-center min-h-[500px] border border-white/10 rounded-3xl bg-neutral-950 p-10 overflow-hidden shadow-2xl">
      
      {/* Background Pulse Effect */}
      {!isRevealed && (
        <div 
          className="absolute inset-0 bg-rose-500/5 transition-opacity duration-1000" 
          style={{ opacity: timeLeft < 4 ? 0.3 : 0 }}
        />
      )}

      {/* Header Info */}
      <div className="absolute top-6 left-6 flex items-center gap-3">
        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-xs font-bold text-neutral-400 uppercase tracking-widest">
          {currentIndex + 1} / {queue.length}
        </span>
        {trainingMode !== "PURE_DICTATION" && (
          <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-lg text-xs font-bold text-rose-400 uppercase tracking-widest flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" />
            {activeScenario?.pressureLevel || "HIGH"} PRESSURE
          </span>
        )}
      </div>

      {trainingMode !== "PURE_DICTATION" && (
        <div className="absolute top-6 right-6 text-xs text-neutral-500 uppercase tracking-widest font-bold">
          {activeScenario?.setting}
        </div>
      )}

      {/* Audio Players */}
      {trainingMode !== "PURE_DICTATION" ? (
        activeScenario?.audioUrl && <audio ref={audioRef} src={activeScenario.audioUrl} preload="auto" />
      ) : (
        activeWord?.audioUrl && <audio ref={pureAudioRef} src={activeWord.audioUrl} preload="auto" />
      )}

      {/* Main Content Area */}
      <div className="z-10 w-full max-w-3xl flex flex-col items-center text-center mt-8">
        
        {trainingMode === "PURE_DICTATION" ? (
          // PURE DICTATION UI
          <div className="flex flex-col items-center">
            <button onClick={playActiveAudio} className="p-8 rounded-full bg-white/5 hover:bg-white/10 transition-all mb-12 border border-white/10 group">
              <Headphones className="w-16 h-16 text-indigo-400 group-hover:scale-110 transition-transform" />
            </button>
            
            {status === "REVEALED" ? (
              <div className={`text-4xl font-black px-8 py-4 rounded-2xl border ${inputValue.trim().toLowerCase() === activeWord?.text.toLowerCase() ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-rose-500/20 text-rose-400 border-rose-500/50'}`}>
                {activeWord?.text}
              </div>
            ) : (
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDictationSubmit(false)}
                className={`bg-transparent border-b-2 text-4xl font-black text-center focus:outline-none transition-all ${inputError ? 'border-rose-500 text-rose-500' : 'border-emerald-500/50 text-emerald-300 focus:border-emerald-400'} w-64 pb-2`}
                placeholder="Type word..."
                spellCheck={false}
              />
            )}
          </div>
        ) : (
          // REFLEX & CONTEXT DICTATION UI
          <div className="text-3xl font-medium text-white mb-12 hover:text-white/80 transition-colors">
            {renderSentence(activeScenario)}
          </div>
        )}

        {/* Timer Bar */}
        {(status === "TRAINING" || status === "HINT") && (
          <div className="w-full max-w-md bg-white/5 rounded-full h-2 mb-8 overflow-hidden mt-8">
            <div 
              className={`h-full transition-all duration-1000 ease-linear ${status === "HINT" ? 'bg-amber-500' : (timeLeft < 4 ? 'bg-rose-500' : 'bg-indigo-500')}`}
              style={{ width: status === "HINT" ? '0%' : `${timerPercentage}%` }}
            />
          </div>
        )}

        {/* Action Controls for REFLEX Mode only (Dictation is handled via input) */}
        {trainingMode === "REFLEX" && !isRevealed && (
          <button 
            onClick={handleReveal}
            className="px-12 py-4 bg-white/10 hover:bg-white/20 text-white font-bold text-lg rounded-2xl transition-all shadow-lg hover:shadow-xl active:scale-95 border border-white/10"
          >
            Reveal Target [Space]
          </button>
        )}

        {/* Post-Reveal Panel */}
        {isRevealed && (
          <div className="w-full max-w-2xl animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4">
            <div className="mb-8 p-4 bg-white/5 border border-white/10 rounded-xl text-neutral-300">
              <div className="text-xs uppercase text-neutral-500 font-bold mb-1">Target Definition</div>
              {activeWord?.explanation || activeWord?.meaning}
            </div>
            
            {/* Manual Rating Buttons (Only for Reflex Mode) */}
            {trainingMode === "REFLEX" && (
              <div className="flex gap-4 w-full">
                <button onClick={() => handleRating(0)} className="flex-1 flex flex-col items-center justify-center p-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl transition-all group">
                  <XCircle className="w-6 h-6 text-rose-500 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-rose-400 font-bold">Failed</span>
                </button>
                <button onClick={() => handleRating(1)} className="flex-1 flex flex-col items-center justify-center p-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 rounded-xl transition-all group">
                  <Brain className="w-6 h-6 text-amber-500 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-amber-400 font-bold">Hesitated</span>
                </button>
                <button onClick={() => handleRating(2)} className="flex-1 flex flex-col items-center justify-center p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-xl transition-all group">
                  <Zap className="w-6 h-6 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
                  <span className="text-emerald-400 font-bold">Instant</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

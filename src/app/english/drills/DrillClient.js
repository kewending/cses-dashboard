"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, ArrowLeft, Volume2, Mic, Play, CheckCircle2, XCircle, Square } from "lucide-react";
import Link from "next/link";

export default function DrillClient({ initialVocab }) {
  const [drillType, setDrillType] = useState("substitution");
  const [difficulty, setDifficulty] = useState("hard");
  const [drills, setDrills] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle, listen, active, feedback
  
  const [userTranscript, setUserTranscript] = useState("");
  const [isMatch, setIsMatch] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [isRecording, setIsRecording] = useState(false);
  
  // Clean string for fuzzy match
  const cleanString = (str) => {
    return str.toLowerCase().replace(/[^\w\s]/g, "").replace(/\s+/g, " ").trim();
  };

  const generateDrills = async () => {
    setIsGenerating(true);
    setDrills([]);
    setCurrentIndex(0);
    setPhase("idle");
    try {
      const res = await fetch("http://localhost:8000/api/drills/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vocabulary: initialVocab,
          drill_type: drillType,
          count: 5
        })
      });
      const data = await res.json();
      if (data.drills && data.drills.length > 0) {
        setDrills(data.drills);
      }
    } catch (error) {
      console.error(error);
      alert("Error generating drills.");
    }
    setIsGenerating(false);
  };

  const playTTS = async (text) => {
    try {
      const res = await fetch("http://localhost:8000/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      const data = await res.json();
      if (data.audio_base64) {
        const audio = new Audio(`data:audio/wav;base64,${data.audio_base64}`);
        return new Promise((resolve) => {
          audio.onended = resolve;
          audio.play();
        });
      }
    } catch (e) {
      console.error("TTS Playback failed", e);
      return new Promise((resolve) => setTimeout(resolve, 1000));
    }
  };

  const startDrillLoop = async () => {
    if (currentIndex >= drills.length) return;
    const drill = drills[currentIndex];
    setUserTranscript("");
    setIsMatch(null);

    // Phase 1: Listen to base sentence
    setPhase("listen");
    await playTTS(drill.base_sentence);
    
    // Phase 2: Active (Cue + Manual Recording)
    setPhase("active");
    await playTTS(drill.cue);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
    } catch (e) {
      console.error("Mic error:", e);
    }
  };

  const stopRecordingAndCheck = async () => {
    const drill = drills[currentIndex];
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      setIsRecording(false);
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      
      setPhase("feedback");
      setUserTranscript("Transcribing...");
      
      // We must wait for onstop to fire. But since we need the blob immediately,
      // we can listen to it.
      mediaRecorderRef.current.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        try {
          const formData = new FormData();
          formData.append("file", audioBlob, "recording.webm");
          const asrRes = await fetch("http://localhost:8000/api/asr", {
            method: "POST",
            body: formData
          });
          
          if (!asrRes.ok) throw new Error("ASR Failed");
          const { text } = await asrRes.json();
          setUserTranscript(text);
          
          const expected = cleanString(drill.expected_response);
          const actual = cleanString(text);
          
          // Fuzzy match logic
          const isCorrect = actual.includes(expected) || expected.includes(actual) || (expected.length > 5 && actual.length > 5 && (expected === actual));
          setIsMatch(isCorrect);
          
          if (!isCorrect) {
            // Play correct answer if wrong
            await playTTS(drill.expected_response);
          }
          
        } catch (error) {
          console.error(error);
          setUserTranscript("Error connecting to neural link.");
          setIsMatch(false);
        }
      };
    }
  };

  const nextDrill = () => {
    if (currentIndex + 1 < drills.length) {
      setCurrentIndex(currentIndex + 1);
      setPhase("idle");
    } else {
      setPhase("done");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col p-8 relative overflow-hidden">
      <nav className="mb-8 z-10 flex justify-between items-center">
        <Link href="/english" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Leave Simulator
        </Link>
        <div className="flex items-center gap-6">
          <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
            <button onClick={() => setDifficulty("easy")} className={`px-4 py-1.5 rounded text-sm font-bold uppercase ${difficulty === 'easy' ? 'bg-emerald-600' : 'text-neutral-500 hover:text-white'}`}>Easy</button>
            <button onClick={() => setDifficulty("hard")} className={`px-4 py-1.5 rounded text-sm font-bold uppercase ${difficulty === 'hard' ? 'bg-rose-600' : 'text-neutral-500 hover:text-white'}`}>Hard</button>
          </div>
          <div className="flex gap-2 bg-white/5 p-1 rounded-lg">
            <button onClick={() => setDrillType("substitution")} className={`px-4 py-1.5 rounded text-sm font-bold uppercase ${drillType === 'substitution' ? 'bg-indigo-600' : 'text-neutral-500 hover:text-white'}`}>Substitution</button>
            <button onClick={() => setDrillType("transformation")} className={`px-4 py-1.5 rounded text-sm font-bold uppercase ${drillType === 'transformation' ? 'bg-indigo-600' : 'text-neutral-500 hover:text-white'}`}>Transformation</button>
          </div>
        </div>
      </nav>

      <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full z-10">
        
        {drills.length === 0 ? (
          <div className="text-center">
            <h1 className="text-5xl font-black uppercase tracking-widest text-indigo-400 mb-6 flex flex-col">
              <span>Pattern Drill</span>
              <span className="text-white">Simulator</span>
            </h1>
            <p className="text-neutral-400 mb-10 max-w-lg mx-auto">
              Automated FSI-style audio-lingual training using your own vocabulary. Zero latency. Pure muscle memory.
            </p>
            <button
              onClick={generateDrills}
              disabled={isGenerating}
              className="px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-2xl transition-all shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:scale-105 uppercase tracking-widest text-lg disabled:opacity-50 disabled:scale-100"
            >
              {isGenerating ? <span className="flex items-center"><Loader2 className="w-5 h-5 animate-spin mr-3" /> INITIALIZING AI...</span> : "GENERATE PROTOCOL"}
            </button>
          </div>
        ) : phase === "done" ? (
          <div className="text-center animate-in zoom-in">
            <CheckCircle2 className="w-24 h-24 text-emerald-500 mx-auto mb-6" />
            <h2 className="text-4xl font-black uppercase tracking-widest text-white mb-6">Protocol Complete</h2>
            <button onClick={() => setDrills([])} className="px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold uppercase tracking-wider transition-colors">Start New Session</button>
          </div>
        ) : (
          <div className="w-full flex flex-col items-center">
            <div className="text-sm font-bold text-neutral-500 tracking-widest uppercase mb-12">
              Drill {currentIndex + 1} / {drills.length}
            </div>

            {/* Drill Arena */}
            <div className={`w-full p-12 rounded-3xl border-2 transition-all duration-500 min-h-[300px] flex flex-col items-center justify-center relative overflow-hidden ${
              phase === 'listen' ? 'border-indigo-500/50 bg-indigo-500/5 shadow-[0_0_50px_rgba(79,70,229,0.15)]' :
              phase === 'active' ? 'border-amber-500/50 bg-amber-500/5 shadow-[0_0_50px_rgba(245,158,11,0.15)] scale-[1.02]' :
              phase === 'feedback' ? (isMatch ? 'border-emerald-500 bg-emerald-500/10 shadow-[0_0_80px_rgba(16,185,129,0.3)]' : 'border-red-500 bg-red-500/10') :
              'border-white/10 bg-white/5'
            }`}>
              
              {phase === "idle" && (
                <button onClick={startDrillLoop} className="flex flex-col items-center group">
                  <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
                    <Play className="w-8 h-8 fill-current ml-1" />
                  </div>
                  <span className="font-bold uppercase tracking-widest text-indigo-400">Launch Sequence</span>
                </button>
              )}

              {phase === "listen" && (
                <div className="text-center animate-in fade-in zoom-in duration-300">
                  <Volume2 className="w-12 h-12 text-indigo-400 mx-auto mb-6 animate-pulse" />
                  <p className="text-3xl font-serif text-neutral-300">"{drills[currentIndex].base_sentence}"</p>
                </div>
              )}

              {phase === "active" && (
                <div className="text-center animate-in slide-in-from-bottom-10 duration-300 w-full flex flex-col items-center">
                  {difficulty === "easy" && (
                    <p className="text-xl font-serif text-neutral-400 mb-8 pb-4 border-b border-white/10 italic">
                      "{drills[currentIndex].base_sentence}"
                    </p>
                  )}
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-widest mb-4">Integrate</p>
                  <h2 className="text-6xl font-black text-amber-400 uppercase tracking-tight mb-12">{drills[currentIndex].cue}</h2>
                  
                  <button
                    onMouseDown={startRecording}
                    onMouseUp={stopRecordingAndCheck}
                    onTouchStart={startRecording}
                    onTouchEnd={stopRecordingAndCheck}
                    className={`p-10 rounded-full transition-all duration-300 border-2 ${
                      isRecording 
                        ? 'bg-rose-500/20 border-rose-500 shadow-[0_0_30px_rgba(244,63,94,0.5)] scale-110' 
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-indigo-500/50'
                    }`}
                  >
                    {isRecording ? (
                      <Square className="w-12 h-12 text-rose-500 animate-pulse" />
                    ) : (
                      <Mic className="w-12 h-12 text-indigo-400" />
                    )}
                  </button>
                  <p className="text-neutral-500 mt-6 font-bold uppercase tracking-widest text-sm">
                    {isRecording ? "Release to Check" : "Hold to Speak"}
                  </p>
                </div>
              )}

              {phase === "feedback" && (
                <div className="text-center w-full animate-in zoom-in duration-300">
                  {isMatch === null ? (
                    <div className="flex flex-col items-center">
                      <Loader2 className="w-12 h-12 text-white animate-spin mb-4" />
                      <p className="text-neutral-400 italic font-serif">"{userTranscript}"</p>
                    </div>
                  ) : isMatch ? (
                    <div>
                      <CheckCircle2 className="w-20 h-20 text-emerald-400 mx-auto mb-6" />
                      <p className="text-3xl font-serif text-emerald-100 font-bold mb-4">"{drills[currentIndex].expected_response}"</p>
                      <button onClick={nextDrill} className="mt-8 px-8 py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold uppercase tracking-wider text-white">Next Sequence</button>
                    </div>
                  ) : (
                    <div>
                      <XCircle className="w-20 h-20 text-red-500 mx-auto mb-6" />
                      <div className="space-y-4">
                         <p className="text-sm text-red-400 uppercase tracking-widest font-bold">You said:</p>
                         <p className="text-xl text-neutral-300 line-through">"{userTranscript}"</p>
                         <p className="text-sm text-emerald-400 uppercase tracking-widest font-bold mt-6">Correct Pattern:</p>
                         <p className="text-3xl font-serif text-white font-bold">"{drills[currentIndex].expected_response}"</p>
                      </div>
                      <button onClick={nextDrill} className="mt-12 px-8 py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold uppercase tracking-wider text-white">Acknowledge & Continue</button>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}

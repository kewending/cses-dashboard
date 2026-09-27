"use client";

import { useState, useRef } from "react";
import { Mic, Square, Volume2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ParentRoomClient({ initialWords }) {
  const [isRecording, setIsRecording] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const chatHistoryRef = useRef([]);
  const audioQueueRef = useRef([]);
  const isPlayingAudioRef = useRef(false);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        await processUserAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setUserText(""); // clear previous
      setAiText("");
    } catch (error) {
      console.error("Mic error:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playNextAudio = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingAudioRef.current = false;
      setIsAiSpeaking(false);
      return;
    }
    
    isPlayingAudioRef.current = true;
    setIsAiSpeaking(true);
    const base64Audio = audioQueueRef.current.shift();
    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    
    audio.onended = () => {
      playNextAudio();
    };
    
    audio.play().catch(e => {
      console.error("Audio playback failed", e);
      playNextAudio();
    });
  };

  const processUserAudio = async (audioBlob) => {
    if (audioBlob.size < 2000) return;
    setUserText("Transcribing...");
    
    try {
      // 1. ASR - Transcribe user audio
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      const asrRes = await fetch("http://localhost:8000/api/asr", {
        method: "POST",
        body: formData
      });
      
      if (!asrRes.ok) throw new Error("ASR Failed");
      const { text } = await asrRes.json();
      setUserText(text);

      // Append to history
      chatHistoryRef.current.push({ role: "user", content: text });

      // 2. LLM Stream - Send to Parent Chat API
      const response = await fetch("http://localhost:8000/api/parent-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: chatHistoryRef.current,
          vocabulary: initialWords // Inject the learned words here!
        })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      setIsAiSpeaking(true);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop(); // keep incomplete chunk

        for (const line of lines) {
          if (line.startsWith("event: delta")) {
            const dataStr = line.split("\ndata: ")[1];
            if (dataStr) {
              const data = JSON.parse(dataStr);
              setAiText(prev => prev + data.content);
            }
          } else if (line.startsWith("event: audio")) {
            const dataStr = line.split("\ndata: ")[1];
            if (dataStr) {
              const data = JSON.parse(dataStr);
              audioQueueRef.current.push(data.base64);
              if (!isPlayingAudioRef.current) {
                playNextAudio();
              }
            }
          } else if (line.startsWith("event: done")) {
            const dataStr = line.split("\ndata: ")[1];
            if (dataStr) {
              const data = JSON.parse(dataStr);
              chatHistoryRef.current.push({ role: "assistant", content: data.full_content });
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      setUserText("Error connecting to neural link.");
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col p-8 relative overflow-hidden">
      <nav className="mb-8 z-10">
        <Link href="/english" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Leave Room
        </Link>
      </nav>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        {/* Pulsing Orb Background */}
        <div className={`w-[500px] h-[500px] rounded-full blur-[120px] transition-all duration-700 ${
          isAiSpeaking ? 'bg-indigo-600 animate-pulse scale-110' : 
          isRecording ? 'bg-rose-600 scale-95' : 'bg-neutral-800'
        }`} />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full z-10">
        
        {/* AI Output Area */}
        <div className="flex-1 w-full flex flex-col justify-end pb-12 min-h-[300px]">
          {aiText && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-indigo-400 mb-2">
                <Volume2 className={`w-5 h-5 ${isAiSpeaking ? 'animate-pulse' : ''}`} />
                <span className="text-xs font-bold tracking-widest uppercase">Language Parent</span>
              </div>
              <p className="text-3xl font-serif leading-relaxed text-white">
                {aiText}
              </p>
            </div>
          )}
        </div>

        {/* User Input Area */}
        <div className="w-full flex flex-col items-center mt-auto pb-12 border-t border-white/10 pt-12">
          {userText && (
            <p className="text-xl text-neutral-400 mb-8 text-center max-w-xl italic">
              "{userText}"
            </p>
          )}

          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={startRecording}
            onTouchEnd={stopRecording}
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
            {isRecording ? "Release to Send" : "Hold to Speak"}
          </p>
        </div>

      </div>
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { Mic, Square, Loader2 } from "lucide-react";

export default function ASRTestPage() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState("");
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);

  const toggleRecording = async () => {
    if (isRecording) {
      stopRecording();
    } else {
      await startRecording();
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setTranscription("");

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          // Every time we get a chunk (e.g. every 2 seconds), send the growing buffer
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          await sendAudioToBackend(audioBlob);
        }
      };

      mediaRecorder.onstop = () => {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }
      };

      // Fire data available every 2 seconds to simulate streaming
      mediaRecorder.start(2000);
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const sendAudioToBackend = async (audioBlob) => {
    // Only send if it's large enough to avoid empty container errors
    if (audioBlob.size < 2000) return;
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");

      const response = await fetch("http://localhost:8000/api/asr", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setTranscription(data.text);
      } else {
        console.error("ASR Error:", response.statusText);
      }
    } catch (error) {
      console.error("Network Error:", error);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <div className="max-w-xl w-full flex flex-col items-center">
        <h1 className="text-3xl font-black mb-8 uppercase tracking-widest text-indigo-400">Oral Spelling (ASR) Test</h1>
        
        <button
          onClick={toggleRecording}
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
          {isRecording ? "Listening... Click to stop" : "Click to start recording"}
        </p>

        <div className="mt-12 w-full p-8 border border-white/10 rounded-2xl bg-white/5 min-h-[150px] flex items-center justify-center relative overflow-hidden">
          {transcription ? (
            <p className="text-2xl font-serif leading-relaxed text-center text-white">
              "{transcription}"
              {isRecording && <span className="inline-block ml-2 w-2 h-6 bg-indigo-500 animate-pulse" />}
            </p>
          ) : isRecording ? (
            <div className="flex flex-col items-center gap-4 text-indigo-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="text-sm font-bold uppercase tracking-widest">Listening...</span>
            </div>
          ) : (
            <p className="text-neutral-600 text-center italic">
              Your voice transcription will appear here in milliseconds.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

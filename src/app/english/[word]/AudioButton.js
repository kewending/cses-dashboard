"use client";

import { Volume2 } from "lucide-react";

export default function AudioButton({ url }) {
  const playAudio = () => {
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch((err) => console.error("Audio playback failed:", err));
  };

  return (
    <button
      onClick={playAudio}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:bg-blue-500/20 hover:border-blue-500/30 transition-all shadow-sm"
      title="Play Pronunciation"
    >
      <Volume2 className="w-4 h-4" />
      <span className="text-xs font-medium uppercase tracking-wider">Pronounce</span>
    </button>
  );
}

"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search, Sparkles, Volume2, Loader2, BookOpen } from "lucide-react";
import { magicImportVocab } from "../actions/english-import";

export default function EnglishDashboard({ initialWords }) {
  const router = useRouter();
  const words = initialWords;
  const [importing, setImporting] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const handleImport = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || importing) return;

    setImporting(true);
    const result = await magicImportVocab(inputValue);
    setImporting(false);

    if (result.success) {
      setInputValue("");
      router.refresh(); // Tells Next.js to re-run Server Components and update data
    } else {
      alert(`Import failed: ${result.error}`);
    }
  };

  const playAudio = (e, url) => {
    e.stopPropagation(); // prevent card click
    if (!url) return;
    const audio = new Audio(url);
    audio.play().catch(err => console.error("Audio play failed:", err));
  };

  return (
    <div className="space-y-10">
      
      {/* Magic Import Bar */}
      <form onSubmit={handleImport} className="relative max-w-2xl group">
        <div className="absolute inset-0 bg-blue-500/20 rounded-2xl blur-xl transition-all group-hover:bg-blue-500/30"></div>
        <div className="relative flex items-center bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all focus-within:border-blue-500/50 focus-within:ring-1 focus-within:ring-blue-500/50">
          <div className="pl-5 text-neutral-400">
            {importing ? <Loader2 className="w-5 h-5 animate-spin text-blue-400" /> : <Sparkles className="w-5 h-5 text-indigo-400" />}
          </div>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a word to magic import (e.g., resplendent)..."
            className="w-full bg-transparent border-none py-4 px-4 text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-0"
            disabled={importing}
          />
          <button
            type="submit"
            disabled={importing || !inputValue.trim()}
            className="pr-5 font-semibold text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            IMPORT
          </button>
        </div>
      </form>

      {/* Vocabulary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {words.map((w) => (
          <div
            key={w.text}
            onClick={() => router.push(`/english/${encodeURIComponent(w.text)}`)}
            className="group cursor-pointer p-5 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/5 hover:border-white/15 hover:bg-white/10 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden flex flex-col"
          >
            {/* Top Row: Word + Play Btn */}
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold tracking-tight capitalize group-hover:text-blue-200 transition-colors">
                {w.text}
              </h2>
              {w.audioUrl && (
                <button
                  onClick={(e) => playAudio(e, w.audioUrl)}
                  className="p-2 rounded-full bg-white/5 text-neutral-400 hover:text-white hover:bg-blue-500/20 transition-all opacity-0 group-hover:opacity-100 scale-95 group-hover:scale-100"
                  title="Play UK/US Pronunciation"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Meanings Snippet */}
            <div className="flex-1">
              {w.shortMeanings.slice(0, 2).map((meaning, idx) => (
                <p key={idx} className="text-sm text-neutral-400 line-clamp-1 mb-1">
                  <span className="text-neutral-600 mr-2">{idx + 1}.</span> {meaning}
                </p>
              ))}
              {w.senseCount > 2 && (
                <p className="text-xs text-neutral-600 mt-1">+{w.senseCount - 2} more senses</p>
              )}
            </div>

            {/* Bottom Row: Mastery Indicator */}
            <div className="mt-5 flex items-center justify-between">
              <div className="flex items-center gap-1.5" title={`Pessimistic Mastery: ${w.lowestMastery}/5`}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 w-6 rounded-full ${
                      level <= w.lowestMastery
                        ? "bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
              <BookOpen className="w-4 h-4 text-neutral-600" />
            </div>
          </div>
        ))}

        {words.length === 0 && (
          <div className="col-span-full py-20 text-center text-neutral-500">
            <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Your arsenal is empty. Import a word to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

import prisma from "@/lib/prisma";
import Link from "next/link";
import EnglishDashboard from "./EnglishDashboard";
import { Zap, Mic, Swords, Headphones } from "lucide-react";

export const metadata = {
  title: "English Vault | CSES Dashboard",
};

export default async function EnglishPage() {
  // Fetch all vocabulary items with their learning progress
  const rawItems = await prisma.vocabItem.findMany({
    include: {
      progress: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Server-side grouping by word text to keep the client light
  // Map structure: { "bank": { text: "bank", audioUrl: "...", lowestMastery: 0, senseCount: 2, meanings: [...] } }
  const wordGroupsMap = {};

  for (const item of rawItems) {
    const text = item.text.toLowerCase();
    const mastery = item.progress?.masteryLevel || 0;

    if (!wordGroupsMap[text]) {
      wordGroupsMap[text] = {
        text: item.text,
        audioUrl: item.audioUrl,
        lowestMastery: mastery,
        senseCount: 1,
        shortMeanings: [item.meaning],
      };
    } else {
      // Update lowest mastery (Pessimistic approach)
      if (mastery < wordGroupsMap[text].lowestMastery) {
        wordGroupsMap[text].lowestMastery = mastery;
      }
      // Prefer keeping the first valid audio URL
      if (!wordGroupsMap[text].audioUrl && item.audioUrl) {
        wordGroupsMap[text].audioUrl = item.audioUrl;
      }
      wordGroupsMap[text].senseCount++;
      wordGroupsMap[text].shortMeanings.push(item.meaning);
    }
  }

  const groupedWords = Object.values(wordGroupsMap);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 selection:bg-blue-500/30">
      <div className="max-w-5xl mx-auto space-y-12">
        
        {/* Header / Stats */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-300 bg-clip-text text-transparent">
              Linguistic Arsenal
            </h1>
            <p className="text-neutral-400 mt-2 text-sm max-w-xl">
              System 1 Reflex Training. Master context, avoid translation. 
            </p>
          </div>
          
          <div className="flex gap-6">
            <div className="flex flex-col">
              <span className="text-3xl font-light tabular-nums">{groupedWords.length}</span>
              <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Total Words</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-light tabular-nums text-emerald-400">
                {groupedWords.filter(w => w.lowestMastery >= 4).length}
              </span>
              <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Mastered</span>
            </div>
            <div className="flex items-center ml-4">
              <Link 
                href="/english/training"
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
              >
                <Zap className="w-4 h-4 fill-current" />
                ENTER ARENA
              </Link>
              <Link 
                href="/english/parent-room"
                className="flex items-center gap-2 px-6 py-3 ml-4 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] hover:shadow-[0_0_25px_rgba(225,29,72,0.5)]"
              >
                <Mic className="w-4 h-4" />
                AI PARENT
              </Link>
              <Link 
                href="/english/drills"
                className="flex items-center gap-2 px-6 py-3 ml-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(217,119,6,0.3)] hover:shadow-[0_0_25px_rgba(217,119,6,0.5)]"
              >
                <Swords className="w-4 h-4" />
                PATTERN DRILLS
              </Link>
              <Link 
                href="/english/soaking"
                className="flex items-center gap-2 px-6 py-3 ml-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
              >
                <Headphones className="w-4 h-4" />
                BRAIN SOAKING
              </Link>
            </div>
          </div>
        </header>

        {/* Client Interactive Dashboard */}
        <EnglishDashboard initialWords={groupedWords} />
        
      </div>
    </div>
  );
}

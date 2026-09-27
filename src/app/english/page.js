import prisma from "@/lib/prisma";
import EnglishDashboard from "./EnglishDashboard";

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
          </div>
        </header>

        {/* Client Interactive Dashboard */}
        <EnglishDashboard initialWords={groupedWords} />
        
      </div>
    </div>
  );
}

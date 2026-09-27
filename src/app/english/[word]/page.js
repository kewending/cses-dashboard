import prisma from "@/lib/prisma";
import Link from "next/link";
import { ArrowLeft, Bookmark } from "lucide-react";
import AudioButton from "./AudioButton"; // A small client component for audio
import RelationManager from "./RelationManager";

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  return {
    title: `${decodeURIComponent(resolvedParams.word)} | English Vault`,
  };
}

export default async function WordDetailPage({ params }) {
  const resolvedParams = await params;
  const wordText = decodeURIComponent(resolvedParams.word);

  // Fetch all senses of this word
  const senses = await prisma.vocabItem.findMany({
    where: {
      text: { equals: wordText }
    },
    include: {
      progress: true,
      relationsFrom: {
        include: { to: true }
      },
      relationsTo: {
        include: { from: true }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (senses.length === 0) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center">
        <h1 className="text-2xl mb-4">Word not found</h1>
        <Link href="/english" className="text-blue-400 hover:underline">Return to Vault</Link>
      </div>
    );
  }

  // Lowest mastery across all senses
  const lowestMastery = Math.min(...senses.map(s => s.progress?.masteryLevel || 0));

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8 selection:bg-blue-500/30">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Navigation */}
        <nav>
          <Link href="/english" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Arsenal
          </Link>
        </nav>

        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/10 pb-8">
          <div>
            <h1 className="text-5xl font-bold tracking-tight capitalize text-white mb-3">
              {wordText}
            </h1>
            <div className="flex items-center gap-2">
              <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">Pessimistic Mastery:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((level) => (
                  <div
                    key={level}
                    className={`h-1.5 w-6 rounded-full ${
                      level <= lowestMastery
                        ? "bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                        : "bg-white/10"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </header>

        {/* Meanings (Lexical Senses) */}
        <div className="space-y-12">
          {senses.map((sense, index) => {
            let examples = [];
            try {
              if (sense.exampleSentences) {
                examples = JSON.parse(sense.exampleSentences);
              }
            } catch (e) {}

            return (
              <section key={sense.id} className="relative pl-6 md:pl-10 border-l-2 border-white/5 hover:border-blue-500/30 transition-colors">
                
                {/* Sense Header */}
                <div className="absolute -left-[13px] top-1 h-6 w-6 rounded-full bg-neutral-900 border-2 border-white/10 flex items-center justify-center">
                  <span className="text-[10px] text-neutral-400 font-bold">{index + 1}</span>
                </div>
                
                <div className="mb-6 flex flex-wrap items-center gap-4">
                  <span className="px-3 py-1 text-xs font-medium uppercase tracking-widest text-indigo-300 bg-indigo-500/10 rounded-full border border-indigo-500/20">
                    {sense.partOfSpeech || "unknown"}
                  </span>
                  
                  {sense.audioUrl && (
                    <AudioButton url={sense.audioUrl} />
                  )}

                  {/* Individual Mastery */}
                  <div className="flex items-center gap-2 ml-auto" title={`Mastery: ${sense.progress?.masteryLevel || 0}/5`}>
                    <Bookmark className="w-3 h-3 text-neutral-600" />
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1 w-3 rounded-full ${
                            level <= (sense.progress?.masteryLevel || 0)
                              ? "bg-emerald-500/80 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                              : "bg-white/10"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Explanation */}
                <div className="mb-8">
                  <h3 className="text-2xl font-light text-neutral-200 mb-2 leading-relaxed">
                    {sense.explanation}
                  </h3>
                  {sense.meaning && (
                    <p className="text-neutral-500 font-medium">{sense.meaning}</p>
                  )}
                </div>

                {/* Example Sentences */}
                {examples.length > 0 && (
                  <div className="space-y-4 mb-8">
                    <h4 className="text-xs uppercase tracking-widest text-neutral-600 font-bold mb-3">Context Scenarios</h4>
                    {examples.map((ex, idx) => (
                      <blockquote key={idx} className="p-4 bg-white/[0.02] border border-white/5 rounded-xl text-neutral-300 leading-relaxed font-serif text-lg italic">
                        "{ex}"
                      </blockquote>
                    ))}
                  </div>
                )}

                {/* Graph Relations - Interactive Manager */}
                <RelationManager currentSense={sense} />
                
              </section>
            );
          })}
        </div>

      </div>
    </div>
  );
}

import prisma from "@/lib/prisma";
import TrainingArena from "./TrainingArena";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export async function generateMetadata() {
  return { title: "Training Arena | English Vault" };
}

export default async function TrainingPage() {
  // 1. Fetch up to 10 words due for review
  const now = new Date();
  
  let dueItems = await prisma.vocabItem.findMany({
    where: {
      progress: {
        nextReviewDate: { lte: now },
        masteryLevel: { lt: 5 } // 5 is max mastery
      }
    },
    include: {
      scenarios: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      progress: true
    },
    take: 50,
    orderBy: {
      progress: {
        nextReviewDate: 'asc'
      }
    }
  });

  // 2. If the user has cleared their backlog, just grab some unmastered words to keep the training going
  if (dueItems.length === 0) {
    dueItems = await prisma.vocabItem.findMany({
      where: { 
        progress: { masteryLevel: { lt: 5 } } 
      },
      include: {
        scenarios: { orderBy: { createdAt: 'desc' }, take: 1 },
        progress: true
      },
      take: 50
    });
  }

  // We serialize the data for the Client Component
  // (Prisma returns Date objects which need to be strings/numbers, but Next.js App Router 
  // automatically handles Date objects in Server->Client boundaries now, but we do it anyway for safety).
  const trainingQueue = dueItems.map(item => ({
    ...item,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
    progress: item.progress ? {
      ...item.progress,
      nextReviewDate: item.progress.nextReviewDate.toISOString(),
      updatedAt: item.progress.updatedAt.toISOString()
    } : null,
    scenarios: item.scenarios.map(scen => ({
      ...scen,
      createdAt: scen.createdAt.toISOString()
    }))
  }));

  return (
    <div className="p-8 pb-32 min-h-screen bg-black">
      <nav className="mb-8">
        <Link href="/english" className="inline-flex items-center text-sm font-medium text-neutral-500 hover:text-white transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Abort Mission (Return to Vault)
        </Link>
      </nav>

      <h1 className="text-2xl font-black tracking-tighter text-white mb-2 uppercase">Neural Training Arena</h1>
      <p className="text-neutral-500 mb-8">High-Pressure System 1 Reflex Conditioning</p>
      
      {trainingQueue.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 text-neutral-500 border border-white/10 rounded-2xl bg-white/5">
          <div className="text-4xl mb-4">🏆</div>
          <h2 className="text-xl font-bold text-white mb-2">Vault Cleared</h2>
          <p>You have mastered all your vocabulary. Add more words to continue training.</p>
        </div>
      ) : (
        <TrainingArena initialQueue={trainingQueue} />
      )}
    </div>
  );
}

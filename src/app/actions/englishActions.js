"use server";

import prisma from "@/lib/prisma";

export async function getSoakingPlaylist(count = 50) {
  try {
    // 1. Fetch unmastered words ordered by masteryLevel and then lastSoakedAt (nulls first)
    const rawWords = await prisma.vocabItem.findMany({
      select: {
        id: true,
        text: true,
        meaning: true,
        explanation: true,
        progress: true, // select progress directly to allow orderBy to work or just return it
      },
      orderBy: [
        { progress: { masteryLevel: 'asc' } },
        { lastSoakedAt: 'asc' } // In SQLite, nulls come first for ASC.
      ],
      take: count,
    });

    // 2. Fisher-Yates shuffle
    for (let i = rawWords.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rawWords[i], rawWords[j]] = [rawWords[j], rawWords[i]];
    }

    return { success: true, playlist: rawWords };
  } catch (error) {
    console.error("Failed to fetch soaking playlist:", error);
    return { success: false, error: error.message };
  }
}

export async function markWordSoaked(wordId) {
  if (!wordId) return { success: false, error: "No wordId provided" };
  
  try {
    await prisma.vocabItem.update({
      where: { id: wordId },
      data: {
        lastSoakedAt: new Date(),
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to mark word soaked:", error);
    return { success: false, error: error.message };
  }
}

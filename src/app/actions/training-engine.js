"use server";
import prisma from "@/lib/prisma";

export async function logTrainingResult(vocabItemId, rating) {
  try {
    // rating: 0 (Failed), 1 (Hesitated), 2 (Instant)
    const progress = await prisma.learningProgress.findUnique({ where: { vocabItemId } });
    
    if (!progress) return { success: false, error: "Progress not found" };

    let { masteryLevel, interval } = progress;

    if (rating === 0) {
      // Punish strictly
      masteryLevel = Math.max(0, masteryLevel - 1);
      interval = 0; // reset to today
    } else if (rating === 1) {
      // Hesitated, System 2 was used
      masteryLevel = Math.min(5, masteryLevel + 0.5);
      interval = interval === 0 ? 1 : Math.ceil(interval * 1.2);
    } else if (rating === 2) {
      // Perfect System 1 reflex
      masteryLevel = Math.min(5, masteryLevel + 1);
      interval = interval === 0 ? 3 : Math.ceil(interval * 2.5);
    }

    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    await prisma.learningProgress.update({
      where: { vocabItemId },
      data: { masteryLevel: Math.round(masteryLevel * 10) / 10, interval, nextReviewDate }
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to log training result:", error);
    return { success: false, error: error.message };
  }
}

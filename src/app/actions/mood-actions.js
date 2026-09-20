'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function saveMomentaryCheckIn(data) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const record = await prisma.momentaryCheckIn.create({
      data: {
        date: today,
        valence: data.valence,
        arousal: data.arousal,
        energyLevel: data.energyLevel,
        anxietyLevel: data.anxietyLevel,
        sleepHours: data.sleepHours || null,
        sleepQuality: data.sleepQuality || null,
        tags: data.tags ? JSON.stringify(data.tags) : null,
        notes: data.notes || null,
      }
    });
    
    revalidatePath('/mood');
    return { success: true, record };
  } catch (error) {
    console.error("Error saving momentary check-in:", error);
    return { success: false, error: error.message };
  }
}

export async function getRecentCheckIns(limit = 14) {
  try {
    const records = await prisma.momentaryCheckIn.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit
    });
    return records;
  } catch (error) {
    console.error("Error fetching check-ins:", error);
    return [];
  }
}

export async function savePeriodicAssessment(instrument, responses) {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Clinical evaluation logic (as defined in mood.md)
    const scores = Object.values(responses).map(v => parseInt(v, 10));
    const totalScore = scores.reduce((sum, val) => sum + val, 0);
    
    let requiresCrisisIntervention = false;
    let severity = "Minimal";
    
    if (instrument === "PHQ-9") {
      const suicidalIdeationScore = parseInt(responses["phq9_q9"] || 0, 10);
      if (suicidalIdeationScore > 0) {
        requiresCrisisIntervention = true;
      }
      
      if (totalScore >= 20) severity = "Severe";
      else if (totalScore >= 15) severity = "Moderately Severe";
      else if (totalScore >= 10) severity = "Moderate";
      else if (totalScore >= 5) severity = "Mild";
    } else if (instrument === "GAD-7") {
      if (totalScore >= 15) severity = "Severe";
      else if (totalScore >= 10) severity = "Moderate";
      else if (totalScore >= 5) severity = "Mild";
    }

    const record = await prisma.periodicAssessment.create({
      data: {
        date: today,
        instrument,
        itemScores: JSON.stringify(responses),
        totalScore,
        severityLabel: severity,
        requiresCrisisIntervention
      }
    });

    revalidatePath('/mood');
    return { success: true, record, evaluation: { totalScore, severity, requiresCrisisIntervention } };
  } catch (error) {
    console.error("Error saving assessment:", error);
    return { success: false, error: error.message };
  }
}

export async function getRecentAssessments(limit = 5) {
  try {
    const records = await prisma.periodicAssessment.findMany({
      orderBy: { timestamp: 'desc' },
      take: limit
    });
    return records;
  } catch (error) {
    console.error("Error fetching assessments:", error);
    return [];
  }
}

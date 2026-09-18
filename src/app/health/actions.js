'use server';

import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

function parseDuration(str) {
  if (!str) return 0;
  let mins = 0;
  const hMatch = str.match(/(\d+)H/i);
  const mMatch = str.match(/(\d+)M/i);
  if (hMatch) mins += parseInt(hMatch[1]) * 60;
  if (mMatch) mins += parseInt(mMatch[1]);
  return mins;
}

export async function syncHealthData() {
  try {
    const healthScriptPath = path.join(process.cwd(), 'scripts', 'health_ocr_sync.py');
    const healthResultsPath = path.join(process.cwd(), 'scripts', 'health_ocr_sync_results.json');
    
    const scaleScriptPath = path.join(process.cwd(), 'scripts', 'scale_ocr_sync.py');
    const scaleResultsPath = path.join(process.cwd(), 'scripts', 'physical_data.json');
    
    console.log('[HealthSync] Running Python sync scripts...');
    
    await Promise.all([
      execAsync(`python "${healthScriptPath}"`).catch(e => console.error("Health script error", e)),
      execAsync(`python "${scaleScriptPath}"`).catch(e => console.error("Scale script error", e))
    ]);
    
    console.log('[HealthSync] Python scripts finished.');

    // --- 1. Process Health Data (Sleep, Walk, HR) ---
    try {
      const dataStr = await fs.readFile(healthResultsPath, 'utf8');
      const data = JSON.parse(dataStr);

      // Insert/Update Sleep Data
      if (data.sleep && !data.sleep.error && data.sleep.date) {
        const rawList = data.sleep.raw_durations_found || [];
        const totalDurationMins = parseDuration(rawList[0]);
        const deepSleepMins = parseDuration(rawList[1]);
        const lightSleepMins = parseDuration(rawList[2]);
        const remSleepMins = parseDuration(rawList[3]);

        await prisma.sleepData.upsert({
          where: { date: data.sleep.date },
          update: {
            totalDurationMins,
            deepSleepMins,
            lightSleepMins,
            remSleepMins,
            awakeTimes: data.sleep.awake_times || 0,
            fallingSleepMins: data.sleep.falling_sleep_mins || 0,
            sleepEfficiency: data.sleep.sleep_efficiency_value || 0,
            startTime: data.sleep.start_time || "",
            endTime: data.sleep.end_time || ""
          },
          create: {
            date: data.sleep.date,
            totalDurationMins,
            deepSleepMins,
            lightSleepMins,
            remSleepMins,
            awakeTimes: data.sleep.awake_times || 0,
            fallingSleepMins: data.sleep.falling_sleep_mins || 0,
            sleepEfficiency: data.sleep.sleep_efficiency_value || 0,
            startTime: data.sleep.start_time || "",
            endTime: data.sleep.end_time || ""
          }
        });
      }

      // Insert/Update Walk Activity Data
      if (data.walk && !data.walk.error && data.walk.date) {
        await prisma.activityData.upsert({
          where: { date: data.walk.date },
          update: {
            steps: data.walk.total_steps || 0,
            distanceKm: data.walk.distance_km || 0,
            caloriesKcal: data.walk.calories_kcal || 0,
            timelineJson: JSON.stringify(data.walk.timeline || [])
          },
          create: {
            date: data.walk.date,
            steps: data.walk.total_steps || 0,
            distanceKm: data.walk.distance_km || 0,
            caloriesKcal: data.walk.calories_kcal || 0,
            timelineJson: JSON.stringify(data.walk.timeline || [])
          }
        });
      }

      // Insert Heart Rate Data
      if (data.heart_rate && !data.heart_rate.error) {
        // Find the date for HR. It's normally missing from HR chunk, but we can use walk date or sleep date as fallback
        const date = data.heart_rate.date || data.walk?.date || data.sleep?.date || new Date().toISOString().split('T')[0];
        
        await prisma.heartRateData.deleteMany({
          where: { date: date }
        });
        
        const hrInserts = [];
        for (const item of (data.heart_rate.timeline || [])) {
          for (const bpm of item.bpms) {
            hrInserts.push({
              date: date,
              time: item.time,
              bpm: bpm
            });
          }
        }
        
        if (hrInserts.length > 0) {
          await prisma.heartRateData.createMany({
            data: hrInserts
          });
        }
      }
    } catch (e) {
      console.log("[HealthSync] Could not process health data", e);
    }

    // --- 2. Process Scale Data ---
    try {
      const scaleStr = await fs.readFile(scaleResultsPath, 'utf8');
      const scaleDb = JSON.parse(scaleStr);
      
      if (scaleDb.records && scaleDb.records.length > 0) {
        const latestScale = scaleDb.records[scaleDb.records.length - 1];
        const scaleDate = latestScale.date; // YYYY-MM-DD
        
        console.log(`[HealthSync] Upserting Scale data for ${scaleDate}`);
        
        await prisma.physicalData.upsert({
          where: { date: scaleDate },
          update: {
            weightKg: latestScale.data.weight_kg || null,
            bmi: latestScale.data.bmi || null,
            bodyFatPct: latestScale.data.body_fat_pct || null,
            fatMassKg: latestScale.data.fat_mass_kg || null,
            fatFreeMassKg: latestScale.data.fat_free_body_weight_kg || null,
            muscleMassKg: latestScale.data.muscle_mass_kg || null,
            muscleRatePct: latestScale.data.muscle_rate_pct || null,
            skeletalMusclePct: latestScale.data.skeletal_muscle_pct || null,
            boneMassKg: latestScale.data.bone_mass_kg || null,
            proteinMassKg: latestScale.data.protein_mass_kg || null,
            proteinPct: latestScale.data.protein_pct || null,
            waterWeightKg: latestScale.data.water_weight_kg || null,
            bodyWaterPct: latestScale.data.body_water_pct || null,
            subcutaneousFatPct: latestScale.data.subcutaneous_fat_pct || null,
            visceralFat: latestScale.data.visceral_fat || null,
            bmrKcal: latestScale.data.bmr_kcal || null,
            bodyAge: latestScale.data.body_age || null,
            idealBodyWeightKg: latestScale.data.ideal_body_weight_kg || null
          },
          create: {
            date: scaleDate,
            weightKg: latestScale.data.weight_kg || null,
            bmi: latestScale.data.bmi || null,
            bodyFatPct: latestScale.data.body_fat_pct || null,
            fatMassKg: latestScale.data.fat_mass_kg || null,
            fatFreeMassKg: latestScale.data.fat_free_body_weight_kg || null,
            muscleMassKg: latestScale.data.muscle_mass_kg || null,
            muscleRatePct: latestScale.data.muscle_rate_pct || null,
            skeletalMusclePct: latestScale.data.skeletal_muscle_pct || null,
            boneMassKg: latestScale.data.bone_mass_kg || null,
            proteinMassKg: latestScale.data.protein_mass_kg || null,
            proteinPct: latestScale.data.protein_pct || null,
            waterWeightKg: latestScale.data.water_weight_kg || null,
            bodyWaterPct: latestScale.data.body_water_pct || null,
            subcutaneousFatPct: latestScale.data.subcutaneous_fat_pct || null,
            visceralFat: latestScale.data.visceral_fat || null,
            bmrKcal: latestScale.data.bmr_kcal || null,
            bodyAge: latestScale.data.body_age || null,
            idealBodyWeightKg: latestScale.data.ideal_body_weight_kg || null
          }
        });
      }
    } catch (e) {
      console.log("[HealthSync] Could not process scale data", e);
    }
    
    return { success: true, message: "Sync successful" };
  } catch (error) {
    console.error("[HealthSync] Error:", error);
    return { success: false, message: String(error) };
  }
}

// --- Fetch Data for Specific Dates ---
export async function getSleepByDate(date) {
  return await prisma.sleepData.findUnique({ where: { date } });
}

export async function getActivityByDate(date) {
  return await prisma.activityData.findUnique({ where: { date } });
}

export async function getHeartRateByDate(date) {
  return await prisma.heartRateData.findMany({ where: { date }, orderBy: { time: 'asc' } });
}

export async function getPhysicalByDate(date) {
  return await prisma.physicalData.findUnique({ where: { date } });
}

// --- Fetch Trends for Date Ranges ---
export async function getSleepTrends(startDate, endDate) {
  return await prisma.sleepData.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'asc' }
  });
}

export async function getActivityTrends(startDate, endDate) {
  return await prisma.activityData.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'asc' }
  });
}

export async function getHeartRateTrends(startDate, endDate) {
  return await prisma.heartRateData.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'asc' }
  });
}

export async function getPhysicalTrends(startDate, endDate) {
  return await prisma.physicalData.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    orderBy: { date: 'asc' }
  });
}

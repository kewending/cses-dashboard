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
    
    const tessdataDir = path.join(process.cwd(), 'scripts', 'tessdata');
    const execEnv = { ...process.env, TESSDATA_PREFIX: tessdataDir };

    await Promise.all([
      execAsync(`python -u "${healthScriptPath}"`, { env: execEnv })
        .then(r => r.stdout && console.log(`[HealthSync Health]:\n${r.stdout}`))
        .catch(e => console.error("Health script error", e)),
      execAsync(`python -u "${scaleScriptPath}"`, { env: execEnv })
        .then(r => r.stdout && console.log(`[HealthSync Scale]:\n${r.stdout}`))
        .catch(e => console.error("Scale script error", e))
    ]);
    
    console.log('[HealthSync] Python scripts finished.');

    // --- 1. Process Health Data (Sleep, Walk, HR) ---
    let sleepCount = 0;
    let walkCount = 0;
    let hrCount = 0;
    let scaleCount = 0;

    try {
      const dataStr = await fs.readFile(healthResultsPath, 'utf8');
      const data = JSON.parse(dataStr);

      // Insert/Update Sleep Data (supports array of records or single object)
      const sleepList = data.sleep_records || (data.sleep ? [data.sleep] : []);
      for (const sleepItem of sleepList) {
        if (sleepItem && !sleepItem.error && sleepItem.date) {
          const rawList = sleepItem.raw_durations_found || [];
          const totalDurationMins = parseDuration(rawList[0]);
          const deepSleepMins = parseDuration(rawList[1]);
          const lightSleepMins = parseDuration(rawList[2]);
          const remSleepMins = parseDuration(rawList[3]);

          console.log(`[HealthSync] Upserting Sleep data for ${sleepItem.date}`);
          await prisma.sleepData.upsert({
            where: { date: sleepItem.date },
            update: {
              totalDurationMins,
              deepSleepMins,
              lightSleepMins,
              remSleepMins,
              awakeTimes: sleepItem.awake_times ?? 0,
              fallingSleepMins: sleepItem.falling_sleep_mins ?? 0,
              sleepEfficiency: sleepItem.sleep_efficiency_value ?? 0,
              startTime: sleepItem.start_time || "",
              endTime: sleepItem.end_time || ""
            },
            create: {
              date: sleepItem.date,
              totalDurationMins,
              deepSleepMins,
              lightSleepMins,
              remSleepMins,
              awakeTimes: sleepItem.awake_times ?? 0,
              fallingSleepMins: sleepItem.falling_sleep_mins ?? 0,
              sleepEfficiency: sleepItem.sleep_efficiency_value ?? 0,
              startTime: sleepItem.start_time || "",
              endTime: sleepItem.end_time || ""
            }
          });
          sleepCount++;
        }
      }

      // Insert/Update Walk Activity Data (supports array of records or single object)
      const walkList = data.walk_records || (data.walk ? [data.walk] : []);
      for (const walkItem of walkList) {
        if (walkItem && !walkItem.error && walkItem.date) {
          console.log(`[HealthSync] Upserting Walk data for ${walkItem.date}`);
          await prisma.activityData.upsert({
            where: { date: walkItem.date },
            update: {
              steps: walkItem.total_steps || 0,
              distanceKm: walkItem.distance_km || 0,
              caloriesKcal: walkItem.calories_kcal || 0,
              timelineJson: JSON.stringify(walkItem.timeline || [])
            },
            create: {
              date: walkItem.date,
              steps: walkItem.total_steps || 0,
              distanceKm: walkItem.distance_km || 0,
              caloriesKcal: walkItem.calories_kcal || 0,
              timelineJson: JSON.stringify(walkItem.timeline || [])
            }
          });
          walkCount++;
        }
      }

      // Insert Heart Rate Data (supports array of records or single object)
      const hrList = data.heart_rate_records || (data.heart_rate ? [data.heart_rate] : []);
      for (const hrItem of hrList) {
        if (hrItem && !hrItem.error && hrItem.date) {
          const date = hrItem.date;
          console.log(`[HealthSync] Upserting Heart Rate data for ${date}`);
          await prisma.heartRateData.deleteMany({
            where: { date: date }
          });
          
          const hrInserts = [];
          for (const item of (hrItem.timeline || [])) {
            for (const bpm of (item.bpms || [])) {
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
            hrCount++;
          }
        }
      }
    } catch (e) {
      console.error("[HealthSync] Could not process health data", e);
    }

    // --- 2. Process Scale Data (all records in physical_data.json) ---
    try {
      const scaleStr = await fs.readFile(scaleResultsPath, 'utf8');
      const scaleDb = JSON.parse(scaleStr);
      
      if (scaleDb.records && Array.isArray(scaleDb.records)) {
        for (const scaleRecord of scaleDb.records) {
          const scaleDate = scaleRecord.date;
          if (!scaleDate || !scaleRecord.data) continue;
          
          console.log(`[HealthSync] Upserting Scale data for ${scaleDate}`);
          await prisma.physicalData.upsert({
            where: { date: scaleDate },
            update: {
              weightKg: scaleRecord.data.weight_kg ?? null,
              bmi: scaleRecord.data.bmi ?? null,
              bodyFatPct: scaleRecord.data.body_fat_pct ?? null,
              fatMassKg: scaleRecord.data.fat_mass_kg ?? null,
              fatFreeMassKg: scaleRecord.data.fat_free_body_weight_kg ?? null,
              muscleMassKg: scaleRecord.data.muscle_mass_kg ?? null,
              muscleRatePct: scaleRecord.data.muscle_rate_pct ?? null,
              skeletalMusclePct: scaleRecord.data.skeletal_muscle_pct ?? null,
              boneMassKg: scaleRecord.data.bone_mass_kg ?? null,
              proteinMassKg: scaleRecord.data.protein_mass_kg ?? null,
              proteinPct: scaleRecord.data.protein_pct ?? null,
              waterWeightKg: scaleRecord.data.water_weight_kg ?? null,
              bodyWaterPct: scaleRecord.data.body_water_pct ?? null,
              subcutaneousFatPct: scaleRecord.data.subcutaneous_fat_pct ?? null,
              visceralFat: scaleRecord.data.visceral_fat ?? null,
              bmrKcal: scaleRecord.data.bmr_kcal ?? null,
              bodyAge: scaleRecord.data.body_age ?? null,
              idealBodyWeightKg: scaleRecord.data.ideal_body_weight_kg ?? null
            },
            create: {
              date: scaleDate,
              weightKg: scaleRecord.data.weight_kg ?? null,
              bmi: scaleRecord.data.bmi ?? null,
              bodyFatPct: scaleRecord.data.body_fat_pct ?? null,
              fatMassKg: scaleRecord.data.fat_mass_kg ?? null,
              fatFreeMassKg: scaleRecord.data.fat_free_body_weight_kg ?? null,
              muscleMassKg: scaleRecord.data.muscle_mass_kg ?? null,
              muscleRatePct: scaleRecord.data.muscle_rate_pct ?? null,
              skeletalMusclePct: scaleRecord.data.skeletal_muscle_pct ?? null,
              boneMassKg: scaleRecord.data.bone_mass_kg ?? null,
              proteinMassKg: scaleRecord.data.protein_mass_kg ?? null,
              proteinPct: scaleRecord.data.protein_pct ?? null,
              waterWeightKg: scaleRecord.data.water_weight_kg ?? null,
              bodyWaterPct: scaleRecord.data.body_water_pct ?? null,
              subcutaneousFatPct: scaleRecord.data.subcutaneous_fat_pct ?? null,
              visceralFat: scaleRecord.data.visceral_fat ?? null,
              bmrKcal: scaleRecord.data.bmr_kcal ?? null,
              bodyAge: scaleRecord.data.body_age ?? null,
              idealBodyWeightKg: scaleRecord.data.ideal_body_weight_kg ?? null
            }
          });
          scaleCount++;
        }
      }
    } catch (e) {
      console.error("[HealthSync] Could not process scale data", e);
    }
    
    return { 
      success: true, 
      message: `Sync complete: updated ${sleepCount} sleep, ${walkCount} walk, ${hrCount} HR, and ${scaleCount} physical records.` 
    };
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

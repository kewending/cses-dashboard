import { PrismaClient } from '@prisma/client';
import HealthDashboardClient from './HealthDashboardClient';

const prisma = new PrismaClient();

export default async function Page() {
  // Fetch latest data independently for each category directly by their own 'date' field
  const [latestSleep, latestActivity, latestPhysical] = await Promise.all([
    prisma.sleepData.findFirst({
      orderBy: { date: 'desc' }
    }),
    prisma.activityData.findFirst({
      orderBy: { date: 'desc' }
    }),
    prisma.physicalData.findFirst({
      orderBy: { date: 'desc' }
    }),
  ]);

  const latestHR = await prisma.heartRateData.findFirst({
    orderBy: { date: 'desc' }
  });

  let heartRateData = [];
  let hrDate = null;
  if (latestHR) {
    hrDate = latestHR.date;
    heartRateData = await prisma.heartRateData.findMany({
      where: { date: hrDate }
    });
  }

  // Fetch available dates for the calendar
  const [sleepDates, activityDates, hrDatesRaw, physicalDates] = await Promise.all([
    prisma.sleepData.findMany({ select: { date: true }, distinct: ['date'] }),
    prisma.activityData.findMany({ select: { date: true }, distinct: ['date'] }),
    prisma.heartRateData.findMany({ select: { date: true }, distinct: ['date'] }),
    prisma.physicalData.findMany({ select: { date: true }, distinct: ['date'] }),
  ]);

  const availableDates = {
    sleep: sleepDates.map(d => d.date),
    activity: activityDates.map(d => d.date),
    heartRate: hrDatesRaw.map(d => d.date),
    physical: physicalDates.map(d => d.date),
  };

  const latestData = {
    sleep: latestSleep,
    activity: latestActivity,
    physical: latestPhysical,
    heartRate: heartRateData,
    hrDate: hrDate,
    availableDates
  };

  return (
    <HealthDashboardClient initialData={latestData} />
  );
}

import prisma from '@/lib/prisma';
import DiaryClientWrapper from './DiaryClientWrapper';

async function getDailyLog(dateStr) {
  let log = await prisma.dailyLog.findUnique({
    where: { date: dateStr },
    include: {
      linkedNotes: {
        include: { note: true }
      }
    }
  });

  if (!log) {
    return {
      date: dateStr,
      content: '<h2>Execution / Events</h2><p></p><h2>Distillation / Reflection</h2><p></p>',
      weatherData: null,
      linkedNotes: []
    };
  }
  return log;
}

async function getCompletedTasks(dateStr) {
  const startOfDay = new Date(dateStr);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  return await prisma.task.findMany({
    where: {
      isCompleted: true,
      updatedAt: {
        gte: startOfDay,
        lte: endOfDay
      }
    }
  });
}

async function getDailyWeather() {
  try {
    const res = await fetch('http://localhost:3000/api/weather', { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error(e);
    return null;
  }
}

export default async function JournalDeepWork({ searchParams }) {
  // Use today's date for the journal page by default
  const today = new Date();
  // Adjust for local timezone to get correct YYYY-MM-DD
  const offset = today.getTimezoneOffset();
  const todayStr = new Date(today.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

  const dateStr = searchParams?.date || todayStr;
  const isShutdown = searchParams?.from === 'shutdown';

  const [dailyLog, tasks, weather] = await Promise.all([
    getDailyLog(dateStr),
    getCompletedTasks(dateStr),
    getDailyWeather()
  ]);

  let initialContent = dailyLog.content;
  if (!dailyLog.id && tasks.length > 0) {
    const taskHtml = tasks.map(t => `<li>[x] ${t.title}</li>`).join('');
    initialContent = `<h2>Execution / Events</h2><ul>${taskHtml}</ul><p></p><h2>Distillation / Reflection</h2><p></p>`;
  }

  return (
    <div className="w-full max-w-4xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in slide-in-from-bottom-4 duration-700">

      <header className="mb-8">
        <h1 className="text-4xl font-bold text-[var(--color-text-main)] mb-4 outline-none">
          {dateStr}
        </h1>
        {weather && (
          <div className="flex items-center space-x-3 text-sm text-[var(--color-text-muted)] bg-[var(--color-bg-panel)] px-4 py-2 rounded-lg inline-flex">
            <span>{weather.weather}</span>
            <span>•</span>
            <span>High: {weather.high}°C / Low: {weather.low}°C</span>
            <span>•</span>
            <span>Sunrise: {weather.sunrise} / Sunset: {weather.sunset}</span>
          </div>
        )}
      </header>

      <DiaryClientWrapper 
        initialContent={initialContent}
        dateStr={dateStr}
        isShutdown={isShutdown}
        dailyLogId={dailyLog?.id}
        weather={weather}
        onSaveAction={async (html) => {
          'use server';
          await prisma.dailyLog.upsert({
            where: { date: dateStr },
            update: { content: html },
            create: {
              date: dateStr,
              content: html,
              weatherData: weather ? JSON.stringify(weather) : null
            }
          });
        }}
      />
    </div>
  );
}

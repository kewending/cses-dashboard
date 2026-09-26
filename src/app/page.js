'use client';
import React, { useState, useEffect } from 'react';
import { getIdentityData, getCyberneticQuests, getDashboardStats } from './actions/identityActions';
import Link from 'next/link';
import Image from 'next/image';

// Helper for life progress calculation
function calculateLifeProgress(birthdayStr) {
  const now = new Date();

  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const endOfYear = new Date(now.getFullYear() + 1, 0, 1);
  const yearProgress = ((now - startOfYear) / (endOfYear - startOfYear)) * 100;

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const monthProgress = ((now - startOfMonth) / (endOfMonth - startOfMonth)) * 100;

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const dayProgress = ((now - startOfDay) / (endOfDay - startOfDay)) * 100;

  // Life
  const birthday = birthdayStr ? new Date(birthdayStr) : new Date(2000, 0, 1);
  const lifespanYears = 80;
  const endOfLife = new Date(birthday.getFullYear() + lifespanYears, birthday.getMonth(), birthday.getDate());
  const lifeProgress = ((now - birthday) / (endOfLife - birthday)) * 100;

  const totalDays = Math.floor((now - birthday) / (1000 * 60 * 60 * 24));
  const ageYears = Math.floor(totalDays / 365.25);
  const ageDays = Math.floor(totalDays % 365.25);

  return {
    year: yearProgress,
    month: monthProgress,
    day: dayProgress,
    life: lifeProgress,
    ageText: `${ageYears} yrs (${ageDays} days)`
  };
}

export default function HomeRPGPage() {
  const [data, setData] = useState(null);
  const [quests, setQuests] = useState(null);
  const [stats, setStats] = useState({ netWorth: 0, networkCount: 0 });
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [progressData, setProgressData] = useState(null);

  useEffect(() => {
    async function load() {
      const [identityRes, questRes, statsRes, weatherRes] = await Promise.all([
        getIdentityData(),
        getCyberneticQuests(),
        getDashboardStats(),
        fetch('/api/weather').then(res => res.json()).catch(() => null)
      ]);

      if (identityRes.success) setData(identityRes);
      if (questRes.success) setQuests(questRes);
      if (statsRes && statsRes.success) setStats(statsRes);
      if (weatherRes && !weatherRes.error) setWeather(weatherRes);

      setProgressData(calculateLifeProgress(identityRes.success ? identityRes.manifesto?.birthday : null));
      setLoading(false);
    }

    load();
    const interval = setInterval(() => {
      // Use functional state update to avoid stale data reference
      setProgressData((prev) => calculateLifeProgress(document.getElementById('hidden-birthday')?.value || '2000-01-01'));
    }, 60000); // update every minute

    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getConfidencePercentage = (logOdds) => {
    const p = 1 / (1 + Math.exp(-logOdds));
    return (p * 100).toFixed(1);
  };

  if (loading) return <div className="flex h-full items-center justify-center text-[var(--color-accent)] animate-pulse font-mono text-xl">Loading Character OS...</div>;
  if (!data) return <div className="p-8 text-red-500">Failed to load Character Data</div>;

  const confPercent = getConfidencePercentage(data.logOddsState.currentLogOdds);
  const level = Math.max(1, Math.floor((data.logOddsState.currentLogOdds + 10) * 2));
  const name = data.manifesto.archetype || "Commander";

  const ProgressBar = ({ label, value, colorClass }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] font-mono uppercase tracking-wider">
        <span>{label}</span>
        <span>{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
        <div className={`h-full ${colorClass}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }}></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-[1400px] mx-auto p-4 md:p-6 lg:p-8 space-y-6 text-[var(--color-text-main)] animate-in fade-in duration-500 h-full overflow-y-auto custom-scrollbar">

      {/* HEADER: Greeting & Weather */}
      <div className="flex justify-between items-end border-b border-[var(--color-border)] pb-4 mb-6">
        <h1 className="text-2xl font-light tracking-wide">
          {getGreeting()}, <span className="font-bold text-[var(--color-accent)] uppercase">{name}</span>
        </h1>
        <div className="text-sm font-mono text-[var(--color-text-muted)] flex items-center gap-3 bg-[var(--color-bg-panel)] px-4 py-2 rounded-lg border border-[var(--color-border)] shadow-sm">
          {weather ? (
            <>
              <span className="text-lg">{weather.icon}</span>
              <span className="opacity-30">|</span>
              <span>{weather.high}°C / {weather.low}°C</span>
            </>
          ) : (
            <>
              <span className="text-lg">🌤️</span>
              <span>--°C / --°C</span>
            </>
          )}
          <span className="opacity-30">|</span>
          <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-stretch">

        {/* LEFT COLUMN: Hero, Stats, Combat Log */}
        <div className="w-full lg:w-[320px] flex-shrink-0 flex flex-col gap-6">

          {/* Hero Image Block */}
          <div className="bg-[var(--color-bg-panel)] rounded-2xl border border-[var(--color-border)] p-4 shadow-sm flex flex-col items-center group relative">
            <div className="absolute top-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
              <Link href="/settings" className="text-[10px] bg-[var(--color-bg-dark)] px-2 py-1 rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] border border-[var(--color-border)]">Edit</Link>
            </div>
            <div className="w-full aspect-square rounded-xl bg-[var(--color-bg-dark)] border-2 border-[var(--color-border)] flex items-center justify-center relative overflow-hidden group-hover:border-[var(--color-accent)]/50 transition-colors">
              {data.manifesto.avatarUrl ? (
                <img src={data.manifesto.avatarUrl} alt="Avatar" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              ) : (
                <span className="text-7xl filter drop-shadow-md group-hover:scale-110 transition-transform duration-500">🛡️</span>
              )}
              <div className="absolute inset-0 bg-gradient-to-tr from-[var(--color-accent)]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
            <div className="w-full text-center mt-4 text-[10px] text-[var(--color-text-muted)] uppercase tracking-widest font-bold">
              Hero Avatar
            </div>
          </div>

          {/* Stats Box (Level, Buffs, Life Progress, Wealth, CRM) */}
          <div className="bg-[var(--color-bg-panel)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm space-y-6">
            {/* Level & EXP */}
            <div className="space-y-2">
              <div className="flex justify-between items-end">
                <span className="font-black text-xl text-[var(--color-text-main)] font-mono tracking-tight">LV {level}</span>
                <span className="text-sm font-bold font-mono text-[var(--color-accent)]">{confPercent}%</span>
              </div>
              <div className="h-2.5 bg-[var(--color-bg-dark)] rounded-full overflow-hidden border border-[var(--color-border)]">
                <div
                  className="h-full bg-[var(--color-accent)] transition-all duration-1000 ease-out"
                  style={{ width: `${Math.max(0, Math.min(100, confPercent))}%` }}
                ></div>
              </div>
            </div>

            {/* Active Buffs / Debuffs */}
            <div className="space-y-2 pt-3 border-t border-[var(--color-border)]/50">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Active Buffs / Debuffs</span>
              <div className="flex flex-wrap gap-2">
                {data.activeEffects?.length > 0 ? data.activeEffects.map(h => (
                   <span key={h.id} className={`text-xs px-2 py-1 rounded border ${h.isPositive ? 'bg-green-900/20 text-green-400 border-green-900/30' : 'bg-red-900/20 text-red-400 border-red-900/30'}`}>
                     {h.title}
                   </span>
                )) : (
                   <span className="text-xs text-[var(--color-text-muted)] italic">No active buffs/debuffs</span>
                )}
              </div>
            </div>

            {/* Life Progress Bar */}
            <div className="space-y-3 pt-3 border-t border-[var(--color-border)]/50">
              <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-widest">Life Progress</span>
                <span className="text-[10px] text-[var(--color-text-main)] font-mono opacity-80">{progressData?.ageText}</span>
              </div>
              {progressData && (
                <div className="space-y-2.5">
                  <ProgressBar label="Day" value={progressData.day} colorClass="bg-blue-400/80" />
                  <ProgressBar label="Month" value={progressData.month} colorClass="bg-indigo-400/80" />
                  <ProgressBar label="Year" value={progressData.year} colorClass="bg-purple-400/80" />
                  <ProgressBar label="Life" value={progressData.life} colorClass="bg-pink-400/80" />
                </div>
              )}
            </div>

            {/* Wealth & CRM Stats */}
            <div className="pt-3 border-t border-[var(--color-border)]/50 space-y-2 text-xs font-mono text-[var(--color-text-muted)]">
              <div className="flex justify-between">
                <span>🪙 Net Worth</span>
                <span className="text-[var(--color-text-main)] font-bold">$ {stats.netWorth.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>🤝 Network</span>
                <span className="text-[var(--color-text-main)] font-bold">{stats.networkCount} Contacts</span>
              </div>
            </div>
          </div>

          {/* Combat Log */}
          <div className="bg-[var(--color-bg-panel)] rounded-2xl border border-[var(--color-border)] p-5 shadow-sm flex flex-col flex-1 min-h-[250px]">
            <h3 className="text-[10px] font-black tracking-widest text-[var(--color-text-muted)] uppercase mb-4 flex items-center gap-2">
              <span className="text-sm">⚔️</span> Combat Log
            </h3>
            <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar space-y-3">
              {data.recentVotes?.length > 0 ? data.recentVotes.map((vote) => (
                <div key={vote.id} className="text-xs font-mono pb-2 border-b border-[var(--color-border)]/50 last:border-0 flex items-start gap-2">
                  <span className={`flex-shrink-0 font-bold ${vote.logOddsValue > 0 ? "text-green-400" : "text-red-400"}`}>
                    [{vote.logOddsValue > 0 ? '+' : ''}{vote.logOddsValue}]
                  </span>
                  <span className="text-[var(--color-text-main)] opacity-90 leading-tight">{vote.description}</span>
                </div>
              )) : (
                <div className="text-xs text-[var(--color-text-muted)] italic">No actions recorded.</div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT AREA: Lore & Quests */}
        <div className="flex-1 flex flex-col lg:flex-row gap-6 items-stretch">

          {/* THE LORE (Center) */}
          <div className="flex-1 bg-[var(--color-bg-panel)] rounded-2xl border border-[var(--color-border)] p-6 md:p-8 shadow-sm flex flex-col gap-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--color-accent)] opacity-[0.03] rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex justify-between items-center pb-3 border-b border-[var(--color-border)]/60">
              <h3 className="text-xs font-black tracking-widest text-[var(--color-text-muted)] uppercase flex items-center gap-2">
                <span className="text-base">📖</span> The Lore
              </h3>
            </div>

            <div className="space-y-8 flex-1">
              <div>
                <h4 className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase mb-3 tracking-widest">▫️ The Creed (Core)</h4>
                <p className="text-sm md:text-base text-[var(--color-text-main)] italic font-serif leading-relaxed border-l-2 border-[var(--color-accent)]/50 pl-4 py-1">
                  "{data.manifesto.statement}"
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-red-400/80 uppercase mb-3 tracking-widest">▫️ The Abyss (Anti-Vision)</h4>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap border-l-2 border-red-500/20 pl-4 py-1 hover:text-[var(--color-text-main)] transition-colors">
                  {data.manifesto.antiVision}
                </p>
              </div>

              <div>
                <h4 className="text-[10px] font-bold text-blue-400/80 uppercase mb-3 tracking-widest">▫️ Ideal Realm (MVP Vision)</h4>
                <p className="text-sm text-[var(--color-text-muted)] leading-relaxed whitespace-pre-wrap border-l-2 border-blue-500/20 pl-4 py-1 hover:text-[var(--color-text-main)] transition-colors">
                  {data.manifesto.mvpVision}
                </p>
              </div>
            </div>
          </div>

          {/* ACTIVE QUESTS (Right) */}
          <div className="flex-1 bg-[var(--color-bg-panel)] rounded-2xl border border-[var(--color-border)] p-6 md:p-8 shadow-sm flex flex-col">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-[var(--color-border)]/60">
              <h3 className="text-xs font-black tracking-widest text-[var(--color-text-muted)] uppercase flex items-center gap-2">
                <span className="text-base">📜</span> Active Quests
              </h3>
              <Link href="/actions" className="text-[10px] uppercase font-bold text-[var(--color-accent)] hover:underline bg-[var(--color-accent)]/10 px-2 py-1 rounded">Action Engine</Link>
            </div>

            <div className="flex-1 space-y-8 overflow-y-auto pr-1 custom-scrollbar">
              {/* Main Quest (Year) */}
              <div>
                <h4 className="text-[10px] font-bold text-amber-500/80 mb-3 flex items-center gap-2 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                  Main Quests (Annual)
                </h4>
                <div className="space-y-3">
                  {quests?.yearMissions?.length > 0 ? quests.yearMissions.map(m => (
                    <div key={m.id} className="bg-[var(--color-bg-dark)] border border-amber-500/20 rounded-xl p-3 text-sm flex justify-between items-center group">
                      <span className="font-medium text-[var(--color-text-main)] truncate mr-2">{m.title}</span>
                      <span className="text-[10px] font-mono text-amber-500 bg-amber-500/10 px-2 py-1 rounded flex-shrink-0">
                        {m.completedSubprojects}/{m.totalSubprojects}
                      </span>
                    </div>
                  )) : <div className="text-xs text-[var(--color-text-muted)] italic pl-3">No active main quests.</div>}
                </div>
              </div>

              {/* Side Quests (Month) */}
              <div>
                <h4 className="text-[10px] font-bold text-blue-400/80 mb-3 flex items-center gap-2 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full"></span>
                  Side Quests (Monthly)
                </h4>
                <div className="space-y-3">
                  {quests?.monthBosses?.length > 0 ? quests.monthBosses.map(m => (
                    <div key={m.id} className="bg-[var(--color-bg-dark)] border border-blue-500/20 rounded-xl p-3 text-sm flex justify-between items-center">
                      <span className="font-medium text-[var(--color-text-main)] truncate mr-2">{m.title}</span>
                      <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-1 rounded flex-shrink-0">
                        {m.completedTasks}/{m.totalTasks}
                      </span>
                    </div>
                  )) : <div className="text-xs text-[var(--color-text-muted)] italic pl-3">No active side quests.</div>}
                </div>
              </div>

              {/* Dailies */}
              <div>
                <h4 className="text-[10px] font-bold text-green-400/80 mb-3 flex items-center gap-2 uppercase tracking-widest">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
                  Dailies (Priority 1)
                </h4>
                <div className="space-y-3">
                  {quests?.dailyLevers?.length > 0 ? quests.dailyLevers.map(t => (
                    <div key={t.id} className="bg-[#0a1f10]/30 border border-green-900/30 rounded-xl p-3 text-sm flex items-center gap-3">
                      <div className="w-3.5 h-3.5 rounded-sm border-2 border-green-500/40 flex-shrink-0"></div>
                      <span className="font-medium text-green-100">{t.title}</span>
                    </div>
                  )) : <div className="text-xs text-[var(--color-text-muted)] italic pl-3">Dailies completed.</div>}
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--color-border);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--color-text-muted);
        }
      `}} />
    </div>
  );
}

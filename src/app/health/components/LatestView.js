import React from 'react';
import { 
  Activity, Moon, Scale, Heart, 
  Flame, Route, Clock, Zap, CalendarDays
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar
} from 'recharts';

export default function LatestView({ data }) {
  const { sleep, activity, physical, heartRate, hrDate } = data || {};

  // Parse Heart Rate timeline
  let hrData = [];
  if (heartRate && heartRate.length > 0) {
    heartRate.forEach(hr => {
      hrData.push({ time: hr.time, bpm: hr.bpm });
    });
    hrData = hrData.reverse(); // Chronological
  }

  // Parse Walk timeline
  let walkData = [];
  if (activity?.timelineJson) {
    try {
      const parsed = JSON.parse(activity.timelineJson);
      walkData = parsed.reverse();
    } catch (e) {}
  }

  const noData = !sleep && !activity && !physical && (!heartRate || heartRate.length === 0);

  // Calculate Sleep Score
  let sleepScore = 0;
  if (sleep) {
    const totalScore = Math.min((sleep.totalDurationMins / 480) * 50, 50);
    const deepScore = Math.min((sleep.deepSleepMins / 90) * 25, 25);
    const remScore = Math.min((sleep.remSleepMins / 90) * 25, 25);
    const awakePenalty = (sleep.awakeTimes || 0) * 0.5;
    const fallingSleepPenalty = (sleep.fallingSleepMins || 0) * 0.2;
    sleepScore = Math.max(0, Math.round(totalScore + deepScore + remScore - awakePenalty - fallingSleepPenalty));
  }

  if (noData) {
    return (
      <div className="h-64 flex items-center justify-center border border-[var(--color-glass-border)] rounded-2xl bg-[var(--color-glass-bg)] backdrop-blur-md">
        <p className="opacity-50">No health records found. Click Sync Data to pull from Drive.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Activity Card */}
        <div className="group bg-[var(--color-glass-bg)] hover:bg-[var(--color-bg-panel-hover)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[var(--color-glass-bg)] px-3 py-1 rounded-bl-xl text-[10px] flex items-center gap-1 opacity-70">
            <CalendarDays size={10} /> {activity?.date || 'N/A'}
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl">
              <Activity size={24} />
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Activity</p>
              <p className="text-3xl font-bold mt-1">{activity?.steps?.toLocaleString() || 0}</p>
              <p className="text-xs opacity-60">Steps</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[var(--color-glass-border)]">
            <div>
              <div className="flex items-center gap-1.5 opacity-60 mb-1">
                <Route size={14} /> <span className="text-xs">Distance</span>
              </div>
              <p className="font-semibold">{activity?.distanceKm || 0} km</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 opacity-60 mb-1">
                <Flame size={14} /> <span className="text-xs">Calories</span>
              </div>
              <p className="font-semibold">{activity?.caloriesKcal || 0} kcal</p>
            </div>
          </div>
        </div>

        {/* Sleep Card */}
        <div className="group bg-[var(--color-glass-bg)] hover:bg-[var(--color-bg-panel-hover)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[var(--color-glass-bg)] px-3 py-1 rounded-bl-xl text-[10px] flex items-center gap-1 opacity-70">
            <CalendarDays size={10} /> {sleep?.date || 'N/A'}
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
              <Moon size={24} />
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Sleep</p>
              <p className="text-3xl font-bold mt-1">
                {Math.floor((sleep?.totalDurationMins || 0) / 60)}h {(sleep?.totalDurationMins || 0) % 60}m
              </p>
              <p className="text-xs opacity-60">Total Duration</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[var(--color-glass-border)]">
            <div>
              <div className="flex items-center gap-1.5 opacity-60 mb-1">
                <Clock size={14} /> <span className="text-xs">Falling Sleep</span>
              </div>
              <p className="font-semibold text-sm">{sleep?.fallingSleepMins || 0} mins</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 opacity-60 mb-1">
                <Zap size={14} /> <span className="text-xs">Sleep Score</span>
              </div>
              <p className="font-semibold">{sleepScore} / 100</p>
            </div>
          </div>
        </div>

        {/* Scale Card */}
        <div className="group bg-[var(--color-glass-bg)] hover:bg-[var(--color-bg-panel-hover)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 transition-all duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[var(--color-glass-bg)] px-3 py-1 rounded-bl-xl text-[10px] flex items-center gap-1 opacity-70">
            <CalendarDays size={10} /> {physical?.date || 'N/A'}
          </div>
          <div className="flex justify-between items-start mb-4">
            <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
              <Scale size={24} />
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Body Comp</p>
              <p className="text-3xl font-bold mt-1">{physical?.weightKg || '--'} <span className="text-lg text-emerald-400/50">kg</span></p>
              <p className="text-xs opacity-60">Weight</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[var(--color-glass-border)]">
            <div>
              <div className="flex items-center gap-1.5 opacity-60 mb-1">
                <Activity size={14} /> <span className="text-xs">Body Fat</span>
              </div>
              <p className="font-semibold">{physical?.bodyFatPct || '--'}%</p>
            </div>
            <div>
              <div className="flex items-center gap-1.5 opacity-60 mb-1">
                <Heart size={14} /> <span className="text-xs">Muscle</span>
              </div>
              <p className="font-semibold">{physical?.muscleMassKg || '--'} kg</p>
            </div>
          </div>
        </div>

      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        
        {/* Heart Rate Chart */}
        <div className="bg-[var(--color-glass-bg)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[var(--color-glass-bg)] px-3 py-1 rounded-bl-xl text-[10px] flex items-center gap-1 opacity-70">
            <CalendarDays size={10} /> {hrDate || 'N/A'}
          </div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Heart size={18} className="text-pink-500" /> Heart Rate Timeline
              </h3>
              <p className="text-xs opacity-50 mt-1">Beats per minute throughout the day</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {hrData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hrData}>
                  <defs>
                    <linearGradient id="colorHr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                    itemStyle={{ color: '#ec4899' }}
                  />
                  <Area type="monotone" dataKey="bpm" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorHr)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center opacity-50 text-sm">No heart rate data available</div>
            )}
          </div>
        </div>

        {/* Steps Timeline */}
        <div className="bg-[var(--color-glass-bg)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-[var(--color-glass-bg)] px-3 py-1 rounded-bl-xl text-[10px] flex items-center gap-1 opacity-70">
            <CalendarDays size={10} /> {activity?.date || 'N/A'}
          </div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Route size={18} className="text-orange-400" /> Activity Timeline
              </h3>
              <p className="text-xs opacity-50 mt-1">Steps accumulated by hour</p>
            </div>
          </div>
          <div className="h-64 w-full">
            {walkData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={walkData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} minTickGap={20} />
                  <YAxis stroke="var(--color-text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                    itemStyle={{ color: '#f97316' }}
                    cursor={{fill: 'var(--color-glass-border)'}}
                  />
                  <Bar dataKey="steps" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center opacity-50 text-sm">No activity timeline available</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

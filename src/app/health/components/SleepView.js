import React from 'react';
import { Moon, Clock, Zap } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import CalendarPicker from './CalendarPicker';
import { format, parseISO } from 'date-fns';

export default function SleepView({ 
  detailData, trendData, availableDates, selectedDate, 
  onSelectDate, dateRange, onChangeRange 
}) {
  
  // Calculate sleep score for detail view
  let sleepScore = 0;
  if (detailData) {
    const totalScore = Math.min((detailData.totalDurationMins / 480) * 50, 50);
    const deepScore = Math.min((detailData.deepSleepMins / 90) * 25, 25);
    const remScore = Math.min((detailData.remSleepMins / 90) * 25, 25);
    const awakePenalty = (detailData.awakeTimes || 0) * 0.5;
    const fallingPenalty = (detailData.fallingSleepMins || 0) * 0.2;
    sleepScore = Math.max(0, Math.round(totalScore + deepScore + remScore - awakePenalty - fallingPenalty));
  }

  // Format trend data for charts
  const chartData = trendData.map(d => {
    const totalScore = Math.min((d.totalDurationMins / 480) * 50, 50);
    const deepScore = Math.min((d.deepSleepMins / 90) * 25, 25);
    const remScore = Math.min((d.remSleepMins / 90) * 25, 25);
    const awakePenalty = (d.awakeTimes || 0) * 0.5;
    const fallingPenalty = (d.fallingSleepMins || 0) * 0.2;
    const score = Math.max(0, Math.round(totalScore + deepScore + remScore - awakePenalty - fallingPenalty));
    
    return {
      date: format(parseISO(d.date), 'MMM d'),
      deep: Math.round(d.deepSleepMins / 60 * 10) / 10,
      light: Math.round(d.lightSleepMins / 60 * 10) / 10,
      rem: Math.round(d.remSleepMins / 60 * 10) / 10,
      score: score
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Left Column: Calendar & Daily Detail */}
      <div className="space-y-6">
        <CalendarPicker 
          selectedDate={selectedDate} 
          onSelectDate={onSelectDate} 
          availableDates={availableDates}
          theme="indigo"
        />

        {detailData ? (
          <div className="bg-[var(--color-glass-bg)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 relative overflow-hidden">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-2xl">
                <Moon size={24} />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Daily Sleep</p>
                <p className="text-3xl font-bold mt-1">
                  {Math.floor((detailData.totalDurationMins || 0) / 60)}h {(detailData.totalDurationMins || 0) % 60}m
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-[var(--color-glass-border)]">
              <div>
                <div className="flex items-center gap-1.5 opacity-60 mb-1">
                  <Clock size={14} /> <span className="text-xs">Deep Sleep</span>
                </div>
                <p className="font-semibold text-sm">
                  {Math.floor((detailData.deepSleepMins || 0)/60)}h {(detailData.deepSleepMins || 0)%60}m
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 opacity-60 mb-1">
                  <Clock size={14} /> <span className="text-xs">Light Sleep</span>
                </div>
                <p className="font-semibold text-sm">
                  {Math.floor((detailData.lightSleepMins || 0)/60)}h {(detailData.lightSleepMins || 0)%60}m
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 opacity-60 mb-1">
                  <Clock size={14} /> <span className="text-xs">REM Sleep</span>
                </div>
                <p className="font-semibold text-sm">
                  {Math.floor((detailData.remSleepMins || 0)/60)}h {(detailData.remSleepMins || 0)%60}m
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 opacity-60 mb-1">
                  <Zap size={14} /> <span className="text-xs">Sleep Score</span>
                </div>
                <p className="font-semibold">{sleepScore} / 100</p>
              </div>
              <div className="col-span-2">
                <div className="flex justify-between items-center bg-[var(--color-glass-bg)] p-3 rounded-xl mt-2">
                  <div>
                    <p className="text-[10px] opacity-40 uppercase tracking-wider mb-0.5">To Sleep</p>
                    <p className="font-medium text-xs text-indigo-300">{detailData.fallingSleepMins || 0} mins</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs opacity-60 mb-0.5">Fell Asleep</p>
                    <p className="font-medium text-sm">{detailData.startTime || '--'}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] opacity-40 uppercase tracking-wider mb-0.5">Awake</p>
                    <p className="font-medium text-xs text-orange-300">{detailData.awakeTimes || 0} times</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs opacity-60 mb-0.5">Woke Up</p>
                    <p className="font-medium text-sm">{detailData.endTime || '--'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 bg-[var(--color-glass-bg)] border border-[var(--color-glass-border)] rounded-3xl flex items-center justify-center opacity-50">
            No detail data for {selectedDate}
          </div>
        )}
      </div>

      {/* Right Column: Trend Overview */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[var(--color-glass-bg)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 h-full shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Moon size={20} className="text-indigo-400" /> Historical Trends
            </h3>
            <div className="flex bg-[var(--color-glass-bg)] rounded-full p-1">
              {[7, 30, 90].map(r => (
                <button
                  key={r}
                  onClick={() => onChangeRange(r)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    dateRange === r ? 'bg-indigo-500 text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  {r} Days
                </button>
              ))}
            </div>
          </div>
          
          {chartData.length > 0 ? (
            <div className="space-y-10">
              {/* Stacked Bar for Sleep Stages */}
              <div>
                <p className="text-xs opacity-60 mb-4 uppercase tracking-wider font-bold">Sleep Stages (Hours)</p>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                      />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                      <Bar dataKey="deep" name="Deep" stackId="a" fill="#4f46e5" radius={[0, 0, 4, 4]} />
                      <Bar dataKey="light" name="Light" stackId="a" fill="#818cf8" />
                      <Bar dataKey="rem" name="REM" stackId="a" fill="#c7d2fe" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Line Chart for Sleep Score */}
              <div>
                <p className="text-xs opacity-60 mb-4 uppercase tracking-wider font-bold">Sleep Score</p>
                <div className="h-40 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                      />
                      <Line type="monotone" dataKey="score" name="Score" stroke="#a78bfa" strokeWidth={3} dot={{ r: 4, fill: '#a78bfa', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          ) : (
            <div className="h-64 flex items-center justify-center opacity-50">No trend data available for {dateRange} days</div>
          )}
        </div>
      </div>

    </div>
  );
}

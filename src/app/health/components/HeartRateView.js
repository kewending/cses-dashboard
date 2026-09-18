import React, { useMemo } from 'react';
import { Heart, Activity } from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ComposedChart, Line, LineChart
} from 'recharts';
import CalendarPicker from './CalendarPicker';
import { format, parseISO } from 'date-fns';

export default function HeartRateView({ 
  detailData, trendData, availableDates, selectedDate, 
  onSelectDate, dateRange, onChangeRange 
}) {

  // Daily Detail HR Timeline
  const dailyData = useMemo(() => {
    if (!detailData || !Array.isArray(detailData)) return [];
    // The data might come in reverse chronological order, so reverse it back
    const mapped = detailData.map(d => ({ time: d.time, bpm: d.bpm }));
    return mapped.reverse();
  }, [detailData]);

  // Daily Stats (Avg, Min, Max)
  const dailyStats = useMemo(() => {
    if (!dailyData || dailyData.length === 0) return null;
    const bpms = dailyData.map(d => d.bpm);
    const min = Math.min(...bpms);
    const max = Math.max(...bpms);
    const avg = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
    return { min, max, avg };
  }, [dailyData]);

  // Aggregate Trend Data
  const chartData = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];
    
    const grouped = {};
    trendData.forEach(d => {
      if (!grouped[d.date]) grouped[d.date] = [];
      grouped[d.date].push(d.bpm);
    });
    
    return Object.keys(grouped).sort().map(dateStr => {
      const bpms = grouped[dateStr];
      const min = Math.min(...bpms);
      const max = Math.max(...bpms);
      const avg = Math.round(bpms.reduce((a,b)=>a+b,0) / bpms.length);
      return {
        date: format(parseISO(dateStr), 'MMM d'),
        min, max, avg, range: [min, max]
      };
    });
  }, [trendData]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Left Column */}
      <div className="space-y-6">
        <CalendarPicker 
          selectedDate={selectedDate} 
          onSelectDate={onSelectDate} 
          availableDates={availableDates}
          theme="pink"
        />

        <div className="bg-[var(--color-glass-bg)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 relative overflow-hidden shadow-xl">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 bg-pink-500/20 text-pink-400 rounded-2xl">
              <Heart size={24} />
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-pink-400 uppercase tracking-wider">Daily HR</p>
            </div>
          </div>
          
          <div className="h-48 w-full">
            {dailyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorHrDaily" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                  <XAxis dataKey="time" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis domain={['auto', 'auto']} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                    itemStyle={{ color: '#ec4899' }}
                  />
                  <Area type="monotone" dataKey="bpm" stroke="#ec4899" strokeWidth={2} fillOpacity={1} fill="url(#colorHrDaily)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center opacity-40 text-xs">No detail data for {selectedDate}</div>
            )}
          </div>

          {dailyStats && (
            <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--color-glass-border)] text-center">
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider mb-1">Average</p>
                <p className="font-semibold text-lg">{dailyStats.avg} <span className="text-xs opacity-50">bpm</span></p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider mb-1">Min</p>
                <p className="font-semibold text-lg">{dailyStats.min} <span className="text-xs opacity-50">bpm</span></p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider mb-1">Max</p>
                <p className="font-semibold text-lg">{dailyStats.max} <span className="text-xs opacity-50">bpm</span></p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[var(--color-glass-bg)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 h-full shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Heart size={20} className="text-pink-500" /> Historical Trends
            </h3>
            <div className="flex bg-[var(--color-glass-bg)] rounded-full p-1">
              {[7, 30, 90].map(r => (
                <button
                  key={r}
                  onClick={() => onChangeRange(r)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    dateRange === r ? 'bg-pink-500 text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  {r} Days
                </button>
              ))}
            </div>
          </div>
          
          {chartData.length > 0 ? (
            <div className="space-y-10">
              
              {/* Avg HR Line Chart */}
              <div>
                <p className="text-xs opacity-60 mb-4 uppercase tracking-wider font-bold">Average Heart Rate (BPM)</p>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis domain={['auto', 'auto']} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                      />
                      <Line type="monotone" dataKey="avg" name="Average BPM" stroke="#f472b6" strokeWidth={3} dot={{ r: 4, fill: '#f472b6', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Min/Max Range Chart */}
              <div>
                <p className="text-xs opacity-60 mb-4 uppercase tracking-wider font-bold">Min & Max Heart Rate (BPM)</p>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis domain={['auto', 'auto']} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                      />
                      <Line type="monotone" dataKey="max" name="Max BPM" stroke="#be185d" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="min" name="Min BPM" stroke="#fbcfe8" strokeWidth={2} dot={false} />
                      {/* Area for range visualization */}
                      <Area type="monotone" dataKey="max" baseValue="dataMin" fill="#f472b6" fillOpacity={0.1} stroke="none" />
                    </ComposedChart>
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

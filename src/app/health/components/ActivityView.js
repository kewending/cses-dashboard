import React from 'react';
import { Route, Activity, Flame } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend
} from 'recharts';
import CalendarPicker from './CalendarPicker';
import { format, parseISO } from 'date-fns';

export default function ActivityView({ 
  detailData, trendData, availableDates, selectedDate, 
  onSelectDate, dateRange, onChangeRange 
}) {

  // Parse Walk timeline for the daily detail chart
  let walkData = [];
  if (detailData?.timelineJson) {
    try {
      const parsed = JSON.parse(detailData.timelineJson);
      walkData = parsed.reverse();
    } catch (e) {}
  }
  
  // Format trend data
  const chartData = trendData.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    steps: d.steps,
    distance: d.distanceKm,
    calories: d.caloriesKcal
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Left Column */}
      <div className="space-y-6">
        <CalendarPicker 
          selectedDate={selectedDate} 
          onSelectDate={onSelectDate} 
          availableDates={availableDates}
          theme="orange"
        />

        {detailData ? (
          <div className="bg-[var(--color-glass-bg)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 relative overflow-hidden shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-orange-500/20 text-orange-400 rounded-2xl">
                <Activity size={24} />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Daily Activity</p>
                <p className="text-3xl font-bold mt-1">{detailData.steps?.toLocaleString() || 0}</p>
                <p className="text-xs opacity-60">Steps</p>
              </div>
            </div>
            
            <div className="h-32 mt-4 w-full">
              {walkData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={walkData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                    <XAxis dataKey="time" hide />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                      itemStyle={{ color: '#f97316' }}
                      cursor={{fill: 'var(--color-glass-border)'}}
                    />
                    <Bar dataKey="steps" fill="#f97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center opacity-40 text-xs">No timeline</div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-[var(--color-glass-border)]">
              <div>
                <div className="flex items-center gap-1.5 opacity-60 mb-1">
                  <Route size={14} /> <span className="text-xs">Distance</span>
                </div>
                <p className="font-semibold">{detailData.distanceKm || 0} km</p>
              </div>
              <div>
                <div className="flex items-center gap-1.5 opacity-60 mb-1">
                  <Flame size={14} /> <span className="text-xs">Calories</span>
                </div>
                <p className="font-semibold">{detailData.caloriesKcal || 0} kcal</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-48 bg-[var(--color-glass-bg)] border border-[var(--color-glass-border)] rounded-3xl flex items-center justify-center opacity-50">
            No detail data for {selectedDate}
          </div>
        )}
      </div>

      {/* Right Column */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-[var(--color-glass-bg)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 h-full shadow-xl">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Activity size={20} className="text-orange-400" /> Historical Trends
            </h3>
            <div className="flex bg-[var(--color-glass-bg)] rounded-full p-1">
              {[7, 30, 90].map(r => (
                <button
                  key={r}
                  onClick={() => onChangeRange(r)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    dateRange === r ? 'bg-orange-500 text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)]'
                  }`}
                >
                  {r} Days
                </button>
              ))}
            </div>
          </div>
          
          {chartData.length > 0 ? (
            <div className="space-y-10">
              
              {/* Steps Bar Chart */}
              <div>
                <p className="text-xs opacity-60 mb-4 uppercase tracking-wider font-bold">Daily Steps</p>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                        itemStyle={{ color: '#f97316' }}
                        cursor={{fill: 'var(--color-glass-border)'}}
                      />
                      <Bar dataKey="steps" name="Steps" fill="#f97316" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Distance and Calories Line Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <p className="text-xs opacity-60 mb-4 uppercase tracking-wider font-bold flex items-center gap-1"><Route size={12}/> Distance (km)</p>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                        />
                        <Line type="monotone" dataKey="distance" name="Distance" stroke="#fb923c" strokeWidth={3} dot={{ r: 3, fill: '#fb923c', strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div>
                  <p className="text-xs opacity-60 mb-4 uppercase tracking-wider font-bold flex items-center gap-1"><Flame size={12}/> Calories (kcal)</p>
                  <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData} margin={{ top: 5, right: 5, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                        <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                        <YAxis stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                        />
                        <Line type="monotone" dataKey="calories" name="Calories" stroke="#ef4444" strokeWidth={3} dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
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

import React from 'react';
import { Scale, Activity, Heart } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line
} from 'recharts';
import CalendarPicker from './CalendarPicker';
import { format, parseISO } from 'date-fns';

export default function BodyCompView({ 
  detailData, trendData, availableDates, selectedDate, 
  onSelectDate, dateRange, onChangeRange 
}) {

  // Format trend data
  const chartData = trendData.map(d => ({
    date: format(parseISO(d.date), 'MMM d'),
    weight: d.weightKg,
    bodyFat: d.bodyFatPct,
    muscle: d.muscleMassKg
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Left Column */}
      <div className="space-y-6">
        <CalendarPicker 
          selectedDate={selectedDate} 
          onSelectDate={onSelectDate} 
          availableDates={availableDates}
          theme="emerald" // Ensure we add 'emerald' to CalendarPicker if not there, or it will default to indigo
        />

        {detailData ? (
          <div className="bg-[var(--color-glass-bg)] backdrop-blur-md border border-[var(--color-glass-border)] rounded-3xl p-6 relative overflow-hidden shadow-xl">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                <Scale size={24} />
              </div>
              <div className="text-right">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Body Comp</p>
                <p className="text-3xl font-bold mt-1">
                  {detailData.weightKg || '--'} <span className="text-lg opacity-50">kg</span>
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-6 pt-6 border-t border-[var(--color-glass-border)]">
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">BMI</p>
                <p className="font-semibold text-sm">{detailData.bmi || '--'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">Body Age</p>
                <p className="font-semibold text-sm">{detailData.bodyAge || '--'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">Body Fat</p>
                <p className="font-semibold text-sm">{detailData.bodyFatPct || '--'}% ({detailData.fatMassKg || '--'}kg)</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">Subcutaneous Fat</p>
                <p className="font-semibold text-sm">{detailData.subcutaneousFatPct || '--'}%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">Visceral Fat</p>
                <p className="font-semibold text-sm">{detailData.visceralFat || '--'}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">Fat-Free Mass</p>
                <p className="font-semibold text-sm">{detailData.fatFreeMassKg || '--'}kg</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">Muscle Mass</p>
                <p className="font-semibold text-sm">{detailData.muscleMassKg || '--'}kg ({detailData.muscleRatePct || '--'}%)</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">Skeletal Muscle</p>
                <p className="font-semibold text-sm">{detailData.skeletalMusclePct || '--'}%</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">Bone Mass</p>
                <p className="font-semibold text-sm">{detailData.boneMassKg || '--'}kg</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">Protein</p>
                <p className="font-semibold text-sm">{detailData.proteinPct || '--'}% ({detailData.proteinMassKg || '--'}kg)</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">Body Water</p>
                <p className="font-semibold text-sm">{detailData.bodyWaterPct || '--'}% ({detailData.waterWeightKg || '--'}kg)</p>
              </div>
              <div>
                <p className="text-[10px] uppercase opacity-50 tracking-wider">BMR</p>
                <p className="font-semibold text-sm">{detailData.bmrKcal || '--'} kcal</p>
              </div>
              <div className="col-span-2 mt-2 pt-2 border-t border-[var(--color-glass-border)]">
                <p className="text-[10px] uppercase opacity-50 tracking-wider">Ideal Body Weight</p>
                <p className="font-semibold text-sm text-emerald-400">{detailData.idealBodyWeightKg || '--'} kg</p>
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
              <Scale size={20} className="text-emerald-400" /> Historical Trends
            </h3>
            <div className="flex bg-[var(--color-glass-bg)] rounded-full p-1">
              {[7, 30, 90].map(r => (
                <button
                  key={r}
                  onClick={() => onChangeRange(r)}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    dateRange === r ? 'bg-emerald-500 text-white shadow-md' : 'text-[var(--color-text-muted)] hover:text-white'
                  }`}
                >
                  {r} Days
                </button>
              ))}
            </div>
          </div>
          
          {chartData.length > 0 ? (
            <div className="space-y-10">
              
              {/* Weight Line Chart */}
              <div>
                <p className="text-xs opacity-60 mb-4 uppercase tracking-wider font-bold">Weight (kg)</p>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis domain={['dataMin - 2', 'dataMax + 2']} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                      />
                      <Line type="monotone" dataKey="weight" name="Weight" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Body Fat Line Chart */}
              <div>
                <p className="text-xs opacity-60 mb-4 uppercase tracking-wider font-bold">Body Fat (%)</p>
                <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--color-glass-border)" vertical={false} />
                      <XAxis dataKey="date" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'var(--color-bg-panel)', border: '1px solid var(--color-border)', borderRadius: '12px' }}
                      />
                      <Line type="monotone" dataKey="bodyFat" name="Body Fat %" stroke="#34d399" strokeWidth={3} dot={{ r: 4, fill: '#34d399', strokeWidth: 0 }} />
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

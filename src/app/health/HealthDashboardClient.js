'use client';

import React, { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { format, subDays } from 'date-fns';

import { 
  syncHealthData, 
  getSleepByDate, getActivityByDate, getHeartRateByDate, getPhysicalByDate,
  getSleepTrends, getActivityTrends, getHeartRateTrends, getPhysicalTrends
} from './actions';

import LatestView from './components/LatestView';
import SleepView from './components/SleepView';
import ActivityView from './components/ActivityView';
import HeartRateView from './components/HeartRateView';
import BodyCompView from './components/BodyCompView';

export default function HealthDashboardClient({ initialData }) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState('Latest');
  
  const { availableDates } = initialData;

  const [selectedDates, setSelectedDates] = useState({
    sleep: initialData.sleep?.date || format(new Date(), 'yyyy-MM-dd'),
    activity: initialData.activity?.date || format(new Date(), 'yyyy-MM-dd'),
    heartRate: initialData.hrDate || format(new Date(), 'yyyy-MM-dd'),
    physical: initialData.physical?.date || format(new Date(), 'yyyy-MM-dd'),
  });

  const [dateRange, setDateRange] = useState(7);
  
  const [detailData, setDetailData] = useState({
    sleep: { [initialData.sleep?.date]: initialData.sleep },
    activity: { [initialData.activity?.date]: initialData.activity },
    heartRate: { [initialData.hrDate]: initialData.heartRate },
    physical: { [initialData.physical?.date]: initialData.physical }
  });

  const [trendData, setTrendData] = useState({
    sleep: {},
    activity: {},
    heartRate: {},
    physical: {}
  });

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const res = await syncHealthData();
      if (res.success) {
        window.location.reload();
      } else {
        alert("Sync failed: " + res.message);
      }
    } catch (e) {
      alert("Error syncing: " + e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Fetch Trends
  useEffect(() => {
    if (activeTab === 'Latest') return;

    const endDate = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), dateRange - 1), 'yyyy-MM-dd');
    
    // Cache key by date string
    const cacheKey = `${startDate}_${endDate}`;
    
    if (activeTab === 'Sleep' && !trendData.sleep[cacheKey]) {
      getSleepTrends(startDate, endDate).then(data => {
        setTrendData(prev => ({ ...prev, sleep: { ...prev.sleep, [cacheKey]: data } }));
      });
    }
    if (activeTab === 'Activity' && !trendData.activity[cacheKey]) {
      getActivityTrends(startDate, endDate).then(data => {
        setTrendData(prev => ({ ...prev, activity: { ...prev.activity, [cacheKey]: data } }));
      });
    }
    if (activeTab === 'HeartRate' && !trendData.heartRate[cacheKey]) {
      getHeartRateTrends(startDate, endDate).then(data => {
        setTrendData(prev => ({ ...prev, heartRate: { ...prev.heartRate, [cacheKey]: data } }));
      });
    }
    if (activeTab === 'BodyComp' && !trendData.physical[cacheKey]) {
      getPhysicalTrends(startDate, endDate).then(data => {
        setTrendData(prev => ({ ...prev, physical: { ...prev.physical, [cacheKey]: data } }));
      });
    }
  }, [activeTab, dateRange]);

  // Fetch Details
  useEffect(() => {
    const sleepDate = selectedDates.sleep;
    if (activeTab === 'Sleep' && sleepDate && !detailData.sleep[sleepDate]) {
      getSleepByDate(sleepDate).then(data => {
        setDetailData(prev => ({ ...prev, sleep: { ...prev.sleep, [sleepDate]: data } }));
      });
    }
    
    const activityDate = selectedDates.activity;
    if (activeTab === 'Activity' && activityDate && !detailData.activity[activityDate]) {
      getActivityByDate(activityDate).then(data => {
        setDetailData(prev => ({ ...prev, activity: { ...prev.activity, [activityDate]: data } }));
      });
    }

    const hrDate = selectedDates.heartRate;
    if (activeTab === 'HeartRate' && hrDate && !detailData.heartRate[hrDate]) {
      getHeartRateByDate(hrDate).then(data => {
        setDetailData(prev => ({ ...prev, heartRate: { ...prev.heartRate, [hrDate]: data } }));
      });
    }

    const physicalDate = selectedDates.physical;
    if (activeTab === 'BodyComp' && physicalDate && !detailData.physical[physicalDate]) {
      getPhysicalByDate(physicalDate).then(data => {
        setDetailData(prev => ({ ...prev, physical: { ...prev.physical, [physicalDate]: data } }));
      });
    }
  }, [selectedDates, activeTab]);

  const handleSelectDate = (category, date) => {
    setSelectedDates(prev => ({ ...prev, [category]: date }));
  };

  const currentTrendCacheKey = `${format(subDays(new Date(), dateRange - 1), 'yyyy-MM-dd')}_${format(new Date(), 'yyyy-MM-dd')}`;

  const tabs = [
    { id: 'Latest', label: 'Latest' },
    { id: 'Sleep', label: 'Sleep' },
    { id: 'Activity', label: 'Activity' },
    { id: 'HeartRate', label: 'Heart Rate' },
    { id: 'BodyComp', label: 'Body Comp' }
  ];

  return (
    <div className="w-full text-[var(--color-text-main)] space-y-8 pb-20">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        
        {/* Sleek Tab Navigation */}
        <div className="flex bg-[var(--color-glass-bg)] backdrop-blur-md p-1.5 rounded-full border border-[var(--color-glass-border)] shadow-lg relative overflow-hidden">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 relative z-10 ${
                activeTab === tab.id 
                  ? 'text-white' 
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] hover:bg-[var(--color-glass-bg)]'
              }`}
            >
              {activeTab === tab.id && (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full shadow-lg scale-100 transition-all -z-10"></div>
              )}
              {tab.label}
            </button>
          ))}
        </div>
        
        <button 
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-2 bg-[var(--color-glass-bg)] hover:bg-[var(--color-bg-panel-hover)] backdrop-blur-md border border-[var(--color-glass-border)] text-[var(--color-text-main)] px-5 py-2.5 rounded-full font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-70"
        >
          <RefreshCw size={18} className={isSyncing ? "animate-spin" : ""} />
          {isSyncing ? "Syncing..." : "Sync Data"}
        </button>
      </div>

      {/* Tab Content */}
      <div className="min-h-[500px]">
        {activeTab === 'Latest' && <LatestView data={initialData} />}
        
        {activeTab === 'Sleep' && (
          <SleepView 
            detailData={detailData.sleep[selectedDates.sleep]}
            trendData={trendData.sleep[currentTrendCacheKey] || []}
            availableDates={availableDates.sleep}
            selectedDate={selectedDates.sleep}
            onSelectDate={(date) => handleSelectDate('sleep', date)}
            dateRange={dateRange}
            onChangeRange={setDateRange}
          />
        )}
        
        {activeTab === 'Activity' && (
          <ActivityView 
            detailData={detailData.activity[selectedDates.activity]}
            trendData={trendData.activity[currentTrendCacheKey] || []}
            availableDates={availableDates.activity}
            selectedDate={selectedDates.activity}
            onSelectDate={(date) => handleSelectDate('activity', date)}
            dateRange={dateRange}
            onChangeRange={setDateRange}
          />
        )}
        
        {activeTab === 'HeartRate' && (
          <HeartRateView 
            detailData={detailData.heartRate[selectedDates.heartRate]}
            trendData={trendData.heartRate[currentTrendCacheKey] || []}
            availableDates={availableDates.heartRate}
            selectedDate={selectedDates.heartRate}
            onSelectDate={(date) => handleSelectDate('heartRate', date)}
            dateRange={dateRange}
            onChangeRange={setDateRange}
          />
        )}
        
        {activeTab === 'BodyComp' && (
          <BodyCompView 
            detailData={detailData.physical[selectedDates.physical]}
            trendData={trendData.physical[currentTrendCacheKey] || []}
            availableDates={availableDates.physical}
            selectedDate={selectedDates.physical}
            onSelectDate={(date) => handleSelectDate('physical', date)}
            dateRange={dateRange}
            onChangeRange={setDateRange}
          />
        )}
      </div>

    </div>
  );
}

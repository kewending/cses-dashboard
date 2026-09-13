"use client";

import { useState, useEffect } from 'react';
import { HOURS } from '@/lib/utils';

export default function CurrentTimeLine({ zoomLevel }) {
  const [minsFromMidnight, setMinsFromMidnight] = useState(0);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setMinsFromMidnight(now.getHours() * 60 + now.getMinutes());
    };
    updateTime();
    const int = setInterval(updateTime, 60000);
    return () => clearInterval(int);
  }, []);

  const top = (minsFromMidnight) * (zoomLevel / 60);

  return (
    <div
      className="absolute left-14 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
      style={{ top: `${top}px` }}
    >
      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
    </div>
  );
}

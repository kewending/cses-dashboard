export const HOURS = Array.from({ length: 24 }, (_, i) => i); // 12 AM to 11 PM

export const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const formatRelativeDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === -1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const formatAbsoluteDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const getProjectionDays = (baseDateStr) => {
  const days = [];
  const baseDate = baseDateStr ? new Date(baseDateStr) : new Date();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 4; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);

    const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
    let dayName = DAYS_OF_WEEK[d.getDay()];
    if (diffDays === 0) dayName = 'Today';
    else if (diffDays === 1) dayName = 'Tomorrow';
    else if (diffDays === -1) dayName = 'Yesterday';

    const m = (d.getMonth() + 1).toString().padStart(2, '0');
    const day = d.getDate().toString().padStart(2, '0');
    const dateStr = `${d.getFullYear()}-${m}-${day}`;

    days.push({ id: dateStr, title: dayName, dateStr: dateStr });
  }
  return days;
};

export const formatActualTime = (totalSeconds) => {
  if (totalSeconds === 0 || !totalSeconds) return '0:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `0:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const formatMins = (mins) => {
  if (mins === 0 || !mins) return '--:--';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h > 0 && m === 0) return `${h} hr`;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}`;
  return `0:${m.toString().padStart(2, '0')}`;
};

export const formatSessionTime = (mins) => {
  if (mins == null) return '';
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const displayH = h > 12 ? h - 12 : (h === 0 ? 12 : h);
  return `${displayH}:${m.toString().padStart(2, '0')} ${ampm}`;
};

export const isNextFewDays = (dateStr) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  d.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= 3;
};

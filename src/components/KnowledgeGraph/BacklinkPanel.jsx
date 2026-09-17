'use client';
import Link from 'next/link';
import { Link2, Calendar } from 'lucide-react';

export default function BacklinkPanel({ backlinks, dailyLogMentions }) {
  const hasLinks = backlinks?.length > 0 || dailyLogMentions?.length > 0;

  if (!hasLinks) {
    return (
      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Backlinks</h3>
        <p className="text-sm text-slate-400">No references to this note yet.</p>
      </div>
    );
  }

  return (
    <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
      <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Backlinks</h3>
      
      <div className="space-y-4">
        {/* Daily Log Mentions */}
        {dailyLogMentions?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-slate-400 flex items-center">
              <Calendar size={14} className="mr-1.5" /> Mentioned in Daily Logs
            </h4>
            <ul className="space-y-2 pl-5">
              {dailyLogMentions.map((log) => (
                <li key={log.id}>
                  <Link 
                    href={`/daily/${log.date}`} 
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {log.date}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Note Backlinks */}
        {backlinks?.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-medium text-slate-400 flex items-center">
              <Link2 size={14} className="mr-1.5" /> Linked Notes
            </h4>
            <ul className="space-y-2 pl-5">
              {backlinks.map((link) => (
                <li key={link.fromNote.id}>
                  <Link 
                    href={`/second-brain/${link.fromNote.id}`} 
                    className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    {link.fromNote.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

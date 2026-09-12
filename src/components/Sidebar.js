"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Sidebar({ defaultCollapsed = false }) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);
  const pathname = usePathname();

  const toggleSidebar = () => {
    setIsCollapsed(prev => {
      const next = !prev;
      document.cookie = `sidebarCollapsed=${next}; path=/; max-age=31536000`; // 1 year
      return next;
    });
  };

  const navItems = [
    { icon: "🏠", label: "Dashboard", href: "/" },
    { icon: "🧠", label: "Core Identity & Vision", href: "/identity" },
    { icon: "⚙️", label: "Action Engine", href: "/actions" },
    { icon: "📚", label: "Second Brain", href: "/journal" },
    { icon: "🧬", label: "Health Data", href: "/health" },
    { icon: "💰", label: "Wealth", href: "/finance" },
    { icon: "🤝", label: "Network CRM", href: "/crm" },
    { icon: "🧘‍♂️", label: "Psychology", href: "/mood" },
    { icon: "🌍", label: "Environment", href: "/environment" },
    { icon: "🤖", label: "AI Oracle", href: "/oracle" },
    { icon: "🔧", label: "Settings", href: "/settings" },
  ];

  return (
    <nav
      className={`h-full glass-panel border-l-0 border-y-0 rounded-none flex flex-col transition-all duration-300 z-50 overflow-y-auto overflow-x-hidden custom-scrollbar shadow-2xl relative
      ${isCollapsed ? 'w-20 items-center px-2' : 'w-64 px-4'} py-8`}
    >
      {/* Notion-style Collapse Toggle Zone */}
      <div 
        className="absolute top-6 right-0 w-8 h-8 cursor-pointer group/toggle flex items-center justify-center z-[60]"
        onClick={toggleSidebar}
        title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
      >
        <div className="opacity-0 group-hover/toggle:opacity-100 bg-[var(--color-bg-dark)] border border-[var(--color-glass-border)] rounded-full w-6 h-6 flex items-center justify-center text-[var(--color-text-muted)] hover:text-white hover:bg-[rgba(255,255,255,0.1)] transition-all shadow-lg absolute right-[-12px] z-50">
          {isCollapsed ? "»" : "«"}
        </div>
      </div>

      {/* Header */}
      <div className={`mb-12 flex items-center justify-center ${isCollapsed ? 'w-full' : 'w-full px-2 justify-start'}`}>
        <div className={`font-bold text-[var(--color-accent)] tracking-widest ${isCollapsed ? 'text-lg' : 'text-xl uppercase'}`}>
          {isCollapsed ? "OS" : "Life OS"}
        </div>
      </div>

      {/* Navigation Links */}
      <ul className="flex flex-col gap-3 w-full">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.label} className="w-full">
              <Link
                href={item.href}
                className={`flex items-center gap-4 rounded-xl transition-all cursor-pointer group ${isCollapsed ? 'justify-center p-3' : 'p-3 px-4'}
                  ${isActive
                    ? "text-white font-bold drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]"
                    : "hover:bg-[rgba(255,255,255,0.05)] text-[var(--color-text-muted)] hover:text-white"
                  }`}
                title={isCollapsed ? item.label : undefined}
              >
                <span className={`text-xl shrink-0 transition-transform ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="font-medium text-sm tracking-wide whitespace-nowrap">{item.label}</span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

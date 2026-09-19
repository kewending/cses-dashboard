import Sidebar from "../components/Sidebar";
import { cookies } from 'next/headers';
import { SettingsProvider } from "../lib/SettingsContext";
import QuickCaptureModal from "../components/QuickCapture/QuickCaptureModal";
import AgentChat from "../components/AgentChat";
import "./globals.css";

export const metadata = {
  title: "Life OS",
  description: "Comprehensive Life Operating System",
};

const themeInitScript = `
  (function() {
    try {
      var stored = localStorage.getItem('cses-settings');
      if (stored) {
        var settings = JSON.parse(stored);
        if (settings.theme === 'light') {
          var root = document.documentElement;
          root.style.setProperty('--color-bg-dark', '#f8f9fa');
          root.style.setProperty('--color-bg-panel', '#ffffff');
          root.style.setProperty('--color-bg-panel-hover', '#f0f0f0');
          root.style.setProperty('--color-border', 'rgba(0,0,0,0.1)');
          root.style.setProperty('--color-border-hover', 'rgba(0,0,0,0.2)');
          root.style.setProperty('--color-text-main', '#1a1a24');
          root.style.setProperty('--color-text-muted', '#666677');
          root.style.setProperty('--color-glass-bg', 'rgba(0,0,0,0.03)');
          root.style.setProperty('--color-glass-border', 'rgba(0,0,0,0.1)');
        }
        if (settings.accentColor) {
          document.documentElement.style.setProperty('--color-accent', settings.accentColor);
        }
      }
    } catch(e) {}
  })();
`;

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get('sidebarCollapsed')?.value === 'true';

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="flex h-screen overflow-hidden">
        <SettingsProvider>
          {/* Responsive, Stateful Global Sidebar */}
          <Sidebar defaultCollapsed={defaultCollapsed} />

          {/* Main Content Area */}
          <main className="flex-1 h-full overflow-y-auto relative bg-[var(--color-bg-dark)]">
            <div className="p-8 pt-12">
              {children}
            </div>
          </main>
          
          {/* Global Quick Capture (Cmd+K) */}
          <QuickCaptureModal />
          
          {/* Floating Agent Chat */}
          <AgentChat />
        </SettingsProvider>
      </body>
    </html>
  );
}

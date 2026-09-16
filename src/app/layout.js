import Sidebar from "../components/Sidebar";
import { cookies } from 'next/headers';
import { SettingsProvider } from "../lib/SettingsContext";
import "./globals.css";

export const metadata = {
  title: "Life OS",
  description: "Comprehensive Life Operating System",
};

export default async function RootLayout({ children }) {
  const cookieStore = await cookies();
  const defaultCollapsed = cookieStore.get('sidebarCollapsed')?.value === 'true';

  return (
    <html lang="en">
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
        </SettingsProvider>
      </body>
    </html>
  );
}

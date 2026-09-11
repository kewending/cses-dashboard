import Sidebar from "../components/Sidebar";
import "./globals.css";

export const metadata = {
  title: "Life OS",
  description: "Comprehensive Life Operating System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden">
        {/* Responsive, Stateful Global Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <main className="flex-1 h-full overflow-y-auto relative bg-[var(--color-bg-dark)]">
          <div className="p-8 pt-12">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}

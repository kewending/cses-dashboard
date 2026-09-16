export default function JournalDeepWork() {
  return (
    <div className="w-full max-w-3xl mx-auto h-[calc(100vh-8rem)] flex flex-col animate-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-center gap-4 mb-12 text-[var(--color-text-muted)] mt-8">
        <a href="/" className="hover:text-[var(--color-text-main)] transition-colors">← Back to Command Center</a>
        <span>/</span>
        <span>Journal (Deep Work Mode)</span>
      </div>

      <input 
        type="text" 
        placeholder="Entry Title..." 
        className="w-full bg-transparent text-4xl font-bold text-[var(--color-text-main)] outline-none placeholder:text-[var(--color-text-muted)] mb-8"
        defaultValue="Friday Reflection: System Architecture"
      />

      <textarea 
        className="w-full flex-1 bg-transparent text-[var(--color-text-main)] text-lg leading-relaxed outline-none resize-none placeholder:text-[rgba(255,255,255,0.1)] custom-scrollbar"
        placeholder="Start writing... (The interface is designed to disappear as you type to maximize focus)"
        defaultValue="Today we mapped out the core UI architecture for the Life OS. It feels incredibly powerful to finally have a layout that respects both the need for high-density telemetry and deep, distraction-free focus..."
      ></textarea>
      
      <div className="flex justify-between items-center mt-6 text-sm text-[var(--color-text-muted)] border-t border-[var(--color-glass-border)] pt-4">
        <span>32 words</span>
        <button className="bg-[var(--color-accent)] text-[var(--color-text-main)] px-6 py-2 rounded-full font-medium hover:brightness-110 transition-all shadow-[0_0_15px_var(--color-accent-glow)] hover:shadow-[0_0_25px_var(--color-accent-glow)]">
          Save Entry
        </button>
      </div>
    </div>
  );
}

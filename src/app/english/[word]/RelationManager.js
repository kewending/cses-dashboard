"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GitMerge, Sparkles, Search, Plus, Loader2, Link2, BookOpen, X } from "lucide-react";
import { aiSuggestRelations, createVocabRelation, searchVocabForLinking, deleteVocabRelation } from "../../actions/vocab-relations";
import { magicImportVocab } from "../../actions/english-import";

export default function RelationManager({ currentSense }) {
  const router = useRouter();
  
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState(null); // Array of { text, relationType, exists, dbMatches }
  
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  
  const [activePopover, setActivePopover] = useState(null); // for selecting which meaning to link
  const [isLinking, setIsLinking] = useState(false);

  // Derive existing established connections
  const establishedLinks = [];
  const addedIds = new Set();
  
  const processRelation = (rel, linkedNode) => {
    if (!addedIds.has(linkedNode.id)) {
      establishedLinks.push({ relationType: rel.relationType, node: linkedNode });
      addedIds.add(linkedNode.id);
    }
  };
  
  currentSense.relationsFrom?.forEach(r => processRelation(r, r.to));
  currentSense.relationsTo?.forEach(r => processRelation(r, r.from));

  const handleSuggest = async () => {
    if (isSuggesting) return;
    setIsSuggesting(true);
    const res = await aiSuggestRelations(currentSense.text, currentSense.meaning, currentSense.partOfSpeech);
    setIsSuggesting(false);
    
    if (res.success) {
      setSuggestions(res.suggestions);
    } else {
      alert("AI failed to suggest relations: " + res.error);
    }
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length > 1) {
      const results = await searchVocabForLinking(q);
      setSearchResults(results.filter(r => r.id !== currentSense.id));
    } else {
      setSearchResults([]);
    }
  };

  const executeLink = async (targetId, relationType) => {
    setIsLinking(true);
    const res = await createVocabRelation(currentSense.id, targetId, relationType);
    setIsLinking(false);
    
    if (res.success) {
      setActivePopover(null);
      setSuggestions(null);
      setSearchQuery("");
      setSearchResults([]);
      router.refresh();
    } else {
      alert("Linking failed: " + res.error);
    }
  };

  const executeDelete = async (targetId, relationType) => {
    setIsLinking(true);
    const res = await deleteVocabRelation(currentSense.id, targetId, relationType);
    setIsLinking(false);
    
    if (res.success) {
      router.refresh();
    } else {
      alert("Failed to remove relation: " + res.error);
    }
  };

  const handleMagicImportAndLink = async (wordToImport, relationType, sugIndex) => {
    setIsLinking(true);
    // 1. Magic Import
    const importRes = await magicImportVocab(wordToImport);
    setIsLinking(false);
    
    if (!importRes.success || importRes.items.length === 0) {
      alert("Failed to import new word from Cambridge.");
      return;
    }

    // 2. Instead of blindly linking the first meaning, we update the UI to turn this pill GREEN
    // and inject the newly imported meanings, then automatically open the selection popover!
    setSuggestions(prev => {
      const next = [...prev];
      next[sugIndex] = {
        ...next[sugIndex],
        exists: true,
        dbMatches: importRes.items
      };
      return next;
    });

    setActivePopover(sugIndex);
  };

  const relationColors = {
    Synonym: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    Antonym: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    Root: "text-amber-400 bg-amber-500/10 border-amber-500/20"
  };

  return (
    <div className="pt-6 border-t border-white/10 mt-6">
      
      {/* 1. Established Connections */}
      {establishedLinks.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <div className="w-full text-xs font-bold uppercase tracking-widest text-neutral-500 mb-1 flex items-center">
            <GitMerge className="w-3 h-3 mr-1" /> Neural Pathways
          </div>
          {establishedLinks.map((link, idx) => (
            <div key={idx} className={`flex items-stretch rounded-lg border transition-all ${relationColors[link.relationType]}`}>
              <button 
                onClick={() => router.push(`/english/${encodeURIComponent(link.node.text)}`)}
                className="px-3 py-1 text-xs flex items-center gap-1 hover:brightness-125 transition-all"
                title={link.node.meaning}
              >
                <Link2 className="w-3 h-3" />
                <span className="font-semibold">{link.node.text}</span>
                <span className="opacity-50 text-[10px] uppercase ml-1 border-l border-current pl-1">{link.relationType}</span>
              </button>
              <button 
                onClick={() => executeDelete(link.node.id, link.relationType)}
                disabled={isLinking}
                className="px-2 hover:bg-black/20 transition-colors border-l border-current/20 opacity-50 hover:opacity-100 flex items-center justify-center disabled:opacity-20"
                title="Remove Neural Pathway"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 2. Control Panel */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={handleSuggest}
          disabled={isSuggesting || isLinking}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 transition-colors"
        >
          {isSuggesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          AI Suggest Relations
        </button>

        <div className="relative group">
          <div className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl bg-white/5 border border-white/10 focus-within:border-blue-500/50">
            <Search className="w-4 h-4 text-neutral-500" />
            <input 
              type="text"
              placeholder="Manual link..."
              value={searchQuery}
              onChange={handleSearch}
              className="bg-transparent border-none text-neutral-200 outline-none w-32 focus:w-48 transition-all"
            />
          </div>
          
          {/* Manual Search Dropdown */}
          {searchQuery.length > 1 && (
            <div className="absolute top-full mt-2 w-64 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-2 z-50">
              {searchResults.length === 0 ? (
                <div className="p-2 text-xs text-neutral-500 text-center">No matches found.</div>
              ) : (
                searchResults.map(res => (
                  <div key={res.id} className="p-2 hover:bg-white/5 rounded-lg mb-1 group/item">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-bold text-neutral-200">{res.text}</span>
                      <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button onClick={() => executeLink(res.id, "Synonym")} className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/40">Syn</button>
                        <button onClick={() => executeLink(res.id, "Antonym")} className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/40">Ant</button>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 line-clamp-1" title={res.explanation || res.meaning}>
                      {res.meaning}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* 3. AI Suggestions Panel */}
      {suggestions && (
        <div className="mt-6 p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/20">
          <div className="text-xs uppercase tracking-widest text-indigo-400 font-bold mb-3">AI Suggestions</div>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((sug, idx) => {
              const isGreen = sug.exists;
              
              return (
                <div key={idx} className="relative">
                  <button
                    onClick={() => isGreen ? setActivePopover(activePopover === idx ? null : idx) : handleMagicImportAndLink(sug.text, sug.relationType, idx)}
                    disabled={isLinking}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-all border ${
                      isGreen 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                        : "bg-white/5 text-neutral-400 border-white/10 hover:border-white/30 hover:text-neutral-200 hover:bg-white/10"
                    }`}
                  >
                    {!isGreen && <Sparkles className="w-3 h-3 opacity-50" />}
                    <span>{sug.text}</span>
                    <span className="text-[10px] opacity-60 uppercase pl-1 border-l border-current">{sug.relationType}</span>
                  </button>

                  {/* Popover for selecting specific meaning if exists */}
                  {activePopover === idx && isGreen && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl p-2 z-50">
                      <div className="text-xs text-neutral-500 mb-2 px-1">Select specific meaning:</div>
                      {sug.dbMatches.map(match => (
                        <button
                          key={match.id}
                          onClick={() => executeLink(match.id, sug.relationType)}
                          className="w-full text-left p-2 hover:bg-white/5 rounded-lg mb-1 flex flex-col group"
                          title={match.explanation || match.meaning}
                        >
                          <span className="text-xs text-neutral-300 font-medium group-hover:text-emerald-400 transition-colors">
                            <BookOpen className="w-3 h-3 inline mr-1 opacity-50" />
                            {match.meaning}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="mt-3 text-[10px] text-neutral-500">
            <span className="text-emerald-400 font-bold mr-1">Green</span> words are in your vault. 
            <span className="text-neutral-400 font-bold mx-1">Gray</span> words are new (Clicking will Auto-Import & Link).
          </div>
        </div>
      )}
    </div>
  );
}

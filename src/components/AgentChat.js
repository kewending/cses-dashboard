"use client";
import React, { useState, useRef, useEffect } from "react";

export default function AgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  const [ttsEnabled, setTtsEnabled] = useState(true); // Optional toggle
  
  const messagesEndRef = useRef(null);
  const audioQueueRef = useRef([]);
  const isPlayingRef = useRef(false);

  const playNextAudio = () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }
    
    isPlayingRef.current = true;
    const base64Audio = audioQueueRef.current.shift();
    const audio = new Audio(`data:audio/wav;base64,${base64Audio}`);
    
    audio.onended = () => {
      playNextAudio();
    };
    
    audio.play().catch(e => {
      console.error("Audio playback error:", e);
      playNextAudio();
    });
  };
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, currentTool, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMsg = { role: "user", content: input };
    const nextMessages = [...messages, userMsg];
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    setCurrentTool(null);
    
    const botMsgIndex = messages.length + 1;
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    
    try {
      const response = await fetch("http://localhost:8000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("event: ")) {
            const parts = line.split("\n");
            const eventType = parts[0].replace("event: ", "").trim();
            const dataStr = parts[1] ? parts[1].replace("data: ", "").trim() : "{}";
            let data = {};
            try { data = JSON.parse(dataStr); } catch (e) {}
            
            if (eventType === "tool_start") {
              setCurrentTool(`Running ${data.name}...`);
            } else if (eventType === "tool_end") {
              setCurrentTool(null);
            } else if (eventType === "delta") {
              setMessages(prev => {
                const newMsgs = [...prev];
                const targetMsg = { ...newMsgs[botMsgIndex] };
                targetMsg.content += (data.content || "");
                newMsgs[botMsgIndex] = targetMsg;
                return newMsgs;
              });
            } else if (eventType === "audio") {
              if (ttsEnabled) {
                audioQueueRef.current.push(data.base64);
                if (!isPlayingRef.current) {
                  playNextAudio();
                }
              }
            } else if (eventType === "done") {
              setIsLoading(false);
            } else if (eventType === "error") {
               setMessages(prev => {
                const newMsgs = [...prev];
                const targetMsg = { ...newMsgs[botMsgIndex] };
                targetMsg.content += `\n**Error:** ${data.error}`;
                newMsgs[botMsgIndex] = targetMsg;
                return newMsgs;
              });
              setIsLoading(false);
            }
          }
        }
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => {
        const newMsgs = [...prev];
        if(newMsgs[botMsgIndex]) {
            newMsgs[botMsgIndex].content = "Connection Error: Could not connect to the agent on port 8000.";
        }
        return newMsgs;
      });
      setIsLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-blue-600 text-white shadow-lg flex items-center justify-center text-2xl hover:scale-105 transition-transform z-50 cursor-pointer"
      >
        🤖
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] max-h-[80vh] bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-2xl shadow-2xl flex flex-col z-50 overflow-hidden">
          <div className="p-4 border-b border-[var(--color-border)] flex justify-between items-center bg-[var(--color-bg-dark)]">
            <h3 className="font-bold text-[var(--color-text-main)]">CSES Agent</h3>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setTtsEnabled(!ttsEnabled)}
                className={`text-[var(--color-text-muted)] hover:text-blue-500 cursor-pointer flex items-center justify-center ${ttsEnabled ? 'text-blue-500' : ''}`}
                title={ttsEnabled ? "Mute TTS" : "Enable TTS"}
              >
                {ttsEnabled ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <line x1="23" y1="9" x2="17" y2="15"></line>
                    <line x1="17" y1="9" x2="23" y2="15"></line>
                  </svg>
                )}
              </button>
              <button 
                onClick={() => {
                  setMessages([]);
                  setCurrentTool(null);
                  setIsLoading(false);
                  audioQueueRef.current = []; // Clear audio queue on new chat
                  isPlayingRef.current = false;
                }}
                className="text-[var(--color-text-muted)] hover:text-blue-500 cursor-pointer flex items-center justify-center"
                title="New Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
                </svg>
              </button>
              <button 
                onClick={async () => {
                  try {
                    setCurrentTool("Fetching Daily Report...");
                    const res = await fetch("http://localhost:8000/api/daily-report");
                    if (!res.ok) throw new Error("Failed to fetch report");
                    const data = await res.json();
                    
                    const audioUrl = `http://localhost:8000${data.audio_url}`;
                    const audio = new Audio(audioUrl);
                    audio.play().catch(console.error);
                    
                    setMessages(prev => [...prev, {
                      role: "assistant", 
                      content: `Playing your daily report! \n[Read Script](http://localhost:8000${data.script_url})`
                    }]);
                    setCurrentTool(null);
                  } catch (err) {
                    console.error(err);
                    setMessages(prev => [...prev, {role: "assistant", content: "Error playing daily report."}]);
                    setCurrentTool(null);
                  }
                }}
                className="text-[var(--color-text-muted)] hover:text-green-500 cursor-pointer flex items-center justify-center"
                title="Play Daily News Report"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </button>
              <button onClick={() => setIsOpen(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-main)] cursor-pointer">✕</button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.length === 0 && (
              <div className="text-center text-[var(--color-text-muted)] mt-10">
                <p>Hello! I am connected to your Life OS.</p>
                <p className="text-xs mt-2 opacity-70">Try asking me to list your tasks or check your health data.</p>
              </div>
            )}
            
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] p-3 rounded-2xl whitespace-pre-wrap text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-[var(--color-text-main)] rounded-bl-none'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            
            {currentTool && (
              <div className="flex justify-start">
                 <div className="bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs p-2 rounded-xl rounded-bl-none flex items-center gap-2">
                    <span className="animate-spin inline-block">⚙️</span> {currentTool}
                 </div>
              </div>
            )}
            
            {isLoading && !currentTool && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start">
                 <div className="bg-[var(--color-bg-dark)] border border-[var(--color-border)] text-[var(--color-text-muted)] text-xs p-2 rounded-xl rounded-bl-none flex items-center gap-2">
                    <span className="animate-pulse">Thinking...</span>
                 </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
          
          <form onSubmit={handleSubmit} className="p-3 border-t border-[var(--color-border)] bg-[var(--color-bg-dark)] flex gap-2">
            <input 
              type="text" 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
              className="flex-1 bg-[var(--color-bg-panel)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-text-main)] focus:outline-none focus:border-blue-500"
            />
            <button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 cursor-pointer hover:bg-blue-700"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}

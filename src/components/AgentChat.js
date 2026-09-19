"use client";
import React, { useState, useRef, useEffect } from "react";

export default function AgentChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentTool, setCurrentTool] = useState(null);
  
  const messagesEndRef = useRef(null);
  
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
                onClick={() => {
                  setMessages([]);
                  setCurrentTool(null);
                  setIsLoading(false);
                }}
                className="text-[var(--color-text-muted)] hover:text-blue-500 cursor-pointer flex items-center justify-center"
                title="New Chat"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14"/>
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

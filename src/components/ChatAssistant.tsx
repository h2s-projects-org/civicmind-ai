import React, { useState, useRef, useEffect } from "react";
import { Send, Sparkles, MessageSquare, Terminal, RefreshCw, Bot, HelpCircle, CornerDownLeft } from "lucide-react";
import { Dataset } from "../types";

interface ChatMessage {
  sender: "user" | "bot";
  text: string;
  timestamp: string;
  isSimulated?: boolean;
}

interface ChatAssistantProps {
  activeDataset: Dataset | null;
  onSendQuery: (query: string, chatHistory: ChatMessage[]) => Promise<{ text: string; isSimulated?: boolean }>;
}

export default function ChatAssistant({ activeDataset, onSendQuery }: ChatAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: "Welcome to **CivicMind AI Decision Support**. I am your Gemini-powered assistant grounded in your local municipal database.\n\nYou can ask me complex analytical queries such as:\n* *'Which district holds the highest environmental risk factor?'*\n* *'Predict our solid waste overflow levels for the next quarter.'*\n* *'Provide the BigQuery SQL to isolate long emergency response delays.'*",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    "Which district has the highest environmental risk?",
    "Explain the emergency response delays in District A",
    "Show BigQuery SQL to summarize public safety calls",
    "Generate recommendations for waste overflow"
  ];

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      sender: "user",
      text: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const result = await onSendQuery(textToSend, messages);
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: result.text,
          timestamp: new Date().toISOString(),
          isSimulated: result.isSimulated
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          sender: "bot",
          text: "An error occurred while communicating with the Gemini Decision Intelligence engine. Please verify your internet connection or API key setup.",
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Safe custom Markdown-like parser for simple UI bullet points, bold sections, and code blocks
  const renderMessageContent = (text: string) => {
    const lines = text.split("\n");
    return lines.map((line, lineIdx) => {
      // 1. Check for Code blocks (e.g. SQL blocks starting with ```)
      if (line.trim().startsWith("```")) {
        return null; // Handle container boundaries implicitly
      }

      // Check if inside a SQL code block pattern
      const isSql = line.includes("SELECT") || line.includes("FROM") || line.includes("GROUP BY") || line.includes("WHERE");
      if (isSql) {
        return (
          <pre key={lineIdx} className="my-1 overflow-x-auto rounded-lg bg-slate-950 p-3 font-mono text-[11px] text-cyan-300 border border-slate-900 leading-normal">
            <code>{line}</code>
          </pre>
        );
      }

      // 2. Bold tags transformation **text**
      let renderedLine: React.ReactNode = line;
      if (line.includes("**")) {
        const parts = line.split("**");
        renderedLine = parts.map((part, partIdx) => (partIdx % 2 === 1 ? <strong key={partIdx} className="text-white font-bold">{part}</strong> : part));
      }

      // 3. Bullet list items * text
      if (line.trim().startsWith("* ") || line.trim().startsWith("- ")) {
        return (
          <li key={lineIdx} className="ml-4 list-disc text-xs text-slate-300 mt-1 leading-relaxed">
            {line.trim().substring(2)}
          </li>
        );
      }

      return (
        <p key={lineIdx} className="text-xs text-slate-300 leading-relaxed mt-1">
          {renderedLine}
        </p>
      );
    });
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/5 bg-white/[0.02] backdrop-blur-md overflow-hidden shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-slate-950/40 px-4 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Bot className="h-4.5 w-4.5 text-cyan-400" />
          <div>
            <h3 className="text-xs font-bold text-white flex items-center gap-1.5 font-display">
              CivicMind Decision Intelligence <Sparkles className="h-3 w-3 text-cyan-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400">Grounded in {activeDataset ? activeDataset.name : "System Knowledge"}</p>
          </div>
        </div>
        <button
          onClick={() => setMessages((prev) => [prev[0]])}
          className="rounded border border-white/5 bg-slate-950/40 p-1 text-[10px] font-semibold text-slate-400 hover:text-white cursor-pointer backdrop-blur-md"
          title="Clear Conversation History"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/10">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
            {msg.sender === "bot" && (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950/40 border border-white/5 text-cyan-400 backdrop-blur-sm">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
            )}
            <div className="max-w-[80%]">
              <div
                className={`rounded-xl px-4 py-3 text-xs border ${
                  msg.sender === "user"
                    ? "bg-[#06b6d4]/10 border-[#06b6d4]/20 text-slate-100 shadow-sm"
                    : "bg-white/[0.03] border-white/5 text-slate-350"
                }`}
              >
                {renderMessageContent(msg.text)}

                {msg.isSimulated && (
                  <div className="mt-2.5 rounded bg-amber-500/5 border border-amber-500/10 p-1.5 text-[10px] text-amber-400 font-mono">
                    ⚠️ Running in local simulation mode. Configure GEMINI_API_KEY for dynamic live models.
                  </div>
                )}
              </div>
              <span className="mt-1 block text-[9px] text-slate-500 text-right px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-950/40 border border-white/5 text-cyan-400 backdrop-blur-sm">
              <RefreshCw className="h-4.5 w-4.5 animate-spin" />
            </div>
            <div className="rounded-xl border border-white/5 bg-white/[0.015] px-4 py-3 text-xs text-slate-400 backdrop-blur-sm">
              <p className="italic animate-pulse flex items-center gap-1.5 font-display">
                Gemini reasoning over BigQuery schemas & IoT counters...
              </p>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggested Prompts Grid */}
      {messages.length === 1 && (
        <div className="border-t border-white/5 bg-slate-950/20 p-3 backdrop-blur-sm">
          <p className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1 font-display">
            <HelpCircle className="h-3 w-3" /> Quick Query Suggestions
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            {quickPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt)}
                className="rounded-lg border border-white/5 bg-white/[0.01] px-2.5 py-1.5 text-[10px] font-medium text-slate-300 hover:border-cyan-500/40 hover:bg-white/[0.03] transition-all text-left truncate cursor-pointer"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSend(input);
        }}
        className="border-t border-white/5 bg-slate-950/30 p-3 flex gap-2 backdrop-blur-sm"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Gemini to query data, write SQL, or suggest operations..."
          className="flex-1 rounded-lg glass-input px-3.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 cursor-pointer border border-white/10 shadow-md"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

// src/pages/ai-assistant.jsx
import React, { useState, useEffect, useRef } from 'react';
import { aiAssistantAPI } from '../api/realApi';
import { useAuth } from '../contexts/AuthContext';
import {
  Sparkles,
  Send,
  Bot,
  User,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  DollarSign,
  Package,
  Users,
  Building2,
  Calendar,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Trash2,
  Printer,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';

const PRESET_QUESTIONS = [
  { id: 'top_products', label: '🏆 Which products sell the most?', query: 'Which products sell the most?' },
  { id: 'today_sales', label: '💰 What are my total sales today?', query: 'What are my total sales today?' },
  { id: 'high_debt', label: '⚠️ Which customers owe more than $1,000?', query: 'Which customers owe more than $1,000?' },
  { id: 'total_debt', label: '📊 How much money do customers owe me in total?', query: 'How much money do customers owe me in total?' },
  { id: 'overdue_debt', label: '⏰ Which customers have overdue debts?', query: 'Which customers have overdue debts?' },
  { id: 'profit_month', label: '📈 What is my profit this month?', query: 'What is my profit this month?' },
  { id: 'biggest_exp', label: '💸 What are my biggest expenses?', query: 'What are my biggest expenses?' },
  { id: 'low_stock', label: '📦 Which products are running out of stock?', query: 'Which products are running out of stock?' },
  { id: 'high_margin', label: '💎 Which products generate highest gross profit?', query: 'Which products generate the highest gross profit?' },
  { id: 'branch_best', label: '🏢 Which branch performs best?', query: 'Which branch performs best?' },
  { id: 'compare_months', label: '🔄 Compare sales this month with last month', query: 'Compare sales this month with last month.' },
  { id: 'payments_due', label: '📅 What payments are due soon?', query: 'What payments are due soon?' },
  { id: 'recommendations', label: '💡 What actions should I consider to improve performance?', query: 'What actions should I consider to improve business performance?' }
];

export default function AIAssistant() {
  const { user } = useAuth();
  const [messages, setMessages] = useState(() => {
    const saved = localStorage.getItem('ai_assistant_chat');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [
      {
        id: 'welcome',
        sender: 'ai',
        aiPowered: true,
        text: `Hello ${user?.name || 'Owner'}! I am your **HUDI-AI Business Assistant**, powered by **GPT-4o** and your verified HUDI-SOFT POS database.\n\nI can answer questions about your sales, profits, customer debts, inventory, expenses, and more — using your real, live business records.\n\nClick any quick prompt or ask me anything about your business!`,
        timestamp: new Date().toISOString()
      }
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [insights, setInsights] = useState([]);
  const chatBottomRef = useRef(null);

  // Save chat to localStorage
  useEffect(() => {
    localStorage.setItem('ai_assistant_chat', JSON.stringify(messages));
  }, [messages]);

  // Auto-scroll
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Load Proactive Insights
  useEffect(() => {
    aiAssistantAPI.getInsights()
      .then(res => {
        if (res?.data?.success) setInsights(res.data.data);
      })
      .catch(() => {});
  }, []);

  const handleSend = async (textToSend) => {
    const q = textToSend || inputQuery;
    if (!q || !q.trim() || loading) return;

    const userMessageId = `user-${Date.now()}`;
    const newMessages = [
      ...messages,
      { id: userMessageId, sender: 'user', text: q, timestamp: new Date().toISOString() }
    ];
    setMessages(newMessages);
    setInputQuery('');
    setLoading(true);

    try {
      const res = await aiAssistantAPI.query(q);
      if (res?.data?.success) {
        const payload = res.data.data;
        const aiMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          aiPowered: payload.aiPowered || false,
          text: payload.answer,
          dataPayload: payload.dataPayload,
          suggestedActions: payload.suggestedActions,
          timestamp: payload.timestamp || new Date().toISOString()
        };
        setMessages(prev => [...prev, aiMessage]);
      } else {
        throw new Error(res?.data?.message || 'Failed to process query');
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message || 'Unable to retrieve data';
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: `⚠️ **Security / Permission Error:** ${errMsg}. Please ensure your account has authorized permissions.`,
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (window.confirm('Clear conversation history?')) {
      const welcome = [
        {
          id: 'welcome',
          sender: 'ai',
          aiPowered: true,
          text: `Hello ${user?.name || 'Owner'}! I am your **HUDI-AI Business Assistant**, powered by **GPT-4o** and your live HUDI-SOFT POS data. How can I help you today?`,
          timestamp: new Date().toISOString()
        }
      ];
      setMessages(welcome);
      localStorage.removeItem('ai_assistant_chat');
      toast.success('Conversation reset');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Response copied to clipboard');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col h-full text-slate-900 pb-6">
      {/* ── Top Header ───────────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-[#173860] via-[#1c4779] to-[#255e9e] text-white p-5 border-b border-white/10 shadow-md">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white shadow-lg border border-white/20">
              <Sparkles size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-black tracking-tight text-white">AI Business Assistant</h1>
                <span className="text-[10px] font-black uppercase tracking-wider bg-purple-400/20 text-purple-200 border border-purple-400/30 px-2 py-0.5 rounded-full">
                  ✦ GPT-4o Powered
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 px-2 py-0.5 rounded-full">
                  Verified Data
                </span>
              </div>
              <p className="text-xs text-blue-200 mt-0.5">
                OpenAI GPT-4o understands your questions • Data pulled live from verified MongoDB records • Zero hallucination
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={clearChat}
              className="p-2 bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white rounded-xl transition text-xs flex items-center gap-1.5"
              title="Clear Conversation"
            >
              <Trash2 size={16} />
              <span className="hidden sm:inline">Clear Chat</span>
            </button>
            <button
              onClick={() => window.print()}
              className="p-2 bg-white/10 hover:bg-white/20 text-blue-200 hover:text-white rounded-xl transition text-xs flex items-center gap-1.5"
              title="Print Analysis Report"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Print Report</span>
            </button>
          </div>
        </div>
      </div>

      {/* ── Proactive Insights Banner ────────────────────────────────────────── */}
      {insights.length > 0 && (
        <div className="bg-white border-b border-slate-200 px-6 py-2.5 shadow-xs">
          <div className="max-w-5xl mx-auto flex items-center gap-3 overflow-x-auto scrollbar-none">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1 whitespace-nowrap">
              <Lightbulb size={14} className="text-amber-500" /> Live Highlights:
            </span>
            {insights.map(ins => (
              <div
                key={ins.id}
                className={`text-xs px-3 py-1 rounded-full whitespace-nowrap font-medium flex items-center gap-1.5 ${
                  ins.type === 'alert'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : ins.type === 'warning'
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}
              >
                <strong>{ins.title}:</strong> {ins.message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Suggested Questions Carousel ─────────────────────────────────────── */}
      <div className="bg-slate-100/70 border-b border-slate-200 px-6 py-3">
        <div className="max-w-5xl mx-auto">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1.5">
            Quick Analysis Prompts:
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {PRESET_QUESTIONS.map(p => (
              <button
                key={p.id}
                onClick={() => handleSend(p.query)}
                className="text-xs bg-white hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 border border-slate-200 px-3 py-1.5 rounded-xl whitespace-nowrap font-semibold text-slate-700 transition shadow-xs"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Chat Messages Stream ─────────────────────────────────────────────── */}
      <div className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 overflow-y-auto space-y-5">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            {/* Avatar */}
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white font-bold text-xs'
                  : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white'
              }`}
            >
              {msg.sender === 'user' ? (
                user?.name ? user.name.slice(0, 2).toUpperCase() : <User size={18} />
              ) : (
                <Bot size={20} />
              )}
            </div>

            {/* Bubble */}
            <div className={`max-w-[85%] sm:max-w-3xl space-y-3 ${msg.sender === 'user' ? 'text-right' : ''}`}>
              <div
                className={`p-4 sm:p-5 rounded-2xl shadow-xs text-xs sm:text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white font-medium rounded-tr-xs'
                    : 'bg-white border border-slate-200 text-slate-800 rounded-tl-xs'
                }`}
              >
                {/* Formatted Text with simple markdown recognition */}
                <div className="space-y-2 whitespace-pre-line">
                  {msg.text.split('\n\n').map((paragraph, pIdx) => {
                    // Simple replacement of bold tags
                    const parts = paragraph.split(/(\*\*.*?\*\*)/g);
                    return (
                      <p key={pIdx}>
                        {parts.map((part, i) => {
                          if (part.startsWith('**') && part.endsWith('**')) {
                            return <strong key={i} className="font-black text-slate-900">{part.slice(2, -2)}</strong>;
                          }
                          return part;
                        })}
                      </p>
                    );
                  })}
                </div>

                {/* Structured Data Table if present */}
                {msg.dataPayload?.type === 'table' && (
                  <div className="mt-4 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-600 uppercase font-black tracking-wider border-b border-slate-200">
                        <tr>
                          {msg.dataPayload.headers.map((h, idx) => (
                            <th key={idx} className="py-2 px-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/60 bg-white">
                        {msg.dataPayload.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className={`py-2 px-3 ${cIdx === 0 ? 'font-bold text-slate-900' : 'text-slate-600'}`}>
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Structured Strategic Recommendations if present */}
                {msg.dataPayload?.type === 'recommendations' && (
                  <div className="mt-4 space-y-2.5">
                    {msg.dataPayload.items.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-black text-slate-900">{item.title}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                            item.priority === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.priority} PRIORITY
                          </span>
                        </div>
                        <div className="text-emerald-700 font-bold mb-1">Impact: {item.impact}</div>
                        <p className="text-slate-600 text-[11px] leading-relaxed">{item.detail}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggested Action Chips */}
                {msg.suggestedActions?.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <span className="text-[10px] font-black uppercase text-slate-400 block mb-1.5">
                      Suggested Next Steps:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedActions.map((action, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleSend(action)}
                          className="text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg font-medium transition"
                        >
                          → {action}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Timestamp & Actions */}
              {msg.sender === 'ai' && (
                <div className="flex items-center gap-2 text-[10px] text-slate-400 pl-1 flex-wrap">
                  <span>{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {msg.aiPowered && (
                    <>
                      <span>•</span>
                      <span className="text-purple-500 font-bold flex items-center gap-0.5">
                        <Sparkles size={10} /> GPT-4o
                      </span>
                    </>
                  )}
                  <span>•</span>
                  <button
                    onClick={() => copyToClipboard(msg.text)}
                    className="hover:text-slate-600 flex items-center gap-1"
                  >
                    <Copy size={11} /> Copy
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <Bot size={20} />
            </div>
            <div className="p-4 bg-white border border-slate-200 rounded-2xl rounded-tl-xs shadow-xs text-xs text-slate-500 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Fetching live data from database, then crafting response with <strong className="text-purple-600">GPT-4o</strong>...</span>
            </div>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* ── Input Box ────────────────────────────────────────────────────────── */}
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="bg-white rounded-2xl border border-slate-200 shadow-md p-2 flex items-center gap-2 focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent transition"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask anything about sales, debts, expenses, top products, or recommendations..."
            disabled={loading}
            className="flex-1 px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-40 text-white rounded-xl shadow transition"
          >
            <Send size={16} />
          </button>
        </form>
        <p className="text-[10px] text-center text-slate-400 mt-2">
          Powered by <strong className="text-purple-500">OpenAI GPT-4o</strong> • Data sourced exclusively from your verified POS records • Zero hallucination guaranteed
        </p>
      </div>
    </div>
  );
}

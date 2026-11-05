'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sparkles, Send, Bot, User, RefreshCw, Lightbulb, TrendingUp,
  DollarSign, Package, Calendar, ShieldCheck, HelpCircle
} from 'lucide-react'
import api from '@/lib/api'

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  category?: string
  timestamp: string
}

const QUICK_PROMPTS = [
  'What is our total revenue and outstanding patient balances?',
  'How many appointments are scheduled today?',
  'Which dental treatments are in high demand?',
  'Which materials and medications are low in stock?',
  'Give me an executive practice operations overview.'
]

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `### 👋 Welcome to HUDI-AI Practice Operations Assistant!\nI am your real-time clinic operations intelligence co-pilot. I analyze your live practice database to summarize revenue, chair schedules, procedure volumes, and medical inventory.\n\n*Click any quick question below or type your inquiry:*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ])
  const [inputQuery, setInputQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSendQuery = async (queryText?: string) => {
    const q = (queryText || inputQuery).trim()
    if (!q || loading) return

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }

    setMessages(prev => [...prev, userMsg])
    if (!queryText) setInputQuery('')
    setLoading(true)

    try {
      const { data } = await api.post('/dental-ai/query', { query: q })
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: data?.data?.answer || 'Analysis complete.',
        category: data?.data?.category,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, aiMsg])
    } catch (err: any) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'assistant',
        text: `⚠️ **Operational Error:** ${err.response?.data?.message || 'Unable to connect to intelligence engine. Please check permissions.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
      setMessages(prev => [...prev, errorMsg])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] space-y-4">
      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-blue-600/20">
            <Sparkles size={22} />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
              HUDI-AI Dental Practice Assistant
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                Live Data Connected
              </span>
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Zero-hallucination operational summaries, revenue tracking, and clinical recommendations
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMessages(messages.slice(0, 1))}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-xl"
          title="Clear Conversation"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 overflow-y-auto space-y-4 shadow-xs">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              msg.sender === 'user'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-gradient-to-tr from-purple-600 to-indigo-600 text-white shadow-sm'
            }`}>
              {msg.sender === 'user' ? <User size={18} /> : <Bot size={18} />}
            </div>

            <div className={`max-w-[75%] rounded-3xl p-4 text-xs leading-relaxed space-y-2 ${
              msg.sender === 'user'
                ? 'bg-blue-600 text-white rounded-tr-xs'
                : 'bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-xs'
            }`}>
              <div className="whitespace-pre-line font-medium">{msg.text}</div>
              <span className={`text-[9px] block ${msg.sender === 'user' ? 'text-blue-200 text-right' : 'text-slate-400'}`}>
                {msg.timestamp}
              </span>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm animate-pulse">
              <Sparkles size={18} />
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-3xl rounded-tl-xs border border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex items-center gap-2">
              <RefreshCw className="animate-spin text-blue-600" size={14} />
              <span>Analyzing live database records...</span>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompts Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1 shrink-0">
          <Lightbulb size={12} className="text-amber-500" /> Prompts:
        </span>
        {QUICK_PROMPTS.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendQuery(prompt)}
            className="px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-blue-400 hover:text-blue-600 transition-all shadow-2xs"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <form
        onSubmit={e => { e.preventDefault(); handleSendQuery(); }}
        className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xs"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={e => setInputQuery(e.target.value)}
          placeholder="Ask HUDI-AI about revenue, patient trends, chair occupancy, or inventory..."
          className="flex-1 px-4 py-2 bg-transparent text-xs outline-hidden text-slate-900 dark:text-white font-medium"
        />
        <button
          type="submit"
          disabled={loading || !inputQuery.trim()}
          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all"
        >
          <span>Analyze</span>
          <Send size={14} />
        </button>
      </form>
    </div>
  )
}


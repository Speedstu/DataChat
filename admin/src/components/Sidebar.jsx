import React, { useEffect } from 'react'
import { 
  MessageSquare, 
  Database, 
  Plus, 
  Search,
  Trash2,
  Clock,
  Sparkles,
  Globe
} from 'lucide-react'

const API_URL = '/api'

export default function Sidebar({ currentPage, setCurrentPage, conversations, setConversations, activeConversation, setActiveConversation, onNewChat, lang, setLang }) {
  
  useEffect(() => {
    fetch(`${API_URL}/conversations`)
      .then(r => r.json())
      .then(data => setConversations(data))
      .catch(() => {})
  }, [])

  return (
    <div className="w-64 bg-dc-surface border-r border-dc-border flex flex-col h-full">
      <div className="p-4 border-b border-dc-border">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-dc-accent rounded-lg flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-dc-text">DataChat</h1>
            <p className="text-[10px] text-dc-muted">AI Database Assistant</p>
          </div>
        </div>
      </div>

      <div className="p-3">
        <button
          onClick={() => { setCurrentPage('chat'); onNewChat(); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-dc-card border border-dc-border rounded-lg hover:border-dc-accent/50 transition-colors text-sm"
        >
          <Plus className="w-4 h-4 text-dc-accent" />
          <span>New Chat</span>
        </button>
      </div>

      <div className="px-3 space-y-1">
        <button
          onClick={() => setCurrentPage('chat')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            currentPage === 'chat' ? 'bg-dc-accent/10 text-dc-accent' : 'text-dc-muted hover:bg-dc-card hover:text-dc-text'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          <span>Chat</span>
        </button>
        <button
          onClick={() => setCurrentPage('databases')}
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
            currentPage === 'databases' ? 'bg-dc-accent/10 text-dc-accent' : 'text-dc-muted hover:bg-dc-card hover:text-dc-text'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Databases</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto mt-4 px-3">
        <p className="text-[10px] uppercase tracking-wider text-dc-dim font-medium px-3 mb-2">Recent</p>
        <div className="space-y-0.5">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => { setActiveConversation(conv.id); setCurrentPage('chat'); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors text-left truncate ${
                activeConversation === conv.id ? 'bg-dc-card text-dc-text' : 'text-dc-muted hover:bg-dc-card/50 hover:text-dc-text'
              }`}
            >
              <Clock className="w-3 h-3 flex-shrink-0 opacity-50" />
              <span className="truncate">{conv.title}</span>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="text-xs text-dc-dim px-3 py-4 text-center">No conversations yet</p>
          )}
        </div>
      </div>

      <div className="p-3 border-t border-dc-border space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Globe className="w-3.5 h-3.5 text-dc-dim" />
          <span className="text-[10px] text-dc-dim">{lang === 'fr' ? 'Langue' : 'Language'}</span>
          <div className="ml-auto flex items-center bg-dc-card border border-dc-border rounded-lg overflow-hidden">
            <button onClick={() => setLang('fr')} className={`px-2.5 py-1 text-[10px] font-bold transition-colors ${lang === 'fr' ? 'bg-dc-accent/20 text-dc-accent' : 'text-dc-dim hover:text-dc-muted'}`}>FR</button>
            <button onClick={() => setLang('en')} className={`px-2.5 py-1 text-[10px] font-bold transition-colors ${lang === 'en' ? 'bg-dc-accent/20 text-dc-accent' : 'text-dc-dim hover:text-dc-muted'}`}>EN</button>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-6 h-6 bg-dc-accent/20 rounded-full flex items-center justify-center">
            <span className="text-[10px] font-medium text-dc-accent">U</span>
          </div>
          <span className="text-xs text-dc-muted">Local User</span>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useRef, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { 
  Send, Database, Clock, Table2, ChevronDown, ChevronUp,
  Copy, Search, Sparkles, Loader2, ArrowDown, Brain, Globe,
  User, Mail, Phone, MapPin, ExternalLink, Shield, Fingerprint, Link2
} from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = '/api'

function DataTable({ data }) {
  if (!data || !data.rows || data.rows.length === 0) return null
  
  const [expanded, setExpanded] = useState(false)
  const displayRows = expanded ? data.rows : data.rows.slice(0, 10)
  const cols = data.columns || Object.keys(data.rows[0] || {})

  return (
    <div className="mt-2 border border-dc-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 bg-dc-surface border-b border-dc-border">
        <div className="flex items-center gap-2">
          <Table2 className="w-3 h-3 text-dc-dim" />
          <span className="text-[10px] text-dc-dim">{data.count || data.rows.length} result{(data.count || data.rows.length) > 1 ? 's' : ''}</span>
        </div>
        <button onClick={() => {
          const text = data.rows.map(r => Object.values(r).join('\t')).join('\n')
          navigator.clipboard.writeText(text)
          toast.success('Copied')
        }} className="flex items-center gap-1 text-[10px] text-dc-dim hover:text-dc-muted">
          <Copy className="w-3 h-3" /> Copy
        </button>
      </div>
      <div className="overflow-x-auto max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-dc-surface sticky top-0">
            <tr>
              {cols.map(col => (
                <th key={col} className="px-3 py-2 text-left text-[10px] font-medium text-dc-dim uppercase tracking-wider whitespace-nowrap">
                  {col.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dc-border">
            {displayRows.map((row, i) => (
              <tr key={i} className="hover:bg-dc-surface/50">
                {cols.map(col => (
                  <td key={col} className="px-3 py-1.5 text-dc-text whitespace-nowrap max-w-[200px] truncate">
                    {row[col] || ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.rows.length > 10 && (
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-dc-dim hover:text-dc-muted border-t border-dc-border">
          {expanded ? <><ChevronUp className="w-3 h-3" /> Show less</> : <><ChevronDown className="w-3 h-3" /> Show all {data.rows.length}</>}
        </button>
      )}
    </div>
  )
}

function SQLBlock({ sql }) {
  if (!sql) return null
  return (
    <div className="mt-2">
      <div className="flex items-center gap-1.5 mb-1 px-1">
        <Database className="w-3 h-3 text-dc-green" />
        <span className="text-[10px] uppercase tracking-wider text-dc-dim font-medium">SQL Query</span>
      </div>
      <pre className="bg-dc-bg border border-dc-border rounded-lg px-3 py-2 text-xs font-mono text-dc-green overflow-x-auto">
        {sql}
      </pre>
    </div>
  )
}

function OsintPanel({ osint }) {
  if (!osint) return null
  const emailInfo = osint.email_info || {}
  const phoneInfo = osint.phone_info || {}
  const socialProfiles = osint.social_profiles || []
  const googleResults = osint.google_results || {}
  const breaches = osint.breaches || []
  const pagesBlanches = osint.pages_blanches || []
  const stats = osint.stats || {}

  const allGoogleHits = Object.entries(googleResults).flatMap(([cat, results]) => 
    (results || []).map(r => ({...r, category: cat}))
  )

  return (
    <div className="mt-3 space-y-3">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-dc-card border border-dc-border rounded-xl">
        <div className="flex items-center gap-1.5 text-xs">
          <Search className="w-3 h-3 text-blue-400" />
          <span className="text-dc-muted">Google:</span>
          <strong className="text-dc-text">{stats.google_hits || 0}</strong>
        </div>
        <div className="w-px h-3 bg-dc-border" />
        <div className="flex items-center gap-1.5 text-xs">
          <Globe className="w-3 h-3 text-green-400" />
          <span className="text-dc-muted">Profiles:</span>
          <strong className="text-green-400">{stats.social_found || 0}</strong>
          <span className="text-dc-dim">/ {stats.social_checked || 0}</span>
        </div>
        <div className="w-px h-3 bg-dc-border" />
        <div className="flex items-center gap-1.5 text-xs">
          <Shield className="w-3 h-3 text-red-400" />
          <span className="text-dc-muted">Breaches:</span>
          <strong className={stats.breaches > 0 ? 'text-red-400' : 'text-dc-text'}>{stats.breaches || 0}</strong>
        </div>
        <div className="w-px h-3 bg-dc-border" />
        <div className="flex items-center gap-1.5 text-xs">
          <Clock className="w-3 h-3 text-dc-dim" />
          <span className="text-dc-muted">{osint.scan_time}s</span>
        </div>
      </div>

      <div className="bg-gradient-to-br from-dc-accent/10 to-purple-500/10 border border-dc-accent/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Fingerprint className="w-4 h-4 text-dc-accent" />
          <span className="text-xs font-semibold text-dc-accent uppercase tracking-wider">OSINT Profile</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {osint.name && (
            <div className="flex items-center gap-2">
              <User className="w-3.5 h-3.5 text-dc-muted" />
              <div><p className="text-[10px] text-dc-dim">Name</p><p className="text-sm font-medium text-dc-text">{osint.name}</p></div>
            </div>
          )}
          {osint.email && (
            <div className="flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-dc-muted" />
              <div><p className="text-[10px] text-dc-dim">Email</p><p className="text-sm font-medium text-dc-text">{osint.email}</p></div>
            </div>
          )}
          {osint.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-dc-muted" />
              <div><p className="text-[10px] text-dc-dim">Phone ({phoneInfo.type || '?'})</p><p className="text-sm font-medium text-dc-text">{osint.phone}</p></div>
            </div>
          )}
          {osint.city && (
            <div className="flex items-center gap-2">
              <MapPin className="w-3.5 h-3.5 text-dc-muted" />
              <div><p className="text-[10px] text-dc-dim">Location</p><p className="text-sm font-medium text-dc-text">{osint.address && `${osint.address}, `}{osint.code_postal} {osint.city}</p></div>
            </div>
          )}
        </div>
        {emailInfo.provider && (
          <div className="mt-3 pt-3 border-t border-dc-border/50 flex items-center gap-4 text-xs text-dc-muted flex-wrap">
            <span>Provider: <strong className="text-dc-text">{emailInfo.provider}</strong></span>
            <span>Username: <strong className="text-dc-text">{emailInfo.username || osint.username}</strong></span>
            <span>Type: <strong className="text-dc-text">{emailInfo.is_personal ? 'Personal' : 'Professional'}</strong></span>
          </div>
        )}
      </div>

      {socialProfiles.length > 0 && (
        <div className="bg-dc-card border border-dc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Globe className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">Verified Social Profiles</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {socialProfiles.map((p, i) => (
              <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-colors text-xs ${
                  p.exists ? 'bg-green-500/10 border-green-500/30 hover:border-green-400' :
                  p.exists === false ? 'bg-dc-surface border-dc-border opacity-50' :
                  'bg-dc-surface border-dc-border hover:border-dc-dim'
                }`}>
                <div className={`w-2 h-2 rounded-full ${
                  p.exists ? 'bg-green-400' : p.exists === false ? 'bg-red-400/50' : 'bg-yellow-400/50'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-dc-text font-medium">{p.platform}</p>
                  <p className="text-[9px] text-dc-dim truncate">@{p.username}</p>
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded ${
                  p.exists ? 'bg-green-500/20 text-green-400' : 
                  p.exists === false ? 'bg-red-500/10 text-red-400/50' : 
                  'bg-yellow-500/10 text-yellow-400/50'
                }`}>
                  {p.exists ? 'FOUND' : p.exists === false ? '404' : '?'}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {breaches.length > 0 && (
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-red-400" />
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">Data Breaches ({breaches.length})</span>
          </div>
          <div className="space-y-2">
            {breaches.map((b, i) => (
              <div key={i} className="flex items-start gap-2 px-3 py-2 bg-dc-surface border border-dc-border rounded-lg text-xs">
                <Shield className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-dc-text font-medium">{b.name}</p>
                  {b.date && <p className="text-[9px] text-dc-dim">Date: {b.date}</p>}
                  {b.data_types && <p className="text-[9px] text-dc-dim truncate">{b.data_types}</p>}
                  {b.domain && b.domain.startsWith('http') && (
                    <a href={b.domain} target="_blank" rel="noopener noreferrer" className="text-[9px] text-blue-400 hover:underline truncate block">{b.domain}</a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {allGoogleHits.length > 0 && (
        <div className="bg-dc-card border border-dc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-yellow-400" />
            <span className="text-xs font-semibold text-yellow-400 uppercase tracking-wider">Google Results ({allGoogleHits.length})</span>
          </div>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {allGoogleHits.slice(0, 15).map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2 px-3 py-2 bg-dc-surface border border-dc-border rounded-lg hover:border-yellow-400/20 transition-colors text-xs group">
                <ExternalLink className="w-3 h-3 text-dc-dim mt-0.5 flex-shrink-0 group-hover:text-yellow-400" />
                <div className="min-w-0">
                  <p className="text-dc-text font-medium truncate group-hover:text-yellow-400">{r.title}</p>
                  {r.snippet && <p className="text-[9px] text-dc-dim line-clamp-2">{r.snippet}</p>}
                  <p className="text-[9px] text-dc-accent/50 truncate">{r.url}</p>
                </div>
                <span className="text-[8px] px-1.5 py-0.5 bg-dc-border rounded text-dc-dim flex-shrink-0">{r.category.replace('_', ' ')}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {pagesBlanches.length > 0 && (
        <div className="bg-dc-card border border-dc-border rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <User className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">Pages Blanches ({pagesBlanches.length})</span>
          </div>
          <div className="space-y-2">
            {pagesBlanches.map((p, i) => (
              <div key={i} className="px-3 py-2 bg-dc-surface border border-dc-border rounded-lg text-xs">
                <p className="text-dc-text font-medium">{p.name}</p>
                {p.address && <p className="text-dc-dim">{p.address}</p>}
                {p.phone && <p className="text-dc-muted">{p.phone}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {osint.city && (
        <a href={`https://www.google.com/maps/search/${encodeURIComponent((osint.address || '') + ' ' + (osint.code_postal || '') + ' ' + osint.city + ' France')}`} 
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 bg-dc-card border border-dc-border rounded-xl hover:border-green-400/30 transition-colors text-xs text-dc-muted">
          <MapPin className="w-3.5 h-3.5 text-green-400" />
          <span>Google Maps: <strong className="text-dc-text">{osint.address && `${osint.address}, `}{osint.code_postal} {osint.city}</strong></span>
          <ExternalLink className="w-3 h-3 ml-auto" />
        </a>
      )}
    </div>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  
  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      {!isUser && (
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${message.osint ? 'bg-purple-500/20' : 'bg-dc-accent/20'}`}>
          {message.osint ? <Fingerprint className="w-3.5 h-3.5 text-purple-400" /> : <Sparkles className="w-3.5 h-3.5 text-dc-accent" />}
        </div>
      )}
      <div className={`max-w-[80%] ${isUser ? 'order-1' : ''}`}>
        <div className={`rounded-2xl px-4 py-3 ${
          isUser 
            ? 'bg-dc-accent text-white rounded-br-md' 
            : 'bg-dc-card border border-dc-border rounded-bl-md'
        }`}>
          {isUser ? (
            <p className="text-sm">{message.content}</p>
          ) : (
            <div className="markdown-body text-sm">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
        </div>
        {message.sql && <SQLBlock sql={message.sql} />}
        {message.osint && <OsintPanel osint={message.osint} />}
        {message.results && <DataTable data={message.results} />}
        {message.time && (
          <div className="flex items-center gap-1 mt-1 px-1">
            <Clock className="w-2.5 h-2.5 text-dc-dim" />
            <span className="text-[10px] text-dc-dim">{message.time}s</span>
            {message.database && (
              <>
                <span className="text-[10px] text-dc-dim">&bull;</span>
                <Database className="w-2.5 h-2.5 text-dc-dim" />
                <span className="text-[10px] text-dc-dim">{message.database}</span>
              </>
            )}
            {message.osint && (
              <>
                <span className="text-[10px] text-dc-dim">&bull;</span>
                <Brain className="w-2.5 h-2.5 text-purple-400" />
                <span className="text-[10px] text-purple-400">OSINT</span>
              </>
            )}
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-lg bg-dc-accent flex items-center justify-center flex-shrink-0 mt-0.5">
          <span className="text-xs font-semibold text-white">U</span>
        </div>
      )}
    </div>
  )
}

export default function ChatPage({ activeConversation, setActiveConversation, conversations, setConversations, lang }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [databases, setDatabases] = useState([])
  const [aiMode, setAiMode] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const t = {
    en: {
      title: 'DataChat',
      subtitle: 'Ask questions in natural language. I search your databases and summarize the results.',
      dbConnected: (n) => `${n} database${n > 1 ? 's' : ''} connected`,
      noDb: 'No databases imported',
      noDbSub: 'Go to Databases to import your files',
      placeholder: 'Ask your question...',
      searching: 'Searching...',
      osintSearching: 'OSINT analysis in progress...',
      aiMode: 'AI OSINT Mode',
      aiDesc: 'Profile + social media + Google dorks + Ollama',
      footer: 'DataChat searches your local databases. Data never leaves your machine.',
      suggestions: ['Search for JOHN DOE', 'How many people in Paris?', 'Find john.doe@gmail.com', 'List people in Lyon'],
      error: 'Connection error. Make sure the backend is running on port 8000.'
    },
    fr: {
      title: 'DataChat',
      subtitle: 'Posez vos questions en langage naturel. Je cherche dans vos bases de donn\u00e9es et vous r\u00e9sume les r\u00e9sultats.',
      dbConnected: (n) => `${n} base${n > 1 ? 's' : ''} connect\u00e9e${n > 1 ? 's' : ''}`,
      noDb: 'Aucune base import\u00e9e',
      noDbSub: 'Allez dans Databases pour importer vos fichiers',
      placeholder: 'Posez votre question...',
      searching: 'Recherche en cours...',
      osintSearching: 'Analyse OSINT en cours...',
      aiMode: 'Mode IA OSINT',
      aiDesc: 'Profil + r\u00e9seaux sociaux + Google dorks + Ollama',
      footer: 'DataChat recherche dans vos bases de donn\u00e9es locales. Les donn\u00e9es ne quittent jamais votre machine.',
      suggestions: ['Cherche JOHN DOE', 'Combien de personnes \u00e0 Paris ?', 'Trouve john.doe@gmail.com', 'Liste les personnes \u00e0 Lyon'],
      error: 'Erreur de connexion au serveur. V\u00e9rifiez que le backend est lanc\u00e9 sur le port 8000.'
    }
  }[lang]

  useEffect(() => {
    fetch(`${API_URL}/databases`)
      .then(r => r.json())
      .then(setDatabases)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (activeConversation) {
      fetch(`${API_URL}/conversations/${activeConversation}/messages`)
        .then(r => r.json())
        .then(msgs => {
          setMessages(msgs.map(m => ({
            role: m.role,
            content: m.content,
            sql: m.sql_query,
            results_count: m.results_count
          })))
        })
        .catch(() => {})
    } else {
      setMessages([])
    }
  }, [activeConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    if (!input.trim() || loading) return
    
    const userMsg = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setLoading(true)

    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMsg, 
          conversation_id: activeConversation,
          ai_mode: aiMode
        })
      })
      const data = await res.json()
      
      if (!activeConversation && data.conversation_id) {
        setActiveConversation(data.conversation_id)
        setConversations(prev => [{
          id: data.conversation_id,
          title: userMsg.substring(0, 50),
          created_at: new Date().toISOString()
        }, ...prev])
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        sql: data.sql,
        results: data.results,
        time: data.time,
        database: data.database,
        osint: data.osint
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: t.error
      }])
    }
    
    setLoading(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const suggestions = t.suggestions

  return (
    <div className="flex-1 flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[60vh]">
              <div className="w-16 h-16 bg-dc-accent/10 rounded-2xl flex items-center justify-center mb-6">
                <Sparkles className="w-8 h-8 text-dc-accent" />
              </div>
              <h2 className="text-2xl font-semibold text-dc-text mb-2">{t.title}</h2>
              <p className="text-dc-muted text-sm mb-8 text-center max-w-md">{t.subtitle}</p>
              
              {databases.length > 0 ? (
                <div className="mb-8">
                  <div className="flex items-center gap-2 mb-3 justify-center">
                    <Database className="w-3.5 h-3.5 text-dc-green" />
                    <span className="text-xs text-dc-muted">{t.dbConnected(databases.length)}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap justify-center">
                    {databases.map(db => (
                      <span key={db.name} className="text-xs bg-dc-card border border-dc-border px-3 py-1.5 rounded-full text-dc-muted">
                        {db.name} <span className="text-dc-dim">({(db.row_count || 0).toLocaleString()} rows)</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mb-8 text-center">
                  <p className="text-xs text-dc-dim mb-2">{t.noDb}</p>
                  <p className="text-xs text-dc-muted">{t.noDbSub}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(s); inputRef.current?.focus() }}
                    className="text-left text-xs px-4 py-3 bg-dc-card border border-dc-border rounded-xl hover:border-dc-accent/30 hover:bg-dc-hover transition-colors text-dc-muted"
                  >
                    <Search className="w-3 h-3 inline mr-1.5 opacity-50" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map((msg, i) => (
                <MessageBubble key={i} message={msg} />
              ))}
              {loading && (
                <div className="flex gap-3 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-dc-accent/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-dc-accent" />
                  </div>
                  <div className="bg-dc-card border border-dc-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 text-dc-accent animate-spin" />
                      <span className="text-sm text-dc-muted">{aiMode ? t.osintSearching : t.searching}</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>
      </div>

      <div className="border-t border-dc-border bg-dc-bg px-4 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setAiMode(!aiMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                aiMode 
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' 
                  : 'bg-dc-card text-dc-muted border border-dc-border hover:border-dc-dim'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              {t.aiMode}
              {aiMode && <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />}
            </button>
            {aiMode && <span className="text-[10px] text-purple-400/70">{t.aiDesc}</span>}
          </div>
          <div className="flex items-end gap-2 bg-dc-card border border-dc-border rounded-2xl px-4 py-3 input-focus-glow transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              rows={1}
              className="flex-1 bg-transparent text-sm text-dc-text placeholder-dc-dim outline-none resize-none max-h-32"
              style={{ minHeight: '24px' }}
              onInput={(e) => {
                e.target.style.height = '24px'
                e.target.style.height = Math.min(e.target.scrollHeight, 128) + 'px'
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className={`p-2 rounded-xl transition-colors ${
                input.trim() && !loading
                  ? 'bg-dc-accent text-white hover:bg-dc-accent2'
                  : 'bg-dc-border text-dc-dim cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-[10px] text-dc-dim text-center mt-2">{t.footer}</p>
        </div>
      </div>
    </div>
  )
}

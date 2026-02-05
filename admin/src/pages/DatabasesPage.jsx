import React, { useState, useEffect } from 'react'
import { 
  Database, 
  HardDrive, 
  Upload, 
  Check, 
  Loader2, 
  FileText, 
  Table2,
  RefreshCw,
  AlertCircle,
  FolderOpen
} from 'lucide-react'
import toast from 'react-hot-toast'

const API_URL = '/api'

export default function DatabasesPage() {
  const [availableFiles, setAvailableFiles] = useState([])
  const [importedDbs, setImportedDbs] = useState([])
  const [importing, setImporting] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [stats, setStats] = useState(null)

  const loadData = () => {
    fetch(`${API_URL}/databases`).then(r => r.json()).then(setImportedDbs).catch(() => {})
    fetch(`${API_URL}/stats`).then(r => r.json()).then(setStats).catch(() => {})
  }

  useEffect(() => { loadData() }, [])

  const scanFiles = async () => {
    setScanning(true)
    try {
      const res = await fetch(`${API_URL}/databases/scan`)
      const data = await res.json()
      setAvailableFiles(data)
    } catch {
      toast.error('Failed to scan databases directory')
    }
    setScanning(false)
  }

  useEffect(() => { scanFiles() }, [])

  const importFile = async (file) => {
    setImporting(file.name)
    const toastId = toast.loading(`Importing ${file.filename}... This may take a while for large files.`)
    
    try {
      const res = await fetch(`${API_URL}/databases/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: file.path, name: file.name })
      })
      const data = await res.json()
      
      if (data.success) {
        toast.success(`Imported ${file.name}: ${data.row_count.toLocaleString()} rows`, { id: toastId })
        loadData()
        scanFiles()
      } else {
        toast.error(`Import failed: ${data.detail || 'Unknown error'}`, { id: toastId })
      }
    } catch (err) {
      toast.error(`Import failed: ${err.message}`, { id: toastId })
    }
    setImporting(null)
  }

  const getFileIcon = (type) => {
    switch(type) {
      case '.json': return '{ }'
      case '.csv': return 'CSV'
      case '.db': case '.sqlite': return 'DB'
      default: return '?'
    }
  }

  const getFileColor = (type) => {
    switch(type) {
      case '.json': return 'text-yellow-400 bg-yellow-400/10'
      case '.csv': return 'text-green-400 bg-green-400/10'
      case '.db': case '.sqlite': return 'text-blue-400 bg-blue-400/10'
      default: return 'text-dc-muted bg-dc-card'
    }
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-semibold text-dc-text">Databases</h1>
            <p className="text-sm text-dc-muted mt-1">Manage and import your data sources</p>
          </div>
          <button
            onClick={scanFiles}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-dc-card border border-dc-border rounded-lg hover:border-dc-accent/50 transition-colors text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${scanning ? 'animate-spin' : ''}`} />
            Scan
          </button>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Databases', value: stats.total_databases, icon: Database, color: 'text-dc-accent' },
              { label: 'Total Records', value: (stats.total_records || 0).toLocaleString(), icon: Table2, color: 'text-dc-green' },
              { label: 'Queries', value: stats.total_queries, icon: FileText, color: 'text-yellow-400' },
              { label: 'Conversations', value: stats.total_conversations, icon: FolderOpen, color: 'text-purple-400' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-dc-card border border-dc-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${color}`} />
                  <span className="text-xs text-dc-muted">{label}</span>
                </div>
                <p className="text-xl font-semibold text-dc-text">{value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Imported Databases */}
        {importedDbs.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-medium text-dc-muted mb-3 flex items-center gap-2">
              <Check className="w-4 h-4 text-dc-green" />
              Imported Databases
            </h2>
            <div className="space-y-3">
              {importedDbs.map(db => (
                <div key={db.name} className="bg-dc-card border border-dc-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-dc-green/10 rounded-lg flex items-center justify-center">
                        <Database className="w-5 h-5 text-dc-green" />
                      </div>
                      <div>
                        <h3 className="font-medium text-dc-text">{db.name}</h3>
                        <p className="text-xs text-dc-muted">{(db.row_count || 0).toLocaleString()} records</p>
                      </div>
                    </div>
                    <span className="text-xs bg-dc-green/10 text-dc-green px-2.5 py-1 rounded-full">Ready</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(db.columns || []).slice(0, 12).map(col => (
                      <span key={col} className="text-[10px] bg-dc-surface border border-dc-border px-2 py-0.5 rounded text-dc-muted font-mono">
                        {col}
                      </span>
                    ))}
                    {(db.columns || []).length > 12 && (
                      <span className="text-[10px] text-dc-dim px-2 py-0.5">+{db.columns.length - 12} more</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Available Files */}
        <div>
          <h2 className="text-sm font-medium text-dc-muted mb-3 flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Available Files (H:\databases)
          </h2>
          
          {availableFiles.length === 0 ? (
            <div className="bg-dc-card border border-dc-border rounded-xl p-8 text-center">
              <AlertCircle className="w-8 h-8 text-dc-dim mx-auto mb-3" />
              <p className="text-sm text-dc-muted">No importable files found</p>
              <p className="text-xs text-dc-dim mt-1">Supported formats: .json, .csv, .db, .sqlite</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableFiles.map(file => (
                <div key={file.filename} className="bg-dc-card border border-dc-border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold ${getFileColor(file.type)}`}>
                      {getFileIcon(file.type)}
                    </div>
                    <div>
                      <h3 className="font-medium text-dc-text text-sm">{file.filename}</h3>
                      <p className="text-xs text-dc-muted">
                        {file.size_mb > 1024 ? `${(file.size_mb / 1024).toFixed(1)} GB` : `${file.size_mb} MB`}
                        {file.type === '.rar' || file.type === '.7z' ? ' (compressed)' : ''}
                      </p>
                    </div>
                  </div>
                  
                  {file.imported ? (
                    <span className="flex items-center gap-1.5 text-xs text-dc-green">
                      <Check className="w-3.5 h-3.5" /> Imported
                    </span>
                  ) : file.type === '.rar' || file.type === '.7z' ? (
                    <span className="text-xs text-dc-dim">Extract first</span>
                  ) : (
                    <button
                      onClick={() => importFile(file)}
                      disabled={importing !== null}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                        importing === file.name
                          ? 'bg-dc-accent/20 text-dc-accent'
                          : 'bg-dc-accent text-white hover:bg-dc-accent2'
                      }`}
                    >
                      {importing === file.name ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                      ) : (
                        <><Upload className="w-4 h-4" /> Import</>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { getAdminDocuments } from "@/lib/api/backend"
import { useDocuments } from "@/hooks/use-documents"
import type { DocumentInfo } from "@/types/document"
import { RefreshCw, Trash2, FileText, Calendar, Layers, HardDrive, Globe } from "lucide-react"

// Cache configuration
const CACHE_KEY_DOCUMENTS = 'admin_documents_cache'

// Cache utility functions
function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  
  try {
    const cached = localStorage.getItem(key)
    if (!cached) return null
    
    const parsed: T = JSON.parse(cached)
    return parsed
  } catch (err) {
    console.error('Error reading cache:', err)
    return null
  }
}

function setCachedData<T>(key: string, data: T): void {
  if (typeof window === 'undefined') return
  
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch (err) {
    console.error('Error writing cache:', err)
  }
}

function clearCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY_DOCUMENTS)
}

export default function DocumentList() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { remove, uploading } = useDocuments()
  const hasLoadedRef = useRef(false)

  const fetchDocs = async (useCache: boolean = true, silent: boolean = false) => {
    // Try to load from cache first on initial load
    if (useCache && !silent) {
      const cachedDocuments = getCachedData<DocumentInfo[]>(CACHE_KEY_DOCUMENTS)
      
      if (cachedDocuments) {
        // Use cached data immediately
        setDocuments(cachedDocuments)
        setLoading(false)
        
        // Fetch fresh data in the background to update cache (silent mode to avoid loading state changes)
        fetchDocs(true, true).catch(err => {
          console.error('Error refreshing cache in background:', err)
        })
        return
      }
    }

    if (!silent) {
      setLoading(true)
    }
    setError(null)
    try {
      const docs = await getAdminDocuments()
      setDocuments(docs || [])
      
      // Update cache after successful fetch
      if (useCache) {
        setCachedData(CACHE_KEY_DOCUMENTS, docs || [])
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(String(err))
      }
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    // Prevent double loading in React Strict Mode
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    fetchDocs()
  }, [])

  // Listen for document upload events to invalidate cache
  useEffect(() => {
    const handleDocumentUploaded = () => {
      clearCache()
      fetchDocs(false, false) // Fetch fresh data without using cache
    }

    window.addEventListener('document-uploaded', handleDocumentUploaded)
    
    return () => {
      window.removeEventListener('document-uploaded', handleDocumentUploaded)
    }
  }, [])

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Delete this document and all its chunks? This cannot be undone.")
    if (!confirmed) return

    setError(null)
    try {
      const res = await remove(id)
      if (res) {
        await fetchDocs()
        
        // Dispatch event to notify analytics to invalidate cache and refresh
        window.dispatchEvent(new CustomEvent('document-deleted'))
      } else {
        setError("Failed to delete document")
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError(String(err))
      }
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "processing":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const isWebsiteUrl = (filename: string): boolean => {
    return filename.startsWith('http://') || filename.startsWith('https://') || filename.includes('(') && filename.includes('http')
  }

  const getSourceIcon = (filename: string) => {
    return isWebsiteUrl(filename) ? Globe : FileText
  }

  const getDisplayName = (filename: string): string => {
    if (isWebsiteUrl(filename)) {
      // Extract URL from format like "Title (https://example.com)"
      const match = filename.match(/\(https?:\/\/[^)]+\)/)
      if (match) {
        return match[0].slice(1, -1) // Remove parentheses
      }
      return filename
    }
    return filename
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? "s" : ""}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            clearCache()
            fetchDocs(false, false)
          }} 
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {error && <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="flex flex-col items-center gap-3">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="text-sm text-muted-foreground">Loading documents...</p>
          </div>
        </div>
      ) : documents.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium">No documents yet</p>
          <p className="text-xs text-muted-foreground">Upload a PDF or add a website URL to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map((doc) => {
            const SourceIcon = getSourceIcon(doc.filename)
            const displayName = getDisplayName(doc.filename)
            const isWebsite = isWebsiteUrl(doc.filename)
            
            return (
            <div
              key={doc.id}
              className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                <SourceIcon className="h-5 w-5 text-primary" />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate" title={displayName}>{displayName}</p>
                    {isWebsite && (
                      <Badge variant="outline" className="mt-1 text-xs">
                        Website
                      </Badge>
                    )}
                  </div>
                  <Badge variant="secondary" className={getStatusColor(doc.status)}>
                    {doc.status}
                  </Badge>
                </div>

                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(doc.uploaded_at).toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3" />
                    {doc.chunks_count} chunks
                  </span>
                  {doc.page_count && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      {doc.page_count} pages
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <HardDrive className="h-3 w-3" />
                    {(doc.file_size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => handleDelete(doc.id)}
                disabled={uploading}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

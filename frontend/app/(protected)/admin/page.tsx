"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { getAdminStats } from "@/lib/api/backend"
import { DocumentUpload } from "@/components/admin/document-upload"
import DocumentList from "@/components/admin/document-list"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, FileText, Upload, BarChart3, Loader2, Cpu } from "lucide-react"
import { ModelManagement } from "@/components/admin/model-management"

interface AdminStats {
  total_documents: number
  total_chunks: number
  total_storage_bytes: number
  collection_name: string
  vectors_count: number
}

// Cache configuration
const CACHE_KEY_ANALYTICS = 'admin_analytics_cache'

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

function clearAnalyticsCache(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(CACHE_KEY_ANALYTICS)
}

function formatStorageSize(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i]
}

export default function AdminPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("documents")
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const prevTabRef = useRef(activeTab)

  const fetchStats = useCallback(async (useCache: boolean = true, silent: boolean = false) => {
    // Try to load from cache first
    if (useCache && !silent) {
      const cachedStats = getCachedData<AdminStats>(CACHE_KEY_ANALYTICS)
      
      if (cachedStats) {
        // Use cached data immediately
        setStats(cachedStats)
        setStatsLoading(false)
        
        // Fetch fresh data in the background to update cache (silent mode to avoid loading state changes)
        fetchStats(true, true).catch(err => {
          console.error('Error refreshing cache in background:', err)
        })
        return
      }
    }

    if (!silent) {
      setStatsLoading(true)
    }
    setStatsError(null)
    try {
      const data = await getAdminStats()
      setStats(data)
      
      // Update cache after successful fetch
      if (useCache) {
        setCachedData(CACHE_KEY_ANALYTICS, data)
      }
    } catch (err) {
      console.error("Error fetching stats:", err)
      setStatsError("Failed to load statistics")
    } finally {
      if (!silent) {
        setStatsLoading(false)
      }
    }
  }, [])

  // Fetch stats when switching to analytics tab
  useEffect(() => {
    // Only fetch when switching TO analytics tab (not already on it)
    if (activeTab === "analytics" && prevTabRef.current !== "analytics" && !statsLoading) {
      fetchStats()
    }
    prevTabRef.current = activeTab
  }, [activeTab, statsLoading, fetchStats])

  // Listen for document upload/delete events to invalidate analytics cache
  useEffect(() => {
    const handleDocumentChange = () => {
      clearAnalyticsCache()
      // Only refresh stats if we're currently on the analytics tab
      if (activeTab === "analytics") {
        fetchStats(false, false) // Fetch fresh data without using cache
      }
    }

    window.addEventListener('document-uploaded', handleDocumentChange)
    window.addEventListener('document-deleted', handleDocumentChange)
    
    return () => {
      window.removeEventListener('document-uploaded', handleDocumentChange)
      window.removeEventListener('document-deleted', handleDocumentChange)
    }
  }, [activeTab, fetchStats])

  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.push("/chat")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user || user.role !== "admin") {
    return null
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/chat")} className="shrink-0">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Manage your knowledge base</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3">
            <TabsTrigger value="documents" className="gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="models" className="gap-2">
              <Cpu className="h-4 w-4" />
              Models
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="documents" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1">
                <Card className="sticky top-24">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Upload className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Upload</CardTitle>
                        <CardDescription className="text-xs">Add new documents</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DocumentUpload />
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Document Library</CardTitle>
                        <CardDescription className="text-xs">Manage uploaded documents</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DocumentList />
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Model Management</CardTitle>
                <CardDescription>Configure which AI models are available to users</CardDescription>
              </CardHeader>
              <CardContent>
                <ModelManagement />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            {statsLoading && !stats && (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
                <p className="text-sm text-muted-foreground">Loading analytics...</p>
              </div>
            )}

            {statsError && (
              <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
                {statsError}
                <Button variant="link" size="sm" onClick={() => fetchStats(false, false)} className="ml-2 p-0 h-auto">
                  Retry
                </Button>
              </div>
            )}

            {(!statsLoading || stats) && (
            <>
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Documents</CardDescription>
                  <CardTitle className="text-3xl">
                    {statsLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      stats?.total_documents ?? "--"
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Documents in knowledge base</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Total Chunks</CardDescription>
                  <CardTitle className="text-3xl">
                    {statsLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : (
                      stats?.total_chunks?.toLocaleString() ?? "--"
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Indexed text segments</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardDescription>Storage Used</CardDescription>
                  <CardTitle className="text-3xl">
                    {statsLoading ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : stats?.total_storage_bytes !== undefined ? (
                      formatStorageSize(stats.total_storage_bytes)
                    ) : (
                      "--"
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-muted-foreground">Total file size</p>
                </CardContent>
              </Card>
            </div>

            {/* <Card>
              <CardHeader>
                <CardTitle>Usage Analytics</CardTitle>
                <CardDescription>Coming soon - track document usage and search patterns</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Analytics dashboard coming soon</p>
                </div>
              </CardContent>
            </Card> */}
            </>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}

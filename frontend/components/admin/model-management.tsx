"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw } from "lucide-react"
import { getOpenRouterModels } from "@/lib/api/backend"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

// Cache configuration
const CACHE_KEY_MODELS = 'admin_models_cache'
const CACHE_KEY_OPENROUTER_MODELS = 'admin_openrouter_models_cache'

interface Model {
  id: string
  model_id: string
  provider: 'gemini' | 'openrouter'
  name: string
  description?: string
  is_free: boolean
  is_active: boolean
}

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
  localStorage.removeItem(CACHE_KEY_MODELS)
  localStorage.removeItem(CACHE_KEY_OPENROUTER_MODELS)
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json',
  }
}

interface OpenRouterModel {
  id: string
  name: string
  description?: string
  pricing?: any
}

export function ModelManagement() {
  const [models, setModels] = useState<Model[]>([])
  const [openRouterModels, setOpenRouterModels] = useState<OpenRouterModel[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingOpenRouter, setLoadingOpenRouter] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openRouterError, setOpenRouterError] = useState<string | null>(null)
  const [togglingModels, setTogglingModels] = useState<Set<string>>(new Set())
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    // Prevent double loading in React Strict Mode
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadAllData()
  }, [])

  const loadAllData = async (useCache: boolean = true) => {
    // Try to load from cache first on initial load
    if (useCache) {
      const cachedModels = getCachedData<Model[]>(CACHE_KEY_MODELS)
      const cachedOpenRouterModels = getCachedData<OpenRouterModel[]>(CACHE_KEY_OPENROUTER_MODELS)
      
      if (cachedModels && cachedOpenRouterModels) {
        // Use cached data immediately
        setModels(cachedModels)
        setOpenRouterModels(cachedOpenRouterModels)
        setLoading(false)
        setLoadingOpenRouter(false)
        
        // Fetch fresh data in the background to update cache (silent mode to avoid loading state changes)
        Promise.all([loadModels(true, true), loadOpenRouterModels(true, true)]).catch(err => {
          console.error('Error refreshing cache in background:', err)
        })
        return
      } else if (cachedModels) {
        // Partial cache - use what we have
        setModels(cachedModels)
        setLoading(false)
      } else if (cachedOpenRouterModels) {
        // Partial cache - use what we have
        setOpenRouterModels(cachedOpenRouterModels)
        setLoadingOpenRouter(false)
      }
    }
    
    // Load fresh data
    await Promise.all([loadModels(useCache), loadOpenRouterModels(useCache)])
  }

  // Clean model name by removing provider prefixes (e.g., "Provider: Model Name" -> "Model Name")
  // Handles generic patterns like "Provider: Model", "Provider - Model", etc.
  const cleanModelName = (name: string): string => {
    // Remove anything before a colon followed by space (e.g., "Provider: Model Name")
    let cleaned = name.replace(/^[^:]+:\s*/, "")
    
    // If no colon pattern found, try removing pattern like "Provider - Model"
    if (cleaned === name) {
      cleaned = name.replace(/^[^-\s]+\s*-\s*/, "")
    }
    
    return cleaned.trim() || name // Return original if cleaning results in empty string
  }

  // Extract provider name from model_id (e.g., "meta-llama/llama-3.2" -> "meta", "mistralai/mistral" -> "mistral")
  const extractProviderName = (modelId: string, provider: string): string => {
    if (provider === 'gemini') {
      return 'gemini'
    }
    // For OpenRouter models, extract provider from model_id
    // Format: "provider/model-name" or "openrouter/provider/model-name"
    const parts = modelId.split('/')
    if (parts.length >= 2) {
      // Skip "openrouter" prefix if present
      let providerPart = parts[0] === 'openrouter' ? parts[1] : parts[0]
      
      // Remove common suffixes like "-ai", "-aii", etc.
      providerPart = providerPart.replace(/-aii?$/, '').replace(/-ai$/, '')
      
      // Normalize provider names
      const normalized = providerPart.toLowerCase()
      if (normalized.includes('meta') || normalized.includes('llama') || normalized === 'meta') return 'meta'
      if (normalized.includes('mistral') || normalized === 'mistral') return 'mistral'
      if (normalized.includes('xai') || normalized.includes('grok') || normalized === 'xai') return 'xai'
      if (normalized.includes('anthropic') || normalized.includes('claude') || normalized === 'anthropic') return 'anthropic'
      if (normalized.includes('google') || normalized === 'google') return 'google'
      if (normalized.includes('openai') || normalized === 'openai') return 'openai'
      if (normalized.includes('cohere') || normalized === 'cohere') return 'cohere'
      if (normalized.includes('perplexity') || normalized === 'perplexity') return 'perplexity'
      
      // Return capitalized first letter
      return providerPart.charAt(0).toUpperCase() + providerPart.slice(1).toLowerCase()
    }
    return 'other'
  }

  const loadModels = async (updateCache: boolean = true, silent: boolean = false) => {
    try {
      if (!silent) {
        setLoading(true)
      }
      setError(null)
      const headers = await getAuthHeaders()
      const response = await fetch(`${BACKEND_URL}/admin/models`, { headers })
      
      if (!response.ok) {
        throw new Error('Failed to load models')
      }
      
      const data = await response.json()
      // Sort models by provider name
      const sortedData = [...data].sort((a, b) => {
        const aProvider = extractProviderName(a.model_id, a.provider)
        const bProvider = extractProviderName(b.model_id, b.provider)
        if (aProvider !== bProvider) {
          return aProvider.localeCompare(bProvider)
        }
        // If same provider, sort by name
        return a.name.localeCompare(b.name)
      })
      setModels(sortedData)
      
      // Update cache after successful fetch
      if (updateCache) {
        setCachedData(CACHE_KEY_MODELS, sortedData)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
      console.error('Error loading models:', err)
    } finally {
      if (!silent) {
        setLoading(false)
      }
    }
  }

  const loadOpenRouterModels = async (updateCache: boolean = true, silent: boolean = false) => {
    try {
      if (!silent) {
        setLoadingOpenRouter(true)
      }
      setOpenRouterError(null)
      const models = await getOpenRouterModels()
      // Sort OpenRouter models by provider name
      const sortedModels = [...models].sort((a, b) => {
        const aProvider = extractProviderName(a.id, 'openrouter')
        const bProvider = extractProviderName(b.id, 'openrouter')
        if (aProvider !== bProvider) {
          return aProvider.localeCompare(bProvider)
        }
        // If same provider, sort by name
        return a.name.localeCompare(b.name)
      })
      setOpenRouterModels(sortedModels)
      
      // Update cache after successful fetch
      if (updateCache) {
        setCachedData(CACHE_KEY_OPENROUTER_MODELS, sortedModels)
      }
      
      if (sortedModels.length === 0) {
        setOpenRouterError("No free models found. Make sure OPENROUTER_API_KEY is configured correctly.")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load OpenRouter models'
      setOpenRouterError(errorMessage)
      console.error('Error loading OpenRouter models:', err)
    } finally {
      if (!silent) {
        setLoadingOpenRouter(false)
      }
    }
  }

  const isModelEnabled = (modelId: string): boolean => {
    return models.some(m => m.model_id === modelId && m.is_active)
  }

  const getModelFromDatabase = (modelId: string): Model | undefined => {
    return models.find(m => m.model_id === modelId)
  }

  const toggleModel = async (openRouterModel: OpenRouterModel, enabled: boolean) => {
    const modelId = openRouterModel.id
    setTogglingModels(prev => new Set(prev).add(modelId))

    try {
      const headers = await getAuthHeaders()
      
      if (enabled) {
        // Add model to database
        const response = await fetch(`${BACKEND_URL}/admin/models`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model_id: openRouterModel.id,
            provider: 'openrouter',
            name: openRouterModel.name,
            description: openRouterModel.description || '',
            is_free: true,
            is_active: true,
          }),
        })
        
        if (!response.ok) {
          throw new Error('Failed to enable model')
        }
      } else {
        // Disable model (set is_active to false or delete)
        const existingModel = getModelFromDatabase(modelId)
        if (existingModel) {
          const response = await fetch(`${BACKEND_URL}/admin/models/${existingModel.id}/toggle`, {
            method: 'PATCH',
            headers,
          })
          
          if (!response.ok) {
            throw new Error('Failed to disable model')
          }
        }
      }
      
      // Reload models to reflect changes
      await loadModels()
    } catch (err) {
      console.error('Error toggling model:', err)
      setError(err instanceof Error ? err.message : 'Failed to toggle model')
    } finally {
      setTogglingModels(prev => {
        const next = new Set(prev)
        next.delete(modelId)
        return next
      })
    }
  }

  const toggleModelActive = async (model: Model) => {
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`${BACKEND_URL}/admin/models/${model.id}/toggle`, {
        method: 'PATCH',
        headers,
      })
      
      if (!response.ok) {
        throw new Error('Failed to toggle model')
      }
      
      await loadModels()
    } catch (err) {
      console.error('Error toggling model:', err)
      setError(err instanceof Error ? err.message : 'Failed to toggle model')
    }
  }

  // Merge and sort all models (database + OpenRouter) by provider
  const getAllModelsSorted = () => {
    // Get set of model_ids that are already in the database
    const databaseModelIds = new Set(models.map(m => m.model_id))
    
    // Convert OpenRouter models to the same format as database models
    // Only include OpenRouter models that are NOT already in the database
    const openRouterModelsFormatted: (Model & { isFromOpenRouter: boolean; openRouterModel?: OpenRouterModel })[] = openRouterModels
      .filter(orm => !databaseModelIds.has(orm.id))
      .map(orm => ({
        id: orm.id,
        model_id: orm.id,
        provider: 'openrouter' as const,
        name: cleanModelName(orm.name),
        description: orm.description,
        is_free: true,
        is_active: false, // OpenRouter models not in database are not enabled
        isFromOpenRouter: true,
        openRouterModel: orm
      }))

    // Merge database models and OpenRouter models (excluding duplicates)
    // Clean model names for database models too
    const allModels = [
      ...models.map(m => ({ ...m, name: cleanModelName(m.name), isFromOpenRouter: false as const })),
      ...openRouterModelsFormatted
    ]

    // Sort by provider name, then by model name
    return allModels.sort((a, b) => {
      const aProvider = extractProviderName(a.model_id, a.provider)
      const bProvider = extractProviderName(b.model_id, b.provider)
      if (aProvider !== bProvider) {
        return aProvider.localeCompare(bProvider)
      }
      // If same provider, sort by name
      return a.name.localeCompare(b.name)
    })
  }

  if (loading || loadingOpenRouter) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading models...</span>
      </div>
    )
  }

  const sortedAllModels = getAllModelsSorted()

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {error}
        </div>
      )}

      {openRouterError && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
          {openRouterError}
          <Button 
            variant="link" 
            size="sm" 
            onClick={() => loadOpenRouterModels(true)} 
            className="ml-2 p-0 h-auto"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="flex items-center justify-end mb-4">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => {
            clearCache()
            loadAllData(false)
          }} 
          disabled={loading || loadingOpenRouter}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg">
        {sortedAllModels.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No models available. Make sure OPENROUTER_API_KEY is configured correctly.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-semibold text-sm">Model Name</th>
                  <th className="text-left p-3 font-semibold text-sm">Provider</th>
                  <th className="text-left p-3 font-semibold text-sm">Free</th>
                  <th className="text-right p-3 font-semibold text-sm">Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedAllModels.map((model) => {
                  const providerName = extractProviderName(model.model_id, model.provider)
                  const isToggling = model.isFromOpenRouter ? togglingModels.has(model.model_id) : false
                  
                  return (
                    <tr key={model.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium">{model.name}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm capitalize">{providerName}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{model.is_free ? 'Yes' : 'No'}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end">
                          {model.isFromOpenRouter ? (
                            isToggling ? (
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                              <Switch
                                checked={model.is_active}
                                onCheckedChange={(checked) => {
                                  const openRouterModel = openRouterModels.find(orm => orm.id === model.model_id)
                                  if (openRouterModel) {
                                    toggleModel(openRouterModel, checked)
                                  }
                                }}
                                disabled={isToggling}
                              />
                            )
                          ) : (
                            <Switch
                              checked={model.is_active}
                              onCheckedChange={() => toggleModelActive(model as Model)}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}


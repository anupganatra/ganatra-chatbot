"use client"

import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Loader2, RefreshCw } from "lucide-react"
import { getOpenRouterModels } from "@/lib/api/backend"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

interface Model {
  id: string
  model_id: string
  provider: 'gemini' | 'openrouter'
  name: string
  description?: string
  is_free: boolean
  is_active: boolean
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

  const loadAllData = async () => {
    await Promise.all([loadModels(), loadOpenRouterModels()])
  }

  const loadModels = async () => {
    try {
      setLoading(true)
      setError(null)
      const headers = await getAuthHeaders()
      const response = await fetch(`${BACKEND_URL}/admin/models`, { headers })
      
      if (!response.ok) {
        throw new Error('Failed to load models')
      }
      
      const data = await response.json()
      setModels(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load models')
      console.error('Error loading models:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadOpenRouterModels = async () => {
    try {
      setLoadingOpenRouter(true)
      setOpenRouterError(null)
      const models = await getOpenRouterModels()
      setOpenRouterModels(models)
      if (models.length === 0) {
        setOpenRouterError("No free models found. Make sure OPENROUTER_API_KEY is configured correctly.")
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load OpenRouter models'
      setOpenRouterError(errorMessage)
      console.error('Error loading OpenRouter models:', err)
    } finally {
      setLoadingOpenRouter(false)
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

  if (loading || loadingOpenRouter) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading models...</span>
      </div>
    )
  }

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
            onClick={loadOpenRouterModels} 
            className="ml-2 p-0 h-auto"
          >
            Retry
          </Button>
        </div>
      )}

      <div className="flex items-center justify-end mb-4">
        <Button variant="outline" size="sm" onClick={loadAllData} disabled={loading || loadingOpenRouter}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="border rounded-lg">
        {openRouterModels.length === 0 && models.filter(m => m.provider === 'gemini').length === 0 ? (
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
                {/* Gemini models first */}
                {models
                  .filter(m => m.provider === 'gemini')
                  .map((model) => (
                    <tr key={model.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium">{model.name}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm capitalize">{model.provider}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">{model.is_free ? 'Yes' : 'No'}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end">
                          <Switch
                            checked={model.is_active}
                            onCheckedChange={() => toggleModelActive(model)}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                
                {/* OpenRouter models */}
                {openRouterModels.map((openRouterModel) => {
                  const isEnabled = isModelEnabled(openRouterModel.id)
                  const isToggling = togglingModels.has(openRouterModel.id)
                  
                  return (
                    <tr key={openRouterModel.id} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium">{openRouterModel.name}</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">OpenRouter</div>
                      </td>
                      <td className="p-3">
                        <div className="text-sm">Yes</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-end">
                          {isToggling ? (
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : (
                            <Switch
                              checked={isEnabled}
                              onCheckedChange={(checked) => toggleModel(openRouterModel, checked)}
                              disabled={isToggling}
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


"use client"

import { useEffect, useState, useRef } from "react"
import { Check, ChevronDown, ChevronRight } from "lucide-react"
import { Model, UserModelPreference } from "@/types/chat"
import { getAvailableModels, getUserModelPreference, setUserModelPreference } from "@/lib/api/backend"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface ModelSelectorProps {
  onModelChange?: (modelId: string) => void
  className?: string
}

export function ModelSelector({ onModelChange, className }: ModelSelectorProps) {
  const [models, setModels] = useState<Model[]>([])
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)
  const [selectedModel, setSelectedModel] = useState<Model | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [moreModelsOpen, setMoreModelsOpen] = useState(false)
  const hasLoadedRef = useRef(false)

  useEffect(() => {
    // Prevent double loading in React Strict Mode
    if (hasLoadedRef.current) return
    hasLoadedRef.current = true
    loadModels()
  }, [])

  const loadModels = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load available models and user preference in parallel
      const [availableModels, userPreference] = await Promise.all([
        getAvailableModels(),
        getUserModelPreference().catch(() => ({ model_id: null }))
      ])
      
      // Clean model names (remove "(free)" suffix and provider prefixes like "xAI: ", "OpenRouter: ", etc.)
      const cleanedModels = availableModels.map(model => ({
        ...model,
        name: model.name
          .replace(/\s*\(free\)\s*$/i, "") // Remove "(free)" suffix
          .replace(/^(xAI|OpenRouter|Anthropic|Google|Meta|Mistral|Cohere|Perplexity):\s*/i, "") // Remove provider prefixes
          .trim()
      }))
      
      // Sort models: Gemini first, then selected model, then others
      const sortedModels = sortModels(cleanedModels, userPreference.model_id || null)
      setModels(sortedModels)
      
      // Set selected model from user preference, or first model if no preference
      let modelId: string | null = null
      if (userPreference.model_id) {
        modelId = userPreference.model_id
      } else if (cleanedModels.length > 0) {
        modelId = cleanedModels[0].model_id
      }
      
      if (modelId) {
        setSelectedModelId(modelId)
        const model = cleanedModels.find(m => m.model_id === modelId)
        if (model) {
          setSelectedModel(model)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load models")
      console.error("Error loading models:", err)
    } finally {
      setLoading(false)
    }
  }

  const sortModels = (modelsToSort: Model[], selectedId: string | null) => {
    return [...modelsToSort].sort((a, b) => {
      const aIsGemini = a.provider === 'gemini'
      const bIsGemini = b.provider === 'gemini'
      const aIsSelected = a.model_id === selectedId
      const bIsSelected = b.model_id === selectedId
      
      // 1. Gemini models first
      if (aIsGemini && !bIsGemini) return -1
      if (!aIsGemini && bIsGemini) return 1
      
      // 2. If both are Gemini, maintain order
      if (aIsGemini && bIsGemini) return 0
      
      // 3. If neither is Gemini, selected model comes next (after Gemini models)
      if (!aIsGemini && !bIsGemini) {
        if (aIsSelected && !bIsSelected) return -1
        if (!aIsSelected && bIsSelected) return 1
      }
      
      // 4. Otherwise maintain original order
      return 0
    })
  }

  const handleModelSelect = async (modelId: string) => {
    if (modelId === selectedModelId) {
      setOpen(false)
      setMoreModelsOpen(false)
      return
    }

    try {
      await setUserModelPreference(modelId)
      setSelectedModelId(modelId)
      const model = models.find(m => m.model_id === modelId)
      if (model) {
        setSelectedModel(model)
      }
      // Re-sort models with new selection
      setModels(prevModels => sortModels(prevModels, modelId))
      onModelChange?.(modelId)
      setOpen(false)
      setMoreModelsOpen(false)
    } catch (err) {
      console.error("Error setting model preference:", err)
      setError(err instanceof Error ? err.message : "Failed to set model preference")
    }
  }

  const firstThreeModels = models.slice(0, 3)
  const remainingModels = models.slice(3)
  const hasMoreModels = models.length > 3

  if (loading) {
    return (
      <Button variant="outline" disabled className={cn("h-9", className)}>
        Loading...
      </Button>
    )
  }

  if (error || models.length === 0) {
    return (
      <Button variant="outline" disabled className={cn("h-9", className)}>
        No models
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-1 h-8 px-0 text-sm text-muted-foreground hover:text-foreground transition-colors",
            className
          )}
        >
          <span className="truncate max-w-[120px]">{selectedModel?.name || "Select model"}</span>
          <ChevronDown className="h-4 w-4 opacity-50 flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end" side="bottom" sideOffset={8}>
        <div className="max-h-[400px] overflow-y-auto">
          {firstThreeModels.map((model) => {
            const isSelected = model.model_id === selectedModelId
            
            return (
              <button
                key={model.id}
                onClick={() => handleModelSelect(model.model_id)}
                className={cn(
                  "w-full flex items-center justify-between p-3 transition-colors",
                  "hover:bg-muted/50 focus:outline-none",
                  isSelected && "bg-muted"
                )}
                type="button"
              >
                <div className="flex-1 text-left">
                  <div className="text-sm text-foreground">{model.name}</div>
                </div>
                {isSelected && (
                  <Check className="h-5 w-5 text-primary ml-3 flex-shrink-0" />
                )}
              </button>
            )
          })}
          {hasMoreModels && (
            <Popover open={moreModelsOpen} onOpenChange={setMoreModelsOpen}>
              <PopoverTrigger asChild>
                <button
                  className="w-full flex items-center justify-between p-3 transition-colors hover:bg-muted/50 focus:outline-none border-t"
                  type="button"
                >
                  <div className="flex-1 text-left">
                    <div className="text-sm text-foreground">More models</div>
                  </div>
                  <ChevronRight className="h-4 w-4 opacity-50 ml-3 flex-shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-0" align="start" side="right" sideOffset={8}>
                <div className="max-h-[400px] overflow-y-auto">
                  {remainingModels.map((model) => {
                    const isSelected = model.model_id === selectedModelId
                    
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleModelSelect(model.model_id)}
                        className={cn(
                          "w-full flex items-center justify-between p-3 transition-colors",
                          "hover:bg-muted/50 focus:outline-none",
                          isSelected && "bg-muted"
                        )}
                        type="button"
                      >
                        <div className="flex-1 text-left">
                          <div className="text-sm text-foreground">{model.name}</div>
                        </div>
                        {isSelected && (
                          <Check className="h-5 w-5 text-primary ml-3 flex-shrink-0" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}


import { ChatRequest, ChatResponse, Model, UserModelPreference } from '@/types/chat'
import { DocumentUploadResponse, DocumentDeleteResponse } from '@/types/document'

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000'

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

export async function sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
  const headers = await getAuthHeaders()
  
  const response = await fetch(`${BACKEND_URL}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to send message')
  }

  return response.json()
}

export async function sendChatMessageStream(
  request: ChatRequest,
  onChunk: (chunk: string) => void
): Promise<void> {
  let hasReceivedContent = false
  const headers = await getAuthHeaders()
  
  const response = await fetch(`${BACKEND_URL}/chat/stream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ ...request, stream: true }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to stream message')
  }

  const reader = response.body?.getReader()
  const decoder = new TextDecoder()

  if (!reader) {
    throw new Error('No response body')
  }

  let buffer = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || '' // Keep incomplete line in buffer

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.content !== undefined) {
            onChunk(data.content)
            if (data.content) {
              hasReceivedContent = true
            }
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }
  
  // Process any remaining buffer
  if (buffer.trim() && buffer.startsWith('data: ')) {
    try {
      const data = JSON.parse(buffer.slice(6))
      if (data.content !== undefined) {
        onChunk(data.content)
        if (data.content) {
          hasReceivedContent = true
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  }
  
  // If no content was received, there might be an issue
  if (!hasReceivedContent) {
    console.warn('Stream completed but no content was received')
  }
}

export async function uploadDocument(file: File): Promise<DocumentUploadResponse> {
  const { createClient } = await import('@/lib/supabase/client')
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    throw new Error('Not authenticated')
  }

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`${BACKEND_URL}/documents/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to upload document')
  }

  return response.json()
}

export async function uploadWebsite(url: string): Promise<DocumentUploadResponse> {
  const headers = await getAuthHeaders()
  
  const response = await fetch(`${BACKEND_URL}/documents/upload-url`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ url }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to upload website')
  }

  return response.json()
}

export async function deleteDocument(documentId: string): Promise<DocumentDeleteResponse> {
  const headers = await getAuthHeaders()
  
  const response = await fetch(`${BACKEND_URL}/documents/${documentId}`, {
    method: 'DELETE',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to delete document')
  }

  return response.json()
}

export async function getAdminStats() {
  const headers = await getAuthHeaders()
  
  const response = await fetch(`${BACKEND_URL}/admin/stats`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get stats')
  }

  return response.json()
}

export async function getAdminDocuments(offset = 0, limit = 100) {
  const headers = await getAuthHeaders()

  const response = await fetch(`${BACKEND_URL}/admin/documents?offset=${offset}&limit=${limit}`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get documents')
  }

  return response.json()
}

// Model-related API functions
export async function getAvailableModels(): Promise<Model[]> {
  const headers = await getAuthHeaders()

  const response = await fetch(`${BACKEND_URL}/models`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get available models')
  }

  return response.json()
}

export async function getUserModelPreference(): Promise<UserModelPreference> {
  const headers = await getAuthHeaders()

  const response = await fetch(`${BACKEND_URL}/models/user/preference`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get user model preference')
  }

  return response.json()
}

export async function setUserModelPreference(modelId: string): Promise<{ message: string; model_id: string }> {
  const headers = await getAuthHeaders()

  const response = await fetch(`${BACKEND_URL}/models/user/preference?model_id=${encodeURIComponent(modelId)}`, {
    method: 'POST',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to set user model preference')
  }

  return response.json()
}

export async function getOpenRouterModels() {
  const headers = await getAuthHeaders()

  const response = await fetch(`${BACKEND_URL}/models/openrouter`, {
    method: 'GET',
    headers,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.detail || 'Failed to get OpenRouter models')
  }

  return response.json()
}


import { ChatRequest, ChatResponse } from '@/types/chat'
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

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.content) {
            onChunk(data.content)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
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


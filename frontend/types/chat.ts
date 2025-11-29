export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  sources?: ChatSource[]
}

export interface ChatSource {
  filename: string
  chunk_index: number
  score: number
}

export interface ChatRequest {
  message: string
  conversation_id?: string
  stream?: boolean
  model_id?: string
}

export interface ChatResponse {
  response: string
  conversation_id?: string
  sources?: ChatSource[]
  similarity_scores?: number[]
}

export interface Conversation {
  id: string
  user_id: string
  title: string
  created_at: string
  updated_at: string
}

export interface ChatHistoryItem {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export interface Model {
  id: string
  model_id: string
  provider: 'gemini' | 'openrouter'
  name: string
  description?: string
  is_free: boolean
}

export interface UserModelPreference {
  model_id?: string
  name?: string
  description?: string
  provider?: 'gemini' | 'openrouter'
  is_free?: boolean
}


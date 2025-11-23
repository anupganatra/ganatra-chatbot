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
}

export interface ChatResponse {
  response: string
  conversation_id?: string
  sources?: ChatSource[]
  similarity_scores?: number[]
}


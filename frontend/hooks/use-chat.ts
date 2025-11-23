'use client'

import { useState, useCallback } from 'react'
import { sendChatMessage, sendChatMessageStream } from '@/lib/api/backend'
import { ChatMessage, ChatRequest } from '@/types/chat'

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>()

  const sendMessage = useCallback(async (content: string, stream: boolean = true) => {
    if (!content.trim()) return

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setLoading(true)

    try {
      const request: ChatRequest = {
        message: content,
        conversation_id: conversationId,
        stream
      }

      if (stream) {
        let assistantContent = ''
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date()
        }

        setMessages(prev => [...prev, assistantMessage])

        await sendChatMessageStream(request, (chunk: string) => {
          assistantContent += chunk
          setMessages(prev => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage.role === 'assistant') {
              lastMessage.content = assistantContent
            }
            return [...newMessages]
          })
        })
      } else {
        const response = await sendChatMessage(request)
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          sources: response.sources
        }

        setMessages(prev => [...prev, assistantMessage])
        
        if (response.conversation_id) {
          setConversationId(response.conversation_id)
        }
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Failed to send message'}`,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }, [conversationId])

  const clearMessages = useCallback(() => {
    setMessages([])
    setConversationId(undefined)
  }, [])

  return {
    messages,
    loading,
    sendMessage,
    clearMessages
  }
}


'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { sendChatMessage, sendChatMessageStream } from '@/lib/api/backend'
import { ChatMessage, ChatRequest } from '@/types/chat'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from './use-auth'
import { useChatHistory } from './use-chat-history'

export function useChat(initialConversationId?: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [conversationId, setConversationId] = useState<string | undefined>(initialConversationId)
  const isSendingRef = useRef(false)
  const currentConvIdRef = useRef<string | undefined>(initialConversationId)
  const { user } = useAuth()
  const { createConversation, generateTitleFromMessage } = useChatHistory()
  const supabase = useMemo(() => createClient(), [])

  // Track conversationId in ref to avoid stale closures
  useEffect(() => {
    currentConvIdRef.current = conversationId
  }, [conversationId])

  // Load messages when initialConversationId changes (user navigates via URL)
  useEffect(() => {
    // Don't load if we're in the middle of sending a message
    if (isSendingRef.current) {
      return
    }

    const loadMessages = async () => {
      // If no conversation ID in URL, clear messages (new chat)
      if (!initialConversationId) {
        // Clear state for new chat - this handles clicking "New Chat"
        setMessages([])
        setConversationId(undefined)
        currentConvIdRef.current = undefined
        return
      }

      // If same conversation and we have messages, don't reload
      if (initialConversationId === currentConvIdRef.current && messages.length > 0) {
        return
      }

      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', initialConversationId)
          .order('created_at', { ascending: true })

        if (error) throw error

        if (data && Array.isArray(data)) {
          const loadedMessages: ChatMessage[] = data
            .filter((msg) => msg && msg.role && msg.content)
            .map((msg) => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content,
              timestamp: new Date(msg.created_at),
              sources: msg.sources as ChatMessage['sources'],
            }))
          setMessages(loadedMessages)
          setConversationId(initialConversationId)
          currentConvIdRef.current = initialConversationId
        }
      } catch (error) {
        console.error('Error loading messages:', error)
      }
    }

    loadMessages()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialConversationId, user?.id])

  const saveMessage = useCallback(async (
    convId: string,
    role: 'user' | 'assistant',
    content: string,
    sources?: ChatMessage['sources']
  ) => {
    if (!user?.id) return

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          role,
          content,
          sources: sources && sources.length > 0 ? sources : null,
        })

      if (error) throw error
    } catch (error) {
      console.error('Error saving message:', error)
    }
  }, [user?.id, supabase])

  const sendMessage = useCallback(async (content: string, modelId?: string, stream: boolean = true) => {
    if (!content.trim() || isSendingRef.current) return

    isSendingRef.current = true
    let currentConvId = conversationId

    // Create conversation if this is the first message
    if (!currentConvId) {
      const title = generateTitleFromMessage(content)
      const newConvId = await createConversation(title)
      if (newConvId) {
        currentConvId = newConvId
        setConversationId(newConvId)
        currentConvIdRef.current = newConvId
        // Signal sidebar to refresh - createConversation already fetches in its own instance
        // but sidebar has a different instance, so dispatch an event
        window.dispatchEvent(new CustomEvent('conversation-created'))
      } else {
        console.error('Failed to create conversation')
        isSendingRef.current = false
        return
      }
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    
    // Save user message
    if (currentConvId) {
      await saveMessage(currentConvId, 'user', content)
    }

    setLoading(true)

    try {
      const request: ChatRequest = {
        message: content,
        conversation_id: currentConvId,
        stream,
        model_id: modelId
      }

      if (stream) {
        let assistantContent = ''
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: '',
          timestamp: new Date()
        }

        // Add empty assistant message for streaming
        setMessages(prev => [...prev, assistantMessage])

        // Stream the response
        await sendChatMessageStream(request, (chunk: string) => {
          assistantContent += chunk
          setMessages(prev => {
            const newMessages = [...prev]
            const lastMessage = newMessages[newMessages.length - 1]
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = assistantContent
            }
            return [...newMessages]
          })
        })

        // Save assistant message after streaming
        if (currentConvId && assistantContent) {
          await saveMessage(currentConvId, 'assistant', assistantContent)
        }
      } else {
        const response = await sendChatMessage(request)
        
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date(),
          sources: response.sources
        }

        setMessages(prev => [...prev, assistantMessage])
        
        if (currentConvId) {
          await saveMessage(currentConvId, 'assistant', response.response, response.sources)
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
      isSendingRef.current = false
    }
  }, [conversationId, createConversation, generateTitleFromMessage, saveMessage])

  const clearMessages = useCallback(() => {
    if (!isSendingRef.current) {
      setMessages([])
      setConversationId(undefined)
      currentConvIdRef.current = undefined
    }
  }, [])

  const loadConversation = useCallback((convId: string) => {
    setConversationId(convId)
    currentConvIdRef.current = convId
  }, [])

  return {
    messages,
    loading,
    conversationId,
    sendMessage,
    clearMessages,
    loadConversation
  }
}

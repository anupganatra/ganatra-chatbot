'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatHistoryItem } from '@/types/chat'
import { useAuth } from './use-auth'

export function useChatHistory() {
  const [conversations, setConversations] = useState<ChatHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])

  const fetchConversations = useCallback(async () => {
    if (!user?.id) {
      setConversations([])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('id, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(50)

      if (error) throw error

      setConversations(data || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
      setConversations([])
    } finally {
      setLoading(false)
    }
  }, [user?.id, supabase])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const createConversation = useCallback(async (title: string): Promise<string | null> => {
    if (!user?.id) return null

    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: title.trim() || 'New Chat',
        })
        .select('id')
        .single()

      if (error) throw error

      // Refresh conversations list
      await fetchConversations()

      return data.id
    } catch (error) {
      console.error('Error creating conversation:', error)
      return null
    }
  }, [user?.id, supabase, fetchConversations])

  const updateConversationTitle = useCallback(async (conversationId: string, title: string): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ 
          title: title.trim() || 'New Chat',
          updated_at: new Date().toISOString()
        })
        .eq('id', conversationId)
        .eq('user_id', user.id)

      if (error) throw error

      // Refresh conversations list
      await fetchConversations()

      return true
    } catch (error) {
      console.error('Error updating conversation title:', error)
      return false
    }
  }, [user?.id, supabase, fetchConversations])

  const deleteConversation = useCallback(async (conversationId: string): Promise<boolean> => {
    if (!user?.id) return false

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', user.id)

      if (error) throw error

      // Refresh conversations list
      await fetchConversations()

      return true
    } catch (error) {
      console.error('Error deleting conversation:', error)
      return false
    }
  }, [user?.id, supabase, fetchConversations])

  const generateTitleFromMessage = useCallback((message: string): string => {
    // Truncate to 50 characters, removing leading/trailing whitespace
    const trimmed = message.trim()
    if (trimmed.length <= 50) return trimmed
    return trimmed.substring(0, 47) + '...'
  }, [])

  return {
    conversations,
    loading,
    createConversation,
    updateConversationTitle,
    deleteConversation,
    generateTitleFromMessage,
    refreshConversations: fetchConversations,
  }
}


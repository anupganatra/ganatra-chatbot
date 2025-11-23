'use client'

import { useEffect, useRef } from 'react'
import { ChatMessage } from './chat-message'
import { ChatInput } from './chat-input'
import { ChatMessage as ChatMessageType } from '@/types/chat'
import { Card } from '@/components/ui/card'

interface ChatWindowProps {
  messages: ChatMessageType[]
  onSend: (message: string) => void
  loading?: boolean
}

export function ChatWindow({ messages, onSend, loading }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  return (
    <Card className="flex flex-col h-[600px]">
      <div className="flex-1 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Start a conversation by sending a message</p>
          </div>
        ) : (
          <>
            {messages.map((message, idx) => (
              <ChatMessage key={idx} message={message} />
            ))}
            {loading && (
              <div className="flex justify-start mb-4">
                <Card className="bg-muted max-w-[80%]">
                  <div className="p-4">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-foreground rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      <ChatInput onSend={onSend} disabled={loading} />
    </Card>
  )
}


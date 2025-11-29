"use client"

import { useEffect, useRef, useState } from "react"
import { ChatMessage } from "./chat-message"
import { ChatInput } from "./chat-input"
import { GreetingHeader } from "./greeting-header"
import { ModelSelector } from "./model-selector"
import type { ChatMessage as ChatMessageType } from "@/types/chat"

interface ChatWindowProps {
  messages: ChatMessageType[]
  onSend: (message: string, modelId?: string) => void
  loading?: boolean
  userName?: string // added userName prop for greeting
}

export function ChatWindow({ messages, onSend, loading, userName }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleModelChange = (modelId: string) => {
    setSelectedModelId(modelId)
  }

  const handleSend = (message: string) => {
    onSend(message, selectedModelId || undefined)
  }

  const hasMessages = messages.length > 0

  return (
    <div className="flex flex-col flex-1 gap-4">
      {hasMessages ? (
        <>
          <div className="flex-1 overflow-y-auto space-y-4 pt-4">
            {messages.map((message, idx) => (
              <ChatMessage key={idx} message={message} />
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-3">
                  <div className="flex gap-1">
                    <div
                      className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
                      style={{ animationDelay: "0ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
                      style={{ animationDelay: "150ms" }}
                    />
                    <div
                      className="w-2 h-2 bg-foreground/50 rounded-full animate-bounce"
                      style={{ animationDelay: "300ms" }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <div className="pb-4">
            <ChatInput 
              onSend={handleSend} 
              disabled={loading}
              modelSelector={<ModelSelector onModelChange={handleModelChange} />}
            />
          </div>
        </>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center">
          <GreetingHeader userName={userName} />
          <div className="w-full max-w-2xl px-4">
            <ChatInput 
              onSend={handleSend} 
              disabled={loading}
              modelSelector={<ModelSelector onModelChange={handleModelChange} />}
            />
          </div>
        </div>
      )}
    </div>
  )
}

"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useChat } from "@/hooks/use-chat"
import { ChatWindow } from "@/components/chat/chat-window"

export default function ChatPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const conversationId = searchParams.get("conversation_id") || undefined
  const { messages, loading: chatLoading, sendMessage } = useChat(conversationId)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 container mx-auto px-4 max-w-3xl flex flex-col">
        <ChatWindow
          messages={messages}
          onSend={sendMessage}
          loading={chatLoading}
          userName={user?.fullName || user?.email || undefined}
        />
      </main>
    </div>
  )
}

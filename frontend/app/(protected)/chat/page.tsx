"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useChat } from "@/hooks/use-chat"
import { ChatWindow } from "@/components/chat/chat-window"

export default function ChatPage() {
  const { user, loading } = useAuth()
  const { messages, loading: chatLoading, sendMessage } = useChat()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex-1 flex flex-col">
      <main className="flex-1 container mx-auto px-4 max-w-3xl flex flex-col">
        <ChatWindow messages={messages} onSend={sendMessage} loading={chatLoading} userName={user.email || undefined} />
      </main>
    </div>
  )
}

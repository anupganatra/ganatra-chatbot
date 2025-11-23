'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/use-auth'
import { useChat } from '@/hooks/use-chat'
import { ChatWindow } from '@/components/chat/chat-window'
import { Button } from '@/components/ui/button'
import { LogOut, Settings } from 'lucide-react'

export default function ChatPage() {
  const { user, loading, signOut } = useAuth()
  const { messages, loading: chatLoading, sendMessage, clearMessages } = useChat()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
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
    <div className="min-h-screen flex flex-col">
      <header className="border-b p-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">AI Chatbot</h1>
        <div className="flex gap-2 items-center">
          <span className="text-sm text-muted-foreground">{user.email}</span>
          {user.role === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/admin')}
            >
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 max-w-4xl">
        <ChatWindow
          messages={messages}
          onSend={sendMessage}
          loading={chatLoading}
        />
      </main>
    </div>
  )
}


"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { useChatHistory } from "@/hooks/use-chat-history"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Search, Plus, Trash2, X, MessageSquare } from "lucide-react"

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffMins < 1) return "Just now"
  if (diffMins < 60) return `Last message ${diffMins} minute${diffMins === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `Last message ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`
  if (diffDays < 7) return `Last message ${diffDays} day${diffDays === 1 ? "" : "s"} ago`
  return `Last message ${date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
}

export default function ChatsPage() {
  const router = useRouter()
  const { conversations, loading, deleteConversation } = useChatHistory()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations
    const query = searchQuery.toLowerCase()
    return conversations.filter((conv) => conv.title.toLowerCase().includes(query))
  }, [conversations, searchQuery])

  const handleNewChat = () => {
    router.push("/chat")
  }

  const handleChatClick = (conversationId: string) => {
    if (selectMode) {
      setSelectedIds((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(conversationId)) {
          newSet.delete(conversationId)
        } else {
          newSet.add(conversationId)
        }
        return newSet
      })
    } else {
      router.push(`/chat?conversation_id=${conversationId}`)
    }
  }

  const handleToggleSelectMode = () => {
    if (selectMode) {
      setSelectMode(false)
      setSelectedIds(new Set())
    } else {
      setSelectMode(true)
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0) return
    if (
      confirm(`Are you sure you want to delete ${selectedIds.size} conversation${selectedIds.size > 1 ? "s" : ""}?`)
    ) {
      for (const id of selectedIds) {
        await deleteConversation(id)
      }
      // Dispatch event to update sidebar recents
      window.dispatchEvent(new CustomEvent("conversation-deleted"))
      setSelectedIds(new Set())
      setSelectMode(false)
    }
  }

  const handleSelectAll = () => {
    if (selectedIds.size === filteredConversations.length) {
      // All selected, deselect all
      setSelectedIds(new Set())
    } else {
      // Select all
      setSelectedIds(new Set(filteredConversations.map((c) => c.id)))
    }
  }

  const handleCancelSelect = () => {
    setSelectMode(false)
    setSelectedIds(new Set())
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold tracking-tight">Chats</h1>
          <Button onClick={handleNewChat} className="gap-2">
            <Plus className="h-4 w-4" />
            New chat
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search your chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        {selectMode ? (
          <div className="flex items-center gap-3 mb-4 text-sm text-muted-foreground pl-3">
            {/* Select All Checkbox */}
            <Checkbox
              checked={selectedIds.size === filteredConversations.length && filteredConversations.length > 0}
              onCheckedChange={handleSelectAll}
              className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />

            <span>{selectedIds.size} selected</span>

            {/* Delete icon */}
            <button
              onClick={handleDeleteSelected}
              className="p-1 hover:bg-muted rounded transition-colors text-destructive hover:text-destructive"
              title="Delete selected"
              disabled={selectedIds.size === 0}
            >
              <Trash2 className="h-4 w-4" />
            </button>

            {/* X button to cancel - pushed to the right */}
            <button
              onClick={handleCancelSelect}
              className="ml-auto p-1 hover:bg-muted rounded transition-colors"
              title="Cancel selection"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4" />
            <span>
              {filteredConversations.length} chat{filteredConversations.length !== 1 ? "s" : ""}
            </span>
            <button onClick={handleToggleSelectMode} className="text-primary hover:underline font-medium">
              Select
            </button>
          </div>
        )}

        {/* Divider */}
        <div className="border-t mb-2" />

        {/* Chat List */}
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto mb-3" />
            Loading chats...
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            {searchQuery ? "No chats match your search" : "No conversations yet. Start a new chat!"}
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                onClick={() => handleChatClick(conversation.id)}
                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedIds.has(conversation.id) ? "bg-blue-50 dark:bg-blue-950/30" : "hover:bg-muted/50"
                }`}
              >
                {selectMode && (
                  <Checkbox
                    checked={selectedIds.has(conversation.id)}
                    onCheckedChange={() => handleChatClick(conversation.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">{conversation.title}</h3>
                  <p className="text-sm text-muted-foreground">{formatRelativeTime(conversation.updated_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
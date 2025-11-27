"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import { useChatHistory } from "@/hooks/use-chat-history"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { MessageSquare, Plus, ChevronsUpDown, Settings, Shield, LogOut, Trash2, Pencil, MoreHorizontal } from "lucide-react"
import { SidebarToggleButton } from "./sidebar-toggle-button"
import { Input } from "@/components/ui/input"

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  if (dateOnly.getTime() === today.getTime()) {
    return "Today"
  } else if (dateOnly.getTime() === yesterday.getTime()) {
    return "Yesterday"
  } else {
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }
}

function ChatHistoryItem({ 
  conversation, 
  isActive, 
  onSelect, 
  onDelete, 
  onUpdateTitle 
}: { 
  conversation: { id: string; title: string; updated_at: string }
  isActive: boolean
  onSelect: () => void
  onDelete: () => void
  onUpdateTitle: (title: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(conversation.title)
  const [isHovered, setIsHovered] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Update editTitle when conversation title changes
  useEffect(() => {
    if (!isEditing) {
      setEditTitle(conversation.title)
    }
  }, [conversation.title, isEditing])

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  const handleSave = () => {
    if (editTitle.trim()) {
      onUpdateTitle(editTitle.trim())
    } else {
      setEditTitle(conversation.title)
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSave()
    } else if (e.key === "Escape") {
      setEditTitle(conversation.title)
      setIsEditing(false)
    }
  }

  return (
    <SidebarMenuItem
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="group relative"
    >
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <SidebarMenuButton
            tooltip={conversation.title}
            className={`w-full justify-start gap-3 py-2 text-muted-foreground hover:text-foreground ${isActive ? "bg-accent text-foreground" : ""}`}
            onClick={onSelect}
            onDoubleClick={() => setIsEditing(true)}
          >
            {isEditing ? (
              <Input
                ref={inputRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSave}
                onKeyDown={handleKeyDown}
                className="h-8 text-sm"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span 
                className={`text-sm flex-1 ${
                  isActive
                    ? 'overflow-hidden whitespace-nowrap'
                    : 'truncate'
                }`}
                style={{
                  maxWidth: isActive
                    ? 'calc(100% - 2.5rem)' 
                    : undefined
                }}
              >
                {conversation.title}
              </span>
            )}
          </SidebarMenuButton>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => setIsEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Rename</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={onDelete} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            <span>Delete</span>
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
      
      {/* Three-dot menu button - visible on hover or when active */}
      {!isEditing && (isHovered || isActive || dropdownOpen) && (
        <div 
          className="absolute right-2 top-1/2 -translate-y-1/2 z-10"
          onMouseEnter={() => {
            setIsHovered(true)
          }}
          onMouseLeave={(e) => {
            // Only hide if dropdown is not open and we're not moving to the dropdown content
            if (!dropdownOpen && !e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsHovered(false)
            }
          }}
          onMouseDown={(e) => {
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.stopPropagation()
          }}
        >
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1.5 rounded-md hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onMouseDown={(e) => {
                  e.stopPropagation()
                }}
                onClick={(e) => {
                  e.stopPropagation()
                }}
                aria-label="Conversation options"
              >
                <MoreHorizontal className="h-4 w-4 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-40"
              onMouseEnter={() => {
                setIsHovered(true)
              }}
              onMouseLeave={() => {
                if (!dropdownOpen) {
                  setIsHovered(false)
                }
              }}
            >
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault()
                  setDropdownOpen(false)
                  setIsEditing(true)
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                <span>Rename</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onSelect={(e) => {
                  e.preventDefault()
                  setDropdownOpen(false)
                  onDelete()
                }}
                className="text-destructive focus:text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                <span>Delete</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </SidebarMenuItem>
  )
}

export function AppSidebar() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { conversations, loading: historyLoading, deleteConversation, updateConversationTitle, refreshConversations } = useChatHistory()
  const currentConversationId = searchParams.get("conversation_id")

  // Refresh conversations when conversation_id changes in URL
  useEffect(() => {
    // Refresh when navigating to a specific conversation
    if (currentConversationId) {
      refreshConversations()
    }
  }, [currentConversationId, refreshConversations])

  // Listen for conversation-created event to refresh sidebar
  useEffect(() => {
    const handleConversationCreated = () => {
      refreshConversations()
    }
    
    window.addEventListener('conversation-created', handleConversationCreated)
    return () => {
      window.removeEventListener('conversation-created', handleConversationCreated)
    }
  }, [refreshConversations])

  const userInitial = user?.email?.charAt(0).toUpperCase() || "A"
  const userName = user?.email?.split("@")[0] || "User"
  const userEmail = user?.email || "demo@example.com"
  const isAdmin = user?.role === "admin"

  const handleSettings = () => {
    router.push("/settings")
  }

  const handleAdmin = () => {
    router.push("/admin")
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const handleNewChat = () => {
    router.push("/chat")
  }

  const handleConversationSelect = (conversationId: string) => {
    router.push(`/chat?conversation_id=${conversationId}`)
  }

  const handleDeleteConversation = async (conversationId: string) => {
    if (confirm("Are you sure you want to delete this conversation?")) {
      await deleteConversation(conversationId)
      // If we're viewing this conversation, redirect to new chat
      if (currentConversationId === conversationId) {
        router.push("/chat")
      }
    }
  }

  const handleUpdateTitle = async (conversationId: string, title: string) => {
    await updateConversationTitle(conversationId, title)
  }

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-3">
        <h1 className="text-xl font-semibold tracking-tight">Ganatra</h1>
        <SidebarToggleButton />
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="w-full justify-start gap-3 py-2"
              onClick={handleNewChat}
            >
              <Plus className="h-5 w-5 text-primary" />
              <span className="font-medium">New chat</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton className="w-full justify-start gap-3 py-2">
              <MessageSquare className="h-5 w-5" />
              <span>Chats</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>

        <SidebarGroup className="mt-4">
          <SidebarGroupLabel className="px-2 text-xs font-medium text-muted-foreground">Recents</SidebarGroupLabel>
          <SidebarGroupContent>
            {historyLoading ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">Loading...</div>
            ) : conversations.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground">No conversations yet</div>
            ) : (
              <SidebarMenu>
                {conversations.map((conversation) => (
                  <ChatHistoryItem
                    key={conversation.id}
                    conversation={conversation}
                    isActive={currentConversationId === conversation.id}
                    onSelect={() => handleConversationSelect(conversation.id)}
                    onDelete={() => handleDeleteConversation(conversation.id)}
                    onUpdateTitle={(title) => handleUpdateTitle(conversation.id, title)}
                  />
                ))}
              </SidebarMenu>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" className="w-full justify-start gap-3 py-2 hover:bg-accent">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
                <span className="text-sm font-semibold">{userInitial}</span>
              </div>
              <div className="flex flex-1 flex-col items-start text-left text-sm">
                <span className="font-medium truncate">{userName}</span>
                <span className="text-xs text-muted-foreground truncate">{userEmail}</span>
              </div>
              <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSettings} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem onClick={handleAdmin} className="cursor-pointer">
                <Shield className="mr-2 h-4 w-4" />
                <span>Admin</span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

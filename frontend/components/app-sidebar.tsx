"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
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
import { MessageSquare, Plus, ChevronsUpDown, Settings, Shield, LogOut } from "lucide-react"
import { SidebarToggleButton } from "./sidebar-toggle-button"

// Example chat history - in a real app, this would come from your database
const chatHistory = [
  { id: "1", title: "How to build a sidebar", date: "Today" },
  { id: "2", title: "React best practices", date: "Today" },
  { id: "3", title: "Tailwind CSS tips", date: "Yesterday" },
  { id: "4", title: "Next.js routing", date: "Yesterday" },
]

export function AppSidebar() {
  const { user, signOut } = useAuth()
  const router = useRouter()

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

  return (
    <Sidebar collapsible="offcanvas" className="border-r">
      <SidebarHeader className="flex flex-row items-center justify-between px-4 py-3">
        <h1 className="text-xl font-semibold tracking-tight">AI Chatbot</h1>
        <SidebarToggleButton />
      </SidebarHeader>

      <SidebarContent className="px-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              className="w-full justify-start gap-3 py-2"
              onClick={() => {
                // Create new chat
              }}
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
            <SidebarMenu>
              {chatHistory.map((chat) => (
                <SidebarMenuItem key={chat.id}>
                  <SidebarMenuButton
                    tooltip={chat.title}
                    className="w-full justify-start gap-3 py-2 text-muted-foreground hover:text-foreground"
                  >
                    <span className="truncate text-sm">{chat.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
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
              <span className="ml-auto text-xs text-muted-foreground">⌘+,</span>
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

"use client"

import { Plus, MessageSquare, Settings, LogOut, ShieldCheck } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarToggleButton } from "./sidebar-toggle-button"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"

export function SidebarCollapsedToolbar() {
  const { state, isMobile, openMobile } = useSidebar()
  const { user } = useAuth()
  const router = useRouter()

  // Only show when sidebar is collapsed (not on mobile)
  const isCollapsed = !isMobile && state === "collapsed"
  const isVisible = isCollapsed && !openMobile

  if (!isVisible) return null

  const userInitial = user?.email?.charAt(0).toUpperCase() || "A"
  const userEmail = user?.email || "demo@example.com"

  const handleSignOut = async () => {
    const supabase = createClient()
    if (supabase) {
      await supabase.auth.signOut()
    }
    router.push("/login")
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="fixed left-0 top-0 z-40 flex h-full w-14 flex-col items-center bg-sidebar py-3">
        <SidebarToggleButton />

        <div className="mt-4 flex flex-col items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg text-primary hover:bg-primary/10">
                <Plus className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">New chat</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent"
              >
                <MessageSquare className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Chats</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent"
              >
              </Button>
            </TooltipTrigger>
          </Tooltip>
        </div>

        <div className="flex-1" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90"
            >
              <span className="text-sm font-semibold">{userInitial}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="end" className="w-56 mb-2">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium truncate">{userEmail}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
              <span className="ml-auto text-xs text-muted-foreground">⌘+,</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin")}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Admin
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}

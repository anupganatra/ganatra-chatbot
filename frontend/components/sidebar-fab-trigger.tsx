"use client"

import { PanelLeftClose, PanelLeft } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function SidebarFabTrigger() {
  const { toggleSidebar, state, isMobile, openMobile } = useSidebar()

  // Determine if sidebar is currently visible
  const isOpen = isMobile ? openMobile : state === "expanded"

  return (
    <Button
      onClick={toggleSidebar}
      size="icon"
      variant="outline"
      className={cn(
        // Base styles - round FAB
        "fixed bottom-6 left-6 z-50",
        "h-12 w-12 rounded-full",
        "shadow-lg hover:shadow-xl",
        "transition-all duration-200",
        "bg-background hover:bg-accent",
        "border-2",
        // Move button when sidebar is open on desktop
        !isMobile && state === "expanded" && "left-[calc(16rem+1.5rem)]",
      )}
      aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
    >
      {isOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
    </Button>
  )
}

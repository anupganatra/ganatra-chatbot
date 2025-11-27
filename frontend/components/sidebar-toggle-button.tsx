"use client"

import { PanelLeft, PanelLeftClose } from "lucide-react"
import { useSidebar } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"

interface SidebarToggleButtonProps {
  className?: string
}

export function SidebarToggleButton({ className }: SidebarToggleButtonProps) {
  const { toggleSidebar, state, isMobile, openMobile } = useSidebar()

  const isOpen = isMobile ? openMobile : state === "expanded"

  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={toggleSidebar}
            variant="ghost"
            size="icon"
            className={className ?? "h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent"}
            aria-label={isOpen ? "Close sidebar" : "Open sidebar"}
          >
            {isOpen ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">
          {isOpen ? "Close sidebar" : "Open sidebar"} <kbd className="ml-1 text-xs opacity-60">Ctrl+.</kbd>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

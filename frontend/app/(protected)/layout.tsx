"use client"

import type React from "react"

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarCollapsedToolbar } from "@/components/sidebar-collapsed-toolbar"

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={false}>
      <AppSidebar />
      <SidebarCollapsedToolbar />
      <SidebarInset className="flex flex-col min-h-screen pl-14">{children}</SidebarInset>
    </SidebarProvider>
  )
}

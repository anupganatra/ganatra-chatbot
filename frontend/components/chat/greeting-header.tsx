"use client"

import { useEffect, useState } from "react"

function getGreeting(): { greeting: string; icon: string } {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return { greeting: "Good morning", icon: "☀️" }
  } else if (hour >= 12 && hour < 17) {
    return { greeting: "Good afternoon", icon: "🌤️" }
  } else if (hour >= 17 && hour < 21) {
    return { greeting: "Good evening", icon: "🌅" }
  } else {
    return { greeting: "Good night", icon: "🌙" }
  }
}

interface GreetingHeaderProps {
  userName?: string
}

export function GreetingHeader({ userName }: GreetingHeaderProps) {
  const [mounted, setMounted] = useState(false)
  const { greeting, icon } = getGreeting()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Show placeholder during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center justify-center gap-2 py-8">
        <span className="text-3xl font-light text-foreground/80">Hello</span>
      </div>
    )
  }

  const displayName = userName?.split("@")[0] || "there"

  return (
    <div className="flex items-center justify-center gap-3 py-8">
      <span className="text-2xl">{icon}</span>
      <h1 className="text-3xl font-light tracking-tight text-foreground/80">
        {greeting}, {displayName}
      </h1>
    </div>
  )
}

"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/hooks/use-auth"
import type { Theme } from "@/types/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ArrowLeft, Settings, Shield, Check, User, Palette, Lock, Cookie, Database, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

type SettingsTab = "general" | "privacy" | "security"

export default function SettingsPage() {
  const { user, loading, updateUser } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<SettingsTab>("general")
  const [fullName, setFullName] = useState(user?.fullName || "")
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem("theme") as Theme) || "system"
    }
    return "system"
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  
  // Password change state
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (user?.fullName) {
      setFullName(user.fullName)
    }
  }, [user])

  useEffect(() => {
    const root = document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else if (theme === "light") {
      root.classList.remove("dark")
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
      if (prefersDark) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }
    localStorage.setItem("theme", theme)
  }, [theme])

  const handleSave = async () => {
    setSaving(true)
    await updateUser({ fullName })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handlePasswordChange = async () => {
    setPasswordError(null)
    setPasswordSuccess(false)

    // Validate password length
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters")
      return
    }

    // Validate passwords match
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match")
      return
    }

    setChangingPassword(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) throw error

      // Success - clear form and show success message
      setNewPassword("")
      setConfirmPassword("")
      setPasswordSuccess(true)
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : "Failed to change password")
    } finally {
      setChangingPassword(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto max-w-6xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" onClick={() => router.push("/chat")} className="shrink-0">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Back to chat</p>
                </TooltipContent>
              </Tooltip>
              <div>
                <h1 className="text-xl font-semibold">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your preferences</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 py-6 max-w-6xl">
        <div className="flex gap-6">
          {/* Sidebar Navigation */}
          <aside className="w-48 shrink-0">
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("general")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "general"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Settings className="h-4 w-4" />
                General
              </button>
              <button
                onClick={() => setActiveTab("privacy")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "privacy"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Shield className="h-4 w-4" />
                Privacy
              </button>
              <button
                onClick={() => setActiveTab("security")}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "security"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Lock className="h-4 w-4" />
                Security
              </button>
            </nav>
          </aside>

          {/* Content Area */}
          <div className="flex-1 space-y-6">
            {activeTab === "general" && (
              <>
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Profile</CardTitle>
                        <CardDescription className="text-xs">Manage your account information</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Enter your full name"
                        className="max-w-md"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={user?.email || ""} disabled className="bg-muted max-w-md" />
                      <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                    </div>

                    <div className="pt-2">
                      <Button onClick={handleSave} disabled={saving} size="sm">
                        {saved ? (
                          <>
                            <Check className="mr-2 h-4 w-4" />
                            Saved
                          </>
                        ) : saving ? (
                          "Saving..."
                        ) : (
                          "Save changes"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Palette className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Appearance</CardTitle>
                        <CardDescription className="text-xs">Customize how the app looks</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Label htmlFor="theme">Theme</Label>
                      <Select value={theme} onValueChange={(v) => setTheme(v as Theme)}>
                        <SelectTrigger id="theme" className="w-full max-w-md">
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">Choose your preferred color scheme</p>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Database className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Data Collection</CardTitle>
                        <CardDescription className="text-xs">How we handle your info</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      We collect minimal data necessary to provide the service. Your conversations are stored securely.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Lock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Chat History</CardTitle>
                        <CardDescription className="text-xs">Your conversation data</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Chat history is stored for session continuity. Delete conversations from the sidebar.
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Cookie className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-base">Cookies</CardTitle>
                        <CardDescription className="text-xs">Browser storage usage</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      We use essential cookies for authentication. No third-party tracking cookies.
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {activeTab === "security" && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                      <Lock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">Change Password</CardTitle>
                      <CardDescription className="text-xs">Update your account password</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative max-w-md">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => {
                          setNewPassword(e.target.value)
                          setPasswordError(null)
                        }}
                        placeholder="Enter your new password"
                        className="pr-10"
                        disabled={changingPassword}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        disabled={changingPassword}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative max-w-md">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => {
                          setConfirmPassword(e.target.value)
                          setPasswordError(null)
                        }}
                        placeholder="Confirm your new password"
                        className="pr-10"
                        disabled={changingPassword}
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        tabIndex={-1}
                        disabled={changingPassword}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {passwordError && (
                    <p className="text-sm text-destructive">{passwordError}</p>
                  )}

                  {passwordSuccess && (
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Check className="h-4 w-4" />
                      <span>Password changed successfully</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button 
                      onClick={handlePasswordChange} 
                      disabled={changingPassword || !newPassword || !confirmPassword} 
                      size="sm"
                    >
                      {changingPassword ? (
                        "Changing password..."
                      ) : passwordSuccess ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Password changed
                        </>
                      ) : (
                        "Change password"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
    </TooltipProvider>
  )
}

"use client"

import { useState, useMemo } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/hooks/use-auth"

interface ReportBugDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type BugCategory = "ui" | "functionality" | "performance" | "other"

export function ReportBugDialog({ open, onOpenChange }: ReportBugDialogProps) {
  const { user } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  const [category, setCategory] = useState<BugCategory>("functionality")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) return

    setSubmitting(true)
    setError(null)

    try {
      const { error: insertError } = await supabase
        .from('bug_reports')
        .insert({
          user_id: user?.id,
          user_email: user?.email,
          category,
          title: title.trim(),
          description: description.trim(),
        })

      if (insertError) throw insertError

      setSubmitted(true)

      // Reset and close after showing success
      setTimeout(() => {
        setSubmitted(false)
        setTitle("")
        setDescription("")
        setCategory("functionality")
        onOpenChange(false)
      }, 1500)
    } catch (err) {
      console.error("Error submitting bug report:", err)
      setError("Failed to submit report. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      // Reset form when closing
      setTitle("")
      setDescription("")
      setCategory("functionality")
      setSubmitted(false)
      setError(null)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report a Bug</DialogTitle>
          <DialogDescription>Help us improve by reporting any issues you encounter.</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <p className="mt-4 text-sm font-medium">Thank you for your report!</p>
            <p className="text-sm text-muted-foreground">We&apos;ll look into this issue.</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as BugCategory)}>
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ui">UI / Design</SelectItem>
                    <SelectItem value="functionality">Functionality</SelectItem>
                    <SelectItem value="performance">Performance</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of the issue"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Please describe the bug in detail. Include steps to reproduce if possible."
                  rows={4}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={!title.trim() || !description.trim() || submitting}>
                {submitting ? "Submitting..." : "Submit Report"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

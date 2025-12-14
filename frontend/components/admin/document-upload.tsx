"use client"

import type React from "react"

import { useState, type ChangeEvent, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Upload, File, X, Loader2, Globe, Link2, HelpCircle } from "lucide-react"
import { useDocuments } from "@/hooks/use-documents"

export function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState<string>("")
  const [enableCrawl, setEnableCrawl] = useState<boolean>(false)
  const [maxPages, setMaxPages] = useState<number>(10)
  const [maxDepth, setMaxDepth] = useState<number>(2)
  const [dragActive, setDragActive] = useState(false)
  const [activeTab, setActiveTab] = useState<"pdf" | "website">("pdf")
  const { upload, uploadWebsite, uploading, error } = useDocuments()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile.type === "application/pdf") {
        setFile(droppedFile)
      }
    }
  }

  const validateUrl = (urlString: string): boolean => {
    try {
      const url = new URL(urlString)
      return url.protocol === 'http:' || url.protocol === 'https:'
    } catch {
      return false
    }
  }

  const handleUpload = async () => {
    if (activeTab === "pdf") {
      if (!file) return

      const result = await upload(file)
      if (result) {
        setFile(null)
        if (inputRef.current) inputRef.current.value = ""
        
        // Dispatch event to notify DocumentList to invalidate cache and refresh
        window.dispatchEvent(new CustomEvent('document-uploaded'))
      }
    } else {
      if (!url.trim()) return
      
      if (!validateUrl(url.trim())) {
        return
      }

      const result = await uploadWebsite(
        url.trim(),
        enableCrawl,
        enableCrawl ? maxPages : undefined,
        enableCrawl ? maxDepth : undefined
      )
      if (result) {
        setUrl("")
        setEnableCrawl(false)
        setMaxPages(10)
        setMaxDepth(2)
        
        // Dispatch event to notify DocumentList to invalidate cache and refresh
        window.dispatchEvent(new CustomEvent('document-uploaded'))
      }
    }
  }

  const clearFile = () => {
    setFile(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const isUploadDisabled = () => {
    if (uploading) return true
    if (activeTab === "pdf") return !file
    return !url.trim() || !validateUrl(url.trim())
  }

  return (
    <TooltipProvider>
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "pdf" | "website")} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pdf" className="gap-2">
            <File className="h-4 w-4" />
            PDF Document
          </TabsTrigger>
          <TabsTrigger value="website" className="gap-2">
            <Globe className="h-4 w-4" />
            Website URL
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pdf" className="space-y-4 mt-4">
          <div
            className={`relative border-2 border-dashed rounded-lg p-6 transition-colors ${
              dragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={inputRef}
              id="file-upload"
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              disabled={uploading}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            <div className="flex flex-col items-center text-center">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drop PDF here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">PDF files only</p>
            </div>
          </div>

          {file && (
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <File className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={clearFile} disabled={uploading}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="website" className="space-y-4 mt-4">
          <div className="space-y-2">
            <label htmlFor="website-url" className="text-sm font-medium">
              Website URL
            </label>
            <div className="relative">
              <Link2 className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website-url"
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={uploading}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enter a valid HTTP or HTTPS URL to scrape and process
            </p>
            {url.trim() && !validateUrl(url.trim()) && (
              <p className="text-xs text-destructive">
                Please enter a valid URL starting with http:// or https://
              </p>
            )}
          </div>

          <div className="space-y-4 pt-2 border-t">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1">
                  <Label htmlFor="enable-crawl" className="text-sm font-medium">
                    Crawl multiple pages
                  </Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[250px]">
                      <p>Enable this to automatically discover and process linked pages from the same website domain.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">
                  Follow links to crawl multiple pages from the same domain
                </p>
              </div>
              <Switch
                id="enable-crawl"
                checked={enableCrawl}
                onCheckedChange={setEnableCrawl}
                disabled={uploading}
              />
            </div>

            {enableCrawl && (
              <div className="space-y-4 pl-4 border-l-2 border-primary/20">
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="max-pages" className="text-sm font-medium">
                      Max pages
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Total number of pages to process</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="max-pages"
                    type="number"
                    min={1}
                    max={100}
                    value={maxPages}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10)
                      if (!isNaN(value) && value >= 1 && value <= 100) {
                        setMaxPages(value)
                      }
                    }}
                    disabled={uploading}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum number of pages to crawl (1-100)
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="max-depth" className="text-sm font-medium">
                      Max depth
                    </Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[250px]">
                        <p>How many link levels to follow from the starting page. Depth 1 = only the starting page, Depth 2 = starting page + directly linked pages.</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    id="max-depth"
                    type="number"
                    min={1}
                    max={5}
                    value={maxDepth}
                    onChange={(e) => {
                      const value = parseInt(e.target.value, 10)
                      if (!isNaN(value) && value >= 1 && value <= 5) {
                        setMaxDepth(value)
                      }
                    }}
                    disabled={uploading}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Maximum depth to crawl from the base URL (1-5)
                  </p>
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {error && (
        <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20 max-h-32 overflow-y-auto">
          <p className="text-sm text-destructive break-words whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {uploading && (
        <div className="flex flex-col items-center gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm font-medium">
              {activeTab === "pdf" ? "Processing document..." : "Processing website..."}
            </span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {activeTab === "pdf" 
              ? "Large files may take several minutes to process. Please don't close this page."
              : enableCrawl
              ? `Crawling up to ${maxPages} pages at depth ${maxDepth}. This may take several minutes. Please don't close this page.`
              : "This may take a few moments. Please don't close this page."}
          </p>
        </div>
      )}

      <Button onClick={handleUpload} disabled={isUploadDisabled()} className="w-full">
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {activeTab === "pdf" ? "Uploading..." : "Processing..."}
          </>
        ) : (
          <>
            {activeTab === "pdf" ? (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </>
            ) : (
              <>
                <Globe className="mr-2 h-4 w-4" />
                Add Website
              </>
            )}
          </>
        )}
      </Button>
    </div>
    </TooltipProvider>
  )
}

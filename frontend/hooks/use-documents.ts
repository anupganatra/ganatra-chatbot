'use client'

import { useState, useCallback } from 'react'
import { uploadDocument, uploadWebsite, deleteDocument, getAdminStats } from '@/lib/api/backend'
import { DocumentUploadResponse, DocumentDeleteResponse } from '@/types/document'

export function useDocuments() {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(async (file: File): Promise<DocumentUploadResponse | null> => {
    setUploading(true)
    setError(null)

    try {
      const response = await uploadDocument(file)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload document'
      setError(errorMessage)
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  const uploadWebsiteUrl = useCallback(async (url: string): Promise<DocumentUploadResponse | null> => {
    setUploading(true)
    setError(null)

    try {
      const response = await uploadWebsite(url)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload website'
      setError(errorMessage)
      return null
    } finally {
      setUploading(false)
    }
  }, [])

  const remove = useCallback(async (documentId: string): Promise<DocumentDeleteResponse | null> => {
    setError(null)

    try {
      const response = await deleteDocument(documentId)
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete document'
      setError(errorMessage)
      return null
    }
  }, [])

  const getStats = useCallback(async () => {
    try {
      const stats = await getAdminStats()
      return stats
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get stats'
      setError(errorMessage)
      return null
    }
  }, [])

  return {
    upload,
    uploadWebsite: uploadWebsiteUrl,
    remove,
    getStats,
    uploading,
    error
  }
}


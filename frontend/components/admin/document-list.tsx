"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getAdminDocuments } from "@/lib/api/backend"
import { useDocuments } from "@/hooks/use-documents"
import { DocumentInfo } from "@/types/document"

export default function DocumentList() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { remove, uploading } = useDocuments()

  const fetchDocs = async () => {
    setLoading(true)
    setError(null)
    try {
      const docs = await getAdminDocuments()
      setDocuments(docs || [])
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else if (typeof err === "object") {
        try {
          setError(JSON.stringify(err))
        } catch {
          setError(String(err))
        }
      } else {
        setError(String(err))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  const handleDelete = async (id: string) => {
    const confirmed = confirm("Delete this document and all its chunks? This cannot be undone.")
    if (!confirmed) return

    setError(null)
    try {
      const res = await remove(id)
      if (res) {
        // success, refresh list
        await fetchDocs()
      } else {
        setError("Failed to delete document")
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else if (typeof err === "object") {
        try {
          setError(JSON.stringify(err))
        } catch {
          setError(String(err))
        }
      } else {
        setError(String(err))
      }
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex items-center justify-between">
          <div />
          <Button onClick={fetchDocs} disabled={loading}>
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive mb-2">{error}</p>}

        {loading ? (
          <p>Loading...</p>
        ) : documents.length === 0 ? (
          <p>No documents uploaded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full table-auto text-sm">
              <thead>
                <tr className="text-left">
                  <th className="px-2 py-1">Filename</th>
                  <th className="px-2 py-1">Uploaded</th>
                  <th className="px-2 py-1">Chunks</th>
                  <th className="px-2 py-1">Pages</th>
                  <th className="px-2 py-1">Size</th>
                  <th className="px-2 py-1">Status</th>
                  <th className="px-2 py-1">Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id} className="border-t">
                    <td className="px-2 py-2">{doc.filename}</td>
                    <td className="px-2 py-2">{new Date(doc.uploaded_at).toLocaleString()}</td>
                    <td className="px-2 py-2">{doc.chunks_count}</td>
                    <td className="px-2 py-2">{doc.page_count ?? "-"}</td>
                    <td className="px-2 py-2">{(doc.file_size / 1024).toFixed(1)} KB</td>
                    <td className="px-2 py-2">{doc.status}</td>
                    <td className="px-2 py-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(doc.id)}
                        disabled={uploading}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

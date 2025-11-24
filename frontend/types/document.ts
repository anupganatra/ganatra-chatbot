export interface DocumentInfo {
  id: string
  filename: string
  uploaded_at: string
  chunks_count: number
  page_count?: number
  file_size: number
  status: string
}

export interface DocumentUploadResponse {
  document_id: string
  filename: string
  status: string
  chunks_created: number
  message: string
}

export interface DocumentDeleteResponse {
  document_id: string
  message: string
  chunks_deleted: number
}


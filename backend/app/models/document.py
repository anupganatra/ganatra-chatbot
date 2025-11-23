"""Pydantic models for document operations."""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field


class DocumentUploadResponse(BaseModel):
    """Response after document upload."""
    document_id: str = Field(..., description="Unique document ID")
    filename: str = Field(..., description="Original filename")
    status: str = Field(..., description="Upload status")
    chunks_created: int = Field(..., description="Number of chunks created")
    message: str = Field(..., description="Status message")


class DocumentInfo(BaseModel):
    """Document information model."""
    id: str
    filename: str
    uploaded_at: datetime
    chunks_count: int
    file_size: int
    status: str


class DocumentListResponse(BaseModel):
    """Response for document list."""
    documents: List[DocumentInfo]
    total: int


class DocumentDeleteResponse(BaseModel):
    """Response after document deletion."""
    document_id: str
    message: str
    chunks_deleted: int



"""Pydantic models for document operations."""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, Field, HttpUrl


class WebsiteUploadRequest(BaseModel):
    """Request model for website URL upload."""
    url: str = Field(..., description="Website URL to scrape and process")
    enable_crawl: bool = Field(default=False, description="Enable multi-page crawling")
    max_pages: int = Field(default=10, ge=1, le=100, description="Maximum number of pages to crawl")
    max_depth: int = Field(default=2, ge=1, le=5, description="Maximum depth to crawl from base URL")


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



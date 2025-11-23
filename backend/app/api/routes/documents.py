"""Document management API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from app.models.document import DocumentUploadResponse, DocumentDeleteResponse
from app.models.user import User
from app.api.dependencies import get_current_admin_user
from app.services.qdrant import qdrant_service
from app.services.embeddings import embedding_service
from app.utils.pdf_processor import extract_text_from_pdf, validate_pdf_file
from app.utils.chunking import chunk_text_with_metadata
from app.middleware.rate_limit import limiter
from app.config import settings
import uuid
from datetime import datetime

router = APIRouter(prefix="/documents", tags=["documents"])


@router.post("/upload", response_model=DocumentUploadResponse)
@limiter.limit("5/minute")
async def upload_document(
    request: Request,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_admin_user)
):
    """
    Upload and process a PDF document.
    
    Args:
        request: FastAPI request object
        file: PDF file to upload
        current_user: Current authenticated admin user
    
    Returns:
        DocumentUploadResponse with upload status
    """
    try:
        # Read file
        file_bytes = await file.read()
        
        # Validate file
        validate_pdf_file(file_bytes, file.filename)
        
        # Generate document ID
        document_id = str(uuid.uuid4())
        
        # Extract text from PDF
        text, page_count = extract_text_from_pdf(file_bytes)
        
        # Chunk text
        chunks = chunk_text_with_metadata(
            text=text,
            document_id=document_id,
            filename=file.filename,
            chunk_size=settings.CHUNK_SIZE,
            chunk_overlap=settings.CHUNK_OVERLAP
        )
        
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No text chunks could be created from the document"
            )
        
        # Generate embeddings
        texts = [chunk["text"] for chunk in chunks]
        embeddings = embedding_service.generate_embeddings_batch(texts)
        
        # Store in Qdrant
        chunks_created = qdrant_service.upsert_chunks(
            chunks=chunks,
            embeddings=embeddings,
            document_id=document_id
        )
        
        return DocumentUploadResponse(
            document_id=document_id,
            filename=file.filename,
            status="success",
            chunks_created=chunks_created,
            message=f"Document processed successfully. Created {chunks_created} chunks."
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
@limiter.limit("10/minute")
async def delete_document(
    request: Request,
    document_id: str,
    current_user: User = Depends(get_current_admin_user)
):
    """
    Delete a document and all its chunks.
    
    Args:
        request: FastAPI request object
        document_id: Document ID to delete
        current_user: Current authenticated admin user
    
    Returns:
        DocumentDeleteResponse with deletion status
    """
    try:
        chunks_deleted = qdrant_service.delete_document(document_id)
        
        return DocumentDeleteResponse(
            document_id=document_id,
            message="Document deleted successfully",
            chunks_deleted=chunks_deleted
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting document: {str(e)}"
        )



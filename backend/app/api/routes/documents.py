"""Document management API routes."""
import time
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Request
from app.models.document import DocumentUploadResponse, DocumentDeleteResponse, WebsiteUploadRequest
from app.models.user import User
from app.api.dependencies import get_current_admin_user, get_current_user_tenant
from app.services.qdrant import qdrant_service
from app.services.embeddings import embedding_service
from app.services.supabase_client import supabase_client
from app.utils.pdf_processor import extract_text_from_pdf, validate_pdf_file
from app.utils.web_scraper import extract_text_from_url, crawl_website
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
    current_user: User = Depends(get_current_admin_user),
    tenant_id: str = Depends(get_current_user_tenant)
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
        start_time = time.time()
        
        # Read file
        file_bytes = await file.read()
        print(f"⏱️  File read: {time.time() - start_time:.2f}s ({len(file_bytes) / 1024:.1f} KB)")

        # Validate file
        validate_pdf_file(file_bytes, file.filename)
        print(f"⏱️  Validation: {time.time() - start_time:.2f}s")
        
        # Generate document ID
        document_id = str(uuid.uuid4())
        
        # Extract text from PDF
        extraction_start = time.time()
        text, page_count = extract_text_from_pdf(file_bytes)
        print(f"⏱️  PDF extraction: {time.time() - extraction_start:.2f}s ({page_count} pages)")
        
        # Chunk text
        chunking_start = time.time()
        print(f"📝 Text extracted: {len(text)} characters")

        if len(text) > 50000:  # If text is unexpectedly huge
            print(f"⚠️ Warning: Very large text extracted ({len(text)} chars)")
            
        try:
            chunks = chunk_text_with_metadata(
                text=text,
                document_id=document_id,
                filename=file.filename,
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP
            )
            print(f"⏱️  Chunking: {time.time() - chunking_start:.2f}s ({len(chunks)} chunks created)")
        except Exception as e:
            print(f"❌ Chunking error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error during text chunking: {str(e)}"
            )
        
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No text chunks could be created from the document"
            )
        
        # Generate embeddings
        embedding_start = time.time()
        texts = [chunk["text"] for chunk in chunks]
        print(f"🔄 Generating embeddings for {len(texts)} chunks...")

        try:
            embeddings = embedding_service.generate_embeddings_batch(texts)
            embedding_time = time.time() - embedding_start
            print(f"⏱️  Embeddings: {embedding_time:.2f}s ({len(embeddings)} embeddings, {len(embeddings)/embedding_time:.1f} emb/sec)")
        except Exception as e:
            print(f"❌ Embedding error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating embeddings: {str(e)}"
            )

        # Store in Qdrant
        qdrant_start = time.time()
        print(f"💾 Storing {len(chunks)} chunks in Qdrant...")

        try:
            chunks_created = qdrant_service.upsert_chunks(
                chunks=chunks,
                embeddings=embeddings,
                document_id=document_id
            )
            print(f"⏱️  Qdrant upsert: {time.time() - qdrant_start:.2f}s ({chunks_created} chunks)")
        except Exception as e:
            print(f"❌ Qdrant error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error storing in Qdrant: {str(e)}"
            )

        # Persist metadata in Supabase. If this fails, attempt to roll back Qdrant inserts.
        supabase_start = time.time()
        try:
            supabase_client.insert_document_metadata(
                document_id=document_id,
                filename=file.filename,
                uploader_id=current_user.id if hasattr(current_user, 'id') else None,
                chunks_count=chunks_created,
                page_count=page_count,
                tenant_id=tenant_id,
                file_size=len(file_bytes),
                status="active"
            )
            print(f"⏱️  Supabase insert: {time.time() - supabase_start:.2f}s")
        except Exception as e:
            # Compensating rollback: try to delete the points we just added to Qdrant.
            try:
                qdrant_service.delete_document(document_id, tenant_id=tenant_id)
            except Exception:
                # Don't expose internal Qdrant errors to the client; log and surface a concise message.
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=("Failed to persist document metadata; attempted to roll back Qdrant inserts, "
                            "but rollback may have failed. Check server logs for details.")
                )

            # If rollback succeeded, inform the client that metadata persistence failed.
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to persist document metadata: {str(e)}. Qdrant changes rolled back."
            )

        total_time = time.time() - start_time
        print(f"✅ Total upload time: {total_time:.2f}s")

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
    except HTTPException:
        # Re-raise HTTP exceptions without modification
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing document: {str(e)}"
        )


@router.post("/upload-url", response_model=DocumentUploadResponse)
@limiter.limit("5/minute")
async def upload_website(
    request: Request,
    website_request: WebsiteUploadRequest,
    current_user: User = Depends(get_current_admin_user),
    tenant_id: str = Depends(get_current_user_tenant)
):
    """
    Upload and process a website URL.
    
    Args:
        request: FastAPI request object
        website_request: Website upload request with URL
        current_user: Current authenticated admin user
    
    Returns:
        DocumentUploadResponse with upload status
    """
    try:
        start_time = time.time()
        url = website_request.url
        enable_crawl = website_request.enable_crawl
        max_pages = website_request.max_pages
        max_depth = website_request.max_depth
        
        # Extract text from website (single page or crawl)
        extraction_start = time.time()
        page_count = 1
        page_title = None
        
        if enable_crawl:
            print(f"🕷️  Crawling website from {url} (max_pages={max_pages}, max_depth={max_depth})...")
            crawled_pages = crawl_website(url, max_pages=max_pages, max_depth=max_depth)
            page_count = len(crawled_pages)
            
            # Combine text from all pages
            text_parts = []
            titles = []
            for page_url, page_text, page_title_item in crawled_pages:
                text_parts.append(f"\n\n--- Page: {page_url} ---\n\n{page_text}")
                if page_title_item and page_title_item != page_url:
                    titles.append(page_title_item)
            
            text = "\n".join(text_parts)
            page_title = titles[0] if titles else url
            
            print(f"⏱️  Website crawl: {time.time() - extraction_start:.2f}s ({page_count} pages)")
        else:
            print(f"🌐 Fetching content from {url}...")
            text, page_title = extract_text_from_url(url)
            print(f"⏱️  Website extraction: {time.time() - extraction_start:.2f}s")
        
        # Generate document ID
        document_id = str(uuid.uuid4())
        
        # Use URL as filename, or page title if available
        if enable_crawl:
            filename = f"{url} ({page_count} pages)"
            if page_title and page_title != url:
                filename = f"{page_title} - {url} ({page_count} pages)"
        else:
            filename = url
            if page_title and page_title != url:
                filename = f"{page_title} ({url})"
        
        # Chunk text
        chunking_start = time.time()
        print(f"📝 Text extracted: {len(text)} characters")
        
        if len(text) > 50000:
            print(f"⚠️ Warning: Very large text extracted ({len(text)} chars)")
        
        try:
            chunks = chunk_text_with_metadata(
                text=text,
                document_id=document_id,
                filename=filename,
                chunk_size=settings.CHUNK_SIZE,
                chunk_overlap=settings.CHUNK_OVERLAP
            )
            print(f"⏱️  Chunking: {time.time() - chunking_start:.2f}s ({len(chunks)} chunks created)")
        except Exception as e:
            print(f"❌ Chunking error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error during text chunking: {str(e)}"
            )
        
        if not chunks:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No text chunks could be created from the website"
            )
        
        # Generate embeddings
        embedding_start = time.time()
        texts = [chunk["text"] for chunk in chunks]
        print(f"🔄 Generating embeddings for {len(texts)} chunks...")
        
        try:
            embeddings = embedding_service.generate_embeddings_batch(texts)
            embedding_time = time.time() - embedding_start
            print(f"⏱️  Embeddings: {embedding_time:.2f}s ({len(embeddings)} embeddings, {len(embeddings)/embedding_time:.1f} emb/sec)")
        except Exception as e:
            print(f"❌ Embedding error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error generating embeddings: {str(e)}"
            )
        
        # Store in Qdrant
        qdrant_start = time.time()
        print(f"💾 Storing {len(chunks)} chunks in Qdrant...")
        
        try:
            chunks_created = qdrant_service.upsert_chunks(
                chunks=chunks,
                embeddings=embeddings,
                document_id=document_id,
                tenant_id=tenant_id
            )
            print(f"⏱️  Qdrant upsert: {time.time() - qdrant_start:.2f}s ({chunks_created} chunks)")
        except Exception as e:
            print(f"❌ Qdrant error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error storing in Qdrant: {str(e)}"
            )
        
        # Persist metadata in Supabase. If this fails, attempt to roll back Qdrant inserts.
        supabase_start = time.time()
        try:
            supabase_client.insert_document_metadata(
                document_id=document_id,
                filename=filename,
                uploader_id=current_user.id if hasattr(current_user, 'id') else None,
                chunks_count=chunks_created,
                page_count=page_count,
                tenant_id=tenant_id,
                file_size=len(text.encode('utf-8')),  # Approximate size in bytes
                status="active"
            )
            print(f"⏱️  Supabase insert: {time.time() - supabase_start:.2f}s")
        except Exception as e:
            # Compensating rollback: try to delete the points we just added to Qdrant.
            try:
                qdrant_service.delete_document(document_id, tenant_id=tenant_id)
            except Exception:
                # Don't expose internal Qdrant errors to the client; log and surface a concise message.
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail=("Failed to persist document metadata; attempted to roll back Qdrant inserts, "
                            "but rollback may have failed. Check server logs for details.")
                )
            
            # If rollback succeeded, inform the client that metadata persistence failed.
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to persist document metadata: {str(e)}. Qdrant changes rolled back."
            )
        
        total_time = time.time() - start_time
        print(f"✅ Total upload time: {total_time:.2f}s")
        
        crawl_msg = f" ({page_count} pages crawled)" if enable_crawl else ""
        return DocumentUploadResponse(
            document_id=document_id,
            filename=filename,
            status="success",
            chunks_created=chunks_created,
            message=f"Website processed successfully{crawl_msg}. Created {chunks_created} chunks."
        )
    
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except HTTPException:
        # Re-raise HTTP exceptions without modification
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing website: {str(e)}"
        )


@router.delete("/{document_id}", response_model=DocumentDeleteResponse)
@limiter.limit("10/minute")
async def delete_document(
    request: Request,
    document_id: str,
    current_user: User = Depends(get_current_admin_user),
    tenant_id: str = Depends(get_current_user_tenant)
):
    """
    Delete a document and all its chunks (tenant-scoped).
    
    Args:
        request: FastAPI request object
        document_id: Document ID to delete
        current_user: Current authenticated admin user
        tenant_id: Current user's tenant ID
    
    Returns:
        DocumentDeleteResponse with deletion status
    """
    try:
        chunks_deleted = qdrant_service.delete_document(document_id, tenant_id=tenant_id)

        # Delete metadata row in Supabase (RLS will verify tenant ownership)
        try:
            supabase_client.delete_metadata(document_id, tenant_id=tenant_id)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=(f"Document chunks deleted ({chunks_deleted}) but failed to delete metadata: {str(e)}")
            )

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


@router.get("", response_model=list)
@limiter.limit("30/minute")
async def get_documents(
    request: Request,
    offset: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_admin_user),
    tenant_id: str = Depends(get_current_user_tenant)
):
    """
    Get list of documents for the current user's tenant.
    
    Args:
        request: FastAPI request object
        offset: Pagination offset
        limit: Maximum number of documents to return
        current_user: Current authenticated admin user
        tenant_id: Current user's tenant ID
    
    Returns:
        List of document metadata
    """
    try:
        documents = supabase_client.list_documents(tenant_id=tenant_id, offset=offset, limit=limit)
        return documents
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching documents: {str(e)}"
        )



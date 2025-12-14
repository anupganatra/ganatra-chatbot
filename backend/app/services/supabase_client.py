"""Supabase helper service for document metadata operations."""
from typing import Optional, List, Dict, Any
from supabase import create_client, Client
from app.config import settings
from datetime import datetime


class SupabaseClient:
    """
    Simple Supabase helper for inserting/listing/deleting document metadata.
    Uses `SUPABASE_SERVICE_KEY` when available.
    """

    def __init__(self):
        # create_client returns a Supabase client instance
        self.supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)
        self.table = "documents"

    def insert_document_metadata(
        self,
        document_id: str,
        filename: str,
        uploader_id: Optional[str],
        chunks_count: int,
        page_count: int,
        tenant_id: Optional[str],
        file_size: int = 0,
        status: str = "active",
        storage_path: Optional[str] = None,
    ) -> Any:
        """Insert a metadata row into the `documents` table.
        tenant_id can be None for super admin uploads.

        Returns the Supabase response object (`.data`, `.error`) for callers to inspect.
        """
        payload: Dict[str, Any] = {
            "id": document_id,
            "filename": filename,
            "uploader_id": uploader_id,
            "uploaded_at": datetime.utcnow().isoformat(),
            "chunks_count": chunks_count,
            "page_count": page_count,
            "file_size": file_size,
            "status": status,
            "storage_path": storage_path,
        }
        
        # Only include tenant_id if it's not None
        if tenant_id is not None:
            payload["tenant_id"] = tenant_id

        resp = self.supabase.table(self.table).insert(payload).execute()

        # supabase-py returns an object with `data` and `error` (or similar). If an
        # error occurred, surface it as an exception so the caller can roll back.
        error = getattr(resp, "error", None)
        if error:
            # Try to extract message(s) if possible
            try:
                msg = error.message if hasattr(error, "message") else str(error)
            except Exception:
                msg = str(error)
            raise ValueError(f"Supabase insert error: {msg}")

        return resp

    def delete_metadata(self, document_id: str, tenant_id: Optional[str] = None) -> Any:
        """Delete metadata rows matching `document_id` and optionally verify tenant ownership."""
        query = self.supabase.table(self.table).delete().eq("id", document_id)
        
        # If tenant_id provided, verify ownership (RLS will also enforce this)
        if tenant_id:
            query = query.eq("tenant_id", tenant_id)
        
        resp = query.execute()
        error = getattr(resp, "error", None)
        if error:
            try:
                msg = error.message if hasattr(error, "message") else str(error)
            except Exception:
                msg = str(error)
            raise ValueError(f"Supabase delete error: {msg}")

        return resp

    def list_documents(self, tenant_id: Optional[str] = None, offset: int = 0, limit: int = 100, include_all: bool = False) -> List[Dict[str, Any]]:
        """List documents from the metadata table filtered by tenant_id. Returns a list of rows.
        If tenant_id is None and include_all=False, returns only documents with NULL tenant_id (for super admins viewing their own docs).
        If tenant_id is None and include_all=True, returns ALL documents (for super admin analytics)."""
        # Supabase range is inclusive, so end = offset + limit - 1
        end = offset + max(0, limit - 1)
        query = (
            self.supabase.table(self.table)
            .select("id,filename,uploader_id,tenant_id,uploaded_at,chunks_count,page_count,file_size,status,storage_path")
        )
        
        # Filter by tenant_id if provided
        if tenant_id is not None:
            query = query.eq("tenant_id", tenant_id)
        elif not include_all:
            # Super admin viewing their own docs: filter for documents with NULL tenant_id only
            query = query.is_("tenant_id", "null")
        # If include_all=True and tenant_id=None, no filter - returns all documents
        
        resp = query.order("uploaded_at", desc=True).range(offset, end).execute()

        # Normalize response data
        data = getattr(resp, "data", None)
        if data is None and isinstance(resp, dict):
            data = resp.get("data")

        return data or []


# global instance
supabase_client = SupabaseClient()

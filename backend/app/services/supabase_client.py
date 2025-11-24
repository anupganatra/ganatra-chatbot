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
        file_size: int = 0,
        status: str = "active",
        storage_path: Optional[str] = None,
    ) -> Any:
        """Insert a metadata row into the `documents` table.

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

    def delete_metadata(self, document_id: str) -> Any:
        """Delete metadata rows matching `document_id` and return the response."""
        resp = self.supabase.table(self.table).delete().eq("id", document_id).execute()
        error = getattr(resp, "error", None)
        if error:
            try:
                msg = error.message if hasattr(error, "message") else str(error)
            except Exception:
                msg = str(error)
            raise ValueError(f"Supabase delete error: {msg}")

        return resp

    def list_documents(self, offset: int = 0, limit: int = 100) -> List[Dict[str, Any]]:
        """List documents from the metadata table. Returns a list of rows."""
        # Supabase range is inclusive, so end = offset + limit - 1
        end = offset + max(0, limit - 1)
        resp = (
            self.supabase.table(self.table)
            .select("id,filename,uploader_id,uploaded_at,chunks_count,page_count,file_size,status,storage_path")
            .order("uploaded_at", desc=True)
            .range(offset, end)
            .execute()
        )

        # Normalize response data
        data = getattr(resp, "data", None)
        if data is None and isinstance(resp, dict):
            data = resp.get("data")

        return data or []


# global instance
supabase_client = SupabaseClient()

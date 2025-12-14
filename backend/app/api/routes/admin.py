"""Admin-only API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from app.models.user import User
from app.models.model import AvailableModelCreate, AvailableModelUpdate
from app.api.dependencies import get_current_admin_user, get_current_user_tenant, get_current_user_tenant_optional
from app.services.qdrant import qdrant_service
from app.services.supabase_client import supabase_client
from app.middleware.rate_limit import limiter
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
@limiter.limit("30/minute")
async def get_stats(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    tenant_id: Optional[str] = Depends(get_current_user_tenant_optional)
) -> Dict:
    """
    Get system statistics (admin only).
    Super admins can view all companies' stats (tenant_id=None).
    Regular admins view their own company's stats.
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated admin user
        tenant_id: Current user's tenant ID (None for super admins viewing all)
    
    Returns:
        Dictionary with system statistics including document counts and storage
    """
    try:
        collection_info = qdrant_service.get_collection_info()
        
        # Get document statistics from Supabase
        # If tenant_id is None (super admin), get all documents
        # Otherwise, filter by tenant
        docs = supabase_client.list_documents(tenant_id=tenant_id, offset=0, limit=10000)
        total_documents = len(docs)
        total_storage_bytes = sum(doc.get('file_size', 0) or 0 for doc in docs)
        
        return {
            "collection_name": collection_info["name"],
            "total_chunks": collection_info["points_count"],
            "vectors_count": collection_info["vectors_count"],
            "total_documents": total_documents,
            "total_storage_bytes": total_storage_bytes
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting stats: {str(e)}"
        )


@router.post("/rebuild-index")
@limiter.limit("5/minute")
async def rebuild_index(
    request: Request,
    current_user: User = Depends(get_current_admin_user)
) -> Dict:
    """
    Rebuild vector index (admin only).
    This is a placeholder - actual implementation would depend on Qdrant features.
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated admin user
    
    Returns:
        Status message
    """
    try:
        # In Qdrant, indexes are automatically maintained
        # This endpoint could trigger a re-indexing or optimization if needed
        collection_info = qdrant_service.get_collection_info()
        
        return {
            "message": "Index rebuild initiated",
            "collection_info": collection_info
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rebuilding index: {str(e)}"
        )


@router.get("/documents")
@limiter.limit("30/minute")
async def get_documents(
    request: Request,
    current_user: User = Depends(get_current_admin_user),
    tenant_id: str = Depends(get_current_user_tenant),
    offset: int = 0,
    limit: int = 100,
) -> List[Dict[str, Any]]:
    """
    Return list of documents stored in Supabase metadata table for tenant (admin only).
    """
    try:
        docs = supabase_client.list_documents(tenant_id=tenant_id, offset=offset, limit=limit)
        return docs
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing documents: {str(e)}"
        )


@router.get("/models")
@limiter.limit("30/minute")
async def get_all_models(
    request: Request,
    current_user: User = Depends(get_current_admin_user)
) -> List[Dict[str, Any]]:
    """
    Get all models (including inactive) for admin management.
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated admin user
    
    Returns:
        List of all models
    """
    try:
        response = supabase_client.supabase.table("available_models").select("*").order("name").execute()
        models = response.data if hasattr(response, 'data') else []
        return models
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching models: {str(e)}"
        )


@router.post("/models")
@limiter.limit("10/minute")
async def create_model(
    request: Request,
    model: AvailableModelCreate,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Add a new available model.
    
    Args:
        request: FastAPI request object
        model: Model data to create
        current_user: Current authenticated admin user
    
    Returns:
        Created model
    """
    try:
        # Check if model_id already exists
        existing = supabase_client.supabase.table("available_models").select("*").eq("model_id", model.model_id).execute()
        if existing.data and len(existing.data) > 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Model with this model_id already exists"
            )
        
        # Create new model
        now = datetime.utcnow().isoformat()
        payload = {
            "id": str(uuid.uuid4()),
            "model_id": model.model_id,
            "provider": model.provider,
            "name": model.name,
            "description": model.description,
            "is_free": model.is_free,
            "is_active": model.is_active,
            "created_at": now,
            "updated_at": now
        }
        
        response = supabase_client.supabase.table("available_models").insert(payload).execute()
        
        if hasattr(response, 'error') and response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error creating model: {response.error}"
            )
        
        return response.data[0] if response.data else payload
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating model: {str(e)}"
        )


@router.patch("/models/{model_id}")
@limiter.limit("10/minute")
async def update_model(
    request: Request,
    model_id: str,
    model_update: AvailableModelUpdate,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Update an available model.
    
    Args:
        request: FastAPI request object
        model_id: Model ID (database ID, not model_id field)
        model_update: Model data to update
        current_user: Current authenticated admin user
    
    Returns:
        Updated model
    """
    try:
        # Build update payload
        update_data = {"updated_at": datetime.utcnow().isoformat()}
        if model_update.name is not None:
            update_data["name"] = model_update.name
        if model_update.description is not None:
            update_data["description"] = model_update.description
        if model_update.is_free is not None:
            update_data["is_free"] = model_update.is_free
        if model_update.is_active is not None:
            update_data["is_active"] = model_update.is_active
        
        response = supabase_client.supabase.table("available_models").update(update_data).eq("id", model_id).execute()
        
        if hasattr(response, 'error') and response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error updating model: {response.error}"
            )
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        return response.data[0]
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating model: {str(e)}"
        )


@router.delete("/models/{model_id}")
@limiter.limit("10/minute")
async def delete_model(
    request: Request,
    model_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, str]:
    """
    Delete an available model.
    
    Args:
        request: FastAPI request object
        model_id: Model ID (database ID, not model_id field)
        current_user: Current authenticated admin user
    
    Returns:
        Success message
    """
    try:
        response = supabase_client.supabase.table("available_models").delete().eq("id", model_id).execute()
        
        if hasattr(response, 'error') and response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error deleting model: {response.error}"
            )
        
        return {"message": "Model deleted successfully"}
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting model: {str(e)}"
        )


@router.patch("/models/{model_id}/toggle")
@limiter.limit("10/minute")
async def toggle_model_active(
    request: Request,
    model_id: str,
    current_user: User = Depends(get_current_admin_user)
) -> Dict[str, Any]:
    """
    Toggle model active status.
    
    Args:
        request: FastAPI request object
        model_id: Model ID (database ID, not model_id field)
        current_user: Current authenticated admin user
    
    Returns:
        Updated model
    """
    try:
        # Get current model
        response = supabase_client.supabase.table("available_models").select("*").eq("id", model_id).execute()
        
        if not response.data or len(response.data) == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Model not found"
            )
        
        current_model = response.data[0]
        new_active_status = not current_model.get("is_active", False)
        
        # Update status
        update_response = supabase_client.supabase.table("available_models").update({
            "is_active": new_active_status,
            "updated_at": datetime.utcnow().isoformat()
        }).eq("id", model_id).execute()
        
        if hasattr(update_response, 'error') and update_response.error:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error toggling model: {update_response.error}"
            )
        
        return update_response.data[0] if update_response.data else current_model
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error toggling model: {str(e)}"
        )



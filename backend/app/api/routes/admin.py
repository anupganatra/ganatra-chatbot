"""Admin-only API routes."""
from fastapi import APIRouter, Depends, HTTPException, status
from app.models.user import User
from app.api.dependencies import get_current_admin_user
from app.services.qdrant import qdrant_service
from app.middleware.rate_limit import limiter
from typing import Dict

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/stats")
@limiter.limit("30/minute")
async def get_stats(
    request,
    current_user: User = Depends(get_current_admin_user)
) -> Dict:
    """
    Get system statistics (admin only).
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated admin user
    
    Returns:
        Dictionary with system statistics
    """
    try:
        collection_info = qdrant_service.get_collection_info()
        
        return {
            "collection_name": collection_info["name"],
            "total_chunks": collection_info["points_count"],
            "vectors_count": collection_info["vectors_count"]
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting stats: {str(e)}"
        )


@router.post("/rebuild-index")
@limiter.limit("5/minute")
async def rebuild_index(
    request,
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



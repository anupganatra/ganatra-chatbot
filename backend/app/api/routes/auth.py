"""Authentication routes."""
from typing import Optional
from fastapi import APIRouter, Depends, Request, HTTPException, status
from app.models.user import User
from app.api.dependencies import get_current_user
from app.services.tenant import tenant_service
from app.middleware.rate_limit import limiter

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=User)
@limiter.limit("30/minute")
async def get_current_user_info(
    request: Request,
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Get current authenticated user information with computed role.
    Role is determined by: super_admin (from metadata) or tenant admin role.
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated user (from dependency)
    
    Returns:
        User object with computed role
    """
    return current_user


@router.get("/me/role")
@limiter.limit("60/minute")
async def get_current_user_role(
    request: Request,
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Get current user's role quickly (lightweight endpoint for instant UI updates).
    This endpoint is optimized for speed and only returns the role.
    Uses the same dependency as /auth/me but returns minimal data.
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated user (from dependency)
    
    Returns:
        Dictionary with role ('super_admin', 'admin', or 'user')
    """
    # This endpoint uses get_current_user which already computed the role
    # So we can just return it directly without additional queries
    return {"role": current_user.role}


@router.get("/me/debug")
@limiter.limit("30/minute")
async def get_current_user_debug(
    request: Request,
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Debug endpoint to see raw user metadata.
    """
    try:
        # Get raw user data from Supabase
        response = tenant_service.supabase.auth.admin.get_user_by_id(current_user.id)
        if response.user:
            user_metadata = response.user.user_metadata or {}
            return {
                "user_id": current_user.id,
                "email": current_user.email,
                "computed_role": current_user.role,
                "raw_user_metadata": user_metadata,
                "is_super_admin_check": tenant_service.is_super_admin(current_user.id),
                "tenant_id": tenant_service.get_user_tenant(current_user.id)
            }
        return {"error": "User not found"}
    except Exception as e:
        return {"error": str(e)}


@router.get("/me/tenant")
@limiter.limit("30/minute")
async def get_current_user_tenant_id(
    request: Request,
    current_user: User = Depends(get_current_user)
) -> dict:
    """
    Get current user's tenant ID.
    Returns None for super admins.
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated user (from dependency)
    
    Returns:
        Dictionary with tenant_id (or None) and tenant_name (or None)
    """
    # Super admins don't have a tenant
    if tenant_service.is_super_admin(current_user.id):
        return {"tenant_id": None, "tenant_name": None}
    
    tenant_id = tenant_service.get_user_tenant(current_user.id)
    if tenant_id is None:
        return {"tenant_id": None, "tenant_name": None}
    
    # Get tenant name
    try:
        response = tenant_service.supabase.table("tenants").select("name").eq("id", tenant_id).limit(1).execute()
        tenant_name = response.data[0].get("name") if response.data and len(response.data) > 0 else None
    except Exception as e:
        print(f"Error fetching tenant name: {e}")
        tenant_name = None
    
    return {"tenant_id": tenant_id, "tenant_name": tenant_name}


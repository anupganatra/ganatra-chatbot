"""Tenant management API routes."""
from fastapi import APIRouter, Depends, HTTPException, status, Request, Query
from app.models.tenant import (
    TenantCreate, TenantUpdate, TenantResponse, TenantUserAdd,
    TenantUserRoleUpdate, TenantUserResponse
)
from app.models.user import User
from app.api.dependencies import (
    get_current_super_admin, get_current_tenant_admin, get_current_user_tenant
)
from app.services.tenant import tenant_service
from app.middleware.rate_limit import limiter
from typing import List, Dict, Any

router = APIRouter(prefix="/tenants", tags=["tenants"])


@router.get("", response_model=List[TenantResponse])
@limiter.limit("30/minute")
async def list_tenants(
    request: Request,
    current_user: User = Depends(get_current_super_admin),
    include_inactive: bool = Query(False, description="Include inactive tenants")
) -> List[TenantResponse]:
    """
    List all tenants (super admin only).
    
    Args:
        request: FastAPI request object
        current_user: Current authenticated super admin user
        include_inactive: Whether to include inactive tenants
    
    Returns:
        List of tenants
    """
    try:
        tenants = tenant_service.list_tenants(
            user_id=current_user.id,
            include_inactive=include_inactive
        )
        return [TenantResponse(**tenant) for tenant in tenants]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error listing tenants: {str(e)}"
        )


@router.post("", response_model=TenantResponse)
@limiter.limit("10/minute")
async def create_tenant(
    request: Request,
    tenant_data: TenantCreate,
    current_user: User = Depends(get_current_super_admin)
) -> TenantResponse:
    """
    Create a new tenant (super admin only).
    
    Args:
        request: FastAPI request object
        tenant_data: Tenant creation data
        current_user: Current authenticated super admin user
    
    Returns:
        Created tenant
    """
    try:
        tenant_id = tenant_service.create_tenant(
            name=tenant_data.name,
            created_by=current_user.id
        )
        
        # Fetch created tenant
        tenants = tenant_service.list_tenants(current_user.id, include_inactive=True)
        created_tenant = next((t for t in tenants if t["id"] == tenant_id), None)
        
        if not created_tenant:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Tenant created but could not be retrieved"
            )
        
        return TenantResponse(**created_tenant)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating tenant: {str(e)}"
        )


@router.get("/{tenant_id}", response_model=TenantResponse)
@limiter.limit("30/minute")
async def get_tenant(
    request: Request,
    tenant_id: str,
    current_user: User = Depends(get_current_super_admin)
) -> TenantResponse:
    """
    Get tenant details (super admin only).
    
    Args:
        request: FastAPI request object
        tenant_id: Tenant ID
        current_user: Current authenticated super admin user
    
    Returns:
        Tenant details
    """
    try:
        tenants = tenant_service.list_tenants(current_user.id, include_inactive=True)
        tenant = next((t for t in tenants if t["id"] == tenant_id), None)
        
        if not tenant:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        return TenantResponse(**tenant)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting tenant: {str(e)}"
        )


@router.patch("/{tenant_id}", response_model=TenantResponse)
@limiter.limit("10/minute")
async def update_tenant(
    request: Request,
    tenant_id: str,
    tenant_data: TenantUpdate,
    current_user: User = Depends(get_current_super_admin)
) -> TenantResponse:
    """
    Update tenant (super admin only).
    
    Args:
        request: FastAPI request object
        tenant_id: Tenant ID
        tenant_data: Tenant update data
        current_user: Current authenticated super admin user
    
    Returns:
        Updated tenant
    """
    try:
        success = tenant_service.update_tenant(tenant_id, tenant_data.name)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        # Fetch updated tenant
        tenants = tenant_service.list_tenants(current_user.id, include_inactive=True)
        updated_tenant = next((t for t in tenants if t["id"] == tenant_id), None)
        
        if not updated_tenant:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Tenant updated but could not be retrieved"
            )
        
        return TenantResponse(**updated_tenant)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating tenant: {str(e)}"
        )


@router.post("/{tenant_id}/deactivate")
@limiter.limit("10/minute")
async def deactivate_tenant(
    request: Request,
    tenant_id: str,
    current_user: User = Depends(get_current_super_admin)
) -> Dict[str, str]:
    """
    Deactivate tenant (super admin only).
    
    Args:
        request: FastAPI request object
        tenant_id: Tenant ID
        current_user: Current authenticated super admin user
    
    Returns:
        Success message
    """
    try:
        success = tenant_service.deactivate_tenant(tenant_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        return {"message": "Tenant deactivated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deactivating tenant: {str(e)}"
        )


@router.post("/{tenant_id}/activate")
@limiter.limit("10/minute")
async def activate_tenant(
    request: Request,
    tenant_id: str,
    current_user: User = Depends(get_current_super_admin)
) -> Dict[str, str]:
    """
    Activate tenant (super admin only).
    
    Args:
        request: FastAPI request object
        tenant_id: Tenant ID
        current_user: Current authenticated super admin user
    
    Returns:
        Success message
    """
    try:
        success = tenant_service.activate_tenant(tenant_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant not found"
            )
        
        return {"message": "Tenant activated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error activating tenant: {str(e)}"
        )


@router.get("/{tenant_id}/users", response_model=List[TenantUserResponse])
@limiter.limit("30/minute")
async def get_tenant_users(
    request: Request,
    tenant_id: str,
    current_user: User = Depends(get_current_tenant_admin),
    include_inactive: bool = Query(False, description="Include inactive users")
) -> List[TenantUserResponse]:
    """
    Get users in a tenant (tenant admin or super admin).
    
    Args:
        request: FastAPI request object
        tenant_id: Tenant ID
        current_user: Current authenticated tenant admin or super admin
        include_inactive: Whether to include inactive users
    
    Returns:
        List of users in tenant
    """
    try:
        # Verify user can manage this tenant
        if not tenant_service.is_super_admin(current_user.id):
            if not tenant_service.can_manage_tenant(current_user.id, tenant_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to view users in this tenant"
                )
        
        users = tenant_service.get_tenant_users(tenant_id, include_inactive=include_inactive)
        return [TenantUserResponse(**user) for user in users]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error getting tenant users: {str(e)}"
        )


@router.post("/{tenant_id}/users", response_model=TenantUserResponse)
@limiter.limit("10/minute")
async def add_user_to_tenant(
    request: Request,
    tenant_id: str,
    user_data: TenantUserAdd,
    current_user: User = Depends(get_current_tenant_admin)
) -> TenantUserResponse:
    """
    Create and add user to tenant (tenant admin or super admin).
    Creates new user if they don't exist, or adds existing user to tenant.
    
    Args:
        request: FastAPI request object
        tenant_id: Tenant ID
        user_data: User data (email, full_name, role)
        current_user: Current authenticated tenant admin or super admin
    
    Returns:
        Created/added user
    """
    try:
        # Verify user can manage this tenant
        if not tenant_service.is_super_admin(current_user.id):
            if not tenant_service.can_manage_tenant(current_user.id, tenant_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to add users to this tenant"
                )
        
        # Validate email format
        import re
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, user_data.email):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid email format"
            )
        
        # Create user and add to tenant (or add existing user to tenant)
        try:
            user_id = tenant_service.create_user_and_add_to_tenant(
                email=user_data.email,
                password=user_data.password,
                tenant_id=tenant_id,
                role=user_data.role,
                full_name=user_data.full_name
            )
            
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Failed to create/add user to tenant. Check server logs for details."
                )
        except HTTPException:
            raise
        except Exception as e:
            error_msg = str(e)
            print(f"Error in add_user_to_tenant endpoint: {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to create/add user to tenant: {error_msg}"
            )
        
        # Fetch added user
        users = tenant_service.get_tenant_users(tenant_id, include_inactive=True)
        added_user = next((u for u in users if u["user_id"] == user_id), None)
        
        if not added_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User added but could not be retrieved"
            )
        
        return TenantUserResponse(**added_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error adding user to tenant: {str(e)}"
        )


@router.post("/{tenant_id}/users/{user_id}/deactivate")
@limiter.limit("10/minute")
async def deactivate_user_from_tenant(
    request: Request,
    tenant_id: str,
    user_id: str,
    current_user: User = Depends(get_current_tenant_admin)
) -> Dict[str, str]:
    """
    Deactivate user from tenant (tenant admin or super admin).
    
    Args:
        request: FastAPI request object
        tenant_id: Tenant ID
        user_id: User ID
        current_user: Current authenticated tenant admin or super admin
    
    Returns:
        Success message
    """
    try:
        # Verify user can manage this tenant
        if not tenant_service.is_super_admin(current_user.id):
            if not tenant_service.can_manage_tenant(current_user.id, tenant_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to deactivate users in this tenant"
                )
        
        success = tenant_service.deactivate_user_from_tenant(user_id, tenant_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User-tenant relationship not found"
            )
        
        return {"message": "User deactivated from tenant successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deactivating user from tenant: {str(e)}"
        )


@router.post("/{tenant_id}/users/{user_id}/activate")
@limiter.limit("10/minute")
async def activate_user_in_tenant(
    request: Request,
    tenant_id: str,
    user_id: str,
    current_user: User = Depends(get_current_tenant_admin)
) -> Dict[str, str]:
    """
    Activate user in tenant (tenant admin or super admin).
    
    Args:
        request: FastAPI request object
        tenant_id: Tenant ID
        user_id: User ID
        current_user: Current authenticated tenant admin or super admin
    
    Returns:
        Success message
    """
    try:
        # Verify user can manage this tenant
        if not tenant_service.is_super_admin(current_user.id):
            if not tenant_service.can_manage_tenant(current_user.id, tenant_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to activate users in this tenant"
                )
        
        success = tenant_service.activate_user_in_tenant(user_id, tenant_id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User-tenant relationship not found"
            )
        
        return {"message": "User activated in tenant successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error activating user in tenant: {str(e)}"
        )


@router.patch("/{tenant_id}/users/{user_id}/role", response_model=TenantUserResponse)
@limiter.limit("10/minute")
async def update_user_tenant_role(
    request: Request,
    tenant_id: str,
    user_id: str,
    role_data: TenantUserRoleUpdate,
    current_user: User = Depends(get_current_tenant_admin)
) -> TenantUserResponse:
    """
    Update user role in tenant (tenant admin or super admin).
    
    Args:
        request: FastAPI request object
        tenant_id: Tenant ID
        user_id: User ID
        role_data: New role data
        current_user: Current authenticated tenant admin or super admin
    
    Returns:
        Updated user
    """
    try:
        # Verify user can manage this tenant
        if not tenant_service.is_super_admin(current_user.id):
            if not tenant_service.can_manage_tenant(current_user.id, tenant_id):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to update user roles in this tenant"
                )
        
        success = tenant_service.update_user_tenant_role(
            user_id=user_id,
            tenant_id=tenant_id,
            role=role_data.role
        )
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User-tenant relationship not found"
            )
        
        # Fetch updated user
        users = tenant_service.get_tenant_users(tenant_id, include_inactive=True)
        updated_user = next((u for u in users if u["user_id"] == user_id), None)
        
        if not updated_user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="User role updated but could not be retrieved"
            )
        
        return TenantUserResponse(**updated_user)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating user role: {str(e)}"
        )


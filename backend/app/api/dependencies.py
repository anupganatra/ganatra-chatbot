"""API dependencies for authentication and rate limiting."""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.services.auth import auth_service
from app.services.tenant import tenant_service
from app.models.user import TokenData, User

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> User:
    """
    Dependency to get current authenticated user.
    
    Args:
        credentials: HTTP Bearer token credentials
    
    Returns:
        User object
    
    Raises:
        HTTPException: If authentication fails
    """
    token = credentials.credentials
    token_data = auth_service.verify_token(token)
    
    if token_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = auth_service.get_user(token_data.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    
    return user


async def get_current_admin_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to ensure user has admin role (super admin or admin).
    Role is read from user_metadata.role.
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        User object (admin)
    
    Raises:
        HTTPException: If user is not admin
    """
    # Check role from user_metadata (already set in current_user.role)
    if current_user.role not in ('admin', 'super_admin'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Admin role required."
        )
    
    return current_user


async def get_current_user_tenant(
    current_user: User = Depends(get_current_user)
) -> str:
    """
    Dependency to get current user's tenant_id.
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        Tenant ID string
    
    Raises:
        HTTPException: If user has no tenant or tenant is inactive
    """
    tenant_id = tenant_service.get_user_tenant(current_user.id)
    
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an active tenant."
        )
    
    # Verify tenant is active
    if not tenant_service.is_tenant_active(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User's tenant is inactive."
        )
    
    return tenant_id


async def get_current_user_tenant_optional(
    current_user: User = Depends(get_current_user)
) -> Optional[str]:
    """
    Dependency to get current user's tenant_id (optional for super admins).
    Super admins can pass None to view all companies' data.
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        Tenant ID string or None for super admins
    
    Raises:
        HTTPException: If regular user has no tenant or tenant is inactive
    """
    # Super admins don't need a tenant
    if tenant_service.is_super_admin(current_user.id):
        return None
    
    tenant_id = tenant_service.get_user_tenant(current_user.id)
    
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an active tenant."
        )
    
    # Verify tenant is active
    if not tenant_service.is_tenant_active(tenant_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User's tenant is inactive."
        )
    
    return tenant_id


async def get_current_super_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to ensure user is a super admin.
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        User object (super admin)
    
    Raises:
        HTTPException: If user is not super admin
    """
    if not tenant_service.is_super_admin(current_user.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Super admin role required."
        )
    
    return current_user


async def get_current_tenant_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """
    Dependency to ensure user is a tenant admin or super admin.
    Role is read from user_metadata.role.
    Super admins don't need a tenant, regular admins need to be in a tenant.
    
    Args:
        current_user: Current authenticated user
    
    Returns:
        User object (tenant admin or super admin)
    
    Raises:
        HTTPException: If user is not tenant admin or super admin
    """
    # Super admins can manage any tenant (no tenant required)
    if current_user.role == 'super_admin':
        return current_user
    
    # For regular admins, check role from user_metadata
    if current_user.role != 'admin':
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions. Tenant admin role required."
        )
    
    # Verify regular admin has an active tenant
    tenant_id = tenant_service.get_user_tenant(current_user.id)
    if tenant_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with an active tenant."
        )
    
    return current_user



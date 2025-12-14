"""Pydantic models for tenant management."""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class TenantCreate(BaseModel):
    """Request model for creating a tenant."""
    name: str = Field(..., min_length=1, max_length=255, description="Tenant name")


class TenantUpdate(BaseModel):
    """Request model for updating a tenant."""
    name: str = Field(..., min_length=1, max_length=255, description="Tenant name")


class TenantResponse(BaseModel):
    """Response model for tenant information."""
    id: str
    name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class TenantUserAdd(BaseModel):
    """Request model for creating and adding a user to a tenant."""
    email: str = Field(..., description="User email address")
    password: str = Field(..., min_length=6, description="User password (minimum 6 characters)")
    full_name: Optional[str] = Field(None, description="User's full name")
    role: str = Field(..., pattern="^(admin|user)$", description="User role in tenant (admin or user)")


class TenantUserRoleUpdate(BaseModel):
    """Request model for updating a user's role in a tenant."""
    role: str = Field(..., pattern="^(admin|user)$", description="New user role (admin or user)")


class TenantUserResponse(BaseModel):
    """Response model for tenant user information."""
    user_id: str
    email: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: Optional[datetime] = None
    deactivated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class TenantDeactivateRequest(BaseModel):
    """Request model for deactivating a tenant."""
    pass  # No additional fields needed


class TenantActivateRequest(BaseModel):
    """Request model for activating a tenant."""
    pass  # No additional fields needed


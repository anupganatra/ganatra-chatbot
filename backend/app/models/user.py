"""Pydantic models for user and authentication."""
from typing import Optional
from pydantic import BaseModel, Field


class User(BaseModel):
    """User model."""
    id: str = Field(..., description="User ID from Supabase")
    email: str = Field(..., description="User email")
    role: str = Field(..., description="User role: 'super_admin', 'admin' (tenant admin), or 'user'. Admin role is determined by tenant admin status, not user_metadata.")
    fullName: Optional[str] = Field(None, description="User's full name from user_metadata")


class TokenData(BaseModel):
    """Token data extracted from JWT."""
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None



"""Pydantic models for user and authentication."""
from typing import Optional
from pydantic import BaseModel, Field


class User(BaseModel):
    """User model."""
    id: str = Field(..., description="User ID from Supabase")
    email: str = Field(..., description="User email")
    role: str = Field(..., description="User role: 'admin' or 'user'")


class TokenData(BaseModel):
    """Token data extracted from JWT."""
    user_id: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None



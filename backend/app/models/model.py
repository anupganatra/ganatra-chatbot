"""Pydantic models for available models."""
from typing import Optional
from pydantic import BaseModel, Field
from datetime import datetime


class AvailableModel(BaseModel):
    """Available model for chat."""
    id: str
    model_id: str = Field(..., description="Model identifier (e.g., 'gemini-2.5-flash' or 'openrouter/meta-llama/llama-3.2-3b-instruct:free')")
    provider: str = Field(..., description="Provider: 'gemini' or 'openrouter'")
    name: str = Field(..., description="Display name")
    description: Optional[str] = Field(None, description="Model description")
    is_free: bool = Field(False, description="Whether the model is free")
    is_active: bool = Field(True, description="Whether the model is active and available to users")
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class AvailableModelCreate(BaseModel):
    """Model for creating a new available model."""
    model_id: str
    provider: str
    name: str
    description: Optional[str] = None
    is_free: bool = False
    is_active: bool = True


class AvailableModelUpdate(BaseModel):
    """Model for updating an available model."""
    name: Optional[str] = None
    description: Optional[str] = None
    is_free: Optional[bool] = None
    is_active: Optional[bool] = None


class OpenRouterModel(BaseModel):
    """Model from OpenRouter API."""
    id: str
    name: str
    description: Optional[str] = None
    pricing: Optional[dict] = None


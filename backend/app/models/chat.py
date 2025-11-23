"""Pydantic models for chat requests and responses."""
from typing import Optional, List
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    """Single chat message."""
    role: str = Field(..., description="Message role: 'user' or 'assistant'")
    content: str = Field(..., description="Message content")


class ChatRequest(BaseModel):
    """Chat request model."""
    message: str = Field(..., min_length=1, max_length=5000, description="User message")
    conversation_id: Optional[str] = Field(None, description="Optional conversation ID for context")
    stream: bool = Field(True, description="Whether to stream the response")


class ChatResponse(BaseModel):
    """Chat response model."""
    response: str = Field(..., description="Assistant response")
    conversation_id: Optional[str] = Field(None, description="Conversation ID")
    sources: Optional[List[dict]] = Field(None, description="Retrieved document sources")
    similarity_scores: Optional[List[float]] = Field(None, description="Similarity scores for retrieved chunks")


class ChatStreamChunk(BaseModel):
    """Streaming chat chunk."""
    content: str = Field(..., description="Chunk content")
    done: bool = Field(False, description="Whether this is the final chunk")



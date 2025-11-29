"""LLM service supporting multiple providers (Gemini, OpenRouter)."""
from typing import AsyncGenerator, List, Dict, Optional
from app.config import settings
from app.services.providers.gemini_provider import GeminiProvider
from app.services.providers.openrouter_provider import OpenRouterProvider
from app.services.providers.base_provider import BaseLLMProvider


class LLMService:
    """Service for interacting with multiple LLM providers."""
    
    def __init__(self):
        # Default provider (Gemini)
        self._default_provider = GeminiProvider()
        self._provider_cache: Dict[str, BaseLLMProvider] = {}
    
    def _get_provider(self, model_id: Optional[str] = None) -> BaseLLMProvider:
        """
        Get the appropriate provider for the given model_id.
        
        Args:
            model_id: Model identifier (e.g., "gemini-2.5-flash" or "openrouter/meta-llama/llama-3.2-3b-instruct:free")
        
        Returns:
            LLM provider instance
        """
        # If no model_id, use default Gemini
        if not model_id:
            return self._default_provider
        
        # Check cache first
        if model_id in self._provider_cache:
            return self._provider_cache[model_id]
        
        # Determine provider based on model_id
        if model_id.startswith("openrouter/") or model_id.startswith("openai/") or "/" in model_id:
            # OpenRouter model
            provider = OpenRouterProvider(model_id)
        elif model_id.startswith("gemini-") or model_id in ["gemini-pro", "gemini-2.5-flash"]:
            # Gemini model - extract model name if needed
            provider = GeminiProvider(model_id)
        else:
            # Default to Gemini with the model_id as the model name
            provider = GeminiProvider(model_id)
        
        # Cache the provider
        self._provider_cache[model_id] = provider
        return provider
    
    def generate_response(
        self,
        query: str,
        context: List[Dict[str, str]] = None,
        stream: bool = False,
        model_id: Optional[str] = None
    ) -> str:
        """
        Generate response from LLM.
        
        Args:
            query: User query
            context: List of context chunks with 'text' and 'metadata'
            stream: Whether to stream the response
            model_id: Optional model identifier
        
        Returns:
            Generated response text
        """
        provider = self._get_provider(model_id)
        return provider.generate_response(query, context, stream)
    
    async def generate_response_stream(
        self,
        query: str,
        context: List[Dict[str, str]] = None,
        model_id: Optional[str] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate streaming response from LLM.
        
        Args:
            query: User query
            context: List of context chunks
            model_id: Optional model identifier
        
        Yields:
            Response chunks as strings
        """
        provider = self._get_provider(model_id)
        async for chunk in provider.generate_response_stream(query, context):
            yield chunk


# Global LLM service instance
llm_service = LLMService()



"""Base class for LLM providers."""
from abc import ABC, abstractmethod
from typing import AsyncGenerator, List, Dict


class BaseLLMProvider(ABC):
    """Abstract base class for LLM providers."""
    
    @abstractmethod
    def generate_response(
        self,
        query: str,
        context: List[Dict[str, str]] = None,
        stream: bool = False
    ) -> str:
        """Generate response from LLM."""
        pass
    
    @abstractmethod
    async def generate_response_stream(
        self,
        query: str,
        context: List[Dict[str, str]] = None
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response from LLM."""
        pass
    
    @abstractmethod
    def _build_prompt(self, query: str, context: List[Dict[str, str]] = None) -> str:
        """Build prompt with context for RAG."""
        pass


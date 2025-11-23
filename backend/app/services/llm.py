"""LLM service using Google Gemini."""
import google.generativeai as genai
from typing import AsyncGenerator, List, Dict
from app.config import settings


class LLMService:
    """Service for interacting with Gemini LLM."""
    
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_MODEL)
    
    def generate_response(
        self,
        query: str,
        context: List[Dict[str, str]] = None,
        stream: bool = False
    ) -> str:
        """
        Generate response from LLM.
        
        Args:
            query: User query
            context: List of context chunks with 'text' and 'metadata'
            stream: Whether to stream the response
        
        Returns:
            Generated response text
        """
        # Build prompt with context
        prompt = self._build_prompt(query, context)
        
        try:
            if stream:
                # For streaming, we'll handle it differently
                response = self.model.generate_content(
                    prompt,
                    stream=True
                )
                return response
            
            response = self.model.generate_content(prompt)
            return response.text
        
        except Exception as e:
            raise ValueError(f"Error generating response: {str(e)}")
    
    async def generate_response_stream(
        self,
        query: str,
        context: List[Dict[str, str]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Generate streaming response from LLM.
        
        Args:
            query: User query
            context: List of context chunks
        
        Yields:
            Response chunks as strings
        """
        prompt = self._build_prompt(query, context)
        
        try:
            response = self.model.generate_content(
                prompt,
                stream=True
            )
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        
        except Exception as e:
            raise ValueError(f"Error generating stream: {str(e)}")
    
    def _build_prompt(self, query: str, context: List[Dict[str, str]] = None) -> str:
        """
        Build prompt with context for RAG.
        
        Args:
            query: User query
            context: List of context chunks
        
        Returns:
            Formatted prompt string
        """
        system_prompt = """You are a helpful AI assistant that answers questions based on the provided context documents.
        
If the context contains relevant information, use it to answer the question accurately.
If the context doesn't contain enough information, say so and provide a general answer if possible.
Always cite which document or source you're using when referencing information from the context.

Be concise, accurate, and helpful."""

        if context and len(context) > 0:
            context_text = "\n\n".join([
                f"[Document: {chunk.get('metadata', {}).get('filename', 'Unknown')}]\n{chunk.get('text', '')}"
                for chunk in context
            ])
            
            prompt = f"""{system_prompt}

Context Documents:
{context_text}

Question: {query}

Answer:"""
        else:
            prompt = f"""{system_prompt}

Question: {query}

Answer:"""
        
        return prompt


# Global LLM service instance
llm_service = LLMService()



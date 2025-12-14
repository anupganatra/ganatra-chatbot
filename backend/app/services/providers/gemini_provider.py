"""Gemini LLM provider implementation."""
import google.generativeai as genai
from typing import AsyncGenerator, List, Dict
from app.config import settings
from app.services.providers.base_provider import BaseLLMProvider


class GeminiProvider(BaseLLMProvider):
    """Provider for Google Gemini LLM."""
    
    def __init__(self, model_name: str = None):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(model_name or settings.GEMINI_MODEL)
    
    def generate_response(
        self,
        query: str,
        context: List[Dict[str, str]] = None,
        stream: bool = False
    ) -> str:
        """Generate response from Gemini."""
        prompt = self._build_prompt(query, context)
        
        try:
            if stream:
                response = self.model.generate_content(prompt, stream=True)
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
        """Generate streaming response from Gemini."""
        prompt = self._build_prompt(query, context)
        
        try:
            response = self.model.generate_content(prompt, stream=True)
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
        
        except Exception as e:
            raise ValueError(f"Error generating stream: {str(e)}")
    
    def _build_prompt(self, query: str, context: List[Dict[str, str]] = None) -> str:
        """Build prompt with context for RAG."""
        system_prompt = """You are a helpful AI assistant that answers questions based ONLY on the provided context documents.
        
If the context contains relevant information, use it to answer the question accurately.
If the context does NOT contain enough information to answer the question, ONLY say that you couldn't find the information in the provided documents. Do NOT provide general answers or use your own knowledge.
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


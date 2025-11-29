"""OpenRouter LLM provider implementation."""
import httpx
import json
from typing import AsyncGenerator, List, Dict
from app.config import settings
from app.services.providers.base_provider import BaseLLMProvider


class OpenRouterProvider(BaseLLMProvider):
    """Provider for OpenRouter LLM API."""
    
    def __init__(self, model_id: str):
        self.model_id = model_id
        self.api_key = settings.OPENROUTER_API_KEY
        self.base_url = settings.OPENROUTER_BASE_URL
        
        if not self.api_key:
            raise ValueError("OPENROUTER_API_KEY is not set")
    
    def generate_response(
        self,
        query: str,
        context: List[Dict[str, str]] = None,
        stream: bool = False
    ) -> str:
        """Generate response from OpenRouter (non-streaming)."""
        prompt = self._build_prompt(query, context)
        
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant that answers questions based on the provided context documents."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            with httpx.Client(timeout=60.0) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://github.com/your-repo",  # Optional
                        "X-Title": "AI Chatbot"  # Optional
                    },
                    json={
                        "model": self.model_id,
                        "messages": messages,
                        "stream": False
                    }
                )
                response.raise_for_status()
                data = response.json()
                return data["choices"][0]["message"]["content"]
        
        except httpx.HTTPStatusError as e:
            raise ValueError(f"OpenRouter API error: {e.response.text}")
        except Exception as e:
            raise ValueError(f"Error generating response: {str(e)}")
    
    async def generate_response_stream(
        self,
        query: str,
        context: List[Dict[str, str]] = None
    ) -> AsyncGenerator[str, None]:
        """Generate streaming response from OpenRouter."""
        prompt = self._build_prompt(query, context)
        
        messages = [
            {"role": "system", "content": "You are a helpful AI assistant that answers questions based on the provided context documents."},
            {"role": "user", "content": prompt}
        ]
        
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                async with client.stream(
                    "POST",
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://github.com/your-repo",
                        "X-Title": "AI Chatbot"
                    },
                    json={
                        "model": self.model_id,
                        "messages": messages,
                        "stream": True
                    }
                ) as response:
                    response.raise_for_status()
                    
                    async for line in response.aiter_lines():
                        if not line.strip():
                            continue
                        
                        if line.startswith("data: "):
                            data_str = line[6:]  # Remove "data: " prefix
                            
                            if data_str == "[DONE]":
                                break
                            
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and len(data["choices"]) > 0:
                                    delta = data["choices"][0].get("delta", {})
                                    content = delta.get("content", "")
                                    if content:
                                        yield content
                            except json.JSONDecodeError:
                                continue
        
        except httpx.HTTPStatusError as e:
            error_text = await e.response.aread() if hasattr(e.response, 'aread') else str(e.response.text)
            raise ValueError(f"OpenRouter API error: {error_text}")
        except Exception as e:
            raise ValueError(f"Error generating stream: {str(e)}")
    
    def _build_prompt(self, query: str, context: List[Dict[str, str]] = None) -> str:
        """Build prompt with context for RAG."""
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
            
            prompt = f"""Context Documents:
{context_text}

Question: {query}

Answer:"""
        else:
            prompt = f"""Question: {query}

Answer:"""
        
        return prompt


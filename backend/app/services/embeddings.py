"""Embedding generation service using Gemini."""
import google.generativeai as genai
from typing import List
from app.config import settings


class EmbeddingService:
    """Service for generating embeddings using Gemini."""
    
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel(settings.GEMINI_EMBEDDING_MODEL)
    
    def generate_embedding(self, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        
        Args:
            text: Text to embed
        
        Returns:
            List of floats representing the embedding
        """
        try:
            # Use Gemini embedding model
            result = genai.embed_content(
                model=settings.GEMINI_EMBEDDING_MODEL,
                content=text,
                task_type="retrieval_document"
            )
            return result['embedding']
        
        except Exception as e:
            raise ValueError(f"Error generating embedding: {str(e)}")
    
    def generate_embeddings_batch(self, texts: List[str]) -> List[List[float]]:
        """
        Generate embeddings for multiple texts.
        
        Args:
            texts: List of texts to embed
        
        Returns:
            List of embeddings
        """
        embeddings = []
        for text in texts:
            embedding = self.generate_embedding(text)
            embeddings.append(embedding)
        return embeddings
    
    def generate_query_embedding(self, query: str) -> List[float]:
        """
        Generate embedding for a search query.
        
        Args:
            query: Search query text
        
        Returns:
            Query embedding
        """
        try:
            result = genai.embed_content(
                model=settings.GEMINI_EMBEDDING_MODEL,
                content=query,
                task_type="retrieval_query"
            )
            return result['embedding']
        
        except Exception as e:
            raise ValueError(f"Error generating query embedding: {str(e)}")


# Global embedding service instance
embedding_service = EmbeddingService()



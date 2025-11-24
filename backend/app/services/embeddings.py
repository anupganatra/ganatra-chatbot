"""Embedding generation service using Gemini."""
import google.generativeai as genai
from typing import List
from app.config import settings


class EmbeddingService:
    """Service for generating embeddings using Gemini."""
    
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
    
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
    
    def generate_embeddings_batch_old(self, texts: List[str]) -> List[List[float]]:
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

    def generate_embeddings_batch(self, texts: List[str], batch_size: int = 100) -> List[List[float]]:
        """
        Generate embeddings for multiple texts in true batches.
        
        Args:
            texts: List of texts to embed
            batch_size: Number of texts to embed in a single API call
        
        Returns:
            List of embeddings
        """
        if not texts:
            return []
        
        all_embeddings = []
        
        # Process in batches to handle API limits
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            try:
                # Single API call for entire batch
                result = genai.embed_content(
                    model=settings.GEMINI_EMBEDDING_MODEL,
                    content=batch,  # ← Send list of texts, not single text
                    task_type="retrieval_document"
                )
                
                # Handle response - it returns a list of embeddings
                if isinstance(result['embedding'][0], list):
                    # Multiple embeddings returned as list of lists
                    all_embeddings.extend(result['embedding'])
                else:
                    # Single embedding returned (shouldn't happen with batch)
                    all_embeddings.append(result['embedding'])
                    
            except Exception as e:
                raise ValueError(f"Error generating embeddings for batch: {str(e)}")
        
        return all_embeddings

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



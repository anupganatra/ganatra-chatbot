"""RAG pipeline orchestration service."""
from typing import List, Dict, Optional
from app.services.embeddings import embedding_service
from app.services.llm import llm_service
from app.services.qdrant import qdrant_service
from app.config import settings


class RAGService:
    """Service for orchestrating the RAG pipeline."""
    
    def retrieve_context(
        self,
        query: str,
        top_k: int = None,
        score_threshold: float = None,
        document_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Retrieve relevant context chunks for a query.
        
        Args:
            query: User query
            top_k: Number of chunks to retrieve
            score_threshold: Minimum similarity score
            document_id: Optional document filter
        
        Returns:
            List of relevant chunks with metadata
        """
        # Generate query embedding
        query_embedding = embedding_service.generate_query_embedding(query)
        
        # Search Qdrant
        results = qdrant_service.search(
            query_embedding=query_embedding,
            top_k=top_k or settings.TOP_K,
            score_threshold=score_threshold or settings.SIMILARITY_THRESHOLD,
            document_id=document_id
        )
        
        return results
    
    def generate_answer(
        self,
        query: str,
        context: Optional[List[Dict]] = None,
        stream: bool = False,
        model_id: Optional[str] = None
    ) -> str:
        """
        Generate answer using RAG pipeline.
        
        Args:
            query: User query
            context: Optional pre-retrieved context
            stream: Whether to stream the response
            model_id: Optional model ID to use
        
        Returns:
            Generated answer
        """
        # Retrieve context if not provided
        if context is None:
            context = self.retrieve_context(query)
        
        # Format context for LLM
        formatted_context = [
            {
                "text": result["text"],
                "metadata": result["metadata"]
            }
            for result in context
        ]
        
        # Generate response
        response = llm_service.generate_response(
            query=query,
            context=formatted_context,
            stream=stream,
            model_id=model_id
        )
        
        return response
    
    async def generate_answer_stream(
        self,
        query: str,
        context: Optional[List[Dict]] = None,
        model_id: Optional[str] = None
    ):
        """
        Generate streaming answer using RAG pipeline.
        
        Args:
            query: User query
            context: Optional pre-retrieved context
            model_id: Optional model ID to use
        
        Yields:
            Response chunks
        """
        # Retrieve context if not provided
        if context is None:
            context = self.retrieve_context(query)
        
        # Format context for LLM
        formatted_context = [
            {
                "text": result["text"],
                "metadata": result["metadata"]
            }
            for result in context
        ]
        
        # Generate streaming response
        async for chunk in llm_service.generate_response_stream(
            query=query,
            context=formatted_context,
            model_id=model_id
        ):
            yield chunk


# Global RAG service instance
rag_service = RAGService()



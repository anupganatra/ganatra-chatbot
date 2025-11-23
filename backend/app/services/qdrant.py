"""Qdrant vector database service."""
from typing import List, Dict, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import (
    Distance,
    VectorParams,
    PointStruct,
    Filter,
    FieldCondition,
    MatchValue
)
from app.config import settings
import uuid


class QdrantService:
    """Service for interacting with Qdrant vector database."""
    
    def __init__(self):
        self.client = QdrantClient(
            url=settings.QDRANT_URL,
            api_key=settings.QDRANT_API_KEY
        )
        self.collection_name = settings.QDRANT_COLLECTION_NAME
        self._ensure_collection_exists()
    
    def _ensure_collection_exists(self):
        """Create collection if it doesn't exist."""
        try:
            collections = self.client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name not in collection_names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=768,  # Gemini embedding dimension
                        distance=Distance.COSINE
                    )
                )
        except Exception as e:
            print(f"Error ensuring collection exists: {e}")
    
    def upsert_chunks(
        self,
        chunks: List[Dict],
        embeddings: List[List[float]],
        document_id: str
    ) -> int:
        """
        Upsert document chunks with embeddings.
        
        Args:
            chunks: List of chunk dictionaries with 'text' and 'metadata'
            embeddings: List of embeddings for each chunk
            document_id: Document ID
        
        Returns:
            Number of points upserted
        """
        if len(chunks) != len(embeddings):
            raise ValueError("Number of chunks must match number of embeddings")
        
        points = []
        for idx, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            point_id = str(uuid.uuid4())
            
            points.append(
                PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload={
                        "text": chunk["text"],
                        "document_id": document_id,
                        "filename": chunk["metadata"]["filename"],
                        "chunk_index": chunk["metadata"]["chunk_index"],
                        "total_chunks": chunk["metadata"]["total_chunks"]
                    }
                )
            )
        
        try:
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            return len(points)
        
        except Exception as e:
            raise ValueError(f"Error upserting chunks: {str(e)}")
    
    def search(
        self,
        query_embedding: List[float],
        top_k: int = None,
        score_threshold: float = None,
        document_id: Optional[str] = None
    ) -> List[Dict]:
        """
        Search for similar chunks.
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            score_threshold: Minimum similarity score
            document_id: Optional filter by document ID
        
        Returns:
            List of search results with 'text', 'metadata', and 'score'
        """
        top_k = top_k or settings.TOP_K
        score_threshold = score_threshold or settings.SIMILARITY_THRESHOLD
        
        # Build filter if document_id is provided
        query_filter = None
        if document_id:
            query_filter = Filter(
                must=[
                    FieldCondition(
                        key="document_id",
                        match=MatchValue(value=document_id)
                    )
                ]
            )
        
        try:
            results = self.client.query_points(
                collection_name=self.collection_name,
                query=query_embedding,     # vector
                limit=top_k,
                score_threshold=score_threshold,
                query_filter=query_filter
            )
            
            formatted_results = []
            for result in results.points:
                formatted_results.append({
                    "text": result.payload.get("text", ""),
                    "metadata": {
                        "document_id": result.payload.get("document_id"),
                        "filename": result.payload.get("filename"),
                        "chunk_index": result.payload.get("chunk_index"),
                        "score": result.score
                    },
                    "score": result.score
                })
            
            return formatted_results
        
        except Exception as e:
            raise ValueError(f"Error searching: {str(e)}")
    
    def delete_document(self, document_id: str) -> int:
        """
        Delete all chunks for a document.
        
        Args:
            document_id: Document ID to delete
        
        Returns:
            Number of points deleted
        """
        try:
            # First, get all points for this document
            scroll_result = self.client.scroll(
                collection_name=self.collection_name,
                scroll_filter=Filter(
                    must=[
                        FieldCondition(
                            key="document_id",
                            match=MatchValue(value=document_id)
                        )
                    ]
                ),
                limit=10000  # Adjust based on your needs
            )
            
            if scroll_result[0]:
                point_ids = [point.id for point in scroll_result[0]]
                self.client.delete(
                    collection_name=self.collection_name,
                    points_selector=point_ids
                )
                return len(point_ids)
            
            return 0
        
        except Exception as e:
            raise ValueError(f"Error deleting document: {str(e)}")
    
    def get_collection_info(self) -> Dict:
        """
        Get information about the collection.
        
        Returns:
            Dictionary with collection information
        """
        try:
            collection_info = self.client.get_collection(self.collection_name)
            return {
                "name": collection_info.name,
                "points_count": collection_info.points_count,
                "vectors_count": collection_info.vectors_count
            }
        except Exception as e:
            raise ValueError(f"Error getting collection info: {str(e)}")


# Global Qdrant service instance
qdrant_service = QdrantService()



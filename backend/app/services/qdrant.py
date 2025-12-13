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
            # Ensure there's a payload index on `document_id` to allow filtered operations
            try:
                # Attempt to create a payload index for `document_id` as a keyword
                # This operation is idempotent on recent qdrant-client versions; if the
                # index already exists the server may return an error which we ignore.
                self.client.create_payload_index(
                    collection_name=self.collection_name,
                    field_name="document_id",
                    field_schema="keyword",
                    wait=True,
                )
            except Exception:
                # Don't raise here — lack of index will be surfaced during operations,
                # but best-effort create above improves behavior for new deployments.
                pass
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
            score_threshold: Minimum similarity score (None to use default, or set to 0 to disable)
            document_id: Optional filter by document ID
        
        Returns:
            List of search results with 'text', 'metadata', and 'score'
        """
        top_k = top_k or settings.TOP_K
        # Use provided threshold, or default from settings, but allow None to disable
        use_threshold = score_threshold if score_threshold is not None else settings.SIMILARITY_THRESHOLD
        
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
            # Build query parameters
            query_params = {
                "collection_name": self.collection_name,
                "query": query_embedding,
                "limit": top_k,
                "query_filter": query_filter
            }
            
            # Only add score_threshold if it's set (not None and not 0)
            # For cosine similarity, threshold of 0 means no filtering
            if use_threshold and use_threshold > 0:
                query_params["score_threshold"] = use_threshold
            
            results = self.client.query_points(**query_params)
            
            # Handle different response formats
            points = []
            if hasattr(results, 'points'):
                points = results.points
            elif isinstance(results, (list, tuple)):
                points = results
            elif hasattr(results, '__iter__'):
                points = list(results)
            
            formatted_results = []
            for result in points:
                # Handle different result object formats
                if hasattr(result, 'payload') and hasattr(result, 'score'):
                    # Standard Qdrant result object
                    payload = result.payload
                    score = result.score
                elif isinstance(result, dict):
                    # Dictionary format
                    payload = result.get('payload', result)
                    score = result.get('score', 0.0)
                else:
                    continue
                
                text = payload.get("text", "") if isinstance(payload, dict) else getattr(payload, 'text', '')
                if not text:
                    continue
                
                formatted_results.append({
                    "text": text,
                    "metadata": {
                        "document_id": payload.get("document_id") if isinstance(payload, dict) else getattr(payload, 'document_id', None),
                        "filename": payload.get("filename") if isinstance(payload, dict) else getattr(payload, 'filename', ''),
                        "chunk_index": payload.get("chunk_index") if isinstance(payload, dict) else getattr(payload, 'chunk_index', None),
                        "score": score
                    },
                    "score": score
                })
            
            # If no results with threshold, try without threshold (lower threshold)
            if not formatted_results and use_threshold and use_threshold > 0:
                print(f"⚠️ No results with threshold {use_threshold}, trying with lower threshold (0.5)...")
                query_params_lower = query_params.copy()
                query_params_lower["score_threshold"] = 0.5
                results_lower = self.client.query_points(**query_params_lower)
                
                points_lower = []
                if hasattr(results_lower, 'points'):
                    points_lower = results_lower.points
                elif isinstance(results_lower, (list, tuple)):
                    points_lower = results_lower
                
                for result in points_lower:
                    if hasattr(result, 'payload') and hasattr(result, 'score'):
                        payload = result.payload
                        score = result.score
                    elif isinstance(result, dict):
                        payload = result.get('payload', result)
                        score = result.get('score', 0.0)
                    else:
                        continue
                    
                    text = payload.get("text", "") if isinstance(payload, dict) else getattr(payload, 'text', '')
                    if text:
                        formatted_results.append({
                            "text": text,
                            "metadata": {
                                "document_id": payload.get("document_id") if isinstance(payload, dict) else getattr(payload, 'document_id', None),
                                "filename": payload.get("filename") if isinstance(payload, dict) else getattr(payload, 'filename', ''),
                                "chunk_index": payload.get("chunk_index") if isinstance(payload, dict) else getattr(payload, 'chunk_index', None),
                                "score": score
                            },
                            "score": score
                        })
            
            return formatted_results
        
        except Exception as e:
            print(f"❌ Error in Qdrant search: {str(e)}")
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
            # First, get all points for this document. `scroll` may return different
            # shapes depending on client version/transport (tuple, object with `.points`, etc.)
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

            # Normalize returned points list
            points_list = []
            if isinstance(scroll_result, tuple) or isinstance(scroll_result, list):
                # older client: (points, next_page_position)
                if len(scroll_result) > 0 and scroll_result[0]:
                    points_list = scroll_result[0]
            elif hasattr(scroll_result, "points"):
                points_list = scroll_result.points or []
            elif isinstance(scroll_result, dict) and "points" in scroll_result:
                points_list = scroll_result.get("points", [])

            if not points_list:
                return 0

            # Extract ids (points may be objects or dicts)
            point_ids = []
            for p in points_list:
                pid = None
                if hasattr(p, "id"):
                    pid = p.id
                elif isinstance(p, dict):
                    pid = p.get("id") or p.get("point_id")
                if pid is not None:
                    point_ids.append(pid)

            if not point_ids:
                return 0

            # Delete by ids
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=point_ids
            )

            return len(point_ids)

        except Exception as e:
            # If the server complains about missing payload index, provide actionable message
            msg = str(e)
            if "Index required" in msg or "index required" in msg.lower() or "Index required" in getattr(e, 'message', ''):
                raise ValueError("Error deleting document: missing payload index for 'document_id' in Qdrant. Create a payload index for 'document_id' (keyword/uuid) or enable automatic index creation.")
            raise ValueError(f"Error deleting document: {str(e)}")
    
    def get_collection_info(self) -> Dict:
        """
        Get information about the collection.
        
        Returns:
            Dictionary with collection information
        """
        try:
            collection_info = self.client.get_collection(self.collection_name)
            # Handle different Qdrant client versions - some have vectors_count, some have indexed_vectors_count
            vectors_count = getattr(collection_info, 'vectors_count', None)
            if vectors_count is None:
                vectors_count = getattr(collection_info, 'indexed_vectors_count', 0)
            points_count = getattr(collection_info, 'points_count', 0)
            
            return {
                "name": self.collection_name,
                "points_count": points_count,
                "vectors_count": vectors_count
            }
        except Exception as e:
            raise ValueError(f"Error getting collection info: {str(e)}")


# Global Qdrant service instance
qdrant_service = QdrantService()



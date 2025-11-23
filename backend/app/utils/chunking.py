"""Text chunking utilities."""
from typing import List
from app.config import settings


def chunk_text(text: str, chunk_size: int = None, chunk_overlap: int = None) -> List[str]:
    """
    Split text into chunks with overlap.
    
    Args:
        text: Text to chunk
        chunk_size: Size of each chunk (defaults to config)
        chunk_overlap: Overlap between chunks (defaults to config)
    
    Returns:
        List of text chunks
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
    
    if len(text) <= chunk_size:
        return [text]
    
    chunks = []
    start = 0
    
    while start < len(text):
        end = start + chunk_size
        
        # Try to break at sentence boundary
        if end < len(text):
            # Look for sentence endings
            for punct in ['. ', '.\n', '! ', '!\n', '? ', '?\n']:
                last_punct = text.rfind(punct, start, end)
                if last_punct != -1:
                    end = last_punct + 2
                    break
            # If no sentence boundary, try paragraph break
            if end == start + chunk_size:
                last_newline = text.rfind('\n\n', start, end)
                if last_newline != -1:
                    end = last_newline + 2
                else:
                    last_newline = text.rfind('\n', start, end)
                    if last_newline != -1:
                        end = last_newline + 1
        
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        # Move start position with overlap
        start = end - chunk_overlap
        if start >= len(text):
            break
    
    return chunks


def chunk_text_with_metadata(
    text: str,
    document_id: str,
    filename: str,
    chunk_size: int = None,
    chunk_overlap: int = None
) -> List[dict]:
    """
    Split text into chunks with metadata.
    
    Args:
        text: Text to chunk
        document_id: Document ID
        filename: Original filename
        chunk_size: Size of each chunk
        chunk_overlap: Overlap between chunks
    
    Returns:
        List of dictionaries with 'text' and 'metadata' keys
    """
    chunks = chunk_text(text, chunk_size, chunk_overlap)
    
    result = []
    for idx, chunk in enumerate(chunks):
        result.append({
            "text": chunk,
            "metadata": {
                "document_id": document_id,
                "filename": filename,
                "chunk_index": idx,
                "total_chunks": len(chunks)
            }
        })
    
    return result



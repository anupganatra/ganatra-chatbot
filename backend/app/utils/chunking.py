"""Text chunking utilities."""
from typing import List
from app.config import settings


def chunk_text(text: str, chunk_size: int = None, chunk_overlap: int = None) -> List[str]:
    """
    Split text into chunks with overlap using a simple, reliable algorithm.
    
    Args:
        text: Text to chunk
        chunk_size: Size of each chunk (defaults to config)
        chunk_overlap: Overlap between chunks (defaults to config)
    
    Returns:
        List of text chunks
    """
    chunk_size = chunk_size or settings.CHUNK_SIZE
    chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
    
    # Validation
    if chunk_overlap >= chunk_size:
        raise ValueError(f"chunk_overlap ({chunk_overlap}) must be less than chunk_size ({chunk_size})")
    
    if len(text) <= chunk_size:
        return [text.strip()] if text.strip() else []
    
    chunks = []
    start = 0
    text_length = len(text)
    
    while start < text_length:
        # Calculate end position
        end = min(start + chunk_size, text_length)
        
        # If we're not at the end of the text, try to break at a natural boundary
        if end < text_length:
            # Look backwards from 'end' for a good breaking point
            # Check last 20% of the chunk for sentence endings
            search_start = max(start, end - int(chunk_size * 0.2))
            
            # Try to find sentence endings (in order of preference)
            best_break = -1
            for punct in ['. ', '.\n', '! ', '!\n', '? ', '?\n']:
                pos = text.rfind(punct, search_start, end)
                if pos != -1 and pos > best_break:
                    best_break = pos + len(punct)
            
            # If found a good sentence break, use it
            if best_break > search_start:
                end = best_break
            else:
                # Try paragraph breaks
                pos = text.rfind('\n\n', search_start, end)
                if pos != -1:
                    end = pos + 2
                else:
                    # Try single line breaks
                    pos = text.rfind('\n', search_start, end)
                    if pos != -1:
                        end = pos + 1
                    # Otherwise use the full chunk_size (no adjustment needed)
        
        # Extract and clean the chunk
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        
        # Move to next position
        # Important: Always move forward by at least (chunk_size - overlap)
        next_start = end - chunk_overlap
        
        # Safety: Ensure we always make progress
        if next_start <= start:
            next_start = start + max(1, chunk_size - chunk_overlap)
        
        # Additional safety: If we're very close to the end, just finish
        if next_start >= text_length - 10:  # Within 10 chars of end
            break
            
        start = next_start
    
    print(f"📊 Chunking stats: {len(text)} chars → {len(chunks)} chunks (avg {len(text)//len(chunks) if chunks else 0} chars/chunk)")
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



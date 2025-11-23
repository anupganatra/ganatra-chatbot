"""PDF processing utilities."""
import io
from typing import Tuple
import pdfplumber
from app.config import settings


def extract_text_from_pdf(pdf_bytes: bytes) -> Tuple[str, int]:
    """
    Extract text from PDF bytes.
    
    Args:
        pdf_bytes: PDF file as bytes
    
    Returns:
        Tuple of (extracted_text, page_count)
    
    Raises:
        ValueError: If PDF cannot be processed
    """
    try:
        pdf_file = io.BytesIO(pdf_bytes)
        text_parts = []
        page_count = 0
        
        with pdfplumber.open(pdf_file) as pdf:
            page_count = len(pdf.pages)
            
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        
        full_text = "\n\n".join(text_parts)
        
        if not full_text.strip():
            raise ValueError("No text could be extracted from the PDF")
        
        return full_text, page_count
    
    except Exception as e:
        raise ValueError(f"Error processing PDF: {str(e)}")


def validate_pdf_file(file_bytes: bytes, filename: str) -> None:
    """
    Validate PDF file.
    
    Args:
        file_bytes: PDF file as bytes
        filename: Original filename
    
    Raises:
        ValueError: If file is invalid
    """
    # Check file extension
    if not filename.lower().endswith('.pdf'):
        raise ValueError("Only PDF files are allowed")
    
    # Check file size
    if len(file_bytes) > settings.MAX_FILE_SIZE:
        raise ValueError(f"File size exceeds maximum of {settings.MAX_FILE_SIZE / (1024*1024)}MB")
    
    # Check if it's a valid PDF (basic check)
    if not file_bytes.startswith(b'%PDF'):
        raise ValueError("Invalid PDF file format")



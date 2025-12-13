"""Web scraping utilities for extracting text from websites."""
from typing import Tuple
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse
import re


def extract_text_from_url(url: str, timeout: int = 30) -> Tuple[str, str]:
    """
    Extract text content from a website URL.
    
    Args:
        url: Website URL to scrape
        timeout: Request timeout in seconds
    
    Returns:
        Tuple of (extracted_text, page_title)
    
    Raises:
        ValueError: If URL is invalid, content cannot be extracted, or other errors occur
    """
    # Validate URL format
    parsed = urlparse(url)
    if not parsed.scheme or not parsed.netloc:
        raise ValueError(f"Invalid URL format: {url}")
    
    if parsed.scheme not in ('http', 'https'):
        raise ValueError(f"URL must use HTTP or HTTPS protocol: {url}")
    
    try:
        # Fetch HTML content
        with httpx.Client(timeout=timeout, follow_redirects=True) as client:
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = client.get(url, headers=headers)
            response.raise_for_status()
            
            # Check content type
            content_type = response.headers.get('content-type', '').lower()
            if 'text/html' not in content_type:
                raise ValueError(f"URL does not return HTML content. Content-Type: {content_type}")
            
            html_content = response.text
    
    except httpx.TimeoutException:
        raise ValueError(f"Request to {url} timed out after {timeout} seconds")
    except httpx.HTTPStatusError as e:
        raise ValueError(f"HTTP error {e.response.status_code} when fetching {url}")
    except httpx.RequestError as e:
        raise ValueError(f"Network error when fetching {url}: {str(e)}")
    except Exception as e:
        raise ValueError(f"Error fetching URL {url}: {str(e)}")
    
    try:
        # Parse HTML using built-in parser (no external dependencies required)
        soup = BeautifulSoup(html_content, 'html.parser')
        
        # Extract page title
        title_tag = soup.find('title')
        page_title = title_tag.get_text(strip=True) if title_tag else url
        
        # Remove script and style elements
        for script in soup(['script', 'style', 'noscript', 'meta', 'link']):
            script.decompose()
        
        # Try to find main content area (common semantic HTML5 tags)
        main_content = None
        for tag_name in ['main', 'article', 'div[role="main"]', 'div.content', 'div#content', 'div#main']:
            if tag_name.startswith('div'):
                # Handle CSS selector-like syntax
                selector = tag_name.replace('div[role="main"]', 'div[role="main"]').replace('div.content', 'div.content').replace('div#content', 'div#content').replace('div#main', 'div#main')
                main_content = soup.select_one(selector)
            else:
                main_content = soup.find(tag_name)
            
            if main_content:
                break
        
        # If no main content area found, use body
        if not main_content:
            main_content = soup.find('body')
        
        if not main_content:
            # Fallback to entire document
            main_content = soup
        
        # Remove common navigation and footer elements
        for element in main_content.find_all(['nav', 'header', 'footer', 'aside']):
            element.decompose()
        
        # Extract text
        text = main_content.get_text(separator='\n', strip=True)
        
        # Clean up text: remove excessive whitespace
        lines = [line.strip() for line in text.split('\n') if line.strip()]
        text = '\n'.join(lines)
        
        # Remove excessive blank lines
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        if not text or len(text.strip()) < 50:
            raise ValueError(f"Insufficient text content extracted from {url}. The page may be mostly empty or require JavaScript to render content.")
        
        return text, page_title
    
    except ValueError:
        # Re-raise ValueError as-is
        raise
    except Exception as e:
        raise ValueError(f"Error parsing HTML from {url}: {str(e)}")


"""Web scraping utilities for extracting text from websites."""
from typing import Tuple, List, Set
import httpx
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin, urlunparse
import re
import time
from collections import deque


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


def normalize_url(url: str, base_url: str = None) -> str:
    """
    Normalize a URL by removing fragments, resolving relative URLs, and standardizing format.
    
    Args:
        url: URL to normalize
        base_url: Base URL for resolving relative URLs
    
    Returns:
        Normalized URL string
    """
    # Remove fragments (#anchor)
    if '#' in url:
        url = url.split('#')[0]
    
    # Remove trailing slashes (except for root)
    url = url.rstrip('/') or '/'
    
    # Resolve relative URLs
    if base_url:
        url = urljoin(base_url, url)
    
    # Parse and reconstruct to normalize
    parsed = urlparse(url)
    normalized = urlunparse((
        parsed.scheme.lower(),
        parsed.netloc.lower(),
        parsed.path,
        parsed.params,
        parsed.query,
        ''  # Remove fragment
    ))
    
    return normalized


def is_same_domain(url1: str, url2: str) -> bool:
    """
    Check if two URLs are on the same domain.
    
    Args:
        url1: First URL
        url2: Second URL
    
    Returns:
        True if URLs are on the same domain
    """
    try:
        domain1 = urlparse(url1).netloc.lower()
        domain2 = urlparse(url2).netloc.lower()
        
        # Remove port numbers for comparison
        domain1 = domain1.split(':')[0]
        domain2 = domain2.split(':')[0]
        
        return domain1 == domain2
    except Exception:
        return False


def should_crawl_url(url: str, base_domain: str) -> bool:
    """
    Determine if a URL should be crawled.
    
    Args:
        url: URL to check
        base_domain: Base domain to compare against
    
    Returns:
        True if URL should be crawled
    """
    try:
        parsed = urlparse(url)
        
        # Must be HTTP or HTTPS
        if parsed.scheme not in ('http', 'https'):
            return False
        
        # Must be on same domain
        if not is_same_domain(url, base_domain):
            return False
        
        # Skip common non-HTML file extensions
        path_lower = parsed.path.lower()
        skip_extensions = [
            '.pdf', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico',
            '.mp4', '.mp3', '.avi', '.mov', '.wmv', '.flv',
            '.zip', '.rar', '.tar', '.gz', '.7z',
            '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.css', '.js', '.json', '.xml', '.rss', '.atom'
        ]
        if any(path_lower.endswith(ext) for ext in skip_extensions):
            return False
        
        # Skip data URIs, mailto, tel, javascript
        if url.startswith(('data:', 'mailto:', 'tel:', 'javascript:', 'ftp:')):
            return False
        
        return True
    
    except Exception:
        return False


def extract_links_from_html(html_content: str, base_url: str) -> List[str]:
    """
    Extract all links from HTML content.
    
    Args:
        html_content: HTML content as string
        base_url: Base URL for resolving relative links
    
    Returns:
        List of normalized URLs
    """
    try:
        soup = BeautifulSoup(html_content, 'html.parser')
        links = []
        
        for anchor in soup.find_all('a', href=True):
            href = anchor.get('href', '').strip()
            if not href:
                continue
            
            # Normalize the URL
            normalized = normalize_url(href, base_url)
            if normalized:
                links.append(normalized)
        
        return links
    
    except Exception as e:
        print(f"Error extracting links: {str(e)}")
        return []


def crawl_website(
    base_url: str,
    max_pages: int = 10,
    max_depth: int = 2,
    timeout: int = 30,
    delay: float = 0.5
) -> List[Tuple[str, str, str]]:
    """
    Crawl a website starting from a base URL using BFS.
    
    Args:
        base_url: Starting URL to crawl
        max_pages: Maximum number of pages to crawl
        max_depth: Maximum depth to crawl from base URL
        timeout: Request timeout in seconds
        delay: Delay between requests in seconds
    
    Returns:
        List of tuples (url, text, title) for each successfully crawled page
    
    Raises:
        ValueError: If base URL is invalid or no pages could be crawled
    """
    # Validate base URL
    parsed_base = urlparse(base_url)
    if not parsed_base.scheme or not parsed_base.netloc:
        raise ValueError(f"Invalid base URL format: {base_url}")
    
    if parsed_base.scheme not in ('http', 'https'):
        raise ValueError(f"Base URL must use HTTP or HTTPS protocol: {base_url}")
    
    base_domain = f"{parsed_base.scheme}://{parsed_base.netloc}"
    normalized_base = normalize_url(base_url)
    
    # BFS queue: (url, depth)
    queue = deque([(normalized_base, 0)])
    visited: Set[str] = set()
    crawled_pages: List[Tuple[str, str, str]] = []
    
    print(f"🕷️  Starting crawl from {base_url} (max_pages={max_pages}, max_depth={max_depth})")
    
    while queue and len(crawled_pages) < max_pages:
        current_url, depth = queue.popleft()
        
        # Skip if already visited
        if current_url in visited:
            continue
        
        # Skip if exceeds max depth
        if depth > max_depth:
            continue
        
        # Skip if not on same domain
        if not should_crawl_url(current_url, base_domain):
            continue
        
        visited.add(current_url)
        
        try:
            print(f"  📄 Crawling [{depth}] {current_url}...")
            
            # Extract text from current page
            text, title = extract_text_from_url(current_url, timeout)
            crawled_pages.append((current_url, text, title))
            print(f"     ✅ Successfully crawled: {title[:50]}")
            
            # If we've reached max pages, stop
            if len(crawled_pages) >= max_pages:
                break
            
            # If we haven't reached max depth, extract links for next level
            if depth < max_depth:
                # Fetch HTML to extract links (we already have it, but need to fetch again)
                # To optimize, we could modify extract_text_from_url to return HTML too
                # For now, we'll fetch again (could be optimized later)
                with httpx.Client(timeout=timeout, follow_redirects=True) as client:
                    headers = {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                    response = client.get(current_url, headers=headers)
                    response.raise_for_status()
                    
                    content_type = response.headers.get('content-type', '').lower()
                    if 'text/html' in content_type:
                        html_content = response.text
                        links = extract_links_from_html(html_content, current_url)
                        
                        # Add new links to queue
                        for link in links:
                            if link not in visited and should_crawl_url(link, base_domain):
                                queue.append((link, depth + 1))
            
            # Be respectful - add delay between requests
            if delay > 0:
                time.sleep(delay)
        
        except Exception as e:
            print(f"     ⚠️  Failed to crawl {current_url}: {str(e)}")
            # Continue crawling other pages even if this one fails
            continue
    
    if not crawled_pages:
        raise ValueError(f"No pages could be successfully crawled from {base_url}")
    
    print(f"✅ Crawl complete: {len(crawled_pages)} pages crawled")
    return crawled_pages


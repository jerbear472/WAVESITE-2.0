"""
Advanced metadata extraction using web scraping with browser automation
This provides a more robust solution for platforms that require JavaScript rendering
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
import httpx
import re
import json
from typing import Optional, Dict, Any
from datetime import datetime

router = APIRouter()

class MetadataRequest(BaseModel):
    url: HttpUrl

class PostMetadata(BaseModel):
    platform: str
    creator_handle: Optional[str] = None
    creator_name: Optional[str] = None
    post_caption: Optional[str] = None
    likes_count: Optional[int] = None
    comments_count: Optional[int] = None
    shares_count: Optional[int] = None
    views_count: Optional[int] = None
    hashtags: Optional[list[str]] = None
    thumbnail_url: Optional[str] = None
    posted_at: Optional[str] = None

class AdvancedMetadataExtractor:
    """
    For production use, this would integrate with:
    1. Playwright/Puppeteer for browser automation
    2. Proxy services to avoid rate limiting
    3. Official APIs where available
    4. Caching to reduce API calls
    """
    
    @staticmethod
    def parse_engagement_count(text: str) -> int:
        """Convert engagement text (1.2K, 2.5M) to actual numbers"""
        if not text:
            return 0
        
        text = text.strip().upper()
        
        # Remove commas
        text = text.replace(',', '')
        
        # Handle K, M, B suffixes
        multipliers = {
            'K': 1000,
            'M': 1000000,
            'B': 1000000000
        }
        
        for suffix, multiplier in multipliers.items():
            if suffix in text:
                try:
                    number = float(text.replace(suffix, '').strip())
                    return int(number * multiplier)
                except:
                    return 0
        
        # Try to parse as regular number
        try:
            return int(float(text))
        except:
            return 0

    @staticmethod
    async def extract_with_oembed_plus(url: str, platform: str) -> Dict[str, Any]:
        """
        Enhanced extraction using OEmbed APIs plus additional scraping
        This is what we can actually implement without browser automation
        """
        metadata = {}
        
        if platform == 'tiktok':
            # TikTok OEmbed provides basic info
            # For full data, would need to scrape or use unofficial APIs
            try:
                async with httpx.AsyncClient() as client:
                    # Try OEmbed first
                    oembed_response = await client.get(
                        f"https://www.tiktok.com/oembed?url={url}",
                        timeout=10.0
                    )
                    
                    if oembed_response.status_code == 200:
                        oembed_data = oembed_response.json()
                        
                        metadata['creator_name'] = oembed_data.get('author_name', '')
                        metadata['creator_handle'] = f"@{oembed_data.get('author_name', '').lower().replace(' ', '')}"
                        metadata['post_caption'] = oembed_data.get('title', '')
                        metadata['thumbnail_url'] = oembed_data.get('thumbnail_url', '')
                        
                        # Extract video ID for potential future use
                        video_id_match = re.search(r'/video/(\d+)', url)
                        if video_id_match:
                            video_id = video_id_match.group(1)
                            # Could use this with unofficial APIs
                        
                        # Parse any numbers from the title/description
                        # TikTok sometimes includes view count in title
                        numbers_in_title = re.findall(r'(\d+\.?\d*[KMB]?)\s*(?:views?|likes?)', metadata['post_caption'], re.I)
                        if numbers_in_title:
                            views_text = numbers_in_title[0]
                            metadata['views_count'] = AdvancedMetadataExtractor.parse_engagement_count(views_text)
            except Exception as e:
                print(f"Error extracting TikTok data: {e}")
                
        elif platform == 'youtube':
            # YouTube OEmbed is reliable for basic info
            try:
                async with httpx.AsyncClient() as client:
                    # Extract video ID
                    video_id = None
                    if 'youtube.com/watch' in url:
                        video_id_match = re.search(r'v=([^&]+)', url)
                        if video_id_match:
                            video_id = video_id_match.group(1)
                    elif 'youtu.be/' in url:
                        video_id_match = re.search(r'youtu\.be/([^?]+)', url)
                        if video_id_match:
                            video_id = video_id_match.group(1)
                    
                    if video_id:
                        # OEmbed for basic info
                        oembed_response = await client.get(
                            f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json",
                            timeout=10.0
                        )
                        
                        if oembed_response.status_code == 200:
                            oembed_data = oembed_response.json()
                            
                            metadata['creator_name'] = oembed_data.get('author_name', '')
                            metadata['creator_handle'] = f"@{oembed_data.get('author_name', '').replace(' ', '')}"
                            metadata['post_caption'] = oembed_data.get('title', '')
                            metadata['thumbnail_url'] = oembed_data.get('thumbnail_url', '')
                            
                            # For view counts, would need YouTube Data API v3
                            # or scraping (which YouTube actively blocks)
            except Exception as e:
                print(f"Error extracting YouTube data: {e}")
                
        elif platform == 'instagram':
            # Instagram is very restrictive
            # Would need Instagram Basic Display API or browser automation
            # For now, just extract username from URL
            username_match = re.search(r'instagram\.com/([^/]+)/', url)
            if username_match and username_match.group(1) not in ['p', 'reel', 'reels', 'tv']:
                metadata['creator_handle'] = f"@{username_match.group(1)}"
                
        elif platform == 'twitter':
            # Twitter/X OEmbed still works for public tweets
            try:
                async with httpx.AsyncClient() as client:
                    oembed_response = await client.get(
                        f"https://publish.twitter.com/oembed?url={url}",
                        timeout=10.0
                    )
                    
                    if oembed_response.status_code == 200:
                        oembed_data = oembed_response.json()
                        
                        # Extract from HTML embed
                        html = oembed_data.get('html', '')
                        
                        # Extract text content
                        text_match = re.search(r'<p[^>]*>([^<]+)</p>', html)
                        if text_match:
                            metadata['post_caption'] = text_match.group(1)
                            
                            # Extract hashtags
                            hashtags = re.findall(r'#(\w+)', metadata['post_caption'])
                            if hashtags:
                                metadata['hashtags'] = hashtags
                        
                        # Extract creator name from author_name field
                        author_name = oembed_data.get('author_name', '')
                        if author_name:
                            metadata['creator_name'] = author_name
                            # Extract handle from author_url
                            author_url = oembed_data.get('author_url', '')
                            handle_match = re.search(r'twitter\.com/([^/]+)', author_url)
                            if handle_match:
                                metadata['creator_handle'] = f"@{handle_match.group(1)}"
            except Exception as e:
                print(f"Error extracting Twitter data: {e}")
        
        return metadata

# For now, use the simpler implementation in metadata.py
# This file shows what a more advanced implementation would look like
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, HttpUrl
import httpx
import re
from typing import Optional, Dict, Any
import json
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

class MetadataExtractor:
    @staticmethod
    def detect_platform(url: str) -> str:
        if 'tiktok.com' in url:
            return 'tiktok'
        elif 'instagram.com' in url:
            return 'instagram'
        elif 'youtube.com' in url or 'youtu.be' in url:
            return 'youtube'
        elif 'twitter.com' in url or 'x.com' in url:
            return 'twitter'
        return 'other'

    @staticmethod
    async def extract_tiktok_metadata(url: str) -> Dict[str, Any]:
        """Extract metadata from TikTok URL"""
        metadata = {}
        
        # Extract username from URL
        username_match = re.search(r'@([^/]+)', url)
        if username_match:
            metadata['creator_handle'] = f"@{username_match.group(1)}"
        
        # TikTok requires more complex extraction
        # We'll use their OEmbed API which provides basic info
        try:
            async with httpx.AsyncClient() as client:
                oembed_url = f"https://www.tiktok.com/oembed?url={url}"
                response = await client.get(oembed_url, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    metadata['creator_name'] = data.get('author_name', '')
                    metadata['post_caption'] = data.get('title', '')
                    
                    # Extract hashtags from caption
                    if metadata['post_caption']:
                        hashtags = re.findall(r'#(\w+)', metadata['post_caption'])
                        if hashtags:
                            metadata['hashtags'] = hashtags
                    
                    # Try to get thumbnail
                    metadata['thumbnail_url'] = data.get('thumbnail_url', '')
        except Exception as e:
            print(f"Error fetching TikTok oembed: {e}")
        
        return metadata

    @staticmethod
    async def extract_instagram_metadata(url: str) -> Dict[str, Any]:
        """Extract metadata from Instagram URL"""
        metadata = {}
        
        # Extract username from URL if available
        username_match = re.search(r'instagram\.com/([^/]+)/', url)
        if username_match and username_match.group(1) not in ['p', 'reel', 'reels', 'tv']:
            metadata['creator_handle'] = f"@{username_match.group(1)}"
        
        # Instagram requires authentication for most data
        # We can try to get basic info from the page
        try:
            async with httpx.AsyncClient() as client:
                # Instagram blocks most scraping attempts
                # Would need Instagram Basic Display API with OAuth
                pass
        except Exception as e:
            print(f"Error extracting Instagram data: {e}")
        
        return metadata

    @staticmethod
    async def extract_youtube_metadata(url: str) -> Dict[str, Any]:
        """Extract metadata from YouTube URL"""
        metadata = {}
        
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
            # YouTube provides OEmbed API without authentication
            try:
                async with httpx.AsyncClient() as client:
                    oembed_url = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
                    response = await client.get(oembed_url, timeout=10.0)
                    
                    if response.status_code == 200:
                        data = response.json()
                        metadata['creator_name'] = data.get('author_name', '')
                        metadata['creator_handle'] = f"@{data.get('author_name', '').replace(' ', '')}"
                        metadata['post_caption'] = data.get('title', '')
                        metadata['thumbnail_url'] = data.get('thumbnail_url', '')
            except Exception as e:
                print(f"Error fetching YouTube oembed: {e}")
        
        return metadata

    @staticmethod
    async def extract_twitter_metadata(url: str) -> Dict[str, Any]:
        """Extract metadata from Twitter/X URL"""
        metadata = {}
        
        # Extract username from URL
        username_match = re.search(r'(?:twitter\.com|x\.com)/([^/]+)/status', url)
        if username_match:
            metadata['creator_handle'] = f"@{username_match.group(1)}"
        
        # Twitter requires API v2 with Bearer token
        # We can try their OEmbed API which is public
        try:
            async with httpx.AsyncClient() as client:
                oembed_url = f"https://publish.twitter.com/oembed?url={url}"
                response = await client.get(oembed_url, timeout=10.0)
                
                if response.status_code == 200:
                    data = response.json()
                    # Extract text content from HTML
                    html_content = data.get('html', '')
                    # Basic extraction from embed HTML
                    text_match = re.search(r'<p[^>]*>([^<]+)</p>', html_content)
                    if text_match:
                        metadata['post_caption'] = text_match.group(1)
                        
                        # Extract hashtags
                        hashtags = re.findall(r'#(\w+)', metadata['post_caption'])
                        if hashtags:
                            metadata['hashtags'] = hashtags
        except Exception as e:
            print(f"Error fetching Twitter oembed: {e}")
        
        return metadata

@router.post("/extract-metadata", response_model=PostMetadata)
async def extract_metadata(request: MetadataRequest):
    """Extract metadata from social media URL"""
    url = str(request.url)
    platform = MetadataExtractor.detect_platform(url)
    
    metadata = {
        'platform': platform
    }
    
    try:
        if platform == 'tiktok':
            platform_data = await MetadataExtractor.extract_tiktok_metadata(url)
            metadata.update(platform_data)
        elif platform == 'instagram':
            platform_data = await MetadataExtractor.extract_instagram_metadata(url)
            metadata.update(platform_data)
        elif platform == 'youtube':
            platform_data = await MetadataExtractor.extract_youtube_metadata(url)
            metadata.update(platform_data)
        elif platform == 'twitter':
            platform_data = await MetadataExtractor.extract_twitter_metadata(url)
            metadata.update(platform_data)
    except Exception as e:
        print(f"Error extracting metadata: {e}")
    
    return PostMetadata(**metadata)

@router.get("/test-extraction")
async def test_extraction():
    """Test endpoint to verify extraction is working"""
    test_urls = [
        "https://www.tiktok.com/@zachking/video/1234567890",
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://twitter.com/elonmusk/status/1234567890"
    ]
    
    results = []
    for url in test_urls:
        metadata = await extract_metadata(MetadataRequest(url=url))
        results.append({
            "url": url,
            "metadata": metadata.dict()
        })
    
    return results
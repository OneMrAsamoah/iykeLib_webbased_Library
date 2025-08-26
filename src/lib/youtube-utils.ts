/**
 * YouTube utility functions for extracting video information
 */

export interface YouTubeVideoInfo {
  id: string;
  title: string;
  duration: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  viewCount: string;
}

/**
 * Extract YouTube video ID from various URL formats
 */
export function extractYouTubeId(input: string | undefined | null): string | null {
  if (!input) return null;
  
  const s = String(input);
  const re = /(?:youtube\.com\/(?:.*v=|embed\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/;
  const m = s.match(re);
  
  if (m && m[1]) return m[1];
  
  try {
    const url = new URL(s);
    const v = url.searchParams.get('v');
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  } catch (e) {
    // not a URL
  }
  
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  
  return null;
}

/**
 * Format duration in seconds to human-readable format (e.g., "12:34" or "1:23:45")
 */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Get YouTube thumbnail URL for a video ID
 */
export function getYouTubeThumbnail(videoId: string, quality: 'default' | 'hq' | 'mq' | 'sd' | 'maxres' = 'hq'): string {
  if (!videoId) return '/placeholder.svg';
  
  const qualityMap = {
    default: 'default',
    hq: 'hqdefault',
    mq: 'mqdefault',
    sd: 'sddefault',
    maxres: 'maxresdefault'
  };
  
  return `https://i.ytimg.com/vi/${videoId}/${qualityMap[quality]}.jpg`;
}

/**
 * Fetch video information from YouTube Data API v3
 * Note: Requires API key in environment variables
 */
export async function fetchYouTubeVideoInfo(videoId: string): Promise<YouTubeVideoInfo | null> {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
  
  console.log('YouTube API Key check:', { 
    hasKey: !!apiKey, 
    keyLength: apiKey?.length,
    keyPreview: apiKey ? `${apiKey.substring(0, 10)}...` : 'none'
  });
  
  if (!apiKey) {
    console.warn('YouTube API key not found. Set VITE_YOUTUBE_API_KEY in your environment variables.');
    return null;
  }
  
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails,statistics`
    );
    
    if (!response.ok) {
      throw new Error(`YouTube API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return null;
    }
    
    const video = data.items[0];
    const snippet = video.snippet;
    const contentDetails = video.contentDetails;
    const statistics = video.statistics;
    
    // Parse ISO 8601 duration (e.g., "PT4M13S" -> "4:13")
    const duration = parseISO8601Duration(contentDetails.duration);
    
    return {
      id: videoId,
      title: snippet.title,
      duration,
      thumbnail: snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url || '',
      channelTitle: snippet.channelTitle,
      publishedAt: snippet.publishedAt,
      viewCount: statistics?.viewCount || '0'
    };
  } catch (error) {
    console.error('Failed to fetch YouTube video info:', error);
    return null;
  }
}

/**
 * Parse ISO 8601 duration format to human-readable format
 * Example: "PT4M13S" -> "4:13"
 */
function parseISO8601Duration(duration: string): string {
  if (!duration) return '0:00';
  
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  
  if (!match) return '0:00';
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Test function to verify YouTube API key is working
 */
export async function testYouTubeAPI(): Promise<boolean> {
  try {
    const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY;
    if (!apiKey) {
      console.log('No YouTube API key found');
      return false;
    }
    
    // Test with a known video ID (YouTube's "Me at the zoo" - first video ever)
    const testVideoId = 'jNQXAC9IVRw';
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${testVideoId}&key=${apiKey}&part=snippet,contentDetails,statistics`
    );
    
    if (!response.ok) {
      console.error('YouTube API test failed:', response.status, response.statusText);
      return false;
    }
    
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      console.log('YouTube API test successful:', data.items[0].snippet.title);
      return true;
    }
    
    console.log('YouTube API test failed: No video data returned');
    return false;
  } catch (error) {
    console.error('YouTube API test error:', error);
    return false;
  }
}

/**
 * Get video duration from YouTube URL using multiple methods
 * Falls back to frontend extraction if API is not available
 */
export async function getVideoDuration(youtubeUrl: string): Promise<string> {
  const videoId = extractYouTubeId(youtubeUrl);
  
  if (!videoId) {
    return 'Unknown';
  }
  
  // Try to get duration from YouTube API first
  const videoInfo = await fetchYouTubeVideoInfo(videoId);
  if (videoInfo?.duration) {
    return videoInfo.duration;
  }
  
  // Fallback: return placeholder (will be filled by YouTubePlayer component)
  return 'Loading...';
}

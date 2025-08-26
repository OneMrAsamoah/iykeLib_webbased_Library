# YouTube Duration Extraction Setup

This application can automatically extract video duration from YouTube tutorial links. There are two methods available:

## Method 1: Frontend Extraction (Default - No Setup Required)

The application automatically extracts video duration when the YouTube player loads using the YouTube IFrame API. This method:
- ✅ Works immediately without any setup
- ✅ No API keys required
- ✅ Duration is extracted when videos are played
- ❌ Duration is only available after the video player loads
- ❌ May show "Loading..." initially

## Method 2: YouTube Data API v3 (Recommended - Enhanced Experience)

For better performance and immediate duration display, you can set up the YouTube Data API v3:

### Setup Steps:

1. **Get a YouTube API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the YouTube Data API v3
   - Create credentials (API Key)
   - Copy your API key

2. **Add to Environment Variables:**
   ```bash
   # In your .env file
   VITE_YOUTUBE_API_KEY=your_actual_api_key_here
   ```

3. **Restart your development server**

### Benefits of YouTube API:
- ✅ Duration is available immediately
- ✅ No "Loading..." states
- ✅ Better user experience
- ✅ Additional metadata (view counts, channel info)
- ❌ Requires API key setup
- ❌ Has daily quota limits (usually sufficient for development)

### API Quota Information:
- Free tier: 10,000 units per day
- Each video info request: 1 unit
- Typical usage: Very low (only when loading tutorials)

## How It Works:

1. **Frontend Method:** When a tutorial video loads, the YouTube player automatically extracts duration
2. **API Method:** Duration is fetched immediately when tutorials are loaded from the backend
3. **Fallback:** If API fails, falls back to frontend extraction

## Troubleshooting:

- **Duration shows "Unknown":** Check if the YouTube URL is valid
- **API errors:** Verify your API key and quota limits
- **"Loading..." persists:** The video may not have loaded yet

## Code Implementation:

The duration extraction is implemented in:
- `src/lib/youtube-utils.ts` - Utility functions
- `src/components/YouTubePlayer.tsx` - Player with duration callback
- `src/components/ui/duration-badge.tsx` - Reusable duration display component
- `src/pages/Index.tsx` - Main page duration display
- `src/components/TutorialModule.tsx` - Tutorial modal duration display

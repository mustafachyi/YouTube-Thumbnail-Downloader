// YouTube URL validation and parsing utilities
const YOUTUBE_DOMAINS = ['youtube.com', 'youtu.be']
const VIDEO_ID_LENGTH = 11
const PATH_EXTRACTORS = {
  'youtu.be': (pathname) => pathname.slice(1).split('&')[0],
  'youtube.com': {
    '/shorts/': (pathname) => pathname.slice(8, 8 + VIDEO_ID_LENGTH),
    '/embed/': (pathname) => pathname.slice(7, 7 + VIDEO_ID_LENGTH),
    '/e/': (pathname) => pathname.slice(3).split('?')[0],
    '/live/': (pathname) => pathname.slice(6).split('?')[0]
  }
}

// Validate if URL is a supported YouTube URL format
export const isValidYouTubeUrl = (url) => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/^(www\.|m\.)/, '')
    
    // Validate domain
    if (!YOUTUBE_DOMAINS.includes(hostname)) return false

    // Validate path for youtu.be short links
    if (hostname === 'youtu.be') return urlObj.pathname.length > 1

    // Validate paths for youtube.com
    if (hostname === 'youtube.com') {
      return urlObj.searchParams.has('v') || 
             urlObj.pathname.startsWith('/shorts/') ||
             urlObj.pathname.startsWith('/embed/') ||
             urlObj.pathname.startsWith('/e/') ||
             urlObj.pathname.startsWith('/live/') ||
             (urlObj.pathname === '/watch' && urlObj.searchParams.has('v'))
    }
    
    return false
  } catch {
    return false
  }
}

// Extract video ID from valid YouTube URL
export const getVideoId = (url) => {
  try {
    const urlObj = new URL(url)
    const hostname = urlObj.hostname.replace(/^(www\.|m\.)/, '')
    const pathname = urlObj.pathname

    // Extract from youtu.be domain
    if (hostname === 'youtu.be') {
      return PATH_EXTRACTORS[hostname](pathname)
    }

    // Extract from youtube.com domain
    if (hostname === 'youtube.com') {
      // Extract from URL parameter (highest priority)
      if (urlObj.searchParams.has('v')) {
        return urlObj.searchParams.get('v')
      }
      
      // Extract from path patterns
      for (const [prefix, extractor] of Object.entries(PATH_EXTRACTORS['youtube.com'])) {
        if (pathname.startsWith(prefix)) {
          return extractor(pathname)
        }
      }
    }
    
    return null
  } catch {
    return null
  }
}

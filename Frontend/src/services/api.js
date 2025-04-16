// API configuration
const isDevelopment = false // Toggle for production
const baseURL = isDevelopment ? 'http://localhost:3000' : ''
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'Accept-Encoding': 'br, gzip, deflate'
}

// Response handler with error checking
const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.message || `API request failed with status ${response.status}`)
  }
  return response
}

// Check available thumbnail resolutions
export const checkThumbnailAvailability = async (videoUrl) => {
  try {
    const response = await fetch(`${baseURL}/api/check-availability`, {
      method: 'POST',
      credentials: 'include',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ videoUrl })
    })
    return handleResponse(response).then(r => r.json())
  } catch (error) {
    console.error('Availability check failed:', error)
    throw error
  }
}

// Get and preload thumbnail URL
export const getThumbnailUrl = (videoId, resolution) => {
  const url = `https://img.youtube.com/vi/${videoId}/${resolution}.jpg`
  if (typeof window !== 'undefined') {
    new Image().src = url // Preload image
  }
  return url
}

// Download thumbnail with specified resolution
export const downloadThumbnail = async (videoUrl, resolution, availabilityData) => {
  try {
    const response = await fetch(`${baseURL}/api/download`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...DEFAULT_HEADERS,
        'Accept': 'application/zip,image/jpeg'
      },
      body: JSON.stringify({ videoUrl, resolution, availabilityData })
    })
    
    await handleResponse(response)
    const blob = await response.blob()
    
    // Extract filename from headers or use default
    const contentDisposition = response.headers.get('Content-Disposition')
    const filename = contentDisposition?.split('filename=')[1]?.replace(/"/g, '') 
      || `thumbnail${resolution === 'all' ? '.zip' : '.jpg'}`

    // Create download link and trigger
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    
    // Clean up resources efficiently
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => cleanupDownload(url, link))
    } else {
      setTimeout(() => cleanupDownload(url, link), 100)
    }

    return blob
  } catch (error) {
    console.error('Download failed:', error)
    throw error
  }
}

// Helper function for download cleanup
const cleanupDownload = (url, link) => {
  URL.revokeObjectURL(url)
  document.body.removeChild(link)
}

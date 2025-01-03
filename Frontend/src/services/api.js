const isDevelopment = false // Toggle this off when deploying
const baseURL = isDevelopment ? 'http://localhost:3000' : ''

const handleResponse = async (response) => {
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'API request failed')
  }
  return response
}

// Optimize headers - keep only essential headers
const defaultHeaders = {
  'Content-Type': 'application/json',
  'Accept-Encoding': 'br, gzip, deflate'
}

export const checkThumbnailAvailability = async (videoUrl) => {
  const response = await fetch(`${baseURL}/api/check-availability`, {
    method: 'POST',
    credentials: 'include',
    headers: defaultHeaders,
    body: JSON.stringify({ videoUrl })
  })
  return handleResponse(response).then(r => r.json())
}

export const getThumbnailUrl = (videoId, resolution) => {
  const url = `https://img.youtube.com/vi/${videoId}/${resolution}.jpg`
  // Preload image for better performance
  new Image().src = url
  return url
}

export const downloadThumbnail = async (videoUrl, resolution, availabilityData) => {
  const response = await fetch(`${baseURL}/api/download`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...defaultHeaders,
      'Accept': 'application/zip,image/jpeg'
    },
    body: JSON.stringify({ videoUrl, resolution, availabilityData })
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.message || 'Download failed')
  }

  const blob = await response.blob()
  const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/"/g, '') 
    || `thumbnail${resolution === 'all' ? '.zip' : '.jpg'}`

  // Use URL.createObjectURL only when needed
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  
  // Use requestIdleCallback for cleanup to avoid blocking the main thread
  requestIdleCallback(() => {
    URL.revokeObjectURL(url)
    document.body.removeChild(a)
  })

  return blob
}

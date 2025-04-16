import { ref, computed, watchEffect } from 'vue'

// Storage configuration
const STORAGE_KEY = 'recentDownloads'
const MAX_HISTORY = 10
const MAX_STORAGE_ITEMS = MAX_HISTORY * 5

// Initialize downloads from localStorage
const downloads = ref((() => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return [] // Handle corrupted data
  }
})())

// Persist downloads to localStorage
watchEffect(() => {
  try {
    downloads.value.length > 0
      ? localStorage.setItem(STORAGE_KEY, JSON.stringify(downloads.value))
      : localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error('Failed to save downloads:', error)
  }
})

// Downloads store implementation
export const useRecentDownloads = () => {
  // Group and sort downloads by videoId
  const groupedDownloads = computed(() => {
    const groups = {}
    
    // Process downloads
    for (const download of downloads.value) {
      if (!groups[download.videoId]) {
        groups[download.videoId] = {
          videoId: download.videoId,
          resolutions: new Set(),
          lastDownloaded: download.timestamp
        }
      } else {
        groups[download.videoId].lastDownloaded = Math.max(
          groups[download.videoId].lastDownloaded,
          download.timestamp
        )
      }
      groups[download.videoId].resolutions.add(download.resolution)
    }
    
    // Sort by recent and limit size
    return Object.values(groups)
      .sort((a, b) => b.lastDownloaded - a.lastDownloaded)
      .slice(0, MAX_HISTORY)
  })

  // Add new download entry
  const addDownload = (videoId, resolution) => {
    downloads.value = [
      { videoId, resolution, timestamp: Date.now() },
      ...downloads.value.filter(item => 
        !(item.videoId === videoId && item.resolution === resolution)
      )
    ].slice(0, MAX_STORAGE_ITEMS)
  }

  // Clear download history
  const clearHistory = () => downloads.value = []
  
  // Check for existing downloads
  const hasDownloads = computed(() => downloads.value.length > 0)

  return {
    downloads: groupedDownloads,
    addDownload,
    clearHistory,
    hasDownloads
  }
}

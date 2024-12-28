import { ref, computed, watchEffect } from 'vue'

const MAX_HISTORY = 10
const STORAGE_KEY = 'recentDownloads'
const downloads = ref(JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'))

watchEffect(() => localStorage.setItem(STORAGE_KEY, JSON.stringify(downloads.value)))

export const useRecentDownloads = () => ({
  downloads: computed(() => {
    const groups = {}
    downloads.value.forEach(download => {
      if (!groups[download.videoId]) {
        groups[download.videoId] = {
          videoId: download.videoId,
          resolutions: new Set(),
          lastDownloaded: download.timestamp
        }
      }
      groups[download.videoId].resolutions.add(download.resolution)
      groups[download.videoId].lastDownloaded = Math.max(
        groups[download.videoId].lastDownloaded,
        download.timestamp
      )
    })
    return Object.values(groups)
      .sort((a, b) => b.lastDownloaded - a.lastDownloaded)
      .slice(0, MAX_HISTORY)
  }),
  addDownload: (videoId, resolution) => {
    downloads.value = [
      { videoId, resolution, timestamp: Date.now() },
      ...downloads.value.filter(item => !(item.videoId === videoId && item.resolution === resolution))
    ].slice(0, MAX_HISTORY * 5)
  },
  clearHistory: () => downloads.value = [],
  hasDownloads: computed(() => downloads.value.length > 0)
})

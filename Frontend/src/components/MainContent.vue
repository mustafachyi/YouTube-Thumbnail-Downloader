<script setup>
import { ref, watch } from 'vue'
import { checkThumbnailAvailability, getThumbnailUrl, downloadThumbnail } from '../services/api'
import { useRecentDownloads } from '../stores/recentDownloads'
import { isValidYouTubeUrl, getVideoId } from '../utils/youtube'

const props = defineProps({
  sidebarOpen: Boolean
})

const videoUrl = ref('')
const resolution = ref('maxresdefault')
const previewImage = ref(null)
const loading = ref(false)
const downloadEnabled = ref(false)
const showResolutions = ref(false)

const availableResolutions = ref({})
const resolutionOptions = [
  { value: 'maxresdefault', label: '1280x720 (HD)', disabled: false },
  { value: 'sddefault', label: '640x480 (SD)', disabled: false },
  { value: 'hqdefault', label: '480x360 (HQ)', disabled: false },
  { value: 'mqdefault', label: '320x180 (MQ)', disabled: false },
  { value: 'default', label: '120x90 (Default)', disabled: false },
  { value: 'all', label: 'All Resolutions (ZIP)', disabled: false }
]

const getHighestResolution = (availableResolutions) => {
  const resolutionOrder = ['maxresdefault', 'sddefault', 'hqdefault', 'mqdefault', 'default']
  return resolutionOrder.find(res => availableResolutions[res]) || 'default'
}

const availabilityData = ref(null)
const bestAvailableResolution = ref(null)

watch(videoUrl, async (newUrl) => {
  if (!isValidYouTubeUrl(newUrl)) {
    previewImage.value = null
    downloadEnabled.value = false
    showResolutions.value = false
    availabilityData.value = null
    bestAvailableResolution.value = null
    return
  }

  loading.value = true
  try {
    const response = await checkThumbnailAvailability(newUrl)
    availabilityData.value = response
    
    resolutionOptions.forEach(option => {
      if (option.value === 'all') return
      option.disabled = !response.availableResolutions[option.value]
    })

    bestAvailableResolution.value = response.bestAvailable
    resolution.value = response.bestAvailable

    if (bestAvailableResolution.value) {
      const videoId = getVideoId(newUrl)
      previewImage.value = getThumbnailUrl(videoId, bestAvailableResolution.value)
      downloadEnabled.value = true
      showResolutions.value = true
    }
  } catch (error) {
    console.error('Error checking thumbnail:', error)
    previewImage.value = null
    downloadEnabled.value = false
    showResolutions.value = false
    availabilityData.value = null
    bestAvailableResolution.value = null
  } finally {
    loading.value = false
  }
})

watch(resolution, (newResolution) => {
  if (newResolution === 'all' && bestAvailableResolution.value) {
    const videoId = getVideoId(videoUrl.value)
    previewImage.value = getThumbnailUrl(videoId, bestAvailableResolution.value)
  }
})

const emit = defineEmits(['download-complete'])

const { addDownload } = useRecentDownloads()

const handleSubmit = async (e) => {
  e.preventDefault()
  if (!isValidYouTubeUrl(videoUrl.value)) return

  loading.value = true
  try {
    await downloadThumbnail(videoUrl.value, resolution.value, availabilityData.value)
    const videoId = getVideoId(videoUrl.value)
    addDownload(videoId, resolution.value)
    emit('download-complete')
  } catch (error) {
    console.error('Download failed:', error)
  } finally {
    loading.value = false
  }
}

const loadUrl = (url) => {
  videoUrl.value = url
}

defineExpose({ loadUrl })
</script>

<template>
  <div class="flex-1 overflow-auto w-full md:w-[calc(100%-16rem)] transition-all duration-200 ease-in-out">
    <div class="grid md:grid-cols-2 gap-6 p-6">
      <!-- Input Panel -->
      <div class="bg-vscode-panel border border-vscode-border rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-6 text-vscode-blue">Download Settings</h2>
        <form @submit="handleSubmit" class="space-y-5">
          <div>
            <label for="videoUrl" class="block text-sm font-medium mb-2 text-vscode-text/80">
              YouTube URL
            </label>
            <input 
              type="url" 
              id="videoUrl" 
              v-model="videoUrl"
              required 
              class="w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded-md focus:outline-none focus:ring-2 focus:ring-vscode-blue focus:border-transparent placeholder-vscode-text/50 text-sm"
              placeholder="https://www.youtube.com/watch?v=..."
            >
          </div>

          <Transition
            enter-active-class="transition-all duration-200 ease-out"
            enter-from-class="transform -translate-y-2 opacity-0"
            enter-to-class="transform translate-y-0 opacity-100"
            leave-active-class="transition-all duration-200 ease-in"
            leave-from-class="transform translate-y-0 opacity-100"
            leave-to-class="transform -translate-y-2 opacity-0"
          >
            <div v-if="showResolutions" class="space-y-5">
              <div>
                <label for="resolution" class="block text-sm font-medium mb-2 text-vscode-text/80">
                  Resolution
                </label>
                <select 
                  id="resolution" 
                  v-model="resolution"
                  class="w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded-md focus:outline-none focus:ring-2 focus:ring-vscode-blue focus:border-transparent text-sm"
                >
                  <option 
                    v-for="option in resolutionOptions" 
                    :key="option.value"
                    :value="option.value"
                    :disabled="option.disabled"
                  >
                    {{ option.label }}{{ option.disabled ? ' (Unavailable)' : '' }}
                  </option>
                </select>
              </div>

              <button 
                type="submit" 
                :disabled="!downloadEnabled"
                class="w-full bg-vscode-blue text-white py-2 px-4 rounded-md hover:bg-vscode-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-vscode-blue"
              >
                Download
              </button>
            </div>
          </Transition>
        </form>
      </div>

      <!-- Preview Panel -->
      <div class="bg-vscode-panel border border-vscode-border rounded-lg p-6">
        <h2 class="text-xl font-semibold mb-6 text-vscode-blue">Preview</h2>
        <div class="flex items-center justify-center min-h-[180px]">
          <div v-if="loading" class="text-vscode-text/50">Loading...</div>
          <div v-else-if="!previewImage" class="text-vscode-text/50">Enter a YouTube URL to see preview</div>
          <img 
            v-else 
            :src="previewImage" 
            alt="Thumbnail preview" 
            class="max-w-full rounded-md"
            @error="previewImage = null"
          >
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.v-enter-active,
.v-leave-active {
  transition: opacity 0.2s ease;
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
}
</style>

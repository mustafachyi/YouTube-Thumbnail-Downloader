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
const showPreviewPanel = ref(false)
const availabilityData = ref(null)
const bestAvailableResolution = ref(null)

const resolutionOptions = [
  { value: 'maxresdefault', label: '1280x720 (HD)', disabled: false },
  { value: 'sddefault', label: '640x480 (SD)', disabled: false },
  { value: 'hqdefault', label: '480x360 (HQ)', disabled: false },
  { value: 'mqdefault', label: '320x180 (MQ)', disabled: false },
  { value: 'default', label: '120x90 (Default)', disabled: false },
  { value: 'all', label: 'All Resolutions (ZIP)', disabled: false }
]

const resetState = () => {
  previewImage.value = null
  downloadEnabled.value = false
  showResolutions.value = false
  showPreviewPanel.value = false
  availabilityData.value = null
  bestAvailableResolution.value = null
}

watch(videoUrl, async (newUrl) => {
  if (!isValidYouTubeUrl(newUrl)) {
    resetState()
    return
  }

  loading.value = true
  try {
    const response = await checkThumbnailAvailability(newUrl)
    availabilityData.value = response
    
    resolutionOptions.forEach(option => {
      if (option.value !== 'all') {
        option.disabled = !response.availableResolutions[option.value]
      }
    })

    bestAvailableResolution.value = response.bestAvailable
    if (bestAvailableResolution.value) {
      resolution.value = response.bestAvailable
      previewImage.value = getThumbnailUrl(getVideoId(newUrl), bestAvailableResolution.value)
      downloadEnabled.value = true
      showResolutions.value = true
      showPreviewPanel.value = true
    }
  } catch (error) {
    console.error('Error checking thumbnail:', error)
    resetState()
  } finally {
    loading.value = false
  }
})

watch(resolution, (newResolution) => {
  if (newResolution === 'all' && bestAvailableResolution.value) {
    previewImage.value = getThumbnailUrl(getVideoId(videoUrl.value), bestAvailableResolution.value)
  }
})

const { addDownload } = useRecentDownloads()

const handleSubmit = async (e) => {
  e.preventDefault()
  if (!isValidYouTubeUrl(videoUrl.value) || !downloadEnabled.value) return

  loading.value = true
  try {
    await downloadThumbnail(videoUrl.value, resolution.value, availabilityData.value)
    addDownload(getVideoId(videoUrl.value), resolution.value)
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

const emit = defineEmits(['download-complete'])
defineExpose({ loadUrl })
</script>

<template>
  <div class="flex-1 overflow-auto w-full md:w-[calc(100%-16rem)] transition-all duration-200 ease-in-out">
    <div class="grid md:grid-cols-2 gap-4 p-4 md:gap-6 md:p-6">
      <div class="bg-vscode-panel border border-vscode-border rounded-lg p-4 md:p-6 flex flex-col transition-all duration-300 ease-out"
           :class="{'h-[200px] md:h-[240px]': !showResolutions, 'h-[320px] md:h-[380px]': showResolutions}">
        <h2 class="text-lg md:text-xl font-semibold mb-6 md:mb-8 text-vscode-blue">Download Settings</h2>
        <form @submit="handleSubmit" class="flex-1 flex flex-col">
          <div class="flex-1 flex flex-col" :class="{ 'justify-center': !showResolutions }">
            <div class="space-y-5 transition-all duration-300 ease-out" 
                 :class="{ '-translate-y-[10%] opacity-40': !showResolutions }">
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

              <div class="space-y-5 transition-all duration-300 ease-out"
                   :style="{ 
                     opacity: showResolutions ? 1 : 0,
                     transform: `translateY(${showResolutions ? '0' : '8px'})`,
                     pointerEvents: showResolutions ? 'auto' : 'none',
                     position: 'relative'
                   }">
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
                  class="w-full bg-vscode-blue text-white py-2 px-4 rounded-md hover:bg-vscode-blue/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm focus:outline-none active:scale-[0.97] active:duration-75"
                >
                  Download
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      <div class="bg-vscode-panel border border-vscode-border rounded-lg p-4 md:p-6 relative flex flex-col transition-all duration-300 ease-out"
           :class="{'h-[200px] md:h-[240px]': !showPreviewPanel, 'h-[320px] md:h-[380px]': showPreviewPanel}">
        <Transition
          mode="out-in"
          enter-active-class="transition-all duration-300 ease-out"
          enter-from-class="opacity-0 scale-98"
          enter-to-class="opacity-100 scale-100"
          leave-active-class="transition-all duration-300 ease-out"
          leave-from-class="opacity-100 scale-100"
          leave-to-class="opacity-0 scale-98"
        >
          <div v-if="!showPreviewPanel" key="guide" class="flex-1 flex flex-col">
            <div class="flex flex-col items-center justify-center flex-1 text-center space-y-3">
              <svg class="w-12 h-12 text-vscode-blue/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="space-y-1.5">
                <h3 class="text-lg font-medium text-vscode-blue">Ready to Preview</h3>
                <p class="text-sm text-vscode-text/60 max-w-xs hidden md:block">
                  Enter a valid YouTube URL in the input next to this panel
                </p>
                <p class="text-sm text-vscode-text/60 max-w-xs md:hidden">
                  Enter a valid YouTube URL in the input above
                </p>
              </div>
            </div>
          </div>
          <div v-else key="preview" class="flex-1 flex flex-col">
            <h2 class="text-lg md:text-xl font-semibold mb-4 md:mb-6 text-vscode-blue">Preview</h2>
            <div class="flex-1 relative">
              <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-vscode-text/50">Loading...</div>
              <img 
                v-else-if="previewImage" 
                :src="previewImage" 
                alt="Thumbnail preview" 
                class="absolute inset-0 max-w-full max-h-full m-auto rounded-lg"
                @error="previewImage = null"
              >
            </div>
          </div>
        </Transition>
      </div>
    </div>
  </div>
</template>

<style scoped>
.v-enter-active,
.v-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.v-enter-from,
.v-leave-to {
  opacity: 0;
  transform: translateY(4px);
}

@media (max-width: 768px) {
  .v-enter-from,
  .v-leave-to {
    transform: translateY(2px);
  }
}
</style>

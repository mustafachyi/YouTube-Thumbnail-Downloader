<script setup>
// Core imports
import { ref, watch, computed, shallowRef, nextTick } from 'vue'

// Project imports
import { checkThumbnailAvailability, getThumbnailUrl, downloadThumbnail } from '../services/api'
import { useRecentDownloads } from '../stores/recentDownloads'
import { isValidYouTubeUrl, getVideoId } from '../utils/youtube'

// Constants
const DEBOUNCE_DELAY = 300
const DEFAULT_RESOLUTION = 'maxresdefault'
const RESOLUTION_OPTIONS = [
  { value: 'maxresdefault', label: '1280x720 (HD)' },
  { value: 'sddefault', label: '640x480 (SD)' },
  { value: 'hqdefault', label: '480x360 (HQ)' },
  { value: 'mqdefault', label: '320x180 (MQ)' },
  { value: 'default', label: '120x90 (Default)' },
  { value: 'all', label: 'All Resolutions (ZIP)' }
]

// Props & Emits
// defineProps({ sidebarOpen: Boolean }) // Removed unused prop
// const emit = defineEmits(['download-complete']) // Removed unused emit

// Reactive State
const videoUrl = ref('')
const resolution = ref(DEFAULT_RESOLUTION)
const loading = ref(false)

// UI State (using shallowRef for performance where deep reactivity isn't needed)
const downloadEnabled = shallowRef(false)
const showResolutions = shallowRef(false)
const showPreviewPanel = shallowRef(false)
const previewImage = shallowRef(null)
const availabilityData = shallowRef(null)
const bestAvailableResolution = shallowRef(null)

// Computed Properties
const resolutionOptions = computed(() =>
  RESOLUTION_OPTIONS.map(opt => ({
    ...opt,
    disabled: opt.value !== 'all' && availabilityData.value
      ? !availabilityData.value.availableResolutions[opt.value]
      : false
  }))
)

// Methods
const resetState = () => {
  previewImage.value = null
  downloadEnabled.value = false
  showResolutions.value = false
  showPreviewPanel.value = false
  availabilityData.value = null
  bestAvailableResolution.value = null
  // Consider resetting resolution.value = DEFAULT_RESOLUTION here if desired
}

const { addDownload } = useRecentDownloads() // Get Pinia store action

const handleSubmit = async (e) => {
  e.preventDefault() // Prevent default form submission
  if (!isValidYouTubeUrl(videoUrl.value) || !downloadEnabled.value) return

  loading.value = true
  try {
    const videoId = getVideoId(videoUrl.value)
    await downloadThumbnail(videoUrl.value, resolution.value, availabilityData.value)
    addDownload(videoId, resolution.value) // Add to recent downloads store
    // emit('download-complete') // Removed unused emit call
  } catch (error) {
    console.error('Download failed:', error)
    // Add user-facing error handling here (e.g., a toast notification)
  } finally {
    loading.value = false
  }
}

// Watchers
let urlCheckTimeout = null // Debounce timer variable

watch(videoUrl, (newUrl) => {
  if (urlCheckTimeout) clearTimeout(urlCheckTimeout)

  urlCheckTimeout = setTimeout(async () => {
    if (!isValidYouTubeUrl(newUrl)) {
      resetState()
      return
    }

    loading.value = true
    try {
      const response = await checkThumbnailAvailability(newUrl)
      availabilityData.value = response

      // Use nextTick to ensure DOM updates based on availabilityData before proceeding
      await nextTick()

      bestAvailableResolution.value = response.bestAvailable
      if (bestAvailableResolution.value) {
        resolution.value = response.bestAvailable
        previewImage.value = getThumbnailUrl(getVideoId(newUrl), bestAvailableResolution.value)
        downloadEnabled.value = true
        showResolutions.value = true
        showPreviewPanel.value = true
      } else {
        // Handle case where no resolutions are available
        resetState()
        // Optionally show a message to the user
      }
    } catch (error) {
      console.error('Error checking thumbnail availability:', error)
      resetState()
      // Add user-facing error handling
    } finally {
      loading.value = false
    }
  }, DEBOUNCE_DELAY)
})

watch(resolution, (newResolution) => {
  if (!videoUrl.value || !isValidYouTubeUrl(videoUrl.value) || !showPreviewPanel.value) return

  // Update preview instantly, no need for requestAnimationFrame here unless specific timing is needed
  const videoId = getVideoId(videoUrl.value)
  const resolToShow = newResolution === 'all' ? bestAvailableResolution.value : newResolution
  if (resolToShow) {
    previewImage.value = getThumbnailUrl(videoId, resolToShow)
  } else {
    // Fallback if resolution becomes invalid somehow
    previewImage.value = null
  }
})

// Exposed API (for parent components)
const loadUrl = (url) => { videoUrl.value = url }
defineExpose({ loadUrl })
</script>

<template>
  <div class="h-full w-full overflow-y-auto">
    <div class="container mx-auto px-4 py-6 md:px-6 md:py-8">
      <!-- Use grid for layout, stacking on small screens, side-by-side on medium+ -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">

        <!-- Download Settings Section -->
        <section aria-labelledby="download-settings-title" class="bg-vscode-panel border border-vscode-border rounded-lg p-4 sm:p-6 flex flex-col">
          <h2 id="download-settings-title" class="text-lg sm:text-xl font-semibold mb-4 text-vscode-text flex-shrink-0">Download Settings</h2>
          <form @submit="handleSubmit" class="space-y-6 flex-grow flex flex-col">
            <div class="space-y-4 flex-grow">
              <!-- URL Input Field -->
              <div>
                <label for="videoUrl" class="block text-sm font-medium mb-1.5 text-vscode-text-input">YouTube URL</label>
                <input type="url" id="videoUrl" v-model.trim="videoUrl" required
                       class="w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded-md focus:outline-none focus:ring-2 focus:ring-vscode-blue focus:border-transparent text-vscode-text-input placeholder-vscode-text-muted text-sm"
                       placeholder="https://www.youtube.com/watch?v=...">
              </div>

              <!-- Resolution Selection (Conditional) -->
              <Transition enter-active-class="transition-all duration-200 ease-out"
                        enter-from-class="opacity-0 -translate-y-2 max-h-0"
                        enter-to-class="opacity-100 translate-y-0 max-h-40"
                        leave-active-class="transition-all duration-200 ease-in"
                        leave-from-class="opacity-100 translate-y-0 max-h-40"
                        leave-to-class="opacity-0 -translate-y-2 max-h-0">
                <div v-if="showResolutions" class="space-y-4">
                  <div>
                    <label for="resolution" class="block text-sm font-medium mb-1.5 text-vscode-text-input">Resolution</label>
                    <select id="resolution" v-model="resolution"
                            class="w-full px-3 py-2 bg-vscode-bg border border-vscode-border rounded-md focus:outline-none focus:ring-2 focus:ring-vscode-blue focus:border-transparent text-vscode-text-input text-sm appearance-none">
                      <option v-for="option in resolutionOptions" :key="option.value"
                              :value="option.value" :disabled="option.disabled">
                        {{ option.label }}{{ option.disabled ? ' (Unavailable)' : '' }}
                      </option>
                    </select>
                  </div>
                  <!-- Download Button -->
                  <button type="submit" :disabled="!downloadEnabled || loading"
                          class="w-full bg-vscode-blue text-white py-2 px-4 rounded-md hover:bg-vscode-blue/90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-vscode-panel focus:ring-vscode-blue active:scale-[0.98] active:duration-75 flex-shrink-0">
                    {{ loading ? 'Downloading...' : 'Download' }}
                  </button>
                </div>
              </Transition>
            </div>
          </form>
        </section>

        <!-- Preview Panel Section -->
        <section aria-labelledby="preview-title" class="bg-vscode-panel border border-vscode-border rounded-lg p-4 sm:p-6 flex flex-col min-h-[280px] sm:min-h-[320px]">
          <Transition mode="out-in"
                    enter-active-class="transition-all duration-300 ease-out"
                    enter-from-class="opacity-0 scale-95"
                    enter-to-class="opacity-100 scale-100"
                    leave-active-class="transition-all duration-200 ease-in"
                    leave-from-class="opacity-100 scale-100"
                    leave-to-class="opacity-0 scale-95">

            <!-- Initial State / No URL -->
            <div v-if="!showPreviewPanel" key="guide" class="flex flex-col items-center justify-center text-center flex-grow">
               <!-- Reduced size and margin for very small screens -->
              <svg class="w-10 h-10 text-vscode-text-muted mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"
                   role="img" aria-hidden="true">
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                 <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 id="preview-title" class="text-base sm:text-lg font-medium text-vscode-text mb-1">Ready to Preview</h2>
              <!-- Removed max-w-xs, added padding for spacing -->
              <p class="text-sm text-vscode-text-muted px-2">Enter a valid YouTube URL to see the thumbnail preview.</p>
            </div>

            <!-- Preview State -->
            <div v-else key="preview" class="space-y-4 flex flex-col flex-grow">
              <h2 id="preview-title" class="text-lg sm:text-xl font-semibold text-vscode-text flex-shrink-0">Preview</h2>
              <!-- Added flex-grow to make the container take available space -->
              <div class="relative bg-vscode-bg rounded-md overflow-hidden border border-vscode-border">
                <!-- Loading Indicator -->
                <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-vscode-bg/80 text-vscode-text-muted z-10">
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-vscode-text-muted" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Loading Preview...
                </div>
                <!-- Thumbnail Image -->
                <img v-if="previewImage" :src="previewImage" alt="Thumbnail preview"
                     class="block w-full h-auto"
                     loading="lazy" decoding="async"
                     @error="previewImage = null">
                 <!-- Placeholder if image fails or no preview available -->
                 <div v-else-if="!loading" class="flex items-center justify-center text-vscode-text-muted text-sm py-10">
                   Preview unavailable
                 </div>
              </div>
            </div>
          </Transition>
        </section>

      </div>
    </div>
  </div>
</template>

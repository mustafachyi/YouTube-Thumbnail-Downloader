<script setup>
// Core imports
import { computed, shallowRef, onMounted } from 'vue'
import { useRecentDownloads } from '../stores/recentDownloads'

// Props and store
defineProps({ isOpen: Boolean })
const { downloads, clearHistory, hasDownloads } = useRecentDownloads()

// Resolution display mapping (using shallowRef for performance)
const resolutionNameMap = shallowRef({
  maxresdefault: 'HD',
  sddefault: 'SD',
  hqdefault: 'HQ',
  mqdefault: 'MQ',
  default: 'Default',
  all: 'All'
})

// Format resolution name
const getResolutionName = (res) => resolutionNameMap.value[res] || res

// Limit visible downloads for performance
const visibleDownloads = computed(() => downloads.value.slice(0, 50))

// Event handling with debounce
const emit = defineEmits(['load-previous'])
let loadTimeout
const loadPreviousDownload = (videoId) => {
  if (loadTimeout) clearTimeout(loadTimeout)
  loadTimeout = setTimeout(() => {
    emit('load-previous', `https://youtube.com/watch?v=${videoId}`)
  }, 100)
}

// Cleanup on unmount
onMounted(() => () => {
  if (loadTimeout) clearTimeout(loadTimeout)
})
</script>

<template>
  <div class="h-full w-64 bg-vscode-sidebar border-r border-vscode-border overflow-y-auto sidebar-scrollbar">
    <div class="p-4 h-full">
      <div class="space-y-4">
        <!-- Header -->
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-vscode-text uppercase tracking-wider">Quick Links</h2>
          <a href="https://github.com/mustafachyi/YouTube-Thumbnail-Downloader" 
             target="_blank"
             rel="noopener noreferrer" 
             class="flex items-center space-x-1 text-xs px-2 py-1 rounded-md bg-vscode-active hover:bg-opacity-80 transition-colors text-vscode-text">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24" 
                 role="img" aria-label="GitHub Logo">
              <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>Star on GitHub</span>
          </a>
        </div>

        <!-- Navigation -->
        <nav aria-label="Main navigation" class="space-y-2">
          <a href="#" class="flex items-center space-x-2 px-3 py-2 rounded-md bg-vscode-active text-vscode-text">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" 
                 role="img" aria-label="Home Icon">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
            </svg>
            <span>Downloader</span>
          </a>
        </nav>

        <!-- Recent Downloads -->
        <section aria-labelledby="recent-downloads-title" class="px-3 py-2 text-vscode-text">
          <div class="flex items-center justify-between mb-2">
            <h2 id="recent-downloads-title">Recent Downloads</h2>
            <button v-if="hasDownloads" @click="clearHistory"
                    class="text-xs font-medium text-vscode-blue-text hover:text-vscode-blue-text hover:bg-vscode-active px-2 py-1 rounded transition-colors">
              Clear
            </button>
          </div>

          <!-- Download History -->
          <div class="mt-2 text-xs space-y-1">
            <TransitionGroup name="list" tag="div" class="space-y-2">
              <div v-for="item in visibleDownloads" :key="item.videoId" 
                   @click="loadPreviousDownload(item.videoId)"
                   class="group rounded-md hover:bg-vscode-active cursor-pointer transition-colors overflow-hidden">
                <div class="py-1.5 px-2 flex items-center space-x-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-vscode-blue-text/60 shrink-0"></div>
                  <span class="text-vscode-blue-text font-medium truncate">{{ item.videoId }}</span>
                </div>
                <div class="px-5 pb-1.5 flex flex-wrap gap-1">
                  <span v-for="resolution in [...item.resolutions]" :key="resolution"
                        class="inline-flex items-center px-1.5 rounded text-[10px] bg-vscode-active/50 text-vscode-text">
                    {{ getResolutionName(resolution) }}
                  </span>
                </div>
              </div>
            </TransitionGroup>
            <div v-if="!hasDownloads" class="text-vscode-text-muted py-1 px-2">
              No recent downloads
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

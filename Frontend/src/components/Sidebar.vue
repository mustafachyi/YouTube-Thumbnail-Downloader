<script setup>
import { useRecentDownloads } from '../stores/recentDownloads'
import { computed, shallowRef, onMounted } from 'vue'

const props = defineProps({
  isOpen: Boolean
})

const { downloads, clearHistory, hasDownloads } = useRecentDownloads()

// Memoize resolution name mapping
const resolutionNameMap = shallowRef({
  maxresdefault: 'HD',
  sddefault: 'SD',
  hqdefault: 'HQ',
  mqdefault: 'MQ',
  default: 'Default',
  all: 'All'
})

const getResolutionName = (res) => resolutionNameMap.value[res] || res

// Optimize list rendering with virtual scrolling for large lists
const visibleDownloads = computed(() => {
  return downloads.value.slice(0, 50) // Limit visible items for better performance
})

const emit = defineEmits(['load-previous'])

// Debounce load previous
let loadTimeout
const loadPreviousDownload = (videoId) => {
  if (loadTimeout) clearTimeout(loadTimeout)
  loadTimeout = setTimeout(() => {
    emit('load-previous', `https://youtube.com/watch?v=${videoId}`)
  }, 100)
}

// Cleanup
onMounted(() => {
  return () => {
    if (loadTimeout) clearTimeout(loadTimeout)
  }
})
</script>

<template>
  <div :class="[
    'fixed md:static inset-y-[40px] md:inset-y-0 left-0 w-64 bg-vscode-sidebar border-r border-vscode-border flex-shrink-0 h-[calc(100vh-40px)] md:h-auto overflow-y-auto z-30',
    'will-change-transform',
    !isOpen && '-translate-x-full md:translate-x-0'
  ]"
  style="transition: transform 0.15s ease-out;">
    <div class="p-4 h-full">
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-medium text-vscode-text/60 uppercase tracking-wider">Quick Links</h2>
          <a href="https://github.com/mustafachyi/YouTube-Thumbnail-Downloader" 
             target="_blank"
             rel="noopener noreferrer" 
             class="flex items-center space-x-1 text-xs px-2 py-1 rounded-md bg-vscode-active hover:bg-opacity-80 transition-colors">
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path fill-rule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
            <span>Star on GitHub</span>
          </a>
        </div>
        <nav class="space-y-2">
          <a href="#" class="flex items-center space-x-2 px-3 py-2 rounded-md bg-vscode-active">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z"/>
            </svg>
            <span>Downloader</span>
          </a>
        </nav>
        <div class="px-3 py-2 text-vscode-text/60">
          <div class="flex items-center justify-between mb-2">
            <span>Recent Downloads</span>
            <button v-if="hasDownloads" 
                    @click="clearHistory"
                    class="text-xs text-vscode-blue hover:text-vscode-blue/80 hover:bg-vscode-active px-2 py-1 rounded">
              Clear
            </button>
          </div>
          <div class="mt-2 text-xs space-y-1">
            <TransitionGroup 
              name="list" 
              tag="div"
              class="space-y-2"
            >
              <div v-for="item in visibleDownloads" 
                   :key="item.videoId" 
                   class="group rounded-md hover:bg-vscode-active cursor-pointer transition-colors overflow-hidden"
                   @click="loadPreviousDownload(item.videoId)">
                <div class="py-1.5 px-2 flex items-center space-x-2">
                  <div class="w-1.5 h-1.5 rounded-full bg-vscode-blue/60 shrink-0"></div>
                  <span class="text-vscode-blue truncate">{{ item.videoId }}</span>
                </div>
                <div class="px-5 pb-1.5 flex flex-wrap gap-1">
                  <span v-for="resolution in [...item.resolutions]" 
                        :key="resolution"
                        class="inline-flex items-center px-1.5 rounded text-[10px] bg-vscode-active/50 text-vscode-text/70">
                    {{ getResolutionName(resolution) }}
                  </span>
                </div>
              </div>
            </TransitionGroup>
            <div v-if="!hasDownloads" class="text-vscode-text/50 py-1 px-2">
              No recent downloads
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* Hardware acceleration for list transitions */
.list-enter-active,
.list-leave-active {
  transition: all 0.2s ease;
  will-change: transform, opacity;
  backface-visibility: hidden;
  transform: translateZ(0);
}

.list-enter-from {
  opacity: 0;
  transform: translateX(-30px);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* Optimize for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .list-enter-active,
  .list-leave-active {
    transition-duration: 0.1s;
  }
}

/* Optimize scrolling performance */
::-webkit-scrollbar {
  width: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.2);
}
</style>

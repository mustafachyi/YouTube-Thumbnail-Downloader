<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import TopBar from './components/TopBar.vue'
import Sidebar from './components/Sidebar.vue'
import MainContent from './components/MainContent.vue'

const sidebarOpen = ref(window.innerWidth >= 768)
const mainContentRef = ref(null)
const isToggling = ref(false)

const toggleSidebar = () => {
  if (isToggling.value) return
  isToggling.value = true
  sidebarOpen.value = !sidebarOpen.value
  setTimeout(() => {
    isToggling.value = false
  }, 200) // Match the transition duration in Sidebar component
}

const handleLoadPrevious = (url) => {
  if (mainContentRef.value) {
    mainContentRef.value.loadUrl(url)
  }
}

const handleResize = () => {
  sidebarOpen.value = window.innerWidth >= 768
}

const isMobile = computed(() => window.innerWidth < 768)

const handleOverlayClick = (e) => {
  if (isMobile.value && sidebarOpen.value) {
    toggleSidebar()
  }
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  
  // VS Code themed console message
  const vsStyle = 'background: #1e1e1e; color: #569CD6; padding: 12px; font-size: 14px; font-family: monospace; border: 1px solid #264F78;'
  const linkStyle = 'color: #4EC9B0; text-decoration: underline;'
  
  console.log('%c[INFO] YouTube Thumbnail Downloader', vsStyle)
  console.log(`%c[APP] Ready to download thumbnails\n[GITHUB] https://github.com/mustafachyi%c`, 'color: #9CDCFE; font-family: monospace;', linkStyle)

  console.log(`%c
  ┌─────────────────────────────┐
  │  Thumbnail Downloader v1.0  │
  │  =====================      │
  │  Ready to extract images    │
  │  from YouTube videos        │
  └─────────────────────────────┘`, 'color: #569CD6; font-family: monospace;')
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<template>
  <div class="bg-vscode-bg text-vscode-text min-h-screen">
    <TopBar @toggle-sidebar="toggleSidebar" />
    
    <div class="flex min-h-screen pt-[40px]">
      <Transition
        enter-active-class="transition-opacity duration-200"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-200"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-if="sidebarOpen && isMobile"
          class="fixed inset-0 bg-black/50 backdrop-blur-sm z-10"
          @click="handleOverlayClick"
        ></div>
      </Transition>
      <Sidebar :is-open="sidebarOpen" @load-previous="handleLoadPrevious" />
      <MainContent ref="mainContentRef" :sidebar-open="sidebarOpen" />
    </div>
  </div>
</template>

<style scoped>
.backdrop-blur-sm {
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
</style>

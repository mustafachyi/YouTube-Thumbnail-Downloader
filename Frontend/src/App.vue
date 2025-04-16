<script setup>
// External imports
import { ref, onMounted, onUnmounted, computed, shallowRef } from 'vue'

// Internal imports
import TopBar from './components/TopBar.vue'
import Sidebar from './components/Sidebar.vue'
import MainContent from './components/MainContent.vue'

// App constants
const TRANSITION_DURATION = 350
const MOBILE_BREAKPOINT = 768

// DOM references using shallowRef for better performance
const mainContentRef = shallowRef(null)

// Reactive state
const isMobile = computed(() => window.innerWidth < MOBILE_BREAKPOINT)
const sidebarOpen = ref(!isMobile.value)
const isToggling = ref(false)

// Handle window resize with debouncing
let resizeTimeout
const handleResize = () => {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  
  resizeTimeout = setTimeout(() => {
    // Only update sidebar state when transitioning between breakpoints
    const currentIsMobile = window.innerWidth < MOBILE_BREAKPOINT
    if (currentIsMobile !== isMobile.value) {
      sidebarOpen.value = !currentIsMobile
    }
  }, 100)
}

// Toggle sidebar with transition lock to prevent multiple toggles
const toggleSidebar = () => {
  if (isToggling.value) return
  
  isToggling.value = true
  sidebarOpen.value = !sidebarOpen.value
  setTimeout(() => isToggling.value = false, TRANSITION_DURATION)
}

// Load URL from sidebar history
const handleLoadPrevious = (url) => {
  mainContentRef.value?.loadUrl(url)
}

// Close sidebar when clicking overlay on mobile
const handleOverlayClick = () => {
  if (isMobile.value && sidebarOpen.value) {
    toggleSidebar()
  }
}

// Lifecycle hooks for event listeners
onMounted(() => {
  window.addEventListener('resize', handleResize, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimeout) clearTimeout(resizeTimeout)
})
</script>

<template>
  <div class="bg-vscode-bg text-vscode-text min-h-screen flex flex-col">
    <!-- Header with fixed position -->
    <header role="banner" class="fixed top-0 left-0 right-0 z-50">
      <TopBar @toggle-sidebar="toggleSidebar" />
    </header>
    
    <!-- Main Content Area -->
    <div class="flex flex-1 pt-[40px] relative">
      <!-- Mobile Overlay (shown only when sidebar is open on mobile) -->
      <Transition
        enter-active-class="transition-opacity duration-300"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-300"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0">
        <div v-if="sidebarOpen && isMobile"
             class="fixed inset-0 bg-black/40 z-20"
             @click="handleOverlayClick">
        </div>
      </Transition>
      
      <!-- Sidebar with slide animation -->
      <Transition
        enter-active-class="transition-transform duration-300 ease-out"
        enter-from-class="transform -translate-x-full"
        enter-to-class="transform translate-x-0"
        leave-active-class="transition-transform duration-300 ease-in"
        leave-from-class="transform translate-x-0"
        leave-to-class="transform -translate-x-full">
        <aside v-if="sidebarOpen || !isMobile" 
               role="complementary" 
               aria-label="Sidebar" 
               class="fixed md:sticky top-[40px] left-0 bottom-0 z-30">
          <Sidebar :is-open="sidebarOpen" 
                  @load-previous="handleLoadPrevious" />
        </aside>
      </Transition>

      <!-- Main Content with responsive margin -->
      <main role="main" 
            class="flex-1 min-h-[calc(100vh-40px)] transition-all duration-300">
        <h1 class="sr-only">YouTube Thumbnail Downloader</h1>
        <MainContent ref="mainContentRef" />
      </main>
    </div>
  </div>
</template>

<style>
/* Styles removed as they are likely covered by global styles in src/style.css */
</style>

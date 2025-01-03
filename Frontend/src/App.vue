<script setup>
import { ref, onMounted, onUnmounted, computed, shallowRef } from 'vue'
import TopBar from './components/TopBar.vue'
import Sidebar from './components/Sidebar.vue'
import MainContent from './components/MainContent.vue'

// Use shallowRef for DOM references
const mainContentRef = shallowRef(null)

// Memoize computed values
const isMobile = computed(() => window.innerWidth < 768)
const sidebarOpen = ref(isMobile.value ? false : true)
const isToggling = ref(false)

// Debounced resize handler
let resizeTimeout
const handleResize = () => {
  if (resizeTimeout) clearTimeout(resizeTimeout)
  resizeTimeout = setTimeout(() => {
    sidebarOpen.value = window.innerWidth >= 768
  }, 100)
}

// Optimized toggle with requestAnimationFrame
const toggleSidebar = () => {
  if (isToggling.value) return
  isToggling.value = true
  requestAnimationFrame(() => {
    sidebarOpen.value = !sidebarOpen.value
    setTimeout(() => {
      isToggling.value = false
    }, 150)
  })
}

const handleLoadPrevious = (url) => {
  if (mainContentRef.value) {
    mainContentRef.value.loadUrl(url)
  }
}

const handleOverlayClick = (e) => {
  if (isMobile.value && sidebarOpen.value) {
    toggleSidebar()
  }
}

// Lifecycle hooks
onMounted(() => {
  window.addEventListener('resize', handleResize, { passive: true })
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  if (resizeTimeout) clearTimeout(resizeTimeout)
})
</script>

<template>
  <div class="bg-vscode-bg text-vscode-text min-h-screen">
    <TopBar @toggle-sidebar="toggleSidebar" />
    
    <div class="flex min-h-screen pt-[40px]">
      <Transition
        enter-active-class="transition-opacity duration-150"
        enter-from-class="opacity-0"
        enter-to-class="opacity-100"
        leave-active-class="transition-opacity duration-150"
        leave-from-class="opacity-100"
        leave-to-class="opacity-0"
      >
        <div
          v-show="sidebarOpen && isMobile"
          class="fixed inset-0 bg-black/40 z-10"
          @click="handleOverlayClick"
        ></div>
      </Transition>
      
      <Sidebar 
        :is-open="sidebarOpen" 
        @load-previous="handleLoadPrevious"
        :style="{
          transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
          willChange: isToggling ? 'transform' : 'auto'
        }"
      />
      <MainContent 
        ref="mainContentRef" 
        :sidebar-open="sidebarOpen" 
      />
    </div>
  </div>
</template>

<style>
/* Use hardware acceleration for animations */
.v-enter-active,
.v-leave-active {
  will-change: opacity;
  backface-visibility: hidden;
  transform: translateZ(0);
}

/* Optimize transitions */
@media (prefers-reduced-motion: reduce) {
  .v-enter-active,
  .v-leave-active {
    transition-duration: 0.1s;
  }
}
</style>

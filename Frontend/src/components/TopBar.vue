<script setup>
import { computed } from 'vue'

const emit = defineEmits(['toggle-sidebar'])

// Memoize event handler
const handleToggle = computed(() => () => emit('toggle-sidebar'))
</script>

<template>
  <div class="bg-vscode-sidebar border-b border-vscode-border fixed top-0 w-full z-30 h-[40px] select-none">
    <div class="px-4 py-2 flex items-center justify-between h-full">
      <!-- Menu Button - Only render on mobile -->
      <button 
        @click="handleToggle"
        class="md:hidden p-2 hover:bg-vscode-active rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-blue"
        aria-label="Toggle sidebar"
      >
        <svg 
          class="w-5 h-5"
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path 
            stroke-linecap="round" 
            stroke-linejoin="round" 
            stroke-width="2" 
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <!-- Window Controls -->
      <div class="flex items-center space-x-2">
        <!-- Optimize SVG rendering with shape-rendering -->
        <div class="w-3 h-3 rounded-full bg-[#ff5f57]" style="shape-rendering: geometricPrecision;"></div>
        <div class="w-3 h-3 rounded-full bg-[#ffbd2e]" style="shape-rendering: geometricPrecision;"></div>
        <div class="w-3 h-3 rounded-full bg-[#28c941]" style="shape-rendering: geometricPrecision;"></div>
        
        <!-- Title -->
        <span class="ml-4 text-sm opacity-75 whitespace-nowrap">
          YouTube Thumbnail Downloader
        </span>
      </div>
    </div>
  </div>
</template>

<style>
/* Optimize paint performance */
.bg-vscode-sidebar {
  transform: translateZ(0);
  backface-visibility: hidden;
  will-change: transform;
}

/* Optimize button interactions */
button {
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

/* Optimize transitions for reduced motion */
@media (prefers-reduced-motion: reduce) {
  .transition-colors {
    transition: none;
  }
}

/* Optimize SVG rendering */
svg {
  shape-rendering: geometricPrecision;
  text-rendering: optimizeLegibility;
}

/* Optimize for high-contrast mode */
@media (forced-colors: active) {
  .bg-vscode-sidebar {
    forced-color-adjust: none;
  }
}
</style>

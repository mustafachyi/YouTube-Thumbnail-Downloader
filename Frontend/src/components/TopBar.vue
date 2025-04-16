<script setup>
// Event handling
const emit = defineEmits(['toggle-sidebar'])
const handleToggle = () => emit('toggle-sidebar')
</script>

<template>
  <div class="bg-vscode-sidebar border-b border-vscode-border fixed top-0 w-full z-30 h-[40px] select-none topbar-base">
    <div class="px-4 py-2 flex items-center justify-between h-full">
      <!-- Mobile Menu -->
      <button @click="handleToggle"
              class="md:hidden p-2 hover:bg-vscode-active rounded-md transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-vscode-blue"
              aria-label="Toggle sidebar">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" 
             role="img" aria-hidden="true">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <!-- Window Controls -->
      <div class="flex items-center space-x-2">
        <div class="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
        <div class="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
        <div class="w-3 h-3 rounded-full bg-[#28c941]"></div>
        <span class="ml-4 text-sm opacity-75 whitespace-nowrap text-vscode-text">YouTube Thumbnail Downloader</span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineEmits(['toggle-sidebar'])
</script>

<template>
  <div class="bg-vscode-sidebar border-b border-vscode-border px-4 py-2 fixed top-0 w-full z-30 flex items-center justify-between h-[40px]">
    <button @click="$emit('toggle-sidebar')" class="md:hidden p-2 hover:bg-vscode-active rounded-md">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/>
      </svg>
    </button>
    <div class="flex items-center space-x-2">
      <div class="w-3 h-3 rounded-full bg-[#ff5f57]"></div>
      <div class="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
      <div class="w-3 h-3 rounded-full bg-[#28c941]"></div>
      <span class="ml-4 text-sm opacity-75">YouTube Thumbnail Downloader</span>
    </div>
  </div>
</template>

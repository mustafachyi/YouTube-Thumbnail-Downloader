import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import viteCompression from 'vite-plugin-compression'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteCompression({
      algorithm: 'brotliCompress', // Use brotli algorithm
      ext: '.br',                 // Output extension
      deleteOriginFile: false,    // Keep original files
      verbose: true,              // Log compression details
    })
  ],
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()], // mkcert() removed for debugging
  server: {
    port: 5173,
    // https: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

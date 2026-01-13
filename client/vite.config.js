import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl()],
  server: {
    port: 5173,
    https: true,
    headers: {
      "Permissions-Policy": "microphone=(self \"https://localhost:4173\" \"https://localhost:5173\")"
    }
  },
  preview: {
    port: 4173,
    https: true,
    headers: {
      "Permissions-Policy": "microphone=(self \"https://localhost:4173\" \"https://localhost:5173\")"
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// the FastAPI backend runs on 8000, /api is proxied there
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})

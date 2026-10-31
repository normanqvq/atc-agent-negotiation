import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 之後後端 FastAPI 跑在 8000，前端 /api 直接轉過去
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})

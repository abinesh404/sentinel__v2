import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 4003,
    open: true, // Automatically opens the browser when you run 'npm run dev'
  }
})
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,        // bind to 0.0.0.0 — accessible from any device on the network
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://192.168.29.2:5000',   // forward to the backend on this machine
        changeOrigin: true,
        secure: false,
      },
    },
  },
})

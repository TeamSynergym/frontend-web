import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    }
  },
  server: {
    allowedHosts: true,
    host: '0.0.0.0', // 🔥 외부 IP 접근 허용
    port: 5173,       // 원래 포트 유지 (원하면 바꿔도 됨)
    hmr: {
      protocol: 'ws',
      host: '192.168.2.168',
      port: 5173,
    },
  }
})

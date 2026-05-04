import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포 시: 환경변수 VITE_BASE 로 리포 경로 지정
// 예) VITE_BASE=/spero-spera-memo/  npm run build
const base = process.env.VITE_BASE ?? '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [react()],
})

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 글꼴을 앱 안에 함께 넣어 둔다 (외부 사이트에서 불러오지 않으므로 인터넷이 느리거나 끊겨도 글자 모양이 유지됨)
import '@fontsource/montserrat/400.css'
import '@fontsource/montserrat/500.css'
import '@fontsource/montserrat/600.css'
import '@fontsource/montserrat/700.css'
import '@fontsource/montserrat/800.css'
import '@fontsource/shantell-sans/700.css'
import '@fontsource/shantell-sans/800.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA: 빌드된 환경에서만 서비스 워커 등록 (dev 에서는 HMR 과 충돌해서 제외)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const swUrl = `${import.meta.env.BASE_URL}sw.js`
    void navigator.serviceWorker.register(swUrl).catch(() => {})
  })
}

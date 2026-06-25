import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

// Принудительное обновление Service Worker.
// Когда новая версия приложения задеплоена:
// 1. SW обнаруживает обновление при следующем визите
// 2. Благодаря skipWaiting новый SW сразу берёт контроль
// 3. 'controllerchange' срабатывает → страница перезагружается с новым кодом
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.ready.then((reg) => {
    // Проверяем обновления при возврате к окну
    window.addEventListener('focus', () => reg.update())
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update()
    })
    // И каждые 3 минуты
    setInterval(() => reg.update(), 3 * 60 * 1000)
  })

  // Когда новый SW взял управление → перезагружаем страницу
  let refreshing = false
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

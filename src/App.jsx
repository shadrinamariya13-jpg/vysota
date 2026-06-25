import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import Layout from './components/Layout'
import { TaskFormProvider } from './components/TaskFormContext'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { cloudEnabled } from './lib/supabase'
import { initialSync, subscribeRealtime, flushOutbox, clearLocal, pullAll } from './lib/sync'
import { scheduleReminders, cancelAll, hasPermission } from './lib/notifications'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './lib/db'
import Login from './pages/Login'
import Today from './pages/Today'
import Kanban from './pages/Kanban'
import List from './pages/List'
import Calendar from './pages/Calendar'
import Stats from './pages/Stats'
import Settings from './pages/Settings'

function AuthGate({ children }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (!cloudEnabled) return children
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-coffee-mid text-sm">
        Загрузка...
      </div>
    )
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return children
}

// Восстанавливаем путь, который пришёл через 404.html-фолбэк.
function RedirectRestorer() {
  const navigate = useNavigate()
  useEffect(() => {
    const saved = sessionStorage.getItem('vysota-redirect')
    if (saved) {
      sessionStorage.removeItem('vysota-redirect')
      const base = import.meta.env.BASE_URL.replace(/\/$/, '')
      const rel = saved.startsWith(base) ? saved.slice(base.length) : saved
      if (rel && rel !== '/') navigate(rel, { replace: true })
    }
  }, [navigate])
  return null
}

function SyncRunner() {
  const { user } = useAuth()

  useEffect(() => {
    if (!cloudEnabled || !user) return
    let cancelled = false
    let unsubRealtime = () => {}

    ;(async () => {
      await initialSync(user.id)
      if (cancelled) return
      unsubRealtime = subscribeRealtime(user.id)
    })()

    // Когда возвращаемся к окну или сеть появилась —
    // отправляем накопленные локальные изменения И подтягиваем чужие.
    // Это страховка на случай если realtime-канал не сработал.
    const refresh = async () => {
      await flushOutbox(user.id)
      await pullAll(user.id)
    }
    window.addEventListener('online', refresh)
    window.addEventListener('focus', refresh)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)

    // Периодически (каждые 30 сек) — на случай если ничего не сработало
    const interval = setInterval(refresh, 30_000)

    return () => {
      cancelled = true
      unsubRealtime()
      window.removeEventListener('online', refresh)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisibility)
      clearInterval(interval)
    }
  }, [user])

  return null
}

// Подписываемся на задачи и пересчитываем расписание уведомлений.
function NotificationScheduler() {
  const { user } = useAuth()
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])

  useEffect(() => {
    if (!user) { cancelAll(); return }
    // Не запрашиваем разрешение автоматически — iOS требует явного тапа.
    // Просто планируем если разрешение уже выдано.
    if (hasPermission()) scheduleReminders(tasks)
  }, [tasks, user])

  return null
}

function ClearOnSignOut() {
  // Если облако включено и пользователь вышел — очищаем локальные данные,
  // чтобы при следующем логине другой пользователь не увидел чужие задачи.
  const { user, loading } = useAuth()
  useEffect(() => {
    if (!cloudEnabled) return
    if (!loading && !user) {
      clearLocal()
    }
  }, [user, loading])
  return null
}

export default function App() {
  // На GitHub Pages приложение живёт под /kofe-tracker/ — base path
  // приходит из Vite (import.meta.env.BASE_URL, без завершающего слэша)
  const basename = import.meta.env.BASE_URL.replace(/\/$/, '') || '/'

  return (
    <BrowserRouter basename={basename}>
      <AuthProvider>
        <RedirectRestorer />
        <SyncRunner />
        <NotificationScheduler />
        <ClearOnSignOut />
        <TaskFormProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <AuthGate>
                  <Layout />
                </AuthGate>
              }
            >
              <Route path="/" element={<Navigate to="/today" replace />} />
              <Route path="/today" element={<Today />} />
              <Route path="/kanban" element={<Kanban />} />
              <Route path="/list" element={<List />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/stats" element={<Stats />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/today" replace />} />
            </Route>
          </Routes>
        </TaskFormProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

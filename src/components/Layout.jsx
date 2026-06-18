import { useEffect, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  Sun,
  LayoutGrid,
  ListChecks,
  CalendarDays,
  BarChart3,
  Coffee,
  Plus,
  LogOut,
  Wifi,
  WifiOff,
  RefreshCw,
} from 'lucide-react'
import { useTaskForm } from './TaskFormContext'
import { useAuth } from '../hooks/useAuth'
import { cloudEnabled } from '../lib/supabase'
import { pullAll, flushOutbox } from '../lib/sync'
import SyncStatus from './SyncStatus'

const navItems = [
  { to: '/today', label: 'Сегодня', icon: Sun },
  { to: '/kanban', label: 'Канбан', icon: LayoutGrid },
  { to: '/list', label: 'Список', icon: ListChecks },
  { to: '/calendar', label: 'Календарь', icon: CalendarDays },
  { to: '/stats', label: 'Итоги', icon: BarChart3 },
]

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

export default function Layout() {
  const { openCreate } = useTaskForm()
  const { user, signOut } = useAuth()
  const online = useOnline()
  const [refreshing, setRefreshing] = useState(false)

  const refresh = async () => {
    if (!user || refreshing) return
    setRefreshing(true)
    try {
      await flushOutbox(user.id)
      await pullAll(user.id)
    } finally {
      setTimeout(() => setRefreshing(false), 400)
    }
  }

  // На каждый mount Layout (после логина) — гарантированно тянем задачи.
  // Это страховка на случай если SyncRunner проспал.
  useEffect(() => {
    if (!cloudEnabled || !user) return
    pullAll(user.id)
  }, [user?.id])

  return (
    <div className="min-h-screen flex bg-cream-bg">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col border-r border-cream-border bg-cream-bg/80 backdrop-blur-sm sticky top-0 h-screen">
        <div className="px-6 py-7 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl2 bg-gold flex items-center justify-center shadow-gold">
            <Coffee className="w-5 h-5 text-white" strokeWidth={2.2} />
          </div>
          <div>
            <div className="font-display text-xl text-coffee-dark leading-none">Высота</div>
            <div className="text-xs text-coffee-mid mt-1">таск-трекер</div>
          </div>
        </div>

        <nav className="px-3 flex-1 flex flex-col gap-1">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-cream-surface text-coffee-dark shadow-card'
                    : 'text-coffee-mid hover:bg-cream-deep hover:text-coffee-dark',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-[18px] h-[18px] ${isActive ? 'text-gold' : 'text-coffee-light'}`}
                    strokeWidth={2}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 space-y-3">
          <button onClick={() => openCreate()} className="btn-gold w-full">
            <Plus className="w-4 h-4" strokeWidth={2.5} />
            Новая задача
          </button>
          {cloudEnabled && user && (
            <div className="space-y-2">
              <SyncStatus />
              <div className="flex items-center justify-between text-[11px] text-coffee-mid px-1">
                <div className="flex items-center gap-1.5 min-w-0">
                  {online ? (
                    <Wifi className="w-3 h-3 text-olive shrink-0" />
                  ) : (
                    <WifiOff className="w-3 h-3 text-coffee-light shrink-0" />
                  )}
                  <span className="truncate" title={user.email}>{user.email}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={refresh}
                    disabled={refreshing}
                    className="text-coffee-light hover:text-gold p-1 -m-1 disabled:opacity-50"
                    title="Обновить из облака"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                  <button
                    type="button"
                    onClick={signOut}
                    className="text-coffee-light hover:text-terracotta p-1 -m-1"
                    title="Выйти"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 border-b border-cream-border sticky top-0 bg-cream-bg/95 backdrop-blur-sm z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl2 bg-gold flex items-center justify-center">
              <Coffee className="w-4 h-4 text-white" strokeWidth={2.2} />
            </div>
            <span className="font-display text-lg text-coffee-dark">Высота</span>
          </div>
          <div className="flex items-center gap-1.5">
            {cloudEnabled && user && <SyncStatus compact />}
            {cloudEnabled && !online && (
              <span className="text-[10px] text-coffee-light bg-cream-deep px-2 py-1 rounded-full flex items-center gap-1">
                <WifiOff className="w-3 h-3" /> офлайн
              </span>
            )}
            {cloudEnabled && user && (
              <button
                type="button"
                onClick={refresh}
                disabled={refreshing}
                className="p-2 text-coffee-light hover:text-gold disabled:opacity-50"
                title="Обновить"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button onClick={() => openCreate()} className="btn-gold px-3 py-1.5 text-xs">
              <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Задача
            </button>
            {cloudEnabled && user && (
              <button
                onClick={signOut}
                className="p-1.5 text-coffee-light hover:text-terracotta"
                title="Выйти"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 overflow-auto pb-20 md:pb-0">
          <div className="max-w-5xl mx-auto px-5 md:px-10 py-6 md:py-10">
            <Outlet />
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex justify-around border-t border-cream-border bg-cream-bg/95 backdrop-blur-sm py-2 fixed bottom-0 left-0 right-0 z-10">
          {navItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 px-2 py-1.5 text-[10px] rounded-lg',
                  isActive ? 'text-gold' : 'text-coffee-light',
                ].join(' ')
              }
            >
              <Icon className="w-5 h-5" strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}

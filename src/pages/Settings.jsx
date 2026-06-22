import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  Settings as SettingsIcon,
  Trash2,
  Download,
  Bell,
  RotateCcw,
  Loader2,
  CheckCircle2,
} from 'lucide-react'
import PageHeader from '../components/PageHeader'
import { db } from '../lib/db'
import { deleteTask } from '../hooks/useTasks'
import { exportBackup } from '../lib/backup'
import { useAuth } from '../hooks/useAuth'
import { requestPermission, hasPermission } from '../lib/notifications'
import { todayStr } from '../lib/stats'

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card p-5 space-y-4">
      <h2 className="font-display text-lg text-coffee-dark flex items-center gap-2">
        <Icon className="w-4 h-4 text-gold" strokeWidth={2} />
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ label, hint, action }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-coffee-dark">{label}</div>
        {hint && <div className="text-xs text-coffee-mid mt-0.5">{hint}</div>}
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

export default function Settings() {
  const { user } = useAuth()
  const today = todayStr()
  const tasks = useLiveQuery(() => db.tasks.toArray(), [], [])

  const [busy, setBusy] = useState(null) // 'backup' | 'clean-future' | 'clean-done' | 'notify'
  const [done, setDone] = useState(null)
  const [notifStatus, setNotifStatus] = useState(hasPermission() ? 'granted' : Notification.permission)

  // статистика повторов
  const futureCopies = tasks.filter(
    (t) => t.parent_recurrence_id && t.due_date > today && t.status === 'todo'
  )
  const oldDone = tasks.filter(
    (t) =>
      t.parent_recurrence_id &&
      t.status === 'done' &&
      t.completed_at &&
      t.completed_at < new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  )

  const action = async (key, fn) => {
    setBusy(key)
    setDone(null)
    try {
      const result = await fn()
      setDone({ key, result })
    } finally {
      setBusy(null)
    }
  }

  const handleCleanFuture = () =>
    action('clean-future', async () => {
      let count = 0
      for (const t of futureCopies) {
        await deleteTask(t.id)
        count++
      }
      return count
    })

  const handleCleanDone = () =>
    action('clean-done', async () => {
      let count = 0
      for (const t of oldDone) {
        await deleteTask(t.id)
        count++
      }
      return count
    })

  const handleBackup = () =>
    action('backup', () => exportBackup(user?.email || ''))

  const handleNotify = async () => {
    setBusy('notify')
    const granted = await requestPermission()
    setNotifStatus(granted ? 'granted' : 'denied')
    setBusy(null)
  }

  const Btn = ({ k, onClick, children, variant = 'ghost' }) => {
    const isBusy = busy === k
    const isDone = done?.key === k
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={!!busy}
        className={
          variant === 'gold'
            ? 'btn-gold disabled:opacity-50'
            : variant === 'danger'
              ? 'flex items-center gap-1.5 text-xs font-medium text-terracotta hover:bg-terracotta/10 px-3 py-1.5 rounded-lg disabled:opacity-50'
              : 'btn-ghost text-xs disabled:opacity-50'
        }
      >
        {isBusy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isDone ? (
          <CheckCircle2 className="w-4 h-4 text-olive" />
        ) : null}
        {children}
        {isDone && done.result != null && (
          <span className="text-coffee-mid">({done.result})</span>
        )}
      </button>
    )
  }

  return (
    <>
      <PageHeader title="Настройки" subtitle="Управление данными и уведомлениями" />

      <div className="space-y-4">
        {/* УВЕДОМЛЕНИЯ */}
        <Section title="Уведомления" icon={Bell}>
          <Row
            label="Разрешить уведомления"
            hint={
              notifStatus === 'granted'
                ? '✅ Разрешены — укажи время в задаче'
                : notifStatus === 'denied'
                  ? '🚫 Заблокированы в настройках браузера'
                  : 'Браузер запросит разрешение'
            }
            action={
              notifStatus !== 'granted' && notifStatus !== 'denied' ? (
                <Btn k="notify" onClick={handleNotify} variant="gold">
                  <Bell className="w-4 h-4" />
                  Разрешить
                </Btn>
              ) : null
            }
          />
        </Section>

        {/* ЧИСТКА ПОВТОРОВ */}
        <Section title="Повторяющиеся задачи" icon={RotateCcw}>
          <Row
            label="Удалить будущие копии"
            hint={`${futureCopies.length} копий повторов с датой в будущем`}
            action={
              <Btn k="clean-future" onClick={handleCleanFuture} variant="danger">
                <Trash2 className="w-3.5 h-3.5" />
                Удалить {futureCopies.length}
              </Btn>
            }
          />
          <div className="border-t border-cream-border pt-4">
            <Row
              label="Удалить выполненные повторы"
              hint={`${oldDone.length} выполненных копий старше 30 дней`}
              action={
                <Btn k="clean-done" onClick={handleCleanDone} variant="danger">
                  <Trash2 className="w-3.5 h-3.5" />
                  Удалить {oldDone.length}
                </Btn>
              }
            />
          </div>
          <p className="text-xs text-coffee-light">
            После удаления сами задачи (шаблоны) останутся — исчезнут только автоматические копии.
          </p>
        </Section>

        {/* БЭКАП */}
        <Section title="Бэкап данных" icon={Download}>
          <Row
            label="Скачать все задачи"
            hint={`${tasks.length} задач · сохранится как JSON-файл на устройстве`}
            action={
              <Btn k="backup" onClick={handleBackup} variant="gold">
                <Download className="w-4 h-4" />
                Скачать
              </Btn>
            }
          />
          <p className="text-xs text-coffee-light">
            Файл можно сохранить в iCloud Drive или отправить себе в Telegram. Подходит для
            восстановления при смене аккаунта.
          </p>
        </Section>

        {/* ИТОГО */}
        <div className="card p-4 text-xs text-coffee-mid">
          Всего задач: <span className="font-medium text-coffee-dark">{tasks.length}</span>
          {' · '}
          Аккаунт: <span className="font-medium text-coffee-dark">{user?.email || '—'}</span>
        </div>
      </div>
    </>
  )
}

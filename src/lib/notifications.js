/**
 * Движок браузерных уведомлений для "Высоты".
 *
 * Ограничение PWA: таймеры живут пока страница открыта.
 * Если установить на главный экран iPhone и оставить в фоне —
 * уведомление придёт. Если Safari закрыт полностью → нет.
 */

const timers = new Map() // id задачи → timer id

export async function requestPermission() {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function hasPermission() {
  return 'Notification' in window && Notification.permission === 'granted'
}

function showNotification(task) {
  if (!hasPermission()) return
  const n = new Notification('Высота', {
    body: task.title,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: `task-${task.id}`,
    renotify: false,
    silent: false,
  })
  // клик по уведомлению → открыть/сфокусировать приложение
  n.onclick = () => {
    window.focus()
    n.close()
  }
}

export function scheduleReminders(tasks) {
  const now = Date.now()

  for (const task of tasks) {
    if (!task.reminder_at || task.status === 'done') {
      cancelReminder(task.id)
      continue
    }
    const fireAt = new Date(task.reminder_at).getTime()
    const delay = fireAt - now

    // Уже прошло или дальше 24 часов — не планируем
    if (delay <= 0 || delay > 24 * 60 * 60 * 1000) {
      cancelReminder(task.id)
      continue
    }

    // Если таймер уже стоит и совпадает по времени — не перезаписываем
    const existing = timers.get(task.id)
    if (existing?.fireAt === fireAt) continue

    cancelReminder(task.id)
    const timerId = setTimeout(() => {
      showNotification(task)
      timers.delete(task.id)
    }, delay)
    timers.set(task.id, { timerId, fireAt })
  }
}

export function cancelReminder(taskId) {
  const existing = timers.get(taskId)
  if (existing) {
    clearTimeout(existing.timerId)
    timers.delete(taskId)
  }
}

export function cancelAll() {
  for (const { timerId } of timers.values()) clearTimeout(timerId)
  timers.clear()
}
